#!/usr/bin/env node
// REVIVE mainnet launch simulation — READ ONLY.
// Builds the canonical direct DAMM v2 existing-mint transaction against current
// Solana mainnet state and calls simulateTransaction with signature verification OFF.
// It NEVER signs, NEVER sends, NEVER broadcasts and NEVER moves SOL/RVIV.
//
// Cost-only pricing note:
// The devnet fixture 0.000045 SOL/RVIV is used ONLY so the SDK can build the
// exact pool instruction shape for rent/fee/state simulation. This does NOT set,
// approve, or authorize the REVIVE mainnet opening price.

import fs from 'node:fs';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  CpAmm,
  MAX_SQRT_PRICE,
  getBaseFeeParams,
  getSqrtPriceFromPrice,
} from '@meteora-ag/cp-amm-sdk';
import BN from 'bn.js';

const RPC = process.env.SOLANA_MAINNET_RPC_URL?.trim() || clusterApiUrl('mainnet-beta');
const MAINNET_GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const FEE_SPONSOR = new PublicKey(
  process.env.REVIVE_FEE_SPONSOR || 'Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u',
);

const cfg = JSON.parse(
  fs.readFileSync('../../worldzpad-mainnet/revive/revive-launch-contract.v1.json', 'utf8'),
);
const route = JSON.parse(
  fs.readFileSync('../../worldzpad-mainnet/revive/revive-direct-damm-v2-existing-mint.v1.json', 'utf8'),
);

if (cfg.launch.publicMainnetExecutionEnabled !== false) {
  throw new Error('SAFETY_GATE: public mainnet execution must remain false');
}
if (route.mainnetGates.enabled !== false) {
  throw new Error('SAFETY_GATE: route mainnet execution must remain false');
}
if (route.pricing.mainnet.priceSolPerRviv !== null) {
  throw new Error('SAFETY_GATE: mainnet opening price must remain unset');
}

const connection = new Connection(RPC, 'confirmed');
const genesis = await connection.getGenesisHash();
if (genesis !== MAINNET_GENESIS) throw new Error('MAINNET RPC REQUIRED genesis=' + genesis);

const treasury = new PublicKey(cfg.token.treasuryVault);
const rvivMint = new PublicKey(cfg.token.canonicalMint);
// The REVIVE treasury is Squads vault index 0, an off-curve PDA controlled by the multisig.
const treasuryRvivAta = getAssociatedTokenAddressSync(rvivMint, treasury, true, TOKEN_PROGRAM_ID);
if (treasuryRvivAta.toBase58() !== cfg.token.treasuryTokenAccount) {
  throw new Error(
    'TREASURY ATA DRIFT expected=' + cfg.token.treasuryTokenAccount +
    ' derived=' + treasuryRvivAta.toBase58(),
  );
}
const treasuryWsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, treasury, true);

const [sponsorBalance, treasuryBalance, treasuryRvivBalance, treasuryWsolInfo] = await Promise.all([
  connection.getBalance(FEE_SPONSOR, 'confirmed'),
  connection.getBalance(treasury, 'confirmed'),
  connection.getTokenAccountBalance(treasuryRvivAta, 'confirmed'),
  connection.getAccountInfo(treasuryWsolAta, 'confirmed'),
]);

const launchRaw = 30_000_000n * 1_000_000n;
const treasuryRvivRaw = BigInt(treasuryRvivBalance.value.amount);
if (treasuryRvivRaw < launchRaw) {
  throw new Error(
    'RVIV_BALANCE_GATE: treasury has ' + treasuryRvivRaw +
    ' raw; requires ' + launchRaw,
  );
}

const rentSpecs = [
  ['meteora_pool', 1112],
  ['meteora_position', 408],
  ['rviv_pool_vault', 165],
  ['wsol_pool_vault', 165],
  ['position_nft_mint_token2022_with_meteora_metadata', 465],
  ['position_nft_account_token2022', 165],
];
const rents = {};
let requiredRentLamports = 0n;
for (const [name, bytes] of rentSpecs) {
  const lamports = BigInt(await connection.getMinimumBalanceForRentExemption(bytes, 'confirmed'));
  rents[name] = { bytes, lamports: lamports.toString() };
  requiredRentLamports += lamports;
}
let treasuryWsolAtaRentLamports = 0n;
if (!treasuryWsolInfo) {
  treasuryWsolAtaRentLamports = BigInt(
    await connection.getMinimumBalanceForRentExemption(165, 'confirmed'),
  );
  requiredRentLamports += treasuryWsolAtaRentLamports;
}

const mandatoryQuoteLamports = 1n;
const treasuryNativeNeed = requiredRentLamports + mandatoryQuoteLamports;
const treasuryTopUpLamports =
  treasuryNativeNeed > BigInt(treasuryBalance)
    ? treasuryNativeNeed - BigInt(treasuryBalance)
    : 0n;

const cpAmm = new CpAmm(connection);
const costOnlyPrice = '0.000045';
const initSqrtPrice = getSqrtPriceFromPrice(costOnlyPrice, 6, 9);
const tokenAAmount = new BN(launchRaw.toString());
const tokenBAmount = new BN(0);
const liquidityDelta = cpAmm.preparePoolCreationSingleSide({
  tokenAAmount,
  minSqrtPrice: initSqrtPrice,
  maxSqrtPrice: MAX_SQRT_PRICE,
  initSqrtPrice,
  collectFeeMode: CollectFeeMode.OnlyB,
});
if (liquidityDelta.lte(new BN(0))) throw new Error('zero liquidity delta');

const baseFee = getBaseFeeParams({
  baseFeeMode: BaseFeeMode.FeeTimeSchedulerLinear,
  feeTimeSchedulerParam: {
    startingFeeBps: 75,
    endingFeeBps: 75,
    numberOfPeriod: 0,
    totalDuration: 0,
  },
});
if (!baseFee) throw new Error('DAMM v2 SDK rejected 75-bps fixed fee');

const positionNft = Keypair.generate();
const { tx, pool, position } = await cpAmm.createCustomPool({
  payer: treasury,
  creator: treasury,
  positionNft: positionNft.publicKey,
  tokenAMint: rvivMint,
  tokenBMint: NATIVE_MINT,
  tokenAAmount,
  tokenBAmount,
  sqrtMinPrice: initSqrtPrice,
  sqrtMaxPrice: MAX_SQRT_PRICE,
  liquidityDelta,
  initSqrtPrice,
  poolFees: {
    baseFee,
    compoundingFeeBps: 0,
    padding: 0,
    dynamicFee: null,
  },
  hasAlphaVault: false,
  activationType: ActivationType.Timestamp,
  collectFeeMode: CollectFeeMode.OnlyB,
  activationPoint: null,
  tokenAProgram: TOKEN_PROGRAM_ID,
  tokenBProgram: TOKEN_PROGRAM_ID,
  isLockLiquidity: true,
});

if (treasuryTopUpLamports > 0n) {
  tx.instructions.unshift(
    SystemProgram.transfer({
      fromPubkey: FEE_SPONSOR,
      toPubkey: treasury,
      lamports: Number(treasuryTopUpLamports),
    }),
  );
}

const latest = await connection.getLatestBlockhash('confirmed');
tx.recentBlockhash = latest.blockhash;
tx.feePayer = FEE_SPONSOR;

const message = tx.compileMessage();
const feeReply = await connection.getFeeForMessage(message, 'confirmed');
if (feeReply.value == null) throw new Error('unable to estimate final transaction fee');
const networkFeeLamports = BigInt(feeReply.value);

const sponsorRequiredLamports = treasuryTopUpLamports + networkFeeLamports;
const sponsorSufficient = BigInt(sponsorBalance) >= sponsorRequiredLamports;
if (!sponsorSufficient) {
  throw new Error(
    'SOL_FUNDING_GATE: sponsor=' + sponsorBalance +
    ' required=' + sponsorRequiredLamports,
  );
}

const wire = tx
  .serialize({ requireAllSignatures: false, verifySignatures: false })
  .toString('base64');

const rpcResponse = await fetch(RPC, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'simulateTransaction',
    params: [
      wire,
      {
        encoding: 'base64',
        sigVerify: false,
        replaceRecentBlockhash: true,
        commitment: 'confirmed',
      },
    ],
  }),
});
const simEnvelope = await rpcResponse.json();
if (!rpcResponse.ok || simEnvelope.error) {
  throw new Error('simulateTransaction RPC failed: ' + JSON.stringify(simEnvelope.error || rpcResponse.status));
}
const sim = simEnvelope.result?.value;
if (!sim) throw new Error('simulateTransaction returned no value');

const report = {
  proof: 'REVIVE_MAINNET_CREATE_POOL_READ_ONLY_SIMULATION',
  network: 'solana-mainnet-beta',
  genesisHash: genesis,
  rpcHost: new URL(RPC).host,
  broadcast: false,
  signed: false,
  mainnetExecutionEnabled: false,
  price: {
    valueSolPerRviv: Number(costOnlyPrice),
    usage: 'COST_ONLY_SIMULATION_FIXTURE_NOT_MAINNET_PRICE_APPROVAL',
    mainnetOpeningPriceStillUnset: true,
  },
  token: {
    mint: rvivMint.toBase58(),
    treasury: treasury.toBase58(),
    treasuryTokenAccount: treasuryRvivAta.toBase58(),
    treasuryRvivRaw: treasuryRvivRaw.toString(),
    launchRvivRaw: launchRaw.toString(),
    launchRvivTokens: 30_000_000,
  },
  sol: {
    feeSponsor: FEE_SPONSOR.toBase58(),
    feeSponsorBalanceLamports: String(sponsorBalance),
    feeSponsorBalanceSol: sponsorBalance / 1e9,
    treasuryBalanceLamports: String(treasuryBalance),
    treasuryBalanceSol: treasuryBalance / 1e9,
    treasuryWsolAta: treasuryWsolAta.toBase58(),
    treasuryWsolAtaExists: Boolean(treasuryWsolInfo),
    treasuryWsolAtaRentLamports: treasuryWsolAtaRentLamports.toString(),
    requiredAccountRentLamports: requiredRentLamports.toString(),
    mandatoryQuoteLamports: mandatoryQuoteLamports.toString(),
    treasuryTopUpLamports: treasuryTopUpLamports.toString(),
    treasuryTopUpSol: Number(treasuryTopUpLamports) / 1e9,
    networkFeeLamports: networkFeeLamports.toString(),
    networkFeeSol: Number(networkFeeLamports) / 1e9,
    sponsorRequiredLamports: sponsorRequiredLamports.toString(),
    sponsorRequiredSol: Number(sponsorRequiredLamports) / 1e9,
    sponsorHeadroomLamports: (BigInt(sponsorBalance) - sponsorRequiredLamports).toString(),
    sponsorHeadroomSol: Number(BigInt(sponsorBalance) - sponsorRequiredLamports) / 1e9,
    sponsorSufficient,
    rents,
  },
  transaction: {
    pool: pool.toBase58(),
    position: position.toBase58(),
    positionNftSimulationPubkey: positionNft.publicKey.toBase58(),
    requiredHumanControlledSignersAtBroadcast: [
      FEE_SPONSOR.toBase58(),
      treasury.toBase58(),
    ],
    ephemeralPositionNftSignerAlsoRequired: true,
    baseFeeBps: 75,
    dynamicFee: false,
    initialBaseLiquidityTokens: 30_000_000,
    configuredQuoteLiquiditySol: 0,
    sdkMandatoryRawQuoteLamports: 1,
    permanentLockTargetPercent: 100,
    instructionCount: tx.instructions.length,
    messageAccountCount: message.accountKeys.length,
  },
  simulation: {
    err: sim.err,
    unitsConsumed: sim.unitsConsumed ?? null,
    logs: sim.logs ?? [],
    success: sim.err == null,
  },
  safety: {
    noPrivateKeysRead: true,
    noWalletSecretsRequired: true,
    noSignatureVerification: true,
    noBroadcast: true,
    noTokenMovement: true,
    exactBroadcastStillBlockedByMainnetPriceDecision: true,
    exactBroadcastStillRequiresHumanWalletSignatures: true,
  },
};

fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync(
  'artifacts/revive-mainnet-create-pool-readonly-simulation.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report, null, 2));

if (sim.err != null) {
  console.error('REVIVE_MAINNET_READONLY_SIMULATION=FAIL err=' + JSON.stringify(sim.err));
  process.exitCode = 2;
} else {
  console.log(
    'REVIVE_MAINNET_READONLY_SIMULATION=PASS sponsor_required_sol=' +
    report.sol.sponsorRequiredSol +
    ' sponsor_headroom_sol=' + report.sol.sponsorHeadroomSol +
    ' broadcast=NO mainnet_price=UNSET',
  );
}
