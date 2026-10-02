#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
r=json.loads((ROOT/"worldzpad-mainnet/phenix/pnex-launch-readiness.v1.json").read_text())
i=json.loads((ROOT/"worldzpad-mainnet/phenix/pnex-token-identity.v1.json").read_text())
e=[]
def q(x,m):
    if not x:e.append(m)
q(i["name"]=="PHENIX" and i["symbol"]=="PNEX","identity drift")
q(i["fixedSupplyTokens"]==250_000_000 and i["decimals"]==6,"supply/decimals drift")
q(i["mint"] is None,"pre-mint identity must not invent CA")
q(i["image"] is None,"do not invent logo URI")
q(i["authoritiesRequiredAfterGenesis"]["mintAuthority"] is None,"mint authority final target must be revoked")
q(i["authoritiesRequiredAfterGenesis"]["freezeAuthority"] is None,"freeze authority final target must be revoked")
ids=[g["id"] for g in r["gates"]]
q(len(ids)==len(set(ids)),"duplicate readiness gate")
for needed in ["allocation","vesting_policy","liquidity_policy","fee_router","purple_diamond_handz","canonical_mint","devnet_proofburn","devnet_pool_lock_fee","human_mainnet_authorization"]:
    q(needed in ids,"missing gate "+needed)
q(r["mainnetExecutionEnabled"] is False,"mainnet must remain disabled during prep")
if e: raise SystemExit("PNEX READINESS VALIDATION FAILED\n- "+"\n- ".join(e))
print("PNEX READINESS MODEL — SUCCESS")
print("Identity reserved: PHENIX / PNEX / 250M / 6 decimals")
print("Canonical CA and logo URI intentionally unset until real")
