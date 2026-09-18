#!/usr/bin/env python3
"""Keep only public pages that perform a real job.

Mission departments are intentionally preserved:
ResearchWorldz, LawWorldz, FoodWorldz and DonateWorldz field missions.
Generic brochure routes and self-promotion routes are removed.
"""
from pathlib import Path
import re
import shutil
from html import escape

ROOT = Path(__file__).resolve().parents[1]
DOMAINS = [d.strip() for d in (ROOT / "DOMAINS.txt").read_text(encoding="utf-8").splitlines() if d.strip()]
assert len(DOMAINS) == 18 and len(set(DOMAINS)) == 18

KEEP = {d: {""} for d in DOMAINS}
KEEP["oneworldz.com"] |= {"community-support"}
KEEP["donateworldz.com"] |= {
    "slice-of-hope-australia",
    "davis-family",
    "community-impact",
    "fresh-water-mission",
    "grow-food-mission",
}
KEEP["foodworldz.com"] |= {
    "food-rescue",
    "food-safety",
    "storage-cold-chain",
    "food-preparation",
    "shipping-logistics",
    "food-waste",
    "growing-food",
    "food-law",
}
KEEP["law.oneworldz.com"] |= {
    "change-the-law",
    "public-money",
    "integrity",
    "model-laws",
    "civic-pathways",
    "research-handoff",
}
KEEP["learn.oneworldz.com"] |= {
    "country-research",
    "best-practice",
    "evidence-brief",
    "send-to-lawworldz",
}

def route_for(path: Path, host: str) -> str:
    rel = path.relative_to(ROOT / host).parent.as_posix()
    return "" if rel == "." else rel.strip("/")

def drop_section(text: str, needle: str) -> str:
    wanted = needle.lower()
    for match in re.finditer(r'<section\b[^>]*>[\s\S]*?</section>', text, re.I):
        if wanted in match.group(0).lower():
            return text[:match.start()] + text[match.end():]
    return text

retired = []
for host in DOMAINS:
    site = ROOT / host
    pages = sorted(site.rglob("index.html"), key=lambda p: len(p.relative_to(site).parts), reverse=True)
    for page in pages:
        if not page.exists():
            continue
        route = route_for(page, host)
        if route in KEEP[host]:
            continue
        retired.append((host, route))
        shutil.rmtree(page.parent)

# OneWorldz remains humanitarian/system-change only. Remove legacy showroom fragments if present.
one = ROOT / "oneworldz.com" / "index.html"
text = one.read_text(encoding="utf-8")
text = re.sub(r'<a\b[^>]*href=["\']#heroes["\'][^>]*>.*?</a>', "", text, flags=re.I|re.S)
text = drop_section(text, 'class="hero-list"')
text = drop_section(text, 'data-final-heroes="1"')
text = drop_section(text, "OneWorldz GPT System")
if 'href="/community-support/"' not in text:
    text = text.replace("</nav>", '<a href="/community-support/">Community Support</a></nav>', 1)
one.write_text(text, encoding="utf-8")

# CryptoWorldz keeps crypto material; generic brochure-only subroutes are still removed.
crypto = ROOT / "cryptoworldz.xyz" / "index.html"
text = crypto.read_text(encoding="utf-8")
text = drop_section(text, "The systems")
text = drop_section(text, "WorldzPad™ + $WLDZ")
crypto.write_text(text, encoding="utf-8")

for host in [
    "solworldz.xyz","ethworldz.xyz","baseworldz.xyz","bnbworldz.xyz","xrpworldz.xyz",
    "suiworldz.xyz","hyperworldz.xyz","robinworldz.xyz","hodlerworldz.xyz","hodlergalaxy.xyz"
]:
    p = ROOT / host / "index.html"
    text = p.read_text(encoding="utf-8")
    text = drop_section(text, 'href="/learn/"')
    p.write_text(text, encoding="utf-8")

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
assert len(urls) == 42, len(urls)
(ROOT / ".ecosystem-urls.txt").write_text("\n".join(urls) + "\n", encoding="utf-8")
(ROOT / ".retired-generated-routes.txt").write_text(
    "\n".join(f"{host}|{route}" for host, route in sorted(set(retired))) + "\n",
    encoding="utf-8",
)

# Hard mission gates.
one_text = one.read_text(encoding="utf-8").lower()
for forbidden in ("cryptoworldz", "hodlerworldz", "solworldz", "ethworldz", "baseworldz", "jayjayteamdev"):
    assert forbidden not in one_text, forbidden

donate = (ROOT / "donateworldz.com" / "index.html").read_text(encoding="utf-8").lower()
assert "fresh-water-mission" in donate and "grow-food-mission" in donate
assert "jayjayteamdev" not in donate and "jayjay-support" not in donate

food = (ROOT / "foodworldz.com" / "index.html").read_text(encoding="utf-8").lower()
for required in ("food rescue", "food safety", "cold chain", "shipping", "food waste", "food law"):
    assert required in food, required

law = (ROOT / "law.oneworldz.com" / "index.html").read_text(encoding="utf-8").lower()
for required in ("lawworldz", "public money", "integrity", "model laws"):
    assert required in law, required

research = (ROOT / "learn.oneworldz.com" / "index.html").read_text(encoding="utf-8").lower()
for required in ("researchworldz", "country research", "best practice", "send to lawworldz"):
    assert required in research, required

print(f"PRUNE_PUBLIC_BLOAT=PASS pages={len(urls)} roots=18 mission_pages=24 retired_routes={len(set(retired))} self_promo=0")
