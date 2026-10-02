#!/usr/bin/env python3
"""Validate and export approved PHENIX Chance seats.

No transfers or vesting contracts are executed here.
"""
import argparse,csv,json
from pathlib import Path

FIELDS=["account","wallet","source_post_url","claim_url","ownership_proof_url","consent_12_months","duplicate_review","approval","notes"]
MAX_SEATS=500
IMMEDIATE=50_000
MONTHLY=6_250
MONTHS=12
VESTED=MONTHLY*MONTHS
TOTAL=IMMEDIATE+VESTED
BASE58=set("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")

def validate(rows):
    errors=[]; approved=[]; wallets=set(); accounts=set()
    if len(rows)>MAX_SEATS: errors.append("candidate register exceeds 500 rows")
    for n,row in enumerate(rows,2):
        account=row["account"].strip().lower()
        wallet=row["wallet"].strip()
        if wallet and (not 32<=len(wallet)<=44 or any(c not in BASE58 for c in wallet)):
            errors.append(f"row {n}: invalid Solana wallet format")
        if wallet and wallet in wallets: errors.append(f"row {n}: duplicate wallet")
        if account and account in accounts: errors.append(f"row {n}: duplicate account")
        if wallet: wallets.add(wallet)
        if account: accounts.add(account)
        if row["approval"].strip().lower()=="approved":
            for key in ["account","wallet","source_post_url","claim_url","ownership_proof_url"]:
                if not row[key].strip(): errors.append(f"row {n}: approved seat missing {key}")
            if row["consent_12_months"].strip().lower()!="yes": errors.append(f"row {n}: vesting consent missing")
            if row["duplicate_review"].strip().lower()!="passed": errors.append(f"row {n}: duplicate review missing")
            approved.append(row)
    return approved,errors

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--register",type=Path)
    p.add_argument("--self-test",action="store_true")
    a=p.parse_args()
    if a.self_test:
        assert TOTAL==125_000 and VESTED==75_000 and TOTAL*500==62_500_000
        print("PNEX_CHANCE_VAULT_SELF_TEST=PASS seats=500 per_seat=125000 immediate=50000 vested=75000 total_pool=62500000")
        return
    if not a.register: p.error("--register required")
    with a.register.open(newline="",encoding="utf-8") as f:
        reader=csv.DictReader(f)
        if reader.fieldnames!=FIELDS: p.error("register columns do not match canonical PHENIX Chance template")
        rows=list(reader)
    approved,errors=validate(rows)
    if errors: p.error("; ".join(errors))
    print(json.dumps({
      "approvedSeats":len(approved),
      "remainingSeats":MAX_SEATS-len(approved),
      "approvedImmediateTokens":len(approved)*IMMEDIATE,
      "approvedVestedTokens":len(approved)*VESTED,
      "reservedUnclaimedTokens":(MAX_SEATS-len(approved))*TOTAL
    },indent=2))

if __name__=="__main__":main()
