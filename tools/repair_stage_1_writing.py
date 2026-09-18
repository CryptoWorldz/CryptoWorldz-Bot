#!/usr/bin/env python3
"""Stage 1/3: final writing, spacing and clean-button repair across all 146 public pages."""
from pathlib import Path
from urllib.parse import urlparse
import re

ROOT = Path(__file__).resolve().parents[1]
URLS = [u.strip() for u in (ROOT / '.ecosystem-urls.txt').read_text(encoding='utf-8').splitlines() if u.strip()]
assert len(URLS) == 146 and len(set(URLS)) == 146, (len(URLS), len(set(URLS)))

REPLACEMENTS = {
    'Robin Hood Chain': 'Robinhood Chain',
    'Helping the People Who Help People': 'Helping the People who Help the People',
    'Helping the People who Help People': 'Helping the People who Help the People',
    'OPEN DONATION PAGE →': 'OPEN →',
    'OPEN DONATION PAGE': 'OPEN →',
}

def page_path(url: str) -> Path:
    p = urlparse(url)
    rel = p.path.strip('/')
    return ROOT / p.netloc / rel / 'index.html' if rel else ROOT / p.netloc / 'index.html'

changed = 0
separators = 0
for url in URLS:
    path = page_path(url)
    assert path.is_file(), (url, path)
    text = path.read_text(encoding='utf-8')
    original = text

    for old, new in REPLACEMENTS.items():
        text = text.replace(old, new)

    # Preserve clean visual cards/buttons and also keep readable whitespace in
    # text extraction, previews and accessibility tooling.
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

    # Do not allow the retired cramped DonateWorldz wording to return.
    if url == 'https://donateworldz.com/':
        assert 'Support must stay separated and understandable.' not in text
        assert 'Truth over pressure' not in text
        assert 'OPEN DONATION PAGE' not in text
        for href in (
            '/slice-of-hope-australia/',
            '/davis-family/',
            '/community-impact/',
            '/jayjay-support/',
        ):
            assert f'href="{href}"' in text, href

    if text != original:
        path.write_text(text, encoding='utf-8')
        changed += 1

# Final writing contract.
for url in URLS:
    text = page_path(url).read_text(encoding='utf-8')
    assert 'Robin Hood Chain' not in text, url
    assert 'Helping the People Who Help People' not in text, url
    assert 'Helping the People who Help People' not in text, url

print(f'REPAIR_STAGE_1_WRITING=PASS pages=146 changed={changed} separators={separators} clean_buttons=1 mission_phrase=1 robinhood_name=1')
