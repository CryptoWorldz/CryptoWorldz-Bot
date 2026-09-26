#!/usr/bin/env python3
"""Deterministic PNEX vesting/cycle schedule builder.

Planning and proof utility only: it never signs, transfers, unlocks or broadcasts.
Amounts are reconciled in raw 6-decimal PNEX units so the final release is exact.
"""
import argparse
import calendar
import json
from datetime import date, timedelta

DECIMALS = 6
UNIT = 10 ** DECIMALS

def add_months(start, months):
    idx = start.year * 12 + start.month - 1 + months
    year, zero = divmod(idx, 12)
    month = zero + 1
    return date(year, month, min(start.day, calendar.monthrange(year, month)[1]))

def split_raw(total_tokens, releases):
    raw = int(round(total_tokens * UNIT))
    base, extra = divmod(raw, releases)
    return [base + (1 if i < extra else 0) for i in range(releases)]

def schedule_monthly(total_tokens, launch, cliff_days, releases):
    cliff = launch + timedelta(days=cliff_days)
    amounts = split_raw(total_tokens, releases)
    rows = []
    for i, raw in enumerate(amounts):
        release_date = cliff if i == 0 else add_months(cliff, i)
        rows.append({"release": i + 1, "date": release_date.isoformat(),
                     "raw": raw, "tokens": f"{raw / UNIT:.6f}"})
    return rows

def schedule_cycles(total_tokens, launch, cliff_days, releases, cycle_days=30):
    cliff = launch + timedelta(days=cliff_days)
    amounts = split_raw(total_tokens, releases)
    return [{"cycle": i + 1,
             "date": (cliff + timedelta(days=cycle_days * i)).isoformat(),
             "raw": raw, "tokens": f"{raw / UNIT:.6f}"}
            for i, raw in enumerate(amounts)]

def chance_schedule(launch):
    raw = 37_500_000 * UNIT
    per = raw // 12
    assert per * 12 == raw
    return [{"release": i, "date": add_months(launch, i).isoformat(),
             "raw": per, "tokens": f"{per / UNIT:.6f}"}
            for i in range(1, 13)]

def build(plan, launch, amount=None):
    if plan == "developer":
        total = 25_000_000
        rows = schedule_monthly(total, launch, 90, 24)
        policy = {"cliff_days": 90, "releases": 24, "cadence": "monthly"}
    elif plan == "flywheel":
        total = 47_500_000
        rows = schedule_cycles(total, launch, 90, 48, 30)
        policy = {"cliff_days": 90, "releases": 48, "cadence": "every_30_days",
                  "unused_allowance": "rolls_forward_inside_flywheel"}
    elif plan == "chance":
        total = 37_500_000
        rows = chance_schedule(launch)
        policy = {"cliff_days": 0, "releases": 12, "cadence": "monthly_anniversary"}
    elif plan == "builder":
        if amount is None or amount <= 0:
            raise ValueError("--amount is required and must be positive for builder")
        total = amount
        rows = schedule_monthly(total, launch, 90, 24)
        policy = {"cliff_days": 90, "releases": 24, "cadence": "monthly"}
    else:
        raise ValueError("unknown plan")

    total_raw = sum(x["raw"] for x in rows)
    expected_raw = int(round(total * UNIT))
    assert total_raw == expected_raw
    return {
        "schema": "PNEX-VESTING-SCHEDULE-V1",
        "plan": plan,
        "launch_date": launch.isoformat(),
        "total_tokens": total,
        "total_raw": total_raw,
        "decimals": DECIMALS,
        "policy": policy,
        "schedule": rows,
        "exact_reconciliation": True
    }

def main():
    p = argparse.ArgumentParser()
    p.add_argument("plan", choices=("developer", "flywheel", "chance", "builder"))
    p.add_argument("--launch-date", required=True, type=date.fromisoformat)
    p.add_argument("--amount", type=float)
    args = p.parse_args()
    print(json.dumps(build(args.plan, args.launch_date, args.amount), indent=2))

if __name__ == "__main__":
    main()
