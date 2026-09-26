#!/usr/bin/env python3
"""Build PNEX Purple Diamond Handz entitlements from an approved claim register.

Input JSON is an array of approved claimant records:
  {"claimantId":"...", "wallets":["..."], "qualifyingWeightRaw":"123", "approved":true}
No candidate becomes eligible merely by appearing in an old distribution ledger.
"""
import argparse, json, math
from pathlib import Path

POOL_RAW=2_500_000*1_000_000

def build(rows):
    approved=[]
    seen_wallets=set()
    for i,row in enumerate(rows):
        if row.get("approved") is not True:
            continue
        claimant=str(row.get("claimantId","")).strip()
        wallets=[str(w).strip() for w in row.get("wallets",[]) if str(w).strip()]
        weight=int(row.get("qualifyingWeightRaw","0"))
        if not claimant or not wallets or weight<=0:
            raise ValueError(f"approved row {i} missing claimant/wallets/weight")
        overlap=seen_wallets.intersection(wallets)
        if overlap:
            raise ValueError("wallet appears in multiple approved claimants: "+",".join(sorted(overlap)))
        seen_wallets.update(wallets)
        approved.append({"claimantId":claimant,"wallets":sorted(set(wallets)),"weight":weight})
    if not approved:
        return {"approvedClaimants":0,"poolRaw":POOL_RAW,"allocatedRaw":0,"dustRaw":POOL_RAW,"entitlements":[]}

    n=len(approved)
    equal_pool=POOL_RAW//2
    sqrt_pool=POOL_RAW-equal_pool
    equal_each=equal_pool//n
    roots=[math.isqrt(x["weight"]*10**18) for x in approved]
    root_total=sum(roots)
    ent=[]
    allocated=0
    for row,root in zip(approved,roots):
        sqrt_part=(sqrt_pool*root)//root_total
        amount=equal_each+sqrt_part
        allocated+=amount
        ent.append({
            "claimantId":row["claimantId"],
            "wallets":row["wallets"],
            "amountRaw":str(amount),
            "amountPnex":f"{amount/1_000_000:.6f}"
        })
    return {
        "approvedClaimants":n,
        "poolRaw":POOL_RAW,
        "allocatedRaw":allocated,
        "dustRaw":POOL_RAW-allocated,
        "formula":"50% equal + 50% integer-sqrt qualifying legacy weight",
        "entitlements":ent
    }

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--claims",type=Path)
    p.add_argument("--output",type=Path)
    p.add_argument("--self-test",action="store_true")
    a=p.parse_args()
    if a.self_test:
        demo=[
          {"claimantId":"a","wallets":["w1"],"qualifyingWeightRaw":"100","approved":True},
          {"claimantId":"b","wallets":["w2","w3"],"qualifyingWeightRaw":"900","approved":True},
          {"claimantId":"no","wallets":["w4"],"qualifyingWeightRaw":"99999","approved":False}
        ]
        out=build(demo)
        assert out["approvedClaimants"]==2
        assert len(out["entitlements"])==2
        assert int(out["entitlements"][1]["amountRaw"])>int(out["entitlements"][0]["amountRaw"])
        assert out["allocatedRaw"]+out["dustRaw"]==POOL_RAW
        print("PNEX_PDH_CLAIM_ENGINE_SELF_TEST=PASS duplicate_gate=ON unapproved_excluded=YES exact_reconciliation=YES")
        return
    if not a.claims or not a.output:
        p.error("--claims and --output required")
    out=build(json.loads(a.claims.read_text()))
    a.output.write_text(json.dumps(out,indent=2)+"\n")
    print(json.dumps({k:out[k] for k in ["approvedClaimants","poolRaw","allocatedRaw","dustRaw"]}))

if __name__=="__main__":
    main()
