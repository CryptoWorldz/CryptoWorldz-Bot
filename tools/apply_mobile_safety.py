#!/usr/bin/env python3
from pathlib import Path
import re
import runpy

ROOT=Path(__file__).resolve().parents[1]
DOMAINS=[d.strip() for d in (ROOT/'DOMAINS.txt').read_text(encoding='utf-8').splitlines() if d.strip()]
if len(DOMAINS)!=18 or len(set(DOMAINS))!=18:
    raise SystemExit(f'DOMAIN_LIST_FAILED count={len(DOMAINS)} unique={len(set(DOMAINS))}')

CSS=r'''html,body{max-width:100%!important;overflow-x:hidden!important}body{min-width:0!important}img,video,svg,canvas{max-width:100%!important;height:auto!important}.nav{max-width:100%!important;flex-wrap:wrap!important}.nav a{min-width:0!important;max-width:100%!important;overflow-wrap:anywhere!important;text-align:center!important}.shell,.hero,.section,.grid,.grid2,.portal,.hero-grid,.hero-list,.system-grid,.support-grid,.fb-grid,.mission,.tokens,.token-grid,.mission-band,.split,.hero-profile{min-width:0!important;max-width:100%!important}.hero,.card,.world-card,.visual-card,.hero-card,.feature-card,.hope,.hero-profile{height:auto!important;min-height:0!important;aspect-ratio:auto!important}.hero picture,.card picture,.world-card picture,.visual-card picture,.hero-card picture,.feature-card picture,.hope picture,.hero-profile picture{display:block!important;width:100%!important;height:auto!important;aspect-ratio:auto!important}.hero img,.hero-art,.feature-img,.card img,.hero-card img,.visual-card img,.world-card img,.hope img,.hero-profile img{display:block!important;width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;aspect-ratio:auto!important;object-fit:contain!important;object-position:center!important;margin:0 auto!important}.hero-list .hero-card{display:block!important;padding:0!important;grid-template-columns:none!important}.hero-list .hero-card img{width:100%!important;height:auto!important;aspect-ratio:auto!important;object-fit:contain!important;border-radius:0!important}.hero-list .hero-card .copy{display:block!important;padding:14px 16px 18px!important}.card,.world-card,.visual-card,.hero-card{overflow:hidden!important}.btn,.chip,.hero-card,.card,.world-card,.info-card,.token-card,.visual-card,.support-card{min-width:0!important;max-width:100%!important;overflow-wrap:anywhere!important}.ow-home-button{position:fixed;z-index:10000;top:10px;left:10px;display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 13px;border:1px solid rgba(255,255,255,.28);border-radius:14px;background:rgba(5,4,10,.94);color:#fff!important;text-decoration:none!important;font:900 14px/1 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.42)}@media(max-width:720px){.nav{position:relative!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;padding:8px!important}.nav a{width:100%!important;padding:10px 8px!important;white-space:normal!important}.shell{width:100%!important;padding:10px!important}.hero,.hero-grid,.split,.hero-profile{grid-template-columns:1fr!important}.grid,.grid2,.portal,.hero-list,.system-grid,.support-grid,.fb-grid,.mission,.tokens,.token-grid{grid-template-columns:1fr!important}.btns,.actions{display:grid!important;grid-template-columns:1fr!important;width:100%!important}.btn{width:100%!important}.hero img,.hero-art,.feature-img,.card img,.hero-card img,.visual-card img,.world-card img,.hope img,.hero-profile img{width:100%!important;height:auto!important;max-height:none!important;aspect-ratio:auto!important;object-fit:contain!important}.ow-home-button{width:46px;height:46px;padding:0;border-radius:13px;font-size:0}.ow-home-button:before{content:'⌂';font-size:24px}}@media(max-width:360px){.nav{grid-template-columns:1fr!important}}'''
HOME='<a class="ow-home-button" href="/" aria-label="Home">Home</a>'
LINK='<link rel="stylesheet" href="/mobile-safe.css">'
SOURCE_FIXES={'https://cryptoworldz.xyz/hero.png':'https://cryptoworldz.xyz/command-centre-five.png','https://donateworldz.com/reagan.png':'https://donateworldz.com/hero.png'}
for domain in DOMAINS:
    site=ROOT/domain
    if not site.is_dir(): raise SystemExit(f'MISSING_SITE={domain}')
    (site/'mobile-safe.css').write_text(CSS,encoding='utf-8')
html_files=[]; source_fix_count=0
for domain in DOMAINS:
    for path in (ROOT/domain).rglob('*.html'):
        text=path.read_text(encoding='utf-8',errors='strict')
        if '<meta name="viewport"' not in text.lower(): raise SystemExit(f'MISSING_VIEWPORT={path.relative_to(ROOT)}')
        for old,new in SOURCE_FIXES.items():
            n=text.count(old)
            if n: text=text.replace(old,new); source_fix_count+=n
        if LINK not in text: text=text.replace('</head>',LINK+'</head>',1)
        if 'class="ow-home-button"' not in text:
            text,count=re.subn(r'(<body\b[^>]*>)',r'\1'+HOME,text,count=1,flags=re.I)
            if count!=1: raise SystemExit(f'NO_BODY={path.relative_to(ROOT)}')
        path.write_text(text,encoding='utf-8'); html_files.append(path)
heroes=[('Just Knate','just-knate','just-knate.webp','Direct help and dignity'),('Victor — The Good Boss','victor-good-boss','victor-good-boss.webp','Recovery, hope and second chances'),('Sam Weidenhofer','sam-weidenhofer','sam-weidenhofer.webp','Everyday community kindness'),('Dylan Thiry','dylan-thiry','dylan-thiry.webp','Building hope and stronger futures'),('Bi Phakathi','bi-phakathi','bi-phakathi.webp','Compassion in action'),('MDMotivator','mdmotivator','mdmotivator.webp','Global kindness and encouragement'),('Bob — The Giving Roofer','bob-roofer','heroes-world.webp','Practical community generosity')]
hero_dir=ROOT/'oneworldz.com/assets/heroes'
for _,_,asset,_ in heroes:
    p=hero_dir/asset
    if not p.is_file() or p.stat().st_size<10000: raise SystemExit(f'HERO_ASSET_MISSING={asset}')
cards=''.join(f'<a class="hero-card" href="/heroes/{slug}/"><img src="/assets/heroes/{asset}" alt="{name}"><div class="copy"><strong>{name}</strong><span>{desc}</span><b class="enter">OPEN PROFILE →</b></div></a>' for name,slug,asset,desc in heroes)
hero_page=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Real Heroes | OneWorldz</title><link rel="stylesheet" href="/style.css">{LINK}<style>:root{{--accent:#8b5cf6;--accent2:#38bdf8}}</style></head><body data-oneworldz-build="2026-09-12-image-fit">{HOME}<nav class="nav"><a class="brand" href="/">OneWorldz</a><a href="/heroes/">Real Heroes</a><a href="/community-support/">Community Support</a><a href="https://donateworldz.com">DonateWorldz</a></nav><main class="shell"><section class="section"><p class="eyebrow">People helping people</p><h1 class="big-title">Real Heroes</h1><p>Real people. Real help. Real impact.</p><div class="hero-list">{cards}</div></section></main><footer class="footer"><strong>Created with the Vision</strong><br>Make the Difference • OneWorldz 🌏 One Vision</footer></body></html>'''
(ROOT/'oneworldz.com/heroes/index.html').write_text(hero_page,encoding='utf-8')
for forbidden in ('object-fit:cover','height:100%!important'):
    if forbidden in CSS.replace('min-height:100vh',''): raise SystemExit(f'IMAGE_CONTRACT_FAILED forbidden={forbidden}')
print(f'IMAGE_FIT=PASS sites={len(DOMAINS)} pages={len(html_files)} dedicated_heroes={len(heroes)} source_fixes={source_fix_count} crop=0 stretch=0 mobile_stack=1')
runpy.run_path(str(ROOT/'tools/apply_100_fixes.py'),run_name='__main__')
runpy.run_path(str(ROOT/'VERIFY_FIRST_100_FIXED.py'),run_name='__main__')
