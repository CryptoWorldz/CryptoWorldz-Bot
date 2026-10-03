#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / "worldzpad-mainnet/tokenomics/worldz-token-dna.v1.json"

with SPEC.open() as f:
    d = json.load(f)

assert d["schema"] == "WORLDZ-TOKEN-DNA-V1"
assert d["status"] == "DESIGN_LOCKED__IMPLEMENTATION_AND_MAINNET_EXECUTION_GATED"

modes = d["creatorModes"]
assert [m["id"] for m in modes] == ["BEGINNER", "INTERMEDIATE", "ADVANCED"]
assert all(m["canBreakSafeLaunchLimits"] is False for m in modes)

p = d["publicDefaults"]
assert p["fixedSupply"] is True
assert p["walletTransferTaxPercent"] == 0
assert p["creatorTeamPercentMax"] == 15
assert p["creatorTeamLiquidAtGenesisPercentMax"] == 5
assert p["founderMinimumCliffDays"] >= 90
assert p["founderMinimumVestingMonths"] >= 18
assert p["liquidityAllocationPercent"] == {"min": 25, "max": 60}
assert p["creatorControlledLpLockPercent"] == 100
assert p["creatorControlledLpMinimumLockDays"] >= 365
assert p["worldzContributionChoicesPercent"] == [3, 5, 8]

family = d["worldzCoreFamily"]
expected = {
    "WLDZ": 100_000_000,
    "RVIV": 200_000_000,
    "PNEX": 250_000_000,
    "MRCL": 348_000_000,
}
for sym, supply in expected.items():
    assert family[sym]["supply"] == supply
    assert family[sym]["canRemint"] is False

assert family["WLDZ"]["lifecycle"] == "LIVE_CANONICAL"
assert family["RVIV"]["lifecycle"] == "LIVE_CANONICAL"
assert family["PNEX"]["lifecycle"] == "PRELAUNCH_SPEC_LOCKED"
assert family["MRCL"]["lifecycle"] == "PLANNED_SPEC_LOCKED"
assert family["MRCL"]["remainingSupply"]["percent"] == 54
assert family["MRCL"]["remainingSupply"]["tokens"] == 187_920_000

arch = d["futureArchitecture"]
assert arch["notation"] == "Worldz Layer 1 + Layer 1.5 + 8"
assert len(arch["eightRails"]) == 8
assert [x["id"] for x in arch["eightRails"]] == [
    "solana", "ethereum", "base", "bnb", "robinhood", "hyper", "xrpl", "sui"
]
assert "OPEN" in arch["layer1"]["nativeAssetDecision"]
assert "SEPARATE" in arch["layer1"]["nativeAssetDecision"]

payments = d["payments"]
assert payments["worldzCard"]["stablecoinSettlementReady"] is True
assert payments["xMoney"]["state"].startswith("ADAPTER_PLACEHOLDER")
assert "NO_PUBLIC_X_MONEY_PAYMENT_API_VERIFIED" in payments["xMoney"]["state"]

print("WORLDZ TOKEN DNA V1: PASS")
