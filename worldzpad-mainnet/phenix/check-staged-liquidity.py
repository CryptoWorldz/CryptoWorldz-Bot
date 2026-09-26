#!/usr/bin/env python3
"""Validate PHENIX staged-liquidity +5% quote commitment rule."""
import argparse, json
from decimal import Decimal, getcontext
getcontext().prec=50

def check(pnex, price, committed):
    pnex=Decimal(str(pnex)); price=Decimal(str(price)); committed=Decimal(str(committed))
    if pnex <= 0 or price <= 0 or committed < 0:
        raise ValueError("pnex and price must be positive; committed SOL cannot be negative")
    notional=pnex*price
    required=notional*Decimal("1.05")
    return {
        "pnexTokens":str(pnex),
        "observedSolPerPnex":str(price),
        "pnexNotionalSol":str(notional),
        "minimumCommittedSol":str(required),
        "committedSol":str(committed),
        "passes":committed>=required,
        "surplusAboveMinimumSol":str(max(Decimal(0),committed-required))
    }

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--pnex",required=True)
    p.add_argument("--price",required=True)
    p.add_argument("--committed-sol",required=True)
    p.add_argument("--self-test",action="store_true")
    a=p.parse_args()
    if a.self_test:
        assert check(1_000_000,"0.000001","1.05")["passes"]
        assert not check(1_000_000,"0.000001","1.049999")["passes"]
    result=check(a.pnex,a.price,a.committed_sol)
    print(json.dumps(result,indent=2))
    if not result["passes"]:
        raise SystemExit(2)

if __name__=="__main__":
    main()
