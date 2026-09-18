#!/usr/bin/env python3
"""Final visual overhaul applied to EVERY generated HTML page.

Runs after every other generator/patch so later steps cannot undo it.
Discovers pages from disk rather than trusting a hard-coded 146-page list.
"""
from pathlib import Path
from urllib.parse import urlparse
from html import escape
import re

ROOT=Path(__file__).resolve().parents[1]
DOMAINS=[d.strip() for d in (ROOT/'DOMAINS.txt').read_text(encoding='utf-8').splitlines() if d.strip()]
assert len(DOMAINS)==18 and len(set(DOMAINS))==18

# ---------- shared visual system ----------
CSS=r'''
/* FINAL ONEWORLDZ OVERHAUL — loaded last */
html,body{max-width:100%;overflow-x:hidden}
body{min-width:0}
img,svg,video,canvas{max-width:100%;height:auto}
.ow-home-button{z-index:10000}
.nav{display:flex!important;align-items:center!important;gap:7px!important;padding:8px 10px!important;overflow-x:auto!important;overflow-y:hidden!important;flex-wrap:nowrap!important;scrollbar-width:none!important}
.nav::-webkit-scrollbar{display:none!important}
.nav a{flex:0 0 auto!important;width:auto!important;min-height:38px!important;padding:8px 11px!important;border-radius:10px!important;white-space:nowrap!important;font-size:.78rem!important}
.shell{width:min(1180px,100%)!important;margin:auto!important;padding:10px!important}
.hero,.section{border-radius:18px!important}
.hero-grid{gap:0!important}
.hero-copy{padding:clamp(20px,5vw,48px)!important}
.hero-copy h1,.big-title,.route-copy h1,.section h2{overflow-wrap:normal!important;word-break:normal!important;hyphens:none!important;text-wrap:balance}
.hero-copy p,.section p,.copy span,.info-card span{line-height:1.5!important}
.actions,.btns{gap:10px!important}
.btn{min-height:46px!important;padding:11px 15px!important}
.hero-card,.visual-card,.world-card,.info-card,.support-card{overflow:hidden!important}
.hero-card .copy,.visual-card .copy,.world-card .copy{display:grid!important;gap:7px!important;padding:16px!important}
.hero-card .copy strong,.visual-card .copy strong,.world-card .copy strong{display:block!important;font-size:1.08rem!important;line-height:1.2!important}
.hero-card .copy span,.visual-card .copy span,.world-card .copy span{display:block!important;margin:0!important}
.hero-card img,.visual-card img,.world-card img,.route-art,.hero-art,.feature-img{width:100%!important;height:auto!important;object-fit:contain!important;object-position:center!important;background:#05030a!important}
.hero-list{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:14px!important}
.final-route-art{border:1px solid rgba(255,255,255,.12);border-radius:18px;background:#05030a}
.final-hero-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.final-hero-card{display:block;border:1px solid rgba(255,255,255,.14);border-radius:20px;overflow:hidden;background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.02))}
.final-hero-card img{width:100%;aspect-ratio:4/5;object-fit:contain;background:#030207}
.final-hero-card .copy{padding:17px;display:grid;gap:8px}
.final-hero-card strong{font-size:1.13rem;line-height:1.18}
.final-hero-card span{color:#d4cce0;line-height:1.4}
.final-hero-card b{color:#38bdf8;font-size:.82rem;letter-spacing:.09em}
@media(max-width:760px){
  .nav{position:relative!important;top:auto!important}
  .section-head{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:12px!important}
  .section-head>.btn{width:100%!important}

  .shell{padding:8px!important}
  .hero-grid,.grid,.system-grid,.support-grid,.split,.portal,.mission,.token-grid,.final-hero-grid{grid-template-columns:1fr!important}
  .hero-list{grid-template-columns:1fr!important}
  .hero-copy h1,.big-title,.route-copy h1{font-size:clamp(2.25rem,12vw,4.15rem)!important;line-height:.95!important}
  .section h2{font-size:clamp(1.7rem,8vw,2.8rem)!important;line-height:1!important}
  .actions,.btns{display:grid!important;grid-template-columns:1fr!important}
  .btn{width:100%!important}
  .final-hero-card img{aspect-ratio:auto;max-height:none}
}
@media(max-width:380px){
  .hero-copy h1,.big-title,.route-copy h1{font-size:clamp(2rem,11vw,3.5rem)!important}
}
'''

def write_css(host):
    (ROOT/host/'final-overhaul.css').write_text(CSS,encoding='utf-8')

def page_title(text):
    m=re.search(r'<title>(.*?)</title>',text,re.I|re.S)
    if not m:return 'OneWorldz'
    return re.sub(r'\s*\|.*$','',re.sub(r'<[^>]+>','',m.group(1))).strip()

def svg(title,subtitle,accent='#9a42ff',accent2='#38bdf8'):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 820">
<defs>
 <radialGradient id="bg" cx="50%" cy="28%" r="90%"><stop offset="0" stop-color="{accent}" stop-opacity=".38"/><stop offset=".48" stop-color="#130923"/><stop offset="1" stop-color="#030207"/></radialGradient>
 <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop stop-color="{accent}"/><stop offset="1" stop-color="{accent2}"/></linearGradient>
</defs>
<rect width="1200" height="820" rx="42" fill="url(#bg)"/>
<circle cx="600" cy="300" r="164" fill="none" stroke="url(#ring)" stroke-width="10"/>
<circle cx="600" cy="300" r="112" fill="none" stroke="{accent2}" stroke-width="4" opacity=".58"/>
<path d="M436 300h328M600 136c-60 64-90 118-90 164s30 100 90 164M600 136c60 64 90 118 90 164s-30 100-90 164" fill="none" stroke="{accent2}" stroke-width="4" opacity=".48"/>
<text x="600" y="585" text-anchor="middle" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="72" font-weight="800">{escape(title)}</text>
<text x="600" y="648" text-anchor="middle" fill="#d7d0e3" font-family="Arial,Helvetica,sans-serif" font-size="31">{escape(subtitle)}</text>
<text x="600" y="722" text-anchor="middle" fill="{accent2}" font-family="Arial,Helvetica,sans-serif" font-size="25" font-weight="700">One World • One Vision • One Fam</text>
</svg>'''

def make_art(host,slug,title,subtitle):
    out=ROOT/host/'assets'/'final-overhaul'
    out.mkdir(parents=True,exist_ok=True)
    safe=re.sub(r'[^a-z0-9-]+','-',slug.lower()).strip('-') or 'page'
    p=out/f'{safe}.svg'
    p.write_text(svg(title,subtitle),encoding='utf-8')
    return '/assets/final-overhaul/'+p.name

def ensure_css(text):
    link='<link rel="stylesheet" href="/final-overhaul.css">'
    if link not in text:
        text=text.replace('</head>',link+'</head>',1)
    return text

def compact_nav(text):
    m=re.search(r'<nav\b[^>]*class=["\'][^"\']*\bnav\b[^"\']*["\'][^>]*>(.*?)</nav>',text,re.I|re.S)
    if not m:return text
    inner=m.group(1)
    seen=set(); anchors=[]
    for a in re.finditer(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>.*?</a>',inner,re.I|re.S):
        href=a.group(1)
        key=href.rstrip('/') or '/'
        if 'sitemap.xml' in href or key in seen:continue
        seen.add(key); anchors.append(a.group(0))
    if not anchors:return text
    new=m.group(0).replace(inner,'\n'.join(anchors))
    return text.replace(m.group(0),new,1)

def remove_filler(text):
    # Generated boilerplate that created repetitive, low-value pages.
    text=re.sub(r'<section class=["\']section["\']>\s*<h2>Built to be useful</h2>[\s\S]*?</section>','',text,count=1,flags=re.I)
    return text

def replace_primary(text,src,alt):
    for cls in ('route-art','hero-art','feature-img'):
        m=re.search(rf'<img\b[^>]*class=["\'][^"\']*\b{cls}\b[^"\']*["\'][^>]*>',text,re.I)
        if not m:continue
        tag=m.group(0)
        tag=re.sub(r'\bsrc=["\'][^"\']*["\']',f'src="{src}"',tag,count=1,flags=re.I)
        if re.search(r'\balt=["\'][^"\']*["\']',tag,re.I):
            tag=re.sub(r'\balt=["\'][^"\']*["\']',f'alt="{escape(alt,quote=True)}"',tag,count=1,flags=re.I)
        else:
            tag=tag[:-1]+f' alt="{escape(alt,quote=True)}">'
        return text.replace(m.group(0),tag,1)
    return text

# Files visibly identified from the user's screenshots.
VERIFIED_POSTERS={
 'just-knate':'/assets/heroes/sam-weidenhofer.webp',
 'victor-good-boss':'/assets/heroes/dylan-thiry.webp',
 'sam-weidenhofer':'/assets/heroes/victor-good-boss.webp',
 'dylan-thiry':'/assets/heroes/bi-phakathi.webp',
}
HEROES=[
 ('just-knate','Just Knate','Direct help and dignity','/assets/heroes/sam-weidenhofer.webp'),
 ('victor-good-boss','Victor — The Good Boss','Recovery, hope and second chances','/assets/heroes/dylan-thiry.webp'),
 ('sam-weidenhofer','Sam Weidenhofer','Everyday community kindness','/assets/heroes/victor-good-boss.webp'),
 ('dylan-thiry','Dylan Thiry','Building hope and stronger futures','/assets/heroes/bi-phakathi.webp'),
 ('bi-phakathi','Bi Phakathi','Compassion in action',None),
 ('mdmotivator','MDMotivator','Global kindness and encouragement',None),
 ('bob-roofer','Bob — The Giving Roofer','Practical community generosity',None),
]

def hero_safe_art(slug,name,tagline):
    if slug in VERIFIED_POSTERS:return VERIFIED_POSTERS[slug]
    return make_art('oneworldz.com','hero-'+slug,name,tagline)

def rebuild_heroes_listing(text):
    cards=[]
    for slug,name,tagline,_ in HEROES:
        src=hero_safe_art(slug,name,tagline)
        cards.append(f'''<a class="final-hero-card" href="/heroes/{slug}/"><img src="{src}" alt="{escape(name,quote=True)}"><div class="copy"><strong>{escape(name)}</strong><span>{escape(tagline)}</span><b>OPEN PROFILE →</b></div></a>''')
    block='<div class="final-hero-grid" data-final-heroes="1">'+''.join(cards)+'</div>'
    # Replace any existing hero-list grid wholesale; this prevents cross-card regex corruption.
    if re.search(r'<div\b[^>]*class=["\'][^"\']*\bhero-list\b[^"\']*["\'][^>]*>[\s\S]*?</div>\s*</section>',text,re.I):
        text=re.sub(r'<div\b[^>]*class=["\'][^"\']*\bhero-list\b[^"\']*["\'][^>]*>[\s\S]*?</div>\s*</section>',block+'</section>',text,count=1,flags=re.I)
    else:
        # Insert after the Real Heroes heading section when layout differs.
        marker=re.search(r'(<h1[^>]*>\s*Real Heroes\s*</h1>[\s\S]*?</section>)',text,re.I)
        if marker:text=text.replace(marker.group(1),marker.group(1)+'<section class="section">'+block+'</section>',1)
    return text

def fix_hero_profile(text,slug,name,tagline):
    src=hero_safe_art(slug,name,tagline)
    return replace_primary(text,src,name)

special_keep={
 ('donateworldz.com','slice-of-hope-australia'),
 ('donateworldz.com','davis-family'),
 ('donateworldz.com','community-impact'),
 ('donateworldz.com','jayjay-support'),
 ('oneworldz.com','community-support'),
 ('cryptoworldz.xyz','command-centre'),
}

for host in DOMAINS:write_css(host)

all_pages=[]
for host in DOMAINS:
    all_pages.extend(sorted((ROOT/host).rglob('index.html')))

# Retired pages are forbidden from the public set.
all_pages=[p for p in all_pages if 'reagan-kauja' not in p.as_posix() and 'reagan-children' not in p.as_posix()]

changed=0
for path in all_pages:
    host=path.relative_to(ROOT).parts[0]
    rel=path.relative_to(ROOT/host).parent.as_posix()
    route='' if rel=='.' else rel
    text=path.read_text(encoding='utf-8')
    original=text
    text=ensure_css(text)
    text=compact_nav(text)
    text=remove_filler(text)

    if host=='oneworldz.com' and route=='heroes':
        text=rebuild_heroes_listing(text)

    # The OneWorldz homepage contains a second Real Heroes grid. Rebuild that
    # grid with the exact same verified mapping so the homepage cannot regress
    # even when apply_visual_fixes.py still carries legacy filenames.
    if host=='oneworldz.com' and route=='' and 'class="hero-list"' in text:
        text=rebuild_heroes_listing(text)

    if host=='oneworldz.com' and route.startswith('heroes/'):
        slug=route.split('/')[-1]
        row=next((h for h in HEROES if h[0]==slug),None)
        if row:text=fix_hero_profile(text,row[0],row[1],row[2])

    # Every ordinary sub-page gets route-specific artwork instead of unrelated repeated photos.
    if route and (host,route) not in special_keep and not (host=='oneworldz.com' and route.startswith('heroes/')):
        title=page_title(text)
        subtitle={
          'oneworldz.com':'OneWorldz mission pathway',
          'learn.oneworldz.com':'Plain-language learning',
          'foodworldz.com':'Food • Water • Practical Support',
          'law.oneworldz.com':'Rights • Fairness • Practical pathways',
          'impactbased.oneworldz.com':'Impact-first infrastructure',
          'cryptoworldz.xyz':'CryptoWorldz ecosystem',
        }.get(host,'Connected Worldz pathway')
        src=make_art(host,route,title,subtitle)
        text=replace_primary(text,src,title)

    if text!=original:
        path.write_text(text,encoding='utf-8')
        changed+=1

# Build the public URL manifest from what actually exists after all generation layers.
urls=[]
for path in all_pages:
    host=path.relative_to(ROOT).parts[0]
    rel=path.relative_to(ROOT/host).parent.as_posix()
    url=f'https://{host}/' if rel=='.' else f'https://{host}/{rel.strip("/")}/'
    urls.append(url)
urls=sorted(set(urls))
(ROOT/'.ecosystem-urls.txt').write_text('\n'.join(urls)+'\n',encoding='utf-8')

# Hard contracts for the page the user just showed.
heroes=(ROOT/'oneworldz.com/heroes/index.html').read_text(encoding='utf-8')
for slug,name,tagline,_ in HEROES:
    assert f'href="/heroes/{slug}/"' in heroes,(slug,'link')
    assert name in heroes,(slug,'name')
assert '/assets/heroes/sam-weidenhofer.webp' in heroes
assert '/assets/heroes/dylan-thiry.webp' in heroes
assert '/assets/heroes/victor-good-boss.webp' in heroes
assert '/assets/heroes/bi-phakathi.webp' in heroes
assert 'data-final-heroes="1"' in heroes
assert 'Built to be useful' not in heroes

print(f'FINAL_VISUAL_OVERHAUL=PASS actual_pages={len(urls)} changed_pages={changed} sites={len(DOMAINS)} heroes=7 manifest_rebuilt=1')
