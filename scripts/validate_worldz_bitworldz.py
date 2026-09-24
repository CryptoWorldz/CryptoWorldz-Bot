#!/usr/bin/env python3
import json
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

spec = json.loads((ROOT / "worldzpad-omnichain/bitworldz/bitworldz.v1.json").read_text())
registry = json.loads((ROOT / "worldzpad-omnichain/bitworldz/btc-asset-registry.v1.json").read_text())
fee = json.loads((ROOT / "worldzpad-omnichain/fee-policy.v1.json").read_text())

if spec["name"] != "BitWorldz OmniBTC™":
    raise SystemExit("BitWorldz identity drifted")
if spec["mainnetExecutionEnabled"] is not False or registry["mainnetExecutionEnabled"] is not False:
    raise SystemExit("BitWorldz mainnet must remain OFF")

expected_classes = {"NATIVE_BTC","BITCOIN_LAYER_BTC","WRAPPED_BTC","BRIDGED_BTC"}
if set(spec["assetClasses"]) != expected_classes:
    raise SystemExit("BitWorldz BTC asset classes drifted")

if "WRAPPED_OR_BRIDGED_BTC_AS_NATIVE_BTC" not in spec["prohibitedClaims"]:
    raise SystemExit("native-vs-wrapped BTC protection missing")
if registry["policy"]["wrappedMustNotBeLabeledNative"] is not True:
    raise SystemExit("BTC asset registry may not label wrapped BTC as native")

targets = {"solana","xrpl","base","ethereum","bnb","sui","hyperevm","robinhood"}
if set(spec["supportedWorldzChainTargets"]) != targets:
    raise SystemExit("BitWorldz must target the eight Worldz chain adapters")

if spec["feePolicy"]["targetGrossTraderFeeBps"] != 75 or fee["targetGrossTraderFeeBps"] != 75:
    raise SystemExit("MagicFeeNumber drifted")
split = spec["feePolicy"]["worldzControlledSplitPercent"]
keys = ("creator","referrer","legacyFlywheel","worldzLaunchPad","oneWorldzImpact")
if sum(Decimal(str(split[k])) for k in keys) != Decimal("100"):
    raise SystemExit("BitWorldz Worldz-controlled split != 100")
if [Decimal(str(split[k])) for k in keys] != [Decimal("51"),Decimal("17"),Decimal("15"),Decimal("8.5"),Decimal("8.5")]:
    raise SystemExit("BitWorldz split drifted")
if spec["feePolicy"]["externalBridgeDexAndNetworkFeesSeparate"] is not True:
    raise SystemExit("external BTC route fees must remain separate")
if spec["feePolicy"]["hiddenBitcoinPremiumProhibited"] is not True:
    raise SystemExit("hidden Bitcoin premium protection missing")

safety = spec["btcMeshSafety"]
for k in ("worldzCustodiesNativeBitcoin","worldzAcceptsPrivateKeysOrSeedPhrases","automaticCrossChainMovementEnabled"):
    if safety[k] is not False:
        raise SystemExit(f"unsafe BTCMesh flag enabled: {k}")
for k in ("exactAssetIdentityRequired","redemptionPathDisclosureRequired","reserveOrPegModelDisclosureRequired","bridgeProviderDisclosureRequired","independentChainAssetVenueGateRequired"):
    if safety[k] is not True:
        raise SystemExit(f"missing BTCMesh safety gate: {k}")

for row in registry["entries"]:
    if row["mainnetApproved"] is not False:
        raise SystemExit(f"BTC asset unexpectedly mainnet approved: {row['key']}")
    if row["assetClass"] not in expected_classes:
        raise SystemExit(f"invalid BTC asset class: {row['key']}")

research = {x["key"]: x for x in spec["bitcoinExecutionResearch"]}
for key in ("stacks","rootstock","bitcoin-l1"):
    if research[key]["mainnetExecutionEnabled"] is not False:
        raise SystemExit(f"{key} research adapter unexpectedly mainnet enabled")
if "DIRECT_LAUNCH_PRIMITIVE_NOT_ASSUMED" not in research["bitcoin-l1"]["status"]:
    raise SystemExit("Bitcoin L1 must not inherit a fake general-purpose launch primitive")

print("WORLDZ_BITWORLDZ_VALIDATION=PASS")
print("product=BitWorldz_OmniBTC asset_classes=4 worldz_targets=8 fee_bps=75 split=51/17/15/8.5/8.5 mainnet=OFF")
