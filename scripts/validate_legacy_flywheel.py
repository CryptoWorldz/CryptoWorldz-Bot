#!/usr/bin/env python3
import json
from pathlib import Path
from decimal import Decimal

repo = Path(__file__).resolve().parents[1]
policy = json.loads((repo / "worldzpad-mainnet" / "legacy-flywheel" / "worldz-legacy-flywheel.v1.json").read_text())
revive = json.loads((repo / "worldzpad-mainnet" / "revive" / "revive-dbc-fairfee.v1.json").read_text())
pdc_data = json.loads((repo / "purplediamondcrew.com" / "legacy-flywheel.v1.json").read_text())
pdc_page = (repo / "purplediamondcrew.com" / "hodlerz-special" / "index.html").read_text()

split = policy["controlledFeeSplitPercent"]
assert Decimal(str(sum(Decimal(str(split[k])) for k in ("creator","referrer","legacyFlywheel","worldzLaunchPad","oneWorldzImpact")))) == Decimal("100")
assert split["legacyFlywheel"] == 15
assert policy["sourceFeeRule"]["traderFeeIncreaseRequired"] is False
assert policy["epoch"]["seconds"] == 21600
assert policy["epoch"]["hours"] == 6
assert policy["legacyVaultFunding"]["vaultCount"] == 10
assert policy["legacyVaultFunding"]["percentOfWorldzControlledFeeRevenuePerVault"] == 1.5
assert policy["eligibility"]["thresholdBasisPercentOfVerifiedSupply"] == 0.01
assert policy["rewardWeighting"]["equalEligibleWalletPoolPercent"] == 50
assert policy["rewardWeighting"]["sqrtHoldingPoolPercent"] == 50
assert len(policy["assets"]) == 10
assert len({x["mint"] for x in policy["assets"]}) == 10
assert all(x["rewardVault"]["address"] == "PENDING_PDA_DERIVATION_AND_DEVNET_PROOF" for x in policy["assets"])
assert all(x["rewardVault"]["worldzControlledFeeSharePercent"] == 1.5 for x in policy["assets"])
assert all(Decimal(x["minimumRaw"]) > 0 for x in policy["assets"])
assert all(x["snapshotEligibleOwners"] <= x["snapshotOwners"] for x in policy["assets"])

# Verify each locked minimum is ceil(0.01% of the recorded raw supply).
for x in policy["assets"]:
    supply = Decimal(x["supplyRaw"])
    expected = (supply * Decimal("0.0001")).to_integral_value(rounding="ROUND_CEILING")
    assert Decimal(x["minimumRaw"]) == expected, x["symbol"]

rs = revive["controlledFeeSplitPercent"]
assert rs["legacyFlywheel"] == 15
assert rs["total"] == 100
eff = revive["effectivePercentOfTradeAtTarget"]
assert Decimal(str(eff["legacyFlywheel"])) == Decimal("0.09")
assert Decimal(str(eff["worldzControlledTotal"])) == Decimal("0.60")
assert Decimal(str(eff["grossTotal"])) == Decimal("0.75")\nassert revive["magicFee"]["grossTraderFeeBps"] == 75\nassert revive["partnerRouterWeights"]["total"] == 490

assert pdc_data["sourceFeeRule"]["legacyFlywheelPercent"] == 15
assert pdc_data["epoch"]["seconds"] == 21600
assert len(pdc_data["assets"]) == 10
for x in policy["assets"]:
    assert x["mint"] in pdc_page
    assert x["minimumTokens"] in pdc_page

assert "Private-build preview" in pdc_page
assert "15% Legacy Flywheel" in pdc_page
assert "Every 6 hours" in pdc_page
assert "DORMANT → ALIVE" in pdc_page

print("LEGACY_FLYWHEEL=PASS fee_share=15 vaults=10 per_vault=1.5 epoch_hours=6 minimum=0.01pct weighting=50_equal_50_sqrt mainnet=LOCKED")
