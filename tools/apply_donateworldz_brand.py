#!/usr/bin/env python3
"""Apply the locked DonateWorldz masterpiece anywhere the DonateWorldz brand is shown.

Source: restored approved DonateWorldz visual chunks from repository history.
This pass runs LAST after page builders so generic initial-letter/site-icon artwork
cannot return during a rebuild.
"""
from pathlib import Path
import base64
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tools" / "assets" / "donateworldz"
SITE = ROOT / "donateworldz.com"
ASSET_DIR = SITE / "assets" / "brand" / "donateworldz"
ASSET_DIR.mkdir(parents=True, exist_ok=True)

parts = []
for p in sorted(SOURCE.glob("master.part*.b64")):
    parts.append("".join(p.read_text(encoding="utf-8").split()))
assert len(parts) == 4, f"expected 4 approved DonateWorldz master parts, got {len(parts)}"

def is_avif(b: bytes) -> bool:
    return len(b) > 16 and b[4:8] == b"ftyp" and b[8:12] == b"avif"

# Historical source supported both a continuous base64 stream and separately
# encoded binary segments. Preserve that compatibility.
try:
    master = base64.b64decode("".join(parts), validate=False)
except Exception:
    master = b""
if not is_avif(master):
    master = b"".join(base64.b64decode(x, validate=False) for x in parts)
assert is_avif(master), "DonateWorldz approved master does not materialize to AVIF"

# One exact approved visual, exposed through semantic paths for different UI roles.
for name in (
    "donateworldz-master.avif",
    "hero-1024.avif",
    "card-768.avif",
    "thumb-512.avif",
    "icon-256.avif",
):
    (ASSET_DIR / name).write_bytes(master)

master_b64 = base64.b64encode(master).decode("ascii")
site_icon = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="DonateWorldz">
<image href="data:image/avif;base64,{master_b64}" x="0" y="0" width="1024" height="1024" preserveAspectRatio="xMidYMid meet"/>
</svg>'''
(SITE / "site-icon.svg").write_text(site_icon, encoding="utf-8")

MASTER_ABS = "https://donateworldz.com/assets/brand/donateworldz/donateworldz-master.avif"
ICON_ABS = "https://donateworldz.com/assets/brand/donateworldz/icon-256.avif"
CARD_ABS = "https://donateworldz.com/assets/brand/donateworldz/card-768.avif"

BRAND_CSS = """<style id="donateworldz-masterpiece-brand">
.donateworldz-brand-mark{display:inline-block;width:32px;height:32px;object-fit:contain;vertical-align:middle;margin-right:8px;border-radius:10px}
.nav .donateworldz-brand-mark{width:28px;height:28px;margin-right:7px}
.card .donateworldz-brand-mark,.world-card .donateworldz-brand-mark,.path-card .donateworldz-brand-mark,.route-card .donateworldz-brand-mark,.directory-card .donateworldz-brand-mark{display:block;width:min(100%,260px);height:auto;aspect-ratio:1/1;object-fit:contain;margin:0 auto 12px;border-radius:18px}
@media(max-width:720px){.donateworldz-brand-mark{width:28px;height:28px}.card .donateworldz-brand-mark,.world-card .donateworldz-brand-mark,.path-card .donateworldz-brand-mark,.route-card .donateworldz-brand-mark,.directory-card .donateworldz-brand-mark{width:min(100%,220px);height:auto}}
</style>"""

domains = [x.strip() for x in (ROOT / "DOMAINS.txt").read_text(encoding="utf-8").splitlines() if x.strip()]
changed = 0
injected = 0

anchor_re = re.compile(r'(<a\b(?P<attrs>[^>]*)>)(?P<body>[\s\S]*?)(</a>)', re.I)

def inject_anchor_icons(text: str, host: str) -> str:
    global injected
    def repl(m):
        global injected
        opening = m.group(1)
        attrs = m.group("attrs")
        body = m.group("body")
        plain = re.sub(r"<[^>]+>", "", body)
        if "donateworldz" not in plain.lower():
            return m.group(0)
        href_match = re.search(r'href\s*=\s*["\']([^"\']+)["\']', attrs, re.I)
        href = href_match.group(1) if href_match else ""
        is_target = "donateworldz.com" in href.lower() or (host == "donateworldz.com" and href.startswith("/")) or href == "/"
        if not is_target or "donateworldz-brand-mark" in body:
            return m.group(0)
        src = CARD_ABS if any(k in attrs.lower() for k in ("card","tile","world","route","directory","path")) else ICON_ABS
        mark = f'<img class="donateworldz-brand-mark" src="{src}" alt="DonateWorldz" loading="lazy" decoding="async">'
        injected += 1
        return opening + mark + body + m.group(4)
    return anchor_re.sub(repl, text)

def replace_donateworldz_imgs(text: str, host: str) -> str:
    def repl(m):
        tag = m.group(0)
        low = tag.lower()
        if "donateworldz" in low:
            src = MASTER_ABS if host == "donateworldz.com" else ICON_ABS
            if re.search(r'\bsrc\s*=\s*["\'][^"\']*["\']', tag, re.I):
                tag = re.sub(r'\bsrc\s*=\s*["\'][^"\']*["\']', f'src="{src}"', tag, count=1, flags=re.I)
            else:
                tag = tag[:-1] + f' src="{src}">'
            if "donateworldz-brand-mark" not in tag:
                tag = tag.replace("<img", '<img class="donateworldz-brand-mark"', 1)
            return tag
        return tag
    text = re.sub(r'<img\b[^>]*>', repl, text, flags=re.I)
    text = text.replace("https://donateworldz.com/site-icon.svg", ICON_ABS)
    return text

for host in domains:
    site = ROOT / host
    if not site.is_dir():
        continue
    for page in site.rglob("*.html"):
        text = page.read_text(encoding="utf-8")
        if "donateworldz" not in text.lower():
            continue
        original = text
        text = replace_donateworldz_imgs(text, host)
        text = inject_anchor_icons(text, host)

        if 'id="donateworldz-masterpiece-brand"' not in text and "</head>" in text:
            text = text.replace("</head>", BRAND_CSS + "\n</head>", 1)

        # Root DonateWorldz page and generic DonateWorldz pages use the new masterpiece
        # for social previews. Preserve explicitly campaign-specific Slice of Hope art.
        if host == "donateworldz.com" and "slice-of-hope-australia" not in str(page).lower():
            if re.search(r'<meta\s+property=["\']og:image["\'][^>]*>', text, re.I):
                text = re.sub(r'<meta\s+property=["\']og:image["\'][^>]*>', f'<meta property="og:image" content="{MASTER_ABS}">', text, count=1, flags=re.I)
            elif "</head>" in text:
                text = text.replace("</head>", f'<meta property="og:image" content="{MASTER_ABS}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{MASTER_ABS}">\n</head>', 1)
            text = re.sub(r'<meta\s+name=["\']twitter:image["\'][^>]*>', f'<meta name="twitter:image" content="{MASTER_ABS}">', text, count=1, flags=re.I)

        if host == "donateworldz.com" and "<body" in text and 'data-donateworldz-brand=' not in text:
            text = text.replace("<body", '<body data-donateworldz-brand="masterpiece-v1"', 1)

        if text != original:
            page.write_text(text, encoding="utf-8")
            changed += 1

# Hard proof against the generic D-circle returning on DonateWorldz home.
home = (SITE / "index.html").read_text(encoding="utf-8")
assert "data-donateworldz-brand=\"masterpiece-v1\"" in home
assert MASTER_ABS in home or ICON_ABS in home
assert (SITE / "site-icon.svg").is_file()
assert (ASSET_DIR / "donateworldz-master.avif").is_file()
assert (ASSET_DIR / "donateworldz-master.avif").stat().st_size > 2000

print(f"DONATEWORLDZ_BRAND=PASS bytes={len(master)} html_changed={changed} inline_mentions={injected} site_icon=masterpiece og_image=masterpiece")
