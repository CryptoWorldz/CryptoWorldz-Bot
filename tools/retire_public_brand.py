#!/usr/bin/env python3
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_ROOTS = [
    "oneworldz.com",
    "impactbased.oneworldz.com",
    "law.oneworldz.com",
    "learn.oneworldz.com",
    "cryptoworldz.xyz",
    "launchpad.cryptoworldz.xyz",
    "donateworldz.com",
    "foodworldz.com",
    "purplediamondcrew.com",
    "solworldz.xyz",
    "ethworldz.xyz",
    "baseworldz.xyz",
    "bnbworldz.xyz",
    "xrpworldz.xyz",
    "suiworldz.xyz",
    "hyperworldz.xyz",
    "robinworldz.xyz",
    "hodlerworldz.xyz",
    "hodlergalaxy.xyz",
    "spam2ham.cryptoworldz.xyz",
    "public/hub-central",
]
TEXT_SUFFIXES = {".html", ".htm", ".css", ".js", ".json", ".txt", ".md", ".xml", ".svg", ".webmanifest"}
REPLACEMENTS = [
    ("https://impactbased.oneworldz.com", "https://launchpad.cryptoworldz.xyz"),
    ("http://impactbased.oneworldz.com", "https://launchpad.cryptoworldz.xyz"),
    ("https://law.oneworldz.com", "https://cryptoworldz.xyz"),
    ("http://law.oneworldz.com", "https://cryptoworldz.xyz"),
    ("https://learn.oneworldz.com", "https://cryptoworldz.xyz"),
    ("http://learn.oneworldz.com", "https://cryptoworldz.xyz"),
    ("https://www.oneworldz.com", "https://donateworldz.com"),
    ("http://www.oneworldz.com", "https://donateworldz.com"),
    ("https://oneworldz.com", "https://donateworldz.com"),
    ("http://oneworldz.com", "https://donateworldz.com"),
    ("OneWorldz", "WorldzEcosystem"),
    ("ONEWORLDZ", "WORLDZECOSYSTEM"),
    ("oneworldz.com", "donateworldz.com"),
]
FORBIDDEN_PUBLIC_LITERALS = ("OneWorldz", "ONEWORLDZ", "oneworldz.com")

def iter_files():
    seen = set()
    for rel in PUBLIC_ROOTS:
        root = ROOT / rel
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
                continue
            resolved = path.resolve()
            if resolved in seen:
                continue
            seen.add(resolved)
            yield path

def scrub(text):
    output = text
    for old, new in REPLACEMENTS:
        output = output.replace(old, new)
    return output

def apply():
    changed = []
    for path in iter_files():
        try:
            before = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        after = scrub(before)
        if after != before:
            path.write_text(after, encoding="utf-8")
            changed.append(path.relative_to(ROOT).as_posix())
    return changed

def violations():
    found = []
    for path in iter_files():
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for literal in FORBIDDEN_PUBLIC_LITERALS:
            if literal in text:
                found.append((path.relative_to(ROOT).as_posix(), literal))
    return found

def main():
    parser = argparse.ArgumentParser(description="Retire historical branding from deployable public Worldz surfaces.")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.apply:
        changed = apply()
        print(f"PUBLIC_BRAND_RETIREMENT_APPLY=PASS changed={len(changed)}")
    if args.check or not args.apply:
        bad = violations()
        if bad:
            for path, literal in bad[:100]:
                print(f"PUBLIC_BRAND_RETIREMENT_FAIL path={path} literal={literal}")
            raise SystemExit(f"PUBLIC_BRAND_RETIREMENT=FAIL count={len(bad)}")
        print("PUBLIC_BRAND_RETIREMENT=PASS retired_public_mentions=0")

if __name__ == "__main__":
    main()
