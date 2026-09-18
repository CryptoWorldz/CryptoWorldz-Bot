#!/usr/bin/env python3
"""Repair defects found by the full 156-page visual QA pass.

These are screenshot-confirmed visual/content mapping defects:
1) ImpactBased root renders an empty hero panel and crushes the heading.
2) FoodWorldz subpages all reuse the same generic OneWorldz artwork.
3) OneWorldz homepage hero cards must share the same verified person mapping
   as /heroes/ (handled in final_visual_overhaul.py and asserted here).
"""
from pathlib import Path
from html import escape
import re

ROOT=Path(__file__).resolve().parents[1]

def svg(title, subtitle, accent, accent2, symbol):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
<defs>
 <radialGradient id="bg" cx="50%" cy="35%" r="80%">
  <stop offset="0" stop-color="{accent}" stop-opacity=".42"/>
  <stop offset=".55" stop-color="#10091b"/>
  <stop offset="1" stop-color="#030207"/>
 </radialGradient>
 <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop stop-color="{accent}"/><stop offset="1" stop-color="{accent2}"/>
 </linearGradient>
</defs>
<rect width="1200" height="800" rx="42" fill="url(#bg)"/>
<circle cx="600" cy="290" r="170" fill="none" stroke="url(#g)" stroke-width="10"/>
<text x="600" y="330" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="118" font-weight="800">{escape(symbol)}</text>
<text x="600" y="560" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="72" font-weight="800">{escape(title)}</text>
<text x="600" y="625" text-anchor="middle" fill="#d9d2e8" font-family="Arial,sans-serif" font-size="31">{escape(subtitle)}</text>
<text x="600" y="706" text-anchor="middle" fill="{accent2}" font-family="Arial,sans-serif" font-size="24" font-weight="700">One World • One Vision • One Fam</text>
</svg>'''

def write_art(host, slug, title, subtitle, accent, accent2, symbol):
    out=ROOT/host/'assets'/'qa'
    out.mkdir(parents=True,exist_ok=True)
    p=out/f'{slug}.svg'
    p.write_text(svg(title,subtitle,accent,accent2,symbol),encoding='utf-8')
    return '/assets/qa/'+p.name

# ---------- FoodWorldz route/content mapping ----------
food={
 'clean-water':('Clean Water','Safe water supports health and dignity','#22c55e','#38bdf8','H₂O'),
 'community':('Community','Back local helpers and practical action','#22c55e','#38bdf8','COMMUNITY'),
 'education':('Education','Nutrition and learning strengthen futures','#22c55e','#38bdf8','LEARN'),
 'meals':('Meals','Practical food pathways for communities','#22c55e','#38bdf8','MEALS'),
 'shelter':('Shelter','Food security works with safety and shelter','#22c55e','#38bdf8','HOME'),
}
food_pages={
 '':('home','FoodWorldz','Food • Water • Practical Support','#22c55e','#38bdf8','FOOD'),
 'clean-water':('clean-water','Clean Water','Safe water supports health and dignity','#22c55e','#38bdf8','H₂O'),
 'community':('community','Community','Back local helpers and practical action','#22c55e','#38bdf8','COMMUNITY'),
 'education':('education','Education','Nutrition and learning strengthen futures','#22c55e','#38bdf8','LEARN'),
 'meals':('meals','Meals','Practical food pathways for communities','#22c55e','#38bdf8','MEALS'),
 'shelter':('shelter','Shelter','Food security works with safety and shelter','#22c55e','#38bdf8','HOME'),
}
food_changed=0
for route,(asset_slug,title,subtitle,a1,a2,symbol) in food_pages.items():
    path=(ROOT/'foodworldz.com'/'index.html') if route=='' else (ROOT/'foodworldz.com'/route/'index.html')
    assert path.is_file(),path
    text=path.read_text(encoding='utf-8')
    src=write_art('foodworldz.com',asset_slug,title,subtitle,a1,a2,symbol)

    # Target the actual hero section, never a nav/logo image.
    hero=re.search(
        r'(<section\\b[^>]*class=["\\'][^"\\']*\\bhero\\b[^"\\']*["\\'][^>]*>)([\\s\\S]*?)(</section>)',
        text,
        re.I,
    )
    assert hero,(path,'hero section missing')
    hero_body=hero.group(2)
    img=re.search(r'<img[^>]*>',hero_body,re.I)
    assert img,(path,'hero image missing')
    tag=img.group(0)
    src_re=r'src="[^"]+"'
    alt_re=r'alt="[^"]*"'
    assert re.search(src_re,tag,re.I),(path,'hero src missing')
    tag=re.sub(src_re,f'src="{src}"',tag,count=1,flags=re.I)
    if re.search(alt_re,tag,re.I):
        tag=re.sub(alt_re,f'alt="{escape(title,quote=True)} artwork"',tag,count=1,flags=re.I)
    else:
        tag=tag[:-1]+f' alt="{escape(title,quote=True)} artwork">'

    fixed_body=hero_body.replace(img.group(0),tag,1)
    text=text[:hero.start(2)] + fixed_body + text[hero.end(2):]
    path.write_text(text,encoding='utf-8')
    food_changed+=1
    final=path.read_text(encoding='utf-8')
    assert src in final,(path,src)

# ---------- ImpactBased root ----------
impact=ROOT/'impactbased.oneworldz.com'/'index.html'
assert impact.is_file(),impact
text=impact.read_text(encoding='utf-8')
impact_src=write_art(
    'impactbased.oneworldz.com',
    'impactbased',
    'ImpactBased',
    'Impact-first launch infrastructure',
    '#22c55e','#a855f7','IMPACT'
)
# The root currently contains a blank <div class="hero-art"> fallback.
text=re.sub(
    r'<div\b[^>]*class=["\'][^"\']*\bhero-art\b[^"\']*["\'][^>]*>[\s\S]*?</div>',
    f'<img class="hero-art" src="{impact_src}" alt="ImpactBased artwork">',
    text,
    count=1,
    flags=re.I,
)
# If a late generator has already emitted an img, replace its source directly.
text=re.sub(
    r'(<img\b[^>]*class=["\'][^"\']*\bhero-art\b[^"\']*["\'][^>]*\bsrc=["\'])[^"\']+(["\'])',
    rf'\1{impact_src}\2',
    text,
    count=1,
    flags=re.I,
)
impact.write_text(text,encoding='utf-8')

# Domain-specific finishing CSS.
css=ROOT/'impactbased.oneworldz.com'/'final-overhaul.css'
assert css.is_file(),css
extra='''
/* screenshot-QA: ImpactBased root */
.hero-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}
.hero-copy h1{overflow-wrap:normal!important;word-break:normal!important;hyphens:none!important}
@media(max-width:1100px){.hero-grid{grid-template-columns:1fr!important}.hero-art{max-height:520px!important}}
@media(max-width:760px){.hero-art{max-height:320px!important}.hero-copy h1{font-size:clamp(2.25rem,10vw,3.8rem)!important;line-height:.98!important}}
'''
cur=css.read_text(encoding='utf-8')
if 'screenshot-QA: ImpactBased root' not in cur:
    css.write_text(cur+extra,encoding='utf-8')

# ---------- Purple Diamond Crew root ----------
# Screenshot QA found a 3,600px interior blank gap because .pdc-stage used
# min-height:72vh while the proof viewport is intentionally very tall.
# This also wastes space on real tall/mobile displays. Preserve the artwork and
# overlay positioning, but let content determine the section height.
pdc_css=ROOT/'purplediamondcrew.com'/'final-overhaul.css'
assert pdc_css.is_file(),pdc_css
pdc_cur=pdc_css.read_text(encoding='utf-8')
pdc_patch='''
/* screenshot-QA: PDC root blank-gap removal */
.pdc-stage{min-height:0!important;height:auto!important}
'''
if 'screenshot-QA: PDC root blank-gap removal' not in pdc_cur:
    pdc_css.write_text(pdc_cur+pdc_patch,encoding='utf-8')

# ---------- Assertions from the visual inspection ----------
one=ROOT/'oneworldz.com'/'index.html'
onet=one.read_text(encoding='utf-8')
assert 'data-final-heroes="1"' in onet, 'OneWorldz homepage hero grid was not rebuilt'
for expected in (
    '/assets/heroes/sam-weidenhofer.webp',
    '/assets/heroes/dylan-thiry.webp',
    '/assets/heroes/victor-good-boss.webp',
    '/assets/heroes/bi-phakathi.webp',
):
    assert expected in onet, expected

impact_text=impact.read_text(encoding='utf-8')
assert impact_src in impact_text
assert '<div class="hero-art"' not in impact_text

print(f'VISUAL_QA_REPAIRS=PASS food_pages={food_changed} impact_root=1 oneworldz_home_heroes=1 pdc_blank_gap=1')
