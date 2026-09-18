#!/usr/bin/env python3
"""Render the lean public set at mobile and desktop sizes in parallel."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import concurrent.futures
import functools
import hashlib
import shutil
import struct
import subprocess
import tempfile
import threading
import urllib.parse

ROOT = Path(__file__).resolve().parents[1]
DOMAINS = [d.strip() for d in (ROOT/'DOMAINS.txt').read_text(encoding='utf-8').splitlines() if d.strip()]
URLS = [u.strip() for u in (ROOT/'.ecosystem-urls.txt').read_text(encoding='utf-8').splitlines() if u.strip()]
assert len(DOMAINS) == 18 and len(set(DOMAINS)) == 18
assert len(URLS) == len(set(URLS)) and 18 <= len(URLS) <= 80


def browser_path():
    for name in ('google-chrome','chromium','chromium-browser'):
        p = shutil.which(name)
        if p:
            return p
    raise SystemExit('RENDER_AUDIT_FAILED no Chrome/Chromium found')


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def png_dimensions(path: Path):
    b = path.read_bytes()
    if len(b) < 24 or not b.startswith(b'\x89PNG\r\n\x1a\n'):
        return 0, 0
    return struct.unpack('>II', b[16:24])


browser = browser_path()
servers = []
threads = []
ports = {}
for host in DOMAINS:
    handler = functools.partial(Quiet, directory=str(ROOT/host))
    server = ThreadingHTTPServer(('127.0.0.1',0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    servers.append(server); threads.append(thread); ports[host] = server.server_address[1]

errors = []
completed = 0
try:
    with tempfile.TemporaryDirectory(prefix='oneworldz-full-render-') as td:
        shots = Path(td)
        tasks = []
        for original in URLS:
            p = urllib.parse.urlparse(original)
            local = f'http://127.0.0.1:{ports[p.netloc]}{p.path or "/"}'
            key = hashlib.sha1(original.encode()).hexdigest()[:12]
            for label,size in (('mobile','390,844'),('desktop','1440,900')):
                tasks.append((original,local,label,size,key,shots/f'{key}-{label}.png'))

        def render(task):
            original, local, label, size, key, out = task
            profile = shots / f'profile-{key}-{label}'
            cmd = [browser,'--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
                   '--hide-scrollbars','--disable-background-networking','--disable-extensions',
                   '--no-first-run','--no-default-browser-check',
                   '--run-all-compositor-stages-before-draw','--virtual-time-budget=350',
                   f'--user-data-dir={profile}',f'--window-size={size}',f'--screenshot={out}',local]
            try:
                cp = subprocess.run(cmd,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=20,check=False)
            except subprocess.TimeoutExpired:
                return f'RENDER TIMEOUT {original} {label}'
            if cp.returncode != 0 or not out.is_file():
                return f'RENDER FAILED {original} {label} rc={cp.returncode}'
            w,h = png_dimensions(out)
            if out.stat().st_size < 5000 or w < 300 or h < 500:
                return f'RENDER INVALID {original} {label} bytes={out.stat().st_size} size={w}x{h}'
            shutil.rmtree(profile, ignore_errors=True)
            return None

        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
            for result in ex.map(render,tasks):
                completed += 1
                if result:
                    errors.append(result)
                    print(result)
finally:
    for s in servers:
        s.shutdown(); s.server_close()
    for t in threads:
        t.join(timeout=2)

if errors:
    raise SystemExit(f'RENDER_AUDIT_FAILED errors={len(errors)} completed={completed}')
assert completed == len(URLS) * 2, (completed, len(URLS) * 2)
print(f'RENDER_AUDIT=PASS pages={len(URLS)} mobile={len(URLS)} desktop={len(URLS)} screenshots={completed} parallel_workers=6 isolated_profiles=1')
