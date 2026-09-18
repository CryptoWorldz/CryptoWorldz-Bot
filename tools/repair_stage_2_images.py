#!/usr/bin/env python3
"""Stage 2/3: final image integrity and fallback repair across all 146 public pages."""
from pathlib import Path
from urllib.parse import urlparse
import re
import runpy

ROOT = Path(__file__).resolve().parents[1]

# First normalize extensions/bytes and restore core visual CSS after all generators.
runpy.run_path(str(ROOT / 'tools' / 'normalize_visual_assets.py'), run_name='__main__')

URLS = [u.strip() for u in (ROOT / '.ecosystem-urls.txt').read_text(encoding='utf-8').splitlines() if u.strip()]
assert len(URLS) == 146 and len(set(URLS)) == 146

IMG_RE = re.compile(r'<img\b[^>]*>', re.I)
SRC_RE = re.compile(r'\bsrc=["\']([^"\']+)["\']', re.I)
ALT_RE = re.compile(r'\balt=["\']([^"\']*)["\']', re.I)
TITLE_RE = re.compile(r'<title>(.*?)</title>', re.I | re.S)

def page_path(url: str) -> Path:
    p = urlparse(url)
    rel = p.path.strip('/')
    return ROOT / p.netloc / rel / 'index.html' if rel else ROOT / p.netloc / 'index.html'

def fallback_for(site: Path) -> str:
    for ref in ('/hero.jpg', '/hero.png', '/site-icon.svg'):
        if (site / ref.lstrip('/')).is_file():
            return ref
    raise SystemExit(f'NO_IMAGE_FALLBACK {site.name}')

changed_pages = 0
repaired_src = 0
repaired_alt = 0

for url in URLS:
    path = page_path(url)
    text = path.read_text(encoding='utf-8')
    original = text
    parsed = urlparse(url)
    site = ROOT / parsed.netloc
    title_match = TITLE_RE.search(text)
    page_title = re.sub(r'\s*\|.*$', '', title_match.group(1)).strip() if title_match else parsed.netloc

    def repair_img(match):
        nonlocal_text = match.group(0)
        tag = nonlocal_text
        src_match = SRC_RE.search(tag)
        if not src_match:
            return tag
        src = src_match.group(1).strip()

        # Retired campaign image names must never reappear.
        bad_retired = bool(re.search(r'reagan|action[-_ ]?spreads[-_ ]?smiles', src, re.I))

        # Verify local same-site image references. External images are left alone.
        local_ref = None
        if src.startswith('/'):
            local_ref = site / src.lstrip('/')
        elif not re.match(r'^https?://', src, re.I) and not src.startswith(('data:', '#')):
            local_ref = path.parent / src

        broken = bool(local_ref is not None and not local_ref.resolve().is_file())
        if bad_retired or broken:
            replacement = fallback_for(site)
            tag = SRC_RE.sub(f'src="{replacement}"', tag, count=1)
            repair_img.repaired_src += 1

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

# Hard final image contract.
for url in URLS:
    path = page_path(url)
    text = path.read_text(encoding='utf-8')
    site = ROOT / urlparse(url).netloc
    for tag in IMG_RE.findall(text):
        sm = SRC_RE.search(tag)
        assert sm, (url, 'img-without-src')
        src = sm.group(1).strip()
        assert not re.search(r'reagan|action[-_ ]?spreads[-_ ]?smiles', src, re.I), (url, src)
        am = ALT_RE.search(tag)
        assert am and am.group(1).strip(), (url, 'missing-alt', tag)
        if src.startswith('/'):
            assert (site / src.lstrip('/')).is_file(), (url, src)

print(f'REPAIR_STAGE_2_IMAGES=PASS pages=146 changed_pages={changed_pages} repaired_src={repaired_src} repaired_alt={repaired_alt} local_images_verified=1 crop=0')
