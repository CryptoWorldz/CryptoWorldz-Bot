#!/usr/bin/env python3
"""Bind the final human/mainnet inputs for PHENIX without signing or broadcasting.

The tool refuses placeholders. It validates Solana address format, HTTPS metadata
URLs and the exact 5% genesis PNEX amount, then derives the opening pool ratio
from the owner-approved SOL amount. Output is a review artifact only.
"""
import argparse, json
from decimal import Decimal, InvalidOperation, getcontext
from pathlib import Path
getcontext().prec = 40

BASE58=set("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")
GENESIS_PNEX=Decimal("12500000")

def solana_address(value):
    return 32 <= len(value) <= 44 and all(c in BASE58 for c in value)

def https(value):
    return value.startswith("https://") and len(value)>8

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--mint", required=True)
    p.add_argument("--image-uri", required=True)
    p.add_argument("--metadata-uri", required=True)
    p.add_argument("--genesis-sol", required=True)
    p.add_argument("--chance-vault", required=True)
    p.add_argument("--staged-liquidity-vault", required=True)
    p.add_argument("--developer-vesting", required=True)
    p.add_argument("--pdh-vault", required=True)
    p.add_argument("--flywheel-vault", required=True)
    p.add_argument("--output", type=Path)
    args=p.parse_args()

    addresses={
      "mint":args.mint,
      "chanceVault":args.chance_vault,
      "stagedLiquidityVault":args.staged_liquidity_vault,
      "developerVesting":args.developer_vesting,
      "pdhVault":args.pdh_vault,
      "flyWheelVault":args.flywheel_vault
    }
    bad=[k for k,v in addresses.items() if not solana_address(v)]
    if bad: p.error("invalid Solana address format: "+", ".join(bad))
    if not https(args.image_uri) or not https(args.metadata_uri):
        p.error("image and metadata URIs must use https://")
    try:
        sol=Decimal(args.genesis_sol)
    except InvalidOperation:
        p.error("--genesis-sol must be a decimal number")
    if sol <= 0: p.error("--genesis-sol must be greater than zero")

    price=sol/GENESIS_PNEX
    out={
      "schema":"PNEX-FINAL-HUMAN-INPUTS-V1",
      "status":"REVIEW_ONLY__NO_SIGNATURE__NO_BROADCAST",
      "identity":{"mint":args.mint,"imageUri":args.image_uri,"metadataUri":args.metadata_uri},
      "genesisLiquidity":{
        "pnexTokens":12500000,
        "sol":str(sol.normalize()),
        "derivedOpeningRatioSolPerPnex":format(price,"f"),
        "note":"Derived ratio only; market price may move immediately after trading begins."
      },
      "destinations":addresses,
      "checks":{
        "allRequiredInputsPresent":True,
        "worldzStoresPrivateKeys":False,
        "signs":False,
        "broadcasts":False
      }
    }
    rendered=json.dumps(out,indent=2)+"\n"
    if args.output:
        if args.output.exists(): p.error("output exists; refusing overwrite")
        args.output.write_text(rendered,encoding="utf-8")
        print("PNEX_FINAL_INPUTS=PREPARED output="+str(args.output))
    else:
        print(rendered,end="")

if __name__=="__main__":
    main()
