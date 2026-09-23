#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = "2026-09-24-nextgen-1"
DOMAINS = [x.strip() for x in (ROOT / "DOMAINS.txt").read_text(encoding="utf-8").splitlines() if x.strip()]

CSS = r"""
/* WorldzEcoSystem™ Next Generation visual layer — JayJayTeamDev approved 2026-09-24 */
:root{
  --wx-bg:#05020b;--wx-panel:#0b0614;--wx-panel2:#130821;--wx-text:#f9f7ff;
  --wx-muted:#c8bed5;--wx-purple:#a84cff;--wx-purple2:#7126c7;--wx-cyan:#55c7ff;
  --wx-line:rgba(210,170,255,.25);--wx-glow:0 0 38px rgba(168,76,255,.24);
}
html{background:var(--wx-bg)!important;scroll-behavior:smooth}
body{background:
 radial-gradient(circle at 12% 0%,rgba(154,66,255,.18),transparent 26%),
 radial-gradient(circle at 88% 8%,rgba(85,199,255,.08),transparent 22%),
 var(--wx-bg)!important;color:var(--wx-text)!important}
body[data-worldz-nextgen]{min-height:100vh}
.nav,.topbar{
  border-bottom:1px solid var(--wx-line)!important;
  background:rgba(5,2,11,.9)!important;backdrop-filter:blur(20px)!important;
  box-shadow:0 12px 34px rgba(0,0,0,.22)
}
.nav .brand,.topbar .brand{font-weight:950!important;letter-spacing:-.02em}
.wx-hero{
  display:grid;grid-template-columns:minmax(0,1.02fr) minmax(300px,.98fr);gap:clamp(18px,4vw,56px);
  align-items:center;padding:clamp(30px,6vw,86px);border:1px solid var(--wx-line);border-radius:28px;
  overflow:hidden;position:relative;background:linear-gradient(145deg,rgba(17,7,30,.96),rgba(5,2,11,.98));
  box-shadow:var(--wx-glow);isolation:isolate
}
.wx-hero:before{content:"";position:absolute;inset:-30%;z-index:-1;background:
  radial-gradient(circle at 24% 28%,rgba(184,83,255,.22),transparent 26%),
  radial-gradient(circle at 82% 30%,rgba(75,158,255,.10),transparent 20%)}
.wx-hero-copy{position:relative;z-index:2}
.wx-kicker{font-weight:950;letter-spacing:.18em;text-transform:uppercase;color:#d58cff;font-size:.76rem}
.wx-hero h1{margin:12px 0 18px;font-size:clamp(2.9rem,7.5vw,7.4rem);line-height:.86;letter-spacing:-.06em}
.wx-hero h1 .wx-gradient,.wx-gradient{background:linear-gradient(100deg,#fff 0%,#e9c4ff 40%,#b851ff 70%,#66d9ff 100%);-webkit-background-clip:text;color:transparent}
.wx-lead{max-width:760px;color:var(--wx-muted);font-size:clamp(1rem,1.7vw,1.28rem);line-height:1.55}
.wx-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px}
.wx-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 18px;border-radius:14px;
  border:1px solid rgba(190,110,255,.55);background:linear-gradient(135deg,#a84cff,#6b22c2);color:#fff!important;
  text-decoration:none!important;font-weight:950;box-shadow:0 10px 30px rgba(113,38,199,.28)}
.wx-btn.alt{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.16);box-shadow:none}
.wx-btn:hover,.wx-btn:focus-visible{transform:translateY(-1px);filter:brightness(1.08);outline:2px solid rgba(122,205,255,.55);outline-offset:2px}
.wx-visual{position:relative;min-width:0}
.wx-visual img{display:block;width:100%!important;height:auto!important;max-height:680px;object-fit:contain!important;border-radius:22px;
  border:1px solid rgba(192,117,255,.35);background:#030106;box-shadow:0 0 54px rgba(146,48,255,.24)}
.wx-section{margin-top:16px;padding:clamp(20px,3vw,34px);border:1px solid rgba(255,255,255,.11);border-radius:22px;
  background:linear-gradient(180deg,rgba(18,8,31,.9),rgba(6,3,12,.96))}
.wx-section h2{font-size:clamp(1.8rem,4vw,3.8rem);line-height:1;margin:4px 0 14px;letter-spacing:-.04em}
.wx-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:18px}
.wx-card{min-width:0;padding:18px;border-radius:18px;border:1px solid rgba(185,108,255,.24);
  background:linear-gradient(145deg,rgba(30,13,49,.82),rgba(8,4,15,.94));box-shadow:inset 0 0 26px rgba(143,59,255,.07)}
.wx-card h3{margin:0 0 8px;font-size:1.15rem}.wx-card p{margin:0;color:var(--wx-muted);line-height:1.5}
.wx-card img{width:100%!important;height:auto!important;aspect-ratio:16/10;object-fit:contain!important;border-radius:14px;background:#030106;margin-bottom:14px}
.wx-portal{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.wx-world{display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(190,110,255,.28);border-radius:20px;
 background:linear-gradient(180deg,rgba(21,8,36,.92),rgba(5,2,10,.98));text-decoration:none!important;color:#fff!important}
.wx-world img{width:100%!important;height:auto!important;aspect-ratio:16/10;object-fit:contain!important;background:#020104;border-bottom:1px solid rgba(255,255,255,.08)}
.wx-world div{padding:16px}.wx-world strong{font-size:1.15rem}.wx-world span{display:block;color:var(--wx-muted);margin-top:6px;line-height:1.4}
.wx-world b{display:block;color:#ce8cff;margin-top:14px;font-size:.78rem;letter-spacing:.12em}
.wx-pillrow{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.wx-pill{padding:9px 12px;border:1px solid rgba(255,255,255,.15);
 border-radius:999px;background:rgba(255,255,255,.04);font-weight:850;font-size:.82rem}
.wx-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:20px}.wx-strip div{padding:14px;border-radius:16px;border:1px solid rgba(255,255,255,.1);background:#ffffff06}
.wx-strip b{display:block;font-size:1.1rem}.wx-strip span{color:var(--wx-muted);font-size:.82rem}
.wx-note{padding:14px 16px;border-left:4px solid #b75bff;background:rgba(168,76,255,.08);border-radius:12px;color:var(--wx-muted)}
.wx-titlebar{display:flex;align-items:center;gap:12px}.wx-titlebar strong{font-size:1.05rem}.wx-titlebar small{display:block;color:var(--wx-muted)}
.wx-site-mark{display:inline-grid;place-items:center;width:44px;height:44px;flex:0 0 44px;border-radius:50%;border:1px solid rgba(204,130,255,.55);
 background:radial-gradient(circle at 30% 30%,#edcaff,#aa45ff 36%,#35104c 78%);color:#17041f;font-weight:1000;box-shadow:0 0 22px rgba(168,76,255,.42)}
.wx-footer{margin-top:18px;padding:28px 18px;text-align:center;color:#aa9eb8;border-top:1px solid rgba(255,255,255,.09)}
body[data-worldz-nextgen] img{max-width:100%!important;height:auto!important}
body[data-worldz-nextgen] .hero-art,body[data-worldz-nextgen] .feature-img{object-fit:contain!important}
@media(max-width:980px){.wx-hero{grid-template-columns:1fr}.wx-visual{order:-1}.wx-grid,.wx-portal{grid-template-columns:repeat(2,1fr)}.wx-strip{grid-template-columns:repeat(2,1fr)}}
@media(max-width:640px){.wx-hero{padding:18px;border-radius:18px}.wx-hero h1{font-size:clamp(2.6rem,14vw,4.6rem)}.wx-grid,.wx-portal{grid-template-columns:1fr}.wx-section{padding:18px}.wx-strip{grid-template-columns:1fr 1fr}.wx-btn{width:100%}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
"""

def esc(s: str) -> str:
    return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace('"',"&quot;")

def page(title: str, description: str, nav: str, body: str, accent="#a84cff") -> str:
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#05020b"><title>{esc(title)}</title><meta name="description" content="{esc(description)}">
<link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/mobile-safe.css"><link rel="stylesheet" href="/worldz-nextgen.css">
<style>:root{{--accent:{accent};--accent2:#55c7ff}}</style></head>
<body data-oneworldz-build="{BUILD}" data-worldz-nextgen="{BUILD}">
<nav class="nav">{nav}</nav><main class="shell">{body}</main>
<footer class="wx-footer">WorldzEcoSystem™ • One World • One Vision • One Fam</footer></body></html>"""

def nav_for(active: str) -> str:
    links=[
      ("OneWorldz","https://oneworldz.com"),("DonateWorldz","https://donateworldz.com"),
      ("CryptoWorldz","https://cryptoworldz.xyz"),("WorldzLaunchPad","https://launchpad.cryptoworldz.xyz"),
      ("Purple Diamond Crew","https://purplediamondcrew.com")
    ]
    return "".join(f'<a class="{"brand" if name==active else ""}" href="{url}">{name}</a>' for name,url in links)

def hero(kicker: str, heading: str, lead: str, art: str|None, actions: list[tuple[str,str,bool]]) -> str:
    visual = f'<div class="wx-visual"><img src="{art}" alt="{esc(heading)} approved website artwork"></div>' if art else ""
    btns="".join(f'<a class="wx-btn{" alt" if alt else ""}" href="{url}">{esc(label)}</a>' for label,url,alt in actions)
    return f"""<section class="wx-hero"><div class="wx-hero-copy"><div class="wx-kicker">{esc(kicker)}</div>
<h1>{heading}</h1><p class="wx-lead">{esc(lead)}</p><div class="wx-actions">{btns}</div></div>{visual}</section>"""

def card(title: str, copy: str, href: str|None=None, image: str|None=None) -> str:
    img=f'<img src="{image}" alt="{esc(title)} artwork">' if image else ""
    content=f'{img}<h3>{esc(title)}</h3><p>{esc(copy)}</p>'
    return f'<a class="wx-card" href="{href}" style="color:inherit;text-decoration:none">{content}</a>' if href else f'<article class="wx-card">{content}</article>'

def ensure_css():
    for domain in DOMAINS + ["launchpad.cryptoworldz.xyz"]:
        d=ROOT/domain
        d.mkdir(parents=True,exist_ok=True)
        (d/"worldz-nextgen.css").write_text(CSS,encoding="utf-8")

def inject_all_html():
    for domain in DOMAINS + ["launchpad.cryptoworldz.xyz"]:
        for p in (ROOT/domain).rglob("*.html"):
            text=p.read_text(encoding="utf-8",errors="ignore")
            if "worldz-nextgen.css" not in text:
                link='<link rel="stylesheet" href="/worldz-nextgen.css">'
                text=re.sub(r"</head>",link+"</head>",text,count=1,flags=re.I)
            if "data-worldz-nextgen=" not in text:
                text=re.sub(r"<body(\s[^>]*)?>",lambda m: '<body'+(m.group(1) or '')+f' data-worldz-nextgen="{BUILD}">',text,count=1,flags=re.I)
            p.write_text(text,encoding="utf-8")

def build_chain_worldz():
    cfg={
      "solworldz.xyz":("SolWorldz","Solana","#9945ff","Solana builders, communities and verified ecosystem routes."),
      "ethworldz.xyz":("EthWorldz","Ethereum","#9f8cff","Ethereum learning, builders, safety and ecosystem discovery."),
      "baseworldz.xyz":("BaseWorldz","Base","#2f70ff","Base builders, communities, verified links and launch pathways."),
      "bnbworldz.xyz":("BNBWorldz","BNB Chain","#f3ba2f","BNB Chain discovery, builders, education and verified routes."),
      "xrpworldz.xyz":("XRPWorldz","XRP Ledger","#54c7ff","XRP Ledger education, builders, verified routes and WorldzLaunchPad context."),
      "suiworldz.xyz":("SuiWorldz","Sui","#6fbcf0","Sui ecosystem learning, builders, verified routes and launch context."),
      "hyperworldz.xyz":("HyperWorldz","Hyperliquid","#5dffd9","Hyperliquid ecosystem discovery, education and verified links."),
      "robinworldz.xyz":("RobinWorldz","Robin Hood Chain","#79ff5b","People-first law, debt-recovery and community direction kept distinct from Solana."),
      "hodlerworldz.xyz":("HodlerWorldz","Long-term Learning","#e6c565","Long-term education, recognition, security and community learning.")
    }
    for domain,(name,network,accent,lead) in cfg.items():
        body=hero(f"{network} • WORLDZECOSYSTEM™",f'{name}<br><span class="wx-gradient">{network} World.</span>',lead,"/hero.png",[
          ("Explore CryptoWorldz","https://cryptoworldz.xyz",False),
          ("Open WorldzLaunchPad","https://launchpad.cryptoworldz.xyz",True),
          ("OneWorldz","https://oneworldz.com",True)])
        body+=f"""<section class="wx-section"><div class="wx-kicker">Dedicated {esc(name)} portal</div><h2>Learn. Verify. Build.</h2>
<div class="wx-grid">{card("Education","Plain-language learning before action.")}{card("Verified Routes","Use official destinations and verify links before connecting wallets.")}{card("Build & Launch","Use WorldzLaunchPad for supported launch tooling, proof and transparent controls.","https://launchpad.cryptoworldz.xyz")}</div></section>
<section class="wx-section"><div class="wx-note">This portal is part of WorldzEcoSystem™. Chain-specific tools stay chain-native; no page pretends one network implementation automatically applies to another.</div></section>"""
        (ROOT/domain/"index.html").write_text(page(f"{name} | {network} World","WorldzEcoSystem dedicated portal.",nav_for(""),body,accent),encoding="utf-8")

def build_oneworldz():
    body=hero("ONEWORLDZ 🌏 ONE VISION",'Helping the People<br><span class="wx-gradient">Who Help the People.</span>',
      "A connected human-first ecosystem for practical help, food, water, medical care, safety, education, dignity, equal opportunity and the people already doing the work.",
      "/hero.png",[("Make the Difference","https://donateworldz.com",False),("Explore the Mission","#mission",True),("Community Links","/community-support/",True)])
    body+=f"""<section class="wx-section" id="mission"><div class="wx-kicker">VISION • MISSION • CORE PRINCIPLES</div><h2>People. Planet. Technology. Leadership.</h2>
<div class="wx-grid">{card("People","Back real people and communities with practical help and dignity.")}{card("Planet","Clean water, food systems, agriculture, waste, shelter and resilient communities.")}{card("Technology","Use technology as infrastructure for learning, coordination, proof and access.")}{card("Leadership","Recognise the people already helping and help others participate.")}{card("The Method","Research → Compare → Verify → Recommend → Implement → Measure Results → Improve Again.")}{card("One Vision","One World • One Vision • One Fam — connected action rather than isolated pages.")}</div></section>
<section class="wx-section"><div class="wx-kicker">PRACTICAL IMPACT</div><h2>Real pathways, clearly separated.</h2>
<div class="wx-portal">
<a class="wx-world" href="https://donateworldz.com"><div><strong>DonateWorldz</strong><span>Humanitarian and community support pathways.</span><b>OPEN →</b></div></a>
<a class="wx-world" href="https://foodworldz.com"><div><strong>FoodWorldz</strong><span>Food, water, logistics, waste and practical systems.</span><b>OPEN →</b></div></a>
<a class="wx-world" href="/heroes/"><div><strong>Heroes</strong><span>People helping people, impact stories and Worldz Live direction.</span><b>OPEN →</b></div></a>
<a class="wx-world" href="/links-in-dubbo/"><div><strong>Links in Dubbo</strong><span>Practical local support and referral links.</span><b>OPEN →</b></div></a>
<a class="wx-world" href="/specialist-worldz/"><div><strong>Specialist Worldz</strong><span>Research-led departments for real-world problems.</span><b>OPEN →</b></div></a>
<a class="wx-world" href="/ecosystem/"><div><strong>WorldzEcoSystem™</strong><span>The connected architecture and official routes.</span><b>OPEN →</b></div></a>
</div></section>
<section class="wx-section"><div class="wx-kicker">CLEAR SEPARATION</div><h2>Humanitarian mission ≠ crypto activity.</h2><p class="wx-lead"><strong>OneWorldz</strong> is the humanitarian and global gateway. <strong>CryptoWorldz</strong> and <strong>WorldzLaunchPad™</strong> are the separate technology and funding-engine side. <strong>DonateWorldz</strong> keeps direct support pathways distinct.</p>
<div class="wx-actions"><a class="wx-btn alt" href="https://cryptoworldz.xyz">CryptoWorldz</a><a class="wx-btn alt" href="https://launchpad.cryptoworldz.xyz">WorldzLaunchPad</a><a class="wx-btn alt" href="https://purplediamondcrew.com">Purple Diamond Crew</a></div></section>"""
    (ROOT/"oneworldz.com"/"index.html").write_text(page("OneWorldz | One Vision","Helping the People Who Help the People.",nav_for("OneWorldz"),body,"#9a42ff"),encoding="utf-8")
    eco=(ROOT/"oneworldz.com"/"ecosystem"); eco.mkdir(parents=True,exist_ok=True)
    eco_body=hero("WORLDZECOSYSTEM™",'One connected<br><span class="wx-gradient">system of Worldz.</span>',"Official routes for mission, support, technology, launch infrastructure, communities and specialist departments.",None,[("OneWorldz","https://oneworldz.com",False),("CryptoWorldz","https://cryptoworldz.xyz",True)])
    eco_body+=f"""<section class="wx-section"><h2>Core routes</h2><div class="wx-grid">{card("DonateWorldz","Direct support and impact pathways.","https://donateworldz.com")}{card("CryptoWorldz","Crypto/blockchain headquarters and Command Centre entry.","https://cryptoworldz.xyz")}{card("WorldzLaunchPad","Launch, proof, token identity and multi-chain architecture.","https://launchpad.cryptoworldz.xyz")}{card("Purple Diamond Crew","Legacy history and real-world action.","https://purplediamondcrew.com")}{card("FoodWorldz","Food, water, logistics and practical systems.","https://foodworldz.com")}{card("ResearchWorldz","Evidence, country research and best-practice learning.","https://learn.oneworldz.com")}</div></section>"""
    (eco/"index.html").write_text(page("WorldzEcoSystem™ | OneWorldz","Connected official Worldz ecosystem routes.",nav_for("OneWorldz"),eco_body),encoding="utf-8")

def build_donate():
    body=hero("DONATEWORLDZ • CLEAR SUPPORT PATHWAYS",'Give clearly.<br><span class="wx-gradient">Support directly.</span>',
      "Choose the purpose you want to support. Humanitarian donations, community impact and voluntary support remain clearly separated from CryptoWorldz activity.",
      "/hero.png",[("Community Impact","/community-impact/",False),("Reagan & Children","/reagan-children/",True),("Support JayJayTeamDev","/jayjay-support/",True)])
    body+=f"""<section class="wx-section"><h2>Choose the purpose.</h2><div class="wx-grid">
{card("Reagan & Children • Action Spread Smiles","Mayuge District, Uganda — food, medicine, school fees, hygiene, mattresses, water, farming and a safe home.","/reagan-children/")}
{card("Community Impact","Verified community support pathways and people already helping people.","/community-impact/")}
{card("Support JayJayTeamDev","Voluntary support for the work of building and coordinating the mission.","/jayjay-support/")}
{card("Davis Family","Dedicated family support page and story.","/davis-family/")}
{card("Slice of Hope Australia","Community food outreach initiative and volunteer/partner pathway.","/slice-of-hope-australia/")}
{card("Fresh Water + Grow Food","Practical clean-water and food-growing mission pathways.","/fresh-water-mission/")}
</div></section><section class="wx-section"><div class="wx-note">DonateWorldz support pathways are separate from CryptoWorldz / WorldzLaunchPad crypto activity. No donation page is presented as an investment product.</div></section>"""
    (ROOT/"donateworldz.com"/"index.html").write_text(page("DonateWorldz | Give Clearly","Clear separated support pathways for people and community impact.",nav_for("DonateWorldz"),body,"#8d45ff"),encoding="utf-8")
    rdir=ROOT/"donateworldz.com"/"reagan-children"; rdir.mkdir(parents=True,exist_ok=True)
    rb=hero("ACTION SPREAD SMILES • MAYUGE DISTRICT, UGANDA",'Reagan & Children<br><span class="wx-gradient">Practical support.</span>',
      "This dedicated humanitarian pathway focuses on food, medicine, school fees, hygiene, mattresses, clean water, farming and a safer home.",None,[("DonateWorldz Home","/",True),("OneWorldz","https://oneworldz.com",True)])
    rb+=f"""<section class="wx-section"><h2>What support is for</h2><div class="wx-grid">{card("Food + Essentials","Meals, hygiene and everyday essentials.")}{card("School + Health","School fees, education needs and medical support.")}{card("Water + Farming","Borehole, farming and practical long-term resilience.")}{card("Safe Home","Shelter, mattresses and a safer place for children.")}</div></section>"""
    (rdir/"index.html").write_text(page("Reagan & Children | DonateWorldz","Action Spread Smiles humanitarian support pathway.",nav_for("DonateWorldz"),rb),encoding="utf-8")

def build_crypto():
    assets=ROOT/"cryptoworldz.xyz"/"assets"/"worldz"; assets.mkdir(parents=True,exist_ok=True)
    portals=[
      ("SolWorldz","solworldz.xyz","Solana"),("EthWorldz","ethworldz.xyz","Ethereum"),("BaseWorldz","baseworldz.xyz","Base"),
      ("BNBWorldz","bnbworldz.xyz","BNB Chain"),("XRPWorldz","xrpworldz.xyz","XRP Ledger"),("SuiWorldz","suiworldz.xyz","Sui"),
      ("HyperWorldz","hyperworldz.xyz","Hyperliquid"),("RobinWorldz","robinworldz.xyz","People-first"),("HodlerWorldz","hodlerworldz.xyz","Learning")
    ]
    cards=[]
    for name,domain,label in portals:
        src=ROOT/domain/"hero.png"; dst=assets/f"{domain}.png"
        if src.is_file(): shutil.copy2(src,dst)
        image=f"/assets/worldz/{domain}.png" if dst.is_file() else None
        if image:
            cards.append(f'<a class="wx-world" href="https://{domain}"><img src="{image}" alt="{esc(name)} approved artwork"><div><strong>{esc(name)}</strong><span>{esc(label)}</span><b>ENTER WORLD →</b></div></a>')
        else:
            cards.append(f'<a class="wx-world" href="https://{domain}"><div><strong>{esc(name)}</strong><span>{esc(label)}</span><b>ENTER WORLD →</b></div></a>')
    body=hero("CRYPTOWORLDZ • TECHNOLOGY + COMMUNITY",'Enter the Worldz.<br><span class="wx-gradient">Build with proof.</span>',
      "CryptoWorldz is the crypto/blockchain headquarters: Worldz discovery, education, safety, official routes, WorldzLaunchPad and the protected Command Centre.",
      "/hero.png",[("Open WorldzLaunchPad","https://launchpad.cryptoworldz.xyz",False),("Command Centre MAX","/command-centre-max/",True),("Official X Pages","#social",True)])
    body+=f"""<section class="wx-section" id="worldz"><div class="wx-kicker">THE WORLDZ</div><h2>Every portal gets its own identity.</h2><div class="wx-portal">{''.join(cards)}</div></section>
<section class="wx-section"><div class="wx-kicker">COMMAND CENTRE MAX™</div><h2>ZED • AUTO • G.R.A.C.E. • RECAP</h2><div class="wx-grid">{card("ZED","Registration, profiles, wallets, missions, points, rewards, leaderboards, governance and WorldPing.","https://cryptobotz.cryptoworldz.xyz")}{card("AUTO","Protected owner-controlled finance planning, limits, simulation, pause/stop and audit controls.","/command-centre-max/")}{card("G.R.A.C.E.","Approval-controlled social drafts, account connections, publishing, scheduling and analytics.","/command-centre-max/")}{card("RECAP","Community recaps, learning, transparency and protection.","/command-centre-max/")}{card("WorldzCast","Controlled multi-destination ecosystem broadcasting.","/command-centre-max/")}{card("WorldzLaunchPad","Token creation, curves, proof, Founding 100 and chain-native launch architecture.","https://launchpad.cryptoworldz.xyz")}</div></section>
<section class="wx-section" id="social"><h2>Official network</h2><div class="wx-actions"><a class="wx-btn alt" href="https://x.com/CryptoWorldzX">@CryptoWorldzX</a><a class="wx-btn alt" href="https://x.com/WorldzLaunchPad">@WorldzLaunchPad</a><a class="wx-btn alt" href="https://t.me/CryptoWLDZ">CryptoWLDZ Telegram</a></div></section>"""
    (ROOT/"cryptoworldz.xyz"/"index.html").write_text(page("CryptoWorldz | WorldzEcoSystem™","CryptoWorldz blockchain headquarters, Worldz, LaunchPad and Command Centre.",nav_for("CryptoWorldz"),body,"#8c4cff"),encoding="utf-8")

def build_pdc():
    root=ROOT/"purplediamondcrew.com"
    body=hero("PURPLE DIAMOND CREW • ON THE GROUND",'Legacy history.<br><span class="wx-gradient">Real-world action.</span>',
      "Purple Diamond Crew connects genuine legacy-token history with practical community action, verified holder pathways and the Hope Chest story.",
      "/hero.png",[("Open Hope Chest","/chest/",False),("Make a Difference","/make-a-difference/",True),("The Hodlerz Special","/hodlerz-special/",True)])
    body+=f"""<section class="wx-section"><h2>Five-part Purple Diamond Crew experience.</h2><div class="wx-grid">{card("Hope Chest","Ten genuine legacy-token positions and verified historical records.","/chest/")}{card("Make a Difference","Food, clothes, blankets, tents, BBQs, boreholes, gardening, mattresses and practical action.","/make-a-difference/")}{card("The Hodlerz Special","Verified legacy holders, recognition and claim-verification direction.","/hodlerz-special/")}{card("Acknowledgements","People, contributors and community history.","/acknowledgements/")}</div></section>"""
    (root/"index.html").write_text(page("Purple Diamond Crew | On the Ground","Legacy-token history and real-world action.",nav_for("Purple Diamond Crew"),body,"#a53cff"),encoding="utf-8")
    pages={
      "chest":("Hope Chest","Ten genuine legacy-token positions. Only verified token history, ticker, contract address, chain, official links and ownership/provenance belong here.","/hero.png"),
      "make-a-difference":("Make a Difference","Food, clothing, blankets, tents, BBQs, boreholes, gardening, mattresses and practical support where it is needed.","/action-team.png"),
      "hodlerz-special":("The Hodlerz Special","A protected path for verified legacy holders, wallet registry, recognition and approved claim verification.",None),
      "acknowledgements":("Acknowledgements","Recognising the people and communities who contributed to the Purple Diamond Crew story and the wider OneWorldz mission.",None)
    }
    for slug,(title,lead,art) in pages.items():
        d=root/slug; d.mkdir(parents=True,exist_ok=True)
        pb=hero("PURPLE DIAMOND CREW",f'{title}<br><span class="wx-gradient">Purple Diamond Handz.</span>',lead,art,[("PDC Home","/",True),("OneWorldz","https://oneworldz.com",True)])
        if slug=="chest":
            pb+=f"""<section class="wx-section"><div class="wx-note">Exactly ten genuine legacy-token positions are preserved. No invented token, fake contract address or placeholder identity is permitted in production.</div></section>"""
        (d/"index.html").write_text(page(f"{title} | Purple Diamond Crew",lead,nav_for("Purple Diamond Crew"),pb,"#a53cff"),encoding="utf-8")

def update_launchpad():
    root=ROOT/"launchpad.cryptoworldz.xyz"
    for p in root.rglob("*.html"):
        text=p.read_text(encoding="utf-8",errors="ignore")
        text=text.replace("Always Use Official Logo","")
        p.write_text(text,encoding="utf-8")
    # Upgrade the generic visual core without replacing official branding.
    idx=root/"index.html"
    if idx.is_file():
        text=idx.read_text(encoding="utf-8")
        text=text.replace('<div class="core"><b>W</b><span>LAUNCH</span></div>','<div class="core"><span class="brand-logo-official" aria-hidden="true"></span><span>WORLDZ</span></div>')
        idx.write_text(text,encoding="utf-8")

def write_manifest():
    manifest={
      "version":BUILD,
      "approvedBy":"JayJayTeamDev",
      "releaseGates":["Top 100 Website Ecosystem Requests","Perfect-fitting vibrant Worldz visual standard","Official identity assets where available","Desktop/mobile/live verification"],
      "core":["https://oneworldz.com","https://donateworldz.com","https://cryptoworldz.xyz","https://purplediamondcrew.com","https://launchpad.cryptoworldz.xyz"],
      "domains":DOMAINS
    }
    (ROOT/"worldz-ecosystem.nextgen.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
    urls=[f"https://{d}/" for d in DOMAINS]+[
      "https://oneworldz.com/ecosystem/","https://donateworldz.com/reagan-children/",
      "https://purplediamondcrew.com/chest/","https://purplediamondcrew.com/make-a-difference/",
      "https://purplediamondcrew.com/hodlerz-special/","https://purplediamondcrew.com/acknowledgements/",
      "https://launchpad.cryptoworldz.xyz/worldz-launch/","https://launchpad.cryptoworldz.xyz/wldz/",
      "https://cryptoworldz.xyz/command-centre-max/"
    ]
    (ROOT/".nextgen-urls.txt").write_text("\n".join(urls)+"\n",encoding="utf-8")

def validate():
    forbidden="always use official logo"
    for domain in DOMAINS:
        root=ROOT/domain
        assert (root/"index.html").is_file(), domain
        assert (root/"worldz-nextgen.css").is_file(), domain
        for p in root.rglob("*.html"):
            text=p.read_text(encoding="utf-8",errors="ignore")
            assert "worldz-nextgen.css" in text, p
            assert forbidden not in text.lower(), p
            assert "data-worldz-nextgen=" in text, p
    lp=(ROOT/"launchpad.cryptoworldz.xyz"/"index.html").read_text(encoding="utf-8")
    assert "brand-logo-official" in lp
    assert "brand-orb" not in lp
    one=(ROOT/"oneworldz.com"/"index.html").read_text(encoding="utf-8")
    for term in ("Helping the People","DonateWorldz","WorldzEcoSystem","CLEAR SEPARATION"): assert term in one
    crypto=(ROOT/"cryptoworldz.xyz"/"index.html").read_text(encoding="utf-8")
    for term in ("WorldzLaunchPad","COMMAND CENTRE MAX","SolWorldz","XRPWorldz"): assert term in crypto
    pdc=(ROOT/"purplediamondcrew.com"/"index.html").read_text(encoding="utf-8")
    for route in ("chest","make-a-difference","hodlerz-special","acknowledgements"): assert (ROOT/"purplediamondcrew.com"/route/"index.html").is_file()
    print(f"WORLDZ_NEXTGEN_BUILD=PASS sites={len(DOMAINS)} urls={len((ROOT/'.nextgen-urls.txt').read_text().splitlines())}")

def main():
    ensure_css()
    build_chain_worldz()
    build_oneworldz()
    build_donate()
    build_crypto()
    build_pdc()
    update_launchpad()
    inject_all_html()
    write_manifest()
    validate()

if __name__=="__main__":
    main()
