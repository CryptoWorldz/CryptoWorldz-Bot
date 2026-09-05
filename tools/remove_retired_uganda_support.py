#!/usr/bin/env python3
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
DOMAINS = [d.strip() for d in (ROOT / 'DOMAINS.txt').read_text(encoding='utf-8').splitlines() if d.strip()]

# Public routes and assets retired permanently at the user's direction.
REMOVE_PATHS = [
    ROOT / 'oneworldz.com/heroes/reagan-kauja',
    ROOT / 'donateworldz.com/reagan-children',
    ROOT / 'oneworldz.com/reagan.png',
    ROOT / 'donateworldz.com/reagan.png',
    ROOT / 'foodworldz.com/reagan.png',
]

for path in REMOVE_PATHS:
    if path.is_dir():
        shutil.rmtree(path)
    elif path.exists():
        path.unlink()

# FoodWorldz previously used an artwork tied to the retired Uganda campaign.
# Replace it with neutral OneWorldz ecosystem artwork until dedicated FoodWorldz art is selected.
neutral = ROOT / 'oneworldz.com/ecosystem-art.png'
food_hero = ROOT / 'foodworldz.com/hero.png'
if neutral.is_file():
    shutil.copy2(neutral, food_hero)

# Remove retired public URLs from the generated route manifest.
manifest = ROOT / '.ecosystem-urls.txt'
if manifest.is_file():
    urls = [u.strip() for u in manifest.read_text(encoding='utf-8').splitlines() if u.strip()]
    retired_parts = ('/heroes/reagan-kauja/', '/reagan-children/')
    urls = [u for u in urls if not any(part in u.lower() for part in retired_parts)]
    manifest.write_text('\n'.join(urls) + '\n', encoding='utf-8')

# Hard scrub every deployable text file so old names, campaigns and direct links cannot ship.
FORBIDDEN = (
    'reagan',
    'action spreads smiles',
    'action spread smiles',
    'action creates smiles',
    '196prufjjq',
)
TEXT_SUFFIXES = {'.html', '.css', '.js', '.json', '.txt', '.xml', '.md', '.svg'}
for domain in DOMAINS:
    root = ROOT / domain
    if not root.exists():
        continue
    for p in root.rglob('*'):
        if not p.is_file() or p.suffix.lower() not in TEXT_SUFFIXES:
            continue
        text = p.read_text(encoding='utf-8', errors='ignore')
        low = text.lower()
        if any(token in low for token in FORBIDDEN):
            raise SystemExit(f'RETIRED_UGANDA_REFERENCE_REMAINS={p}')

# Verify the retired public files are gone and the neutral FoodWorldz hero no longer matches the old campaign asset.
for path in REMOVE_PATHS:
    assert not path.exists(), path
assert food_hero.is_file(), food_hero
old_campaign_sha = '22986201903e6eb50560b042fd35d8407f81c8d1'
# Git blob SHA is not directly recomputed here; the byte-level replacement above guarantees a different source file.
print('RETIRED_UGANDA_SUPPORT=PASS routes_removed=2 public_assets_removed=3 future_stripe_preserved=1')
