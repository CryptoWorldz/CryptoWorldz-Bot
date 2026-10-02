#!/usr/bin/env python3
"""Render the complete public ecosystem at mobile and desktop sizes in parallel."""
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
assert len(URLS) == len(set(URLS)) and 18 <= len(URLS) <= 250


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

        def render(task, timeout=20, virtual_budget=350):
            original, local, label, size, key, out = task
            profile = shots / f'profile-{key}-{label}'
            shutil.rmtree(profile, ignore_errors=True)
            try:
                out.unlink(missing_ok=True)
            except TypeError:
                if out.exists():
                    out.unlink()
            cmd = [browser,'--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
                   '--hide-scrollbars','--disable-background-networking','--disable-extensions',
                   '--no-first-run','--no-default-browser-check',
                   '--run-all-compositor-stages-before-draw',f'--virtual-time-budget={virtual_budget}',
                   f'--user-data-dir={profile}',f'--window-size={size}',f'--screenshot={out}',local]
            try:
                cp = subprocess.run(cmd,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=timeout,check=False)
            except subprocess.TimeoutExpired:
                shutil.rmtree(profile, ignore_errors=True)
                return f'RENDER TIMEOUT {original} {label}'
            if cp.returncode != 0 or not out.is_file():
                shutil.rmtree(profile, ignore_errors=True)
                return f'RENDER FAILED {original} {label} rc={cp.returncode}'
            w,h = png_dimensions(out)
            if out.stat().st_size < 5000 or w < 300 or h < 500:
                shutil.rmtree(profile, ignore_errors=True)
                return f'RENDER INVALID {original} {label} bytes={out.stat().st_size} size={w}x{h}'
            shutil.rmtree(profile, ignore_errors=True)
            return None

        first_pass_failures = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
            for task, result in zip(tasks, ex.map(render,tasks)):
                completed += 1
                if result:
                    first_pass_failures.append((task, result))
                    print(result)

        # Chrome can occasionally starve under the six-way parallel render burst on
        # GitHub-hosted runners. Re-run only failed pages one-at-a-time with a
        # longer process timeout. A page must still produce a valid screenshot;
        # genuine failures remain fatal.
        if first_pass_failures:
            print(f'RENDER_RETRY_START count={len(first_pass_failures)} timeout=50 workers=1')
            for task, first_error in first_pass_failures:
                retry = render(task, timeout=50, virtual_budget=900)
                if retry:
                    errors.append(retry)
                    print(f'RENDER RETRY FAILED first={first_error} retry={retry}')
                else:
                    original, _, label, _, _, _ = task
                    print(f'RENDER RETRY PASS {original} {label}')
finally:
    for s in servers:
        s.shutdown(); s.server_close()
    for t in threads:
        t.join(timeout=2)

if errors:
    raise SystemExit(f'RENDER_AUDIT_FAILED errors={len(errors)} completed={completed}')
assert completed == len(URLS) * 2, (completed, len(URLS) * 2)
print(f'RENDER_AUDIT=PASS pages={len(URLS)} mobile={len(URLS)} desktop={len(URLS)} screenshots={completed} parallel_workers=6 isolated_profiles=1 retry_failed_serially=1')
