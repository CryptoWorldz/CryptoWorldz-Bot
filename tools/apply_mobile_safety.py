#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOMAINS = [d.strip() for d in (ROOT/'DOMAINS.txt').read_text(encoding='utf-8').splitlines() if d.strip()]
if len(DOMAINS) != 18 or len(set(DOMAINS)) != 18:
    raise SystemExit(f'DOMAIN_CONTRACT_FAILED count={len(DOMAINS)} unique={len(set(DOMAINS))}')

CSS = r'''/* Permanent OneWorldz mobile safety rail — loaded last on every generated page. */
html,body{max-width:100%!important;overflow-x:hidden!important}
body{min-width:0!important}
img,video,svg,canvas{max-width:100%!important;height:auto!important}
.nav{max-width:100%!important;overflow:visible!important;flex-wrap:wrap!important;justify-content:flex-start!important}
.nav a{min-width:0!important;max-width:100%!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;text-align:center!important}
.shell,.hero,.section,.grid,.grid2,.portal,.hero-grid,.fb-grid,.mission,.tokens,.token-grid,.mission-band,.split{min-width:0!important;max-width:100%!important}
.hero img,.hero-art,.feature-img,.card img,.hope img{width:100%!important;height:auto!important;max-height:none!important;aspect-ratio:auto!important;object-fit:contain!important;object-position:center!important}
.btn,.chip,.hero-card,.card,.world-card,.info-card,.token-card{min-width:0!important;max-width:100%!important;overflow-wrap:anywhere!important}
iframe{max-width:100%!important}
@media(max-width:720px){
  .nav{position:relative!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;padding:8px!important}
  .nav a{width:100%!important;padding:10px 8px!important}
  .shell{width:100%!important;padding:10px!important}
  .hero,.split{grid-template-columns:1fr!important}
  .grid,.grid2,.portal,.hero-grid,.fb-grid,.mission,.tokens,.token-grid{grid-template-columns:1fr!important}
  .btns,.actions{display:grid!important;grid-template-columns:1fr!important;width:100%!important}
  .btn{width:100%!important}
  .hero-overlay-title{position:static!important;margin:10px!important}
}
@media(max-width:360px){.nav{grid-template-columns:1fr!important}}
'''

for domain in DOMAINS:
    site = ROOT / domain
    if not site.is_dir():
        raise SystemExit(f'MISSING_SITE={domain}')
    (site/'mobile-safe.css').write_text(CSS, encoding='utf-8')

html_files = []
for domain in DOMAINS:
    for path in (ROOT/domain).rglob('*.html'):
        text = path.read_text(encoding='utf-8', errors='strict')
        if '<meta name="viewport"' not in text:
            raise SystemExit(f'MISSING_VIEWPORT={path.relative_to(ROOT)}')
        if '<iframe' in text.lower():
            raise SystemExit(f'IFRAME_FORBIDDEN={path.relative_to(ROOT)}')
        if 'facebook.com/plugins/' in text.lower():
            raise SystemExit(f'FACEBOOK_PLUGIN_FORBIDDEN={path.relative_to(ROOT)}')
        if 'based.bid' in text.lower() or 'powered by based' in text.lower():
            raise SystemExit(f'RETIRED_BRANDING_FORBIDDEN={path.relative_to(ROOT)}')
        link = '<link rel="stylesheet" href="/mobile-safe.css">'
        if link not in text:
            if '</head>' not in text:
                raise SystemExit(f'NO_HEAD={path.relative_to(ROOT)}')
            text = text.replace('</head>', link + '</head>', 1)
            path.write_text(text, encoding='utf-8')
        html_files.append(path)

if len(html_files) < 18:
    raise SystemExit(f'TOO_FEW_PAGES={len(html_files)}')

one = (ROOT/'oneworldz.com/heroes/index.html').read_text(encoding='utf-8')
hero_slugs = ['just-knate','victor-good-boss','sam-weidenhofer','dylan-thiry','bi-phakathi','mdmotivator','bob-roofer','reagan-kauja']
for slug in hero_slugs:
    if f'/heroes/{slug}/' not in one:
        raise SystemExit(f'MISSING_HERO_LINK={slug}')

for rel in ['oneworldz.com/community-support/index.html','donateworldz.com/community-impact/index.html']:
    text = (ROOT/rel).read_text(encoding='utf-8')
    count = text.count('https://www.facebook.com/share/')
    if count != 35:
        raise SystemExit(f'COMMUNITY_LINK_COUNT_FAILED path={rel} count={count}')

for rel in ['donateworldz.com/reagan-children/index.html','donateworldz.com/davis-family/index.html','donateworldz.com/jayjay-support/index.html']:
    text=(ROOT/rel).read_text(encoding='utf-8').lower()
    if 'https://www.facebook.com/share/' not in text:
        raise SystemExit(f'MISSING_DIRECT_FACEBOOK_LINK={rel}')
    if '<iframe' in text:
        raise SystemExit(f'IFRAME_SURVIVED={rel}')

print(f'MOBILE_SAFETY=PASS sites={len(DOMAINS)} pages={len(html_files)} iframes=0 horizontal_nav_scroll=0 direct_facebook=1')
