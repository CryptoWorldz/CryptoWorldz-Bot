#!/usr/bin/env python3
"""PDC static publication gate; does not claim payments or deployment work."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
PDC=ROOT/'purplediamondcrew.com'
routes=['','crew','our-work','hope-chest','acknowledgements']
pages={}
for route in routes:
    path=PDC/route/'index.html'
    assert path.is_file(),f'Missing PDC route: {path}'
    html=path.read_text(encoding='utf-8')
    assert '<meta name="viewport"' in html,f'Missing mobile viewport: {path}'
    assert '<title>' in html and '</title>' in html,f'Missing title: {path}'
    assert '<h1' in html,f'Missing H1: {path}'
    assert 'Purple Diamond Crew' in html,f'Missing PDC brand: {path}'
    assert 'multisignature wallet is not yet deployed' not in html.lower(),f'Obsolete custody policy: {path}'
    pages[route]=html
for route in routes[1:]:
    assert f'href="/{route}/"' in pages[''],f'Homepage does not link {route}'
assert 'Hope Chest' in pages['hope-chest']
assert 'Historical token' in pages['hope-chest'] or 'Historical tokens' in pages['hope-chest']
assert 'completed or funded' in pages[''], 'Homepage must disclose planned impact'
donate=(ROOT/'donateworldz.com/index.html').read_text(encoding='utf-8')
links=re.findall(r'href="(https://(?:donate|buy)\.stripe\.com/[^"]+)"',donate)
assert len(links)>=3,'Donation site missing expected Stripe destinations'
assert len(set(links))==len(links),'Duplicate Stripe destinations'
assert 'purplediamondcrew.com' in donate,'Donation site must link PDC'
print('PDC_STATIC_GATE=PASS routes=5 mobile_viewports=5 stripe_links_present='+str(len(links)))
print('PAYMENT_STATUS=UNVERIFIED no live account confirmation')
print('DEPLOYMENT_STATUS=NOT_CHECKED')
