import fs from 'node:fs';
import path from 'node:path';
import BN from 'bn.js';
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  transferChecked,
} from '@solana/spl-token';
import {
  CpAmm,
  derivePositionNftAccount,
  getTokenProgram,
} from '@meteora-ag/cp-amm-sdk';

const RPC = process.env.SOLANA_RPC_URL || 'http://127.0.0.1:8899';
const connection = new Connection(RPC, 'confirmed');
const runtimePath = path.resolve('.runtime/wldz-test-state.json');
if (!fs.existsSync(runtimePath)) throw new Error('WLDZ runtime state missing');
const state = JSON.parse(fs.readFileSync(runtimePath, 'utf8'));
if (state.network !== 'localnet') throw new Error(`Phase-3 local proof requires localnet, got ${state.network}`);
if (!state.meteoraPhase2?.pool || !state.meteoraPhase2?.position) throw new Error('Phase-2 Meteora pool state missing');

const payer = Keypair.fromSecretKey(Uint8Array.from(state.ephemeralTestSecrets.payer));
const founderOwner = Keypair.fromSecretKey(Uint8Array.from(state.ephemeralTestSecrets.vaultOwners.founder));
const mint = new PublicKey(state.mint);
const founderVault = new PublicKey(state.masterVaults.founder.tokenAccount);
const pool = new PublicKey(state.meteoraPhase2.pool);
const storedPosition = new PublicKey(state.meteoraPhase2.position);
const positionNft = Keypair.fromSecretKey(Uint8Array.from(state.meteoraPhase2.positionNftSecret));
const storedPositionNftAccount = derivePositionNftAccount(positionNft.publicKey);

const cpAmm = new CpAmm(connection);
const poolStateBefore = await cpAmm.fetchPoolState(pool);
if (!poolStateBefore.tokenAMint.equals(mint)) throw new Error('Phase-3 pool token A drifted from TEST WLDZ');
if (!poolStateBefore.tokenBMint.equals(NATIVE_MINT)) throw new Error('Phase-3 pool token B drifted from wSOL');

const payerWldz = await getOrCreateAssociatedTokenAccount(
  connection, payer, mint, payer.publicKey, false, 'confirmed', { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID,
);
const payerWsol = await getOrCreateAssociatedTokenAccount(
  connection, payer, NATIVE_MINT, payer.publicKey, false, 'confirmed', { commitment: 'confirmed' }, TOKEN_PROGRAM_ID,
);

// Use Founder TEST inventory only to create controlled test trading volume.
// This is disposable localnet value and is not a mainnet founder transfer.
const SWAP_WLDZ_TOKENS = 100_000n;
const SWAP_WLDZ_RAW = SWAP_WLDZ_TOKENS * 1_000_000_000n;
await transferChecked(
  connection,
  payer,
  founderVault,
  mint,
  payerWldz.address,
  founderOwner,
  SWAP_WLDZ_RAW,
  9,
  [],
  { commitment: 'confirmed' },
  TOKEN_2022_PROGRAM_ID,
);

const preSwapWldz = (await getAccount(connection, payerWldz.address, 'confirmed', TOKEN_2022_PROGRAM_ID)).amount;
const preSwapWsol = (await getAccount(connection, payerWsol.address, 'confirmed', TOKEN_PROGRAM_ID)).amount;
if (preSwapWldz < SWAP_WLDZ_RAW) throw new Error('Controlled trader WLDZ funding failed');

const swapTx = await cpAmm.swap({
  payer: payer.publicKey,
  pool,
  inputTokenMint: mint,
  outputTokenMint: NATIVE_MINT,
  amountIn: new BN(SWAP_WLDZ_RAW.toString()),
  minimumAmountOut: new BN(0),
  tokenAMint: poolStateBefore.tokenAMint,
  tokenBMint: poolStateBefore.tokenBMint,
  tokenAVault: poolStateBefore.tokenAVault,
  tokenBVault: poolStateBefore.tokenBVault,
  tokenAProgram: getTokenProgram(poolStateBefore.tokenAFlag),
  tokenBProgram: getTokenProgram(poolStateBefore.tokenBFlag),
  referralTokenAccount: null,
  poolState: poolStateBefore,
});
swapTx.feePayer = payer.publicKey;
swapTx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
const swapSimulation = await connection.simulateTransaction(swapTx);
if (swapSimulation.value.err) {
  throw new Error(`Controlled swap simulation failed: ${JSON.stringify(swapSimulation.value.err)} logs=${JSON.stringify(swapSimulation.value.logs)}`);
}
const swapSignature = await sendAndConfirmTransaction(connection, swapTx, [payer], { commitment: 'confirmed' });

const postSwapWldz = (await getAccount(connection, payerWldz.address, 'confirmed', TOKEN_2022_PROGRAM_ID)).amount;
const postSwapWsol = (await getAccount(connection, payerWsol.address, 'confirmed', TOKEN_PROGRAM_ID)).amount;
if (postSwapWldz >= preSwapWldz) throw new Error('Controlled WLDZ sell did not consume WLDZ');
if (postSwapWsol <= preSwapWsol) throw new Error('Controlled WLDZ sell did not produce wSOL');

// Resolve the initial LP position. Permanent liquidity locking must not prevent fee ownership/claim proof.
const userPositions = await cpAmm.getUserPositionByPool(pool, payer.publicKey);
let position = storedPosition;
let positionNftAccount = storedPositionNftAccount;
let positionResolution = 'stored';
if (userPositions.length > 0) {
  const exact = userPositions.find((p) => p.position.equals(storedPosition)) || userPositions[0];
  position = exact.position;
  positionNftAccount = exact.positionNftAccount;
  positionResolution = exact.position.equals(storedPosition) ? 'user-exact' : 'user-first';
}

const poolStateClaim = await cpAmm.fetchPoolState(pool);
const wldzBeforeClaim = (await getAccount(connection, payerWldz.address, 'confirmed', TOKEN_2022_PROGRAM_ID)).amount;
const wsolBeforeClaim = (await getAccount(connection, payerWsol.address, 'confirmed', TOKEN_PROGRAM_ID)).amount;

const claimTx = await cpAmm.claimPositionFee({
  receiver: payer.publicKey,
  owner: payer.publicKey,
  pool,
  position,
  positionNftAccount,
  tokenAVault: poolStateClaim.tokenAVault,
  tokenBVault: poolStateClaim.tokenBVault,
  tokenAMint: poolStateClaim.tokenAMint,
  tokenBMint: poolStateClaim.tokenBMint,
  tokenAProgram: getTokenProgram(poolStateClaim.tokenAFlag),
  tokenBProgram: getTokenProgram(poolStateClaim.tokenBFlag),
});
claimTx.feePayer = payer.publicKey;
claimTx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
const claimSimulation = await connection.simulateTransaction(claimTx);
if (claimSimulation.value.err) {
  throw new Error(`Fee claim simulation failed: ${JSON.stringify(claimSimulation.value.err)} logs=${JSON.stringify(claimSimulation.value.logs)}`);
}
const claimSignature = await sendAndConfirmTransaction(connection, claimTx, [payer], { commitment: 'confirmed' });

const wldzAfterClaim = (await getAccount(connection, payerWldz.address, 'confirmed', TOKEN_2022_PROGRAM_ID)).amount;
const wsolAfterClaim = (await getAccount(connection, payerWsol.address, 'confirmed', TOKEN_PROGRAM_ID)).amount;
const claimedWldzRaw = wldzAfterClaim - wldzBeforeClaim;
const claimedWsolLamports = wsolAfterClaim - wsolBeforeClaim;

if (claimedWsolLamports <= 0n) throw new Error(`No claimable wSOL fee observed after controlled swap: ${claimedWsolLamports}`);
if (claimedWldzRaw !== 0n) throw new Error(`OnlyB invariant failed: claim returned ${claimedWldzRaw} raw WLDZ`);

const report = {
  phase: 'WLDZ_LOCALNET_SWAP_FEE_CLAIM',
  pool: pool.toBase58(),
  position: position.toBase58(),
  positionResolution,
  inputWldzTokens: SWAP_WLDZ_TOKENS.toString(),
  swapSignature,
  swapSimulationPassed: true,
  swapWsolOutputLamports: (postSwapWsol - preSwapWsol).toString(),
  claimSignature,
  claimSimulationPassed: true,
  claimedTokenA_WLDZRaw: claimedWldzRaw.toString(),
  claimedTokenB_wSOLLamports: claimedWsolLamports.toString(),
  onlyBClaimProven: claimedWldzRaw === 0n && claimedWsolLamports > 0n,
  note: 'Isolated local-validator proof using TEST WLDZ and TEST SOL only.',
};
fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/wldz-localnet-swap-fee-claim-public.json', JSON.stringify(report, null, 2) + '\n');

const runtime = JSON.parse(fs.readFileSync(runtimePath, 'utf8'));
runtime.phase3 = report;
fs.writeFileSync(runtimePath, JSON.stringify(runtime));

console.log(`WLDZ_SWAP_FEE_CLAIM=PASS pool=${pool.toBase58()} swap_wldz=${SWAP_WLDZ_TOKENS} claimed_wsol_lamports=${claimedWsolLamports} claimed_wldz_raw=0 onlyB_claim=1`);
