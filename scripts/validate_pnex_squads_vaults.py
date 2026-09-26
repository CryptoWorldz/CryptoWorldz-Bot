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
r(c["schema"]=="PNEX-SQUADS-VAULT-MAP-V2","schema drift")
ops=c["operations"]; reserve=c["reserve"]
r(ops["multisigConfigAddress"]=="B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN","operations multisig drift")
r(ops["index0CrossCheck"]=="PASS","index0 cross-check missing")
r(ops["vaults"][0]["address"]=="n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB","known vault mismatch")
r(ops["requiredGovernanceBeforePHENIXMainnet"]=="5-of-10","operations governance must be 5-of-10")
r(ops["governanceUpgradeComplete"] is False,"do not falsely mark operations upgrade complete")
r(len(ops["vaults"])==4 and len({x["address"] for x in ops["vaults"]})==4,"operations vault uniqueness/count failed")
r(reserve["requiredGovernanceBeforePHENIXMainnet"]=="6-of-9","reserve governance must be 6-of-9")
r(reserve["multisigConfigAddress"] is None and reserve["deploymentComplete"] is False,"reserve must remain pending until actually deployed")
r(all(x["address"] is None for x in reserve["vaults"]),"do not derive reserve vaults from Operations multisig")
r(c["tokenMint"] is None,"do not invent PNEX mint")
r(c["execution"]["mainnetExecutionEnabled"] is False,"mainnet execution must remain off")
if e: raise SystemExit("PNEX SQUADS VAULT MAP VALIDATION FAILED\n- "+"\n- ".join(e))
print("PNEX SQUADS VAULT MAP VALIDATION — SUCCESS")
print("Operations: existing index-0 cross-check PASS; dedicated Chance/Developer/Legacy PDAs derived")
print("Operations governance: 5-of-10 upgrade PENDING")
print("Reserve governance: separate 6-of-9 deployment PENDING; no false addresses derived")
