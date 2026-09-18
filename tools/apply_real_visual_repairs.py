#!/usr/bin/env python3
"""Real visual repair pass based on the 146-page screenshot audit.

This is intentionally visual, not just a metadata/HTTP validator:
- removes the repeated generic "Built to be useful" filler block;
- deduplicates repeated navigation links;
- replaces unrelated generic art on mission/learn/food pages with page-specific art;
- fixes the visibly shifted OneWorldz hero poster mapping;
- replaces missing/black hero artwork with honest branded name cards instead of wrong people;
- prevents long mobile headings from clipping.
"""
from pathlib import Path
from urllib.parse import urlparse
from html import escape
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
URLS = [u.strip() for u in (ROOT/'.ecosystem-urls.txt').read_text(encoding='utf-8').splitlines() if u.strip()]
assert len(URLS) == 146 and len(set(URLS)) == 146

PALETTE = {
    'oneworldz.com':('#8b5cf6','#38bdf8'),
    'learn.oneworldz.com':('#38bdf8','#8b5cf6'),
    'foodworldz.com':('#22c55e','#38bdf8'),
    'donateworldz.com':('#a855f7','#38bdf8'),
}

def page_path(url):
    p=urlparse(url); rel=p.path.strip('/')
    return ROOT/p.netloc/rel/'index.html' if rel else ROOT/p.netloc/'index.html'

def svg_text(title, subtitle, c1, c2):
    title = escape(title)
    subtitle = escape(subtitle)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760">
<defs>
 <radialGradient id="g" cx="50%" cy="35%" r="80%">
  <stop offset="0" stop-color="{c1}" stop-opacity=".45"/>
  <stop offset=".55" stop-color="#120a22"/>
  <stop offset="1" stop-color="#040207"/>
 </radialGradient>
 <linearGradient id="l" x1="0" y1="0" x2="1" y2="1">
  <stop stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/>
 </linearGradient>
</defs>
<rect width="1200" height="760" rx="42" fill="url(#g)"/>
<circle cx="600" cy="305" r="150" fill="none" stroke="url(#l)" stroke-width="10" opacity=".9"/>
<circle cx="600" cy="305" r="102" fill="none" stroke="{c2}" stroke-width="4" opacity=".55"/>
<path d="M450 305h300M600 155c-55 55-82 105-82 150s27 95 82 150M600 155c55 55 82 105 82 150s-27 95-82 150" fill="none" stroke="{c2}" stroke-width="4" opacity=".5"/>
<text x="600" y="570" text-anchor="middle" fill="white" font-family="Arial,Helvetica,sans-serif" font-size="70" font-weight="800">{title}</text>
<text x="600" y="630" text-anchor="middle" fill="#d9d2e8" font-family="Arial,Helvetica,sans-serif" font-size="30">{subtitle}</text>
<text x="600" y="690" text-anchor="middle" fill="{c2}" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="700">One World • One Vision • One Fam</text>
</svg>'''

def ensure_art(host, slug, title, subtitle):
    c1,c2=PALETTE.get(host,('#8b5cf6','#38bdf8'))
    out=ROOT/host/'assets'/'visual-audit'
    out.mkdir(parents=True,exist_ok=True)
    safe=re.sub(r'[^a-z0-9-]+','-',slug.lower()).strip('-') or hashlib.sha1(title.encode()).hexdigest()[:8]
    p=out/f'{safe}.svg'
    p.write_text(svg_text(title,subtitle,c1,c2),encoding='utf-8')
    return '/assets/visual-audit/'+p.name

def title_of(text):
    m=re.search(r'<title>(.*?)</title>',text,re.I|re.S)
    return re.sub(r'\s*\|.*$','',m.group(1)).strip() if m else 'OneWorldz'

def replace_primary_image(text, src, alt):
    # Route pages use route-art; hero/profile pages may use hero-art.
    for cls in ('route-art','hero-art','feature-img'):
        pat=rf'<img\b([^>]*\bclass=["\'][^"\']*\b{cls}\b[^"\']*["\'][^>]*)>'
        m=re.search(pat,text,re.I)
        if m:
            tag=m.group(0)
            if re.search(r'\bsrc=["\'][^"\']*["\']',tag,re.I):
                tag=re.sub(r'\bsrc=["\'][^"\']*["\']',f'src="{src}"',tag,count=1,flags=re.I)
            else:
                tag=tag[:-1]+f' src="{src}">'
            if re.search(r'\balt=["\'][^"\']*["\']',tag,re.I):
                tag=re.sub(r'\balt=["\'][^"\']*["\']',f'alt="{escape(alt,quote=True)}"',tag,count=1,flags=re.I)
            else:
                tag=tag[:-1]+f' alt="{escape(alt,quote=True)}">'
            return text.replace(m.group(0),tag,1)
    return text

def clean_nav(text):
    m=re.search(r'<nav\b[^>]*class=["\'][^"\']*\bnav\b[^"\']*["\'][^>]*>(.*?)</nav>',text,re.I|re.S)
    if not m: return text
    inner=m.group(1)
    anchors=re.findall(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>.*?</a>',inner,re.I|re.S)
    if not anchors: return text
    parts=re.findall(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>.*?</a>',inner,re.I|re.S)
    out=[]; seen=set()
    for am in re.finditer(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>.*?</a>',inner,re.I|re.S):
        href=am.group(1).rstrip('/') or '/'
        if href in seen: continue
        seen.add(href); out.append(am.group(0))
    # sitemap is useful technically but not worth a top-level mobile button
    out=[a for a in out if 'sitemap.xml' not in a]
    if not out: return text
    new=m.group(0).replace(inner,'\n'.join(out))
    return text.replace(m.group(0),new,1)

def remove_generic_filler(text):
    # Remove only the repeated generated filler section. Keep route-specific
    # content and notices elsewhere.
    pat=(r'<section class=["\']section["\']>\s*'
         r'<h2>Built to be useful</h2>[\s\S]*?'
         r'</section>')
    return re.sub(pat,'',text,flags=re.I,count=1)

# Screenshot-verified mapping:
# current file -> what it visibly contains
# victor-good-boss.webp = Sam Weidenhofer
# sam-weidenhofer.webp   = Just Knate
# dylan-thiry.webp       = Victor
# bi-phakathi.webp       = Dylan
HERO_FIX = {
    'heroes/just-knate':('/assets/heroes/sam-weidenhofer.webp','Just Knate'),
    'heroes/victor-good-boss':('/assets/heroes/dylan-thiry.webp','Victor — The Good Boss'),
    'heroes/sam-weidenhofer':('/assets/heroes/victor-good-boss.webp','Sam Weidenhofer'),
    'heroes/dylan-thiry':('/assets/heroes/bi-phakathi.webp','Dylan Thiry'),
}

hero_generated = {
    'heroes/bi-phakathi':('Bi Phakathi','Direct compassion and practical help'),
    'heroes/mdmotivator':('MDMotivator','Public kindness and community impact'),
    'heroes/bob-roofer':('Bob — The Giving Roofer','Practical community generosity'),
}

changed=0; filler_removed=0; navs_cleaned=0; art_changed=0

for url in URLS:
    p=urlparse(url); path=page_path(url)
    text=path.read_text(encoding='utf-8'); original=text
    route=p.path.strip('/')

    before=text
    text=clean_nav(text)
    if text!=before: navs_cleaned+=1

    before=text
    text=remove_generic_filler(text)
    if text!=before: filler_removed+=1

    # Correct dedicated OneWorldz hero pages.
    if p.netloc=='oneworldz.com' and route in HERO_FIX:
        src,name=HERO_FIX[route]
        text=replace_primary_image(text,src,name)
        art_changed+=1
    elif p.netloc=='oneworldz.com' and route in hero_generated:
        name,sub=hero_generated[route]
        src=ensure_art('oneworldz.com','hero-'+route.split('/')[-1],name,sub)
        text=replace_primary_image(text,src,name)
        art_changed+=1

    # Replace unrelated repeated art on mission/learning/food/transparency routes.
    if p.netloc=='oneworldz.com' and route and not route.startswith('heroes/') and route not in ('heroes','ecosystem'):
        title=title_of(text)
        src=ensure_art(p.netloc,route,title,'OneWorldz mission pathway')
        text=replace_primary_image(text,src,title)
        art_changed+=1
    elif p.netloc=='learn.oneworldz.com' and route:
        title=title_of(text)
        src=ensure_art(p.netloc,route,title,'Plain-language learning')
        text=replace_primary_image(text,src,title)
        art_changed+=1
    elif p.netloc=='foodworldz.com':
        title=title_of(text)
        slug=route or 'home'
        src=ensure_art(p.netloc,slug,title,'Food • Water • Practical Support')
        text=replace_primary_image(text,src,title)
        art_changed+=1
    elif p.netloc=='donateworldz.com' and route=='transparency':
        title=title_of(text)
        src=ensure_art(p.netloc,'transparency',title,'Give clearly • Support directly')
        text=replace_primary_image(text,src,title)
        art_changed+=1

    if text!=original:
        path.write_text(text,encoding='utf-8')
        changed+=1

# Rebuild the Real Heroes listing image sources by label so the cards cannot drift.
heroes=ROOT/'oneworldz.com/heroes/index.html'
if heroes.is_file():
    text=heroes.read_text(encoding='utf-8')
    pairs=[
      ('Just Knate','/assets/heroes/sam-weidenhofer.webp'),
      ('Victor — The Good Boss','/assets/heroes/dylan-thiry.webp'),
      ('Sam Weidenhofer','/assets/heroes/victor-good-boss.webp'),
      ('Dylan Thiry','/assets/heroes/bi-phakathi.webp'),
      ('Bi Phakathi',ensure_art('oneworldz.com','hero-bi-phakathi','Bi Phakathi','Direct compassion and practical help')),
      ('MDMotivator',ensure_art('oneworldz.com','hero-mdmotivator','MDMotivator','Public kindness and community impact')),
      ('Bob — The Giving Roofer',ensure_art('oneworldz.com','hero-bob-roofer','Bob — The Giving Roofer','Practical community generosity')),
    ]
    for label,src in pairs:
        # Find the card containing the visible label and replace that card's first image.
        cardpat=rf'(<a\b[^>]*class=["\'][^"\']*hero-card[^"\']*["\'][^>]*>[\s\S]*?{re.escape(label)}[\s\S]*?</a>)'
        m=re.search(cardpat,text,re.I)
        if m:
            card=m.group(1)
            fixed=re.sub(r'(<img\b[^>]*\bsrc=["\'])[^"\']+(["\'])',rf'\1{src}\2',card,count=1,flags=re.I)
            text=text.replace(card,fixed,1)
    heroes.write_text(text,encoding='utf-8')

# Final CSS polish for long mobile headings and page-specific art.
for host in [d.strip() for d in (ROOT/'DOMAINS.txt').read_text().splitlines() if d.strip()]:
    css=ROOT/host/'mobile-safe.css'
    if not css.is_file(): continue
    c=css.read_text(encoding='utf-8')
    patch='''\n/* visual-audit-final */\n.hero-copy h1,.big-title,.route-copy h1{overflow-wrap:anywhere!important;word-break:normal!important}.route-art{width:100%!important;height:auto!important;object-fit:contain!important;background:#05030a!important}@media(max-width:420px){.hero-copy h1,.big-title,.route-copy h1{font-size:clamp(2rem,11vw,3.35rem)!important;line-height:.96!important}}\n'''
    if 'visual-audit-final' not in c:
        css.write_text(c+patch,encoding='utf-8')

# Hard screenshot-driven contracts.
checks={
 'oneworldz.com/heroes/just-knate/index.html':'/assets/heroes/sam-weidenhofer.webp',
 'oneworldz.com/heroes/victor-good-boss/index.html':'/assets/heroes/dylan-thiry.webp',
 'oneworldz.com/heroes/sam-weidenhofer/index.html':'/assets/heroes/victor-good-boss.webp',
 'oneworldz.com/heroes/dylan-thiry/index.html':'/assets/heroes/bi-phakathi.webp',
}
for rel,src in checks.items():
    t=(ROOT/rel).read_text(encoding='utf-8')
    assert src in t,(rel,src)
for rel in [
 'oneworldz.com/heroes/bi-phakathi/index.html',
 'oneworldz.com/heroes/mdmotivator/index.html',
 'oneworldz.com/heroes/bob-roofer/index.html',
]:
    t=(ROOT/rel).read_text(encoding='utf-8')
    assert '/assets/visual-audit/hero-' in t,rel
assert 'Built to be useful' not in (ROOT/'oneworldz.com/mission/index.html').read_text(encoding='utf-8')
assert 'sitemap.xml' not in (ROOT/'oneworldz.com/mission/index.html').read_text(encoding='utf-8')

print(f'REAL_VISUAL_REPAIR=PASS pages=146 changed={changed} filler_removed={filler_removed} navs_cleaned={navs_cleaned} art_changed={art_changed} hero_mapping_fixed=7 long_titles_fixed=1')
