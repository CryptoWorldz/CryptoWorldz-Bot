import fs from "node:fs";
import path from "node:path";
import { BN } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  CpAmm,
  getBaseFeeParams,
  getLiquidityDeltaFromAmountA,
  getSqrtPriceFromPrice,
  MAX_SQRT_PRICE,
} from "@meteora-ag/cp-amm-sdk";
import * as multisig from "@sqds/multisig";

const root = path.resolve("..");
const candidate = JSON.parse(
  fs.readFileSync(path.join(root, "wldz-one-sided-launch.candidate.json"), "utf8")
);

function fail(message) {
  throw new Error("WLDZ_LAUNCH_PREFLIGHT_FAIL: " + message);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

assert(candidate.launchAuthorized === false, "candidate must remain unsigned");
assert(candidate.executionEnabled === false, "candidate execution must remain disabled");
assert(candidate.token.symbol === "WLDZ", "symbol drift");
assert(candidate.token.mint === "AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U", "canonical mint drift");
assert(candidate.token.decimals === 6, "canonical decimals drift");
assert(candidate.token.supplyTokens === 100000000, "canonical supply drift");
assert(candidate.launch.baseAmountTokens === 15000000, "15% launch ceiling drift");
assert(candidate.launch.quoteAmountSol === 0, "launch must remain one-sided / zero starting quote");
assert(candidate.launch.baseFeeBps === 200, "2% base fee drift");
assert(candidate.launch.collectFeeMode === "ONLY_B_QUOTE", "fee mode drift");

const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(rpcUrl, "confirmed");

const mintPk = new PublicKey(candidate.token.mint);
const vaultPk = new PublicKey(candidate.treasury.vault);
const multisigPk = new PublicKey(candidate.treasury.multisig);

const [derivedVault] = multisig.getVaultPda({
  multisigPda: multisigPk,
  index: Number(candidate.treasury.vaultIndex),
});
assert(derivedVault.equals(vaultPk), "configured Squads vault does not derive from configured multisig");

const [mintInfo, vaultBalanceLamports, multisigAccount] = await Promise.all([
  getMint(connection, mintPk, "confirmed", TOKEN_PROGRAM_ID),
  connection.getBalance(vaultPk, "confirmed"),
  multisig.accounts.Multisig.fromAccountAddress(connection, multisigPk),
]);

assert(mintInfo.decimals === 6, "on-chain decimals mismatch");
assert(mintInfo.supply === 100000000000000n, "on-chain fixed supply mismatch");
assert(mintInfo.mintAuthority === null, "mint authority is not revoked");
assert(mintInfo.freezeAuthority === null, "freeze authority is not revoked");

const vaultAta = await getAssociatedTokenAddress(
  mintPk,
  vaultPk,
  true,
  TOKEN_PROGRAM_ID
);
const vaultTokenAccount = await getAccount(
  connection,
  vaultAta,
  "confirmed",
  TOKEN_PROGRAM_ID
);
assert(vaultTokenAccount.owner.equals(vaultPk), "WLDZ treasury ATA owner mismatch");

const baseAmountRaw = 15000000n * 1000000n;
assert(vaultTokenAccount.amount >= baseAmountRaw, "Treasury does not hold the 15M WLDZ launch amount");

const threshold = Number(multisigAccount.threshold);
assert(threshold === 2, "current Squads threshold is no longer 2");
const transactionIndex = multisig.utils.toBigInt(multisigAccount.transactionIndex) + 1n;
const [transactionPda] = multisig.getTransactionPda({
  multisigPda: multisigPk,
  index: transactionIndex,
});
const [positionNftPda] = multisig.getEphemeralSignerPda({
  transactionPda,
  ephemeralSignerIndex: 0,
});

const cpAmm = new CpAmm(connection);
const initSqrtPrice = getSqrtPriceFromPrice(
  String(candidate.launch.initPriceSolPerWldz),
  6,
  9
);
const tokenAAmount = new BN(baseAmountRaw.toString());
const tokenBAmount = new BN(0);
const liquidityDelta = getLiquidityDeltaFromAmountA(
  tokenAAmount,
  initSqrtPrice,
  MAX_SQRT_PRICE,
  CollectFeeMode.OnlyB
);

const baseFee = getBaseFeeParams({
  baseFeeMode: BaseFeeMode.FeeTimeSchedulerLinear,
  feeTimeSchedulerParam: {
    startingFeeBps: 200,
    endingFeeBps: 200,
    numberOfPeriod: 0,
    totalDuration: 0,
  },
});
const poolFees = {
  baseFee,
  compoundingFeeBps: 0,
  padding: 0,
  dynamicFee: null,
};

const { tx: poolTx, pool, position } = await cpAmm.createCustomPool({
  payer: vaultPk,
  creator: vaultPk,
  positionNft: positionNftPda,
  tokenAMint: mintPk,
  tokenBMint: NATIVE_MINT,
  tokenAAmount,
  tokenBAmount,
  sqrtMinPrice: initSqrtPrice,
  sqrtMaxPrice: MAX_SQRT_PRICE,
  liquidityDelta,
  initSqrtPrice,
  poolFees,
  hasAlphaVault: false,
  activationType: ActivationType.Timestamp,
  collectFeeMode: CollectFeeMode.OnlyB,
  activationPoint: null,
  tokenAProgram: TOKEN_PROGRAM_ID,
  tokenBProgram: TOKEN_PROGRAM_ID,
  isLockLiquidity: true,
});

const existingPool = await connection.getAccountInfo(pool, "confirmed");
assert(existingPool === null, "deterministic WLDZ/wSOL customizable pool already exists");

const latest = await connection.getLatestBlockhash("confirmed");
const innerMessage = new TransactionMessage({
  payerKey: vaultPk,
  recentBlockhash: latest.blockhash,
  instructions: poolTx.instructions,
});

const versioned = new VersionedTransaction(innerMessage.compileToV0Message());
const signerKeys = versioned.message.staticAccountKeys
  .slice(0, versioned.message.header.numRequiredSignatures)
  .map((k) => k.toBase58());
const allowedSigners = new Set([vaultPk.toBase58(), positionNftPda.toBase58()]);
for (const signer of signerKeys) {
  assert(allowedSigners.has(signer), "unexpected signer required by launch transaction: " + signer);
}
assert(signerKeys.includes(vaultPk.toBase58()), "Squads vault is not a required signer");
assert(signerKeys.includes(positionNftPda.toBase58()), "Squads ephemeral position NFT signer missing");

const simulation = await connection.simulateTransaction(versioned, {
  sigVerify: false,
  replaceRecentBlockhash: true,
  commitment: "confirmed",
});
assert(simulation.value.err === null, "mainnet simulation failed: " + JSON.stringify(simulation.value.err));

const report = {
  status: "PASS",
  mode: "BUILD_AND_SIMULATE_ONLY",
  transactionBroadcast: false,
  launchAuthorized: false,
  canonicalMint: mintPk.toBase58(),
  fixedSupply: "100000000",
  decimals: 6,
  mintAuthority: null,
  freezeAuthority: null,
  squads: {
    multisig: multisigPk.toBase58(),
    threshold,
    vaultIndex: candidate.treasury.vaultIndex,
    vault: vaultPk.toBase58(),
    vaultSolLamports: vaultBalanceLamports,
    transactionIndex: transactionIndex.toString(),
    transactionPda: transactionPda.toBase58(),
    ephemeralSigners: 1,
    positionNftEphemeralSigner: positionNftPda.toBase58(),
  },
  liquidity: {
    activeWldzTokens: "15000000",
    activePercentOfFixedSupply: 15,
    treasuryWldzBeforeTokens: (Number(vaultTokenAccount.amount) / 1e6).toString(),
    startingRealQuoteSol: 0,
    openingPriceSolPerWldz: String(candidate.launch.initPriceSolPerWldz),
    openingFdvSol: String(candidate.launch.candidateOpeningFdvSol),
    virtualOrConcentratedRepresentationIsNotRealQuote: true,
  },
  meteora: {
    program: candidate.launch.program,
    pool: pool.toBase58(),
    position: position.toBase58(),
    quoteMint: NATIVE_MINT.toBase58(),
    collectFeeMode: "OnlyB",
    baseFeeBps: 200,
    dynamicFeeEnabled: false,
    permanentLockIncludedAtomically: true,
    liquidityDelta: liquidityDelta.toString(),
    instructionCount: poolTx.instructions.length,
    requiredSigners: signerKeys,
  },
  simulation: {
    err: simulation.value.err,
    unitsConsumed: simulation.value.unitsConsumed ?? null,
    logs: simulation.value.logs ?? [],
  },
};

const artifacts = path.join(root, "artifacts");
fs.mkdirSync(artifacts, { recursive: true });
fs.writeFileSync(
  path.join(artifacts, "wldz-launch-preflight.json"),
  JSON.stringify(report, null, 2) + "\n"
);
console.log("WLDZ_LAUNCH_PREFLIGHT=PASS broadcast=0 authorized=0");
console.log("WLDZ_POOL=" + pool.toBase58());
console.log("WLDZ_POSITION=" + position.toBase58());
console.log("SQUADS_TRANSACTION_INDEX=" + transactionIndex.toString());
