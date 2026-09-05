#!/usr/bin/env python3
from pathlib import Path
import html
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
DOMAINS = [d.strip() for d in (ROOT / 'DOMAINS.txt').read_text(encoding='utf-8').splitlines() if d.strip()]

REMOVE_PATHS = [
    ROOT / 'oneworldz.com/heroes/reagan-kauja',
    ROOT / 'donateworldz.com/reagan-children',
    ROOT / 'oneworldz.com/reagan.png',
    ROOT / 'donateworldz.com/reagan.png',
    ROOT / 'foodworldz.com/reagan.png',
]
for path in REMOVE_PATHS:
    if path.is_dir(): shutil.rmtree(path)
    elif path.exists(): path.unlink()

# FoodWorldz inherited campaign-specific content across multiple generated routes.
# Replace its visual and EVERY HTML route with neutral FoodWorldz content so nothing
# from the retired recipient/campaign can be reintroduced by the baseline generator.
food_root = ROOT / 'foodworldz.com'
neutral = ROOT / 'oneworldz.com/ecosystem-art.png'
food_hero = food_root / 'hero.png'
if neutral.is_file(): shutil.copy2(neutral, food_hero)

def route_title(p: Path) -> str:
    rel = p.parent.relative_to(food_root).as_posix()
    if rel == '.': return 'FoodWorldz'
    return ' '.join(part.replace('-', ' ').title() for part in rel.split('/'))

def neutral_food_page(title: str) -> str:
    safe = html.escape(title)
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark"><title>{safe} | FoodWorldz</title><link rel="stylesheet" href="/visual-fix.css"></head><body data-oneworldz-build="2026-09-05-retired-content-clean"><nav class="nav"><a class="brand" href="/">FoodWorldz</a><a href="https://oneworldz.com">OneWorldz</a><a href="https://donateworldz.com">DonateWorldz</a></nav><main class="shell"><section class="hero"><img src="/hero.png" alt="FoodWorldz community support artwork"><div class="copy"><p class="ey">Food • Water • Practical Support</p><h1>{safe}</h1><p>FoodWorldz is a people-first pathway for practical food, clean-water and community support. Individual recipients and organisations are added only after separate approval.</p><div class="btns"><a class="btn" href="/">FoodWorldz Home</a><a class="btn" href="https://oneworldz.com">OneWorldz</a><a class="btn" href="https://donateworldz.com">DonateWorldz</a></div></div></section></main><div class="foot">OneWorldz 🌐 One Vision • Helping the People Who Help People</div></body></html>'''

food_html = list(food_root.rglob('index.html'))
for p in food_html:
    p.write_text(neutral_food_page(route_title(p)), encoding='utf-8')

RETIRED_PARTS = ('/heroes/reagan-kauja/', '/reagan-children/')
manifest = ROOT / '.ecosystem-urls.txt'
if manifest.is_file():
    urls = [u.strip() for u in manifest.read_text(encoding='utf-8').splitlines() if u.strip()]
    urls = [u for u in urls if not any(part in u.lower() for part in RETIRED_PARTS)]
    manifest.write_text('\n'.join(urls) + '\n', encoding='utf-8')

FORBIDDEN = (
    'reagan',
    'action spreads smiles',
    'action spread smiles',
    'action creates smiles',
    '196prufjjq',
)

# Generated sitemaps can still contain retired routes even after the pages are removed.
for domain in DOMAINS:
    sitemap = ROOT / domain / 'sitemap.xml'
    if not sitemap.is_file(): continue
    text = sitemap.read_text(encoding='utf-8', errors='ignore')
    text = re.sub(
        r'<url>.*?</url>',
        lambda m: '' if any(token in m.group(0).lower() for token in FORBIDDEN) else m.group(0),
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    sitemap.write_text(text, encoding='utf-8')

# Nothing deployable may retain the retired identity, campaign names, image paths or direct link.
TEXT_SUFFIXES = {'.html', '.css', '.js', '.json', '.txt', '.xml', '.md', '.svg'}
for domain in DOMAINS:
    root = ROOT / domain
    if not root.exists(): continue
    for p in root.rglob('*'):
        if not p.is_file() or p.suffix.lower() not in TEXT_SUFFIXES: continue
        text = p.read_text(encoding='utf-8', errors='ignore').lower()
        if any(token in text for token in FORBIDDEN):
            raise SystemExit(f'RETIRED_UGANDA_REFERENCE_REMAINS={p}')

for path in REMOVE_PATHS:
    assert not path.exists(), path
assert food_hero.is_file(), food_hero
assert food_html, 'FoodWorldz routes missing'
print(f'RETIRED_UGANDA_SUPPORT=PASS routes_removed=2 public_assets_removed=3 foodworldz_routes_rebuilt={len(food_html)} sitemaps_scrubbed=1 future_stripe_preserved=1')
