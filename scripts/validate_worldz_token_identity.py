#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "worldzpad-mainnet/token-identity/worldz-token-registry.v1.json"
PUBLIC_REGISTRY = ROOT / "launchpad.cryptoworldz.xyz/.well-known/worldz-tokens.json"
TOKENLIST = ROOT / "launchpad.cryptoworldz.xyz/tokenlist.json"
DEPLOY_WORKFLOW = ROOT / ".github/workflows/deploy-worldzlaunchpad.yml"

BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
BASE58_SET = set(BASE58)

def load(path):
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)

def fail(msg):
    raise SystemExit("WORLDZ TOKEN IDENTITY FAIL: " + msg)

def is_solana_pubkey(value):
    if not isinstance(value, str) or not (32 <= len(value) <= 44) or any(c not in BASE58_SET for c in value):
        return False
    n = 0
    for c in value:
        n = n * 58 + BASE58.index(c)
    raw = b"" if n == 0 else n.to_bytes((n.bit_length() + 7) // 8, "big")
    leading = len(value) - len(value.lstrip("1"))
    return len(b"\x00" * leading + raw) == 32

def assert_identity(source, canonical, label, mint_key="address"):
    checks = {
        "name": canonical["name"],
        "symbol": canonical["symbol"],
        mint_key: canonical["canonicalMint"],
        "decimals": canonical["decimals"],
    }
    for key, expected in checks.items():
        if source.get(key) != expected:
            fail(f"{label} {key} mismatch: {source.get(key)!r} != {expected!r}")

registry = load(REGISTRY)
public_registry = load(PUBLIC_REGISTRY)
if public_registry != registry:
    fail("public .well-known registry differs from canonical registry")

tokens = registry.get("tokens", [])
orders = [t.get("launchOrder") for t in tokens]
symbols = [t.get("symbol") for t in tokens]
if len(orders) != len(set(orders)):
    fail("duplicate launchOrder")
if len(symbols) != len(set(symbols)):
    fail("duplicate symbol")

by_symbol = {t["symbol"]: t for t in tokens}
live = []
seen_mints = set()

for t in tokens:
    lifecycle = t.get("lifecycle")
    if lifecycle not in {"LIVE", "PRELAUNCH", "PLANNED"}:
        fail(f"{t.get('symbol')} has unknown lifecycle {lifecycle!r}")
    mint = t.get("canonicalMint")
    if lifecycle in {"PRELAUNCH", "PLANNED"}:
        if mint is not None:
            fail(f"{t['symbol']} lifecycle {lifecycle} must keep canonicalMint null")
        if t.get("decimals") is not None:
            fail(f"{t['symbol']} lifecycle {lifecycle} must keep decimals null")
        continue
    if not mint:
        fail(f"{t['symbol']} LIVE token is missing canonicalMint")
    if t.get("chain") == "Solana" and not is_solana_pubkey(mint):
        fail(f"{t['symbol']} canonicalMint is not a valid 32-byte Solana public key")
    if mint in seen_mints:
        fail("duplicate canonical mint")
    seen_mints.add(mint)
    if not isinstance(t.get("decimals"), int):
        fail(f"{t['symbol']} LIVE token decimals must be integer")
    if not t.get("image"):
        fail(f"{t['symbol']} LIVE token missing canonical image")
    live.append(t)

expected = {
    "WLDZ": ("WORLDZ", "AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U", 6),
    "RVIV": ("REVIVE", "DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R", 6),
}
for sym, triple in expected.items():
    t = by_symbol.get(sym)
    if not t or (t.get("name"),t.get("canonicalMint"),t.get("decimals")) != triple:
        fail(f"{sym} canonical identity drift")

tokenlist = load(TOKENLIST)
listed = tokenlist.get("tokens", [])
if len({t.get("symbol") for t in listed}) != len(listed):
    fail("duplicate symbol in token list")
if len({t.get("address") for t in listed}) != len(listed):
    fail("duplicate mint in token list")

for public in listed:
    canonical=by_symbol.get(public.get("symbol"))
    if not canonical:
        fail(f"{public.get('symbol')} listed without registry record")
    if canonical.get("lifecycle")!="LIVE":
        fail(f"{public.get('symbol')} listed while lifecycle={canonical.get('lifecycle')}")
    assert_identity(public,canonical,f"{canonical['symbol']} tokenlist")
    if public.get("chainId") != canonical.get("chainId"):
        fail(f"{canonical['symbol']} tokenlist chainId mismatch")
    if public.get("logoURI") != canonical.get("image"):
        fail(f"{canonical['symbol']} tokenlist logoURI mismatch")

listed_symbols={t["symbol"] for t in listed}
for canonical in live:
    sym=canonical["symbol"]
    if sym not in listed_symbols:
        fail(f"{sym} LIVE token missing from token list")
    slug=canonical["slug"]

    metadata_path=ROOT/f"launchpad.cryptoworldz.xyz/{slug}/token-metadata.json"
    if not metadata_path.is_file():
        fail(f"{sym} missing public metadata")
    metadata=load(metadata_path)
    assert_identity(metadata,canonical,f"{sym} metadata")
    if metadata.get("chainId") != canonical.get("chainId"):
        fail(f"{sym} metadata chainId mismatch")
    if metadata.get("image") != canonical.get("image") or metadata.get("logoURI") != canonical.get("image"):
        fail(f"{sym} metadata image mismatch")

    pack_path=ROOT/f"launchpad.cryptoworldz.xyz/{slug}/platform-submission-pack.json"
    if not pack_path.is_file():
        fail(f"{sym} missing platform submission pack")
    pack=load(pack_path)
    ci=pack.get("canonicalIdentity") or {}
    assert_identity(ci,canonical,f"{sym} platform pack",mint_key="mint")
    if ci.get("image") != canonical.get("image"):
        fail(f"{sym} platform pack image mismatch")

# Parse actual workflow step blocks and require executable validator step before upload.
lines=DEPLOY_WORKFLOW.read_text(encoding="utf-8").splitlines()
starts=[i for i,line in enumerate(lines) if re.match(r"^\s{6}- (?:name:|uses:)",line)]
blocks=[]
for pos,start in enumerate(starts):
    end=starts[pos+1] if pos+1<len(starts) else len(lines)
    blocks.append((start,end,lines[start:end]))

def named_step(name):
    for start,end,block in blocks:
        if block and block[0].strip()==f"- name: {name}":
            return start,end,block
    return None

gate=named_step("Gate production on canonical Worldz token identity")
upload=named_step("Deploy public WorldzLaunchPad to Hostinger")
if gate is None or upload is None:
    fail("production identity gate or upload step missing")
if gate[0] >= upload[0]:
    fail("identity gate must run before Hostinger upload")
if not any(re.match(r"^\s{8}run:\s*python(?:3)?\s+scripts/validate_worldz_token_identity\.py\s*$",line) for line in gate[2]):
    fail("identity gate is not an executable validator run step")

print("WORLDZ TOKEN IDENTITY PASS")
print("LIVE: "+", ".join(f"{t['name']} ({t['symbol']})" for t in live))
print("Registry/public copy/token list/metadata/submission packs all agree")
print("Every PRELAUNCH/PLANNED record is fail-closed")
print("Production deploy has a verified executable pre-upload identity gate")
