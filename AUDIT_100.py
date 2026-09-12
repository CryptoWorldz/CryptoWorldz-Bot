#!/usr/bin/env python3
from pathlib import Path
from urllib.parse import urlparse
import re, hashlib
from collections import defaultdict

ROOT=Path(__file__).resolve().parent
LIMIT=100
issues=[]
seen=set()

def add(cat,path,msg):
    key=(cat,str(path),msg)
    if key in seen or len(issues)>=LIMIT: return
    seen.add(key); issues.append((cat,str(path),msg))

def cap(cat): return sum(1 for c,_,__ in issues if c==cat)
def text_of(p): return p.read_text(encoding='utf-8',errors='ignore')
def clean(s): return re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',s)).strip()
def main_scope(t):
    m=re.search(r'<main\b.*?</main>',t,re.I|re.S); return m.group(0) if m else t

def first_main_img(t):
    m=re.search(r'<img\b[^>]*src=["\']([^"\']+)["\'][^>]*>',main_scope(t),re.I)
    return m.group(1) if m else ''

def title(t):
    m=re.search(r'<title>(.*?)</title>',t,re.I|re.S); return clean(m.group(1)) if m else ''

def hrefs(t): return re.findall(r'href=["\']([^"\']+)["\']',t,re.I)

def local_page(site,href):
    if not href.startswith('/') or href.startswith('//'): return None
    raw=href.split('#')[0].split('?')[0]
    if not raw: raw='/'
    # Only navigation/page-looking URLs; never treat CSS/JS/images as pages.
    last=raw.rstrip('/').split('/')[-1]
    if '.' in last: return None
    return site/raw.strip('/')/'index.html' if raw.strip('/') else site/'index.html'

urls=[u.strip() for u in (ROOT/'.ecosystem-urls.txt').read_text(encoding='utf-8').splitlines() if u.strip()]
pages=[]
for u in urls:
    p=urlparse(u); rel=p.path.strip('/')
    f=ROOT/p.netloc/(rel if rel else '')/'index.html'
    if f.is_file(): pages.append((u,f,text_of(f)))

# A — Wrong subject assigned as the page's main image.
wrong_asset_tokens={
 'oneworldz-gpt':['/gpt','aiworldz','oneworldz-gpt'],
 'little-legend':['little-legend','musicworldz'],
 'five-leaders':['command-centre','builders','apply'],
 'zed-command':['command-centre','/zed'],
 'zed-grace-auto':['command-centre','/zed','/grace','/auto'],
 'blockchain-portal':['cryptoworldz','/worldz'],
 'oneworldz-master':['oneworldz.com/','visionworldz'],
 'we-need-you':['builders','apply','movieworldz'],
}
for u,f,t in pages:
    if cap('WRONG_MAIN_IMAGE')>=12: break
    src=first_main_img(t).lower(); route=u.lower()
    for asset,allowed in wrong_asset_tokens.items():
        if asset in src and not any(a in route for a in allowed):
            add('WRONG_MAIN_IMAGE',f,f'main image {src} is unrelated to {urlparse(u).path or "/"}')
            break

# B — Specialized pages falling back to generic site hero instead of their own approved subject art.
special={'command-centre','zed','recap','wallet-safety','scam-awareness','governance','launchpads','tokens',
         'heroes/','community-support','davis-family','community-impact','jayjay-support','hope-chest','legacy',
         'destinations-of-hope','medical-care','clean-water','children','volunteers'}
for u,f,t in pages:
    if cap('GENERIC_HERO_ON_SPECIAL_PAGE')>=18: break
    route=urlparse(u).path.strip('/').lower()
    if route and any(s in route for s in special) and first_main_img(t) in ('/hero.png','hero.png'):
        add('GENERIC_HERO_ON_SPECIAL_PAGE',f,f'{route} uses generic /hero.png instead of page-specific artwork')

# C — Existing references to files that do not exist in the target site build.
asset_ext=('.css','.js','.png','.jpg','.jpeg','.webp','.avif','.svg','.ico','.woff','.woff2','.mp4','.wav')
for u,f,t in pages:
    if cap('BROKEN_LOCAL_ASSET')>=10: break
    site=ROOT/urlparse(u).netloc
    refs=re.findall(r'(?:src|href)=["\'](/[^"\'#?]+)["\']',t,re.I)
    for src in refs:
        if not src.lower().endswith(asset_ext): continue
        target=site/src.lstrip('/')
        if not target.is_file():
            add('BROKEN_LOCAL_ASSET',f,f'{src} is referenced but the file does not exist')
            if cap('BROKEN_LOCAL_ASSET')>=10: break

# D — Real internal navigation targets that do not exist.
for u,f,t in pages:
    if cap('BROKEN_LOCAL_PAGE_LINK')>=8: break
    site=ROOT/urlparse(u).netloc
    for h in hrefs(t):
        target=local_page(site,h)
        if target is not None and not target.is_file():
            add('BROKEN_LOCAL_PAGE_LINK',f,f'internal navigation {h} has no generated page')
            if cap('BROKEN_LOCAL_PAGE_LINK')>=8: break

# E — Wrong page title/brand copied between separate products.
for u,f,t in pages:
    if cap('TITLE_BRAND_MISMATCH')>=6: break
    ttl=title(t).lower(); host=urlparse(u).netloc.lower()
    if host=='oneworldz.com' and 'donateworldz' in ttl:
        add('TITLE_BRAND_MISMATCH',f,f'OneWorldz page carries DonateWorldz title "{title(t)}"')
    elif host=='donateworldz.com' and 'oneworldz' in ttl and 'donateworldz' not in ttl:
        add('TITLE_BRAND_MISMATCH',f,f'DonateWorldz page carries wrong product title "{title(t)}"')
    elif host=='cryptoworldz.xyz' and 'oneworldz' in ttl and 'cryptoworldz' not in ttl:
        add('TITLE_BRAND_MISMATCH',f,f'CryptoWorldz page carries wrong product title "{title(t)}"')

# F — Canonical URLs missing on distinct important pages.
priority=[]
for row in pages:
    u=row[0]; path=urlparse(u).path.strip('/')
    if not path or any(x in path for x in ('command-centre','heroes/','community-support','davis-family','community-impact','jayjay-support','hope-chest','tokens','wallet-safety','scam-awareness')):
        priority.append(row)
for u,f,t in priority:
    if cap('MISSING_CANONICAL')>=10: break
    if not re.search(r'<link\b[^>]*rel=["\']canonical["\']',t,re.I):
        add('MISSING_CANONICAL',f,'important page has no canonical URL')

# G — Social preview package missing on distinct important pages.
for u,f,t in priority:
    if cap('MISSING_SOCIAL_PREVIEW')>=10: break
    low=t.lower(); missing=[]
    if 'property="og:title"' not in low and "property='og:title'" not in low: missing.append('og:title')
    if 'property="og:description"' not in low and "property='og:description'" not in low: missing.append('og:description')
    if 'property="og:image"' not in low and "property='og:image'" not in low: missing.append('og:image')
    if 'name="twitter:card"' not in low and "name='twitter:card'" not in low: missing.append('twitter:card')
    if missing: add('MISSING_SOCIAL_PREVIEW',f,'missing '+', '.join(missing))

# H — Brand identity favicon missing on representative roots/key pages.
for u,f,t in priority:
    if cap('MISSING_FAVICON')>=5: break
    if not re.search(r'<link\b[^>]*rel=["\'][^"\']*(?:icon|shortcut icon)[^"\']*["\']',t,re.I):
        add('MISSING_FAVICON',f,'page has no favicon/icon link')

# I — Required user footer language missing, page by page.
for u,f,t in pages:
    if cap('MISSING_REQUIRED_FOOTER')>=10: break
    low=t.lower()
    if 'created with the vision' not in low or 'make the difference' not in low:
        add('MISSING_REQUIRED_FOOTER',f,'missing required “Created with the Vision” and/or “Make the Difference” footer language')

# J — Thin/generic specialized pages: one-section brochure pages where user asked for a real feature/destination.
for u,f,t in pages:
    if cap('THIN_SPECIAL_PAGE')>=8: break
    route=urlparse(u).path.strip('/').lower()
    if not route or not any(x in route for x in ('command-centre','zed','recap','governance','launchpads','tokens','wallet-safety','scam-awareness','hope-chest','legacy','community-support')): continue
    scope=main_scope(t)
    sections=len(re.findall(r'<section\b',scope,re.I))
    visible=clean(scope)
    if sections<=1 and len(visible)<900:
        add('THIN_SPECIAL_PAGE',f,f'{route} is only {sections} section / {len(visible)} visible characters, not the requested functional destination')

# K — Exact duplicate main-body markup across different URLs (same page wearing different route names).
groups=defaultdict(list)
for u,f,t in pages:
    scope=main_scope(t)
    # Normalize only domain/route labels and whitespace, leaving actual substantive copy intact.
    norm=re.sub(r'https?://[^"\'\s<]+','URL',scope.lower())
    norm=re.sub(r'\b(oneworldz|cryptoworldz|solworldz|ethworldz|baseworldz|bnbworldz|xrpworldz|suiworldz|hyperworldz|robinworldz|hodlerworldz|hodlergalaxy)\b','WORLD',norm)
    norm=re.sub(r'\s+',' ',norm)
    groups[hashlib.sha256(norm.encode()).hexdigest()].append((u,f))
for grp in groups.values():
    if len(grp)>1 and cap('DUPLICATE_PAGE_BODY')<6:
        for u,f in grp[1:]:
            add('DUPLICATE_PAGE_BODY',f,f'main body is effectively duplicated from {grp[0][0]}')
            if cap('DUPLICATE_PAGE_BODY')>=6: break

# L — OneWorldz requested destinations/content.
one=ROOT/'oneworldz.com/index.html'
if one.is_file():
    low=text_of(one).lower()
    for needle,msg in [
      ('href="/heroes/"','homepage has no Real Heroes doorway'),
      ('href="/community-support/"','homepage has no Community Support doorway'),
      ('helping the people','core “Helping the People who Help People” mission line is missing'),
      ('clean water','clean-water mission is missing from homepage'),
      ('medical','medical-care mission is missing from homepage'),
      ('education','education mission is missing from homepage'),
      ('dignity','dignity mission is missing from homepage')]:
        if needle not in low: add('ONEWORLDZ_REQUEST',one,msg)
for rel,msg in [
 ('oneworldz.com/gpt/index.html','OneWorldz GPT target linked from homepage does not exist'),
 ('oneworldz.com/directory/index.html','OneWorldz directory target linked from homepage does not exist'),
 ('oneworldz.com/acknowledgements/index.html','required Acknowledgements page does not exist')]:
    p=ROOT/rel
    if not p.is_file(): add('ONEWORLDZ_REQUEST',p,msg)

# M — Acknowledgements is required last; key roots have no route/link at all.
for host in ('oneworldz.com','cryptoworldz.xyz','donateworldz.com','foodworldz.com','purplediamondcrew.com'):
    if cap('ACKNOWLEDGEMENTS_MISSING')>=5: break
    f=ROOT/host/'index.html'
    if f.is_file() and 'acknowledg' not in text_of(f).lower():
        add('ACKNOWLEDGEMENTS_MISSING',f,'no Acknowledgements link/section despite required final placement')

# N — Command Centre Ultimate requested protected systems and direct launch pathways.
cc=ROOT/'cryptoworldz.xyz/command-centre/index.html'
if cc.is_file():
    low=text_of(cc).lower()
    checks=[
      (r'\bzed\b','Zed is not represented'),(r'\bauto\b|a\.u\.t\.o','AUTO is not represented'),
      (r'grace|g\.r\.a\.c\.e','G.R.A.C.E. is not represented'),(r'\brecap\b','RECAP is not represented'),
      (r'cryptoworldzbot|t\.me/','no direct Zed Bot launch link'),(r'miniapp|mini app','no MiniApp pathway')]
    for pat,msg in checks:
        if not re.search(pat,low): add('COMMAND_CENTRE_REQUEST',cc,msg)

# O — PDC requested Hope Chest + ten genuine legacy positions.
pdc=ROOT/'purplediamondcrew.com/index.html'
if pdc.is_file():
    low=text_of(pdc).lower()
    if 'hope chest' not in low: add('PDC_REQUEST',pdc,'Hope Chest is missing from PDC homepage')
    if 'legacy' not in low: add('PDC_REQUEST',pdc,'legacy/revival pathway is missing from PDC homepage')
    tickers=set(re.findall(r'\$[a-z0-9]{2,16}\b',text_of(pdc),re.I))
    if len(tickers)<10: add('PDC_REQUEST',pdc,f'only {len(tickers)} legacy token ticker(s) exposed; requested ten genuine positions')

# P — OneWorldz GPT content/art must never be a main image on unrelated routes.
for u,f,t in pages:
    if cap('GPT_MISPLACED')>=6: break
    src=first_main_img(t).lower(); low=t.lower()
    if ('oneworldz-gpt' in src or 'oneworldz gpt' in low) and not any(x in u.lower() for x in ('/gpt','aiworldz','oneworldz-gpt')):
        add('GPT_MISPLACED',f,'OneWorldz GPT content/art is placed on a non-GPT destination')

print(f'AUDIT_SCANNED pages={len(pages)} urls={len(urls)}')
for i,(cat,path,msg) in enumerate(issues[:LIMIT],1):
    print(f'ISSUE {i:03d} | {cat} | {path} | {msg}')
print(f'AUDIT_FOUND={len(issues[:LIMIT])}')
if len(issues)<LIMIT:
    raise SystemExit(f'AUDIT_NEEDS_MORE evidence-backed issues={len(issues)}')
raise SystemExit('AUDIT_STOP_AT_100')
