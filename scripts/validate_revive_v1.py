#!/usr/bin/env python3
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "worldzpad-mainnet" / "revive"
contract = json.loads((root / "revive-launch-contract.v1.json").read_text())
fee = json.loads((root / "revive-dbc-fairfee.v1.json").read_text())
devcity = json.loads((root / "revive-devcity-100.v1.json").read_text())
funding = json.loads((root / "revive-launch-funding.v1.json").read_text())

assert contract["token"]["canonicalMint"] == "DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R"
assert contract["token"]["fixedSupplyTokens"] == 200_000_000
assert contract["token"]["mintAuthority"] == "REVOKED"
assert contract["token"]["freezeAuthority"] == "REVOKED"
assert sum(x["percent"] for x in contract["allocations"]) == 100
assert sum(x["tokens"] for x in contract["allocations"]) == 200_000_000
assert len(contract["devAllocation"]["wallets"]) == 6
assert contract["devAllocation"]["tokensPerWallet"] * 6 == 30_000_000
assert contract["legacyRevival"]["poolTokens"] == 20_000_000
assert contract["legacyRevival"]["eligibleWallets"] == 216
assert contract["legacyRevival"]["regenerationLockedUntilGeneratorFixVerified"] is True
assert devcity["seats"] == 100
assert devcity["tokensPerSeat"] * devcity["seats"] == 20_000_000
assert fee["partnerRouterSplitPercent"]["total"] == 100
assert fee["permanentLiquidity"]["totalPermanentLockedPercentage"] == 100
assert fee["permanentLiquidity"]["partnerLiquidityPercentage"] == 0
assert fee["permanentLiquidity"]["creatorLiquidityPercentage"] == 0
effective = fee["effectivePercentOfTradeAtTarget"]
assert abs(sum(effective[k] for k in ("meteoraProtocol","creator","worldzReferrer","worldzLaunchPad","oneWorldzImpact")) - effective["grossTotal"]) < 1e-12
assert abs(sum(x["initialCeilingSol"] for x in funding["targets"]) - funding["initialFundingCeilingSol"]) < 1e-12
assert contract["launch"]["publicMainnetExecutionEnabled"] is False
assert contract["gates"]["finalOwnerWalletApprovalRequired"] is True
print("REVIVE_V1=PASS supply=200000000 allocation=100 devcity=100 legacy=20000000 permanent_lp_lock_target=100 mainnet=LOCKED")
