#!/usr/bin/env python3
import json
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = json.loads((ROOT / "worldzpad-omnichain/x-save/x-save.v1.json").read_text())
fee = json.loads((ROOT / "worldzpad-omnichain/fee-policy.v1.json").read_text())

if spec["name"] != "Worldz X-SAVE™":
    raise SystemExit("X-SAVE identity drifted")
if spec["expandedName"] != "XRP–Solana Alliance Value Engine":
    raise SystemExit("X-SAVE expanded name drifted")
if spec["mainnetExecutionEnabled"] is not False:
    raise SystemExit("X-SAVE mainnet must remain OFF")

quote = spec["canonicalQuoteAsset"]
if quote["asset"] != "wXRP":
    raise SystemExit("X-SAVE quote asset must remain wXRP")
if quote["mint"] != "6UpQcMAb5xMzxc7ZfPaVMgx3KqsvKZdT5U718BzD5We2":
    raise SystemExit("canonical wXRP mint drifted")
if quote["decimals"] != 6:
    raise SystemExit("canonical wXRP decimals drifted")
if quote["mustReverifyBeforeMainnet"] is not True:
    raise SystemExit("wXRP must be reverified before mainnet")

rail = spec["solanaLaunchRail"]
if rail["targetGrossTraderFeeBps"] != 75 or fee["targetGrossTraderFeeBps"] != 75:
    raise SystemExit("MagicFeeNumber drifted")
if rail["dynamicFee"] is not False:
    raise SystemExit("X-SAVE dynamic fee must be OFF in v1")
split = rail["worldzControlledSplitPercent"]
if sum(Decimal(str(split[k])) for k in ("creator","referrer","legacyFlywheel","worldzLaunchPad","oneWorldzImpact")) != Decimal("100"):
    raise SystemExit("X-SAVE Worldz-controlled split != 100")
if [Decimal(str(split[k])) for k in ("creator","referrer","legacyFlywheel","worldzLaunchPad","oneWorldzImpact")] != [Decimal("51"),Decimal("17"),Decimal("15"),Decimal("8.5"),Decimal("8.5")]:
    raise SystemExit("X-SAVE split drifted")

xrpl = spec["xrplNativeRail"]
if xrpl["hiddenTransferTaxProhibited"] is not True or xrpl["issuerTransferFeeUsedToFakeMagicFee"] is not False:
    raise SystemExit("XRPL hidden-transfer-tax protection missing")
if xrpl["ammTradingFeeRangePercent"]["max"] != 1:
    raise SystemExit("XRPL AMM maximum fee assumption drifted")
if xrpl["target75BpsIsTechnicallyRepresentable"] is not True:
    raise SystemExit("XRPL 75-bps representation gate drifted")

bridge = spec["bridgeSafety"]
if bridge["worldzCustodiesNativeXrp"] is not False or bridge["worldzMintsCanonicalWXrp"] is not False:
    raise SystemExit("Worldz must not claim custody or canonical wXRP issuance")
if bridge["approvedExternalProviderRequired"] is not True or bridge["bridgeRiskDisclosureRequired"] is not True:
    raise SystemExit("X-SAVE bridge safety gates missing")

if spec["positioning"]["notClaimedAsFirstWXrpPairLaunchpad"] is not True:
    raise SystemExit("X-SAVE must not make a false first-wXRP-pair claim")

print("WORLDZ_X_SAVE_VALIDATION=PASS")
print("name=X-SAVE quote=wXRP fee_bps=75 split=51/17/15/8.5/8.5 mainnet=OFF")
