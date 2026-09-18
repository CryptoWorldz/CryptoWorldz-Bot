#!/usr/bin/env python3
"""Install the canonical global image override on every ecosystem domain.

This runs LAST after all visual/build layers so legacy local CSS cannot win.
It copies identical CSS bytes to all 18 domains and injects exactly one
/global-image-overrides.css link as the final stylesheet in every HTML <head>.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
DOMAINS = [d.strip() for d in (ROOT / "DOMAINS.txt").read_text(encoding="utf-8").splitlines() if d.strip()]
SOURCE = ROOT / "shared" / "global-image-overrides.css"
LINK = '<link rel="stylesheet" href="/global-image-overrides.css">'

assert SOURCE.is_file(), SOURCE
assert len(DOMAINS) == 18 and len(set(DOMAINS)) == 18, (len(DOMAINS), len(set(DOMAINS)))

css = SOURCE.read_bytes()
assert len(css) > 1000

pages = []
changed = 0

for domain in DOMAINS:
    site = ROOT / domain
    assert site.is_dir(), site

    # Identical bytes on all 18 domains.
    target = site / "global-image-overrides.css"
    target.write_bytes(css)
    assert target.read_bytes() == css, domain

    for path in site.rglob("*.html"):
        text = path.read_text(encoding="utf-8")
        original = text

        assert "</head>" in text.lower(), path

        # Remove any prior copies so we can guarantee exactly one LAST stylesheet.
        text = re.sub(
            r'\s*<link\b[^>]*href=["\']/global-image-overrides\.css["\'][^>]*>\s*',
            "\n",
            text,
            flags=re.I,
        )

        # Inject immediately before </head>, after every existing stylesheet.
        text = re.sub(r"</head>", LINK + "\n</head>", text, count=1, flags=re.I)

        if text != original:
            path.write_text(text, encoding="utf-8")
            changed += 1
        pages.append(path)

assert pages, "no public HTML pages found"

# Final global contract:
# - every public page links exactly once
# - link is the last stylesheet before </head>
# - each domain has byte-identical stylesheet
for path in pages:
    text = path.read_text(encoding="utf-8")
    assert text.count('/global-image-overrides.css') == 1, path

    head = re.search(r"<head\b[^>]*>([\s\S]*?)</head>", text, re.I)
    assert head, path
    styles = re.findall(r'<link\b[^>]*rel=["\']stylesheet["\'][^>]*>', head.group(1), re.I)
    assert styles, path
    assert '/global-image-overrides.css' in styles[-1], (path, styles[-1])

for domain in DOMAINS:
    assert (ROOT / domain / "global-image-overrides.css").read_bytes() == css, domain

print(
    f"GLOBAL_IMAGE_OVERRIDE=PASS domains={len(DOMAINS)} "
    f"pages={len(pages)} changed_pages={changed} loaded_last=1 identical_css=1"
)
