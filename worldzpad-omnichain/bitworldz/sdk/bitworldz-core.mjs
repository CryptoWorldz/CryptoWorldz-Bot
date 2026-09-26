export const BITWORLDZ_VERSION = "BITWORLDZ-OMNIBTC-2026-09-25-A";
export const BITPAIR_INTENT_VERSION = "BITWORLDZ-BITPAIR-INTENT-V1";
export const MAINNET_EXECUTION_ENABLED = false;

export const WORLDZ_CHAIN_TARGETS = Object.freeze([
  "solana","xrpl","base","ethereum","bnb","sui","hyperevm","robinhood"
]);

export const BTC_ASSET_CLASSES = Object.freeze([
  "NATIVE_BTC",
  "BITCOIN_LAYER_BTC",
  "WRAPPED_BTC",
  "BRIDGED_BTC"
]);

export const WORLDZ_CONTROLLED_SPLIT_BPS = Object.freeze({
  creator: 5100n,
  referrer: 1700n,
  legacyFlywheel: 1500n,
  worldzLaunchPad: 850n,
  oneWorldzImpact: 850n
});

export const TARGET_GROSS_TRADER_FEE_BPS = 75n;
const BPS = 10_000n;

function assertString(value, name, max = 180) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required`);
  if (value.length > max) throw new Error(`${name} is too long`);
}

export function assertWorldzChain(chain) {
  if (!WORLDZ_CHAIN_TARGETS.includes(chain)) {
    throw new Error(`unsupported BitWorldz chain: ${chain}`);
  }
}

export function assertBtcAssetClass(assetClass) {
  if (!BTC_ASSET_CLASSES.includes(assetClass)) {
    throw new Error(`unsupported BTC asset class: ${assetClass}`);
  }
}

export function assertAssetIdentity(asset) {
  if (!asset || typeof asset !== "object") throw new Error("bitcoin asset is required");
  assertBtcAssetClass(asset.class);
  assertString(asset.symbol, "bitcoin asset symbol", 16);

  if (asset.class !== "NATIVE_BTC") {
    assertString(asset.assetId, "contract/mint/asset ID", 180);
  }

  if ((asset.class === "WRAPPED_BTC" || asset.class === "BRIDGED_BTC") &&
      asset.displayName?.toLowerCase() === "native bitcoin") {
    throw new Error("wrapped or bridged BTC may not be labelled native Bitcoin");
  }

  return true;
}

export function quoteWorldzFee({
  tradeAmountAtomic,
  externalCostAtomic = 0n,
  grossTraderFeeBps = TARGET_GROSS_TRADER_FEE_BPS
}) {
  const trade = BigInt(tradeAmountAtomic);
  const external = BigInt(externalCostAtomic);
  const feeBps = BigInt(grossTraderFeeBps);

  if (trade < 0n || external < 0n) throw new Error("amounts must be non-negative");
  if (feeBps < 0n || feeBps > BPS) throw new Error("fee bps out of range");

  const grossWorldzFee = trade * feeBps / BPS;
  const creator = grossWorldzFee * WORLDZ_CONTROLLED_SPLIT_BPS.creator / BPS;
  const referrer = grossWorldzFee * WORLDZ_CONTROLLED_SPLIT_BPS.referrer / BPS;
  const legacyFlywheel = grossWorldzFee * WORLDZ_CONTROLLED_SPLIT_BPS.legacyFlywheel / BPS;
  const worldzLaunchPad = grossWorldzFee * WORLDZ_CONTROLLED_SPLIT_BPS.worldzLaunchPad / BPS;
  const oneWorldzImpact = grossWorldzFee - creator - referrer - legacyFlywheel - worldzLaunchPad;

  return Object.freeze({
    tradeAmountAtomic: trade.toString(),
    targetGrossTraderFeeBps: feeBps.toString(),
    grossWorldzFeeAtomic: grossWorldzFee.toString(),
    externalBridgeDexAndNetworkCostAtomic: external.toString(),
    creatorAtomic: creator.toString(),
    referrerAtomic: referrer.toString(),
    legacyFlywheelAtomic: legacyFlywheel.toString(),
    worldzLaunchPadAtomic: worldzLaunchPad.toString(),
    oneWorldzImpactAtomic: oneWorldzImpact.toString()
  });
}

export function buildBitPairIntent({
  targetChain,
  bitcoinAsset,
  venue = null
}) {
  assertWorldzChain(targetChain);
  assertAssetIdentity(bitcoinAsset);

  return Object.freeze({
    version: BITPAIR_INTENT_VERSION,
    mode: "RESEARCH_ONLY",
    targetChain,
    bitcoinAsset: Object.freeze({
      class: bitcoinAsset.class,
      symbol: bitcoinAsset.symbol.toUpperCase(),
      assetId: bitcoinAsset.assetId ?? null,
      verificationStatus: bitcoinAsset.verificationStatus ?? "UNVERIFIED_INPUT"
    }),
    venue,
    economics: Object.freeze({
      targetGrossTraderFeeBps: Number(TARGET_GROSS_TRADER_FEE_BPS),
      dynamicFee: false,
      externalBridgeDexAndNetworkFeesSeparate: true,
      worldzControlledSplitPercent: Object.freeze({
        creator: 51,
        referrer: 17,
        legacyFlywheel: 15,
        worldzLaunchPad: 8.5,
        oneWorldzImpact: 8.5
      })
    }),
    safety: Object.freeze({
      mainnetExecutionEnabled: false,
      automaticCrossChainMovementEnabled: false,
      worldzCustodiesNativeBitcoin: false,
      exactAssetIdentityRequired: true,
      wrappedOrBridgedMayBeCalledNative: false
    })
  });
}

export function buildBitProofPreview(intent) {
  if (!intent || intent.version !== BITPAIR_INTENT_VERSION) {
    throw new Error("valid BitPair intent required");
  }
  assertWorldzChain(intent.targetChain);
  assertAssetIdentity(intent.bitcoinAsset);

  return Object.freeze({
    version: "BITWORLDZ-BITPROOF-V1",
    status: "PREVIEW_ONLY__NO_EXECUTION",
    targetChain: intent.targetChain,
    launchTokenId: null,
    btcAssetSymbol: intent.bitcoinAsset.symbol,
    btcAssetId: intent.bitcoinAsset.assetId,
    btcAssetClass: intent.bitcoinAsset.class,
    issuerOrCustodyModel: null,
    bridgeOrInteropProvider: null,
    redemptionRoute: null,
    venue: intent.venue ?? null,
    poolOrMarketId: null,
    grossWorldzFee: null,
    externalFees: null,
    liquidityProtection: null,
    testnetOrSimulationTxIds: [],
    mainnetReleaseId: null
  });
}
