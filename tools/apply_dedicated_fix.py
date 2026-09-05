#!/usr/bin/env python3
from pathlib import Path
from html import escape

ROOT=Path(__file__).resolve().parents[1]
BUILD='2026-09-05-dedicated-v2'
HEROES=[
 ('Just Knate','just-knate','Direct help and dignity','/assets/heroes/just-knate.webp'),
 ('Victor — The Good Boss','victor-good-boss','Recovery, hope and second chances','/assets/heroes/victor-good-boss.webp'),
 ('Sam Weidenhofer','sam-weidenhofer','Everyday community kindness','/assets/heroes/sam-weidenhofer.webp'),
 ('Dylan Thiry','dylan-thiry','Building hope and stronger futures','/assets/heroes/dylan-thiry.webp'),
 ('Bi Phakathi','bi-phakathi','Compassion in action','/assets/heroes/bi-phakathi.webp'),
 ('MDMotivator','mdmotivator','Global kindness and encouragement','/assets/heroes/mdmotivator.webp'),
 ('Bob — The Giving Roofer','bob-roofer','Practical community generosity','/assets/heroes/heroes-world.webp'),
 ('Reagan Kauja','reagan-kauja','Action Spreads Smiles — Uganda','/reagan.png'),
]

def write(rel,text):
 p=ROOT/rel; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(text,encoding='utf-8')

def shell(title,body,nav):
 links=''.join(f'<a class="{"brand" if i==0 else ""}" href="{u}">{escape(t)}</a>' for i,(t,u) in enumerate(nav))
 return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark"><title>{escape(title)}</title><link rel="stylesheet" href="/visual-fix.css"></head><body data-oneworldz-build="{BUILD}"><nav class="nav">{links}</nav><main class="shell">{body}</main><div class="foot">OneWorldz 🌐 One Vision • Helping the People Who Help People</div></body></html>'

def hero_card(name,slug,desc,img):
 return f'<a class="card dedicated-hero-card" href="/heroes/{slug}/"><img src="{img}" alt="{escape(name)} dedicated OneWorldz artwork" loading="lazy"><b>{escape(name)}</b><span>{escape(desc)}</span><i>OPEN PROFILE →</i></a>'

css=ROOT/'oneworldz.com/visual-fix.css'
css.write_text(css.read_text(encoding='utf-8')+'''\n/* Dedicated artwork release */\n.dedicated-hero-card img{width:100%;height:auto;object-fit:contain;background:#020205}.gpt-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.gpt-card{border:1px solid #5b377d;border-radius:18px;padding:18px;background:#100a17}.gpt-card strong{display:block;font-size:1.08rem}.gpt-card span{display:block;color:#c5bacd;line-height:1.45;margin-top:6px}.home-hero-art{width:100%;height:auto;object-fit:contain;background:#020205}@media(max-width:900px){.gpt-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.gpt-grid{grid-template-columns:1fr}}\n''',encoding='utf-8')

cards=''.join(hero_card(*h) for h in HEROES)
mission=''.join([
 '<a href="/food/"><b>Food</b><span>Practical hunger relief.</span></a>',
 '<a href="/clean-water/"><b>Clean Water</b><span>Practical infrastructure.</span></a>',
 '<a href="/shelter/"><b>Shelter</b><span>Safety and dignity.</span></a>',
 '<a href="/education/"><b>Education</b><span>Opportunity that lasts.</span></a>',
 '<a href="/medical-care/"><b>Medical Care</b><span>Help when health becomes the barrier.</span></a>',
 '<a href="/community/"><b>Community</b><span>Back people already doing the work.</span></a>',
])
home=f'''<section class="hero"><div class="copy"><p class="ey">OneWorldz 🌐 One Vision</p><h1>Helping the People Who Help People.</h1><p>OneWorldz is the people-first umbrella: practical fairness, research, learning, creative help and direct support pathways — ordinary people having a real say in where attention, effort and resources go.</p><div class="btns"><a class="btn" href="#oneworldz-gpt">OneWorldz GPT</a><a class="btn" href="https://donateworldz.com">DonateWorldz</a></div></div><img class="home-hero-art" src="/ecosystem-art.png" alt="OneWorldz ecosystem artwork"></section>
<section class="section" id="oneworldz-gpt"><p class="ey">OneWorldz GPT System</p><h2>Create • Research • Understand • Act</h2><p>The OneWorldz GPT direction: free creative/image help, research, plain-language law and fairness information, learning and practical next steps.</p><div class="gpt-grid"><div class="gpt-card"><strong>Image Creation</strong><span>Turn an idea into a clear visual brief.</span></div><div class="gpt-card"><strong>Research</strong><span>Compare information and find useful starting points.</span></div><a class="gpt-card" href="https://law.oneworldz.com"><strong>Law & Fairness</strong><span>Plain-language information and people-first research.</span></a><div class="gpt-card"><strong>Practical Help</strong><span>Find the right donation, community or action pathway.</span></div></div></section>
<section class="section"><h2>Mission</h2><div class="mission">{mission}</div></section>
<section class="section" id="heroes"><p class="ey">Dedicated artwork — no placeholders</p><h2>Real heroes</h2><div class="hero-grid">{cards}</div></section>
<section class="section"><h2>Community Charity</h2><p>Open the 35 preserved Facebook destinations directly.</p><div class="btns"><a class="btn" href="/community-support/">Open Community Charity</a></div></section>
<section class="section"><h2>Enter the ecosystem</h2><div class="grid2"><a class="card" href="https://donateworldz.com"><img src="https://donateworldz.com/hero.png" alt="DonateWorldz artwork"><b>DonateWorldz</b><span>Four direct support pathways.</span><i>ENTER →</i></a><a class="card" href="https://cryptoworldz.xyz"><img src="https://cryptoworldz.xyz/hero.png" alt="CryptoWorldz artwork"><b>CryptoWorldz</b><span>Blockchain Worldz headquarters.</span><i>ENTER →</i></a><a class="card" href="https://foodworldz.com"><img src="https://foodworldz.com/hero.png" alt="FoodWorldz artwork"><b>FoodWorldz</b><span>Food, water and practical support.</span><i>ENTER →</i></a><a class="card" href="https://purplediamondcrew.com"><img src="https://purplediamondcrew.com/action-team.png" alt="Purple Diamond Crew artwork"><b>Purple Diamond Crew</b><span>Real people. Real help. Real impact.</span><i>ENTER →</i></a></div></section>'''
write('oneworldz.com/index.html',shell('OneWorldz | One Vision',home,[('OneWorldz','/'),('OneWorldz GPT','#oneworldz-gpt'),('Heroes','/heroes/'),('DonateWorldz','https://donateworldz.com'),('CryptoWorldz','https://cryptoworldz.xyz'),('Purple Diamond Crew','https://purplediamondcrew.com')]))
write('oneworldz.com/heroes/index.html',shell('Real Heroes | OneWorldz',f'<section class="section"><p class="ey">Dedicated OneWorldz artwork</p><h1>Real heroes</h1><p>No emoji placeholders. The dedicated artwork is the card.</p><div class="hero-grid">{cards}</div></section>',[('OneWorldz','/'),('Heroes','/heroes/')]))
for name,slug,desc,img in HEROES:
 detail=f'<section class="hero"><img src="{img}" alt="{escape(name)} dedicated OneWorldz artwork"><div class="copy"><p class="ey">Helping the People Who Help People</p><h1>{escape(name)}</h1><p>{escape(desc)}.</p><div class="btns"><a class="btn" href="/heroes/">All Heroes</a><a class="btn" href="https://donateworldz.com">Support Pathways</a></div></div></section>'
 write(f'oneworldz.com/heroes/{slug}/index.html',shell(f'{name} | OneWorldz',detail,[('OneWorldz','/'),('Heroes','/heroes/'),(name,f'/heroes/{slug}/')]))

hero_html=(ROOT/'oneworldz.com/heroes/index.html').read_text(encoding='utf-8')
for name,slug,desc,img in HEROES:
 assert f'href="/heroes/{slug}/"' in hero_html and img in hero_html
 if img.startswith('/assets/heroes/'):
  p=ROOT/'oneworldz.com'/img.lstrip('/')
  assert p.is_file() and p.stat().st_size>10000,p
  raw=p.read_bytes()
  assert raw[:4] == b'RIFF' and raw[8:12] == b'WEBP', (p,'invalid WebP signature')
for old in ['💜','🤝','🫶','🏠','🌍','✨','🔨']:
 assert old not in hero_html,old
assert 'OneWorldz GPT System' in (ROOT/'oneworldz.com/index.html').read_text(encoding='utf-8')
print('DEDICATED_VISUALS=PASS hero_images=7 webp_signatures=7 emoji_placeholders=0 oneworldz_gpt=1')
