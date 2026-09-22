import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import anchor from "@coral-xyz/anchor";
const { BN } = anchor;
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionMessage,
  SystemProgram,
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
function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function summarizeAccount(account) {
  if (!account) return null;
  const encoded = Array.isArray(account.data) ? account.data[0] : null;
  return {
    lamports: account.lamports,
    owner: account.owner,
    executable: account.executable,
    rentEpoch: account.rentEpoch,
    dataBase64Length: typeof encoded === "string" ? encoded.length : null,
    dataSha256: typeof encoded === "string"
      ? sha256(Buffer.from(encoded, "base64"))
      : null,
  };
}
async function jsonRpc(rpcUrl, method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await response.json();
  if (!response.ok || body.error) {
    fail("RPC " + method + " failed: " + JSON.stringify(body.error ?? body));
  }
  return body.result;
}
async function simulateSerialized(rpcUrl, serialized, accountAddresses = []) {
  const config = {
    encoding: "base64",
    sigVerify: false,
    replaceRecentBlockhash: true,
    commitment: "confirmed",
  };
  if (accountAddresses.length) {
    config.accounts = { encoding: "base64", addresses: accountAddresses };
  }
  const result = await jsonRpc(rpcUrl, "simulateTransaction", [
    Buffer.from(serialized).toString("base64"),
    config,
  ]);
  return result.value;
}

assert(candidate.launchAuthorized === false, "candidate must remain unsigned");
assert(candidate.executionEnabled === false, "candidate execution must remain disabled");
assert(candidate.token.symbol === "WLDZ", "symbol drift");
assert(candidate.token.mint === "AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U", "canonical mint drift");
assert(candidate.token.decimals === 6, "canonical decimals drift");
assert(candidate.token.supplyTokens === 100000000, "canonical supply drift");
assert(candidate.launch.baseAmountTokens === 15000000, "15% launch ceiling drift");
assert(candidate.launch.quoteAmountSol === 0, "launch must remain one-sided");
assert(candidate.launch.baseFeeBps === 200, "2% base fee drift");
assert(candidate.launch.collectFeeMode === "ONLY_B_QUOTE", "fee mode drift");

const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(rpcUrl, "confirmed");

const mintPk = new PublicKey(candidate.token.mint);
const vaultPk = new PublicKey(candidate.treasury.vault);
const multisigPk = new PublicKey(candidate.treasury.multisig);
const creatorPk = new PublicKey(
  process.env.SQUADS_CREATOR || "Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u"
);

const [derivedVault] = multisig.getVaultPda({
  multisigPda: multisigPk,
  index: Number(candidate.treasury.vaultIndex),
});
assert(derivedVault.equals(vaultPk), "configured Squads vault does not derive from configured multisig");

const [mintInfo, vaultBalanceLamports, creatorBalanceLamports, multisigAccount] = await Promise.all([
  getMint(connection, mintPk, "confirmed", TOKEN_PROGRAM_ID),
  connection.getBalance(vaultPk, "confirmed"),
  connection.getBalance(creatorPk, "confirmed"),
  multisig.accounts.Multisig.fromAccountAddress(connection, multisigPk),
]);

assert(mintInfo.decimals === 6, "on-chain decimals mismatch");
assert(mintInfo.supply === 100000000000000n, "on-chain fixed supply mismatch");
assert(mintInfo.mintAuthority === null, "mint authority is not revoked");
assert(mintInfo.freezeAuthority === null, "freeze authority is not revoked");

const threshold = Number(multisigAccount.threshold);
assert(threshold === 2, "current Squads threshold is no longer 2");

const creatorMember = multisigAccount.members.find((member) => member.key.equals(creatorPk));
assert(Boolean(creatorMember), "configured creator is not a Squads member");
assert(
  (Number(creatorMember.permissions.mask) & 1) === 1,
  "configured creator lacks Squads Initiate permission"
);

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
assert(vaultTokenAccount.amount >= baseAmountRaw, "treasury does not hold the 15M WLDZ launch amount");

const transactionIndex = multisig.utils.toBigInt(multisigAccount.transactionIndex) + 1n;
const [transactionPda] = multisig.getTransactionPda({
  multisigPda: multisigPk,
  index: transactionIndex,
});
const [proposalPda] = multisig.getProposalPda({
  multisigPda: multisigPk,
  transactionIndex,
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

const { tx: meteoraTx, pool, position } = await cpAmm.createCustomPool({
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
const innerTransactionMessage = new TransactionMessage({
  payerKey: vaultPk,
  recentBlockhash: latest.blockhash,
  instructions: meteoraTx.instructions,
});

const innerVersioned = new VersionedTransaction(
  innerTransactionMessage.compileToV0Message()
);
const signerKeys = innerVersioned.message.staticAccountKeys
  .slice(0, innerVersioned.message.header.numRequiredSignatures)
  .map((key) => key.toBase58());
const allowedInnerSigners = new Set([vaultPk.toBase58(), positionNftPda.toBase58()]);
for (const signer of signerKeys) {
  assert(allowedInnerSigners.has(signer), "unexpected signer required by launch transaction: " + signer);
}
assert(signerKeys.includes(vaultPk.toBase58()), "Squads vault is not a required inner signer");
assert(signerKeys.includes(positionNftPda.toBase58()), "Squads ephemeral position NFT signer missing");

console.log("WLDZ_CREATOR_SOL_LAMPORTS_PRE=" + creatorBalanceLamports);
console.log("WLDZ_VAULT_SOL_LAMPORTS_PRE=" + vaultBalanceLamports);

const innerSimulation = await connection.simulateTransaction(innerVersioned, {
  sigVerify: false,
  replaceRecentBlockhash: true,
  commitment: "confirmed",
});
if (innerSimulation.value.err !== null) {
  console.error("WLDZ_METEORA_SIMULATION_LOGS=" + JSON.stringify(innerSimulation.value.logs ?? []));
}

let fundingSimulation = null;
if (innerSimulation.value.err !== null) {
  const candidates = [
    1000000, 2000000, 3000000, 4000000, 5000000,
    6000000, 7000000, 8000000, 9000000,
  ].filter((lamports) => lamports + 10000 < creatorBalanceLamports);

  for (const topupLamports of candidates) {
    const fundedMessage = new TransactionMessage({
      payerKey: creatorPk,
      recentBlockhash: latest.blockhash,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: creatorPk,
          toPubkey: vaultPk,
          lamports: topupLamports,
        }),
        ...meteoraTx.instructions,
      ],
    });
    const fundedTx = new VersionedTransaction(fundedMessage.compileToV0Message());
    const fundedBytes = fundedTx.serialize();
    if (fundedBytes.length > 1232) {
      fundingSimulation = {
        passed: false,
        topupLamports,
        packetBytes: fundedBytes.length,
        err: "FUNDED_SIMULATION_PACKET_TOO_LARGE",
      };
      break;
    }
    const sim = await connection.simulateTransaction(fundedTx, {
      sigVerify: false,
      replaceRecentBlockhash: true,
      commitment: "confirmed",
    });
    fundingSimulation = {
      passed: sim.value.err === null,
      topupLamports,
      packetBytes: fundedBytes.length,
      err: sim.value.err,
      unitsConsumed: sim.value.unitsConsumed ?? null,
      logsTail: (sim.value.logs ?? []).slice(-18),
    };
    console.log(
      "WLDZ_FUNDING_SIM topup=" + topupLamports +
      " bytes=" + fundedBytes.length +
      " passed=" + (sim.value.err === null)
    );
    if (sim.value.err === null) break;
  }
}

const createVaultTransactionIx = multisig.instructions.vaultTransactionCreate({
  multisigPda: multisigPk,
  transactionIndex,
  creator: creatorPk,
  rentPayer: creatorPk,
  vaultIndex: Number(candidate.treasury.vaultIndex),
  ephemeralSigners: 1,
  transactionMessage: innerTransactionMessage,
  memo: undefined,
});
const createProposalIx = multisig.instructions.proposalCreate({
  multisigPda: multisigPk,
  transactionIndex,
  creator: creatorPk,
  rentPayer: creatorPk,
  isDraft: false,
});

const proposalBuildTx = new Transaction({
  feePayer: creatorPk,
  recentBlockhash: latest.blockhash,
}).add(createVaultTransactionIx, createProposalIx);

const serializedProposalBuild = proposalBuildTx.serialize({
  requireAllSignatures: false,
  verifySignatures: false,
});
assert(serializedProposalBuild.length <= 1232, "proposal creation transaction exceeds Solana packet size");

const proposalSimulation = await simulateSerialized(
  rpcUrl,
  serializedProposalBuild,
  [transactionPda.toBase58(), proposalPda.toBase58()]
);
if (proposalSimulation.err !== null) {
  console.error("WLDZ_SQUADS_PROPOSAL_SIMULATION_LOGS=" + JSON.stringify(proposalSimulation.logs ?? []));
}

const simulatedTransactionAccount = proposalSimulation.accounts?.[0] ?? null;
const simulatedProposalAccount = proposalSimulation.accounts?.[1] ?? null;
const proposalPassed = proposalSimulation.err === null && simulatedTransactionAccount !== null && simulatedProposalAccount !== null;
const meteoraPassed = innerSimulation.value.err === null;

const report = {
  status: proposalPassed && meteoraPassed ? "PASS" : "BLOCKED",
  mode: "BUILD_AND_SIMULATE_ONLY",
  transactionBroadcast: false,
  launchAuthorized: false,
  generatedAt: new Date().toISOString(),
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
    vaultWldzTokens: (Number(vaultTokenAccount.amount) / 1e6).toString(),
    creator: creatorPk.toBase58(),
    creatorSolLamports: creatorBalanceLamports,
    creatorPermissionsMask: creatorMember.permissions.mask,
    transactionIndex: transactionIndex.toString(),
    transactionPda: transactionPda.toBase58(),
    proposalPda: proposalPda.toBase58(),
    ephemeralSigners: 1,
    positionNftEphemeralSigner: positionNftPda.toBase58(),
  },
  liquidity: {
    activeWldzTokens: "15000000",
    activePercentOfFixedSupply: 15,
    startingRequestedQuoteSol: 0,
    nativeWsolAccountTechnicalSeedLamports: 1,
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
    instructionCount: meteoraTx.instructions.length,
    requiredSigners: signerKeys,
  },
  executableProposalPayload: {
    transactionFormat: "legacy",
    serializedUnsignedTransactionBase64: Buffer.from(serializedProposalBuild).toString("base64"),
    byteLength: serializedProposalBuild.length,
    sha256: sha256(serializedProposalBuild),
    recentBlockhash: latest.blockhash,
    lastValidBlockHeight: latest.lastValidBlockHeight,
    note: "Blockhash is intentionally short-lived; rebuild immediately before the creator signs/submits.",
  },
  proposalCreationSimulation: {
    passed: proposalPassed,
    err: proposalSimulation.err,
    unitsConsumed: proposalSimulation.unitsConsumed ?? null,
    replacementBlockhash: proposalSimulation.replacementBlockhash ?? null,
    transactionAccount: summarizeAccount(simulatedTransactionAccount),
    proposalAccount: summarizeAccount(simulatedProposalAccount),
    logs: proposalSimulation.logs ?? [],
  },
  meteoraExecutionSimulation: {
    passed: meteoraPassed,
    err: innerSimulation.value.err,
    unitsConsumed: innerSimulation.value.unitsConsumed ?? null,
    logs: innerSimulation.value.logs ?? [],
  },
  fundingSimulation,
  signature: {
    realOnChainSignature: null,
    simulationProofSha256: sha256(serializedProposalBuild),
    note: "Solana simulation does not create a real transaction signature. The real signature is created only when the authorized Squads creator signs and submits this proposal-creation transaction.",
  },
};

const artifacts = path.join(root, "artifacts");
fs.mkdirSync(artifacts, { recursive: true });
fs.writeFileSync(
  path.join(artifacts, "wldz-launch-preflight.json"),
  JSON.stringify(report, null, 2) + "\n"
);

console.log("WLDZ_CREATOR_SOL_LAMPORTS=" + creatorBalanceLamports);
console.log("WLDZ_VAULT_SOL_LAMPORTS=" + vaultBalanceLamports);
console.log("WLDZ_LAUNCH_PREFLIGHT=" + report.status + " broadcast=0 authorized=0");
console.log("WLDZ_PROPOSAL_PDA=" + proposalPda.toBase58());
console.log("WLDZ_SQUADS_TRANSACTION_PDA=" + transactionPda.toBase58());
console.log("WLDZ_POOL=" + pool.toBase58());
console.log("WLDZ_POSITION=" + position.toBase58());
console.log("WLDZ_PROPOSAL_PAYLOAD_SHA256=" + report.executableProposalPayload.sha256);
console.log("WLDZ_PROPOSAL_BYTES=" + serializedProposalBuild.length);

if (!proposalPassed || !meteoraPassed) {
  process.exitCode = 1;
}
