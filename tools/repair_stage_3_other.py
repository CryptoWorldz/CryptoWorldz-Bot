#!/usr/bin/env python3
"""Stage 3/3: structural/accessibility/metadata repair across every public page."""
from pathlib import Path
from html import escape
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

changed = 0
h1_added = 0
canonicals_added = 0
descriptions_added = 0

for path in PAGES:
    url = url_for(path)
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

    if not re.search(r'<h1\b', text, re.I):
        heading = f'<section class="section" data-repair="missing-h1"><h1 class="big-title">{escape(title)}</h1></section>'
        if re.search(r'<main\b[^>]*>', text, re.I):
            text = re.sub(r'(<main\b[^>]*>)', r'\1' + heading, text, count=1, flags=re.I)
        else:
            text = re.sub(r'(<body\b[^>]*>)', r'\1<main class="shell">' + heading + '</main>', text, count=1, flags=re.I)
        h1_added += 1

    home_button = '<a class="ow-home-button" href="/" aria-label="Home">Home</a>'
    home_count = text.count('class="ow-home-button"')
    if home_count == 0:
        text = re.sub(r'(<body\b[^>]*>)', r'\1' + home_button, text, count=1, flags=re.I)
    elif home_count > 1:
        state = [True]
        def dedupe(match):
            if state[0]:
                state[0] = False
                return match.group(0)
            return ''
        text = re.sub(r'<a\b[^>]*class=["\'][^"\']*ow-home-button[^"\']*["\'][^>]*>.*?</a>', dedupe, text, flags=re.I | re.S)

    if text != original:
        path.write_text(text, encoding='utf-8')
        changed += 1

for path in PAGES:
    url = url_for(path)
    text = path.read_text(encoding='utf-8')
    assert re.search(r'<h1\b', text, re.I), (url, 'h1')
    assert re.search(r'<meta\s+name=["\']description["\']', text, re.I), (url, 'description')
    assert re.search(r'<link\s+rel=["\']canonical["\']', text, re.I), (url, 'canonical')
    assert text.count('class="ow-home-button"') == 1, (url, 'home-button-count')

print(f'REPAIR_STAGE_3_OTHER=PASS pages={len(PAGES)} changed={changed} h1_added={h1_added} canonicals_added={canonicals_added} descriptions_added={descriptions_added} structure=1 accessibility=1')
