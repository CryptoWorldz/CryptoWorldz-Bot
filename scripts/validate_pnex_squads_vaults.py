#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/"worldzpad-mainnet/phenix/pnex-squads-vault-map.v1.json"
if not p.exists(): raise SystemExit("PNEX vault map missing; run derive-pnex-squads-vaults.mjs")
c=json.loads(p.read_text())
e=[]
def r(x,m):
    if not x:e.append(m)
r(c["provider"]=="Squads v4","provider drift")
r(c["multisigConfigAddress"]=="B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN","multisig drift")
r(c["index0CrossCheck"]=="PASS","index0 cross-check missing")
r(c["vaults"][0]["address"]=="n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB","known vault mismatch")
r(len(c["vaults"])==7 and len({x["address"] for x in c["vaults"]})==7,"vault uniqueness/count failed")
r(c["tokenMint"] is None,"do not invent PNEX mint")
r(c["governanceUpgradeComplete"] is False,"5-of-10 upgrade must not be falsely marked complete")
r(c["execution"]["mainnetExecutionEnabled"] is False,"mainnet execution must remain off")
if e: raise SystemExit("PNEX SQUADS VAULT MAP VALIDATION FAILED\n- "+"\n- ".join(e))
print("PNEX SQUADS VAULT MAP VALIDATION — SUCCESS")
print("Known index-0 vault cross-check: PASS")
print("Dedicated owner PDAs: Chance / FlyWheel / staged LP / developer vesting / legacy claim / LP quote reserve")
print("5-of-10 governance upgrade: PENDING")
