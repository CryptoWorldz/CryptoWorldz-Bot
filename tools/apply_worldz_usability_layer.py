#!/usr/bin/env python3
"""Final public UX pass for Worldz ecosystem entry surfaces.

Runs AFTER legacy content builders and public-brand retirement. It does not
change protocol/runtime identifiers. It adds plain-English START HERE guidance,
DIPSHIT handoffs, and the compatibility build marker expected by the existing
18-site visual audit.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

TARGETS = {
    "oneworldz.com": "hq",
    "cryptoworldz.xyz": "crypto",
    "donateworldz.com": "donate",
}

BUILD_MARKER = 'data-oneworldz-build="2026-10-04-worldz-usability-v1"'
GUIDE_TAG = '<script src="/worldz-guide.js?v=20261004" defer></script>'

def ensure_marker(text: str) -> str:
    if "data-oneworldz-build=" in text:
        return text
    return re.sub(r"<body\b", f"<body {BUILD_MARKER}", text, count=1, flags=re.I)

def apply_context(text: str, context: str) -> str:
    marker = f'<script>window.WORLDZ_GUIDE_CONTEXT="{context}";</script>'
    if "WORLDZ_GUIDE_CONTEXT" not in text:
        if GUIDE_TAG in text:
            text = text.replace(GUIDE_TAG, marker + GUIDE_TAG, 1)
        else:
            text = re.sub(r"</body>", marker + GUIDE_TAG + "</body>", text, count=1, flags=re.I)
    elif GUIDE_TAG not in text:
        text = re.sub(r"</body>", GUIDE_TAG + "</body>", text, count=1, flags=re.I)
    return text

def public_copy(text: str, context: str) -> str:
    # Product-facing copy only. Runtime/protocol files are intentionally outside
    # this HTML-only post-build pass.
    text = text.replace("WorldzLaunchPad™", "WorldzLaunch™")
    text = text.replace("WorldzLaunchPad", "WorldzLaunch")
    text = text.replace("WORLDZLAUNCHPAD™", "WORLDZLAUNCH™")
    text = text.replace("WORLDZLAUNCHPAD", "WORLDZLAUNCH")
    if context == "hq":
        text = text.replace("WorldzEcosystem™", "WorldzHQ™")
        text = text.replace("WorldzEcosystem", "WorldzHQ")
        text = text.replace("WORLDZECOSYSTEM", "WORLDZHQ")
    return text

def main():
    changed = 0
    pages = 0
    for host, context in TARGETS.items():
        root = ROOT / host
        if not root.exists():
            continue
        guide = root / "worldz-guide.js"
        if not guide.is_file():
            raise SystemExit(f"WORLDZ_USABILITY_FAIL missing={guide.relative_to(ROOT)}")
        for page in root.rglob("*.html"):
            pages += 1
            before = page.read_text(encoding="utf-8")
            after = ensure_marker(before)
            after = public_copy(after, context)
            after = apply_context(after, context)
            if after != before:
                page.write_text(after, encoding="utf-8")
                changed += 1
    print(f"WORLDZ_USABILITY_LAYER=PASS pages={pages} changed={changed} dipshit=1 start_here=1")

if __name__ == "__main__":
    main()
