#!/usr/bin/env python3
"""Final visual normalization pass for all public OneWorldz sites.

Runs after all page generators. It fixes two classes of production defects:
1. HTML written late in the pipeline without the shared /style.css.
2. Legacy image files whose extension does not match their real binary format.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOMAINS = [d.strip() for d in (ROOT / 'DOMAINS.txt').read_text(encoding='utf-8').splitlines() if d.strip()]
assert len(DOMAINS) == 18 and len(set(DOMAINS)) == 18
IMAGE_EXTS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico'}
TEXT_EXTS = {'.html', '.css', '.js', '.json', '.xml', '.txt'}


def actual_ext(data: bytes):
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        return '.png'
    if data.startswith(b'\xff\xd8\xff'):
        return '.jpg'
    if len(data) >= 12 and data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return '.webp'
    if data.startswith((b'GIF87a', b'GIF89a')):
        return '.gif'
    if data.startswith(b'\x00\x00\x01\x00'):
        return '.ico'
    if b'<svg' in data[:4096].lower():
        return '.svg'
    return None


def normalize_site(host: str):
    site = ROOT / host
    replacements = {}
    renamed = 0
    for p in sorted((x for x in site.rglob('*') if x.is_file() and x.suffix.lower() in IMAGE_EXTS), key=lambda x: len(x.parts), reverse=True):
        data = p.read_bytes()
        ext = actual_ext(data)
        if not ext:
            raise SystemExit(f'UNKNOWN_IMAGE_FORMAT {p.relative_to(ROOT)}')
        old_ext = p.suffix.lower()
        equivalent = old_ext == ext or {old_ext, ext} <= {'.jpg', '.jpeg'}
        if equivalent:
            continue
        target = p.with_suffix(ext)
        if target.exists() and target != p:
            if target.read_bytes() != data:
                raise SystemExit(f'IMAGE_RENAME_COLLISION {p.relative_to(ROOT)} -> {target.relative_to(ROOT)}')
            p.unlink()
        else:
            p.rename(target)
        old_rel = p.relative_to(site).as_posix()
        new_rel = target.relative_to(site).as_posix()
        replacements[old_rel] = new_rel
        renamed += 1

    # Update every built text asset after all renames.
    changed_refs = 0
    if replacements:
        for p in site.rglob('*'):
            if not p.is_file() or p.suffix.lower() not in TEXT_EXTS:
                continue
            try:
                text = p.read_text(encoding='utf-8')
            except UnicodeDecodeError:
                continue
            original = text
            for old, new in replacements.items():
                text = text.replace(old, new)
            if text != original:
                p.write_text(text, encoding='utf-8')
                changed_refs += 1

    # Every public page gets the real shared visual stylesheet, even if a late
    # support/retirement generator rewrote that page after the visual pass.
    styled = 0
    for p in site.rglob('*.html'):
        text = p.read_text(encoding='utf-8')
        if '/style.css' not in text:
            link = '<link rel="stylesheet" href="/style.css">'
            if '</head>' not in text:
                raise SystemExit(f'NO_HEAD_FOR_STYLE {p.relative_to(ROOT)}')
            text = text.replace('</head>', link + '</head>', 1)
            p.write_text(text, encoding='utf-8')
            styled += 1
    return renamed, changed_refs, styled


total_renamed = total_refs = total_styled = 0
for host in DOMAINS:
    r, c, s = normalize_site(host)
    total_renamed += r
    total_refs += c
    total_styled += s

# Final hard contract across every public HTML file.
pages = 0
for host in DOMAINS:
    for p in (ROOT / host).rglob('*.html'):
        t = p.read_text(encoding='utf-8')
        assert '/style.css' in t, p
        assert '/mobile-safe.css' in t, p
        pages += 1

print(f'VISUAL_NORMALIZE=PASS sites=18 pages={pages} renamed_images={total_renamed} updated_text_files={total_refs} restored_core_style_pages={total_styled}')
