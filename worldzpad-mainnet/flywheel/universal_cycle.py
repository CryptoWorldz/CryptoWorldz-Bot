#!/usr/bin/env python3
"""Worldz Universal Cycle™ completeness checker.

A cycle may only close when every eligible registered token has exactly one
benefit record. Token-specific actions must resolve to a published PASSED
Worldz Proof Receipt that matches the same registered token and action class.
This tool performs accounting validation only and cannot move funds, trade,
burn, bridge, sign or broadcast.
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

TERMINAL_PROOF_STATES = {"PASSED", "SHARED_INFRASTRUCTURE_VERIFIED"}
CHAIN_ACTION_BENEFITS = ALLOWED - {"SHARED_INFRASTRUCTURE_ONLY"}
RECEIPT_ACTIONS = {
    "LIQUIDITY_SUPPORT": {"liquidity"},
    "ECOSYSTEM_GRANT": {"distribution", "other"},
    "LINKED_ASSET_BUILD": {"linked_asset", "bridge", "liquidity"},
    "OMNIBUILDZ": {"bridge", "linked_asset", "liquidity"},
    "TOKEN_NATIVE_BURN": {"burn"},
    "COMMUNITY_SUPPORT": {"distribution", "other"},
}

def validate(registry, records, receipts=None):
    errors = []
    receipts = receipts or []
    eligible = [t for t in registry if t.get("eligible", True)]
    ids = [str(t["tokenId"]) for t in eligible]
    registry_by_id = {str(t["tokenId"]): t for t in eligible}
    if len(ids) != len(set(ids)):
        errors.append("eligible registry contains duplicate tokenId")

    receipt_by_id = {}
    for receipt in receipts:
        rid = str(receipt.get("receiptId", ""))
        if not rid:
            errors.append("proof receipt missing receiptId")
            continue
        if rid in receipt_by_id:
            errors.append(f"duplicate proof receipt id: {rid}")
        receipt_by_id[rid] = receipt

    by_token = {}
    for rec in records:
        token_id = str(rec.get("tokenId", ""))
        by_token.setdefault(token_id, []).append(rec)
        benefit = rec.get("benefitType")
        if benefit not in ALLOWED:
            errors.append(f"{token_id}: unsupported benefitType")
        if rec.get("directSpend", 0) < 0:
            errors.append(f"{token_id}: directSpend cannot be negative")
        if benefit == "SHARED_INFRASTRUCTURE_ONLY" and rec.get("directSpend", 0) != 0:
            errors.append(f"{token_id}: infrastructure-only record must have zero directSpend")

        proof_state = str(rec.get("worldzProofState", "")).upper()
        if proof_state not in TERMINAL_PROOF_STATES:
            errors.append(f"{token_id}: worldzProofState must be a terminal verified state")

        if benefit in CHAIN_ACTION_BENEFITS:
            if proof_state != "PASSED":
                errors.append(f"{token_id}: token-specific benefit requires PASSED proof")
            rid = str(rec.get("proofReceiptId", ""))
            if not rid:
                errors.append(f"{token_id}: token-specific benefit requires proofReceiptId")
                continue
            receipt = receipt_by_id.get(rid)
            if not receipt:
                errors.append(f"{token_id}: proofReceiptId {rid} does not resolve")
                continue
            if str(receipt.get("status", "")).upper() != "PASSED":
                errors.append(f"{token_id}: proof receipt {rid} is not PASSED")
            if str(receipt.get("registryTokenId", "")) != token_id:
                errors.append(f"{token_id}: proof receipt {rid} belongs to a different registry token")
            action = str(receipt.get("actionType", ""))
            if action not in RECEIPT_ACTIONS.get(benefit, set()):
                errors.append(f"{token_id}: proof receipt {rid} actionType {action!r} does not match {benefit}")
            reg = registry_by_id.get(token_id) or {}
            expected_asset = reg.get("assetId")
            actual_asset = (receipt.get("token") or {}).get("assetId")
            if expected_asset and actual_asset != expected_asset:
                errors.append(f"{token_id}: proof receipt {rid} assetId mismatch")

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
        "proofReceipts": len(receipts),
        "complete": not errors,
        "errors": errors
    }

def self_test():
    registry = [
        {"tokenId": "legacy:PDC", "eligible": True},
        {"tokenId": "solana:WLDZ", "assetId": "WLDZ_MINT", "eligible": True},
        {"tokenId": "solana:RVIV", "eligible": True},
        {"tokenId": "solana:PNEX", "eligible": True},
        {"tokenId": "solana:EXTERNAL", "eligible": True},
    ]
    good = [
        {"tokenId": x["tokenId"], "benefitType": "SHARED_INFRASTRUCTURE_ONLY",
         "directSpend": 0, "worldzProofState": "SHARED_INFRASTRUCTURE_VERIFIED"}
        for x in registry
    ]
    ok = validate(registry, good, [])
    assert ok["complete"] and ok["eligibleTokens"] == 5

    bad = validate(registry, good[:-1], [])
    assert not bad["complete"] and any("EXTERNAL" in e for e in bad["errors"])

    failed_proof = [dict(row) for row in good]
    failed_proof[0]["worldzProofState"] = "FAILED"
    assert not validate(registry, failed_proof, [])["complete"]

    action = [dict(row) for row in good]
    action[1].update({
        "benefitType": "LIQUIDITY_SUPPORT",
        "worldzProofState": "PASSED",
        "directSpend": 1,
        "proofReceiptId": "receipt-wldz-liquidity"
    })
    missing = validate(registry, action, [])
    assert not missing["complete"] and any("does not resolve" in e for e in missing["errors"])

    receipt = {
        "receiptId": "receipt-wldz-liquidity",
        "registryTokenId": "solana:WLDZ",
        "status": "PASSED",
        "actionType": "liquidity",
        "token": {"assetId": "WLDZ_MINT"}
    }
    assert validate(registry, action, [receipt])["complete"]

    wrong = dict(receipt)
    wrong["registryTokenId"] = "solana:RVIV"
    assert not validate(registry, action, [wrong])["complete"]

    print("WORLDZ UNIVERSAL CYCLE — SELF TEST SUCCESS")
    print("No Token Left Behind completeness gate: ACTIVE")
    print("Token-specific actions require resolved matching PASSED Proof Receipts")

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--registry", type=Path)
    p.add_argument("--benefits", type=Path)
    p.add_argument("--receipts", type=Path)
    p.add_argument("--self-test", action="store_true")
    args = p.parse_args()
    if args.self_test:
        self_test()
        return
    if not args.registry or not args.benefits:
        p.error("--registry and --benefits are required unless --self-test is used")
    receipts = json.loads(args.receipts.read_text(encoding="utf-8")) if args.receipts else []
    result = validate(
        json.loads(args.registry.read_text(encoding="utf-8")),
        json.loads(args.benefits.read_text(encoding="utf-8")),
        receipts
    )
    print(json.dumps(result, indent=2))
    if not result["complete"]:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
