#!/usr/bin/env python3
"""Worldz Universal Cycle™ completeness checker.

A cycle may only close when every eligible registered token has exactly one
benefit record. A record may be SHARED_INFRASTRUCTURE_ONLY with zero direct
financial spend. This tool performs accounting validation only and cannot move
funds, trade, burn, bridge, sign or broadcast.
"""
import argparse
import json
from pathlib import Path

ALLOWED = {
    "SHARED_INFRASTRUCTURE_ONLY",
    "LIQUIDITY_SUPPORT",
    "ECOSYSTEM_GRANT",
    "LINKED_ASSET_BUILD",
    "OMNIBUILDZ",
    "TOKEN_NATIVE_BURN",
    "COMMUNITY_SUPPORT",
}

def validate(registry, records):
    errors = []
    eligible = [t for t in registry if t.get("eligible", True)]
    ids = [str(t["tokenId"]) for t in eligible]
    if len(ids) != len(set(ids)):
        errors.append("eligible registry contains duplicate tokenId")

    by_token = {}
    for rec in records:
        token_id = str(rec.get("tokenId", ""))
        by_token.setdefault(token_id, []).append(rec)
        if rec.get("benefitType") not in ALLOWED:
            errors.append(f"{token_id}: unsupported benefitType")
        if rec.get("directSpend", 0) < 0:
            errors.append(f"{token_id}: directSpend cannot be negative")
        if rec.get("benefitType") == "SHARED_INFRASTRUCTURE_ONLY" and rec.get("directSpend", 0) != 0:
            errors.append(f"{token_id}: infrastructure-only record must have zero directSpend")
        if not rec.get("worldzProofState"):
            errors.append(f"{token_id}: worldzProofState required")

    for token_id in ids:
        count = len(by_token.get(token_id, []))
        if count != 1:
            errors.append(f"{token_id}: expected exactly one benefit record, found {count}")

    extras = sorted(set(by_token) - set(ids))
    if extras:
        errors.append("benefit records contain non-eligible/unregistered tokenIds: " + ",".join(extras))

    return {
        "eligibleTokens": len(ids),
        "benefitRecords": len(records),
        "complete": not errors,
        "errors": errors
    }

def self_test():
    registry = [
        {"tokenId": "legacy:PDC", "eligible": True},
        {"tokenId": "solana:WLDZ", "eligible": True},
        {"tokenId": "solana:RVIV", "eligible": True},
        {"tokenId": "solana:PNEX", "eligible": True},
        {"tokenId": "solana:EXTERNAL", "eligible": True},
    ]
    good = [
        {"tokenId": x["tokenId"], "benefitType": "SHARED_INFRASTRUCTURE_ONLY",
         "directSpend": 0, "worldzProofState": "prepared"}
        for x in registry
    ]
    ok = validate(registry, good)
    assert ok["complete"] and ok["eligibleTokens"] == 5
    bad = validate(registry, good[:-1])
    assert not bad["complete"] and any("EXTERNAL" in e for e in bad["errors"])
    print("WORLDZ UNIVERSAL CYCLE — SELF TEST SUCCESS")
    print("No Token Left Behind completeness gate: ACTIVE")
    print("Zero-spend shared-infrastructure benefit records: ALLOWED")

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--registry", type=Path)
    p.add_argument("--benefits", type=Path)
    p.add_argument("--self-test", action="store_true")
    args = p.parse_args()
    if args.self_test:
        self_test()
        return
    if not args.registry or not args.benefits:
        p.error("--registry and --benefits are required unless --self-test is used")
    result = validate(
        json.loads(args.registry.read_text(encoding="utf-8")),
        json.loads(args.benefits.read_text(encoding="utf-8"))
    )
    print(json.dumps(result, indent=2))
    if not result["complete"]:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
