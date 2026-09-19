#!/usr/bin/env python3
"""Stage 2/3: image integrity and fallback repair across every public page."""
from pathlib import Path
import re
import runpy

ROOT = Path(__file__).resolve().parents[1]
DOMAINS = [d.strip() for d in (ROOT / 'DOMAINS.txt').read_text(encoding='utf-8').splitlines() if d.strip()]
assert len(DOMAINS) == 18 and len(set(DOMAINS)) == 18

# Normalize extensions/bytes and restore core visual CSS after all generators.
runpy.run_path(str(ROOT / 'tools' / 'normalize_visual_assets.py'), run_name='__main__')

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

def host_for(path: Path) -> str:
    return path.relative_to(ROOT).parts[0]

def url_for(path: Path) -> str:
    rel = path.relative_to(ROOT)
    host = rel.parts[0]
    parent = Path(*rel.parts[1:]).parent.as_posix()
    return f'https://{host}/' if parent == '.' else f'https://{host}/{parent.strip("/")}/'

PAGES = discover_pages()

IMG_RE = re.compile(r'<img\b[^>]*>', re.I)
SRC_RE = re.compile(r'\bsrc=["\']([^"\']+)["\']', re.I)
ALT_RE = re.compile(r'\balt=["\']([^"\']*)["\']', re.I)
TITLE_RE = re.compile(r'<title>(.*?)</title>', re.I | re.S)

changed_pages = 0
repaired_src = 0
repaired_alt = 0

for path in PAGES:
    text = path.read_text(encoding='utf-8')
    original = text
    host = host_for(path)
    site = ROOT / host
    title_match = TITLE_RE.search(text)
    page_title = re.sub(r'\s*\|.*$', '', title_match.group(1)).strip() if title_match else host

    def repair_img(match):
        tag = match.group(0)
        src_match = SRC_RE.search(tag)
        if not src_match:
            return tag
        src = src_match.group(1).strip()

        bad_retired = bool(re.search(r'reagan|action[-_ ]?spreads[-_ ]?smiles', src, re.I))

        local_ref = None
        if src.startswith('/'):
            local_ref = site / src.lstrip('/')
        elif not re.match(r'^https?://', src, re.I) and not src.startswith(('data:', '#')):
            local_ref = path.parent / src

        broken = bool(local_ref is not None and not local_ref.resolve().is_file())
        if bad_retired or broken:
            # Never hide an image defect by swapping in an unrelated site hero.
            # Remove the bad image; the surrounding content remains usable and truthful.
            repair_img.repaired_src += 1
            return ""

        alt_match = ALT_RE.search(tag)
        if alt_match is None:
            tag = tag[:-1] + f' alt="{page_title} artwork">'
            repair_img.repaired_alt += 1
        elif not alt_match.group(1).strip():
            tag = ALT_RE.sub(f'alt="{page_title} artwork"', tag, count=1)
            repair_img.repaired_alt += 1
        return tag

    repair_img.repaired_src = 0
    repair_img.repaired_alt = 0
    text = IMG_RE.sub(repair_img, text)
    repaired_src += repair_img.repaired_src
    repaired_alt += repair_img.repaired_alt

    if text != original:
        path.write_text(text, encoding='utf-8')
        changed_pages += 1

for path in PAGES:
    text = path.read_text(encoding='utf-8')
    host = host_for(path)
    site = ROOT / host
    url = url_for(path)
    for tag in IMG_RE.findall(text):
        sm = SRC_RE.search(tag)
        assert sm, (url, 'img-without-src')
        src = sm.group(1).strip()
        assert not re.search(r'reagan|action[-_ ]?spreads[-_ ]?smiles', src, re.I), (url, src)
        am = ALT_RE.search(tag)
        assert am and am.group(1).strip(), (url, 'missing-alt', tag)
        if src.startswith('/'):
            assert (site / src.lstrip('/')).is_file(), (url, src)

print(f'REPAIR_STAGE_2_IMAGES=PASS pages={len(PAGES)} changed_pages={changed_pages} removed_bad_images={repaired_src} repaired_alt={repaired_alt} local_images_verified=1 crop=0')
