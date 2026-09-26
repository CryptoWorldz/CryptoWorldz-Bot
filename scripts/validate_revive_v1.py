#!/usr/bin/env python3
import json
from pathlib import Path

repo_root = Path(__file__).resolve().parents[1]
root = repo_root / "worldzpad-mainnet" / "revive"

contract = json.loads((root / "revive-launch-contract.v1.json").read_text())
worldz_reconcile = json.loads((root / "revive-worldz-main-reconciliation.v1.json").read_text())
fee = json.loads((root / "revive-dbc-fairfee.v1.json").read_text())
direct = json.loads((root / "revive-direct-damm-v2-existing-mint.v1.json").read_text())
devcity = json.loads((root / "revive-devcity-100.v1.json").read_text())
team_vesting = json.loads((root / "revive-team-vesting.v1.json").read_text())
public_candidates = json.loads((root / "revive-devcity-public-wallet-candidates.v1.json").read_text())
legacy_distribution = json.loads((root / "revive-legacy-216-distribution.v1.json").read_text())
funding = json.loads((root / "revive-launch-funding.v1.json").read_text())
candidates = json.loads((root / "revive-devcity-50-candidates.v1.json").read_text())
magic = json.loads((repo_root / "worldzpad-mainnet" / "fairfee" / "worldz-magic-fee.v1.json").read_text())
legacy_generator = (repo_root / "supabase" / "functions" / "worldz-legacy-proof" / "index.ts").read_text()
direct_devnet = (repo_root / "worldzpad-devnet" / "revive-party" / "scripts" / "07_direct_damm_v2_devnet.mjs").read_text()
direct_verify = (repo_root / "worldzpad-devnet" / "revive-party" / "scripts" / "08_verify_direct_damm_v2.mjs").read_text()

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
assert "all_ten_snapshots_required_for_batch" in legacy_generator
assert "perOwnerMint" in legacy_generator
assert "x.historic+=Number(r.sqrt_weight)" not in legacy_generator
assert "DEVNET_GENESIS_HASH" in direct_devnet
assert "getGenesisHash()" in direct_devnet
assert "DEVNET_GENESIS_HASH" in direct_verify
assert "getGenesisHash()" in direct_verify
assert devcity["seats"] == 100
assert devcity["tokensPerSeat"] * devcity["seats"] == 20_000_000
for schedule in (team_vesting, contract["teamVesting"]):
    assert schedule["immediateUnlockPercent"] == 0
    assert schedule["cliffDays"] == 0
    assert schedule["linearVestingMonths"] == 12
    assert schedule["releaseCount"] == 12
    assert schedule["cadence"] == "monthly"
    assert schedule["provider"] == "Jupiter Lock/Vesting"
assert public_candidates["candidateCount"] == len(public_candidates["candidates"])
assert len({c["address"] for c in public_candidates["candidates"]}) == 105
assert all(c["chainValidation"] == "PENDING" for c in public_candidates["candidates"])
assert legacy_distribution["mint"] == contract["token"]["canonicalMint"]
assert legacy_distribution["snapshotBatch"] == contract["legacyRevival"]["snapshotBatch"]
assert legacy_distribution["snapshotRoot"] == contract["legacyRevival"]["snapshotRoot"]
assert legacy_distribution["recipientCount"] == len(legacy_distribution["recipients"]) == 216
assert len({x["wallet"] for x in legacy_distribution["recipients"]}) == 216
assert sum(int(x["amountRaw"]) for x in legacy_distribution["recipients"]) == 20_000_000_000_000
assert candidates["targetNewSeats"] == 50
assert len(candidates["candidates"]) == 50
assert len({x["github"] for x in candidates["candidates"]}) == 50
assert all(x["status"] == "UNCONTACTED_RESEARCH_LEAD" for x in candidates["candidates"])

# Correct existing-mint launch route.
assert direct["canonicalToken"]["mint"] == contract["token"]["canonicalMint"]
assert direct["canonicalToken"]["noSecondMint"] is True
assert direct["route"]["venue"] == "Meteora DAMM v2"
assert direct["route"]["mode"] == "DIRECT_CUSTOMIZABLE_POOL__EXISTING_MINT__ONE_SIDED"
assert direct["route"]["initialBaseLiquidityTokens"] == 30_000_000
assert direct["route"]["initialQuoteLiquiditySol"] == 0
assert direct["route"]["isLockLiquidity"] is True
assert direct["route"]["permanentLockTargetPercent"] == 100
assert abs(direct["pricing"]["devnetFixture"]["priceSolPerRviv"] - 0.000045) < 1e-15
assert abs(direct["pricing"]["mainnet"]["priceSolPerRviv"] - 0.000045) < 1e-15
assert direct["pricing"]["mainnet"]["mayInheritDevnetFixtureAutomatically"] is False
assert direct["mainnetGates"]["enabled"] is False
assert direct["mainnetGates"]["openingPriceSelected"] is True
assert contract["launch"]["engineCandidate"] == "METEORA_DAMM_V2_DIRECT_EXISTING_MINT"
assert contract["launch"]["dbcTokenCreationPathAllowed"] is False
assert contract["launch"]["canonicalMintReuseRequired"] is True
assert abs(contract["launch"]["devnetOpeningPriceSolPerRviv"] - 0.000045) < 1e-15
assert abs(contract["launch"]["mainnetOpeningPriceSolPerRviv"] - 0.000045) < 1e-15
assert contract["gates"]["noDbcTokenCreationForCanonicalRviv"] is True
assert contract["gates"]["directExistingMintDammV2ProofRequired"] is True
assert contract["gates"]["mainnetOpeningPriceFinalized"] is True
assert contract["gates"]["actualDammV2ProtocolDeductionProofRequired"] is True
assert contract["gates"]["lockedPositionFeeClaimProofRequired"] is True
assert fee["executionApplicability"] == "NOT_USED_FOR_CANONICAL_RVIV_POOL_CREATION"
assert fee["supersededForReviveBy"] == "worldzpad-mainnet/revive/revive-direct-damm-v2-existing-mint.v1.json"

# MagicFeeNumber.
assert magic["target"]["grossTraderFeeBps"] == 75
assert magic["target"]["dynamicFeeDefault"] is False
assert fee["magicFee"]["grossTraderFeeBps"] == 75
assert fee["magicFee"]["dynamicFee"] is False
assert fee["dbc"]["targetGrossTraderFeeBps"] == 75
assert fee["dbc"]["creatorTradingFeePercentageOfControlledTradingFee"] == 51
assert fee["dbc"]["partnerTradingFeePercentageOfControlledTradingFee"] == 49
assert {k: fee["partnerRouterWeights"][k] for k in (
    "referrer","legacyFlywheel","worldzLaunchPad","oneWorldzImpact","total"
)} == {
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

# REVIVE must not launch in isolation from the Worldz/WLDZ safety stack.
worldz_gate = contract["worldzDependencyGate"]
assert worldz_gate["required"] is True
assert worldz_gate["canonicalWorldz"]["mint"] == "AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U"
assert worldz_gate["canonicalWorldz"]["allocationDesignCeilingTokens"] == 100_000_000
assert abs(worldz_gate["canonicalWorldz"]["currentOnChainSupplyTokens"] - 99_999_951.002722) < 1e-9
assert worldz_gate["canonicalWorldz"]["circulatingSupplyTokens"] == 15_000_000
assert worldz_gate["canonicalWorldz"]["livePool"] == "GCFKk1H5Z8EfxFuAvDEXTHn8b28deUA7HxVRsipjfPiJ"
assert worldz_gate["canonicalWorldz"]["permanentLockPercent"] == 100
assert worldz_gate["canonicalWorldz"]["duplicateExecutionDisabled"] is True
assert worldz_gate["canonicalWorldz"]["publicCreatorGate"] is False
assert worldz_gate["publicMainnetExecutionMustRemainFalse"] is True
assert worldz_gate["requiredEvidence"]["wldzPostLaunchCriticalSafetyGate"] == "SATISFIED_BY_RECONCILED_WLDZ_LIVE_STATE"
assert worldz_gate["requiredEvidence"]["worldzFeeRouterReceipts"] == "STILL_REQUIRED_FOR_REVIVE"
assert worldz_gate["requiredEvidence"]["legacyTenMintAuthorityAudit"] == "STILL_REQUIRED_LIVE_READ_ONLY_PROOF"
assert worldz_reconcile["status"] == "RECONCILED__NO_FINANCIAL_EXECUTION"
assert worldz_reconcile["canonicalWorldz"]["mint"] == worldz_gate["canonicalWorldz"]["mint"]
assert abs(worldz_reconcile["canonicalWorldz"]["currentOnChainSupplyTokens"] - 99_999_951.002722) < 1e-9
assert worldz_reconcile["liveLaunch"]["pool"] == worldz_gate["canonicalWorldz"]["livePool"]
assert worldz_reconcile["liveLaunch"]["permanentLockPercent"] == 100
assert worldz_reconcile["liveLaunch"]["duplicateExecutionDisabled"] is True
assert worldz_reconcile["safety"]["mainnetExecutionEnabled"] is False
assert worldz_reconcile["safety"]["movesWldz"] is False
assert worldz_reconcile["safety"]["movesRviv"] is False
assert worldz_reconcile["safety"]["movesSol"] is False
assert contract["gates"]["worldzDependencyGateRequired"] is True
assert contract["gates"]["wldzPostLaunchCriticalSafetyProofRequired"] is True
assert contract["gates"]["worldzLaunchPadPublicBootProofRequired"] is True
assert contract["gates"]["legacyTenMintAuthorityAuditRequired"] is True
assert contract["gates"]["noAutomaticLegacyAuthorityTakeover"] is True
assert contract["gates"]["noAutomaticLegacyFeeHarvesting"] is True
assert contract["gates"]["noReviveIsolationLaunch"] is True

legacy_control = contract["legacyControlPolicy"]
assert legacy_control["auditReadOnly"] is True
assert legacy_control["automaticAuthorityTakeover"] is False
assert legacy_control["automaticLegacyFeeHarvesting"] is False
assert legacy_control["antiDoubleHandling"] is True
assert "distributes only fee revenue explicitly routed" in legacy_control["sourceSeparationRule"]

print(
    "REVIVE_V1=PASS supply=200000000 allocation=100 devcity=100 "
    "new_dev_leads=50 legacy=20000000 magic_fee_bps=75 "
    "creator_effective=0.306 referrer_effective=0.102 legacy_effective=0.09 "
    "direct_damm_v2=ON devnet_price_sol=0.000045 mainnet_price=0.000045_owner_approved permanent_lp_lock_target=100 worldz_dependency_gate=RECONCILED legacy_takeover=OFF additional_mainnet_execution=LOCKED"
)
