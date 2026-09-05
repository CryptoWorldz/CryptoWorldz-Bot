#!/usr/bin/env python3
from pathlib import Path
from html import escape

R = Path(__file__).resolve().parents[1]
B = '2026-09-05-mobile-safe'

CSS = r'''*{box-sizing:border-box}html{background:#05040a;color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:100%;overflow-x:hidden}body{margin:0;background:radial-gradient(circle at top,#18082a,#05040a 42%);min-height:100vh;max-width:100%;overflow-x:hidden;color:#fff}img{max-width:100%;height:auto}.nav{position:sticky;top:0;z-index:10;display:flex;flex-wrap:wrap;gap:8px;padding:10px 14px;background:#05050bf5;border-bottom:1px solid #532a75}.nav a{min-width:0;color:#fff;text-decoration:none;font-weight:800;padding:10px 13px;border:1px solid #36313d;border-radius:14px;background:#0a0910;text-align:center;overflow-wrap:anywhere}.nav .brand{color:#45bfff}.shell{width:min(100%,1120px);margin:auto;padding:16px 14px 56px}.hero,.section{border:1px solid #3c2b49;border-radius:22px;background:#0b0810;margin-bottom:20px;overflow:hidden}.hero{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(0,.88fr);align-items:center}.hero>img{width:100%;height:auto;max-height:76vh;object-fit:contain;object-position:center;background:#020205;display:block}.copy,.section{padding:24px}.ey{letter-spacing:.13em;text-transform:uppercase;font-weight:900;color:#cdbbd9}.hero h1,.section h1,.section h2{font-size:clamp(2rem,5vw,3.7rem);line-height:1.04;margin:.25em 0}.copy p,.section p{color:#c9c1d3;font-size:1.06rem;line-height:1.55}.btns{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.btn{display:inline-flex;align-items:center;justify-content:center;max-width:100%;min-height:48px;padding:11px 15px;border-radius:14px;background:linear-gradient(135deg,#7c3aed,#2563eb);border:1px solid #8b5cf6;color:#fff;text-decoration:none;font-weight:900;text-align:center;overflow-wrap:anywhere}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.card{display:flex;flex-direction:column;color:#fff;text-decoration:none;border:1px solid #5b377d;border-radius:20px;overflow:hidden;background:#100a17;min-width:0}.card img{width:100%;height:auto;aspect-ratio:auto;object-fit:contain;object-position:center;background:#020205;display:block}.card b,.card span{display:block;padding:0 16px}.card b{font-size:1.2rem;padding-top:15px}.card span{color:#c5bacd;padding-top:6px;line-height:1.45}.card i{display:block;padding:14px 16px 17px;color:#62c7ff;font-style:normal;font-weight:900;margin-top:auto}.hero-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.hero-card{display:grid;grid-template-columns:64px minmax(0,1fr);gap:14px;align-items:center;color:#fff;text-decoration:none;border:1px solid #5b377d;border-radius:20px;padding:16px;background:linear-gradient(145deg,#191025,#0c0912);min-width:0}.hero-card .symbol{width:64px;height:64px;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:2rem;background:radial-gradient(circle at 35% 30%,#6232b0,#141021 70%);border:1px solid #7840ad}.hero-card strong{font-size:1.15rem;display:block;overflow-wrap:anywhere}.hero-card span{display:block;color:#c5bacd;font-size:.94rem;line-height:1.35;margin-top:4px}.profile-banner{padding:28px;min-height:250px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:radial-gradient(circle at center,#32144f,#09070f 68%)}.profile-banner .symbol{font-size:4.5rem}.profile-banner h1{margin:.18em 0}.profile-banner p{max-width:720px}.mission{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.mission a{color:#fff;text-decoration:none;border:1px solid #653e96;border-radius:18px;padding:18px;background:linear-gradient(145deg,#211333,#0b0810)}.mission em{display:block;font-style:normal;font-size:2rem}.mark{display:flex;align-items:center;justify-content:center;min-height:300px;text-align:center;font-size:clamp(2.5rem,9vw,6.2rem);font-weight:900;background:radial-gradient(circle,#2b1243,#09070f 60%);padding:20px}.law{color:#f6c85b}.impact{color:#77ed71;flex-direction:column}.impact small{font-size:.25em;letter-spacing:.15em}.tokens{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.token{color:#fff;text-decoration:none;border:1px solid #6d38a4;border-radius:16px;padding:14px;background:#0f0816;overflow-wrap:anywhere}.hope img{width:100%;display:block;height:auto;max-height:none;object-fit:contain;background:#020205}.fb-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.fb-card{border:1px solid #35518a;border-radius:18px;background:linear-gradient(145deg,#0c1425,#080d18);padding:18px;min-width:0}.fb-card h3{margin:0 0 6px;font-size:1.15rem}.fb-card p{margin:0 0 14px;color:#b9c6dd;font-size:.95rem}.foot{text-align:center;color:#948b9a;padding:24px 14px;overflow-wrap:anywhere}
@media(max-width:820px){.hero{grid-template-columns:1fr}.hero>img{max-height:none}.grid,.mission{grid-template-columns:repeat(2,minmax(0,1fr))}.grid2,.fb-grid{grid-template-columns:1fr}.tokens{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:620px){.nav{position:relative;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));padding:9px}.nav a{width:100%;padding:10px 8px;font-size:.98rem}.shell{padding:12px 10px 44px}.copy,.section{padding:18px}.hero-grid,.grid,.mission,.tokens{grid-template-columns:1fr}.hero-card{grid-template-columns:54px minmax(0,1fr);padding:14px}.hero-card .symbol{width:54px;height:54px;font-size:1.65rem}.btns{display:grid;grid-template-columns:1fr}.btn{width:100%}.hero h1,.section h1,.section h2{font-size:clamp(1.85rem,9vw,2.7rem)}}
@media(max-width:360px){.nav{grid-template-columns:1fr}.hero-card{grid-template-columns:1fr;text-align:center}.hero-card .symbol{margin:auto}}
'''

def w(path, text):
    p = R / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')

def style(site):
    w(f'{site}/visual-fix.css', CSS)

def page(title, nav, body):
    n = ''.join(f'<a class="{"brand" if i == 0 else ""}" href="{u}">{escape(t)}</a>' for i, (t, u) in enumerate(nav))
    return f'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark"><title>{escape(title)}</title><link rel="stylesheet" href="/visual-fix.css"></head><body data-oneworldz-build="{B}"><nav class="nav">{n}</nav><main class="shell">{body}</main><div class="foot">OneWorldz 🌐 One Vision • Helping the People Who Help People</div></body></html>'

def card(u, img, t, s):
    return f'<a class="card" href="{u}"><img src="{img}" alt="{escape(t)} artwork" loading="lazy"><b>{escape(t)}</b><span>{escape(s)}</span><i>ENTER →</i></a>'

# OneWorldz
style('oneworldz.com')
mis = [('🍲','Food','/food/'),('💧','Clean Water','/clean-water/'),('🏠','Shelter','/shelter/'),('📚','Education','/education/'),('✚','Medical Care','/medical-care/'),('🤝','Community','/community/')]
mi = ''.join(f'<a href="{u}"><em>{i}</em><b>{t}</b></a>' for i,t,u in mis)
heroes = [
    ('Just Knate','just-knate','Direct help and dignity','💜'),
    ('Victor — The Good Boss','victor-good-boss','Recovery, hope and second chances','🤝'),
    ('Sam Weidenhofer','sam-weidenhofer','Everyday community kindness','🫶'),
    ('Dylan Thiry','dylan-thiry','Building hope and stronger futures','🏠'),
    ('Bi Phakathi','bi-phakathi','Compassion in action','🌍'),
    ('MDMotivator','mdmotivator','Global kindness and mental-health encouragement','✨'),
    ('Bob — The Giving Roofer','bob-roofer','Practical community generosity','🔨'),
    ('Reagan Kauja','reagan-kauja','Action Spreads Smiles — Uganda','💜')
]
hi = ''.join(f'<a class="hero-card" href="/heroes/{s}/"><span class="symbol">{ic}</span><span><strong>{escape(n)}</strong><span>{escape(f)}</span></span></a>' for n,s,f,ic in heroes)
port = ''.join([
    card('https://donateworldz.com','https://donateworldz.com/reagan.png','DonateWorldz','Clear support pathways'),
    card('https://foodworldz.com','https://foodworldz.com/hero.png','FoodWorldz','Food, water and practical support'),
    card('https://purplediamondcrew.com','https://purplediamondcrew.com/action-team.png','Purple Diamond Crew','Real people. Real help. Real impact.'),
    card('https://cryptoworldz.xyz','https://cryptoworldz.xyz/hero.png','CryptoWorldz','Separate crypto central')
])
body = f'<section class="hero"><img src="/hero.png" alt="OneWorldz approved artwork"><div class="copy"><p class="ey">OneWorldz 🌐 One Vision</p><h1>Helping the People Who Help People.</h1><p>Humanity first: kindness, hope, action, food, water, shelter, education, health and community. CryptoWorldz stays separate.</p><div class="btns"><a class="btn" href="/heroes/">Meet the Heroes</a><a class="btn" href="https://donateworldz.com">DonateWorldz</a></div></div></section><section class="section"><h2>Mission</h2><div class="mission">{mi}</div></section><section class="section"><h2>Real heroes</h2><div class="hero-grid">{hi}</div></section><section class="section"><h2>Enter the ecosystem</h2><div class="grid2">{port}</div></section>'
w('oneworldz.com/index.html', page('OneWorldz | One Vision',[('OneWorldz','/'),('Mission','/mission/'),('Heroes','/heroes/'),('DonateWorldz','https://donateworldz.com'),('FoodWorldz','https://foodworldz.com'),('CryptoWorldz','https://cryptoworldz.xyz')],body))
w('oneworldz.com/heroes/index.html', page('Heroes | OneWorldz',[('OneWorldz','/'),('Heroes','/heroes/')],f'<section class="section"><p class="ey">OneWorldz Heroes</p><h1>People helping people.</h1><p>Dedicated profile routes for public work centred on practical help. No partnership or endorsement is implied unless explicitly stated.</p><div class="hero-grid">{hi}</div></section>'))
for n,s,f,ic in heroes:
    if s == 'reagan-kauja':
        visual = '<img src="/reagan.png" alt="Reagan Kauja / Action Spreads Smiles approved artwork">'
    else:
        visual = f'<div class="profile-banner"><div class="symbol">{ic}</div><p class="ey">OneWorldz Hero</p><h1>{escape(n)}</h1><p>{escape(f)}</p></div>'
    body = f'<section class="hero">{visual}<div class="copy"><p class="ey">Helping the People Who Help People</p><h1>{escape(n)}</h1><p>{escape(f)}. This page recognises the public work described in the approved OneWorldz materials without fabricating a partnership or endorsement.</p><div class="btns"><a class="btn" href="/heroes/">All Heroes</a><a class="btn" href="https://donateworldz.com">Support Pathways</a></div></div></section>'
    w(f'oneworldz.com/heroes/{s}/index.html', page(f'{n} | OneWorldz',[('OneWorldz','/'),('Heroes','/heroes/'),(n,f'/heroes/{s}/')],body))

# CryptoWorldz and blockchain Worldz
style('cryptoworldz.xyz')
chains=[('SolWorldz','solworldz.xyz'),('EthWorldz','ethworldz.xyz'),('BaseWorldz','baseworldz.xyz'),('BNBWorldz','bnbworldz.xyz'),('XRPWorldz','xrpworldz.xyz'),('SuiWorldz','suiworldz.xyz'),('HyperWorldz','hyperworldz.xyz'),('RobinWorldz','robinworldz.xyz')]
ci=''.join(card(f'https://{d}',f'https://{d}/hero.png',n,'Dedicated blockchain Worldz') for n,d in chains)
cb=f'<section class="hero"><img src="/hero.png" alt="CryptoWorldz approved artwork"><div class="copy"><p class="ey">CryptoWorldz HQ</p><h1>Crypto lives here.</h1><p>Dedicated blockchain central and doorway to the protected Command Centre.</p><div class="btns"><a class="btn" href="https://cryptobotz.cryptoworldz.xyz">Open Command Centre</a><a class="btn" href="https://oneworldz.com">OneWorldz</a></div></div></section><section class="section"><h2>Clickable Worldz artwork</h2><div class="grid2">{ci}</div></section>'
w('cryptoworldz.xyz/index.html',page('CryptoWorldz | Crypto Central',[('CryptoWorldz','/'),('Command Centre','https://cryptobotz.cryptoworldz.xyz'),('Worldz','/worldz/'),('OneWorldz','https://oneworldz.com')],cb))
for n,d in chains:
    style(d)
    b=f'<section class="hero"><img src="/hero.png" alt="Approved {n} artwork"><div class="copy"><p class="ey">CryptoWorldz</p><h1>{n}</h1><p>Dedicated blockchain destination. Navigation returns to CryptoWorldz Central.</p><div class="btns"><a class="btn" href="https://cryptoworldz.xyz">CryptoWorldz Central</a><a class="btn" href="/learn/">Learn</a></div></div></section>'
    w(f'{d}/index.html',page(f'{n} | CryptoWorldz',[(n,'/'),('CryptoWorldz','https://cryptoworldz.xyz'),('Learn','/learn/'),('Community','/community/')],b))

# DonateWorldz
style('donateworldz.com')
db='<section class="hero"><div class="mark">DonateWorldz</div><div class="copy"><p class="ey">Give clearly. Support directly.</p><h1>Choose the purpose.</h1><p>Every support pathway is separated and clearly labelled. No blank social-media embeds are used.</p></div></section><section class="section"><div class="grid2">'+card('/reagan-children/','/reagan.png','Reagan & Children','Action Spreads Smiles — dedicated support')+'<a class="hero-card" href="/davis-family/"><span class="symbol">💜</span><span><strong>Davis Family</strong><span>Dedicated family support</span></span></a><a class="hero-card" href="/community-impact/"><span class="symbol">🌍</span><span><strong>Community Charity</strong><span>35 verified community destinations</span></span></a><a class="hero-card" href="/jayjay-support/"><span class="symbol">🫶</span><span><strong>JayJayTeamDev Support</strong><span>Support the mission</span></span></a></div></section>'
w('donateworldz.com/index.html',page('DonateWorldz | Give Clearly',[('DonateWorldz','/'),('OneWorldz','https://oneworldz.com'),('Reagan','/reagan-children/'),('Community','/community-impact/')],db))

# Independent ImpactBased
style('impactbased.oneworldz.com')
ib='<section class="hero"><div class="mark impact">IMPACT BASED<small>INDEPENDENT ONEWORLDZ LAUNCHPAD</small></div><div class="copy"><p class="ey">Independent launch infrastructure</p><h1>Proof before promises.</h1><p>No retired external launch-board branding or dependency.</p><div class="btns"><a class="btn" href="/standards/">Standards</a><a class="btn" href="/safety/">Safety</a></div></div></section>'
w('impactbased.oneworldz.com/index.html',page('ImpactBased LaunchPad',[('ImpactBased','/'),('OneWorldz','https://oneworldz.com'),('Standards','/standards/'),('Safety','/safety/')],ib))

# Law
style('law.oneworldz.com')
lb='<section class="hero"><div class="mark law">⚖</div><div class="copy"><p class="ey">People-first public ideas</p><h1>Fairness. Transparency. A meaningful say.</h1><p>Law.OneWorldz is public information and civic learning. No crypto-token artwork or promotion is used here.</p><div class="btns"><a class="btn" href="/rights/">Rights</a><a class="btn" href="/resources/">Resources</a></div></div></section><section class="section"><div class="mission"><a href="/fairness/"><em>⚖</em><b>Fairness</b></a><a href="/civic-learning/"><em>🗳</em><b>Participation</b></a><a href="/practical-pathways/"><em>🧭</em><b>Practical Pathways</b></a></div><p>General information only. Not a law firm or substitute for qualified legal advice.</p></section>'
w('law.oneworldz.com/index.html',page('Law.OneWorldz | People-First',[('Law.OneWorldz','/'),('OneWorldz','https://oneworldz.com'),('Rights','/rights/'),('Resources','/resources/')],lb))

# Purple Diamond Crew
style('purplediamondcrew.com')
t=[('Original PDC','PDC'),('First PDC1','PDC1'),('Later PDC1','PDC1'),('Limited Edition','PDCLE'),('Zed','ZED'),('Grace','GRACE'),('A.U.T.O.','AUTO'),('G','G'),('Robin Hood','RHL'),('SolCat','SOLCAT')]
ti=''.join(f'<a class="token" href="/legacy/"><b>{escape(n)}</b><br><small>{escape(x)}</small></a>' for n,x in t)
pb=f'<section class="section hope"><p class="ey">OneWorldz Hope Chest 1927</p><h1>Hope Chest first.</h1><img src="/hero.png" alt="Approved Hope Chest 1927 artwork"><p>Nothing covers or crops the approved Hope Chest artwork.</p></section><section class="section"><h2>10 genuine legacy records</h2><div class="tokens">{ti}</div></section><section class="section"><img src="/action-team.png" alt="PDC action artwork" style="width:100%;height:auto;object-fit:contain"></section>'
w('purplediamondcrew.com/index.html',page('Purple Diamond Crew | Hope Chest',[('Purple Diamond Crew','/'),('Hope Chest','/hope-chest/'),('Legacy','/legacy/'),('Action','/action/'),('OneWorldz','https://oneworldz.com')],pb))

print('VISUAL_FIX=PASS mobile_safe=1 no_horizontal_nav_scroll=1 no_forced_card_crop=1')
