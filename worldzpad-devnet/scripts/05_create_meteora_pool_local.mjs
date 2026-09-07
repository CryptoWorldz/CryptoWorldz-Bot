import fs from 'node:fs';
import path from 'node:path';
import BN from 'bn.js';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getMint,
  getOrCreateAssociatedTokenAccount,
  syncNative,
  transferChecked,
} from '@solana/spl-token';
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  CpAmm,
  decodePodAlignedFeeTimeScheduler,
  feeNumeratorToBps,
  getBaseFeeParams,
  getSqrtPriceFromPrice,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
} from '@meteora-ag/cp-amm-sdk';

const RPC = process.env.SOLANA_RPC_URL || 'http://127.0.0.1:8899';
const connection = new Connection(RPC, 'confirmed');
const runtimePath = path.resolve('.runtime/wldz-test-state.json');
if (!fs.existsSync(runtimePath)) throw new Error('Phase-1 runtime state missing');
const state = JSON.parse(fs.readFileSync(runtimePath, 'utf8'));
if (state.network !== 'localnet') throw new Error(`Phase-2 local proof requires localnet state, got ${state.network}`);

const payer = Keypair.fromSecretKey(Uint8Array.from(state.ephemeralTestSecrets.payer));
const liquidityOwner = Keypair.fromSecretKey(Uint8Array.from(state.ephemeralTestSecrets.vaultOwners.liquidity));
const mint = new PublicKey(state.mint);
const liquidityVault = new PublicKey(state.masterVaults.liquidity.tokenAccount);
const mintInfo = await getMint(connection, mint, 'confirmed', TOKEN_2022_PROGRAM_ID);
if (mintInfo.decimals !== 9) throw new Error('WLDZ test mint decimals drifted');

const INITIAL_WLDZ_TOKENS = 1_000_000n;
const INITIAL_WLDZ_RAW = INITIAL_WLDZ_TOKENS * 1_000_000_000n;
const INITIAL_WSOL_LAMPORTS = 200_000_000n; // 0.2 SOL test quote amount; NOT the mainnet A$200 target.
const BASE_FEE_BPS = 200;

// Move exactly the launch allocation from the 25M Liquidity master vault to the pool creator.
const payerWldz = await getOrCreateAssociatedTokenAccount(
  connection, payer, mint, payer.publicKey, false, 'confirmed', { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID,
);
await transferChecked(
  connection,
  payer,
  liquidityVault,
  mint,
  payerWldz.address,
  liquidityOwner,
  INITIAL_WLDZ_RAW,
  9,
  [],
  { commitment: 'confirmed' },
  TOKEN_2022_PROGRAM_ID,
);

// Create/fund the payer's native-mint ATA so Meteora receives real wrapped SOL as token B.
const payerWsol = await getOrCreateAssociatedTokenAccount(
  connection, payer, NATIVE_MINT, payer.publicKey, false, 'confirmed', { commitment: 'confirmed' }, TOKEN_PROGRAM_ID,
);
const wrapTx = new Transaction().add(SystemProgram.transfer({
  fromPubkey: payer.publicKey,
  toPubkey: payerWsol.address,
  lamports: Number(INITIAL_WSOL_LAMPORTS),
}));
await sendAndConfirmTransaction(connection, wrapTx, [payer], { commitment: 'confirmed' });
await syncNative(connection, payer, payerWsol.address, undefined, TOKEN_PROGRAM_ID);

const cpAmm = new CpAmm(connection);
const epochInfo = await connection.getEpochInfo('confirmed');
const tokenAInfo = { mint: mintInfo, currentEpoch: epochInfo.epoch };
const tokenAAmount = new BN(INITIAL_WLDZ_RAW.toString());
const tokenBAmount = new BN(INITIAL_WSOL_LAMPORTS.toString());
const initSqrtPrice = getSqrtPriceFromPrice('0.0000002', 9, 9); // 0.2 SOL / 1M WLDZ
const liquidityDelta = cpAmm.getLiquidityDelta({
  maxAmountTokenA: tokenAAmount,
  maxAmountTokenB: tokenBAmount,
  sqrtPrice: initSqrtPrice,
  sqrtMinPrice: MIN_SQRT_PRICE,
  sqrtMaxPrice: MAX_SQRT_PRICE,
  collectFeeMode: CollectFeeMode.OnlyB,
  tokenAInfo,
});

const baseFee = getBaseFeeParams({
  baseFeeMode: BaseFeeMode.FeeTimeSchedulerLinear,
  feeTimeSchedulerParam: {
    startingFeeBps: BASE_FEE_BPS,
    endingFeeBps: BASE_FEE_BPS,
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
const positionNft = Keypair.generate();
const { tx, pool, position } = await cpAmm.createCustomPool({
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
  poolFees,
  hasAlphaVault: false,
  activationType: ActivationType.Timestamp,
  collectFeeMode: CollectFeeMode.OnlyB,
  activationPoint: null,
  tokenAProgram: TOKEN_2022_PROGRAM_ID,
  tokenBProgram: TOKEN_PROGRAM_ID,
  isLockLiquidity: true,
});

tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
tx.feePayer = payer.publicKey;
tx.partialSign(payer);
tx.partialSign(positionNft);
const simulation = await connection.simulateTransaction(tx);
if (simulation.value.err) throw new Error(`Meteora pool simulation failed: ${JSON.stringify(simulation.value.err)} logs=${JSON.stringify(simulation.value.logs)}`);
const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
await connection.confirmTransaction(signature, 'confirmed');

const poolState = await cpAmm.fetchPoolState(pool);
if (Number(poolState.collectFeeMode) !== CollectFeeMode.OnlyB) throw new Error(`collect fee mode != OnlyB: ${poolState.collectFeeMode}`);
const decodedBaseFee = decodePodAlignedFeeTimeScheduler(Buffer.from(poolState.poolFees.baseFee.data));
const decodedBps = feeNumeratorToBps(decodedBaseFee.cliffFeeNumerator);
if (decodedBps !== BASE_FEE_BPS) throw new Error(`base fee != 200 bps: ${decodedBps}`);
if (!poolState.tokenAMint.equals(mint)) throw new Error('pool token A != WLDZ');
if (!poolState.tokenBMint.equals(NATIVE_MINT)) throw new Error('pool token B != wSOL');

const report = {
  phase: 'WLDZ_LOCALNET_METEORA_PHASE2',
  program: 'Meteora DAMM v2',
  pool: pool.toBase58(),
  position: position.toBase58(),
  signature,
  tokenA: mint.toBase58(),
  tokenB: NATIVE_MINT.toBase58(),
  initialWldzTokens: INITIAL_WLDZ_TOKENS.toString(),
  initialWsolLamports: INITIAL_WSOL_LAMPORTS.toString(),
  testInitialPriceSolPerWldz: '0.0000002',
  collectFeeMode: 'OnlyB',
  collectFeeModeValue: Number(poolState.collectFeeMode),
  baseTradingFeeBps: decodedBps,
  baseTradingFeePercent: decodedBps / 100,
  liquidityLockedAtCreation: true,
  simulationPassed: true,
  note: 'Local protocol proof only. 0.2 SOL is test liquidity and is not the mainnet A$200 target.',
};
fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/wldz-localnet-meteora-phase2-public.json', JSON.stringify(report, null, 2) + '\n');

const runtime = JSON.parse(fs.readFileSync(runtimePath, 'utf8'));
runtime.meteoraPhase2 = { ...report, positionNftSecret: Array.from(positionNft.secretKey) };
fs.writeFileSync(runtimePath, JSON.stringify(runtime));

console.log(`WLDZ_METEORA_LOCAL_PHASE2=PASS pool=${pool.toBase58()} onlyB=1 fee_bps=200 initial_wldz=1000000 initial_wsol=0.2 simulation=pass`);
