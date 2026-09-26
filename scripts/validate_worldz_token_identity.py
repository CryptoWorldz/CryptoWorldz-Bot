#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "worldzpad-mainnet/token-identity/worldz-token-registry.v1.json"
PUBLIC_REGISTRY = ROOT / "launchpad.cryptoworldz.xyz/.well-known/worldz-tokens.json"
TOKENLIST = ROOT / "launchpad.cryptoworldz.xyz/tokenlist.json"
DEPLOY_WORKFLOW = ROOT / ".github/workflows/deploy-worldzlaunchpad.yml"

def load(path):
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)

def fail(msg):
    raise SystemExit("WORLDZ TOKEN IDENTITY FAIL: " + msg)

registry = load(REGISTRY)
public_registry = load(PUBLIC_REGISTRY)

# The deployable copy must be byte-for-data equivalent to the canonical source.
if public_registry != registry:
    fail("public .well-known registry differs from canonical registry")

tokens = registry["tokens"]
by_symbol = {t["symbol"]: t for t in tokens}
by_mint = {t["canonicalMint"]: t for t in tokens if t.get("canonicalMint")}

orders = [t["launchOrder"] for t in tokens]
symbols = [t["symbol"] for t in tokens]
if len(orders) != len(set(orders)):
    fail("duplicate launchOrder")
if len(symbols) != len(set(symbols)):
    fail("duplicate symbol")
if len(by_mint) != len([t for t in tokens if t.get("canonicalMint")]):
    fail("duplicate canonical mint")

# Protect the first two live Worldz identities from accidental drift.
expected = {
    "WLDZ": ("WORLDZ", "AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U", 6),
    "RVIV": ("REVIVE", "DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R", 6),
}
for sym, (name, mint, decimals) in expected.items():
    t = by_symbol.get(sym)
    if not t:
        fail(f"missing {sym} registry record")
    if (t.get("name"), t.get("canonicalMint"), t.get("decimals")) != (name, mint, decimals):
        fail(f"{sym} canonical identity mismatch")

# Pre-launch identities may be reserved by name/ticker, never by a guessed mainnet mint.
for sym in ("PNEX", "MRCL"):
    t = by_symbol.get(sym)
    if not t:
        fail(f"missing {sym} future identity reservation")
    if t.get("canonicalMint") is not None:
        fail(f"{sym} must not publish a mainnet mint before launch")

tokenlist = load(TOKENLIST)
listed_tokens = tokenlist.get("tokens", [])
listed_symbols = [t.get("symbol") for t in listed_tokens]
listed_mints = [t.get("address") for t in listed_tokens]
if len(listed_symbols) != len(set(listed_symbols)):
    fail("duplicate symbol in public token list")
if len(listed_mints) != len(set(listed_mints)):
    fail("duplicate mint in public token list")

# Every listed token, including all future launches, must match the registry exactly.
for public in listed_tokens:
    sym = public.get("symbol")
    canonical = by_symbol.get(sym)
    if not canonical:
        fail(f"{sym} is listed without a canonical registry record")
    if not canonical.get("canonicalMint"):
        fail(f"{sym} is listed before a canonical mainnet mint exists")
    checks = {
        "name": canonical.get("name"),
        "symbol": canonical.get("symbol"),
        "address": canonical.get("canonicalMint"),
        "decimals": canonical.get("decimals"),
        "chainId": canonical.get("chainId"),
    }
    for key, value in checks.items():
        if public.get(key) != value:
            fail(f"{sym} tokenlist {key} mismatch: {public.get(key)!r} != {value!r}")
    if public.get("name", "").startswith(public.get("address", "")[:4]):
        fail(f"{sym} public name falls back to mint prefix")

# Every canonical live token must be listed and must publish matching metadata.
for canonical in tokens:
    mint = canonical.get("canonicalMint")
    if not mint:
        continue
    sym = canonical["symbol"]
    public = next((t for t in listed_tokens if t.get("symbol") == sym), None)
    if public is None:
        fail(f"{sym} canonical live token missing from public token list")

    slug = canonical["slug"]
    metadata_path = ROOT / f"launchpad.cryptoworldz.xyz/{slug}/token-metadata.json"
    if not metadata_path.is_file():
        fail(f"{sym} missing public metadata file {metadata_path.relative_to(ROOT)}")
    metadata = load(metadata_path)
    metadata_checks = {
        "name": canonical.get("name"),
        "symbol": sym,
        "address": mint,
        "decimals": canonical.get("decimals"),
        "chainId": canonical.get("chainId"),
    }
    for key, value in metadata_checks.items():
        if metadata.get(key) != value:
            fail(f"{sym} public metadata {key} mismatch: {metadata.get(key)!r} != {value!r}")

# Production deploy itself must run this validator before any upload.
deploy = DEPLOY_WORKFLOW.read_text(encoding="utf-8")
gate = "python scripts/validate_worldz_token_identity.py"
upload = "Deploy public WorldzLaunchPad to Hostinger"
if gate not in deploy:
    fail("production deployment does not invoke token identity validator")
if deploy.index(gate) > deploy.index(upload):
    fail("token identity validator runs after production upload step")

print("WORLDZ TOKEN IDENTITY PASS")
print("WLDZ = WORLDZ / AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U")
print("RVIV = REVIVE / DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R")
print("Every listed live token is checked against the canonical registry")
print("Public registry copy matches canonical source")
print("Production deployment is fail-closed behind this validator")
print("PNEX and MRCL remain non-live identity reservations")
