#!/usr/bin/env python3
"""Build the approved OneWorldz Heroes surface and Worldz Live action plan.

Only the six approved Heroes are published here. Public-profile links are
provided for visitors; inclusion does not imply endorsement, partnership or
approval by the featured person unless OneWorldz later documents it.
"""
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "oneworldz.com"
BUILD = "2026-09-19-heroes-six-worldz-live"

HEROES = [
    {
        "route": "just-knate",
        "name": "Just Knate",
        "label": "The Street Guardian",
        "image": "/assets/heroes/just-knate.webp",
        "facebook": "https://www.facebook.com/justknate",
        "summary": "Street-level kindness and practical support for people experiencing homelessness and hardship.",
        "focus": ["Food & essentials", "Street outreach", "Dignity", "Community support"],
    },
    {
        "route": "victor-good-boss",
        "name": "Victor — The Good Boss",
        "label": "Recovery, Hope & Second Chances",
        "image": "/assets/heroes/victor-good-boss.webp",
        "facebook": "https://www.facebook.com/victorthegoodboss",
        "summary": "Public outreach centred on recovery, rehabilitation, practical support and helping people move toward a better life.",
        "focus": ["Recovery", "Rehabilitation", "Homelessness outreach", "Second chances"],
    },
    {
        "route": "sam-weidenhofer",
        "name": "Sam Weidenhofer",
        "label": "Everyday People's Champion",
        "image": "/assets/heroes/sam-weidenhofer.webp",
        "facebook": "https://www.facebook.com/itssozer",
        "summary": "Public acts of kindness, community support and fundraising that show how one person can help another.",
        "focus": ["Kindness", "Community support", "Fundraising", "Mental-health awareness"],
    },
    {
        "route": "bi-phakathi",
        "name": "Bi Phakathi",
        "label": "Global Impact Through Caring",
        "image": "/assets/heroes/bi-phakathi.webp",
        "facebook": "https://www.facebook.com/biphakathi",
        "summary": "Direct compassion in action through food, family support and practical help for people facing hardship.",
        "focus": ["Food", "Families", "Direct support", "Community dignity"],
    },
    {
        "route": "mdmotivator",
        "name": "MDMotivator",
        "label": "Global Kindness & Mental Health",
        "image": "/assets/heroes/mdmotivator.webp",
        "facebook": "https://www.facebook.com/MdMotivatorOfficial",
        "summary": "Kindness-led public support and positive community action designed to make people feel seen, heard and valued.",
        "focus": ["Kindness", "Mental health", "Hope", "Community action"],
    },
    {
        "route": "dylan-thiry",
        "name": "Dylan Thiry",
        "label": "Building Hope",
        "image": "/assets/heroes/dylan-thiry.webp",
        "facebook": "https://www.facebook.com/dylanthirypro",
        "summary": "Humanitarian-oriented public projects focused on practical support, stronger futures and community development.",
        "focus": ["Shelter", "Community development", "Education", "Opportunity"],
    },
]

def e(value):
    return escape(str(value), quote=True)

CSS = """
:root{--hero-purple:#a855f7;--hero-violet:#6d28d9;--hero-gold:#f6c453;--hero-blue:#38bdf8}
body{background:#070512;color:#f8f7ff}
.hero-shell{width:min(1180px,calc(100% - 28px));margin:0 auto;padding:22px 0 64px}
.hero-nav{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:14px 0}
.hero-nav a,.action-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 15px;border:1px solid rgba(168,85,247,.5);border-radius:999px;color:#fff;text-decoration:none;background:rgba(168,85,247,.1);font-weight:800}
.action-btn.primary{background:linear-gradient(135deg,#6d28d9,#a855f7);border-color:#c084fc}
.action-btn.gold{background:linear-gradient(135deg,#8a5a00,#d79b1e);border-color:#f6c453}
.hero-intro{position:relative;overflow:hidden;border:1px solid rgba(168,85,247,.42);border-radius:28px;background:radial-gradient(circle at 50% 0%,rgba(91,33,182,.5),rgba(8,6,20,.96) 60%);padding:28px;margin:10px 0 24px;text-align:center}
.hero-intro img{width:min(760px,100%);height:auto;object-fit:contain;border-radius:20px;margin:0 auto 20px;display:block}
.eyebrow{letter-spacing:.15em;text-transform:uppercase;color:#c4b5fd;font-weight:900;font-size:.8rem}
.hero-intro h1,.profile-copy h1{font-size:clamp(2rem,6vw,4.4rem);line-height:1;margin:.25em 0;background:linear-gradient(90deg,#fff,#c4b5fd,#f6c453);-webkit-background-clip:text;color:transparent}
.hero-intro p{max-width:850px;margin:12px auto;line-height:1.65;color:#e9e3f6}
.hero-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin:20px 0 34px}
.hero-card{overflow:hidden;border:1px solid rgba(168,85,247,.4);border-radius:22px;background:rgba(255,255,255,.035);box-shadow:0 18px 45px rgba(0,0,0,.22)}
.hero-card img{width:100%;aspect-ratio:4/5;object-fit:contain;background:#080511;display:block}
.hero-card-body{padding:18px}.hero-card h2{margin:0 0 6px;font-size:1.35rem}.hero-card .label{color:#f6c453;font-weight:800}.hero-card p{color:#d9d3e7;line-height:1.55}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.section{padding:25px;margin:22px 0;border:1px solid rgba(255,255,255,.09);border-radius:24px;background:rgba(255,255,255,.025)}
.section h2{font-size:clamp(1.5rem,4vw,2.45rem);margin:.2em 0 .55em}.section p{line-height:1.65;color:#ddd7e8}
.profile{display:grid;grid-template-columns:minmax(280px,.85fr) minmax(0,1.15fr);gap:28px;align-items:center;padding:24px;border:1px solid rgba(168,85,247,.42);border-radius:28px;background:radial-gradient(circle at 30% 20%,rgba(91,33,182,.35),rgba(8,6,20,.97))}
.profile img{width:100%;max-height:760px;object-fit:contain;border-radius:20px;background:#080511}
.profile-copy .tag{color:#f6c453;font-weight:900;font-size:1.05rem}.profile-copy p{line-height:1.7;color:#e2ddec}
.focus-grid,.invite-grid,.roadmap{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:16px}
.focus-grid div,.invite-grid div,.roadmap div{padding:16px;border:1px solid rgba(168,85,247,.3);border-radius:16px;background:rgba(168,85,247,.06);line-height:1.45}
.notice{padding:18px;border-left:4px solid #f6c453;border-radius:14px;background:rgba(246,196,83,.08);color:#eee7d1;line-height:1.6}
.pdc{background:linear-gradient(135deg,rgba(76,29,149,.28),rgba(8,6,20,.95));border-color:rgba(192,132,252,.5)}
.big-call{font-size:clamp(1.25rem,4vw,2.2rem);font-weight:900;color:#fff}
.small{font-size:.9rem;color:#bdb5ca!important}
.country-list{columns:2;column-gap:28px}.country-list li{padding:5px 0}
.footer-note{text-align:center;color:#aaa0b8;padding:24px 0;line-height:1.6}
@media(max-width:900px){.hero-grid{grid-template-columns:1fr 1fr}.profile{grid-template-columns:1fr}.focus-grid,.invite-grid,.roadmap{grid-template-columns:1fr 1fr}}
@media(max-width:620px){.hero-grid,.focus-grid,.invite-grid,.roadmap{grid-template-columns:1fr}.hero-intro,.section,.profile{padding:17px}.country-list{columns:1}}
"""

def head(title, description):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)} | OneWorldz Heroes</title>
<meta name="description" content="{e(description)}">
<link rel="stylesheet" href="/style.css">
<style>{CSS}</style>
</head>
<body data-oneworldz-build="{BUILD}" data-oneworldz-heroes="{BUILD}">
<div class="hero-shell">
<nav class="hero-nav">
<a href="/">🌏 OneWorldz</a>
<a href="/heroes/">🦸 Heroes</a>
<a href="https://purplediamondcrew.com/">💎 Purple Diamond Crew</a>
<a href="/heroes/destination-inspiration/">🎤 Worldz Live 2026–2030</a>
</nav>
<main class="hero-main">
"""

def foot():
    return """
<div class="footer-note">
<strong>One World • One Vision • One Fam</strong><br>
Helping the People who Help the People.<br>
OneWorldz independently recognises public humanitarian and kindness work. A profile does not claim endorsement, partnership or affiliation unless separately confirmed and documented.
</div>
</main>
</div></body></html>
"""

def write(route, content):
    path = SITE / route / "index.html"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")

cards = []
for hero in HEROES:
    cards.append(f"""
<article class="hero-card">
<img src="{e(hero['image'])}" alt="{e(hero['name'])} OneWorldz Hero artwork">
<div class="hero-card-body">
<p class="eyebrow">OneWorldz Hero</p>
<h2>{e(hero['name'])}</h2>
<div class="label">{e(hero['label'])}</div>
<p>{e(hero['summary'])}</p>
<div class="actions">
<a class="action-btn primary" href="/heroes/{e(hero['route'])}/">Open Hero Page</a>
<a class="action-btn" href="{e(hero['facebook'])}" target="_blank" rel="noopener noreferrer">Facebook ↗</a>
</div>
</div></article>
""")

heroes_page = head("Real-World Heroes", "Six OneWorldz Heroes showing what practical kindness, recovery, outreach and community support can look like.") + f"""
<section class="hero-intro">
<img src="/assets/heroes/heroes-world.webp" alt="OneWorldz Heroes — one world, one vision">
<p class="eyebrow">Real People • Real Action • Real Impact</p>
<h1>The OneWorldz Heroes</h1>
<p>Six public examples of people choosing action over indifference. Their work is different, but the principle is shared: see people, help people, restore dignity and inspire the next person to act.</p>
<div class="actions" style="justify-content:center">
<a class="action-btn primary" href="https://purplediamondcrew.com/">💎 Join Purple Diamond Crew</a>
<a class="action-btn gold" href="/heroes/destination-inspiration/">🎤 Destination & Inspiration 2026–2030</a>
</div>
</section>
<section class="hero-grid">
{''.join(cards)}
</section>
<section class="section pdc">
<p class="eyebrow">Purple Diamond Crew • On The Ground</p>
<h2>The Crew stands beside the mission.</h2>
<p>Purple Diamond Crew is the action network for people who want to do more than watch. The goal is to work with legitimate local organisations and communities on practical support — food, clean water, shelter, clothing, care packages, education, gardens, equipment, logistics and volunteer effort — in the same spirit of direct action represented by the Heroes above.</p>
<p class="big-call">You do not have to be famous to become a Hero. You have to be willing to help.</p>
<div class="actions">
<a class="action-btn primary" href="https://purplediamondcrew.com/">Join the Purple Diamond Crew →</a>
<a class="action-btn" href="mailto:hello@oneworldz.com?subject=Purple%20Diamond%20Crew%20Interest">Register Interest</a>
</div>
</section>
<section class="section">
<p class="eyebrow">The Next Stage</p>
<h2>Worldz Live — Destination & Inspiration 2026–2030</h2>
<p>OneWorldz is putting forward an open-invitation concept: free public performances paired with real field missions, local markets and community action. Entertainment should bring attention and resources to the destination — not take resources away from it.</p>
<div class="actions"><a class="action-btn gold" href="/heroes/destination-inspiration/">Open the Action Plan →</a></div>
</section>
""" + foot()
write("heroes", heroes_page)

for hero in HEROES:
    focus = "".join(f"<div><strong>{e(x)}</strong></div>" for x in hero["focus"])
    page = head(hero["name"], hero["summary"]) + f"""
<section class="profile">
<img src="{e(hero['image'])}" alt="{e(hero['name'])} OneWorldz Hero artwork">
<div class="profile-copy">
<p class="eyebrow">OneWorldz Hero</p>
<h1>{e(hero['name'])}</h1>
<div class="tag">{e(hero['label'])}</div>
<p>{e(hero['summary'])}</p>
<div class="focus-grid">{focus}</div>
<div class="actions">
<a class="action-btn primary" href="{e(hero['facebook'])}" target="_blank" rel="noopener noreferrer">Open Facebook Page ↗</a>
<a class="action-btn" href="/heroes/">All Six Heroes</a>
</div>
</div>
</section>
<section class="section pdc">
<p class="eyebrow">From Inspiration to Participation</p>
<h2>Purple Diamond Crew — on the ground providing support.</h2>
<p>OneWorldz wants the lesson from every Hero profile to be practical: kindness becomes stronger when people organise. Purple Diamond Crew is the volunteer action network intended to work alongside local communities and established organisations — helping with food, clean water, shelter, clothing, education, equipment, gardens, care packages, transport and community support.</p>
<div class="actions">
<a class="action-btn primary" href="https://purplediamondcrew.com/">💎 Join Purple Diamond Crew</a>
<a class="action-btn gold" href="/heroes/destination-inspiration/">🎤 Join the Worldz Live Vision</a>
</div>
</section>
<section class="section">
<p class="eyebrow">Recognition Note</p>
<p class="notice">This OneWorldz page independently recognises publicly visible humanitarian, kindness or community work. It does not state that {e(hero['name'])} has endorsed, joined or partnered with OneWorldz. The Facebook button is provided so visitors can follow the person's own public account directly.</p>
</section>
""" + foot()
    write("heroes/" + hero["route"], page)

event_page = head(
    "Worldz Live — Destination & Inspiration 2026–2030",
    "A proposed 2026–2030 free-performance and humanitarian-action program pairing music, local markets, volunteers and measurable community projects."
) + """
<section class="hero-intro">
<img src="/assets/heroes/heroes-world.webp" alt="OneWorldz global action and inspiration">
<p class="eyebrow">Open Invitation • 2026–2030</p>
<h1>Worldz Live: Destination & Inspiration</h1>
<p><strong>Song & Dance to Change the World.</strong> A proposed series of free public performances in destination communities, paired with Purple Diamond Crew field action, local organisations, local performers, local vendors and practical projects that remain after the stage is packed away.</p>
<div class="actions" style="justify-content:center">
<a class="action-btn gold" href="mailto:hello@oneworldz.com?subject=Worldz%20Live%20Performer%20Invitation">Performers — Join the Invitation</a>
<a class="action-btn primary" href="https://purplediamondcrew.com/">Volunteers — Join the Crew</a>
<a class="action-btn" href="mailto:hello@oneworldz.com?subject=Worldz%20Live%20Production%20or%20Sponsor%20Partner">Production & Sponsors</a>
</div>
</section>

<section class="section">
<p class="eyebrow">The Lead Invitation</p>
<h2>🩷 Open invitation to P!NK</h2>
<p class="big-call">P!NK — OneWorldz invites you to consider helping lead the first Worldz Live gathering and calling fellow performers to action.</p>
<p>This is an open invitation, not a claim that P!NK has accepted or is affiliated with OneWorldz. The invitation is simple: help create a stage where world-class performance and practical humanitarian action happen in the same place.</p>
<div class="actions">
<a class="action-btn primary" href="https://www.facebook.com/pink" target="_blank" rel="noopener noreferrer">P!NK on Facebook ↗</a>
<a class="action-btn" href="mailto:hello@oneworldz.com?subject=Worldz%20Live%20Artist%20Team">Artist / Management Contact</a>
</div>
</section>

<section class="section">
<p class="eyebrow">Who Else Do We Call?</p>
<h2>Initial performer invitation list</h2>
<p>These names are proposed outreach targets only. No participation, endorsement or partnership is claimed.</p>
<div class="invite-grid">
<div><strong>Coldplay / Chris Martin</strong><br>Global headline invitation</div>
<div><strong>Ed Sheeran</strong><br>Global headline invitation</div>
<div><strong>Alicia Keys</strong><br>Global headline invitation</div>
<div><strong>Burna Boy</strong><br>African/global headline invitation</div>
<div><strong>Tems</strong><br>African/global headline invitation</div>
<div><strong>Angélique Kidjo</strong><br>African/global headline invitation</div>
<div><strong>Yemi Alade</strong><br>African/global headline invitation</div>
<div><strong>Bien / Sauti Sol</strong><br>East African invitation</div>
<div><strong>Tones and I</strong><br>Australian invitation</div>
<div><strong>Local performers</strong><br>Priority at every destination</div>
<div><strong>Choirs & dance groups</strong><br>Community-led performance</div>
<div><strong>Emerging artists</strong><br>A local stage for new voices</div>
</div>
</section>

<section class="section pdc">
<p class="eyebrow">Purple Diamond Crew</p>
<h2>The stage is temporary. The support must remain.</h2>
<p>At every viable destination, Purple Diamond Crew would work only with appropriate local organisations, authorities, community leaders and qualified partners. The practical mission may include food, water, shelter, care packages, gardens, tools, education, medical-support referrals and logistics according to verified local need.</p>
<p class="notice"><strong>Rule:</strong> direct humanitarian funds are not to be quietly consumed by entertainment costs. Stage, sound, artist logistics and production should be separately budgeted and pursued through sponsors, donated services, artist contributions and clearly ring-fenced event funding.</p>
</section>

<section class="section">
<p class="eyebrow">2026–2030 Action Roadmap</p>
<h2>Build one working model — then expand responsibly.</h2>
<div class="roadmap">
<div><strong>2026 — Uganda Pilot</strong><br>Local partners, permits, safeguarding, venue, free public performance, community stalls and at least one measurable field project.</div>
<div><strong>2027 — Prove & Repeat</strong><br>Publish costs and impact, improve the model, then add up to two viable destination events.</div>
<div><strong>2028 — Regional Growth</strong><br>Expand only where trusted local partners, safety, logistics and project funding are in place.</div>
<div><strong>2029 — Destination Circuit</strong><br>Connect several successful local events into a broader Africa-focused Destination & Inspiration circuit.</div>
<div><strong>2030 — Global Finale</strong><br>Bring performers, Heroes, Crew members and community partners together and publish a full 2026–2030 impact record.</div>
</div>
</section>

<section class="section">
<p class="eyebrow">High-Need Destination Research</p>
<h2>Need first. Safety and local invitation always.</h2>
<p>The first research queue will examine Uganda as the launch anchor plus high-poverty contexts identified in international poverty data, including Chad, Niger, Central African Republic, Burundi, Madagascar, Mali, Guinea, Ethiopia, Burkina Faso and Guinea-Bissau.</p>
<p><strong>These are research candidates — not confirmed concert stops.</strong> A location only moves forward after local invitation, security assessment, safeguarding plan, permits, insurance, medical planning, transport feasibility, trusted local partners and a clear project that the community actually wants.</p>
<ul class="country-list">
<li>Uganda — proposed launch anchor</li>
<li>Chad — research candidate</li>
<li>Niger — research candidate</li>
<li>Central African Republic — research candidate</li>
<li>Burundi — research candidate</li>
<li>Madagascar — research candidate</li>
<li>Mali — research candidate</li>
<li>Guinea — research candidate</li>
<li>Ethiopia — research candidate</li>
<li>Burkina Faso — research candidate</li>
<li>Guinea-Bissau — research candidate</li>
</ul>
<div class="actions">
<a class="action-btn" href="https://hdr.undp.org/content/2025-global-multidimensional-poverty-index-mpi" target="_blank" rel="noopener noreferrer">UNDP 2025 MPI Data ↗</a>
<a class="action-btn" href="https://pip.worldbank.org/" target="_blank" rel="noopener noreferrer">World Bank Poverty Data ↗</a>
</div>
</section>

<section class="section">
<p class="eyebrow">Destination & Inspiration</p>
<h2>Free to watch. Built with the destination, not dropped on top of it.</h2>
<p>The public-performance concept is free admission where local conditions permit. Visitors and holiday-makers can attend, but travel and accommodation remain their own responsibility unless a properly licensed travel partner later offers a package. Local vendors, food stalls, craftspeople, community groups and performers should receive priority space so the event creates local economic activity as well as attention.</p>
<div class="focus-grid">
<div><strong>Free Public Stage</strong><br>Music, dance, local culture and global guests.</div>
<div><strong>Local Market</strong><br>Stalls and opportunities for local vendors and makers.</div>
<div><strong>Field Mission</strong><br>A measurable food, water, shelter, education or community project.</div>
<div><strong>Impact Report</strong><br>Publish what was promised, funded, delivered and learned.</div>
</div>
</section>

<section class="section">
<p class="eyebrow">Call to Action</p>
<h2>Artists. Producers. Airlines. Hotels. Equipment companies. NGOs. Local leaders. Volunteers.</h2>
<p>OneWorldz can design the framework, but a safe international program requires qualified people in event production, safeguarding, security, medicine, travel, insurance, logistics, engineering, local development and humanitarian delivery.</p>
<div class="actions">
<a class="action-btn gold" href="mailto:hello@oneworldz.com?subject=Worldz%20Live%20Performer">I Am a Performer</a>
<a class="action-btn" href="mailto:hello@oneworldz.com?subject=Worldz%20Live%20Local%20Partner">I Am a Local Partner</a>
<a class="action-btn" href="mailto:hello@oneworldz.com?subject=Worldz%20Live%20Sponsor">I Can Sponsor / Supply</a>
<a class="action-btn primary" href="https://purplediamondcrew.com/">I Want to Volunteer</a>
</div>
</section>
""" + foot()
write("heroes/destination-inspiration", event_page)

# Ensure the mission home has a durable doorway to the rebuilt Heroes surface.
home = SITE / "index.html"
if home.is_file():
    text = home.read_text(encoding="utf-8")
    if 'href="/heroes/"' not in text:
        block = """
<section class="section" data-oneworldz-heroes-door="1">
<p class="eyebrow">Real Heroes</p>
<h2>Meet the people who prove action matters.</h2>
<p>Six OneWorldz Hero profiles plus the Purple Diamond Crew action pathway and the Worldz Live 2026–2030 open invitation.</p>
<div class="actions"><a class="btn" href="/heroes/">Open Real Heroes →</a></div>
</section>
"""
        text = text.replace("</main>", block + "</main>", 1)
        home.write_text(text, encoding="utf-8")

print("ONEWORLDZ_HEROES=PASS heroes=6 pdc=1 worldz_live=1 destination_research=1")
