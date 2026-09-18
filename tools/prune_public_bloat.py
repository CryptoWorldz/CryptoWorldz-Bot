#!/usr/bin/env python3
"""Remove public-page bloat and keep only pages that perform a real job."""
from pathlib import Path
import re
import shutil
from html import escape

ROOT = Path(__file__).resolve().parents[1]
DOMAINS = [d.strip() for d in (ROOT / "DOMAINS.txt").read_text(encoding="utf-8").splitlines() if d.strip()]
assert len(DOMAINS) == 18 and len(set(DOMAINS)) == 18

# 18 useful front doors + 5 pages that perform a specific support/community job.
KEEP = {d: {""} for d in DOMAINS}
KEEP["oneworldz.com"] |= {"community-support"}
KEEP["donateworldz.com"] |= {
    "slice-of-hope-australia",
    "davis-family",
    "community-impact",
    "jayjay-support",
}

def route_for(path: Path, host: str) -> str:
    rel = path.relative_to(ROOT / host).parent.as_posix()
    return "" if rel == "." else rel.strip("/")

def drop_section(text: str, needle: str) -> str:
    """Remove only the first complete section containing needle."""
    wanted = needle.lower()
    for match in re.finditer(r'<section\b[^>]*>[\s\S]*?</section>', text, re.I):
        if wanted in match.group(0).lower():
            return text[:match.start()] + text[match.end():]
    return text

retired = []
for host in DOMAINS:
    site = ROOT / host
    # Delete deepest routes first. Removing /heroes/ before /heroes/person/
    # would otherwise erase child paths that are still in the discovered list.
    pages = sorted(
        site.rglob("index.html"),
        key=lambda p: len(p.relative_to(site).parts),
        reverse=True,
    )
    for page in pages:
        if not page.exists():
            continue
        route = route_for(page, host)
        if route in KEEP[host]:
            continue
        retired.append((host, route))
        shutil.rmtree(page.parent)

# OneWorldz: remove the repeated hero showroom and the dead GPT/directory promo.
one = ROOT / "oneworldz.com" / "index.html"
text = one.read_text(encoding="utf-8")
text = re.sub(r'<a\b[^>]*href=["\']#heroes["\'][^>]*>.*?</a>', "", text, flags=re.I|re.S)
text = drop_section(text, 'class="hero-list"')
text = drop_section(text, 'data-final-heroes="1"')
text = drop_section(text, "OneWorldz GPT System")
if 'href="/community-support/"' not in text:
    text = text.replace("</nav>", '<a href="/community-support/">Community Support</a></nav>', 1)
one.write_text(text, encoding="utf-8")

# CryptoWorldz: keep the front door, Worldz links and real Command Centre doorway.
# Remove brochure-only blocks whose buttons only created more pages.
crypto = ROOT / "cryptoworldz.xyz" / "index.html"
text = crypto.read_text(encoding="utf-8")
text = drop_section(text, "The systems")
text = drop_section(text, "WorldzPad™ + $WLDZ")
crypto.write_text(text, encoding="utf-8")

# Chain roots: remove Learn / Community / Builders brochure cards.
for host in [
    "solworldz.xyz","ethworldz.xyz","baseworldz.xyz","bnbworldz.xyz","xrpworldz.xyz",
    "suiworldz.xyz","hyperworldz.xyz","robinworldz.xyz","hodlerworldz.xyz","hodlergalaxy.xyz"
]:
    p = ROOT / host / "index.html"
    text = p.read_text(encoding="utf-8")
    text = drop_section(text, 'href="/learn/"')
    p.write_text(text, encoding="utf-8")

# PDC legacy information already lives on the home page.
pdc = ROOT / "purplediamondcrew.com" / "index.html"
text = pdc.read_text(encoding="utf-8")
text = text.replace('href="/legacy/"', 'href="#legacy"')
if 'id="legacy"' not in text:
    text = text.replace(
        '<section class="section"><p class="eyebrow">Hope Chest</p>',
        '<section class="section" id="legacy"><p class="eyebrow">Hope Chest</p>',
        1,
    )
pdc.write_text(text, encoding="utf-8")

# Rebuild sitemaps and deployment manifest from the lean set only.
urls = []
for host in DOMAINS:
    site = ROOT / host
    host_urls = []
    for page in sorted(site.rglob("index.html")):
        route = route_for(page, host)
        if route not in KEEP[host]:
            continue
        url = f"https://{host}/" if not route else f"https://{host}/{route}/"
        host_urls.append(url)
        urls.append(url)
    xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    xml += [f"  <url><loc>{escape(u)}</loc></url>" for u in host_urls]
    xml.append("</urlset>")
    (site / "sitemap.xml").write_text("\n".join(xml) + "\n", encoding="utf-8")

urls = sorted(set(urls))
assert len(urls) == 23, len(urls)
(ROOT / ".ecosystem-urls.txt").write_text("\n".join(urls) + "\n", encoding="utf-8")
(ROOT / ".retired-generated-routes.txt").write_text(
    "\n".join(f"{host}|{route}" for host, route in sorted(set(retired))) + "\n",
    encoding="utf-8",
)

# Hard gates against the exact bloat shown in the screenshots.
one_text = one.read_text(encoding="utf-8")
for forbidden in (
    "data-final-heroes=",
    'class="hero-list"',
    "OneWorldz GPT System",
    'href="/gpt/"',
    'href="/directory/"',
    'href="/heroes/',
):
    assert forbidden not in one_text, forbidden
assert 'href="/community-support/"' in one_text

crypto_text = crypto.read_text(encoding="utf-8")
for forbidden in (
    "The systems",
    "WorldzPad™ + $WLDZ",
    'href="/zed/"',
    'href="/auto/"',
    'href="/grace/"',
    'href="/worldzpad/"',
    'href="/wldz/"',
):
    assert forbidden not in crypto_text, forbidden

required = {
    "https://oneworldz.com/",
    "https://oneworldz.com/community-support/",
    "https://donateworldz.com/",
    "https://donateworldz.com/slice-of-hope-australia/",
    "https://donateworldz.com/davis-family/",
    "https://donateworldz.com/community-impact/",
    "https://donateworldz.com/jayjay-support/",
    "https://cryptoworldz.xyz/",
}
assert required.issubset(set(urls)), sorted(required - set(urls))

print(
    f"PRUNE_PUBLIC_BLOAT=PASS pages={len(urls)} "
    f"retired_routes={len(set(retired))} roots=18 utility_pages=5 "
    "hero_showroom=0 brochure_pages=0"
)
