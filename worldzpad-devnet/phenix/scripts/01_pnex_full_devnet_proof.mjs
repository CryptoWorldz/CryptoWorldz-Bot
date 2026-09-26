import fs from "node:fs";
import { Connection, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction, clusterApiUrl } from "@solana/web3.js";
import {
  AuthorityType, NATIVE_MINT, TOKEN_PROGRAM_ID, createMint, getMint,
  getOrCreateAssociatedTokenAccount, mintTo, setAuthority, syncNative,
  createBurnCheckedInstruction
} from "@solana/spl-token";
import {
  ActivationType, BaseFeeMode, CollectFeeMode, CpAmm, MIN_SQRT_PRICE, MAX_SQRT_PRICE,
  SwapMode, getBaseFeeParams, getCurrentPoint, getSqrtPriceFromPrice,
  getUnClaimLpFee, derivePositionNftAccount
} from "@meteora-ag/cp-amm-sdk";
import BN from "bn.js";

const RPC = clusterApiUrl("devnet");
const connection = new Connection(RPC, "confirmed");
const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
if (await connection.getGenesisHash() !== DEVNET_GENESIS) throw new Error("DEVNET_RPC_REQUIRED");

const payer = Keypair.generate(); // ephemeral, memory-only; never serialized
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function balance() {
  return connection.getBalance(payer.publicKey, "confirmed").catch(() => 0);
}
async function fundDevnetPayer() {
  const target = 180_000_000;
  for (const amount of [1_000_000_000, 500_000_000, 250_000_000, 100_000_000]) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const sig = await connection.requestAirdrop(payer.publicKey, amount);
        await connection.confirmTransaction(sig, "confirmed");
        await sleep(500);
        const current = await balance();
        if (current >= target) return current;
      } catch (_) {
        await sleep(1000);
      }
    }
  }
  throw new Error("DEVNET_FAUCET_UNAVAILABLE balance=" + await balance() + " target=" + target);
}
const fundedLamports = await fundDevnetPayer();

const DECIMALS = 6;
const SUPPLY = 250_000_000n * 1_000_000n;
const GENESIS_PNEX = 12_500_000n * 1_000_000n;
const QUOTE_LAMPORTS = 50_000_000n; // 0.05 disposable Devnet SOL
const FIRST_BUY_LAMPORTS = 1_000_000;
const DEVNET_TEST_PRICE = "0.000000004"; // fixture only; never mainnet price

const mint = await createMint(
  connection, payer, payer.publicKey, payer.publicKey, DECIMALS,
  undefined, undefined, TOKEN_PROGRAM_ID
);
const pnexAta = await getOrCreateAssociatedTokenAccount(
  connection, payer, mint, payer.publicKey, false, "confirmed", undefined, TOKEN_PROGRAM_ID
);
await mintTo(connection, payer, mint, pnexAta.address, payer, SUPPLY, [], undefined, TOKEN_PROGRAM_ID);
await setAuthority(connection, payer, mint, payer, AuthorityType.MintTokens, null, [], undefined, TOKEN_PROGRAM_ID);
await setAuthority(connection, payer, mint, payer, AuthorityType.FreezeAccount, null, [], undefined, TOKEN_PROGRAM_ID);

let mintState = await getMint(connection, mint, "confirmed", TOKEN_PROGRAM_ID);
if (mintState.supply !== SUPPLY || mintState.mintAuthority !== null || mintState.freezeAuthority !== null) {
  throw new Error("FIXED_SUPPLY_AUTHORITY_FINALIZATION_FAILED");
}

const wsolAta = await getOrCreateAssociatedTokenAccount(
  connection, payer, NATIVE_MINT, payer.publicKey, false, "confirmed", undefined, TOKEN_PROGRAM_ID
);
const wrap = new Transaction().add(SystemProgram.transfer({
  fromPubkey: payer.publicKey,
  toPubkey: wsolAta.address,
  lamports: Number(QUOTE_LAMPORTS) + FIRST_BUY_LAMPORTS + 2_000_000
}));
await sendAndConfirmTransaction(connection, wrap, [payer], { commitment: "confirmed" });
await syncNative(connection, payer, wsolAta.address, undefined, TOKEN_PROGRAM_ID);

const cp = new CpAmm(connection);
const tokenAInfo = {
  mint: mintState,
  currentEpoch: (await connection.getEpochInfo("confirmed")).epoch
};
const tokenAAmount = new BN(GENESIS_PNEX.toString());
const tokenBAmount = new BN(QUOTE_LAMPORTS.toString());
const initSqrtPrice = getSqrtPriceFromPrice(DEVNET_TEST_PRICE, 6, 9);
const liquidityDelta = cp.getLiquidityDelta({
  maxAmountTokenA: tokenAAmount,
  maxAmountTokenB: tokenBAmount,
  sqrtPrice: initSqrtPrice,
  sqrtMinPrice: MIN_SQRT_PRICE,
  sqrtMaxPrice: MAX_SQRT_PRICE,
  collectFeeMode: CollectFeeMode.OnlyB,
  tokenAInfo
});
if (liquidityDelta.lte(new BN(0))) throw new Error("ZERO_LIQUIDITY_DELTA");

const baseFee = getBaseFeeParams({
  baseFeeMode: BaseFeeMode.FeeTimeSchedulerLinear,
  feeTimeSchedulerParam: {
    startingFeeBps: 75,
    endingFeeBps: 75,
    numberOfPeriod: 0,
    totalDuration: 0
  }
});
const positionNft = Keypair.generate();
const made = await cp.createCustomPool({
  payer: payer.publicKey,
  creator: payer.publicKey,
  positionNft: positionNft.publicKey,
  tokenAMint: mint,
  tokenBMint: NATIVE_MINT,
  tokenAAmount,
  tokenBAmount,
  sqrtMinPrice: MIN_SQRT_PRICE,
  sqrtMaxPrice: MAX_SQRT_PRICE,
  liquidityDelta,
  initSqrtPrice,
  poolFees: { baseFee, compoundingFeeBps: 0, padding: 0, dynamicFee: null },
  hasAlphaVault: false,
  activationType: ActivationType.Timestamp,
  collectFeeMode: CollectFeeMode.OnlyB,
  activationPoint: null,
  tokenAProgram: TOKEN_PROGRAM_ID,
  tokenBProgram: TOKEN_PROGRAM_ID,
  isLockLiquidity: true
});
const createSig = await sendAndConfirmTransaction(
  connection, made.tx, [payer, positionNft], { commitment: "confirmed" }
);

let poolState = await cp.fetchPoolState(made.pool);
let positionState = await cp.fetchPositionState(made.position);
const feeState = await cp.fetchPoolFees(made.pool);
if (BigInt(feeState.cliffFeeNumerator.toString()) !== 7_500_000n || Number(feeState.numberOfPeriod) !== 0) {
  throw new Error("FIXED_75_BPS_FEE_NOT_STORED");
}
if (Number(poolState.poolFees.dynamicFee.initialized) !== 0) throw new Error("DYNAMIC_FEE_ENABLED");
if (
  positionState.permanentLockedLiquidity.lte(new BN(0)) ||
  !positionState.unlockedLiquidity.isZero() ||
  !positionState.vestedLiquidity.isZero()
) throw new Error("PERMANENT_LOCK_FAILED");

const currentPoint = await getCurrentPoint(connection, poolState.activationType);
const quote = await cp.getQuote2({
  inputTokenMint: NATIVE_MINT,
  slippage: 1,
  currentPoint,
  poolState,
  tokenADecimal: 6,
  tokenBDecimal: 9,
  hasReferral: false,
  swapMode: SwapMode.ExactIn,
  amountIn: new BN(FIRST_BUY_LAMPORTS)
});
if (!quote.minimumAmountOut || quote.minimumAmountOut.lte(new BN(0))) throw new Error("FIRST_SWAP_QUOTE_FAILED");

const swapTx = await cp.swap2({
  payer: payer.publicKey,
  pool: made.pool,
  inputTokenMint: NATIVE_MINT,
  outputTokenMint: mint,
  tokenAMint: poolState.tokenAMint,
  tokenBMint: poolState.tokenBMint,
  tokenAVault: poolState.tokenAVault,
  tokenBVault: poolState.tokenBVault,
  tokenAProgram: TOKEN_PROGRAM_ID,
  tokenBProgram: TOKEN_PROGRAM_ID,
  referralTokenAccount: null,
  swapMode: SwapMode.ExactIn,
  amountIn: new BN(FIRST_BUY_LAMPORTS),
  minimumAmountOut: quote.minimumAmountOut,
  poolState
});
const swapSig = await sendAndConfirmTransaction(connection, swapTx, [payer], { commitment: "confirmed" });

poolState = await cp.fetchPoolState(made.pool);
positionState = await cp.fetchPositionState(made.position);
const unclaimed = getUnClaimLpFee(poolState, positionState);
if (BigInt(unclaimed.feeTokenB.toString()) <= 0n) throw new Error("NO_QUOTE_FEE_TO_CLAIM");
const claimedBefore = BigInt(positionState.metrics.totalClaimedBFee.toString());

const claimTx = await cp.claimPositionFee({
  receiver: null,
  owner: payer.publicKey,
  pool: made.pool,
  position: made.position,
  positionNftAccount: derivePositionNftAccount(positionNft.publicKey),
  tokenAVault: poolState.tokenAVault,
  tokenBVault: poolState.tokenBVault,
  tokenAMint: poolState.tokenAMint,
  tokenBMint: poolState.tokenBMint,
  tokenAProgram: TOKEN_PROGRAM_ID,
  tokenBProgram: TOKEN_PROGRAM_ID
});
const claimSig = await sendAndConfirmTransaction(connection, claimTx, [payer], { commitment: "confirmed" });

positionState = await cp.fetchPositionState(made.position);
const claimedQuoteRaw = BigInt(positionState.metrics.totalClaimedBFee.toString()) - claimedBefore;
if (claimedQuoteRaw <= 0n) throw new Error("FEE_CLAIM_RECONCILIATION_FAILED");

const supplyBeforeBurn = (await getMint(connection, mint, "confirmed", TOKEN_PROGRAM_ID)).supply;
const burnRaw = 1_000_000n; // exactly 1 disposable mock PNEX
const burnTx = new Transaction().add(createBurnCheckedInstruction(
  pnexAta.address, mint, payer.publicKey, burnRaw, DECIMALS, [], TOKEN_PROGRAM_ID
));
const burnSig = await sendAndConfirmTransaction(connection, burnTx, [payer], { commitment: "confirmed" });
mintState = await getMint(connection, mint, "confirmed", TOKEN_PROGRAM_ID);
if (mintState.supply !== supplyBeforeBurn - burnRaw) throw new Error("BURN_SUPPLY_REDUCTION_MISMATCH");

const evidence = {
  proof: "PNEX_FULL_DISPOSABLE_DEVNET_PROOF_V1",
  network: "solana-devnet",
  mainnetTouched: false,
  payerPublicKey: payer.publicKey.toBase58(),
  fundedLamports,
  mockMint: mint.toBase58(),
  initialSupplyRaw: SUPPLY.toString(),
  mintAuthority: null,
  freezeAuthority: null,
  genesis: {
    pnexTokens: 12_500_000,
    pnexRaw: GENESIS_PNEX.toString(),
    quoteSol: 0.05,
    quoteLamports: QUOTE_LAMPORTS.toString(),
    testPriceSolPerPnex: DEVNET_TEST_PRICE,
    mainnetPrice: null
  },
  pool: made.pool.toBase58(),
  position: made.position.toBase58(),
  fee: {
    baseFeeBps: 75,
    dynamicFee: false,
    collectFeeMode: "ONLY_B_QUOTE",
    claimedQuoteRaw: claimedQuoteRaw.toString()
  },
  lock: {
    permanentLockedLiquidity: positionState.permanentLockedLiquidity.toString(),
    unlockedLiquidity: positionState.unlockedLiquidity.toString(),
    vestedLiquidity: positionState.vestedLiquidity.toString()
  },
  firstSwap: {
    signature: swapSig,
    inputLamports: String(FIRST_BUY_LAMPORTS),
    outputRaw: quote.outputAmount.toString()
  },
  burn: {
    amountRaw: burnRaw.toString(),
    supplyBeforeRaw: supplyBeforeBurn.toString(),
    supplyAfterRaw: mintState.supply.toString(),
    signature: burnSig
  },
  transactions: {
    createPool: createSig,
    swap: swapSig,
    claim: claimSig,
    burn: burnSig
  },
  mainnetExecution: false
};
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync("artifacts/pnex-full-devnet-proof.json", JSON.stringify(evidence, null, 2) + "\n");
console.log("PNEX_FULL_DEVNET_PROOF=PASS pool=" + evidence.pool + " fee_bps=75 permanent_lock=YES claimed=" + claimedQuoteRaw + " burn=YES mainnet=NO");
