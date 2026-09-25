import {
  MAINNET_EXECUTION_ENABLED,
  TARGET_GROSS_TRADER_FEE_BPS,
  buildBitPairIntent,
  buildBitProofPreview,
  quoteWorldzFee
} from "./bitworldz-core.mjs";

if (MAINNET_EXECUTION_ENABLED !== false) throw new Error("mainnet must remain off");
if (TARGET_GROSS_TRADER_FEE_BPS !== 75n) throw new Error("fee target drifted");

const intent = buildBitPairIntent({
  targetChain: "solana",
  bitcoinAsset: {
    class: "WRAPPED_BTC",
    symbol: "WBTC",
    assetId: "TEST_ASSET_ID",
    verificationStatus: "UNVERIFIED_INPUT"
  },
  venue: "DEVNET_TEST_VENUE"
});

if (intent.safety.mainnetExecutionEnabled !== false) throw new Error("intent mainnet gate failed");
if (intent.bitcoinAsset.class !== "WRAPPED_BTC") throw new Error("asset class drifted");

const quote = quoteWorldzFee({ tradeAmountAtomic: 1_000_000n });
if (quote.grossWorldzFeeAtomic !== "7500") throw new Error("75 bps quote math failed");
const split = [
  quote.creatorAtomic,
  quote.referrerAtomic,
  quote.legacyFlywheelAtomic,
  quote.worldzLaunchPadAtomic,
  quote.oneWorldzImpactAtomic
].reduce((a,b)=>a + BigInt(b), 0n);
if (split !== BigInt(quote.grossWorldzFeeAtomic)) throw new Error("fee split conservation failed");

const proof = buildBitProofPreview(intent);
if (proof.status !== "PREVIEW_ONLY__NO_EXECUTION") throw new Error("proof preview status drifted");
if (proof.mainnetReleaseId !== null) throw new Error("preview cannot contain mainnet release");

let mislabeledRejected = false;
try {
  buildBitPairIntent({
    targetChain: "base",
    bitcoinAsset: {
      class: "WRAPPED_BTC",
      symbol: "WBTC",
      assetId: "TEST",
      displayName: "Native Bitcoin"
    }
  });
} catch {
  mislabeledRejected = true;
}
if (!mislabeledRejected) throw new Error("wrapped-as-native safety check failed");

console.log("BITWORLDZ_SDK_SELF_TEST=PASS");
console.log("fee_bps=75 mainnet=OFF wrapped_as_native=REJECTED");
