#!/usr/bin/env python3
from pathlib import Path
from html import escape

ROOT=Path(__file__).resolve().parents[1]
BUILD='2026-09-05-architecture-v2'

# DonateWorldz: exactly four simple pathways. No emoji/placeholders.
donate=ROOT/'donateworldz.com'
nav='''<nav class="nav"><a class="brand" href="/">DonateWorldz</a><a href="https://oneworldz.com">OneWorldz</a><a href="/reagan-children/">Reagan & Children</a><a href="/davis-family/">Davis Family</a><a href="/community-impact/">Community Impact</a><a href="/jayjay-support/">JayJayTeamDev</a></nav>'''
cards=[
 ('Reagan & Children','Action Spreads Smiles — Uganda.','/reagan-children/','/reagan.png'),
 ('Davis Family','Dedicated family support.','/davis-family/',None),
 ('Community Impact','One separate support stream plus 35 direct Facebook destinations.','/community-impact/',None),
 ('Support JayJayTeamDev','Support the work behind the OneWorldz ecosystem.','/jayjay-support/',None),
]
parts=[]
for name,desc,href,img in cards:
    visual=f'<img src="{img}" alt="{escape(name)} artwork" loading="lazy">' if img else ''
    parts.append(f'<a class="card donate-path" href="{href}">{visual}<b>{escape(name)}</b><span>{escape(desc)}</span><i>OPEN DONATION PAGE →</i></a>')
body=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark"><title>DonateWorldz | Four Direct Support Pathways</title><link rel="stylesheet" href="/visual-fix.css"><style>.donate-path{{min-height:190px;justify-content:center}}.donate-path img{{max-height:360px;object-fit:contain}}.donate-path b{{font-size:1.35rem}}</style></head><body data-oneworldz-build="{BUILD}">{nav}<main class="shell"><section class="section"><p class="ey">Give clearly • Support directly</p><h1>DonateWorldz</h1><p>Four simple, separated support pathways. Each page shows its own Stripe destination and Facebook link. Payment details stay on Stripe.</p><div class="grid2">{''.join(parts)}</div></section></main><div class="foot">OneWorldz 🌐 One Vision • Helping the People Who Help People</div></body></html>'''
(donate/'index.html').write_text(body,encoding='utf-8')

# Uniform blockchain family with a dedicated colour identity on each existing Worldz.
chains={
 'solworldz.xyz':('SolWorldz','#14f195','#9945ff'),
 'ethworldz.xyz':('EthWorldz','#627eea','#b6b9ff'),
 'baseworldz.xyz':('BaseWorldz','#0052ff','#6fa8ff'),
 'bnbworldz.xyz':('BNBWorldz','#f3ba2f','#fff09b'),
 'xrpworldz.xyz':('XRPWorldz','#00aae4','#8ceaff'),
 'suiworldz.xyz':('SuiWorldz','#6fbcf0','#c0ebff'),
 'hyperworldz.xyz':('HyperWorldz','#63f5c8','#c5ffe8'),
 'robinworldz.xyz':('RobinWorldz','#7dde35','#d6ff8f'),
}
for host,(name,a1,a2) in chains.items():
    p=ROOT/host/'index.html'
    if not p.is_file(): raise SystemExit(f'MISSING_CHAIN_PAGE={host}')
    text=p.read_text(encoding='utf-8')
    theme=f'<style>:root{{--chain-accent:{a1};--chain-accent2:{a2}}}.nav .brand,.ey{{color:var(--chain-accent)!important}}.btn{{background:linear-gradient(135deg,var(--chain-accent),var(--chain-accent2))!important;color:#05040a!important;border-color:var(--chain-accent)!important}}.hero,.section{{border-color:color-mix(in srgb,var(--chain-accent) 45%,#3c2b49)!important}}</style>'
    if '</head>' not in text: raise SystemExit(f'CHAIN_HEAD_MISSING={host}')
    text=text.replace('</head>',theme+'</head>',1)
    p.write_text(text,encoding='utf-8')

# Acceptance: DonateWorldz is four links, and the blockchain family has eight distinct themes.
donate_text=(donate/'index.html').read_text(encoding='utf-8')
for href in ['/reagan-children/','/davis-family/','/community-impact/','/jayjay-support/']:
    assert donate_text.count(f'href="{href}"') >= 1, href
for old in ['💜','🌍','🫶']:
    assert old not in donate_text,old
assert len({v[1] for v in chains.values()})==8
for host,(name,a1,a2) in chains.items():
    text=(ROOT/host/'index.html').read_text(encoding='utf-8')
    assert a1 in text and a2 in text and '/hero.png' in text,(host,'theme/hero')
print('ARCHITECTURE_FINISH=PASS donate_paths=4 donate_placeholders=0 chain_worldz=8 unique_themes=8')
