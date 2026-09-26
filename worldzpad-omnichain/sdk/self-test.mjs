import {
  MAGIC_FEE_BPS,
  SUPPORTED_CHAINS,
  CHAIN_ENVIRONMENTS,
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

const testEnvironmentByChain = {
  solana: 'devnet',
  xrpl: 'testnet',
  base: 'base-sepolia',
  ethereum: 'sepolia',
  bnb: 'bsc-testnet',
  sui: 'testnet',
  hyperevm: 'hyperevm-testnet',
  robinhood: 'robinhood-testnet'
};

for (const chain of SUPPORTED_CHAINS) {
  const environment = testEnvironmentByChain[chain];
  if (!CHAIN_ENVIRONMENTS[chain]?.includes(environment)) throw new Error(`missing environment map for ${chain}`);
  validateLaunchIntent({
    ...intent,
    projectId: 'self-test-' + chain,
    chain,
    environment,
    execution: { simulateFirst: true, mainnetReleaseApproved: false }
  });
}

let mismatchedEnvironmentRejected = false;
try {
  validateLaunchIntent({ ...intent, chain: 'ethereum', environment: 'devnet' });
} catch {
  mismatchedEnvironmentRejected = true;
}
if (!mismatchedEnvironmentRejected) throw new Error('chain/environment mismatch must fail closed');

let mainnetWithoutApprovalRejected = false;
try {
  validateLaunchIntent({ ...intent, chain: 'solana', environment: 'mainnet-beta' });
} catch {
  mainnetWithoutApprovalRejected = true;
}
if (!mainnetWithoutApprovalRejected) throw new Error('mainnet without explicit release approval must fail closed');

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

console.log('WORLDZ_OMNICHAIN_SDK_SELF_TEST=PASS chains=8 chain_env_pairs=LOCKED magic_fee_bps=75 split=51/17/15/8.5/8.5 mainnet=OFF');
