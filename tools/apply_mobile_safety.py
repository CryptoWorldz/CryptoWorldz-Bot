#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
DOMAINS=[d.strip() for d in (ROOT/'DOMAINS.txt').read_text(encoding='utf-8').splitlines() if d.strip()]
if len(DOMAINS)!=18 or len(set(DOMAINS))!=18:
    raise SystemExit(f'DOMAIN_CONTRACT_FAILED count={len(DOMAINS)} unique={len(set(DOMAINS))}')

CSS=r'''/* Permanent OneWorldz mobile safety rail — loaded last on every generated page. */
html,body{max-width:100%!important;overflow-x:hidden!important}body{min-width:0!important}img,video,svg,canvas{max-width:100%!important;height:auto!important}.nav{max-width:100%!important;overflow:visible!important;flex-wrap:wrap!important;justify-content:flex-start!important}.nav a{min-width:0!important;max-width:100%!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;text-align:center!important}.shell,.hero,.section,.grid,.grid2,.portal,.hero-grid,.tool-grid,.support-grid,.fb-grid,.mission,.tokens,.token-grid,.mission-band,.split,.hero-profile{min-width:0!important;max-width:100%!important}.hero img,.hero-art,.feature-img,.card img,.hero-card img,.hope img,.hero-profile img{width:100%!important;height:auto!important;max-height:none!important;aspect-ratio:auto!important;object-fit:contain!important;object-position:center!important}.btn,.chip,.hero-card,.card,.world-card,.info-card,.token-card,.tool,.support-card{min-width:0!important;max-width:100%!important;overflow-wrap:anywhere!important}iframe{max-width:100%!important}.home-hero-art{max-height:440px!important;object-fit:contain!important}.ow-home-button{position:fixed;z-index:10000;top:max(10px,env(safe-area-inset-top));left:max(10px,env(safe-area-inset-left));display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 13px;border:1px solid rgba(255,255,255,.28);border-radius:14px;background:rgba(5,4,10,.94);color:#fff!important;text-decoration:none!important;font:900 14px/1 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.42);backdrop-filter:blur(12px)}.ow-home-button .ow-home-icon{font-size:24px;line-height:1}.ow-home-button .ow-home-label{line-height:1}
@media(max-width:720px){.nav{position:relative!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;padding:8px!important}.nav a{width:100%!important;padding:10px 8px!important}.shell{width:100%!important;padding:10px!important}.hero,.split,.hero-profile{grid-template-columns:1fr!important}.grid,.grid2,.portal,.hero-grid,.tool-grid,.support-grid,.fb-grid,.mission,.tokens,.token-grid{grid-template-columns:1fr!important}.btns,.actions{display:grid!important;grid-template-columns:1fr!important;width:100%!important}.btn{width:100%!important}.hero-overlay-title{position:static!important;margin:10px!important}.home-hero-art{max-height:340px!important}.ow-home-button{width:46px;height:46px;min-height:46px;padding:0;border-radius:13px}.ow-home-button .ow-home-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}}
@media(max-width:360px){.nav{grid-template-columns:1fr!important}}
'''
HOME='<a class="ow-home-button" href="/" aria-label="Home"><span class="ow-home-icon" aria-hidden="true">⌂</span><span class="ow-home-label">Home</span></a>'

for domain in DOMAINS:
    site=ROOT/domain
    if not site.is_dir(): raise SystemExit(f'MISSING_SITE={domain}')
    (site/'mobile-safe.css').write_text(CSS,encoding='utf-8')

html_files=[]
for domain in DOMAINS:
    for path in (ROOT/domain).rglob('*.html'):
        text=path.read_text(encoding='utf-8',errors='strict')
        low=text.lower()
        if '<meta name="viewport"' not in low: raise SystemExit(f'MISSING_VIEWPORT={path.relative_to(ROOT)}')
        if '<iframe' in low: raise SystemExit(f'IFRAME_FORBIDDEN={path.relative_to(ROOT)}')
        if 'facebook.com/plugins/' in low: raise SystemExit(f'FACEBOOK_PLUGIN_FORBIDDEN={path.relative_to(ROOT)}')
        if 'based.bid' in low or 'powered by based' in low: raise SystemExit(f'RETIRED_BRANDING_FORBIDDEN={path.relative_to(ROOT)}')
        link='<link rel="stylesheet" href="/mobile-safe.css">'
        if link not in text:
            if '</head>' not in text: raise SystemExit(f'NO_HEAD={path.relative_to(ROOT)}')
            text=text.replace('</head>',link+'</head>',1)
        if 'class="ow-home-button"' not in text:
            text,count=re.subn(r'(<body\b[^>]*>)',r'\1'+HOME,text,count=1,flags=re.I)
            if count!=1: raise SystemExit(f'NO_BODY_FOR_HOME={path.relative_to(ROOT)}')
        path.write_text(text,encoding='utf-8')
        html_files.append(path)

if len(html_files)<18: raise SystemExit(f'TOO_FEW_PAGES={len(html_files)}')

hero_index=(ROOT/'oneworldz.com/heroes/index.html').read_text(encoding='utf-8')
hero_assets=['just-knate.webp','victor-good-boss.webp','sam-weidenhofer.webp','dylan-thiry.webp','bi-phakathi.webp','mdmotivator.webp','heroes-world.webp']
for asset in hero_assets:
    p=ROOT/'oneworldz.com/assets/heroes'/asset
    if not p.is_file() or p.stat().st_size<10000: raise SystemExit(f'DEDICATED_HERO_ASSET_MISSING={asset}')
    raw=p.read_bytes()
    if raw[:4] != b'RIFF' or raw[8:12] != b'WEBP': raise SystemExit(f'DEDICATED_HERO_ASSET_CORRUPT={asset}')
    if f'/assets/heroes/{asset}' not in hero_index: raise SystemExit(f'DEDICATED_HERO_NOT_USED={asset}')
for emoji in ['💜','🤝','🫶','🏠','🌍','✨','🔨']:
    if emoji in hero_index: raise SystemExit(f'HERO_PLACEHOLDER_SURVIVED={emoji}')

one=(ROOT/'oneworldz.com/index.html').read_text(encoding='utf-8')
if 'OneWorldz GPT System' not in one: raise SystemExit('ONEWORLDZ_GPT_SECTION_MISSING')
if 'class="ow-home-button"' not in one: raise SystemExit('ONEWORLDZ_HOME_BUTTON_MISSING')

for rel in ['oneworldz.com/community-support/index.html','donateworldz.com/community-impact/index.html']:
    text=(ROOT/rel).read_text(encoding='utf-8')
    if text.count('https://www.facebook.com/share/')!=35: raise SystemExit(f'COMMUNITY_LINK_COUNT_FAILED={rel}')

stripe_contract={
 'donateworldz.com/davis-family/index.html':'https://donate.stripe.com/dRm8wPdKa0Kt2NE7lz0kE03',
 'donateworldz.com/community-impact/index.html':'https://donate.stripe.com/9B67sLgWm78R73U35j0kE02',
 'donateworldz.com/jayjay-support/index.html':'https://buy.stripe.com/6oUeVd9tU0Ktewm0Xb0kE00',
}
for rel,url in stripe_contract.items():
    text=(ROOT/rel).read_text(encoding='utf-8')
    if url not in text: raise SystemExit(f'STRIPE_DESTINATION_MISSING={rel}')
    if 'class="ow-home-button"' not in text: raise SystemExit(f'HOME_BUTTON_MISSING={rel}')

reserved='https://donate.stripe.com/14A6oHcG61Ox87Y0Xb0kE01'
for path in html_files:
    text=path.read_text(encoding='utf-8')
    if 'class="ow-home-button"' not in text:
        raise SystemExit(f'HOME_BUTTON_MISSING={path.relative_to(ROOT)}')
    if reserved in text:
        raise SystemExit(f'RESERVED_FUTURE_STRIPE_MUST_NOT_BE_PUBLIC={path.relative_to(ROOT)}')

print(f'MOBILE_SAFETY=PASS sites={len(DOMAINS)} pages={len(html_files)} home_button=all hero_placeholders=0 dedicated_images=7 active_stripe_streams=3 reserved_future_stripe_hidden=1')
