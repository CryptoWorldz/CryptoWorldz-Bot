export const SUPPORTED_CHAINS = Object.freeze([
  'solana', 'xrpl', 'base', 'ethereum', 'bnb', 'sui', 'hyperevm', 'robinhood'
]);

export const MAGIC_FEE_BPS = 75n;
export const BPS = 10_000n;

export const WORLDZ_CONTROLLED_SPLIT_BPS = Object.freeze({
  creator: 5100n,
  referrer: 1700n,
  legacyFlywheel: 1500n,
  worldzLaunchPad: 850n,
  oneWorldzImpact: 850n
});

function divFloor(n, d) {
  if (d === 0n) throw new Error('division by zero');
  return n / d;
}

export function assertSupportedChain(chain) {
  if (!SUPPORTED_CHAINS.includes(chain)) {
    throw new Error(`unsupported Worldz chain: ${chain}`);
  }
}

export function quoteMagicFee({
  tradeAmountAtomic,
  externalProtocolShareBpsOfGrossFee = 0n,
  grossTraderFeeBps = MAGIC_FEE_BPS
}) {
  const trade = BigInt(tradeAmountAtomic);
  const grossBps = BigInt(grossTraderFeeBps);
  const externalShare = BigInt(externalProtocolShareBpsOfGrossFee);

  if (trade < 0n) throw new Error('tradeAmountAtomic must be non-negative');
  if (grossBps < 0n || grossBps > BPS) throw new Error('grossTraderFeeBps out of range');
  if (externalShare < 0n || externalShare > BPS) throw new Error('external protocol share out of range');

  const grossTraderFee = divFloor(trade * grossBps, BPS);
  const externalProtocolOrDexFee = divFloor(grossTraderFee * externalShare, BPS);
  const worldzControlled = grossTraderFee - externalProtocolOrDexFee;

  const creator = divFloor(worldzControlled * WORLDZ_CONTROLLED_SPLIT_BPS.creator, BPS);
  const referrer = divFloor(worldzControlled * WORLDZ_CONTROLLED_SPLIT_BPS.referrer, BPS);
  const legacyFlywheel = divFloor(worldzControlled * WORLDZ_CONTROLLED_SPLIT_BPS.legacyFlywheel, BPS);
  const worldzLaunchPad = divFloor(worldzControlled * WORLDZ_CONTROLLED_SPLIT_BPS.worldzLaunchPad, BPS);
  const oneWorldzImpact = worldzControlled - creator - referrer - legacyFlywheel - worldzLaunchPad;

  return Object.freeze({
    grossTraderFeeBps: grossBps.toString(),
    tradeAmountAtomic: trade.toString(),
    grossTraderFeeAmount: grossTraderFee.toString(),
    externalProtocolOrDexFeeAmount: externalProtocolOrDexFee.toString(),
    worldzControlledAmount: worldzControlled.toString(),
    creatorAmount: creator.toString(),
    referrerAmount: referrer.toString(),
    legacyFlywheelAmount: legacyFlywheel.toString(),
    worldzLaunchPadAmount: worldzLaunchPad.toString(),
    oneWorldzImpactAmount: oneWorldzImpact.toString(),
    networkGasEstimate: null
  });
}

export function validateLaunchIntent(intent) {
  if (!intent || typeof intent !== 'object') throw new Error('launch intent required');
  if (intent.version !== 'WORLDZ-LAUNCH-INTENT-V1') throw new Error('unsupported launch intent version');
  assertSupportedChain(intent.chain);
  if (Number(intent?.economics?.targetGrossTraderFeeBps) !== Number(MAGIC_FEE_BPS)) {
    throw new Error('MagicFeeNumber target must be 75 bps');
  }
  if (intent?.economics?.dynamicFeeRequested !== false) {
    throw new Error('dynamic fee must remain off in v1');
  }
  if (intent?.execution?.simulateFirst !== true) {
    throw new Error('simulateFirst is mandatory');
  }
  const environment = String(intent.environment || '').trim().toLowerCase();
  const testEnvironments = new Set(['devnet', 'testnet', 'sepolia', 'base-sepolia', 'bsc-testnet', 'hyperevm-testnet', 'robinhood-testnet']);
  const mainnetAliases = new Set(['mainnet', 'mainnet-beta']);
  if (!testEnvironments.has(environment) && !mainnetAliases.has(environment)) {
    throw new Error('environment must be an explicitly allowlisted testnet or recognized mainnet');
  }
  if (mainnetAliases.has(environment) && intent?.execution?.mainnetReleaseApproved !== true) {
    throw new Error('mainnet requires explicit release approval');
  }
  return true;
}

export function buildPreSignatureDisclosure({
  chain,
  venue,
  quote,
  networkGasEstimate,
  liquidityProtection,
  tokenAuthorityState
}) {
  assertSupportedChain(chain);
  if (!quote) throw new Error('fee quote required');

  return Object.freeze({
    chain,
    venue: venue ?? null,
    traderPays: quote.grossTraderFeeAmount,
    grossTraderFeeBps: quote.grossTraderFeeBps,
    networkGasEstimate: networkGasEstimate ?? null,
    externalProtocolOrDexReceives: quote.externalProtocolOrDexFeeAmount,
    creatorReceives: quote.creatorAmount,
    referrerReceives: quote.referrerAmount,
    legacyFlywheelReceives: quote.legacyFlywheelAmount,
    worldzLaunchPadReceives: quote.worldzLaunchPadAmount,
    oneWorldzImpactReceives: quote.oneWorldzImpactAmount,
    liquidityProtection,
    tokenAuthorityState,
    noHiddenFeeAttestation: true
  });
}
