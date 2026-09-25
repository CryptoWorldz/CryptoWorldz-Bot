#!/usr/bin/env python3
import json
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def load(rel):
    return json.loads((ROOT / rel).read_text())

spec = json.loads((ROOT / "worldzpad-omnichain/bitworldz/bitworldz.v1.json").read_text())
registry = json.loads((ROOT / "worldzpad-omnichain/bitworldz/btc-asset-registry.v1.json").read_text())
fee = json.loads((ROOT / "worldzpad-omnichain/fee-policy.v1.json").read_text())
matrix = json.loads((ROOT / "worldzpad-omnichain/bitworldz/chain-matrix.v1.json").read_text())
schema = json.loads((ROOT / "worldzpad-omnichain/bitworldz/bitpair-intent.schema.json").read_text())
launch_page = (ROOT / "launchpad.cryptoworldz.xyz/bitworldz/index.html").read_text()
subdomain_page = (ROOT / "bitworldz.cryptoworldz.xyz/index.html").read_text()
sdk = (ROOT / "worldzpad-omnichain/bitworldz/sdk/bitworldz-core.mjs").read_text()
devnet_readme = (ROOT / "worldzpad-devnet/bitworldz/README.md").read_text()
devnet_package = load("worldzpad-devnet/bitworldz/package.json")
devnet_common = (ROOT / "worldzpad-devnet/bitworldz/scripts/common.mjs").read_text()
devnet_live = (ROOT / "worldzpad-devnet/bitworldz/scripts/01_mock_btc_quote_devnet.mjs").read_text()
devnet_real = (ROOT / "worldzpad-devnet/bitworldz/scripts/02_real_btc_compatibility.mjs").read_text()
devnet_bitproof = (ROOT / "worldzpad-devnet/bitworldz/scripts/03_build_bitproof.mjs").read_text()
devnet_workflow = (ROOT / ".github/workflows/bitworldz-solana-btc-devnet.yml").read_text()

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
if matrix["mainnetExecutionEnabled"] is not False:
    raise SystemExit("BitWorldz chain matrix mainnet must remain OFF")
if set(matrix["chains"]) != targets:
    raise SystemExit("BitWorldz chain matrix must cover all eight Worldz chain targets")
for key, row in matrix["chains"].items():
    if row["mainnetApproved"] is not False:
        raise SystemExit(f"{key}: BitWorldz chain unexpectedly mainnet approved")
if schema["properties"]["version"].get("const") != "BITWORLDZ-BITPAIR-INTENT-V1":
    raise SystemExit("BitPair intent schema version drifted")
if schema["properties"]["mode"].get("const") != "RESEARCH_ONLY":
    raise SystemExit("BitPair intent schema must remain research-only")
if schema["properties"]["economics"]["properties"]["targetGrossTraderFeeBps"].get("const") != 75:
    raise SystemExit("BitPair schema fee target drifted")
if schema["properties"]["safety"]["properties"]["mainnetExecutionEnabled"].get("const") is not False:
    raise SystemExit("BitPair schema mainnet gate missing")

if "MAINNET_EXECUTION_ENABLED = false" not in sdk:
    raise SystemExit("BitWorldz SDK mainnet gate missing")
if 'TARGET_GROSS_TRADER_FEE_BPS = 75n' not in sdk:
    raise SystemExit("BitWorldz SDK fee target drifted")
if devnet_package["dependencies"].get("@meteora-ag/dynamic-bonding-curve-sdk") != "1.5.12":
    raise SystemExit("BitWorldz devnet Meteora SDK must stay pinned to 1.5.12")
if "MAINNET RPC FORBIDDEN FOR LIVE BITWORLDZ HARNESS" not in devnet_common:
    raise SystemExit("BitWorldz live devnet mainnet RPC guard missing")
if "tokenQuoteDecimal:8" not in devnet_live:
    raise SystemExit("BitWorldz mock-BTC quote must use 8 decimals")
if "startingFeeBps:75" not in devnet_live or "endingFeeBps:75" not in devnet_live:
    raise SystemExit("BitWorldz live DBC 75-bps fee target missing")
if "partnerPermanentLockedLiquidityPercentage:40" not in devnet_live or "creatorPermanentLockedLiquidityPercentage:60" not in devnet_live:
    raise SystemExit("BitWorldz 100% permanent-lock config target drifted")
if "READ_ONLY__NO_SIGNER__NO_TRANSACTION" not in devnet_real:
    raise SystemExit("real WBTC compatibility probe must remain read-only")
if "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh" not in devnet_common:
    raise SystemExit("pinned Solana WBTC reference missing")
if "releaseGate" not in devnet_bitproof or "approved:false" not in devnet_bitproof:
    raise SystemExit("BitProof release gate must remain unapproved")
if "continue-on-error: true" not in devnet_workflow:
    raise SystemExit("external live/read-only probes must not masquerade as required deterministic CI")
if "Mock mBTC has no Bitcoin backing" not in devnet_readme:
    raise SystemExit("mock-BTC backing disclosure missing")

if "Research build" not in subdomain_page:
    raise SystemExit("BitWorldz subdomain must identify itself as a research build")
if "Mainnet execution disabled" not in launch_page:
    raise SystemExit("BitWorldz LaunchPad page mainnet disclosure missing")

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
print("product=BitWorldz_OmniBTC asset_classes=4 worldz_targets=8 fee_bps=75 split=51/17/15/8.5/8.5 pages=2 sdk=LOCKED schema=LOCKED devnet_rail=LOCKED real_wbtc=READ_ONLY mainnet=OFF")
