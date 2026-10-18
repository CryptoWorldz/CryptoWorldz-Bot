#!/usr/bin/env python3
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
p=ROOT/"worldzpad-mainnet/distribution/worldz-token-distribution-master.v1.json"
d=json.loads(p.read_text())

assert d["operationsTreasury"]["memberCount"]==5
assert d["operationsTreasury"]["threshold"]==3
assert d["operationsTreasury"]["reserveTreasury"]=="DISABLED_NOT_DEPLOYED"

w=d["tokens"]["WLDZ"]
assert w["supply"]==100_000_000
assert w["live"]["total"]==23_000_000
assert w["remainingControlled"]==77_000_000
assert sum(x["tokens"] for x in w["buckets"])==77_000_000
devcity=next(x for x in w["buckets"] if x["name"]=="DevCity 100")
assert devcity["recipients"]==100 and devcity["tokensPerWallet"]==50_000

r=d["tokens"]["RVIV"]
assert r["supply"]==200_000_000
assert r["oneDrop"]["claimants"]==219
assert r["oneDrop"]["legacyRecipients"]==214
assert r["oneDrop"]["devRecipients"]==7
assert r["oneDrop"]["unlockedRaw"]=="19999999999950"
assert r["oneDrop"]["lockedRaw"]=="29999999999998"
assert abs(sum(x["tokens"] for x in r["buckets"])-200_000_000)<0.000001
rviv_devcity=next(x for x in r["buckets"] if x["name"]=="DevCity 100")
assert rviv_devcity["recipients"]==100 and rviv_devcity["tokensPerWallet"]==200_000

pn=d["tokens"]["PNEX"]
assert pn["symbol"]=="PNEX" and pn["mint"] is None and pn["supply"]==250_000_000
assert sum(x["tokens"] for x in pn["buckets"])==250_000_000

m=d["tokens"]["MRCL"]
assert m["symbol"]=="MRCL" and m["mint"] is None and m["supply"]==348_000_000
assert sum(x["tokens"] for x in m["buckets"])==348_000_000

legacy=d["legacyCore"]
assert legacy["beneficiaryCount"]==12
assert legacy["totalAllocationPercent"]==15
assert legacy["equalPercentEach"]==1.25
assert len(legacy["members"])==12

print("WORLDZ_TOKEN_DISTRIBUTION_MASTER=PASS")
print("TREASURY=3-of-5 WLDZ=100M RVIV=200M PNEX=250M MRCL=348M")
