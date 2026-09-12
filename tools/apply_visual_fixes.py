#!/usr/bin/env python3
from pathlib import Path
from shutil import copy2

ROOT = Path(__file__).resolve().parents[1]
BUILD = "2026-09-12-jayjay"

SITES = {
    "oneworldz.com": ("OneWorldz", "#8b5cf6", "#38bdf8"),
    "cryptoworldz.xyz": ("CryptoWorldz", "#8b5cf6", "#38bdf8"),
    "solworldz.xyz": ("SolWorldz", "#7c3aed", "#38bdf8"),
    "ethworldz.xyz": ("EthWorldz", "#8b5cf6", "#a78bfa"),
    "baseworldz.xyz": ("BaseWorldz", "#2563eb", "#38bdf8"),
    "bnbworldz.xyz": ("BNBWorldz", "#f59e0b", "#facc15"),
    "xrpworldz.xyz": ("XRPWorldz", "#38bdf8", "#7dd3fc"),
    "suiworldz.xyz": ("SuiWorldz", "#0ea5e9", "#67e8f9"),
    "hyperworldz.xyz": ("HyperWorldz", "#10b981", "#5eead4"),
    "robinworldz.xyz": ("RobinWorldz", "#84cc16", "#a3e635"),
    "hodlerworldz.xyz": ("HodlerWorldz", "#8b5cf6", "#38bdf8"),
    "hodlergalaxy.xyz": ("HodlerGalaxy", "#a855f7", "#38bdf8"),
    "purplediamondcrew.com": ("Purple Diamond Crew", "#a53cff", "#df7bff"),
    "impactbased.oneworldz.com": ("ImpactBased", "#22c55e", "#a855f7"),
    "law.oneworldz.com": ("Law.OneWorldz", "#60a5fa", "#a78bfa"),
    "learn.oneworldz.com": ("Learn.OneWorldz", "#38bdf8", "#8b5cf6"),
    "foodworldz.com": ("FoodWorldz", "#22c55e", "#38bdf8"),
    "donateworldz.com": ("DonateWorldz", "#a855f7", "#38bdf8"),
}

CSS = r'''*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;min-height:100vh;background:radial-gradient(circle at 15% 0%,rgba(115,54,180,.24),transparent 34%),radial-gradient(circle at 88% 10%,rgba(34,156,255,.16),transparent 28%),linear-gradient(180deg,#05020a 0%,#090314 38%,#030207 100%);color:#fff;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:inherit;text-decoration:none}img{display:block;max-width:100%}.nav{position:sticky;top:0;z-index:80;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;background:rgba(4,2,10,.92);border-bottom:1px solid rgba(255,255,255,.13);backdrop-filter:blur(16px)}.nav a{padding:9px 12px;border:1px solid rgba(255,255,255,.15);border-radius:12px;font-size:.84rem;font-weight:850;white-space:nowrap}.nav a:hover,.nav a:focus-visible{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent),0 0 28px rgba(139,92,246,.24);outline:none}.brand{color:var(--accent2);font-weight:950}.shell{width:min(1500px,100%);margin:auto;padding:14px}.hero{position:relative;overflow:hidden;border-radius:24px;border:1px solid rgba(255,255,255,.14);background:#05030a;box-shadow:0 24px 80px rgba(0,0,0,.42)}.hero-grid{display:grid;grid-template-columns:minmax(0,1.22fr) minmax(330px,.78fr);align-items:stretch}.hero-art{width:100%;height:100%;min-height:520px;object-fit:contain;background:#000}.hero-copy{display:flex;flex-direction:column;justify-content:center;padding:clamp(24px,4vw,58px);background:linear-gradient(145deg,rgba(20,8,37,.92),rgba(5,2,12,.98))}.eyebrow{margin:0 0 10px;color:var(--accent2);font-size:.78rem;font-weight:950;text-transform:uppercase;letter-spacing:.18em}.hero h1,.big-title{margin:0;font-size:clamp(2.5rem,6vw,6.7rem);line-height:.91;letter-spacing:-.04em}.hero-copy p{font-size:clamp(1rem,1.5vw,1.28rem);line-height:1.62;color:#ddd6ee;max-width:780px}.actions,.btns{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 18px;border-radius:13px;border:1px solid var(--accent);background:linear-gradient(135deg,var(--accent),#24123d);font-weight:950;box-shadow:0 12px 34px rgba(0,0,0,.28)}.btn.secondary{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.24)}.section{margin-top:14px;padding:clamp(18px,3vw,34px);border:1px solid rgba(255,255,255,.11);border-radius:22px;background:linear-gradient(180deg,rgba(20,10,34,.78),rgba(7,3,14,.95));box-shadow:0 18px 55px rgba(0,0,0,.18)}.section-head{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:18px}.section h2{margin:0;font-size:clamp(1.7rem,3.5vw,3.5rem);line-height:1}.section p{color:#d8d1e5;line-height:1.6}.grid,.system-grid,.support-grid,.mission{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.mission{grid-template-columns:repeat(6,minmax(0,1fr))}.info-card,.visual-card,.support-card,.world-card,.token-card,.hero-card{overflow:hidden;border:1px solid rgba(255,255,255,.13);border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.065),rgba(255,255,255,.025));box-shadow:inset 0 0 32px rgba(255,255,255,.025)}.info-card,.support-card,.token-card{padding:17px;min-height:145px}.info-card strong,.support-card strong,.token-card strong,.visual-card strong,.world-card strong{display:block;font-size:1.02rem}.info-card span,.support-card span,.token-card span,.visual-card span,.world-card span{display:block;margin-top:7px;color:#cfc6dd;line-height:1.45;font-size:.9rem}.visual-card img,.world-card img,.hero-card img{width:100%;aspect-ratio:16/10;object-fit:contain;background:#000}.visual-card .copy,.world-card .copy,.hero-card .copy{padding:14px}.portal{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.world-card{transition:.2s ease;border-color:rgba(255,255,255,.16)}.world-card:hover,.world-card:focus-visible{transform:translateY(-3px);border-color:var(--accent);box-shadow:0 16px 42px rgba(0,0,0,.3);outline:none}.enter{display:block;margin-top:10px;color:var(--accent2);font-size:.78rem;font-weight:950;letter-spacing:.08em}.split{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:center}.feature-img{width:100%;border-radius:18px;border:1px solid rgba(255,255,255,.12);object-fit:contain;background:#000}.hero-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.pill{padding:10px 12px;border:1px solid rgba(255,255,255,.15);border-radius:999px;background:rgba(255,255,255,.04);font-weight:850}.quote{padding:22px;border-left:4px solid var(--accent);border-radius:14px;background:rgba(255,255,255,.04);font-size:clamp(1.15rem,2.4vw,2rem);font-weight:850;line-height:1.35}.badge{display:inline-flex;padding:8px 11px;border-radius:999px;border:1px solid rgba(255,255,255,.18);font-size:.74rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:var(--accent2)}.token-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.pdc-stage{min-height:72vh;border-radius:24px;border:1px solid rgba(181,92,255,.6);background:#05030a url('/hero.png') top center/contain no-repeat;padding:clamp(300px,52vw,760px) 18px 24px}.pdc-panel{max-width:1400px;margin:auto;padding:20px;border:1px solid rgba(255,255,255,.15);border-radius:20px;background:rgba(7,2,13,.86);backdrop-filter:blur(12px)}.footer{padding:28px 16px 42px;text-align:center;color:#b8afc5;font-size:.9rem}.footer strong{color:#fff}.center{text-align:center}.compact{font-size:.9rem}.warning{padding:13px 15px;border-left:4px solid #f3c969;border-radius:12px;background:rgba(243,201,105,.07)}.launch{padding:48px 24px;text-align:center;border-radius:24px;border:1px solid rgba(255,255,255,.14);background:radial-gradient(circle at 50% 20%,rgba(124,58,237,.2),transparent 35%),#06030b}.launch h1{margin:0;font-size:clamp(3rem,8vw,8rem);line-height:.86}.status{display:inline-flex;padding:9px 12px;border-radius:999px;border:1px solid var(--accent);color:var(--accent2);font-weight:900}@media(max-width:1100px){.hero-grid{grid-template-columns:1fr}.hero-art{min-height:0}.portal{grid-template-columns:repeat(3,1fr)}.mission{grid-template-columns:repeat(3,1fr)}.hero-list{grid-template-columns:repeat(3,1fr)}.token-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:760px){.shell{padding:8px}.nav{justify-content:flex-start;overflow-x:auto}.section,.hero{border-radius:16px}.grid,.system-grid,.support-grid,.split{grid-template-columns:1fr}.portal{grid-template-columns:1fr 1fr}.mission{grid-template-columns:1fr 1fr}.hero-list{grid-template-columns:1fr 1fr}.hero-copy{padding:20px}.hero-copy h1{font-size:clamp(2.2rem,13vw,4.5rem)}.world-card img,.visual-card img,.hero-card img{aspect-ratio:16/9}.btn{width:100%}.actions,.btns{display:grid;grid-template-columns:1fr}}@media(max-width:440px){.portal,.mission,.hero-list,.token-grid{grid-template-columns:1fr}}'''

WORLDZ = [
    ("SolWorldz","solworldz.xyz","#7c3aed","Solana"),
    ("EthWorldz","ethworldz.xyz","#8b5cf6","Ethereum"),
    ("BaseWorldz","baseworldz.xyz","#2563eb","Base"),
    ("BNBWorldz","bnbworldz.xyz","#f59e0b","BNB Chain"),
    ("XRPWorldz","xrpworldz.xyz","#38bdf8","XRP Ledger"),
    ("SuiWorldz","suiworldz.xyz","#0ea5e9","Sui"),
    ("HyperWorldz","hyperworldz.xyz","#10b981","Hyperliquid"),
    ("RobinWorldz","robinworldz.xyz","#84cc16","Robin"),
    ("HodlerWorldz","hodlerworldz.xyz","#8b5cf6","Learn • Protect • Participate"),
]

HEROES = [
    ("Just Knate","just-knate.webp","/heroes/just-knate/"),
    ("Victor — The Good Boss","victor-good-boss.webp","/heroes/victor-good-boss/"),
    ("Sam Weidenhofer","sam-weidenhofer.webp","/heroes/sam-weidenhofer/"),
    ("Dylan Thiry","dylan-thiry.webp","/heroes/dylan-thiry/"),
    ("Bi Phakathi","bi-phakathi.webp","/heroes/bi-phakathi/"),
    ("MDMotivator","mdmotivator.webp","/heroes/mdmotivator/"),
    ("Bob — The Giving Roofer","heroes-world.webp","/heroes/bob-roofer/"),
]

def head(title, description, accent, accent2):
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title><meta name="description" content="{description}"><link rel="stylesheet" href="/style.css"><style>:root{{--accent:{accent};--accent2:{accent2}}}</style></head><body data-oneworldz-build="{BUILD}">'''

def nav(name):
    return f'''<nav class="nav"><a href="https://oneworldz.com">OneWorldz</a><a href="https://cryptoworldz.xyz">CryptoWorldz</a><a class="brand" href="/">{name}</a><a href="https://donateworldz.com">DonateWorldz</a><a href="https://foodworldz.com">FoodWorldz</a><a href="https://purplediamondcrew.com">Purple Diamond Crew</a></nav>'''

def footer():
    return '''<footer class="footer"><strong>Created with the Vision</strong><br>When Someone say’s You can’t Change the World 🌐 just say “Why can’t I?”<br>Make the Difference • OneWorldz 🌏 One Vision</footer></body></html>'''

def world_cards(prefix="/assets/worldz"):
    items=[]
    for name,domain,color,label in WORLDZ:
        slug=domain.split(".")[0]
        items.append(f'''<a class="world-card" style="--accent:{color};--accent2:{color}" href="https://{domain}"><img src="{prefix}/{slug}.png" alt="{name} approved artwork"><div class="copy"><strong>{name}</strong><span>{label}</span><b class="enter">ENTER WORLD →</b></div></a>''')
    return "".join(items)

def hero_cards():
    return "".join(
        f'''<a class="hero-card" href="{href}"><img src="/assets/heroes/{img}" alt="{name}"><div class="copy"><strong>{name}</strong><span>People helping people.</span></div></a>'''
        for name,img,href in HEROES
    )

def write(site, rel, text):
    path=ROOT/site/rel
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(text,encoding="utf-8")

def copy_worldz_assets(target):
    out=ROOT/target/"assets"/"worldz"
    out.mkdir(parents=True,exist_ok=True)
    for _,domain,_,_ in WORLDZ:
        src=ROOT/domain/"hero.png"
        if src.is_file():
            copy2(src,out/f"{domain.split('.')[0]}.png")

for domain,(name,accent,accent2) in SITES.items():
    site=ROOT/domain
    if not site.is_dir():
        raise SystemExit(f"MISSING_SITE={domain}")
    (site/"style.css").write_text(CSS,encoding="utf-8")

copy_worldz_assets("oneworldz.com")
copy_worldz_assets("cryptoworldz.xyz")

one = head("OneWorldz | One Vision","OneWorldz — Helping the People who Help People.", "#8b5cf6","#38bdf8") + nav("OneWorldz") + f'''
<main class="shell">
<section class="hero"><div class="hero-grid"><img class="hero-art" src="/hero.png" alt="OneWorldz approved hero artwork"><div class="hero-copy"><p class="eyebrow">OneWorldz 🌏 One Vision</p><h1>Helping the People who Help People.</h1><p>One connected world for kindness, food, clean water, medical care, shelter, education, dignity, opportunity and the people already making a difference.</p><div class="actions"><a class="btn" href="https://donateworldz.com">Make the Difference</a><a class="btn secondary" href="https://cryptoworldz.xyz">Enter CryptoWorldz</a></div></div></div></section>
<section class="section"><div class="section-head"><div><p class="eyebrow">The mission</p><h2>One World. One Vision. Real action.</h2></div></div><div class="mission"><div class="info-card"><strong>Food</strong><span>Back the people feeding communities.</span></div><div class="info-card"><strong>Clean Water</strong><span>Support practical water solutions.</span></div><div class="info-card"><strong>Medical Care</strong><span>Help remove health barriers.</span></div><div class="info-card"><strong>Safe Shelter</strong><span>Dignity, safety and room to rebuild.</span></div><div class="info-card"><strong>Education</strong><span>Create opportunity that lasts.</span></div><div class="info-card"><strong>Community</strong><span>Help the people already helping people.</span></div></div></section>
<section class="section"><div class="section-head"><div><p class="eyebrow">Explore the ecosystem</p><h2>Choose a Worldz. Enter it.</h2></div></div><div class="portal">{world_cards()}</div></section>
<section class="section"><div class="split"><div><p class="eyebrow">CryptoWorldz</p><h2>The crypto headquarters and Command Centre doorway.</h2><p>Explore the Worldz, open Zed and the Command Centre, learn, build and connect the technology side back to real-world impact.</p><div class="actions"><a class="btn" href="https://cryptoworldz.xyz">Open CryptoWorldz</a><a class="btn secondary" href="https://cryptobotz.cryptoworldz.xyz">Command Centre Ultimate™</a></div></div><img class="feature-img" src="/ecosystem-art.png" alt="OneWorldz ecosystem artwork"></div></section>
<section class="section"><div class="section-head"><div><p class="eyebrow">People helping people</p><h2>Real people. Real help. Real impact.</h2></div><a class="btn secondary" href="/community-support/">Community Support</a></div><div class="hero-list">{hero_cards()}</div></section>
<section class="section"><p class="eyebrow">Support pathways</p><h2>Choose exactly where your support goes.</h2><div class="support-grid"><a class="support-card" href="https://donateworldz.com/davis-family/"><strong>Davis Family</strong><span>Dedicated support page.</span><b class="enter">OPEN →</b></a><a class="support-card" href="https://donateworldz.com/community-impact/"><strong>Community Impact</strong><span>Community causes and direct impact.</span><b class="enter">OPEN →</b></a><a class="support-card" href="https://donateworldz.com/jayjay-support/"><strong>Support JayJayTeamDev</strong><span>Support the builder behind the ecosystem.</span><b class="enter">OPEN →</b></a></div></section>
<section class="section"><div class="split"><div><p class="eyebrow">OneWorldz GPT System</p><h2>Ask. Learn. Explore. Make a difference.</h2><p>The OneWorldz GPT System belongs inside the ecosystem as the guide to the mission, the Worldz and the ways people can take action.</p><div class="actions"><a class="btn" href="/gpt/">Open OneWorldz GPT</a><a class="btn secondary" href="/directory/">Official Directory</a></div></div><div class="quote">“When Someone say’s You can’t Change the World 🌐 just say ‘Why can’t I?’”</div></div></section>
</main>''' + footer()
write("oneworldz.com","index.html",one)

crypto = head("CryptoWorldz | One World • One Mission","CryptoWorldz — Worldz discovery, Command Centre Ultimate and crypto community.", "#8b5cf6","#38bdf8") + nav("CryptoWorldz") + f'''
<main class="shell">
<section class="hero"><div class="hero-grid"><img class="hero-art" src="/hero.png" alt="CryptoWorldz approved hero artwork"><div class="hero-copy"><p class="eyebrow">One World • One Mission</p><h1>CryptoWorldz.</h1><p>Building the Future of Crypto Together — with Zed, Command Centre Ultimate™, Worldz discovery, education, community and real-world impact.</p><div class="actions"><a class="btn" href="https://cryptobotz.cryptoworldz.xyz">Open Command Centre Ultimate™</a><a class="btn secondary" href="https://t.me/CryptoWorldzBot">Open Zed Bot</a></div></div></div></section>
<section class="section"><div class="section-head"><div><p class="eyebrow">Explore the Worldz</p><h2>Every Worldz has its own identity.</h2></div></div><div class="portal">{world_cards()}</div></section>
<section class="section"><div class="split"><img class="feature-img" src="/command-centre-five.png" alt="Command Centre Ultimate approved artwork"><div><p class="eyebrow">Command Centre Ultimate™</p><h2>Zed stays Zed. Build on him.</h2><p>Zed is the centre for registration, profiles, wallets, Raaiiidd missions, submissions, points, leaderboard, governance and official ecosystem navigation.</p><div class="actions"><a class="btn" href="https://cryptobotz.cryptoworldz.xyz">Open Command Centre</a><a class="btn secondary" href="https://t.me/CryptoWorldzRaaiiiddTeam">Join Raaiiidd Team</a></div></div></div></section>
<section class="section"><p class="eyebrow">The systems</p><h2>ZED • AUTO • G.R.A.C.E. • RECAP</h2><div class="system-grid"><a class="visual-card" href="/zed/"><img src="/command-centre-five.png" alt="Zed and Command Centre"><div class="copy"><strong>ZED</strong><span>Commander, missions, points, governance and ecosystem navigation.</span></div></a><a class="visual-card" href="/auto/"><img src="/auto.png" alt="AUTO approved artwork"><div class="copy"><strong>AUTO</strong><span>Diamond Buy™ and finance-controller identity.</span></div></a><a class="visual-card" href="/grace/"><img src="/grace.png" alt="GRACE approved artwork"><div class="copy"><strong>G.R.A.C.E.</strong><span>Team organiser, coordination and social support.</span></div></a></div></section>
<section class="section"><div class="split"><div><p class="eyebrow">WorldzPad™ + $WLDZ</p><h2>Build the launch system around what already exists.</h2><p>WorldzPad™ connects the Worldz ecosystem, Zed, treasury/multisig structure, AUTO, G.R.A.C.E. and the master Worldz direction.</p><div class="actions"><a class="btn" href="/worldzpad/">Open WorldzPad™</a><a class="btn secondary" href="/wldz/">Explore $WLDZ</a></div></div><img class="feature-img" src="/we-need-you.png" alt="CryptoWorldz community artwork"></div></section>
<section class="section"><p class="eyebrow">Real-world connection</p><h2>Helping the People who Help People.</h2><div class="support-grid"><a class="support-card" href="https://oneworldz.com"><strong>OneWorldz</strong><span>The human and global gateway.</span><b class="enter">OPEN →</b></a><a class="support-card" href="https://purplediamondcrew.com"><strong>Purple Diamond Crew</strong><span>Legacy, revival and real-world action.</span><b class="enter">OPEN →</b></a><a class="support-card" href="https://impactbased.oneworldz.com"><strong>ImpactBased</strong><span>Impact-first launch infrastructure.</span><b class="enter">OPEN →</b></a></div></section>
</main>''' + footer()
write("cryptoworldz.xyz","index.html",crypto)

donate = head("DonateWorldz | Make the Difference","Choose a dedicated OneWorldz support pathway.", "#a855f7","#38bdf8") + nav("DonateWorldz") + '''
<main class="shell"><section class="hero"><div class="hero-grid"><img class="hero-art" src="/hero.png" alt="DonateWorldz hero artwork"><div class="hero-copy"><p class="eyebrow">Make the Difference</p><h1>Choose where your support goes.</h1><p>Three clear support pathways. Separate purpose. Separate destination.</p></div></div></section>
<section class="section"><div class="support-grid"><a class="support-card" href="/davis-family/"><strong>Davis Family</strong><span>Dedicated family support.</span><b class="enter">OPEN SUPPORT PAGE →</b></a><a class="support-card" href="/community-impact/"><strong>Community Impact</strong><span>Support real community causes.</span><b class="enter">OPEN COMMUNITY IMPACT →</b></a><a class="support-card" href="/jayjay-support/"><strong>Support JayJayTeamDev</strong><span>Voluntary support for the ecosystem builder.</span><b class="enter">OPEN SUPPORT PAGE →</b></a></div></section>
<section class="section"><span class="badge">Future Support Partner</span><h2>RESERVED • NOT ACTIVE</h2><p>A future support position remains reserved and is not an active public payment stream.</p></section></main>''' + footer()
write("donateworldz.com","index.html",donate)

food = head("FoodWorldz | Food • Water • Dignity","FoodWorldz — practical food and clean-water action.", "#22c55e","#38bdf8") + nav("FoodWorldz") + '''
<main class="shell"><section class="hero"><div class="hero-grid"><img class="hero-art" src="/hero.png" alt="FoodWorldz approved artwork"><div class="hero-copy"><p class="eyebrow">FoodWorldz</p><h1>Food. Water. Dignity.</h1><p>Back the people feeding communities, improving access to clean water and turning kindness into practical action.</p><div class="actions"><a class="btn" href="https://donateworldz.com/community-impact/">Support Community Impact</a><a class="btn secondary" href="https://oneworldz.com">OneWorldz Home</a></div></div></div></section><section class="section"><div class="mission"><div class="info-card"><strong>Meals</strong><span>Food where it is needed.</span></div><div class="info-card"><strong>Water</strong><span>Clean-water projects.</span></div><div class="info-card"><strong>Gardens</strong><span>Local food resilience.</span></div><div class="info-card"><strong>Families</strong><span>Practical support with dignity.</span></div><div class="info-card"><strong>Volunteers</strong><span>Back the people doing the work.</span></div><div class="info-card"><strong>Action</strong><span>Make the Difference.</span></div></div></section></main>''' + footer()
write("foodworldz.com","index.html",food)

tokens = ["PDC","PDC1","PDC1-2","PDCMAGA","PDCShares","PurpleDC","OG Purple","PCC1","INVEST","$LMTD"]
token_html = "".join(f'<div class="token-card"><strong>{t}</strong><span>Legacy Token</span></div>' for t in tokens)
pdc = head("Purple Diamond Crew | Legacy Revival","Purple Diamond Crew — legacy, community and real-world action.", "#a53cff","#df7bff") + nav("Purple Diamond Crew") + f'''
<main class="shell"><section class="pdc-stage"><div class="pdc-panel"><p class="eyebrow">Purple Diamond Crew</p><h1 class="big-title">Revive the Legacy.</h1><p>Real People • Real Help • Real Impact. The Hope Chest returns with the genuine legacy-token history and a renewed community mission.</p><div class="actions"><a class="btn" href="/legacy/">Explore Legacy</a><a class="btn secondary" href="https://oneworldz.com">OneWorldz</a></div></div></section><section class="section"><p class="eyebrow">Hope Chest</p><h2>Ten legacy-token positions.</h2><div class="token-grid">{token_html}</div></section><section class="section"><div class="mission"><div class="info-card"><strong>Food</strong><span>Meals and essentials.</span></div><div class="info-card"><strong>Clothes</strong><span>Practical community help.</span></div><div class="info-card"><strong>Blankets</strong><span>Warmth and dignity.</span></div><div class="info-card"><strong>Shelter</strong><span>Tents and safer places.</span></div><div class="info-card"><strong>Water</strong><span>Boreholes and clean water.</span></div><div class="info-card"><strong>Gardening</strong><span>Longer-term resilience.</span></div></div></section></main>''' + footer()
write("purplediamondcrew.com","index.html",pdc)

chain_copy = {
    "solworldz.xyz":("SolWorldz","Solana","Solana community, learning and the wider OneWorldz mission.","#7c3aed","#38bdf8"),
    "ethworldz.xyz":("EthWorldz","Ethereum","Ethereum community, learning and the wider OneWorldz mission.","#8b5cf6","#a78bfa"),
    "baseworldz.xyz":("BaseWorldz","Base","Base community, learning and the wider OneWorldz mission.","#2563eb","#38bdf8"),
    "bnbworldz.xyz":("BNBWorldz","BNB Chain","BNB Chain community, learning and the wider OneWorldz mission.","#f59e0b","#facc15"),
    "xrpworldz.xyz":("XRPWorldz","XRP Ledger","XRP Ledger community, learning and the wider OneWorldz mission.","#38bdf8","#7dd3fc"),
    "suiworldz.xyz":("SuiWorldz","Sui","Sui community, learning and the wider OneWorldz mission.","#0ea5e9","#67e8f9"),
    "hyperworldz.xyz":("HyperWorldz","Hyperliquid","Hyper community, learning and the wider OneWorldz mission.","#10b981","#5eead4"),
    "robinworldz.xyz":("RobinWorldz","Robin","People-first community, learning and the wider OneWorldz mission.","#84cc16","#a3e635"),
    "hodlerworldz.xyz":("HodlerWorldz","Learn • Protect • Participate","Long-term learning, wallet safety and community.","#8b5cf6","#38bdf8"),
    "hodlergalaxy.xyz":("HodlerGalaxy","Explore the Worldz galaxy","Discover the wider Worldz network and community.","#a855f7","#38bdf8"),
}
for domain,(name,label,desc,accent,accent2) in chain_copy.items():
    page = head(f"{name} | {label}",desc,accent,accent2) + nav(name) + f'''
<main class="shell"><section class="hero"><div class="hero-grid"><img class="hero-art" src="/hero.png" alt="{name} approved artwork"><div class="hero-copy"><p class="eyebrow">{label}</p><h1>{name}</h1><p>{desc}</p><div class="actions"><a class="btn" href="https://cryptoworldz.xyz">CryptoWorldz HQ</a><a class="btn secondary" href="https://oneworldz.com">OneWorldz</a></div></div></div></section><section class="section"><div class="grid"><a class="info-card" href="/learn/"><strong>Learn</strong><span>Plain-language education.</span><b class="enter">OPEN →</b></a><a class="info-card" href="/community/"><strong>Community</strong><span>Connect with the Worldz.</span><b class="enter">OPEN →</b></a><a class="info-card" href="/builders/"><strong>Builders</strong><span>Build the future together.</span><b class="enter">OPEN →</b></a></div></section><section class="section"><p class="eyebrow">Connected ecosystem</p><h2>One Worldz network.</h2><p>Move between the Worldz through CryptoWorldz and return to the global OneWorldz mission at any time.</p></section></main>''' + footer()
    write(domain,"index.html",page)

simple_pages = {
    "impactbased.oneworldz.com":("ImpactBased","Impact-first launch infrastructure","Purpose-led projects, community impact and the wider OneWorldz ecosystem.","#22c55e","#a855f7"),
    "law.oneworldz.com":("Law.OneWorldz","People-first ideas and information","A public information doorway connected to the OneWorldz vision.","#60a5fa","#a78bfa"),
    "learn.oneworldz.com":("Learn.OneWorldz","Learn simply. Build confidently.","Plain-language learning across the OneWorldz and CryptoWorldz ecosystem.","#38bdf8","#8b5cf6"),
}
for domain,(name,title,desc,accent,accent2) in simple_pages.items():
    hero = '<img class="hero-art" src="/hero.png" alt="'+name+' artwork">' if (ROOT/domain/"hero.png").is_file() else '<div class="hero-art" style="background:radial-gradient(circle at 50% 30%,rgba(139,92,246,.35),transparent 36%),#05030a"></div>'
    page=head(f"{name} | OneWorldz",desc,accent,accent2)+nav(name)+f'''<main class="shell"><section class="hero"><div class="hero-grid">{hero}<div class="hero-copy"><p class="eyebrow">{name}</p><h1>{title}</h1><p>{desc}</p><div class="actions"><a class="btn" href="https://oneworldz.com">OneWorldz</a><a class="btn secondary" href="https://cryptoworldz.xyz">CryptoWorldz</a></div></div></div></section></main>'''+footer()
    write(domain,"index.html",page)

print("JAYJAY_REQUESTS=APPLIED sites=18 roots=18 shared_visual_system=1 unique_worldz_art=1")
