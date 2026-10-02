#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
c=json.loads((ROOT/"worldzpad-mainnet/phenix/pnex-phenix-chance-vault.v1.json").read_text())
e=[]
def r(x,m):
    if not x:e.append(m)
v=c["vault"]; s=c["seat"]
r(v["totalTokens"]==62_500_000 and v["percentOfSupply"]==25,"Chance vault pool drift")
r(v["maximumSeats"]==500 and v["tokensPerSeat"]==125_000,"Chance seat model drift")
r(v["totalTokens"]==v["maximumSeats"]*v["tokensPerSeat"],"Chance pool does not reconcile")
r(v["address"] is None,"do not invent Chance vault address")
r(v["unclaimedSeatsRemainLocked"] is True and v["automaticExpiry"] is False and v["automaticReallocation"] is False,"unclaimed seat protection drift")
r(s["immediateTokens"]==50_000 and s["vestedTokens"]==75_000 and s["totalTokens"]==125_000,"seat token split drift")
r(s["vesting"]["releaseCount"]==12 and s["vesting"]["tokensPerRelease"]==6_250,"vesting schedule drift")
r(s["vesting"]["tokensPerRelease"]*s["vesting"]["releaseCount"]==s["vestedTokens"],"vesting does not reconcile")
r(c["antiAbuse"]["oneSeatPerVerifiedPerson"] is True and c["antiAbuse"]["linkedWalletsDoNotCreateExtraSeats"] is True,"anti-abuse drift")
r(c["claimExecution"]["autoTransfer"] is False and c["claimExecution"]["mainnetExecutionEnabled"] is False,"execution must remain gated")
if e: raise SystemExit("PNEX CHANCE VAULT VALIDATION FAILED\n- "+"\n- ".join(e))
print("PNEX PHENIX CHANCE VAULT VALIDATION — SUCCESS")
print("25% / 62.5M classified at genesis; 500 x 125k seats")
print("Unknown recipients do NOT block genesis because unclaimed seats remain locked")
