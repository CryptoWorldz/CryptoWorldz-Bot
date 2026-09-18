#!/usr/bin/env python3
"""Exhaustive OneWorldz ecosystem visual/asset audit.

Run after the normal build/fix pipeline:
  --static  verify every public HTML page, stylesheet and local image before deploy
  --render  render every public page at mobile + desktop viewports in Chromium
  --live    verify every deployed page, stylesheet and image over HTTPS
"""
from __future__ import annotations

import argparse
import concurrent.futures
import functools
import os
import re
import shutil
import struct
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMAGE_EXTS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico'}
CSS_URL_RE = re.compile(r"url\(\s*(['\"]?)([^)'\"]+)\1\s*\)", re.I)


def domains() -> list[str]:
    items = [x.strip() for x in (ROOT / 'DOMAINS.txt').read_text(encoding='utf-8').splitlines() if x.strip()]
    assert len(items) == 18 and len(set(items)) == 18, f'expected 18 unique domains, got {len(items)}'
    return items


def ecosystem_urls() -> list[str]:
    p = ROOT / '.ecosystem-urls.txt'
    assert p.is_file(), '.ecosystem-urls.txt missing; run build pipeline first'
    items = [x.strip() for x in p.read_text(encoding='utf-8').splitlines() if x.strip()]
    assert len(items) == len(set(items)) and 18 <= len(items) <= 23, f'expected lean unique public set (18-23 URLs), got {len(items)} total / {len(set(items))} unique'
    return items


def page_path(url: str) -> Path:
    p = urllib.parse.urlparse(url)
    rel = urllib.parse.unquote(p.path).strip('/')
    return ROOT / p.netloc / rel / 'index.html' if rel else ROOT / p.netloc / 'index.html'


def file_for_owned_url(url: str, owned: set[str]) -> Path | None:
    p = urllib.parse.urlparse(url)
    if p.scheme not in ('http', 'https') or p.netloc not in owned:
        return None
    rel = urllib.parse.unquote(p.path).lstrip('/')
    if not rel or p.path.endswith('/'):
        rel = (rel.rstrip('/') + '/index.html').lstrip('/')
    return ROOT / p.netloc / rel


class Scan(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.styles: list[str] = []
        self.images: list[tuple[str, str]] = []
        self.links: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        tag = tag.lower()
        if tag == 'link' and 'stylesheet' in a.get('rel', '').lower().split() and a.get('href'):
            self.styles.append(a['href'])
        elif tag == 'img' and a.get('src'):
            self.images.append((a['src'], a.get('alt', '')))
        elif tag == 'source' and a.get('srcset'):
            for item in a['srcset'].split(','):
                src = item.strip().split()[0] if item.strip() else ''
                if src:
                    self.images.append((src, 'source'))
        elif tag == 'a' and a.get('href'):
            self.links.append(a['href'])


def valid_image_bytes(path: Path, data: bytes) -> bool:
    ext = path.suffix.lower()
    if ext == '.png':
        return data.startswith(b'\x89PNG\r\n\x1a\n')
    if ext in ('.jpg', '.jpeg'):
        return data.startswith(b'\xff\xd8\xff') and data.rstrip().endswith(b'\xff\xd9')
    if ext == '.webp':
        return len(data) >= 12 and data[:4] == b'RIFF' and data[8:12] == b'WEBP'
    if ext == '.gif':
        return data.startswith((b'GIF87a', b'GIF89a'))
    if ext == '.ico':
        return data.startswith(b'\x00\x00\x01\x00')
    if ext == '.svg':
        return b'<svg' in data[:4096].lower()
    return False


def static_audit() -> None:
    ds = domains()
    owned = set(ds)
    urls = ecosystem_urls()
    errors: list[str] = []
    referenced_assets: set[Path] = set()

    for url in urls:
        f = page_path(url)
        if not f.is_file():
            errors.append(f'MISSING PAGE {url} -> {f.relative_to(ROOT)}')
            continue
        text = f.read_text(encoding='utf-8', errors='strict')
        low = text.lower()
        if '<meta name="viewport"' not in low:
            errors.append(f'MISSING VIEWPORT {f.relative_to(ROOT)}')
        if '/style.css' not in text:
            errors.append(f'MISSING CORE STYLE {f.relative_to(ROOT)}')
        if '/mobile-safe.css' not in text:
            errors.append(f'MISSING MOBILE STYLE {f.relative_to(ROOT)}')
        if '/global-image-overrides.css' not in text:
            errors.append(f'MISSING GLOBAL IMAGE STYLE {f.relative_to(ROOT)}')
        else:
            head = re.search(r'<head\\b[^>]*>([\\s\\S]*?)</head>', text, re.I)
            if not head:
                errors.append(f'MISSING HEAD {f.relative_to(ROOT)}')
            else:
                styles = re.findall(r'<link\\b[^>]*rel=["\\']stylesheet["\\'][^>]*>', head.group(1), re.I)
                if not styles or '/global-image-overrides.css' not in styles[-1]:
                    errors.append(f'GLOBAL IMAGE STYLE NOT LAST {f.relative_to(ROOT)}')
        if 'data-oneworldz-build=' not in text:
            errors.append(f'MISSING BUILD MARKER {f.relative_to(ROOT)}')

        scan = Scan()
        scan.feed(text)
        for src, alt in scan.images:
            if not alt.strip():
                errors.append(f'MISSING IMG ALT {f.relative_to(ROOT)} src={src}')
            absolute = urllib.parse.urljoin(url, src)
            asset = file_for_owned_url(absolute, owned)
            if asset is not None:
                referenced_assets.add(asset)
                if not asset.is_file():
                    errors.append(f'MISSING IMAGE {f.relative_to(ROOT)} -> {asset.relative_to(ROOT)}')
        for href in scan.styles:
            absolute = urllib.parse.urljoin(url, href)
            css = file_for_owned_url(absolute, owned)
            if css is not None:
                referenced_assets.add(css)
                if not css.is_file():
                    errors.append(f'MISSING CSS {f.relative_to(ROOT)} -> {css.relative_to(ROOT)}')
                elif css.stat().st_size < 80:
                    errors.append(f'TINY CSS {css.relative_to(ROOT)} size={css.stat().st_size}')

    # Validate CSS background/image URLs too.
    for host in ds:
        for css in (ROOT / host).rglob('*.css'):
            base_url = f'https://{host}/' + css.relative_to(ROOT / host).as_posix()
            text = css.read_text(encoding='utf-8', errors='strict')
            for _, ref in CSS_URL_RE.findall(text):
                ref = ref.strip()
                if not ref or ref.startswith(('data:', '#')):
                    continue
                asset = file_for_owned_url(urllib.parse.urljoin(base_url, ref), owned)
                if asset is not None:
                    referenced_assets.add(asset)
                    if not asset.is_file():
                        errors.append(f'MISSING CSS ASSET {css.relative_to(ROOT)} -> {asset.relative_to(ROOT)}')

    # Validate every image file that will be uploaded, referenced or not.
    images: list[Path] = []
    styles: list[Path] = []
    for host in ds:
        site = ROOT / host
        styles.extend(site.rglob('*.css'))
        images.extend(p for p in site.rglob('*') if p.is_file() and p.suffix.lower() in IMAGE_EXTS)
    for img in images:
        data = img.read_bytes()
        if len(data) < 64:
            errors.append(f'TINY IMAGE {img.relative_to(ROOT)} size={len(data)}')
        elif not valid_image_bytes(img, data):
            errors.append(f'INVALID IMAGE {img.relative_to(ROOT)}')

    # The approved Davis Family visual must survive every rebuild.
    for rel in (
        'donateworldz.com/assets/support/davis-family/davis-family-hero.jpg',
        'donateworldz.com/assets/support/davis-family/davis-family-hero.webp',
    ):
        p = ROOT / rel
        if not p.is_file() or p.stat().st_size < 10000:
            errors.append(f'DAVIS HERO MISSING {rel}')
    davis = ROOT / 'donateworldz.com/davis-family/index.html'
    if davis.is_file():
        t = davis.read_text(encoding='utf-8')
        for needle in ('/style.css', '/mobile-safe.css', 'davis-family-hero.jpg', 'davis-family-hero.webp', '165Ken5f2Bt'):
            if needle not in t:
                errors.append(f'DAVIS PAGE CONTRACT MISSING {needle}')

    if errors:
        print('\n'.join(errors[:200]))
        raise SystemExit(f'STATIC_AUDIT_FAILED errors={len(errors)}')
    print(f'STATIC_AUDIT=PASS sites={len(ds)} pages={len(urls)} css={len(styles)} images={len(images)} referenced_assets={len(referenced_assets)}')


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def find_browser() -> str:
    for name in ('google-chrome', 'chromium', 'chromium-browser'):
        p = shutil.which(name)
        if p:
            return p
    raise SystemExit('RENDER_AUDIT_FAILED no Chrome/Chromium found')


def png_dimensions(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if len(data) < 24 or not data.startswith(b'\x89PNG\r\n\x1a\n'):
        return (0, 0)
    return struct.unpack('>II', data[16:24])


def render_audit() -> None:
    ds = domains()
    urls = ecosystem_urls()
    browser = find_browser()
    grouped: dict[str, list[str]] = {d: [] for d in ds}
    for u in urls:
        grouped[urllib.parse.urlparse(u).netloc].append(u)
    errors: list[str] = []
    renders = 0

    with tempfile.TemporaryDirectory(prefix='oneworldz-render-') as td:
        shots = Path(td) / 'shots'
        shots.mkdir()
        profile = Path(td) / 'chrome-profile'
        profile.mkdir()
        for host in ds:
            handler = functools.partial(QuietHandler, directory=str(ROOT / host))
            server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            port = server.server_address[1]
            try:
                for original in grouped[host]:
                    path = urllib.parse.urlparse(original).path or '/'
                    local = f'http://127.0.0.1:{port}{path}'
                    slug = re.sub(r'[^a-z0-9]+', '-', path.lower()).strip('-') or 'home'
                    for label, size in (('mobile', '390,844'), ('desktop', '1440,900')):
                        out = shots / f'{host}-{slug}-{label}.png'
                        cmd = [
                            browser, '--headless=new', '--no-sandbox', '--disable-gpu',
                            '--disable-dev-shm-usage', '--hide-scrollbars',
                            '--run-all-compositor-stages-before-draw', '--virtual-time-budget=450',
                            f'--user-data-dir={profile}', f'--window-size={size}',
                            f'--screenshot={out}', local,
                        ]
                        try:
                            cp = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=30, check=False)
                        except subprocess.TimeoutExpired:
                            errors.append(f'RENDER TIMEOUT {original} {label}')
                            continue
                        if cp.returncode != 0 or not out.is_file():
                            errors.append(f'RENDER FAILED {original} {label} rc={cp.returncode}')
                            continue
                        w, h = png_dimensions(out)
                        if out.stat().st_size < 5000 or w < 300 or h < 500:
                            errors.append(f'RENDER INVALID {original} {label} bytes={out.stat().st_size} size={w}x{h}')
                        renders += 1
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=2)

    if errors:
        print('\n'.join(errors[:100]))
        raise SystemExit(f'RENDER_AUDIT_FAILED errors={len(errors)} renders={renders}')
    assert renders == len(urls) * 2, (renders, len(urls) * 2)
    print(f'RENDER_AUDIT=PASS pages={len(urls)} mobile={len(urls)} desktop={len(urls)} screenshots={renders}')


def public_file_urls() -> tuple[list[str], dict[str, Path]]:
    ds = domains()
    urls = ecosystem_urls()
    expected: dict[str, Path] = {}
    for host in ds:
        root = ROOT / host
        for p in root.rglob('*'):
            if not p.is_file():
                continue
            if p.suffix.lower() in IMAGE_EXTS or p.suffix.lower() == '.css':
                rel = p.relative_to(root).as_posix()
                expected[f'https://{host}/{urllib.parse.quote(rel, safe="/")}'] = p
    for u in urls:
        expected[u] = page_path(u)
    return urls, expected


def fetch_bytes(url: str, attempts: int = 3) -> tuple[int, bytes, str]:
    last = ''
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'OneWorldz-Full-Audit/1.0',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
            })
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.status, r.read(), r.headers.get('Content-Type', '')
        except Exception as e:
            last = repr(e)
            time.sleep(2 + attempt * 2)
    raise RuntimeError(last)


def live_audit() -> None:
    pages, expected = public_file_urls()
    errors: list[str] = []

    def check(item):
        url, local = item
        try:
            status, data, ctype = fetch_bytes(url)
        except Exception as e:
            return f'LIVE FETCH FAILED {url} {e}'
        if status != 200:
            return f'LIVE STATUS {status} {url}'
        ext = local.suffix.lower()
        if ext in IMAGE_EXTS:
            if len(data) < 64:
                return f'LIVE TINY IMAGE {url} bytes={len(data)}'
            if not valid_image_bytes(local, data):
                return f'LIVE INVALID IMAGE {url} type={ctype}'
        elif ext == '.css':
            if len(data) < 80 or b'{' not in data:
                return f'LIVE INVALID CSS {url} bytes={len(data)}'
        elif ext == '.html':
            text = data.decode('utf-8', 'ignore')
            if (
                'data-oneworldz-build=' not in text
                or '/style.css' not in text
                or '/mobile-safe.css' not in text
                or '/global-image-overrides.css' not in text
            ):
                return f'LIVE PAGE VISUAL CONTRACT FAILED {url}'
            head = re.search(r'<head\\b[^>]*>([\\s\\S]*?)</head>', text, re.I)
            if not head:
                return f'LIVE PAGE HEAD MISSING {url}'
            styles = re.findall(r'<link\\b[^>]*rel=["\\']stylesheet["\\'][^>]*>', head.group(1), re.I)
            if not styles or '/global-image-overrides.css' not in styles[-1]:
                return f'LIVE GLOBAL IMAGE STYLE NOT LAST {url}'
        return None

    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
        for result in ex.map(check, expected.items()):
            if result:
                errors.append(result)
                print(result)

    if errors:
        raise SystemExit(f'LIVE_ASSET_AUDIT_FAILED errors={len(errors)}')
    image_count = sum(1 for p in expected.values() if p.suffix.lower() in IMAGE_EXTS)
    css_count = sum(1 for p in expected.values() if p.suffix.lower() == '.css')
    print(f'LIVE_ASSET_AUDIT=PASS pages={len(pages)} css={css_count} images={image_count} total_requests={len(expected)}')


def main() -> None:
    ap = argparse.ArgumentParser()
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument('--static', action='store_true')
    mode.add_argument('--render', action='store_true')
    mode.add_argument('--live', action='store_true')
    args = ap.parse_args()
    if args.static:
        static_audit()
    elif args.render:
        render_audit()
    else:
        live_audit()


if __name__ == '__main__':
    main()
