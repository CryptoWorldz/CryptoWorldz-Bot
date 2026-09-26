#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "worldzpad-mainnet/token-identity/worldz-token-registry.v1.json"
TOKENLIST = ROOT / "launchpad.cryptoworldz.xyz/tokenlist.json"
PUBLIC = {
    "WLDZ": ROOT / "launchpad.cryptoworldz.xyz/wldz/token-metadata.json",
    "RVIV": ROOT / "launchpad.cryptoworldz.xyz/rviv/token-metadata.json",
}

def load(path):
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)

def fail(msg):
    raise SystemExit("WORLDZ TOKEN IDENTITY FAIL: " + msg)

reg = load(REGISTRY)
tokens = reg["tokens"]

orders = [t["launchOrder"] for t in tokens]
symbols = [t["symbol"] for t in tokens]
if len(orders) != len(set(orders)):
    fail("duplicate launchOrder")
if len(symbols) != len(set(symbols)):
    fail("duplicate symbol")

live = [t for t in tokens if t.get("canonicalMint")]
mints = [t["canonicalMint"] for t in live]
if len(mints) != len(set(mints)):
    fail("duplicate canonical mint")

expected = {
    "WLDZ": ("WORLDZ", "AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U", 6),
    "RVIV": ("REVIVE", "DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R", 6),
}
by_symbol = {t["symbol"]: t for t in tokens}
for sym, (name, mint, decimals) in expected.items():
    t = by_symbol.get(sym)
    if not t:
        fail(f"missing {sym} registry record")
    if (t["name"], t["canonicalMint"], t["decimals"]) != (name, mint, decimals):
        fail(f"{sym} canonical identity mismatch")

for sym in ("PNEX", "MRCL"):
    t = by_symbol.get(sym)
    if not t:
        fail(f"missing {sym} future identity reservation")
    if t.get("canonicalMint") is not None:
        fail(f"{sym} must not publish a mainnet mint before launch")

tokenlist = load(TOKENLIST)
listed = {t["symbol"]: t for t in tokenlist["tokens"]}
for sym in ("WLDZ", "RVIV"):
    r = by_symbol[sym]
    p = listed.get(sym)
    if not p:
        fail(f"{sym} missing from public token list")
    checks = {
        "name": r["name"],
        "symbol": r["symbol"],
        "address": r["canonicalMint"],
        "decimals": r["decimals"],
    }
    for key, value in checks.items():
        if p.get(key) != value:
            fail(f"{sym} tokenlist {key} mismatch")

for sym, path in PUBLIC.items():
    r = by_symbol[sym]
    p = load(path)
    checks = {
        "name": r["name"],
        "symbol": r["symbol"],
        "address": r["canonicalMint"],
        "decimals": r["decimals"],
    }
    for key, value in checks.items():
        if p.get(key) != value:
            fail(f"{sym} public metadata {key} mismatch")

extra_live = set(listed) - {"WLDZ", "RVIV"}
for sym in extra_live:
    r = by_symbol.get(sym)
    if not r or not r.get("canonicalMint"):
        fail(f"{sym} is in live token list without a canonical mint")

print("WORLDZ TOKEN IDENTITY PASS")
print("WLDZ = WORLDZ / AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U")
print("RVIV = REVIVE / DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R")
print("PNEX and MRCL remain non-live identity reservations")
