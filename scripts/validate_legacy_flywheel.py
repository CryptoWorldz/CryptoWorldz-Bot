#!/usr/bin/env python3
import json
from decimal import Decimal, ROUND_CEILING
from pathlib import Path

repo = Path(__file__).resolve().parents[1]
policy = json.loads((repo / "worldzpad-mainnet" / "legacy-flywheel" / "worldz-legacy-flywheel.v1.json").read_text())
magic = json.loads((repo / "worldzpad-mainnet" / "fairfee" / "worldz-magic-fee.v1.json").read_text())
revive = json.loads((repo / "worldzpad-mainnet" / "revive" / "revive-dbc-fairfee.v1.json").read_text())
pdc_data = json.loads((repo / "purplediamondcrew.com" / "legacy-flywheel.v1.json").read_text())
recovery = json.loads((repo / "worldzpad-mainnet" / "legacy-flywheel" / "legacy-control-recovery.v1.json").read_text())
pdc_page = (repo / "purplediamondcrew.com" / "hodlerz-special" / "index.html").read_text()

# Platform fee standard.
assert magic["target"]["grossTraderFeeBps"] == 75
assert Decimal(str(magic["target"]["grossTraderFeePercent"])) == Decimal("0.75")
assert magic["target"]["dynamicFeeDefault"] is False
assert magic["meteoraDbcModel"]["creatorTradingFeePercentage"] == 51
assert magic["meteoraDbcModel"]["partnerTradingFeePercentage"] == 49
assert magic["partnerRouter"]["weights"] == {
    "referrer": 170,
    "legacyFlywheel": 150,
    "worldzLaunchPad": 85,
    "oneWorldzImpact": 85,
    "total": 490,
}
assert Decimal(str(magic["legacyFlywheel"]["effectivePercentOfTradeTotal"])) == Decimal("0.09")
assert Decimal(str(magic["legacyFlywheel"]["effectivePercentOfTradePerVault"])) == Decimal("0.009")

# Flywheel policy.
split = policy["controlledFeeSplitPercent"]
assert sum(Decimal(str(split[k])) for k in (
    "creator","referrer","legacyFlywheel","worldzLaunchPad","oneWorldzImpact"
)) == Decimal("100")
assert split["legacyFlywheel"] == 15
assert any(
    x["address"] == "PdABvvq4F7YjwsVRq2CCQeBNZTBq5WfkQvn8VmhRY34"
    for x in policy["historicalDistributionWallets"]["wallets"]
), "NBC Distribution must remain in the project-wallet exclusion registry"
assert policy["magicFeeStandard"]["targetGrossTraderFeeBps"] == 75
assert Decimal(str(policy["magicFeeStandard"]["effectiveLegacyFlywheelPercentOfTrade"])) == Decimal("0.09")
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

for x in policy["assets"]:
    supply = Decimal(x["supplyRaw"])
    expected = (supply * Decimal("0.0001")).to_integral_value(rounding=ROUND_CEILING)
    assert Decimal(x["minimumRaw"]) == expected, x["symbol"]

# REVIVE integration.
assert revive["magicFee"]["grossTraderFeeBps"] == 75
assert revive["controlledFeeSplitPercent"]["legacyFlywheel"] == 15
assert revive["controlledFeeSplitPercent"]["total"] == 100
assert revive["partnerRouterWeights"]["total"] == 490
eff = revive["effectivePercentOfTradeAtTarget"]
assert Decimal(str(eff["legacyFlywheel"])) == Decimal("0.09")
assert Decimal(str(eff["worldzControlledTotal"])) == Decimal("0.60")
assert Decimal(str(eff["grossTotal"])) == Decimal("0.75")

# Recovery / no-double-handling contract.
assert recovery["invariants"]["automaticAuthorityTakeover"] is False
assert recovery["invariants"]["automaticLegacyFeeHarvesting"] is False
assert recovery["invariants"]["externalPlatformRewardsCountAsWorldzRevenue"] is False
assert recovery["invariants"]["exactlyOnceSettlementRequired"] is True
assert recovery["invariants"]["failedRecipientShareRedistributed"] is False
assert recovery["invariants"]["roundingDustRedistributedToArbitraryWallet"] is False
assert recovery["invariants"]["nextEpochCannotSettleUntilPriorEpochReconciled"] is True
assert recovery["accounting"]["epochSeconds"] == 21600
assert len(recovery["auditedLegacyAssets"]) == 10
assert len({x["mint"] for x in recovery["auditedLegacyAssets"]}) == 10
pdc12 = next(x for x in recovery["auditedLegacyAssets"] if x["symbol"] == "PDC1-2")
assert pdc12["transferFeeBps"] == 300
assert pdc12["platformProvenance"] == "TAXSPLIT_PUBLIC_PROVENANCE_CONFIRMED"
pdcshare = next(x for x in recovery["auditedLegacyAssets"] if x["symbol"] == "PDCSHARE")
assert pdcshare["transferFeeBps"] is None
assert pdcshare["platformProvenance"] == "REVSHARE_PUBLIC_PROVENANCE_CONFIRMED"
assert recovery["proofSources"]["liveMutationPerformed"] is False

# PurpleDiamondCrew preview.
assert pdc_data["version"] == policy["version"]
assert pdc_data["status"] == policy["status"]
assert pdc_data["sourceFeeRule"] == policy["sourceFeeRule"]
assert pdc_data["controlledFeeSplitPercent"] == policy["controlledFeeSplitPercent"]
assert pdc_data["magicFeeStandard"] == policy["magicFeeStandard"]
assert pdc_data["projectWalletExclusion"]["enabled"] is True
assert pdc_data["projectWalletExclusion"]["addressesPublishedHere"] is False
assert "verifiedLegacyDevWallets" not in pdc_data
assert pdc_data["sourceFeeRule"]["legacyFlywheelPercent"] == 15
assert pdc_data["epoch"]["seconds"] == 21600
assert len(pdc_data["assets"]) == 10
for x in policy["assets"]:
    assert x["mint"] in pdc_page
    assert x["minimumTokens"] in pdc_page

assert "Private-build preview" in pdc_page
assert "MagicFeeNumber™ candidate: 0.75% gross." in pdc_page
assert "15% Legacy Flywheel" in pdc_page
assert "Every 6 hours" in pdc_page
assert "DORMANT → ALIVE" in pdc_page

print(
    "LEGACY_FLYWHEEL=PASS magic_fee_bps=75 fee_share=15 vaults=10 "
    "per_vault_controlled_share=1.5 effective_total=0.09 effective_per_vault=0.009 "
    "epoch_hours=6 minimum=0.01pct weighting=50_equal_50_sqrt exactly_once=ON external_double_count=OFF takeover=OFF mainnet=LOCKED"
)
