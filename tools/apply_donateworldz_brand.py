#!/usr/bin/env python3
"""Apply the locked DonateWorldz masterpiece anywhere the DonateWorldz brand is shown.

Source: restored approved DonateWorldz visual chunks from repository history.
This pass runs LAST after page builders so generic initial-letter/site-icon artwork
cannot return during a rebuild.
"""
from pathlib import Path
import base64
import io
import re
from PIL import Image
import pillow_avif  # registers AVIF decoding with Pillow

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

# The approved source is one continuous base64 AVIF stream split across files.
# The original Node materializer tolerated a dangling final base64 character;
# mirror that behavior without changing any decoded image bytes.
joined = "".join(parts)
if len(joined) % 4 == 1:
    joined = joined[:-1]
if len(joined) % 4:
    joined += "=" * (4 - (len(joined) % 4))
master = base64.b64decode(joined, validate=False)
assert is_avif(master), "DonateWorldz approved master does not materialize to AVIF"

# Decode the restored master for real. The restored AVIF chunks are known to have
# passed only a header check in earlier builds; if their payload is damaged, use the
# previously committed approved DonateWorldz profile artwork rather than deploying
# a blank image.
fallback_source = ROOT / "assets-source" / "davis-family" / "donateworldz-profile.jpg"
source_kind = "restored-avif"
try:
    with Image.open(io.BytesIO(master)) as source_image:
        source_image.load()
        mode = "RGBA" if "A" in source_image.getbands() else "RGB"
        approved = source_image.convert(mode)
except Exception:
    assert fallback_source.is_file() and fallback_source.stat().st_size > 2000, fallback_source
    with Image.open(fallback_source) as source_image:
        source_image.load()
        mode = "RGBA" if "A" in source_image.getbands() else "RGB"
        approved = source_image.convert(mode)
    source_kind = "approved-repository-jpeg"


def render_webp(name: str, max_px: int | None = None) -> Path:
    image = approved.copy()
    if max_px is not None:
        image.thumbnail((max_px, max_px), Image.Resampling.LANCZOS)
    target = ASSET_DIR / name
    image.save(target, format="WEBP", lossless=True, method=6)
    with Image.open(target) as check:
        check.load()
        assert check.width > 0 and check.height > 0, name
    return target


# Browser-safe files. The master preserves the approved source pixels; smaller
# derivatives are genuine resized images, not the same bytes under different names.
master_path = render_webp("donateworldz-master.webp")
render_webp("hero-1024.webp", 1024)
card_path = render_webp("card-768.webp", 768)
render_webp("thumb-512.webp", 512)
icon_path = render_webp("icon-256.webp", 256)

icon_b64 = base64.b64encode(icon_path.read_bytes()).decode("ascii")
site_icon = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="DonateWorldz">
<image href="data:image/webp;base64,{icon_b64}" x="0" y="0" width="256" height="256" preserveAspectRatio="xMidYMid meet"/>
</svg>'''
(SITE / "site-icon.svg").write_text(site_icon, encoding="utf-8")

MASTER_ABS = "https://donateworldz.com/assets/brand/donateworldz/donateworldz-master.webp"
ICON_ABS = "https://donateworldz.com/assets/brand/donateworldz/icon-256.webp"
CARD_ABS = "https://donateworldz.com/assets/brand/donateworldz/card-768.webp"

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
                cm = re.search(r"class\s*=\s*[\"']([^\"']*)[\"']", tag, re.I)
                if cm:
                    current = cm.group(1)
                    tag = tag[:cm.start()] + f'class="{current} donateworldz-brand-mark"' + tag[cm.end():]
                else:
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
assert (ASSET_DIR / "donateworldz-master.webp").is_file()
assert (ASSET_DIR / "donateworldz-master.webp").stat().st_size > 2000

print(f"DONATEWORLDZ_BRAND=PASS source={source_kind} source_bytes={len(master)} webp_bytes={master_path.stat().st_size} html_changed={changed} inline_mentions={injected} site_icon=webp og_image=webp")
