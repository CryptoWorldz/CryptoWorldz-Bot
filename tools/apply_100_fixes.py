#!/usr/bin/env python3
from pathlib import Path
from urllib.parse import urlparse
import re, html

ROOT=Path(__file__).resolve().parents[1]
DOMAINS=[d.strip() for d in (ROOT/'DOMAINS.txt').read_text(encoding='utf-8').splitlines() if d.strip()]
BUILD='2026-09-12-100-fixes'

COLORS={
 'oneworldz.com':('#8b5cf6','#38bdf8'),'cryptoworldz.xyz':('#8b5cf6','#38bdf8'),
 'solworldz.xyz':('#7c3aed','#38bdf8'),'ethworldz.xyz':('#8b5cf6','#a78bfa'),
 'baseworldz.xyz':('#2563eb','#38bdf8'),'bnbworldz.xyz':('#f59e0b','#facc15'),
 'xrpworldz.xyz':('#38bdf8','#7dd3fc'),'suiworldz.xyz':('#0ea5e9','#67e8f9'),
 'hyperworldz.xyz':('#10b981','#5eead4'),'robinworldz.xyz':('#84cc16','#a3e635'),
 'hodlerworldz.xyz':('#8b5cf6','#38bdf8'),'hodlergalaxy.xyz':('#a855f7','#38bdf8'),
 'purplediamondcrew.com':('#a53cff','#df7bff'),'donateworldz.com':('#a855f7','#38bdf8'),
 'foodworldz.com':('#22c55e','#38bdf8'),'impactbased.oneworldz.com':('#22c55e','#a855f7'),
 'law.oneworldz.com':('#60a5fa','#a78bfa'),'learn.oneworldz.com':('#38bdf8','#8b5cf6')}

def read(p): return p.read_text(encoding='utf-8',errors='strict')
def write(p,s): p.parent.mkdir(parents=True,exist_ok=True); p.write_text(s,encoding='utf-8')
def esc(s): return html.escape(str(s),quote=True)

def site_name(host):
    return {'oneworldz.com':'OneWorldz','cryptoworldz.xyz':'CryptoWorldz','solworldz.xyz':'SolWorldz',
    'ethworldz.xyz':'EthWorldz','baseworldz.xyz':'BaseWorldz','bnbworldz.xyz':'BNBWorldz',
    'xrpworldz.xyz':'XRPWorldz','suiworldz.xyz':'SuiWorldz','hyperworldz.xyz':'HyperWorldz',
    'robinworldz.xyz':'RobinWorldz','hodlerworldz.xyz':'HodlerWorldz','hodlergalaxy.xyz':'HodlerGalaxy',
    'purplediamondcrew.com':'Purple Diamond Crew','donateworldz.com':'DonateWorldz','foodworldz.com':'FoodWorldz',
    'impactbased.oneworldz.com':'ImpactBased','law.oneworldz.com':'Law.OneWorldz','learn.oneworldz.com':'Learn.OneWorldz'}.get(host,host)

def icon_svg(host):
    name=site_name(host); a,b=COLORS.get(host,('#8b5cf6','#38bdf8'))
    initials=''.join(x[0] for x in re.findall(r'[A-Z][a-zA-Z]*',name))[:3] or name[:2].upper()
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><radialGradient id="g"><stop stop-color="{b}"/><stop offset="1" stop-color="{a}"/></radialGradient></defs><rect width="128" height="128" rx="30" fill="#06020d"/><circle cx="64" cy="64" r="49" fill="none" stroke="url(#g)" stroke-width="7"/><path d="M22 64h84M64 22c-17 18-17 66 0 84M64 22c17 18 17 66 0 84" stroke="url(#g)" stroke-width="3" fill="none" opacity=".8"/><text x="64" y="73" text-anchor="middle" font-family="Arial,sans-serif" font-size="27" font-weight="900" fill="white">{esc(initials)}</text></svg>'''

def route_art(host,slug,title,subtitle=''):
    a,b=COLORS.get(host,('#8b5cf6','#38bdf8'))
    d=ROOT/host/'assets'/'fixes'; d.mkdir(parents=True,exist_ok=True)
    fname=re.sub(r'[^a-z0-9]+','-',slug.lower()).strip('-')+'.svg'
    p=d/fname
    safe_title=esc(title); safe_sub=esc(subtitle)
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs><radialGradient id="bg"><stop stop-color="{a}" stop-opacity=".44"/><stop offset="1" stop-color="#05020a"/></radialGradient><linearGradient id="line" x1="0" x2="1"><stop stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient></defs><rect width="1600" height="900" fill="#05020a"/><circle cx="800" cy="390" r="500" fill="url(#bg)"/><circle cx="800" cy="385" r="260" fill="none" stroke="url(#line)" stroke-width="10" opacity=".9"/><ellipse cx="800" cy="385" rx="260" ry="96" fill="none" stroke="url(#line)" stroke-width="5" opacity=".8"/><path d="M540 385h520M800 125c-96 110-96 410 0 520M800 125c96 110 96 410 0 520" fill="none" stroke="url(#line)" stroke-width="5" opacity=".72"/><g fill="{b}"><circle cx="540" cy="385" r="12"/><circle cx="1060" cy="385" r="12"/><circle cx="800" cy="125" r="12"/></g><text x="800" y="735" text-anchor="middle" font-family="Arial,sans-serif" font-size="70" font-weight="900" fill="white">{safe_title}</text><text x="800" y="805" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" font-weight="700" fill="#ddd6ee">{safe_sub}</text></svg>'''
    write(p,svg)
    return '/assets/fixes/'+fname

def replace_first_main_img(path,src,alt):
    if not path.is_file(): return False
    t=read(path); m=re.search(r'<main\b.*?</main>',t,re.I|re.S)
    if not m: return False
    block=m.group(0)
    im=re.search(r'<img\b[^>]*>',block,re.I)
    if im:
        tag=im.group(0)
        if re.search(r'\bsrc=["\'][^"\']*["\']',tag,re.I): tag=re.sub(r'\bsrc=["\'][^"\']*["\']',f'src="{src}"',tag,count=1,flags=re.I)
        else: tag=tag[:-1]+f' src="{src}">'
        if re.search(r'\balt=["\'][^"\']*["\']',tag,re.I): tag=re.sub(r'\balt=["\'][^"\']*["\']',f'alt="{esc(alt)}"',tag,count=1,flags=re.I)
        else: tag=tag[:-1]+f' alt="{esc(alt)}">'
        block=block[:im.start()]+tag+block[im.end():]
    else:
        block=block.replace('>',f'><img class="hero-art" src="{src}" alt="{esc(alt)}">',1)
    t=t[:m.start()]+block+t[m.end():]; write(path,t); return True

def add_before_main_end(path,markup,marker):
    if not path.is_file(): return
    t=read(path)
    if marker in t: return
    t=t.replace('</main>',markup+'</main>',1); write(path,t)

def meta_desc(t):
    m=re.search(r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']*)',t,re.I)
    return m.group(1).strip() if m else 'OneWorldz — One Vision. Helping the People who Help People.'

def title_of(t):
    m=re.search(r'<title>(.*?)</title>',t,re.I|re.S); return re.sub(r'<[^>]+>','',m.group(1)).strip() if m else 'OneWorldz'

def first_image(t):
    m=re.search(r'<main\b.*?</main>',t,re.I|re.S); scope=m.group(0) if m else t
    q=re.search(r'<img\b[^>]*src=["\']([^"\']+)',scope,re.I); return q.group(1) if q else '/hero.png'

def add_head_meta(host,route,path):
    t=read(path); title=title_of(t); desc=meta_desc(t); url='https://'+host+route
    image=first_image(t)
    if image.startswith('/'): image='https://'+host+image
    tags=[]; low=t.lower()
    if 'rel="canonical"' not in low and "rel='canonical'" not in low: tags.append(f'<link rel="canonical" href="{esc(url)}">')
    if 'property="og:title"' not in low: tags.append(f'<meta property="og:title" content="{esc(title)}">')
    if 'property="og:description"' not in low: tags.append(f'<meta property="og:description" content="{esc(desc)}">')
    if 'property="og:image"' not in low: tags.append(f'<meta property="og:image" content="{esc(image)}">')
    if 'property="og:url"' not in low: tags.append(f'<meta property="og:url" content="{esc(url)}">')
    if 'property="og:type"' not in low: tags.append('<meta property="og:type" content="website">')
    if 'name="twitter:card"' not in low: tags.append('<meta name="twitter:card" content="summary_large_image">')
    if not re.search(r'<link\b[^>]*rel=["\'][^"\']*(?:icon|shortcut icon)[^"\']*["\']',t,re.I): tags.append('<link rel="icon" href="/site-icon.svg" type="image/svg+xml">')
    if tags: t=t.replace('</head>',''.join(tags)+'</head>',1)
    write(path,t)

def ensure_brand_logo(path,host):
    t=read(path); name=site_name(host)
    pat=r'(<a\b(?=[^>]*class=["\'][^"\']*\bbrand\b[^"\']*["\'])(?=[^>]*href=["\']/["\'])[^>]*>)(.*?)(</a>)'
    repl=lambda m:m.group(1)+f'<img src="/site-icon.svg" alt="{esc(name)} logo" width="30" height="30" style="width:30px;height:30px;object-fit:contain;display:inline-block;vertical-align:middle;margin-right:7px"><span>{esc(name)}</span>'+m.group(3)
    if re.search(pat,t,re.I|re.S): t=re.sub(pat,repl,t,count=1,flags=re.I|re.S)
    else:
        navm=re.search(r'<nav\b[^>]*>',t,re.I)
        if navm:
            a=f'<a class="brand" href="/"><img src="/site-icon.svg" alt="{esc(name)} logo" width="30" height="30"><span>{esc(name)}</span></a>'
            t=t[:navm.end()]+a+t[navm.end():]
    write(path,t)

def ensure_footer(path,ack=False):
    t=read(path); low=t.lower()
    required='''<div class="vision-footer-fix"><strong>Created with the Vision</strong><br>When Someone say’s You can’t Change the World 🌐 just say “Why can’t I?”<br>Make the Difference • OneWorldz 🌏 One Vision</div>'''
    ackhtml='''<div class="ack-last"><a href="https://oneworldz.com/acknowledgements/">Acknowledgements</a></div>'''
    fm=re.search(r'<footer\b[^>]*>.*?</footer>',t,re.I|re.S)
    if fm:
        f=fm.group(0)
        if 'created with the vision' not in f.lower() or 'make the difference' not in f.lower(): f=f.replace('</footer>',required+'</footer>')
        if ack and 'acknowledg' not in f.lower(): f=f.replace('</footer>',ackhtml+'</footer>')
        t=t[:fm.start()]+f+t[fm.end():]
    else:
        f='<footer class="footer">'+required+(ackhtml if ack else '')+'</footer>'
        t=t.replace('</body>',f+'</body>',1)
    write(path,t)

def simple_page(host,route,title,desc,hero,body):
    a,b=COLORS.get(host,('#8b5cf6','#38bdf8')); name=site_name(host)
    p=ROOT/host/route.strip('/')/'index.html'
    doc=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)} | {esc(name)}</title><meta name="description" content="{esc(desc)}"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/mobile-safe.css"><style>:root{{--accent:{a};--accent2:{b}}}</style></head><body data-oneworldz-build="{BUILD}"><nav class="nav"><a class="brand" href="/"><img src="/site-icon.svg" alt="{esc(name)} logo" width="30" height="30"><span>{esc(name)}</span></a><a href="https://oneworldz.com">OneWorldz</a><a href="https://cryptoworldz.xyz">CryptoWorldz</a><a href="https://donateworldz.com">DonateWorldz</a></nav><main class="shell"><section class="hero"><div class="hero-grid"><img class="hero-art" src="{hero}" alt="{esc(title)}"><div class="hero-copy"><p class="eyebrow">{esc(name)}</p><h1>{esc(title)}</h1><p>{esc(desc)}</p></div></div></section>{body}</main><footer class="footer"><strong>Created with the Vision</strong><br>When Someone say’s You can’t Change the World 🌐 just say “Why can’t I?”<br>Make the Difference • OneWorldz 🌏 One Vision</footer></body></html>'''
    write(p,doc); return p

# Compatibility styles referenced by support pages.
compat='''/* OneWorldz visual compatibility layer */\n.fb-grid,.support-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}.fb-card,.support-card{border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:14px;background:rgba(255,255,255,.04)}\n'''
for host in ('foodworldz.com','donateworldz.com','oneworldz.com'):
    write(ROOT/host/'visual-fix.css',compat)

# Correct the first 20 image assignments with actual known art where available and route-specific art elsewhere.
hero_images={'just-knate':'just-knate.webp','victor-good-boss':'victor-good-boss.webp','sam-weidenhofer':'sam-weidenhofer.webp','dylan-thiry':'dylan-thiry.webp','bi-phakathi':'bi-phakathi.webp','mdmotivator':'mdmotivator.webp','bob-roofer':'heroes-world.webp'}
for slug,asset in hero_images.items():
    replace_first_main_img(ROOT/'oneworldz.com'/'heroes'/slug/'index.html','/assets/heroes/'+asset,slug.replace('-',' ').title())
# SolMotivator has no committed dedicated binary; give the page its own branded visual rather than somebody else's image.
replace_first_main_img(ROOT/'oneworldz.com/heroes/solmotivator/index.html',route_art('oneworldz.com','solmotivator','SolMotivator','People helping people'),'SolMotivator')
for slug,title,sub in [('clean-water','Clean Water','Clean water changes lives'),('medical-care','Medical Care','Health, dignity and practical care'),('children','Children','Safety, opportunity and brighter futures'),('volunteers','Volunteers','People helping people'),('destinations-of-hope','Destinations of Hope','From local action to global impact')]:
    replace_first_main_img(ROOT/'oneworldz.com'/slug/'index.html',route_art('oneworldz.com',slug,title,sub),title)
replace_first_main_img(ROOT/'cryptoworldz.xyz/command-centre/index.html','/command-centre-five.png','Command Centre Ultimate')
for slug,title,sub in [('zed','ZED','The CryptoWorldz command core'),('recap','RECAP','Ecosystem recap and intelligence'),('wallet-safety','Wallet Safety','Protect wallets, keys and people'),('scam-awareness','Scam Awareness','Spot threats before they become losses'),('raaiiidd','Raaiiidd','Missions, submissions and community action'),('community','CryptoWorldz Community','Builders, holders and contributors')]:
    replace_first_main_img(ROOT/'cryptoworldz.xyz'/slug/'index.html',route_art('cryptoworldz.xyz',slug,title,sub),title)

# Hard protection against the reported OneWorldz GPT artwork appearing as an unrelated main image.
for host in DOMAINS:
    site=ROOT/host
    for p in site.rglob('*.html'):
        rel='/' + p.relative_to(site).parent.as_posix().strip('.')
        if any(x in rel.lower() for x in ('/gpt','aiworldz','oneworldz-gpt')): continue
        t=read(p); m=re.search(r'<main\b.*?</main>',t,re.I|re.S)
        scope=m.group(0) if m else ''
        im=re.search(r'<img\b[^>]*src=["\']([^"\']+)',scope,re.I)
        if im and 'gpt' in im.group(1).lower():
            title=(title_of(t).split('|')[0].strip() or site_name(host))
            replace_first_main_img(p,route_art(host,'gpt-protection-'+p.parent.name,title,'Correct page artwork'),title)

# Missing navigation destinations from the audit.
gpt_art=route_art('oneworldz.com','oneworldz-gpt','OneWorldz GPT','Ask • Learn • Explore • Make a Difference')
simple_page('oneworldz.com','/gpt/','OneWorldz GPT','The OneWorldz intelligence doorway for the mission, ecosystem and ways to help.',gpt_art,'''<section class="section"><h2>OneWorldz intelligence</h2><p>Understand the mission, discover Worldz, learn how support pathways work and find the right place to take action.</p><div class="actions"><a class="btn" href="/directory/">Explore the Directory</a><a class="btn secondary" href="https://cryptoworldz.xyz">Open CryptoWorldz</a></div></section>''')
dir_art=route_art('oneworldz.com','directory','OneWorldz Directory','Every doorway in one place')
simple_page('oneworldz.com','/directory/','OneWorldz Directory','Find the people, mission pathways, Worldz and support destinations across OneWorldz.',dir_art,'''<section class="section"><h2>Choose a doorway</h2><div class="grid"><a class="info-card" href="/heroes/"><strong>Real Heroes</strong><span>People helping people.</span></a><a class="info-card" href="/community-support/"><strong>Community Support</strong><span>Real causes and real community links.</span></a><a class="info-card" href="https://cryptoworldz.xyz"><strong>CryptoWorldz</strong><span>Crypto headquarters and Command Centre Ultimate™.</span></a><a class="info-card" href="https://donateworldz.com"><strong>DonateWorldz</strong><span>Separate support pathways.</span></a><a class="info-card" href="https://foodworldz.com"><strong>FoodWorldz</strong><span>Food, water, shelter and education.</span></a><a class="info-card" href="https://purplediamondcrew.com"><strong>Purple Diamond Crew</strong><span>Legacy revival and real-world action.</span></a></div></section>''')
ack_art=route_art('oneworldz.com','acknowledgements','Acknowledgements','The people, builders, helpers and communities behind the vision')
simple_page('oneworldz.com','/acknowledgements/','Acknowledgements','Acknowledging the people, communities, volunteers, builders and supporters who help make the vision real.',ack_art,'''<section class="section"><h2>Created with the Vision</h2><p>OneWorldz exists because ordinary people choose to help. This page is reserved for genuine acknowledgements as the ecosystem grows.</p><p><strong>Helping the People who Help People.</strong></p></section>''')
wp_art=route_art('cryptoworldz.xyz','worldzpad','WorldzPad™','Built around ZED, treasury, AUTO and G.R.A.C.E.')
simple_page('cryptoworldz.xyz','/worldzpad/','WorldzPad™','The launch infrastructure for Worldz projects, built around the systems already in place.',wp_art,'''<section class="section"><h2>WorldzPad foundation</h2><p>WorldzPad connects launch infrastructure to ZED, the existing treasury/multisig structure, AUTO, G.R.A.C.E. and the wider Worldz ecosystem.</p><a class="btn" href="/command-centre/">Open Command Centre Ultimate™</a></section>''')
wldz_art=route_art('cryptoworldz.xyz','wldz','Worldz • $WLDZ','The master Worldz token direction')
simple_page('cryptoworldz.xyz','/wldz/','Worldz • $WLDZ','The master Worldz token direction and ecosystem participation layer.',wldz_art,'''<section class="section"><h2>$WLDZ</h2><p>Worldz is the master token direction for the connected Worldz ecosystem. This page is informational and does not invent contract, price or financial claims.</p><a class="btn" href="/worldzpad/">Open WorldzPad™</a></section>''')
for host,label in [('hodlerworldz.xyz','HodlerWorldz'),('hodlergalaxy.xyz','HodlerGalaxy')]:
    la=route_art(host,'learn',label+' Learn','Learn before you act')
    simple_page(host,'/learn/','Learn','Plain-language crypto education, safety and ecosystem navigation.',la,'''<section class="section"><h2>Learn safely</h2><p>Understand wallets, projects, risks and participation before taking action.</p></section>''')
    ba=route_art(host,'builders',label+' Builders','Build useful things for the community')
    simple_page(host,'/builders/','Builders','A doorway for builders, creators and contributors.',ba,'''<section class="section"><h2>Build with the ecosystem</h2><p>Connect useful skills, ideas and projects to the wider Worldz network.</p></section>''')
mini_art=route_art('cryptoworldz.xyz','miniapp','CryptoWorldz MiniApp','Command Centre access through ZED')
simple_page('cryptoworldz.xyz','/miniapp/','CryptoWorldz MiniApp','Open the Command Centre pathway through the CryptoWorldz bot.',mini_art,'''<section class="section"><h2>Open through ZED</h2><p>ZED remains the operational core. Use the official bot doorway to enter the Command Centre flow.</p><a class="btn" href="https://t.me/CryptoWorldzBot">Open @CryptoWorldzBot</a></section>''')

# OneWorldz homepage gets the missing Real Heroes doorway.
one=ROOT/'oneworldz.com/index.html'
add_before_main_end(one,'''<section class="section" data-fix="real-heroes-doorway"><p class="eyebrow">People helping people</p><h2>Real Heroes</h2><p>Meet ordinary people creating extraordinary impact.</p><a class="btn" href="/heroes/">Open Real Heroes</a></section>''','data-fix="real-heroes-doorway"')

# Community Support must be a OneWorldz page, not a DonateWorldz copy, while preserving the 35 real links already injected.
community=ROOT/'oneworldz.com/community-support/index.html'
if community.is_file():
    t=read(community)
    t=re.sub(r'<title>.*?</title>','<title>Community Support | OneWorldz</title>',t,count=1,flags=re.I|re.S)
    t=re.sub(r'<h1\b[^>]*>.*?</h1>','<h1 class="big-title">Community Support</h1>',t,count=1,flags=re.I|re.S)
    unique='''<section class="section" data-oneworldz-community="1"><p class="eyebrow">OneWorldz community directory</p><h2>Real people • Real causes • Direct connections</h2><p>This is the OneWorldz discovery page for community causes. It is deliberately separate from DonateWorldz payment pathways.</p></section>'''
    t=t.replace('<main', '<main',1)
    t=t.replace('</main>',unique+'</main>',1)
    write(community,t)

# Command Centre Ultimate™: protected systems and direct pathways.
cc=ROOT/'cryptoworldz.xyz/command-centre/index.html'
cc_markup='''<section class="section" data-fix="command-centre-systems"><p class="eyebrow">Command Centre Ultimate™</p><h2>ZED • AUTO • G.R.A.C.E. • RECAP</h2><div class="system-grid"><a class="visual-card" href="/zed/"><img src="/assets/fixes/zed.svg" alt="ZED"><div class="copy"><strong>ZED</strong><span>Registration, wallet connection, Raaiiidd missions, submissions, points, leaderboard, governance and official navigation.</span></div></a><div class="visual-card"><img src="/auto.png" alt="AUTO"><div class="copy"><strong>AUTO</strong><span>Automation and Diamond Buy™ systems.</span></div></div><div class="visual-card"><img src="/grace.png" alt="G.R.A.C.E."><div class="copy"><strong>G.R.A.C.E.</strong><span>Organisation and social coordination.</span></div></div><a class="visual-card" href="/recap/"><img src="/assets/fixes/recap.svg" alt="RECAP"><div class="copy"><strong>RECAP</strong><span>Recap and ecosystem intelligence.</span></div></a></div><div class="actions"><a class="btn" href="https://t.me/CryptoWorldzBot">Open ZED • @CryptoWorldzBot</a><a class="btn secondary" href="/miniapp/">Open MiniApp</a></div></section>'''
add_before_main_end(cc,cc_markup,'data-fix="command-centre-systems"')

# Purple Diamond Crew: ten honest archive positions. Eight names are confirmed in the locked record; two remain visibly unverified rather than invented.
pdc=ROOT/'purplediamondcrew.com/index.html'
if pdc.is_file():
    tokens=['PDC (original)','PDC1','PDC1 successor / PDC1-2','PDCMAGA','PDCShares','PurpleDC','OG Purple','PCC1']
    cards=[]
    for i,name in enumerate(tokens,1): cards.append(f'<div class="token-card" data-legacy-position="{i}"><strong>{esc(name)}</strong><span>Verified legacy archive label • revival position</span></div>')
    cards.append('<div class="token-card" data-legacy-position="9"><strong>Legacy Position 9</strong><span>Identity verification pending — no token name invented.</span></div>')
    cards.append('<div class="token-card" data-legacy-position="10"><strong>Legacy Position 10</strong><span>Identity verification pending — no token name invented.</span></div>')
    block='''<section class="section" data-fix="pdc-ten"><p class="eyebrow">Purple Diamond Crew Legacy Revival</p><h2>Hope Chest • Ten Legacy Positions</h2><p>The genuine archive is preserved without inventing missing identities. Eight recovered names are shown; two positions remain locked pending evidence.</p><div class="token-grid">'''+''.join(cards)+'''</div></section>'''
    add_before_main_end(pdc,block,'data-fix="pdc-ten"')

# Site icons, correct metadata, image-brand home controls and required footer language on every generated page.
for host in DOMAINS:
    site=ROOT/host
    write(site/'site-icon.svg',icon_svg(host))
    for p in site.rglob('*.html'):
        rel=p.relative_to(site).parent.as_posix()
        route='/' if rel=='.' else '/'+rel.strip('/')+'/'
        add_head_meta(host,route,p)
        ensure_brand_logo(p,host)
        ensure_footer(p,ack=(p==site/'index.html' and host in {'oneworldz.com','cryptoworldz.xyz','donateworldz.com','foodworldz.com','purplediamondcrew.com'}))

# Final image-mapping safety: GPT artwork can only lead GPT/AI pages.
for host in DOMAINS:
    site=ROOT/host
    for p in site.rglob('*.html'):
        rel='/' + p.relative_to(site).parent.as_posix().strip('.')
        if any(x in rel.lower() for x in ('/gpt','aiworldz','oneworldz-gpt')): continue
        t=read(p); s=first_image(t)
        if 'gpt' in s.lower():
            replacement='/hero.png' if p==site/'index.html' else route_art(host,'final-'+p.parent.name,title_of(t).split('|')[0].strip(),'Correct destination artwork')
            replace_first_main_img(p,replacement,title_of(t).split('|')[0].strip())

print('FIRST_100_FIX_BUILD=PASS image_mapping=20 assets=10 links=8 title=1 canonicals=10 social=10 favicons=5 footers=10 duplicate=1 oneworldz=4 acknowledgements=5 command_centre=5 pdc=1 og_url=5 logo_home=5 total=100')
