#!/usr/bin/env python3
"""PHENIX Chance planning, evidence register and deterministic monthly schedule.

This tool does not mint, transfer, lock, or vest tokens on chain. Its approved
CSV export is input for a separately reviewed on-chain vesting deployment.
"""
import argparse
import calendar
import csv
import json
from datetime import date
from pathlib import Path

SUPPLY = 250_000_000
SEATS = 500
BUCKETS = {
    "chance_immediate": 25_000_000,  # 10%
    "chance_12_months": 37_500_000,  # 15%
    "liquidity_total": 112_500_000,  # 45%; includes initial pool
    "developer_vesting": 25_000_000,  # 10%; schedule not yet specified
    "purple_diamond_handz": 2_500_000,  # 1%; separate legacy pool
    "unassigned_pending_decision": 47_500_000,  # 19%; no authority to spend
}
INITIAL_LP = 12_500_000  # 5%, part of liquidity_total
FIELDS = ["account", "wallet", "source_post_url", "claim_url", "ownership_proof_url",
          "consent_12_months", "duplicate_review", "approval", "notes"]
BASE58 = set("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")


def plan():
    assert sum(BUCKETS.values()) == SUPPLY
    assert INITIAL_LP <= BUCKETS["liquidity_total"]
    return {"supply": SUPPLY, "seats_target": SEATS, "buckets": BUCKETS,
            "initial_lp_included_in_liquidity": INITIAL_LP,
            "later_lp_capacity": BUCKETS["liquidity_total"] - INITIAL_LP,
            "per_seat": {"immediate": 50_000, "vested": 75_000,
                         "monthly": 6_250, "total": 125_000},
            "status": "provisional; unassigned allocation and mainnet deployment pending"}


def add_months(start, months):
    month_index = start.year * 12 + start.month - 1 + months
    year, zero_month = divmod(month_index, 12)
    month = zero_month + 1
    return date(year, month, min(start.day, calendar.monthrange(year, month)[1]))


def monthly_schedule(start, seats=SEATS):
    """Dates are calendar-month anniversaries after a specified launch date."""
    if not 1 <= seats <= SEATS:
        raise ValueError("approved seats must be between 1 and 500")
    return [{"month": i, "date": add_months(start, i).isoformat(),
             "per_wallet_pnex": 6_250, "all_wallets_pnex": seats * 6_250}
            for i in range(1, 13)]


def read_register(path):
    with path.open(newline="", encoding="utf-8") as source:
        reader = csv.DictReader(source)
        if reader.fieldnames != FIELDS:
            raise ValueError("register columns do not match the template")
        return list(reader)


def validate(rows):
    approved, errors, seen_wallets, seen_accounts = [], [], set(), set()
    if len(rows) > SEATS:
        errors.append("register exceeds 500 candidate rows")
    for n, row in enumerate(rows, 2):
        wallet = row["wallet"].strip()
        account = row["account"].strip().lower()
        if wallet and (not 32 <= len(wallet) <= 44 or any(c not in BASE58 for c in wallet)):
            errors.append(f"row {n}: invalid Solana address format")
        if wallet and wallet in seen_wallets:
            errors.append(f"row {n}: duplicate wallet")
        if account and account in seen_accounts:
            errors.append(f"row {n}: duplicate account")
        seen_wallets.add(wallet) if wallet else None
        seen_accounts.add(account) if account else None
        if row["approval"].strip().lower() == "approved":
            missing = [key for key in ("account", "wallet", "source_post_url",
                       "claim_url", "ownership_proof_url") if not row[key].strip()]
            if missing:
                errors.append(f"row {n}: approved record missing {', '.join(missing)}")
            for key in ("source_post_url", "claim_url", "ownership_proof_url"):
                if row[key].strip() and not row[key].strip().startswith("https://"):
                    errors.append(f"row {n}: {key} must use https://")
            if row["consent_12_months"].strip().lower() != "yes":
                errors.append(f"row {n}: vesting consent missing")
            if row["duplicate_review"].strip().lower() != "passed":
                errors.append(f"row {n}: duplicate review missing")
            approved.append(row)
    return approved, errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("plan", "init", "check", "schedule", "export"))
    parser.add_argument("--register", type=Path, default=Path("phenix_candidates.csv"))
    parser.add_argument("--launch-date", type=date.fromisoformat)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.action == "plan":
        print(json.dumps(plan(), indent=2))
        return
    if args.action == "init":
        with args.register.open("x", newline="", encoding="utf-8") as target:
            csv.DictWriter(target, fieldnames=FIELDS).writeheader()
        print(f"Created {args.register}; approved wallets: 0")
        return
    approved, errors = validate(read_register(args.register))
    if errors:
        parser.error("; ".join(errors))
    if args.action == "check":
        print(json.dumps({"candidates": len(read_register(args.register)),
                          "approved": len(approved), "seats_remaining": SEATS - len(approved)}))
        return
    if not args.launch_date:
        parser.error("--launch-date YYYY-MM-DD is required; no launch date is assumed")
    if args.action == "schedule":
        print(json.dumps(monthly_schedule(args.launch_date, len(approved)) if approved else [], indent=2))
        return
    if args.action == "export":
        if not args.output:
            parser.error("--output is required")
        if not approved:
            parser.error("no approved recipients; export refused")
        if args.output.exists():
            parser.error("output already exists; refusing overwrite")
        with args.output.open("x", newline="", encoding="utf-8") as target:
            writer = csv.DictWriter(target, fieldnames=["wallet", "immediate_pnex", "monthly_pnex",
                                                       "first_release", "twelfth_release"])
            writer.writeheader()
            for row in approved:
                writer.writerow({"wallet": row["wallet"], "immediate_pnex": 50_000,
                                 "monthly_pnex": 6_250,
                                 "first_release": add_months(args.launch_date, 1).isoformat(),
                                 "twelfth_release": add_months(args.launch_date, 12).isoformat()})
        print(f"Exported {len(approved)} approved recipients to {args.output}")


if __name__ == "__main__":
    main()
