#!/usr/bin/env python3
from pathlib import Path
from urllib.parse import urlparse
import re
from collections import defaultdict, Counter

ROOT=Path(__file__).resolve().parent
LIMIT=100
issues=[]
seen=set()

def add(cat,path,msg):
    key=(cat,str(path),msg)
    if key in seen or len(issues)>=LIMIT:
        return
    seen.add(key)
    issues.append((cat,str(path),msg))

def cap(cat):
    return sum(1 for c,_,__ in issues if c==cat)

def text_of(path):
    return path.read_text(encoding='utf-8',errors='ignore')

def strip_tags(s):
    return re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',s)).strip()

def route_tokens(path):
    parts=[p for p in path.parts if p not in ('index.html',)]
    toks=[]
    for p in parts[-3:]:
        toks += [x for x in re.split(r'[-_/]+',p.lower()) if len(x)>2 and x not in {'com','xyz','oneworldz','cryptoworldz','worldz'}]
    aliases={'aiworldz':['ai'],'musicworldz':['music'],'movieworldz':['movie'],'visionworldz':['vision'],
             'impactworldz':['impact'],'charityworldz':['charity'],'businessworldz':['business'],
             'learnworldz':['learn'],'artworldz':['art'],'command-centre':['command','centre'],
             'jayjay-support':['jayjay'],'community-impact':['community','impact'],'davis-family':['davis','family']}
    for p in parts:
        toks += aliases.get(p.lower(),[])
    return list(dict.fromkeys(toks))

urls=[]
urlfile=ROOT/'.ecosystem-urls.txt'
if urlfile.is_file():
    urls=[u.strip() for u in urlfile.read_text(encoding='utf-8').splitlines() if u.strip()]

pages=[]
for u in urls:
    p=urlparse(u); rel=p.path.strip('/')
    f=ROOT/p.netloc/(rel if rel else '')/'index.html'
    if f.is_file(): pages.append((u,f,text_of(f)))

# 1. Main-image mapping: route-specific pages must not use unrelated known artwork.
wrong_asset_tokens={
    'oneworldz-gpt':['gpt','aiworldz'], 'little-legend':['little-legend','musicworldz'],
    'five-leaders':['command-centre','builders','apply'], 'zed-command':['command-centre','zed'],
    'zed-grace-auto':['command-centre','zed','grace','auto'], 'blockchain-portal':['cryptoworldz','worldz'],
    'oneworldz-master':['oneworldz','visionworldz'], 'we-need-you':['builders','apply','movieworldz'],
}
for u,f,t in pages:
    if cap('WRONG_MAIN_IMAGE')>=18: break
    main=re.search(r'<main\b.*?</main>',t,re.I|re.S)
    scope=main.group(0) if main else t
    im=re.search(r'<img\b[^>]*src=["\']([^"\']+)["\'][^>]*>',scope,re.I)
    if not im: continue
    src=im.group(1).lower(); route=u.lower()
    for asset,allowed in wrong_asset_tokens.items():
        if asset in src and not any(a in route for a in allowed):
            add('WRONG_MAIN_IMAGE',f,f'main image {src} belongs to {"/".join(allowed)}, not {urlparse(u).path or "/"}')
            break

# 2. Specialized routes still using the site-wide generic /hero.png instead of page-specific art.
special_words={'command-centre','zed','auto','grace','recap','wallet-safety','scam-awareness','governance','builders','launchpads','tokens','worldzpad','wldz','heroes','community-support','davis-family','community-impact','jayjay-support','hope-chest','legacy'}
for u,f,t in pages:
    if cap('GENERIC_HERO_ON_SPECIAL_PAGE')>=14: break
    route=urlparse(u).path.strip('/').lower()
    if not route or not any(w in route for w in special_words): continue
    main=re.search(r'<main\b.*?</main>',t,re.I|re.S); scope=main.group(0) if main else t
    im=re.search(r'<img\b[^>]*src=["\']([^"\']+)["\']',scope,re.I)
    if im and im.group(1) in ('/hero.png','hero.png'):
        add('GENERIC_HERO_ON_SPECIAL_PAGE',f,f'{route} uses generic site hero instead of route-specific approved artwork')

# 3. Image alt should match route/page subject.
for u,f,t in pages:
    if cap('IMAGE_ALT_MISMATCH')>=8: break
    toks=route_tokens(f)
    if not toks: continue
    main=re.search(r'<main\b.*?</main>',t,re.I|re.S); scope=main.group(0) if main else t
    im=re.search(r'<img\b[^>]*alt=["\']([^"\']*)["\'][^>]*>',scope,re.I)
    if im:
        alt=im.group(1).lower()
        if alt and not any(tok in alt for tok in toks):
            add('IMAGE_ALT_MISMATCH',f,f'main image alt "{im.group(1)}" does not identify this route ({"/".join(toks[:3])})')

# 4. Broken local assets.
for u,f,t in pages:
    if cap('BROKEN_LOCAL_ASSET')>=8: break
    site=ROOT/urlparse(u).netloc
    for src in re.findall(r'(?:src|href)=["\'](/[^"\'#?]+)["\']',t,re.I):
        if src.endswith('/') or src.startswith('//'): continue
        target=site/src.lstrip('/')
        if not target.exists():
            add('BROKEN_LOCAL_ASSET',f,f'local asset reference {src} does not exist in {site.name}')
            if cap('BROKEN_LOCAL_ASSET')>=8: break

# 5. Broken local page links.
for u,f,t in pages:
    if cap('BROKEN_LOCAL_LINK')>=8: break
    site=ROOT/urlparse(u).netloc
    for href in re.findall(r'href=["\'](/[^"\'#?]*)["\']',t,re.I):
        if href.startswith('//'): continue
        target=site/href.strip('/')/'index.html' if href.strip('/') else site/'index.html'
        if not target.exists():
            add('BROKEN_LOCAL_LINK',f,f'internal link {href} points to no generated page')
            if cap('BROKEN_LOCAL_LINK')>=8: break

# 6. Route semantics: h1/title must mention the route subject on specialized pages.
for u,f,t in pages:
    if cap('ROUTE_HEADING_MISMATCH')>=8: break
    route=urlparse(u).path.strip('/').lower()
    if not route: continue
    subject=route.split('/')[-1].replace('-',' ')
    if subject in {'overview','learn','community','builders','ecosystem','about','action','education'}: continue
    h1=re.search(r'<h1\b[^>]*>(.*?)</h1>',t,re.I|re.S)
    if h1:
        h=strip_tags(h1.group(1)).lower()
        words=[w for w in subject.split() if len(w)>3]
        if words and not any(w in h for w in words):
            add('ROUTE_HEADING_MISMATCH',f,f'h1 "{strip_tags(h1.group(1))}" does not identify route subject "{subject}"')

# 7. Generic copy on pages that are supposed to be distinct experiences.
generic_phrases=['plain-language education.','connect with the worldz.','build the future together.','move between the worldz','one worldz network.']
for u,f,t in pages:
    if cap('GENERIC_COPY')>=8: break
    low=t.lower(); route=urlparse(u).path.strip('/')
    if route and sum(p in low for p in generic_phrases)>=2:
        add('GENERIC_COPY',f,'page repeats generic ecosystem filler instead of route-specific requested content')

# 8. Duplicate page titles across different routes.
title_groups=defaultdict(list)
for u,f,t in pages:
    m=re.search(r'<title>(.*?)</title>',t,re.I|re.S)
    if m: title_groups[strip_tags(m.group(1)).lower()].append((u,f))
for title,group in title_groups.items():
    if len(group)>1 and cap('DUPLICATE_TITLE')<7:
        for u,f in group[1:]:
            add('DUPLICATE_TITLE',f,f'duplicate HTML title "{title}" used by another route')
            if cap('DUPLICATE_TITLE')>=7: break

# 9. Duplicate meta descriptions on different pages.
desc_groups=defaultdict(list)
for u,f,t in pages:
    m=re.search(r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']*)',t,re.I)
    if m: desc_groups[m.group(1).strip().lower()].append((u,f))
for desc,group in desc_groups.items():
    if desc and len(group)>1 and cap('DUPLICATE_DESCRIPTION')<7:
        for u,f in group[1:]:
            add('DUPLICATE_DESCRIPTION',f,'meta description is duplicated on another route instead of describing this page')
            if cap('DUPLICATE_DESCRIPTION')>=7: break

# 10. SEO canonical missing. Keep capped so this does not dominate the audit.
for u,f,t in pages:
    if cap('MISSING_CANONICAL')>=6: break
    if 'rel="canonical"' not in t.lower() and "rel='canonical'" not in t.lower():
        add('MISSING_CANONICAL',f,'page has no canonical URL')

# 11. Social preview metadata missing on representative high-value pages.
high_value=[]
for u,f,t in pages:
    path=urlparse(u).path.strip('/')
    if not path or any(x in path for x in ('command-centre','heroes/','community-support','davis-family','community-impact','jayjay-support','hope-chest','worldzpad','tokens')):
        high_value.append((u,f,t))
for u,f,t in high_value:
    if cap('MISSING_SOCIAL_PREVIEW')>=7: break
    low=t.lower()
    missing=[]
    if 'property="og:title"' not in low: missing.append('og:title')
    if 'property="og:image"' not in low: missing.append('og:image')
    if 'name="twitter:card"' not in low: missing.append('twitter:card')
    if missing: add('MISSING_SOCIAL_PREVIEW',f,'missing '+', '.join(missing))

# 12. Structural/accessibility problems.
for u,f,t in pages:
    if cap('STRUCTURE_ACCESSIBILITY')>=6: break
    h1s=len(re.findall(r'<h1\b',t,re.I)); mains=len(re.findall(r'<main\b',t,re.I))
    imgs=re.findall(r'<img\b([^>]*)>',t,re.I)
    empty_alt=any(('alt=' not in x.lower()) or re.search(r'alt=["\']\s*["\']',x,re.I) for x in imgs)
    if h1s!=1 or mains!=1 or empty_alt:
        bits=[]
        if h1s!=1: bits.append(f'h1-count={h1s}')
        if mains!=1: bits.append(f'main-count={mains}')
        if empty_alt: bits.append('missing/empty image alt')
        add('STRUCTURE_ACCESSIBILITY',f,', '.join(bits))

# 13. User-requested ecosystem-specific checks.
def check_file(rel, cat, tests):
    f=ROOT/rel
    if not f.is_file():
        add(cat,f,'required page is missing'); return
    low=text_of(f).lower()
    for needle,msg in tests:
        if needle.lower() not in low: add(cat,f,msg)

check_file('cryptoworldz.xyz/command-centre/index.html','COMMAND_CENTRE',[
    ('zed','Zed is not represented on Command Centre'),('auto','AUTO is not represented on Command Centre'),
    ('grace','GRACE is not represented on Command Centre'),('recap','RECAP is not represented on Command Centre')])
check_file('purplediamondcrew.com/index.html','PDC',[
    ('hope chest','Hope Chest is missing from PDC homepage'),('legacy','PDC legacy/revival is missing from homepage')])
pdc=ROOT/'purplediamondcrew.com/index.html'
if pdc.is_file():
    low=text_of(pdc).lower(); tokenish=len(re.findall(r'\$[a-z0-9]{2,12}\b',low,re.I))
    if tokenish<10: add('PDC',pdc,f'PDC homepage exposes only {tokenish} token tickers; requested legacy revival requires ten genuine positions')

one=ROOT/'oneworldz.com/index.html'
if one.is_file():
    low=text_of(one).lower()
    for needle,msg in [
        ('helping the people','core Helping the People who Help People mission line missing'),
        ('food','food mission pathway missing'),('clean water','clean-water mission pathway missing'),
        ('medical','medical-care mission pathway missing'),('education','education mission pathway missing'),
        ('dignity','dignity mission pathway missing'),('real heroes','Real Heroes doorway missing'),
        ('community support','Community Support doorway missing')]:
        if needle not in low: add('ONEWORLDZ_MISSION',one,msg)

# 14. OneWorldz GPT must be constrained to GPT/AI contexts.
for u,f,t in pages:
    low=t.lower()
    if 'oneworldz-gpt' in low and not any(x in u.lower() for x in ('aiworldz','oneworldz-gpt','/gpt')):
        add('GPT_MISPLACED',f,'OneWorldz GPT artwork/content appears on a non-GPT main page')
        if cap('GPT_MISPLACED')>=6: break

# 15. Wrong/mobile image substitutions signaled by picture/source markup where mobile src differs semantically from desktop.
for u,f,t in pages:
    if cap('MOBILE_IMAGE_SWAP')>=7: break
    for pic in re.findall(r'<picture\b.*?</picture>',t,re.I|re.S):
        srcs=re.findall(r'(?:src|srcset)=["\']([^"\']+)',pic,re.I)
        if len(srcs)>=2:
            names=[Path(s.split('?')[0]).stem.lower() for s in srcs]
            base=[re.sub(r'[-_](desktop|mobile)$','',n) for n in names]
            if len(set(base))>1:
                add('MOBILE_IMAGE_SWAP',f,f'desktop/mobile picture sources are different subjects: {srcs[:2]}')
                break

# Stop exactly at 100, as requested.
print(f'AUDIT_SCANNED pages={len(pages)} urls={len(urls)}')
for i,(cat,path,msg) in enumerate(issues[:LIMIT],1):
    print(f'ISSUE {i:03d} | {cat} | {path} | {msg}')
print(f'AUDIT_FOUND={len(issues[:LIMIT])}')
if len(issues)<LIMIT:
    raise SystemExit(f'AUDIT_NEEDS_MORE evidence-backed issues={len(issues)}')
raise SystemExit('AUDIT_STOP_AT_100')
