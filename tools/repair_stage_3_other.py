#!/usr/bin/env python3
"""Stage 3/3: final structural/accessibility/metadata repair across all 146 public pages."""
from pathlib import Path
from urllib.parse import urlparse
from html import escape
import re

ROOT = Path(__file__).resolve().parents[1]
URLS = [u.strip() for u in (ROOT / '.ecosystem-urls.txt').read_text(encoding='utf-8').splitlines() if u.strip()]
assert len(URLS) == 146 and len(set(URLS)) == 146

def page_path(url: str) -> Path:
    p = urlparse(url)
    rel = p.path.strip('/')
    return ROOT / p.netloc / rel / 'index.html' if rel else ROOT / p.netloc / 'index.html'

changed = 0
h1_added = 0
canonicals_added = 0
descriptions_added = 0

for url in URLS:
    path = page_path(url)
    assert path.is_file(), (url, path)
    text = path.read_text(encoding='utf-8')
    original = text

    assert '<meta name="viewport"' in text.lower(), (url, 'viewport')
    assert '/style.css' in text, (url, 'style')
    assert '/mobile-safe.css' in text, (url, 'mobile-style')
    assert '<iframe' not in text.lower(), (url, 'iframe')
    assert 'facebook.com/plugins/' not in text.lower(), (url, 'facebook-plugin')
    assert 'based.bid' not in text.lower(), (url, 'retired-launch-board')
    assert not re.search(r'reagan|action spreads smiles|action spread smiles|196prufjjq', text, re.I), (url, 'retired-content')

    title_match = re.search(r'<title>(.*?)</title>', text, re.I | re.S)
    assert title_match and title_match.group(1).strip(), (url, 'title')
    title = re.sub(r'\s*\|.*$', '', title_match.group(1)).strip()

    if not re.search(r'<meta\s+name=["\']description["\']', text, re.I):
        desc = escape(f'{title} — OneWorldz ecosystem page.', quote=True)
        text = text.replace('</head>', f'<meta name="description" content="{desc}"></head>', 1)
        descriptions_added += 1

    if not re.search(r'<link\s+rel=["\']canonical["\']', text, re.I):
        text = text.replace('</head>', f'<link rel="canonical" href="{escape(url, quote=True)}"></head>', 1)
        canonicals_added += 1

    # Every public page must expose one real page heading. If a legacy root
    # somehow loses it, add a visible compact heading at the beginning of main.
    if not re.search(r'<h1\b', text, re.I):
        heading = f'<section class="section" data-repair="missing-h1"><h1 class="big-title">{escape(title)}</h1></section>'
        if re.search(r'<main\b[^>]*>', text, re.I):
            text = re.sub(r'(<main\b[^>]*>)', r'\1' + heading, text, count=1, flags=re.I)
        else:
            text = re.sub(r'(<body\b[^>]*>)', r'\1<main class="shell">' + heading + '</main>', text, count=1, flags=re.I)
        h1_added += 1

    # Keep the home control singular and predictable.
    if text.count('class="ow-home-button"') > 1:
        first = True
        def dedupe(match):
            nonlocal first
            if first:
                first = False
                return match.group(0)
            return ''
        text = re.sub(r'<a\b[^>]*class=["\'][^"\']*ow-home-button[^"\']*["\'][^>]*>.*?</a>', dedupe, text, flags=re.I | re.S)

    if text != original:
        path.write_text(text, encoding='utf-8')
        changed += 1

# Final 146-page contract.
for url in URLS:
    text = page_path(url).read_text(encoding='utf-8')
    assert re.search(r'<h1\b', text, re.I), (url, 'h1')
    assert re.search(r'<meta\s+name=["\']description["\']', text, re.I), (url, 'description')
    assert re.search(r'<link\s+rel=["\']canonical["\']', text, re.I), (url, 'canonical')
    assert text.count('class="ow-home-button"') == 1, (url, 'home-button-count')

print(f'REPAIR_STAGE_3_OTHER=PASS pages=146 changed={changed} h1_added={h1_added} canonicals_added={canonicals_added} descriptions_added={descriptions_added} structure=1 accessibility=1')
