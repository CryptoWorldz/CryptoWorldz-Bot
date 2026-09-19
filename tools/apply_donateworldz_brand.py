#!/usr/bin/env python3
"""Apply a reliable DonateWorldz identity after all page builders.

The previously restored raster "masterpiece" chunks are corrupt and can render
as empty panels. This pass deliberately uses a small browser-native SVG mark for
navigation/card identity and never substitutes unrelated campaign/hero artwork.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "donateworldz.com"
ASSET_DIR = SITE / "assets" / "brand" / "donateworldz"
ASSET_DIR.mkdir(parents=True, exist_ok=True)

MARK = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="DonateWorldz">
<defs>
  <linearGradient id="dw-ring" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#a855f7"/>
    <stop offset="0.55" stop-color="#38bdf8"/>
    <stop offset="1" stop-color="#ec4899"/>
  </linearGradient>
  <radialGradient id="dw-bg" cx="50%" cy="38%" r="70%">
    <stop offset="0" stop-color="#20103a"/>
    <stop offset="1" stop-color="#05030a"/>
  </radialGradient>
</defs>
<rect x="8" y="8" width="240" height="240" rx="54" fill="url(#dw-bg)" stroke="url(#dw-ring)" stroke-width="10"/>
<circle cx="128" cy="124" r="71" fill="none" stroke="url(#dw-ring)" stroke-width="8"/>
<path d="M57 124h142M128 53c-23 20-36 43-36 71s13 51 36 71M128 53c23 20 36 43 36 71s-13 51-36 71" fill="none" stroke="#74c8ff" stroke-width="6" stroke-linecap="round" opacity=".9"/>
<path d="M128 190c-8-10-47-38-47-68 0-19 13-32 30-32 10 0 18 5 23 13 5-8 13-13 23-13 17 0 30 13 30 32 0 30-39 58-59 68Z" fill="none" stroke="#ffffff" stroke-width="10" stroke-linejoin="round"/>
<circle cx="128" cy="124" r="5" fill="#ffffff"/>
</svg>"""

MARK_PATH = ASSET_DIR / "donateworldz-mark.svg"
MARK_PATH.write_text(MARK, encoding="utf-8")
(SITE / "site-icon.svg").write_text(MARK, encoding="utf-8")

MASTER_ABS = "https://donateworldz.com/assets/brand/donateworldz/donateworldz-mark.svg"
ICON_ABS = MASTER_ABS
CARD_ABS = MASTER_ABS

BRAND_CSS = """<style id="donateworldz-masterpiece-brand">
.donateworldz-brand-mark{display:inline-block!important;width:28px!important;height:28px!important;max-width:28px!important;min-width:28px!important;object-fit:contain!important;vertical-align:middle!important;margin:0 7px 0 0!important;border-radius:8px!important;background:transparent!important}
.nav .donateworldz-brand-mark{width:24px!important;height:24px!important;max-width:24px!important;min-width:24px!important;margin-right:6px!important}
.card .donateworldz-brand-mark,.world-card .donateworldz-brand-mark,.path-card .donateworldz-brand-mark,.route-card .donateworldz-brand-mark,.directory-card .donateworldz-brand-mark{display:inline-block!important;width:42px!important;height:42px!important;max-width:42px!important;min-width:42px!important;margin:0 8px 8px 0!important;aspect-ratio:1/1!important}
</style>"""

domains = [x.strip() for x in (ROOT / "DOMAINS.txt").read_text(encoding="utf-8").splitlines() if x.strip()]
changed = 0
injected = 0
anchor_re = re.compile(r'(<a\\b(?P<attrs>[^>]*)>)(?P<body>[\\s\\S]*?)(</a>)', re.I)

def normalize_existing_brand_marks(text: str) -> str:
    def repl(m):
        tag = m.group(0)
        if "donateworldz-brand-mark" not in tag.lower():
            return tag
        if re.search(r'\\bsrc\\s*=\\s*["\\'][^"\\']*["\\']', tag, re.I):
            return re.sub(r'\\bsrc\\s*=\\s*["\\'][^"\\']*["\\']', f'src="{ICON_ABS}"', tag, count=1, flags=re.I)
        return tag[:-1] + f' src="{ICON_ABS}">'
    return re.sub(r'<img\\b[^>]*>', repl, text, flags=re.I)

def inject_anchor_icons(text: str, host: str) -> str:
    global injected
    def repl(m):
        global injected
        opening, attrs, body, closing = m.group(1), m.group("attrs"), m.group("body"), m.group(4)
        plain = re.sub(r"<[^>]+>", "", body)
        if "donateworldz" not in plain.lower() or "donateworldz-brand-mark" in body.lower():
            return m.group(0)
        href_match = re.search(r'href\\s*=\\s*["\\']([^"\\']+)["\\']', attrs, re.I)
        href = href_match.group(1) if href_match else ""
        is_target = "donateworldz.com" in href.lower() or (host == "donateworldz.com" and href.startswith("/")) or href == "/"
        if not is_target:
            return m.group(0)
        mark = f'<img class="donateworldz-brand-mark" src="{ICON_ABS}" alt="" aria-hidden="true" loading="lazy" decoding="async">'
        injected += 1
        return opening + mark + body + closing
    return anchor_re.sub(repl, text)

for host in domains:
    site = ROOT / host
    if not site.is_dir():
        continue
    for page in site.rglob("*.html"):
        text = page.read_text(encoding="utf-8")
        if "donateworldz" not in text.lower():
            continue
        original = text
        text = normalize_existing_brand_marks(text)
        text = inject_anchor_icons(text, host)

        if 'id="donateworldz-masterpiece-brand"' not in text and "</head>" in text:
            text = text.replace("</head>", BRAND_CSS + "\n</head>", 1)

        # Keep campaign/page imagery untouched. Only the small identity mark is global.
        if host == "donateworldz.com" and "slice-of-hope-australia" not in str(page).lower():
            if re.search(r'<meta\\s+property=["\\']og:image["\\'][^>]*>', text, re.I):
                text = re.sub(r'<meta\\s+property=["\\']og:image["\\'][^>]*>', f'<meta property="og:image" content="{MASTER_ABS}">', text, count=1, flags=re.I)
            elif "</head>" in text:
                text = text.replace("</head>", f'<meta property="og:image" content="{MASTER_ABS}"><meta name="twitter:image" content="{MASTER_ABS}">\n</head>', 1)
            text = re.sub(r'<meta\\s+name=["\\']twitter:image["\\'][^>]*>', f'<meta name="twitter:image" content="{MASTER_ABS}">', text, count=1, flags=re.I)

        if host == "donateworldz.com" and "<body" in text and 'data-donateworldz-brand=' not in text:
            text = text.replace("<body", '<body data-donateworldz-brand="masterpiece-v1"', 1)

        if text != original:
            page.write_text(text, encoding="utf-8")
            changed += 1

home = (SITE / "index.html").read_text(encoding="utf-8")
assert 'data-donateworldz-brand="masterpiece-v1"' in home
assert MASTER_ABS in home
assert MARK_PATH.is_file() and MARK_PATH.stat().st_size > 500
assert (SITE / "site-icon.svg").read_text(encoding="utf-8").startswith("<svg")
assert "donateworldz-master.webp" not in home
assert "icon-256.webp" not in home
print(f"DONATEWORLDZ_BRAND=PASS source=browser-native-svg bytes={MARK_PATH.stat().st_size} html_changed={changed} inline_mentions={injected} giant_blank_asset=0")
