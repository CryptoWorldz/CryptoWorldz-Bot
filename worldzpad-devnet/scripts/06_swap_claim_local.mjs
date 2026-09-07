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
  derivePoolAuthority,
  derivePositionNftAccount,
  getUnClaimLpFee,
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
const position = new PublicKey(state.meteoraPhase2.position);
const positionNft = Keypair.fromSecretKey(Uint8Array.from(state.meteoraPhase2.positionNftSecret));
const positionNftAccount = derivePositionNftAccount(positionNft.publicKey);
const poolAuthority = derivePoolAuthority();

const cpAmm = new CpAmm(connection);
const poolStateBefore = await cpAmm.fetchPoolState(pool);
if (!poolStateBefore.tokenAMint.equals(mint)) throw new Error('Phase-3 pool token A drifted from TEST WLDZ');
if (!poolStateBefore.tokenBMint.equals(NATIVE_MINT)) throw new Error('Phase-3 pool token B drifted from wSOL');

// Create the exact accounts ourselves. This deliberately bypasses only the
// cp-amm-sdk convenience ATA builder; the swap and fee claim below still invoke
// the real Meteora DAMM v2 on-chain program loaded in the isolated validator.
const payerWldz = await getOrCreateAssociatedTokenAccount(
  connection, payer, mint, payer.publicKey, false, 'confirmed', { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID,
);
const payerWsol = await getOrCreateAssociatedTokenAccount(
  connection, payer, NATIVE_MINT, payer.publicKey, false, 'confirmed', { commitment: 'confirmed' }, TOKEN_PROGRAM_ID,
);

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

const wsolBeforeSwap = (await getAccount(connection, payerWsol.address, 'confirmed', TOKEN_PROGRAM_ID)).amount;

const swapTx = await cpAmm._program.methods
  .swap({
    amountIn: new BN(SWAP_WLDZ_RAW.toString()),
    minimumAmountOut: new BN(0),
  })
  .accountsPartial({
    poolAuthority,
    pool,
    payer: payer.publicKey,
    inputTokenAccount: payerWldz.address,
    outputTokenAccount: payerWsol.address,
    tokenAVault: poolStateBefore.tokenAVault,
    tokenBVault: poolStateBefore.tokenBVault,
    tokenAMint: poolStateBefore.tokenAMint,
    tokenBMint: poolStateBefore.tokenBMint,
    tokenAProgram: TOKEN_2022_PROGRAM_ID,
    tokenBProgram: TOKEN_PROGRAM_ID,
    referralTokenAccount: null,
  })
  .transaction();
swapTx.feePayer = payer.publicKey;
swapTx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
const swapSimulation = await connection.simulateTransaction(swapTx);
if (swapSimulation.value.err) {
  throw new Error(`Direct Meteora swap simulation failed: ${JSON.stringify(swapSimulation.value.err)} logs=${JSON.stringify(swapSimulation.value.logs)}`);
}
const swapSignature = await sendAndConfirmTransaction(connection, swapTx, [payer], { commitment: 'confirmed' });

const wsolAfterSwap = (await getAccount(connection, payerWsol.address, 'confirmed', TOKEN_PROGRAM_ID)).amount;
if (wsolAfterSwap <= wsolBeforeSwap) throw new Error(`Controlled swap produced no wSOL output: before=${wsolBeforeSwap} after=${wsolAfterSwap}`);

const poolStateAfterSwap = await cpAmm.fetchPoolState(pool);
if (!poolStateAfterSwap.tokenAAmount.gt(poolStateBefore.tokenAAmount)) throw new Error('Controlled WLDZ sell did not increase pool Token A');
if (!poolStateAfterSwap.tokenBAmount.lt(poolStateBefore.tokenBAmount)) throw new Error('Controlled WLDZ sell did not decrease pool Token B');

const positionStateBeforeClaim = await cpAmm.fetchPositionState(position);
const claimableBefore = getUnClaimLpFee(poolStateAfterSwap, positionStateBeforeClaim);
if (!claimableBefore.feeTokenA.isZero()) {
  throw new Error(`OnlyB invariant failed before claim: WLDZ fee=${claimableBefore.feeTokenA.toString()}`);
}
if (claimableBefore.feeTokenB.lte(new BN(0))) {
  throw new Error(`No real Token B trading fee generated: ${claimableBefore.feeTokenB.toString()}`);
}

const claimTx = await cpAmm._program.methods
  .claimPositionFee()
  .accountsPartial({
    poolAuthority,
    signer: payer.publicKey,
    pool,
    position,
    positionNftAccount,
    tokenAAccount: payerWldz.address,
    tokenBAccount: payerWsol.address,
    tokenAVault: poolStateAfterSwap.tokenAVault,
    tokenBVault: poolStateAfterSwap.tokenBVault,
    tokenAMint: poolStateAfterSwap.tokenAMint,
    tokenBMint: poolStateAfterSwap.tokenBMint,
    tokenAProgram: TOKEN_2022_PROGRAM_ID,
    tokenBProgram: TOKEN_PROGRAM_ID,
  })
  .transaction();
claimTx.feePayer = payer.publicKey;
claimTx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
const claimSimulation = await connection.simulateTransaction(claimTx);
if (claimSimulation.value.err) {
  throw new Error(`Direct Meteora fee-claim simulation failed: ${JSON.stringify(claimSimulation.value.err)} logs=${JSON.stringify(claimSimulation.value.logs)}`);
}
const claimSignature = await sendAndConfirmTransaction(connection, claimTx, [payer], { commitment: 'confirmed' });

const wsolAfterClaim = (await getAccount(connection, payerWsol.address, 'confirmed', TOKEN_PROGRAM_ID)).amount;
const claimedWsolDelta = wsolAfterClaim - wsolAfterSwap;
if (claimedWsolDelta <= 0n) throw new Error(`Fee claim produced no additional wSOL: ${claimedWsolDelta}`);

const poolStateAfterClaim = await cpAmm.fetchPoolState(pool);
const positionStateAfterClaim = await cpAmm.fetchPositionState(position);
const claimableAfter = getUnClaimLpFee(poolStateAfterClaim, positionStateAfterClaim);
if (!claimableAfter.feeTokenA.isZero() || !claimableAfter.feeTokenB.isZero()) {
  throw new Error(`Fee claim did not clear position fees: A=${claimableAfter.feeTokenA.toString()} B=${claimableAfter.feeTokenB.toString()}`);
}
if (claimedWsolDelta.toString() !== claimableBefore.feeTokenB.toString()) {
  throw new Error(`Claimed wSOL delta does not reconcile to pending OnlyB fee: delta=${claimedWsolDelta} pending=${claimableBefore.feeTokenB.toString()}`);
}

const report = {
  phase: 'WLDZ_LOCALNET_SWAP_FEE_CLAIM',
  executionPath: 'direct Meteora DAMM v2 Anchor instructions with explicit ATAs',
  pool: pool.toBase58(),
  position: position.toBase58(),
  inputWldzTokens: SWAP_WLDZ_TOKENS.toString(),
  swapSignature,
  swapSimulationPassed: true,
  wsolOutputFromSwapLamports: (wsolAfterSwap - wsolBeforeSwap).toString(),
  poolTokenARawBeforeSwap: poolStateBefore.tokenAAmount.toString(),
  poolTokenARawAfterSwap: poolStateAfterSwap.tokenAAmount.toString(),
  poolTokenBRawBeforeSwap: poolStateBefore.tokenBAmount.toString(),
  poolTokenBRawAfterSwap: poolStateAfterSwap.tokenBAmount.toString(),
  generatedFeeTokenA_WLDZRaw: claimableBefore.feeTokenA.toString(),
  generatedFeeTokenB_wSOLLamports: claimableBefore.feeTokenB.toString(),
  claimSignature,
  claimSimulationPassed: true,
  claimedWsolLamports: claimedWsolDelta.toString(),
  postClaimFeeTokenA: claimableAfter.feeTokenA.toString(),
  postClaimFeeTokenB: claimableAfter.feeTokenB.toString(),
  onlyBClaimProven: claimableBefore.feeTokenA.isZero() && claimableBefore.feeTokenB.gt(new BN(0)) && claimableAfter.feeTokenA.isZero() && claimableAfter.feeTokenB.isZero(),
  note: 'Local protocol proof only. Explicit token accounts avoid the cp-amm-sdk 1.4.7 automatic ATA-builder incompatibility while preserving execution against the actual DAMM v2 program.',
};
fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/wldz-localnet-swap-fee-claim-public.json', JSON.stringify(report, null, 2) + '\n');

const runtime = JSON.parse(fs.readFileSync(runtimePath, 'utf8'));
runtime.phase3 = report;
fs.writeFileSync(runtimePath, JSON.stringify(runtime));

console.log(`WLDZ_SWAP_FEE_CLAIM=PASS pool=${pool.toBase58()} swap_wldz=${SWAP_WLDZ_TOKENS} feeA_wldz_raw=0 feeB_wsol_lamports=${claimableBefore.feeTokenB.toString()} claimed_wsol=${claimedWsolDelta} claim_cleared=1 onlyB_claim=1`);
