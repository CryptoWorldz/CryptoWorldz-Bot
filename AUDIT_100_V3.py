#!/usr/bin/env python3
from pathlib import Path
from urllib.parse import urlparse
import re, hashlib
from collections import defaultdict
ROOT=Path(__file__).resolve().parent
LIMIT=100
issues=[]; seen=set()
def add(cat,path,msg):
    if len(issues)>=LIMIT: return
    key=(cat,str(path),msg)
    if key not in seen: seen.add(key); issues.append((cat,str(path),msg))
def cap(cat): return sum(1 for c,_,__ in issues if c==cat)
def read(p): return p.read_text(encoding='utf-8',errors='ignore')
def clean(s): return re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',s)).strip()
def main(t):
    m=re.search(r'<main\b.*?</main>',t,re.I|re.S); return m.group(0) if m else t
def img(t):
    m=re.search(r'<img\b[^>]*src=["\']([^"\']+)["\']',main(t),re.I); return m.group(1) if m else ''
def ttl(t):
    m=re.search(r'<title>(.*?)</title>',t,re.I|re.S); return clean(m.group(1)) if m else ''
def local_page(site,h):
    if not h.startswith('/') or h.startswith('//'): return None
    raw=h.split('#')[0].split('?')[0]; last=raw.rstrip('/').split('/')[-1]
    if '.' in last: return None
    return site/raw.strip('/')/'index.html' if raw.strip('/') else site/'index.html'
urls=[x.strip() for x in (ROOT/'.ecosystem-urls.txt').read_text().splitlines() if x.strip()]
pages=[]
for u in urls:
    p=urlparse(u); f=ROOT/p.netloc/p.path.strip('/')/'index.html' if p.path.strip('/') else ROOT/p.netloc/'index.html'
    if f.is_file(): pages.append((u,f,read(f)))
# 1-2 wrong subject main images
allowed={'oneworldz-gpt':['/gpt','aiworldz','oneworldz-gpt'],'little-legend':['little-legend','musicworldz'],'five-leaders':['command-centre','builders','apply'],'zed-command':['command-centre','/zed'],'zed-grace-auto':['command-centre','/zed','/grace','/auto'],'blockchain-portal':['cryptoworldz','/worldz'],'oneworldz-master':['oneworldz.com/','visionworldz'],'we-need-you':['builders','apply','movieworldz']}
for u,f,t in pages:
    if cap('WRONG_MAIN_IMAGE')>=12: break
    s=img(t).lower(); r=u.lower()
    for a,ok in allowed.items():
        if a in s and not any(x in r for x in ok): add('WRONG_MAIN_IMAGE',f,f'main image {s} is unrelated to {urlparse(u).path or "/"}'); break
# 3-20 generic hero on specialized pages
special={'command-centre','zed','recap','wallet-safety','scam-awareness','governance','launchpads','tokens','heroes/','community-support','davis-family','community-impact','jayjay-support','hope-chest','legacy','destinations-of-hope','medical-care','clean-water','children','volunteers'}
for u,f,t in pages:
    if cap('GENERIC_HERO_ON_SPECIAL_PAGE')>=18: break
    r=urlparse(u).path.strip('/').lower()
    if r and any(x in r for x in special) and img(t) in ('/hero.png','hero.png'): add('GENERIC_HERO_ON_SPECIAL_PAGE',f,f'{r} uses generic /hero.png instead of page-specific artwork')
# 21-30 broken local asset refs
exts=('.css','.js','.png','.jpg','.jpeg','.webp','.avif','.svg','.ico','.woff','.woff2','.mp4','.wav')
for u,f,t in pages:
    if cap('BROKEN_LOCAL_ASSET')>=10: break
    site=ROOT/urlparse(u).netloc
    for s in re.findall(r'(?:src|href)=["\'](/[^"\'#?]+)["\']',t,re.I):
        if s.lower().endswith(exts) and not (site/s.lstrip('/')).is_file():
            add('BROKEN_LOCAL_ASSET',f,f'{s} is referenced but the file does not exist')
            if cap('BROKEN_LOCAL_ASSET')>=10: break
# 31-38 broken page navigation
for u,f,t in pages:
    if cap('BROKEN_LOCAL_PAGE_LINK')>=8: break
    site=ROOT/urlparse(u).netloc
    for h in re.findall(r'href=["\']([^"\']+)["\']',t,re.I):
        p=local_page(site,h)
        if p is not None and not p.is_file():
            add('BROKEN_LOCAL_PAGE_LINK',f,f'internal navigation {h} has no generated page')
            if cap('BROKEN_LOCAL_PAGE_LINK')>=8: break
# 39 wrong brand/title
for u,f,t in pages:
    host=urlparse(u).netloc.lower(); x=ttl(t).lower()
    if host=='oneworldz.com' and 'donateworldz' in x: add('TITLE_BRAND_MISMATCH',f,f'OneWorldz page carries DonateWorldz title “{ttl(t)}”')
    if len(issues)>=39: break
# 40-49 canonical missing
priority=[]
for row in pages:
    path=urlparse(row[0]).path.strip('/')
    if not path or any(x in path for x in ('command-centre','heroes/','community-support','davis-family','community-impact','jayjay-support','hope-chest','tokens','wallet-safety','scam-awareness')): priority.append(row)
for u,f,t in priority:
    if cap('MISSING_CANONICAL')>=10: break
    if not re.search(r'<link\b[^>]*rel=["\']canonical["\']',t,re.I): add('MISSING_CANONICAL',f,'important page has no canonical URL')
# 50-59 incomplete social previews
for u,f,t in priority:
    if cap('MISSING_SOCIAL_PREVIEW')>=10: break
    low=t.lower(); miss=[]
    for token,label in [('property="og:title"','og:title'),('property="og:description"','og:description'),('property="og:image"','og:image'),('name="twitter:card"','twitter:card')]:
        if token not in low: miss.append(label)
    if miss: add('MISSING_SOCIAL_PREVIEW',f,'missing '+', '.join(miss))
# 60-64 favicon absent
for u,f,t in priority:
    if cap('MISSING_FAVICON')>=5: break
    if not re.search(r'<link\b[^>]*rel=["\'][^"\']*(?:icon|shortcut icon)[^"\']*["\']',t,re.I): add('MISSING_FAVICON',f,'page has no favicon/icon link')
# 65-74 required footer copy absent
for u,f,t in pages:
    if cap('MISSING_REQUIRED_FOOTER')>=10: break
    low=t.lower()
    if 'created with the vision' not in low or 'make the difference' not in low: add('MISSING_REQUIRED_FOOTER',f,'missing required Created with the Vision and/or Make the Difference footer language')
# 75 OneWorldz community page copied from DonateWorldz
owc=ROOT/'oneworldz.com/community-support/index.html'; dic=ROOT/'donateworldz.com/community-impact/index.html'
if owc.is_file() and dic.is_file():
    a=re.sub(r'https?://[^"\'\s<]+','URL',main(read(owc)).lower()); b=re.sub(r'https?://[^"\'\s<]+','URL',main(read(dic)).lower())
    if re.sub(r'\s+',' ',a)==re.sub(r'\s+',' ',b): add('DUPLICATE_PAGE_BODY',owc,'main body is copied from DonateWorldz Community Impact')
# 76-79 OneWorldz direct requests
one=ROOT/'oneworldz.com/index.html'
if one.is_file() and 'href="/heroes/"' not in read(one).lower(): add('ONEWORLDZ_REQUEST',one,'homepage has no Real Heroes doorway')
for rel,msg in [('oneworldz.com/gpt/index.html','OneWorldz GPT target linked from homepage does not exist'),('oneworldz.com/directory/index.html','OneWorldz directory target linked from homepage does not exist'),('oneworldz.com/acknowledgements/index.html','required Acknowledgements page does not exist')]:
    p=ROOT/rel
    if not p.is_file(): add('ONEWORLDZ_REQUEST',p,msg)
# 80-84 acknowledgements missing from key roots
for host in ('oneworldz.com','cryptoworldz.xyz','donateworldz.com','foodworldz.com','purplediamondcrew.com'):
    f=ROOT/host/'index.html'
    if f.is_file() and 'acknowledg' not in read(f).lower(): add('ACKNOWLEDGEMENTS_MISSING',f,'no Acknowledgements link/section despite required final placement')
# 85-89 Command Centre missing protected systems/pathways
cc=ROOT/'cryptoworldz.xyz/command-centre/index.html'
if cc.is_file():
    low=read(cc).lower()
    for pat,msg in [(r'\bzed\b','Zed is not represented'),(r'grace|g\.r\.a\.c\.e','G.R.A.C.E. is not represented'),(r'\brecap\b','RECAP is not represented'),(r'cryptoworldzbot|t\.me/','no direct Zed Bot launch link'),(r'miniapp|mini app','no MiniApp pathway')]:
        if not re.search(pat,low): add('COMMAND_CENTRE_REQUEST',cc,msg)
# 90 PDC ten-token request
pdc=ROOT/'purplediamondcrew.com/index.html'
if pdc.is_file():
    toks=set(re.findall(r'\$[a-z0-9]{2,16}\b',read(pdc),re.I))
    if len(toks)<10: add('PDC_REQUEST',pdc,f'only {len(toks)} legacy token ticker(s) exposed; requested ten genuine positions')
# 91-95 missing og:url on five master roots
for host in ('oneworldz.com','cryptoworldz.xyz','solworldz.xyz','donateworldz.com','purplediamondcrew.com'):
    f=ROOT/host/'index.html'; low=read(f).lower() if f.is_file() else ''
    if f.is_file() and 'property="og:url"' not in low: add('MISSING_OG_URL',f,'homepage has no og:url social canonical')
# 96-100 user requested logo-home behavior is absent: brand anchor is text, not the actual logo/image.
for host in ('oneworldz.com','cryptoworldz.xyz','solworldz.xyz','donateworldz.com','purplediamondcrew.com'):
    f=ROOT/host/'index.html'; t=read(f) if f.is_file() else ''
    brand=re.search(r'<a\b[^>]*class=["\'][^"\']*brand[^"\']*["\'][^>]*>(.*?)</a>',t,re.I|re.S)
    if f.is_file() and (not brand or '<img' not in brand.group(1).lower()): add('LOGO_HOME_MISSING',f,'brand/home control is text-only; requested clickable logo returning home is missing')
print(f'AUDIT_SCANNED pages={len(pages)} urls={len(urls)}')
for i,(c,p,m) in enumerate(issues[:LIMIT],1): print(f'ISSUE {i:03d} | {c} | {p} | {m}')
print(f'AUDIT_FOUND={len(issues[:LIMIT])}')
if len(issues)<LIMIT: raise SystemExit(f'AUDIT_NEEDS_MORE evidence-backed issues={len(issues)}')
raise SystemExit('AUDIT_STOP_AT_100')
