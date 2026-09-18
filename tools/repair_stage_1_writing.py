#!/usr/bin/env python3
"""Stage 1/3: writing, spacing and clean-button repair across every public page."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
DOMAINS = [d.strip() for d in (ROOT / 'DOMAINS.txt').read_text(encoding='utf-8').splitlines() if d.strip()]
assert len(DOMAINS) == 18 and len(set(DOMAINS)) == 18

def discover_pages():
    pages = []
    for domain in DOMAINS:
        site = ROOT / domain
        assert site.is_dir(), site
        for path in site.rglob('index.html'):
            low = path.as_posix().lower()
            if '/heroes/reagan-kauja/' in low or '/reagan-children/' in low:
                continue
            pages.append(path)
    pages = sorted(set(pages))
    assert len(pages) >= 146, len(pages)
    return pages

def url_for(path: Path) -> str:
    rel = path.relative_to(ROOT)
    host = rel.parts[0]
    parent = Path(*rel.parts[1:]).parent.as_posix()
    return f'https://{host}/' if parent == '.' else f'https://{host}/{parent.strip("/")}/'

PAGES = discover_pages()

REPLACEMENTS = {
    'Robin Hood Chain': 'Robinhood Chain',
    'Helping the People Who Help People': 'Helping the People who Help the People',
    'Helping the People who Help People': 'Helping the People who Help the People',
    'OPEN DONATION PAGE →': 'OPEN →',
    'OPEN DONATION PAGE': 'OPEN →',
}

changed = 0
separators = 0
for path in PAGES:
    url = url_for(path)
    text = path.read_text(encoding='utf-8')
    original = text

    for old, new in REPLACEMENTS.items():
        text = text.replace(old, new)

    spacing_rules = [
        (r'</a>\s*<a\b', '</a>\n<a'),
        (r'</strong>\s*<span\b', '</strong>\n<span'),
        (r'</span>\s*<b\b', '</span>\n<b'),
        (r'</b>\s*</a>', '</b>\n</a>'),
        (r'</div>\s*<div class="info-card"', '</div>\n<div class="info-card"'),
    ]
    for pattern, replacement in spacing_rules:
        text, n = re.subn(pattern, replacement, text, flags=re.I)
        separators += n

    if url == 'https://donateworldz.com/':
        assert 'Support must stay separated and understandable.' not in text
        assert 'Truth over pressure' not in text
        assert 'OPEN DONATION PAGE' not in text
        assert 'Donate to JayJayTeamDev' in text
        assert '/jayjay-support/' in text
        for href in (
            '/slice-of-hope-australia/',
            '/davis-family/',
            '/community-impact/',
            '/fresh-water-mission/',
            '/grow-food-mission/',
            '/jayjay-support/',
        ):
            assert f'href="{href}"' in text, href

    if text != original:
        path.write_text(text, encoding='utf-8')
        changed += 1

for path in PAGES:
    text = path.read_text(encoding='utf-8')
    url = url_for(path)
    assert 'Robin Hood Chain' not in text, url
    assert 'Helping the People Who Help People' not in text, url
    assert 'Helping the People who Help People' not in text, url

print(f'REPAIR_STAGE_1_WRITING=PASS pages={len(PAGES)} changed={changed} separators={separators} clean_buttons=1 mission_phrase=1 robinhood_name=1')
