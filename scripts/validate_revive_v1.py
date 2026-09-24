#!/usr/bin/env python3
import json
from pathlib import Path

repo_root = Path(__file__).resolve().parents[1]
root = repo_root / "worldzpad-mainnet" / "revive"

contract = json.loads((root / "revive-launch-contract.v1.json").read_text())
fee = json.loads((root / "revive-dbc-fairfee.v1.json").read_text())
devcity = json.loads((root / "revive-devcity-100.v1.json").read_text())
funding = json.loads((root / "revive-launch-funding.v1.json").read_text())
candidates = json.loads((root / "revive-devcity-50-candidates.v1.json").read_text())
magic = json.loads((repo_root / "worldzpad-mainnet" / "fairfee" / "worldz-magic-fee.v1.json").read_text())
legacy_generator = (repo_root / "supabase" / "functions" / "worldz-legacy-proof" / "index.ts").read_text()

# Canonical REVIVE.
assert contract["token"]["canonicalMint"] == "DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R"
assert contract["token"]["fixedSupplyTokens"] == 200_000_000
assert contract["token"]["mintAuthority"] == "REVOKED"
assert contract["token"]["freezeAuthority"] == "REVOKED"
assert sum(x["percent"] for x in contract["allocations"]) == 100
assert sum(x["tokens"] for x in contract["allocations"]) == 200_000_000

# Dev / Legacy / DevCity.
assert len(contract["devAllocation"]["wallets"]) == 6
assert contract["devAllocation"]["tokensPerWallet"] * 6 == 30_000_000
assert contract["legacyRevival"]["poolTokens"] == 20_000_000
assert contract["legacyRevival"]["eligibleWallets"] == 216
assert contract["legacyRevival"]["regenerationLockedUntilGeneratorFixVerified"] is True
assert "REVIVE_POOL_PERCENT=10n" in legacy_generator
assert "revive_pool_invariant_failed" in legacy_generator
assert "200000000n*1000000n/100n" not in legacy_generator
assert devcity["seats"] == 100
assert devcity["tokensPerSeat"] * devcity["seats"] == 20_000_000
assert candidates["targetNewSeats"] == 50
assert len(candidates["candidates"]) == 50
assert len({x["github"] for x in candidates["candidates"]}) == 50
assert all(x["status"] == "UNCONTACTED_RESEARCH_LEAD" for x in candidates["candidates"])

# MagicFeeNumber.
assert magic["target"]["grossTraderFeeBps"] == 75
assert magic["target"]["dynamicFeeDefault"] is False
assert fee["magicFee"]["grossTraderFeeBps"] == 75
assert fee["magicFee"]["dynamicFee"] is False
assert fee["dbc"]["targetGrossTraderFeeBps"] == 75
assert fee["dbc"]["creatorTradingFeePercentageOfControlledTradingFee"] == 51
assert fee["dbc"]["partnerTradingFeePercentageOfControlledTradingFee"] == 49
assert fee["partnerRouterWeights"] == {
    "referrer": 170,
    "legacyFlywheel": 150,
    "worldzLaunchPad": 85,
    "oneWorldzImpact": 85,
    "total": 490,
}
assert fee["controlledFeeSplitPercent"] == {
    "creator": 51,
    "referrer": 17,
    "legacyFlywheel": 15,
    "worldzLaunchPad": 8.5,
    "oneWorldzImpact": 8.5,
    "total": 100,
    "derivation": "Legacy Flywheel takes 15% of Worldz-controlled revenue. The other routes preserve the prior 60/20/10/10 proportions inside the remaining 85%.",
}

effective = fee["effectivePercentOfTradeAtTarget"]
assert abs(sum(effective[k] for k in (
    "meteoraProtocol",
    "creator",
    "worldzReferrer",
    "legacyFlywheel",
    "worldzLaunchPad",
    "oneWorldzImpact",
)) - effective["grossTotal"]) < 1e-12
assert abs(effective["grossTotal"] - 0.75) < 1e-12
assert abs(effective["meteoraProtocol"] - 0.15) < 1e-12
assert abs(effective["worldzControlledTotal"] - 0.60) < 1e-12
assert abs(effective["creator"] - 0.306) < 1e-12
assert abs(effective["worldzReferrer"] - 0.102) < 1e-12
assert abs(effective["legacyFlywheel"] - 0.09) < 1e-12
assert abs(effective["worldzLaunchPad"] - 0.051) < 1e-12
assert abs(effective["oneWorldzImpact"] - 0.051) < 1e-12

# Liquidity + funding + execution safety.
assert fee["permanentLiquidity"]["totalPermanentLockedPercentage"] == 100
assert fee["permanentLiquidity"]["partnerLiquidityPercentage"] == 0
assert fee["permanentLiquidity"]["creatorLiquidityPercentage"] == 0
assert abs(
    sum(x["initialCeilingSol"] for x in funding["targets"])
    - funding["initialFundingCeilingSol"]
) < 1e-12
assert contract["launch"]["publicMainnetExecutionEnabled"] is False
assert contract["gates"]["finalOwnerWalletApprovalRequired"] is True

print(
    "REVIVE_V1=PASS supply=200000000 allocation=100 devcity=100 "
    "new_dev_leads=50 legacy=20000000 magic_fee_bps=75 "
    "creator_effective=0.306 referrer_effective=0.102 legacy_effective=0.09 "
    "permanent_lp_lock_target=100 mainnet=LOCKED"
)
