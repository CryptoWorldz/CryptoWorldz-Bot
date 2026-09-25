import {
  MAGIC_FEE_BPS,
  SUPPORTED_CHAINS,
  quoteMagicFee,
  validateLaunchIntent,
  buildPreSignatureDisclosure
} from './omnichain-core.mjs';

if (MAGIC_FEE_BPS !== 75n) throw new Error('MagicFeeNumber drifted');
if (SUPPORTED_CHAINS.length !== 8) throw new Error('expected eight chain adapters');

const q = quoteMagicFee({
  tradeAmountAtomic: 1_000_000_000n,
  externalProtocolShareBpsOfGrossFee: 2000n
});

const expected = {
  grossTraderFeeAmount: '7500000',
  externalProtocolOrDexFeeAmount: '1500000',
  worldzControlledAmount: '6000000',
  creatorAmount: '3060000',
  referrerAmount: '1020000',
  legacyFlywheelAmount: '900000',
  worldzLaunchPadAmount: '510000',
  oneWorldzImpactAmount: '510000'
};

for (const [key, value] of Object.entries(expected)) {
  if (q[key] !== value) throw new Error(`${key}: expected ${value}, got ${q[key]}`);
}

const intent = {
  version: 'WORLDZ-LAUNCH-INTENT-V1',
  projectId: 'self-test',
  chain: 'solana',
  environment: 'devnet',
  token: {name: 'TEST', symbol: 'TEST', decimals: 6, totalSupply: '1000000'},
  creator: {recipient: 'TEST_CREATOR'},
  economics: {targetGrossTraderFeeBps: 75, dynamicFeeRequested: false},
  liquidity: {protectionTarget: 'PERMANENT_LOCK', targetLockedPercent: 100},
  execution: {simulateFirst: true, mainnetReleaseApproved: false}
};

validateLaunchIntent(intent);

const disclosure = buildPreSignatureDisclosure({
  chain: 'solana',
  venue: 'METEORA_DBC_DEVNET_SELF_TEST',
  quote: q,
  networkGasEstimate: 'DISPLAY_SEPARATELY',
  liquidityProtection: 'PERMANENT_LOCK',
  tokenAuthorityState: 'PROVE_PER_LAUNCH'
});

if (disclosure.noHiddenFeeAttestation !== true) throw new Error('hidden fee attestation missing');
if (disclosure.referrerReceives !== '1020000') throw new Error('referrer disclosure drifted');

console.log('WORLDZ_OMNICHAIN_SDK_SELF_TEST=PASS chains=8 magic_fee_bps=75 split=51/17/15/8.5/8.5 mainnet=OFF');
