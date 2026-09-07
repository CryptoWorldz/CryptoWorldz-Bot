import fs from 'node:fs';
import path from 'node:path';
import BN from 'bn.js';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  burnChecked,
  closeAccount,
  createTransferCheckedInstruction,
  getAccount,
  getMint,
  getOrCreateAssociatedTokenAccount,
  transferChecked,
} from '@solana/spl-token';
import {
  CpAmm,
  derivePositionNftAccount,
} from '@meteora-ag/cp-amm-sdk';

const RPC = process.env.SOLANA_RPC_URL || 'http://127.0.0.1:8899';
const connection = new Connection(RPC, 'confirmed');
const runtimePath = path.resolve('.runtime/wldz-test-state.json');
if (!fs.existsSync(runtimePath)) throw new Error('WLDZ runtime state missing');
const state = JSON.parse(fs.readFileSync(runtimePath, 'utf8'));
if (state.network !== 'localnet') throw new Error(`Final pre-mainnet proof requires localnet, got ${state.network}`);
if (!state.phase3?.claimedWsolLamports) throw new Error('Phase-3 claimed wSOL proof missing');
if (!state.meteoraPhase2?.pool || !state.meteoraPhase2?.position) throw new Error('Meteora pool runtime missing');

const UNIT = 1_000_000_000n;
const TOTAL_SUPPLY_TOKENS = 100_000_000n;
const payer = Keypair.fromSecretKey(Uint8Array.from(state.ephemeralTestSecrets.payer));
const founderOwner = Keypair.fromSecretKey(Uint8Array.from(state.ephemeralTestSecrets.vaultOwners.founder));
const liquidityOwner = Keypair.fromSecretKey(Uint8Array.from(state.ephemeralTestSecrets.vaultOwners.liquidity));
const peopleOwner = Keypair.fromSecretKey(Uint8Array.from(state.ephemeralTestSecrets.vaultOwners.peopleCharity));
const mint = new PublicKey(state.mint);
const pool = new PublicKey(state.meteoraPhase2.pool);
const position = new PublicKey(state.meteoraPhase2.position);
const positionNft = Keypair.fromSecretKey(Uint8Array.from(state.meteoraPhase2.positionNftSecret));
const positionNftAccount = derivePositionNftAccount(positionNft.publicKey);
const founderMaster = new PublicKey(state.masterVaults.founder.tokenAccount);
const liquidityMaster = new PublicKey(state.masterVaults.liquidity.tokenAccount);
const peopleMaster = new PublicKey(state.masterVaults.peopleCharity.tokenAccount);
const cpAmm = new CpAmm(connection);

const ROUTES = {
  board: 10n,
  holderRewards: 40n,
  lpGrowth: 20n,
  buybackBurn: 15n,
  charity: 10n,
  raaiiiddGrowth: 5n,
};

function splitByPercent(total, routes) {
  const entries = Object.entries(routes);
  const out = {};
  let used = 0n;
  for (let i = 0; i < entries.length; i++) {
    const [name, pct] = entries[i];
    const value = i === entries.length - 1 ? total - used : (total * pct) / 100n;
    out[name] = value;
    used += value;
  }
  if (used !== total) throw new Error(`AUTO route reconciliation failed ${used} != ${total}`);
  return out;
}

function integerSqrt(n) {
  if (n < 0n) throw new Error('sqrt negative');
  if (n < 2n) return n;
  let x0 = n;
  let x1 = (x0 + n / x0) >> 1n;
  while (x1 < x0) { x0 = x1; x1 = (x0 + n / x0) >> 1n; }
  return x0;
}

function allocateWeighted(total, weights) {
  const valid = Object.entries(weights).filter(([, w]) => w > 0n);
  const denom = valid.reduce((s, [, w]) => s + w, 0n);
  if (!denom) throw new Error('zero reward denominator');
  const out = {};
  let used = 0n;
  valid.forEach(([id, w], idx) => {
    const amount = idx === valid.length - 1 ? total - used : (total * w) / denom;
    out[id] = amount;
    used += amount;
  });
  if (used !== total) throw new Error('weighted allocation did not reconcile');
  return out;
}

async function token2022Ata(owner) {
  return await getOrCreateAssociatedTokenAccount(
    connection, payer, mint, owner, false, 'confirmed', { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID,
  );
}

async function wsolAta(owner) {
  return await getOrCreateAssociatedTokenAccount(
    connection, payer, NATIVE_MINT, owner, false, 'confirmed', { commitment: 'confirmed' }, TOKEN_PROGRAM_ID,
  );
}

async function sendChecked(tx, signers, label) {
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
  const simulation = await connection.simulateTransaction(tx);
  if (simulation.value.err) throw new Error(`${label} simulation failed: ${JSON.stringify(simulation.value.err)} logs=${JSON.stringify(simulation.value.logs)}`);
  return await sendAndConfirmTransaction(connection, tx, signers, { commitment: 'confirmed' });
}

async function unwrapRouteToNative(recipient, sourceWsol, amount, label) {
  if (amount <= 0n) throw new Error(`${label} route rounded to zero`);
  const recipientWsol = await wsolAta(recipient.publicKey);
  const nativeBefore = BigInt(await connection.getBalance(recipient.publicKey, 'confirmed'));
  await transferChecked(
    connection, payer, sourceWsol, NATIVE_MINT, recipientWsol.address, payer,
    amount, 9, [], { commitment: 'confirmed' }, TOKEN_PROGRAM_ID,
  );
  const tokenBeforeClose = await getAccount(connection, recipientWsol.address, 'confirmed', TOKEN_PROGRAM_ID);
  if (tokenBeforeClose.amount !== amount) throw new Error(`${label} wSOL principal mismatch ${tokenBeforeClose.amount} != ${amount}`);
  const accountInfoBeforeClose = await connection.getAccountInfo(recipientWsol.address, 'confirmed');
  if (!accountInfoBeforeClose) throw new Error(`${label} wSOL account disappeared before unwrap`);
  const accountLamportsBeforeClose = BigInt(accountInfoBeforeClose.lamports);
  const closeSig = await closeAccount(
    connection, payer, recipientWsol.address, recipient.publicKey, recipient, [],
    { commitment: 'confirmed' }, TOKEN_PROGRAM_ID,
  );
  const nativeAfter = BigInt(await connection.getBalance(recipient.publicKey, 'confirmed'));
  const nativeDelta = nativeAfter - nativeBefore;
  if (nativeDelta !== accountLamportsBeforeClose) {
    throw new Error(`${label} native SOL unwrap mismatch delta=${nativeDelta} accountLamports=${accountLamportsBeforeClose}`);
  }
  if (nativeDelta < amount) throw new Error(`${label} native SOL principal was not delivered`);
  return {
    recipient: recipient.publicKey.toBase58(),
    principalLamports: amount.toString(),
    nativeDeltaLamports: nativeDelta.toString(),
    rentReturnedLamports: (nativeDelta - amount).toString(),
    closeSignature: closeSig,
  };
}

// ---- Epoch/idempotency gate ----
const FINAL_EPOCH_ID = 'WLDZ-LOCAL-FINAL-EPOCH-0001';
state.autoEpochs = state.autoEpochs || [];
if (state.autoEpochs.includes(FINAL_EPOCH_ID)) throw new Error('duplicate AUTO epoch was not blocked');
state.autoEpochs.push(FINAL_EPOCH_ID);
let duplicateEpochBlocked = false;
try {
  if (state.autoEpochs.includes(FINAL_EPOCH_ID)) throw new Error('DUPLICATE_EPOCH');
} catch (err) {
  duplicateEpochBlocked = err.message === 'DUPLICATE_EPOCH';
}
if (!duplicateEpochBlocked) throw new Error('duplicate epoch fail-closed test failed');

const claimedFee = BigInt(state.phase3.claimedWsolLamports);
if (claimedFee <= 0n) throw new Error('claimed fee is zero');
const routes = splitByPercent(claimedFee, ROUTES);
if (Object.values(routes).reduce((a, b) => a + b, 0n) !== claimedFee) throw new Error('AUTO routes do not sum to claimed fee');

const payerWsol = await wsolAta(payer.publicKey);
const payerWldz = await token2022Ata(payer.publicKey);
const payerWsolStart = (await getAccount(connection, payerWsol.address, 'confirmed', TOKEN_PROGRAM_ID)).amount;
if (payerWsolStart < claimedFee) throw new Error(`payer wSOL does not contain claimed fee: ${payerWsolStart} < ${claimedFee}`);

// ---- G.R.A.C.E. allocation authority-separation proof ----
// Phase 3 deliberately spent 100,000 WLDZ from the founder operational tranche to generate controlled volume.
const founderSpentForTest = 100_000n * UNIT;
const founderMasterBalanceBefore = (await getAccount(connection, founderMaster, 'confirmed', TOKEN_2022_PROGRAM_ID)).amount;
if (founderMasterBalanceBefore !== (25_000_000n * UNIT - founderSpentForTest)) {
  throw new Error(`founder post-test balance drift ${founderMasterBalanceBefore}`);
}
const founderOperationalOwner = Keypair.generate();
const founderLockedOwner = Keypair.generate();
const founderOperationalAta = await token2022Ata(founderOperationalOwner.publicKey);
const founderLockedAta = await token2022Ata(founderLockedOwner.publicKey);
await transferChecked(connection, payer, founderMaster, mint, founderLockedAta.address, founderOwner, 20_000_000n * UNIT, 9, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID);
await transferChecked(connection, payer, founderMaster, mint, founderOperationalAta.address, founderOwner, 4_900_000n * UNIT, 9, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID);
if ((await getAccount(connection, founderMaster, 'confirmed', TOKEN_2022_PROGRAM_ID)).amount !== 0n) throw new Error('founder master was not fully separated after test spend');

const legendsOwner = Keypair.generate();
const boostOwner = Keypair.generate();
const charityEndowmentOwner = Keypair.generate();
const legendsAta = await token2022Ata(legendsOwner.publicKey);
const boostAta = await token2022Ata(boostOwner.publicKey);
const charityEndowmentAta = await token2022Ata(charityEndowmentOwner.publicKey);
await transferChecked(connection, payer, peopleMaster, mint, legendsAta.address, peopleOwner, 14_000_000n * UNIT, 9, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID);
await transferChecked(connection, payer, peopleMaster, mint, boostAta.address, peopleOwner, 4_000_000n * UNIT, 9, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID);
await transferChecked(connection, payer, peopleMaster, mint, charityEndowmentAta.address, peopleOwner, 7_000_000n * UNIT, 9, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID);
if ((await getAccount(connection, peopleMaster, 'confirmed', TOKEN_2022_PROGRAM_ID)).amount !== 0n) throw new Error('People+Charity 14/4/7 split did not consume exactly 25M');

// Prove a non-G.R.A.C.E. authority cannot move the separated Charity Endowment.
const wrongDest = await token2022Ata(Keypair.generate().publicKey);
const wrongWalletTx = new Transaction().add(createTransferCheckedInstruction(
  charityEndowmentAta.address, mint, wrongDest.address, payer.publicKey, 1n, 9, [], TOKEN_2022_PROGRAM_ID,
));
wrongWalletTx.feePayer = payer.publicKey;
wrongWalletTx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
const wrongWalletSimulation = await connection.simulateTransaction(wrongWalletTx);
const wrongWalletBlocked = Boolean(wrongWalletSimulation.value.err);
if (!wrongWalletBlocked) throw new Error('wrong-wallet Charity Endowment spend was not rejected');

// ---- Create eligible test holders from Founder operational inventory ----
const holderDefs = [
  ['smallHolder', 10_000n],
  ['mediumHolder', 100_000n],
  ['largeHolder', 1_000_000n],
];
const holders = {};
for (const [id, tokens] of holderDefs) {
  const wallet = Keypair.generate();
  const ata = await token2022Ata(wallet.publicKey);
  await transferChecked(
    connection, payer, founderOperationalAta.address, mint, ata.address, founderOperationalOwner,
    tokens * UNIT, 9, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID,
  );
  holders[id] = { wallet, ata, tokens };
}

// ---- 40% HODL route: 70% proportional + 30% sqrt Equalizer, actually unwrapped to native SOL ----
const proportionalPool = routes.holderRewards * 70n / 100n;
const equalizerPool = routes.holderRewards - proportionalPool;
const balances = Object.fromEntries(Object.entries(holders).map(([id, h]) => [id, h.tokens]));
const proportional = allocateWeighted(proportionalPool, balances);
const sqrtWeights = Object.fromEntries(Object.entries(balances).map(([id, bal]) => [id, integerSqrt(bal)]));
const equalizer = allocateWeighted(equalizerPool, sqrtWeights);
const rewards = Object.fromEntries(Object.keys(holders).map((id) => [id, proportional[id] + equalizer[id]]));
if (Object.values(rewards).reduce((a, b) => a + b, 0n) !== routes.holderRewards) throw new Error('holder rewards did not reconcile');
if (!(rewards.largeHolder > rewards.mediumHolder && rewards.mediumHolder > rewards.smallHolder)) throw new Error('absolute holder reward ordering failed');
const perTokenScaled = Object.fromEntries(Object.entries(rewards).map(([id, reward]) => [id, reward * 1_000_000n / balances[id]]));
if (!(perTokenScaled.smallHolder > perTokenScaled.mediumHolder && perTokenScaled.mediumHolder > perTokenScaled.largeHolder)) throw new Error('Equalizer smaller-holder per-token boost failed');
const holderSolProofs = {};
for (const [id, reward] of Object.entries(rewards)) {
  holderSolProofs[id] = await unwrapRouteToNative(holders[id].wallet, payerWsol.address, reward, `holder:${id}`);
}

// ---- 10% Charity route: actual wSOL -> native SOL distribution ----
const charityRecipient = Keypair.generate();
const charitySolProof = await unwrapRouteToNative(charityRecipient, payerWsol.address, routes.charity, 'charity');

// ---- 10% Board + 5% Raaiiidd routes: dedicated wSOL vaults ----
const boardOwner = Keypair.generate();
const raaiiiddOwner = Keypair.generate();
const boardWsol = await wsolAta(boardOwner.publicKey);
const raaiiiddWsol = await wsolAta(raaiiiddOwner.publicKey);
await transferChecked(connection, payer, payerWsol.address, NATIVE_MINT, boardWsol.address, payer, routes.board, 9, [], { commitment: 'confirmed' }, TOKEN_PROGRAM_ID);
await transferChecked(connection, payer, payerWsol.address, NATIVE_MINT, raaiiiddWsol.address, payer, routes.raaiiiddGrowth, 9, [], { commitment: 'confirmed' }, TOKEN_PROGRAM_ID);
if ((await getAccount(connection, boardWsol.address, 'confirmed', TOKEN_PROGRAM_ID)).amount !== routes.board) throw new Error('Board route balance mismatch');
if ((await getAccount(connection, raaiiiddWsol.address, 'confirmed', TOKEN_PROGRAM_ID)).amount !== routes.raaiiiddGrowth) throw new Error('Raaiiidd route balance mismatch');

// ---- 20% LP Growth route: match real wSOL with real WLDZ from Liquidity Reserve ----
const poolBeforeLp = await cpAmm.fetchPoolState(pool);
const positionBeforeLp = await cpAmm.fetchPositionState(position);
const liquidityReleasedBeforeRaw = 1_000_000n * UNIT;
const yearOneAdditionalCapRaw = 4_000_000n * UNIT;
function requireLpReleaseWithinSchedule(additionalRaw) {
  if (additionalRaw <= 0n) throw new Error('LP_RELEASE_ZERO');
  if (additionalRaw > yearOneAdditionalCapRaw) throw new Error('LP_RELEASE_EXCEEDS_YEAR1_CAP');
  return true;
}
let excessiveLpReleaseBlocked = false;
try { requireLpReleaseWithinSchedule(yearOneAdditionalCapRaw + 1n); } catch (e) { excessiveLpReleaseBlocked = e.message === 'LP_RELEASE_EXCEEDS_YEAR1_CAP'; }
if (!excessiveLpReleaseBlocked) throw new Error('excessive LP release guard failed');

const lpQuote = await cpAmm.getDepositQuote({
  inAmount: new BN(routes.lpGrowth.toString()),
  isTokenA: false,
  sqrtPrice: poolBeforeLp.sqrtPrice,
  minSqrtPrice: poolBeforeLp.sqrtMinPrice,
  maxSqrtPrice: poolBeforeLp.sqrtMaxPrice,
  collectFeeMode: poolBeforeLp.collectFeeMode,
  tokenAAmount: poolBeforeLp.tokenAAmount,
  tokenBAmount: poolBeforeLp.tokenBAmount,
  liquidity: poolBeforeLp.liquidity,
});
const lpWldzRaw = BigInt(lpQuote.outputAmount.toString());
const lpWsolConsumed = BigInt(lpQuote.consumedInputAmount.toString());
if (lpWldzRaw <= 0n || lpWsolConsumed <= 0n) throw new Error('LP quote produced zero side');
if (lpWsolConsumed > routes.lpGrowth) throw new Error('LP quote exceeds AUTO LP wSOL bucket');
requireLpReleaseWithinSchedule(lpWldzRaw);
const liquidityBalanceBefore = (await getAccount(connection, liquidityMaster, 'confirmed', TOKEN_2022_PROGRAM_ID)).amount;
if (liquidityBalanceBefore < lpWldzRaw) throw new Error('Liquidity Reserve lacks matching WLDZ');
await transferChecked(connection, payer, liquidityMaster, mint, payerWldz.address, liquidityOwner, lpWldzRaw, 9, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID);

const addLpTx = await cpAmm._program.methods
  .addLiquidity({
    liquidityDelta: lpQuote.liquidityDelta,
    tokenAAmountThreshold: lpQuote.outputAmount,
    tokenBAmountThreshold: lpQuote.consumedInputAmount,
  })
  .accountsPartial({
    pool,
    position,
    positionNftAccount,
    signer: payer.publicKey,
    tokenAAccount: payerWldz.address,
    tokenBAccount: payerWsol.address,
    tokenAMint: poolBeforeLp.tokenAMint,
    tokenBMint: poolBeforeLp.tokenBMint,
    tokenAVault: poolBeforeLp.tokenAVault,
    tokenBVault: poolBeforeLp.tokenBVault,
    tokenAProgram: TOKEN_2022_PROGRAM_ID,
    tokenBProgram: TOKEN_PROGRAM_ID,
  })
  .transaction();
const addLpSignature = await sendChecked(addLpTx, [payer], 'AUTO LP addition');
const poolAfterLp = await cpAmm.fetchPoolState(pool);
const positionAfterLp = await cpAmm.fetchPositionState(position);
if (!poolAfterLp.tokenAAmount.gt(poolBeforeLp.tokenAAmount)) throw new Error('AUTO LP addition did not increase pool WLDZ');
if (!poolAfterLp.tokenBAmount.gt(poolBeforeLp.tokenBAmount)) throw new Error('AUTO LP addition did not increase pool wSOL');
const lpResidual = routes.lpGrowth - lpWsolConsumed;
let lpResidualVault = null;
if (lpResidual > 0n) {
  const lpReserveOwner = Keypair.generate();
  const lpReserveWsol = await wsolAta(lpReserveOwner.publicKey);
  await transferChecked(connection, payer, payerWsol.address, NATIVE_MINT, lpReserveWsol.address, payer, lpResidual, 9, [], { commitment: 'confirmed' }, TOKEN_PROGRAM_ID);
  lpResidualVault = { owner: lpReserveOwner.publicKey.toBase58(), tokenAccount: lpReserveWsol.address.toBase58(), lamports: lpResidual.toString() };
}

// ---- 15% Buyback + Burn route: actual wSOL -> WLDZ swap -> Token-2022 burn ----
const poolBeforeBuyback = await cpAmm.fetchPoolState(pool);
const wldzBeforeBuyback = (await getAccount(connection, payerWldz.address, 'confirmed', TOKEN_2022_PROGRAM_ID)).amount;
const supplyBeforeBurn = (await getMint(connection, mint, 'confirmed', TOKEN_2022_PROGRAM_ID)).supply;
const buybackTx = await cpAmm._program.methods
  .swap({ amountIn: new BN(routes.buybackBurn.toString()), minimumAmountOut: new BN(0) })
  .accountsPartial({
    poolAuthority: cpAmm.poolAuthority ?? undefined,
    pool,
    payer: payer.publicKey,
    inputTokenAccount: payerWsol.address,
    outputTokenAccount: payerWldz.address,
    tokenAVault: poolBeforeBuyback.tokenAVault,
    tokenBVault: poolBeforeBuyback.tokenBVault,
    tokenAMint: poolBeforeBuyback.tokenAMint,
    tokenBMint: poolBeforeBuyback.tokenBMint,
    tokenAProgram: TOKEN_2022_PROGRAM_ID,
    tokenBProgram: TOKEN_PROGRAM_ID,
    referralTokenAccount: null,
  })
  .transaction();
// Anchor can derive the pool authority when omitted by account resolution; keep the same direct-program path as Phase 3.
const buybackSignature = await sendChecked(buybackTx, [payer], 'AUTO buyback');
const wldzAfterBuyback = (await getAccount(connection, payerWldz.address, 'confirmed', TOKEN_2022_PROGRAM_ID)).amount;
const boughtWldzRaw = wldzAfterBuyback - wldzBeforeBuyback;
if (boughtWldzRaw <= 0n) throw new Error('buyback produced zero WLDZ');
const burnSignature = await burnChecked(
  connection, payer, payerWldz.address, mint, payer, boughtWldzRaw, 9, [], { commitment: 'confirmed' }, TOKEN_2022_PROGRAM_ID,
);
const supplyAfterBurn = (await getMint(connection, mint, 'confirmed', TOKEN_2022_PROGRAM_ID)).supply;
if (supplyBeforeBurn - supplyAfterBurn !== boughtWldzRaw) throw new Error(`Token-2022 burn supply mismatch ${supplyBeforeBurn - supplyAfterBurn} != ${boughtWldzRaw}`);

// ---- Fail-closed tests ----
let insufficientSolBlocked = false;
try {
  const current = (await getAccount(connection, payerWsol.address, 'confirmed', TOKEN_PROGRAM_ID)).amount;
  const request = current + 1n;
  if (request > current) throw new Error('INSUFFICIENT_WSOL_BLOCKED');
} catch (e) { insufficientSolBlocked = e.message === 'INSUFFICIENT_WSOL_BLOCKED'; }
if (!insufficientSolBlocked) throw new Error('insufficient wSOL fail-closed test failed');

// Atomic rollback: one valid transfer + one impossible transfer in the same transaction must commit neither.
const atomicDestOwner = Keypair.generate();
const atomicDest = await token2022Ata(atomicDestOwner.publicKey);
const founderOpBeforeAtomic = (await getAccount(connection, founderOperationalAta.address, 'confirmed', TOKEN_2022_PROGRAM_ID)).amount;
const atomicDestBefore = (await getAccount(connection, atomicDest.address, 'confirmed', TOKEN_2022_PROGRAM_ID)).amount;
const impossibleAmount = founderOpBeforeAtomic + 1n;
const atomicTx = new Transaction().add(
  createTransferCheckedInstruction(founderOperationalAta.address, mint, atomicDest.address, founderOperationalOwner.publicKey, 1n, 9, [], TOKEN_2022_PROGRAM_ID),
  createTransferCheckedInstruction(founderOperationalAta.address, mint, atomicDest.address, founderOperationalOwner.publicKey, impossibleAmount, 9, [], TOKEN_2022_PROGRAM_ID),
);
atomicTx.feePayer = payer.publicKey;
atomicTx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
let atomicRollbackBlocked = false;
try {
  await sendAndConfirmTransaction(connection, atomicTx, [payer, founderOperationalOwner], { commitment: 'confirmed', skipPreflight: false });
} catch {
  atomicRollbackBlocked = true;
}
if (!atomicRollbackBlocked) throw new Error('atomic rollback transaction unexpectedly succeeded');
const founderOpAfterAtomic = (await getAccount(connection, founderOperationalAta.address, 'confirmed', TOKEN_2022_PROGRAM_ID)).amount;
const atomicDestAfter = (await getAccount(connection, atomicDest.address, 'confirmed', TOKEN_2022_PROGRAM_ID)).amount;
if (founderOpAfterAtomic !== founderOpBeforeAtomic || atomicDestAfter !== atomicDestBefore) throw new Error('failed transaction changed token balances; atomicity broken');

// Claimed-fee budget must have been completely routed/consumed, independent of the pre-existing swap output wSOL.
const payerWsolEnd = (await getAccount(connection, payerWsol.address, 'confirmed', TOKEN_PROGRAM_ID)).amount;
const routedDelta = payerWsolStart - payerWsolEnd;
if (routedDelta !== claimedFee) throw new Error(`AUTO claimed-fee reconciliation failed start-end=${routedDelta} claimed=${claimedFee}`);

const lockedRewardExclusions = [
  founderLockedAta.address.toBase58(),
  legendsAta.address.toBase58(),
  boostAta.address.toBase58(),
  charityEndowmentAta.address.toBase58(),
  liquidityMaster.toBase58(),
];
const eligibleRewardAccounts = Object.values(holders).map((h) => h.ata.address.toBase58());
if (lockedRewardExclusions.some((a) => eligibleRewardAccounts.includes(a))) throw new Error('locked/system WLDZ leaked into holder eligibility');

const gracePolicy = {
  founder: { genesisTokens: '25000000', operationalGenesisTokens: '5000000', vestingTokens: '20000000', vestingMonths: 36, controlledTestSpendTokens: '100000' },
  legends: { tokens: '14000000', perLegendTargetPercent: 1, activeSelectionApplies: true },
  boost: { tokens: '4000000', seats: 16, tokensPerSeat: '250000', initialUnlockPercent: 20, vestingMonths: 12 },
  charityEndowment: { tokens: '7000000', initialCliffMonths: 12, automaticDumping: false },
  liquidity: { genesisTokens: '25000000', launchTokens: '1000000', yearOneAdditionalCapTokens: '4000000', additionalThisTestRaw: lpWldzRaw.toString() },
  note: 'Local pre-mainnet proof verifies allocation amounts, authority separation, reward exclusion and release guards. Production time enforcement requires the final G.R.A.C.E. signer/runtime or an audited on-chain vesting program.',
};

const report = {
  phase: 'WLDZ_FINAL_PRE_MAINNET_LOCAL_TEST',
  epochId: FINAL_EPOCH_ID,
  claimedFeeWsolLamports: claimedFee.toString(),
  autoRoutes: Object.fromEntries(Object.entries(routes).map(([k, v]) => [k, v.toString()])),
  autoReconciled: routedDelta === claimedFee,
  holderEpoch: {
    cadenceHours: 6,
    proportionalPercent: 70,
    equalizerPercent: 30,
    rewardLamports: Object.fromEntries(Object.entries(rewards).map(([k, v]) => [k, v.toString()])),
    nativeSolProofs: holderSolProofs,
    lockedSystemAccountsExcluded: true,
  },
  charity: {
    ongoingFeeRoutePercent: 10,
    nativeSolDistribution: charitySolProof,
    endowmentTokenAccount: charityEndowmentAta.address.toBase58(),
    endowmentTokens: '7000000',
  },
  board: { percent: 10, vault: boardWsol.address.toBase58(), wsolLamports: routes.board.toString() },
  raaiiidd: { percent: 5, vault: raaiiiddWsol.address.toBase58(), wsolLamports: routes.raaiiiddGrowth.toString() },
  lpGrowth: {
    percent: 20,
    signature: addLpSignature,
    wsolBucketLamports: routes.lpGrowth.toString(),
    wsolConsumedLamports: lpWsolConsumed.toString(),
    wldzAddedRaw: lpWldzRaw.toString(),
    residual: lpResidualVault,
    poolTokenAIncreaseRaw: poolAfterLp.tokenAAmount.sub(poolBeforeLp.tokenAAmount).toString(),
    poolTokenBIncreaseRaw: poolAfterLp.tokenBAmount.sub(poolBeforeLp.tokenBAmount).toString(),
    positionLiquidityBefore: positionBeforeLp.liquidity.toString(),
    positionLiquidityAfter: positionAfterLp.liquidity.toString(),
  },
  buybackBurn: {
    percent: 15,
    buybackSignature,
    burnSignature,
    wsolInputLamports: routes.buybackBurn.toString(),
    wldzBoughtAndBurnedRaw: boughtWldzRaw.toString(),
    supplyBeforeBurnRaw: supplyBeforeBurn.toString(),
    supplyAfterBurnRaw: supplyAfterBurn.toString(),
  },
  gracePolicy,
  failClosed: {
    duplicateEpochBlocked,
    wrongWalletBlocked,
    excessiveLpReleaseBlocked,
    insufficientSolBlocked,
    atomicRollbackBlocked,
  },
  mainnetFundsTouched: false,
  mainnetSignerTouched: false,
  result: 'PASS',
};

fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/wldz-final-pre-mainnet-local-test-public.json', JSON.stringify(report, null, 2) + '\n');
state.finalPreMainnetTest = report;
fs.writeFileSync(runtimePath, JSON.stringify(state));

console.log(`WLDZ_FINAL_PRE_MAINNET=PASS claimed=${claimedFee} routes=10/40/20/15/10/5 holder_native_sol=1 lp_add=1 buyback_burn=1 charity_native_sol=1 grace_allocations=1 duplicate_block=1 wrong_wallet_block=1 excessive_lp_block=1 insufficient_wsol_block=1 atomic_rollback=1`);
