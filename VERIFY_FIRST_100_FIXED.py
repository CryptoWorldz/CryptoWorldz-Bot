#!/usr/bin/env python3
from pathlib import Path
from urllib.parse import urlparse
import re,sys
ROOT=Path(__file__).resolve().parent
errors=[]
def fail(label,path,msg): errors.append((label,str(path),msg))
def read(p): return p.read_text(encoding='utf-8',errors='ignore') if p.is_file() else ''
def first_img(p):
    t=read(p); m=re.search(r'<main\b.*?</main>',t,re.I|re.S); s=m.group(0) if m else t
    q=re.search(r'<img\b[^>]*src=["\']([^"\']+)',s,re.I); return q.group(1) if q else ''
def must_file(p,label):
    if not p.is_file(): fail(label,p,'missing file')
# 1-2 wrong main image
for rel in ['cryptoworldz.xyz/raaiiidd/index.html','cryptoworldz.xyz/community/index.html']:
    p=ROOT/rel
    if first_img(p)=='/we-need-you.png': fail('WRONG_MAIN_IMAGE',p,'still uses /we-need-you.png')
# 3-20 generic hero targets
targets=['oneworldz.com/clean-water/index.html','oneworldz.com/medical-care/index.html','oneworldz.com/children/index.html','oneworldz.com/volunteers/index.html','oneworldz.com/destinations-of-hope/index.html','oneworldz.com/heroes/just-knate/index.html','oneworldz.com/heroes/victor-good-boss/index.html','oneworldz.com/heroes/sam-weidenhofer/index.html','oneworldz.com/heroes/dylan-thiry/index.html','oneworldz.com/heroes/bi-phakathi/index.html','oneworldz.com/heroes/mdmotivator/index.html','oneworldz.com/heroes/bob-roofer/index.html','oneworldz.com/heroes/solmotivator/index.html','cryptoworldz.xyz/command-centre/index.html','cryptoworldz.xyz/zed/index.html','cryptoworldz.xyz/recap/index.html','cryptoworldz.xyz/wallet-safety/index.html','cryptoworldz.xyz/scam-awareness/index.html']
for rel in targets:
    p=ROOT/rel
    if first_img(p) in ('/hero.png','hero.png',''): fail('GENERIC_HERO',p,'still generic or missing main image')
# exact hero identities
expected={'just-knate':'just-knate.webp','victor-good-boss':'victor-good-boss.webp','sam-weidenhofer':'sam-weidenhofer.webp','dylan-thiry':'dylan-thiry.webp','bi-phakathi':'bi-phakathi.webp','mdmotivator':'mdmotivator.webp','bob-roofer':'heroes-world.webp'}
for slug,asset in expected.items():
    p=ROOT/'oneworldz.com/heroes'/slug/'index.html'
    if asset not in first_img(p): fail('HERO_IMAGE_MAP',p,f'expected {asset}, got {first_img(p)}')
# 21-30 visual-fix css references resolve
for host in ('foodworldz.com','donateworldz.com','oneworldz.com'): must_file(ROOT/host/'visual-fix.css','VISUAL_FIX_CSS')
asset_pages=['foodworldz.com/index.html','foodworldz.com/meals/index.html','foodworldz.com/clean-water/index.html','foodworldz.com/shelter/index.html','foodworldz.com/education/index.html','foodworldz.com/community/index.html','donateworldz.com/community-impact/index.html','donateworldz.com/jayjay-support/index.html','donateworldz.com/davis-family/index.html','oneworldz.com/community-support/index.html']
for rel in asset_pages:
    p=ROOT/rel
    if '/visual-fix.css' in read(p) and not (ROOT/rel.split('/')[0]/'visual-fix.css').is_file(): fail('BROKEN_LOCAL_ASSET',p,'visual-fix.css unresolved')
# 31-38 missing pages
for rel in ['oneworldz.com/gpt/index.html','oneworldz.com/directory/index.html','cryptoworldz.xyz/worldzpad/index.html','cryptoworldz.xyz/wldz/index.html','hodlerworldz.xyz/learn/index.html','hodlerworldz.xyz/builders/index.html','hodlergalaxy.xyz/learn/index.html','hodlergalaxy.xyz/builders/index.html']:
    must_file(ROOT/rel,'MISSING_DESTINATION')
# 39 title
p=ROOT/'oneworldz.com/community-support/index.html'
if '<title>Community Support | OneWorldz</title>' not in read(p): fail('TITLE_BRAND',p,'wrong title remains')
# 40-49 canonicals
for host in ['oneworldz.com','cryptoworldz.xyz','solworldz.xyz','ethworldz.xyz','baseworldz.xyz','bnbworldz.xyz','xrpworldz.xyz','suiworldz.xyz','hyperworldz.xyz','robinworldz.xyz']:
    p=ROOT/host/'index.html'
    if not re.search(r'<link\b[^>]*rel=["\']canonical["\']',read(p),re.I): fail('CANONICAL',p,'canonical missing')
# 50-59 social preview targets
social=['oneworldz.com/index.html','oneworldz.com/heroes/just-knate/index.html','oneworldz.com/heroes/victor-good-boss/index.html','oneworldz.com/heroes/sam-weidenhofer/index.html','oneworldz.com/heroes/dylan-thiry/index.html','oneworldz.com/heroes/bi-phakathi/index.html','oneworldz.com/heroes/mdmotivator/index.html','oneworldz.com/heroes/bob-roofer/index.html','oneworldz.com/heroes/solmotivator/index.html','cryptoworldz.xyz/index.html']
for rel in social:
    p=ROOT/rel; low=read(p).lower()
    for x in ['property="og:title"','property="og:description"','property="og:image"','name="twitter:card"']:
        if x not in low: fail('SOCIAL_META',p,f'{x} missing')
# 60-64 favicon targets
for rel in ['oneworldz.com/index.html','oneworldz.com/heroes/just-knate/index.html','oneworldz.com/heroes/victor-good-boss/index.html','oneworldz.com/heroes/sam-weidenhofer/index.html','oneworldz.com/heroes/dylan-thiry/index.html']:
    p=ROOT/rel
    if 'rel="icon"' not in read(p).lower(): fail('FAVICON',p,'icon missing')
# 65-74 footer targets
for slug in ['ecosystem','vision','mission','make-the-difference','global-impact','kindness','hope','action','dignity','opportunity']:
    p=ROOT/'oneworldz.com'/slug/'index.html'; low=read(p).lower()
    if 'created with the vision' not in low or 'make the difference' not in low: fail('FOOTER',p,'required footer copy missing')
# 75 unique community page
p=ROOT/'oneworldz.com/community-support/index.html'
if 'data-oneworldz-community="1"' not in read(p): fail('COMMUNITY_UNIQUE',p,'unique OneWorldz community section missing')
# 76-79 OneWorldz requests
if 'href="/heroes/"' not in read(ROOT/'oneworldz.com/index.html'): fail('REAL_HEROES',ROOT/'oneworldz.com/index.html','doorway missing')
for rel in ['oneworldz.com/gpt/index.html','oneworldz.com/directory/index.html','oneworldz.com/acknowledgements/index.html']:
    must_file(ROOT/rel,'ONEWORLDZ_PAGE')
# 80-84 acknowledgement link on key roots
for host in ['oneworldz.com','cryptoworldz.xyz','donateworldz.com','foodworldz.com','purplediamondcrew.com']:
    p=ROOT/host/'index.html'
    if 'acknowledg' not in read(p).lower(): fail('ACK_LINK',p,'Acknowledgements link missing')
# 85-89 Command Centre
p=ROOT/'cryptoworldz.xyz/command-centre/index.html'; low=read(p).lower()
for token in ['zed','auto','g.r.a.c.e.','recap','https://t.me/cryptoworldzbot','href="/miniapp/"']:
    if token not in low: fail('COMMAND_CENTRE',p,f'{token} missing')
# 90 PDC ten positions, eight confirmed labels and two explicitly non-invented archive positions
p=ROOT/'purplediamondcrew.com/index.html'; t=read(p)
if len(re.findall(r'data-legacy-position=["\']\d+["\']',t,re.I))<10: fail('PDC_10',p,'fewer than ten legacy positions')
for label in ['PDC (original)','PDC1','PDCMAGA','PDCShares','PurpleDC','OG Purple','PCC1']:
    if label.lower() not in t.lower(): fail('PDC_10',p,f'confirmed legacy label {label} missing')
# 91-95 og:url
for host in ['oneworldz.com','cryptoworldz.xyz','solworldz.xyz','donateworldz.com','purplediamondcrew.com']:
    p=ROOT/host/'index.html'
    if 'property="og:url"' not in read(p).lower(): fail('OG_URL',p,'og:url missing')
# 96-100 image logo returns home
for host in ['oneworldz.com','cryptoworldz.xyz','solworldz.xyz','donateworldz.com','purplediamondcrew.com']:
    p=ROOT/host/'index.html'; t=read(p)
    m=re.search(r'<a\b(?=[^>]*class=["\'][^"\']*brand[^"\']*["\'])(?=[^>]*href=["\']/["\'])[^>]*>(.*?)</a>',t,re.I|re.S)
    if not m or '<img' not in m.group(1).lower(): fail('LOGO_HOME',p,'image logo home control missing')
# Extra protection for the user-reported GPT-main-image problem across the audited 145 URLs.
urls=[u.strip() for u in (ROOT/'.ecosystem-urls.txt').read_text().splitlines() if u.strip()]
for u in urls:
    q=urlparse(u); rel=q.path.strip('/'); p=ROOT/q.netloc/(rel if rel else '')/'index.html'
    if not p.is_file(): continue
    route=q.path.lower()
    if any(x in route for x in ('/gpt','aiworldz','oneworldz-gpt')): continue
    src=first_img(p)
    if 'gpt' in src.lower(): fail('GPT_MAIN_IMAGE',p,f'GPT artwork still leads unrelated page: {src}')
if errors:
    for i,(a,p,m) in enumerate(errors,1): print(f'FIX_VERIFY_FAIL {i:03d} | {a} | {p} | {m}')
    print(f'FIRST_100_FIXED=FAIL remaining={len(errors)}')
    sys.exit(1)
print('FIRST_100_FIXED=PASS verified=100 gpt_main_image_crosscheck=PASS')
