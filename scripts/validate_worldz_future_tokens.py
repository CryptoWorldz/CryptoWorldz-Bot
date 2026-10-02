#!/usr/bin/env python3
import json
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def load(rel):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))

pnex = load("worldzpad-mainnet/phenix/phenix.v1.json")
mrcl = load("worldzpad-mainnet/miracle/miracle.v1.json")
full = load("worldzpad-omnichain/fullscope/worldz-fullbuild.v1.json")
recipients = load("worldzpad-mainnet/wallets/future-token-dev-rewards.v1.json")

assert pnex["schema"] == "WORLDZ-PHENIX-V1"
assert pnex["token"]["symbol"] == "PNEX"
assert pnex["token"]["fixedSupplyTokens"] == 250_000_000
assert pnex["token"]["canonicalMint"] is None
assert pnex["executionBoundary"]["mintCreated"] is False
assert pnex["executionBoundary"]["mainnetExecutionEnabled"] is False

p = pnex["allocations"]
pnex_parts = [
    p["phenixChanceImmediate"],
    p["phenixChanceVested"],
    p["liquidity"],
    p["developerVesting"],
    p["purpleDiamondHandz"],
    p["phenixTotalSupplyFlyWheel"],
    p["unassigned"],
]
assert sum(Decimal(str(x["percent"])) for x in pnex_parts) == Decimal("100")
assert sum(int(x["tokens"]) for x in pnex_parts) == 250_000_000
assert p["liquidity"]["genesisLiquidityPercentOfTotalSupply"] == 5
assert p["liquidity"]["genesisLiquidityTokens"] == 12_500_000
assert p["liquidity"]["remainingLiquidityReserveTokens"] == 100_000_000
assert pnex["vesting"]["developer"] == {"immediateUnlockPercent": 0, "cliffDays": 90, "monthlyReleases": 24}
assert pnex["proofBurn"]["automatic"] is False
assert pnex["proofBurn"]["automaticMarketBuyAndBurn"] is False
assert pnex["proofBurn"]["maxPercentOfNewlyAvailableCycleAllowance"] == 25
assert pnex["omniBuildz"]["fixedSubAllocationPercent"] is None
assert pnex["linkedAsset"]["creatorOptInRequired"] is True
assert pnex["linkedAsset"]["partnershipClaimRequiresCounterpartyEvidence"] is True

assert mrcl["schema"] == "WORLDZ-MIRACLE-V1"
assert mrcl["token"]["symbol"] == "MRCL"
assert mrcl["token"]["fixedSupplyTokens"] == 348_000_000
assert mrcl["token"]["canonicalMint"] is None
assert mrcl["executionBoundary"]["mintCreated"] is False
assert mrcl["executionBoundary"]["mainnetExecutionEnabled"] is False

m = mrcl["committedAllocations"]
team = m["miracleTeamVault"]
magic = m["miracleMagicSupply"]
liq = m["genesisLiquidityTarget"]
legacy = m["purpleDiamondHandzInherited"]
remaining = mrcl["remainingAllocation"]
assert team["percent"] == 20 and team["tokens"] == 69_600_000
assert team["explicitOptInRequired"] is True
assert team["verifiedPublicWalletRequired"] is True
assert team["approvedAllocationLedgerRequired"] is True
assert team["immediateUnlockPercent"] == 0
assert team["firstReleaseCliffDays"] == 30
assert team["monthlyReleases"] == 24
assert team["unassignedTokensRemainVaulted"] is True
assert team["silentAutomaticReassignmentAllowed"] is False
assert team["proposedMultisig"]["policy"] == "4-of-8"
assert team["proposedMultisig"]["state"] == "SIGNER_SET_LOCKED__PENDING_SQUADS_DEPLOYMENT_AND_LIVE_4_OF_8_PROOF"
assert team["proposedMultisig"]["signerCount"] == 8
assert team["proposedMultisig"]["threshold"] == 4
assert [x["label"] for x in team["proposedMultisig"]["signers"]] == ["JayJayTeamDev", "Stepper", "Savage", "SolMusic", "Mahammad", "Zephyr", "Troll George", "Annabel"]
assert team["proposedMultisig"]["onePersonMultipleWalletsCountAsIndependentSigners"] is False
assert team["accountingSeparationRequired"] is True

assert magic["percent"] == 20 and magic["tokens"] == 69_600_000
assert magic["separateFromTeamVault"] is True
assert magic["separateFromPurpleDiamondHandz"] is True

assert liq["percent"] == 5 and liq["tokens"] == 17_400_000
assert liq["creatorFirstBuyTargetAud"] == 200
assert liq["creatorFirstBuyExactSol"] is None
assert liq["exactSolBoundAtTransactionReviewFromLivePricing"] is True
assert liq["virtualLiquidityIsRealBacking"] is False

assert legacy["percent"] == 1 and legacy["tokens"] == 3_480_000
assert remaining["percent"] == 54 and remaining["tokens"] == 187_920_000
assert sum(Decimal(str(x)) for x in (team["percent"], magic["percent"], liq["percent"], legacy["percent"], remaining["percent"])) == Decimal("100")
assert team["tokens"] + magic["tokens"] + liq["tokens"] + legacy["tokens"] + remaining["tokens"] == 348_000_000
assert remaining["status"] == "UNALLOCATED_PENDING_EXPLICIT_OWNER_DECISION"

by_symbol = {t["symbol"]: t for t in full["canonicalTokens"]}
assert by_symbol["PNEX"]["designSpec"] == "worldzpad-mainnet/phenix/phenix.v1.json"
assert by_symbol["MRCL"]["designSpec"] == "worldzpad-mainnet/miracle/miracle.v1.json"
assert full["futureTokenSpecifications"]["phenix"]["mainnetExecution"] is False
assert full["futureTokenSpecifications"]["miracle"]["mainnetExecution"] is False

assert recipients["schema"] == "WORLDZ-FUTURE-DEV-REWARDS-WALLETS-V1"
purple = next(w for w in recipients["wallets"] if w["label"] == "Purple Diamond")
assert purple["address"] == "4HzhLhBkw5YQ4GDVfYkbrkt7f3Ps9kTPRHv5oPYsGyon"
assert purple["walletRole"] == "ADDITIONAL_DEV_AND_REWARDS"
assert purple["eligibleTokens"]["PNEX"]["canonicalProjectSymbol"] == "PNEX"
assert purple["eligibleTokens"]["PNEX"]["allocationTokens"] is None
assert purple["eligibleTokens"]["PNEX"]["rewardEligible"] is True
assert purple["eligibleTokens"]["MRCL"]["canonicalProjectSymbol"] == "MRCL"
assert purple["eligibleTokens"]["MRCL"]["allocationTokens"] is None
assert purple["eligibleTokens"]["MRCL"]["approvedAllocationLedgerRequired"] is True
assert recipients["rules"]["automaticTransferAllowed"] is False
assert recipients["rules"]["allocationAmountsMayBeInvented"] is False

for payload in (pnex, mrcl):
    blob = json.dumps(payload).lower()
    for forbidden in ("private key value", "seed phrase value", "password=", "secret="):
        assert forbidden not in blob

print("WORLDZ_FUTURE_TOKEN_SPECS=PASS")
print("PNEX supply=250000000 allocation=100% mainnet=OFF")
print("MRCL supply=348000000 committed=46% pending=54% mainnet=OFF")
