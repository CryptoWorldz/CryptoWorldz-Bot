#!/usr/bin/env python3
"""Persistent visual proof capture for all 146 built ecosystem pages.

Unlike the old render gate, this keeps the screenshots and a URL manifest so a
human can actually inspect what was rendered.
"""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import concurrent.futures
import csv
import functools
import hashlib
import shutil
import struct
import subprocess
import threading
import urllib.parse

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "visual-proof"
SHOTS = OUT / "screens"
OUT.mkdir(exist_ok=True)
SHOTS.mkdir(parents=True, exist_ok=True)

DOMAINS = [d.strip() for d in (ROOT/'DOMAINS.txt').read_text(encoding='utf-8').splitlines() if d.strip()]
URLS = [u.strip() for u in (ROOT/'.ecosystem-urls.txt').read_text(encoding='utf-8').splitlines() if u.strip()]
assert len(DOMAINS) == 18 and len(URLS) == len(set(URLS)) and len(URLS) >= 146

def browser_path():
    for name in ('google-chrome','chromium','chromium-browser'):
        p = shutil.which(name)
        if p:
            return p
    raise SystemExit('VISUAL_CAPTURE_FAILED no Chrome/Chromium found')

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

def png_dimensions(path: Path):
    b = path.read_bytes()
    if len(b) < 24 or not b.startswith(b'\x89PNG\r\n\x1a\n'):
        return 0, 0
    return struct.unpack('>II', b[16:24])

browser = browser_path()
servers=[]; threads=[]; ports={}
for host in DOMAINS:
    handler=functools.partial(Quiet, directory=str(ROOT/host))
    server=ThreadingHTTPServer(('127.0.0.1',0), handler)
    thread=threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    servers.append(server); threads.append(thread); ports[host]=server.server_address[1]

rows=[]
errors=[]
tasks=[]
for n, original in enumerate(URLS, start=1):
    p=urllib.parse.urlparse(original)
    local=f'http://127.0.0.1:{ports[p.netloc]}{p.path or "/"}'
    slug=(p.netloc + p.path).strip('/').replace('/','__').replace('.','_') or p.netloc.replace('.','_')
    key=f'{n:03d}-{hashlib.sha1(original.encode()).hexdigest()[:8]}-{slug[:90]}'
    # Tall mobile capture is the primary human-inspection proof. Desktop is
    # captured at a shorter height for layout/cropping comparison.
    tasks += [
        (n,original,local,'mobile','390,6000',SHOTS/f'{key}-mobile.png'),
        (n,original,local,'desktop','1440,3200',SHOTS/f'{key}-desktop.png'),
    ]

def render(task):
    n,original,local,label,size,out=task
    profile=SHOTS/f'.profile-{n}-{label}'
    cmd=[browser,'--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
         '--hide-scrollbars','--disable-background-networking','--disable-extensions',
         '--no-first-run','--no-default-browser-check','--run-all-compositor-stages-before-draw',
         '--virtual-time-budget=500',f'--user-data-dir={profile}',f'--window-size={size}',
         f'--screenshot={out}',local]
    try:
        cp=subprocess.run(cmd,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=25,check=False)
    except subprocess.TimeoutExpired:
        return (n,original,label,str(out),'timeout',0,0,0)
    shutil.rmtree(profile,ignore_errors=True)
    if cp.returncode != 0 or not out.is_file():
        return (n,original,label,str(out),f'rc={cp.returncode}',0,0,0)
    w,h=png_dimensions(out)
    sizeb=out.stat().st_size
    status='ok' if sizeb>=5000 and w>=300 and h>=1000 else 'invalid'
    return (n,original,label,str(out.relative_to(ROOT)),status,w,h,sizeb)

try:
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
        for result in ex.map(render,tasks):
            rows.append(result)
            if result[4] != 'ok':
                errors.append(result)
finally:
    for s in servers:
        s.shutdown(); s.server_close()
    for t in threads:
        t.join(timeout=2)

rows.sort(key=lambda r:(r[0],r[2]))
with (OUT/'manifest.csv').open('w',newline='',encoding='utf-8') as f:
    w=csv.writer(f)
    w.writerow(['page_number','url','viewport','file','status','width','height','bytes'])
    w.writerows(rows)

(OUT/'README.txt').write_text(
    f'OneWorldz visual proof: {len(URLS)} pages x mobile+desktop = {len(URLS)*2} persistent screenshots.\n'
    'Use manifest.csv to map every screenshot to its public URL.\n',
    encoding='utf-8'
)

if errors:
    raise SystemExit(f'VISUAL_CAPTURE_FAILED errors={len(errors)} first={errors[:5]}')
assert len(rows)==len(URLS)*2
print(f'VISUAL_PROOF_CAPTURE=PASS pages={len(URLS)} screenshots={len(rows)} mobile_tall={len(URLS)} desktop={len(URLS)} persisted=1')
