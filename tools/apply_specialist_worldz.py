#!/usr/bin/env python3
"""Build the OneWorldz specialist departments.

Each department follows the same operating system:
ResearchWorldz -> Specialist Worldz -> LawWorldz -> DonateWorldz -> Measure.
"""
from pathlib import Path
from html import escape
import re

ROOT = Path(__file__).resolve().parents[1]
BUILD = "2026-09-19-specialist-worldz"

DEPARTMENTS = {
    "waterworldz": {
        "name": "WaterWorldz",
        "purpose": "Safe, reliable water systems that communities can operate, maintain and repair locally.",
        "research": [
            "Groundwater assessment, hydrogeology, bore siting and sustainable yield",
            "Bore drilling methods, casing, sealing, contamination protection and yield testing",
            "Water-quality testing, treatment, filtration, disinfection and monitoring",
            "Solar pumps, hand-pump backup, storage tanks, pipelines and efficient irrigation",
            "Maintenance models, spare-parts supply, local operator training and community ownership",
        ],
        "delivery": [
            "Assess the source before buying equipment",
            "Drill and test the bore against local technical and legal requirements",
            "Treat and store water according to measured water quality",
            "Choose pumps that are serviceable locally and design redundancy where practical",
            "Train named local operators and keep critical spares available",
        ],
        "law": [
            "Water access, drilling permits and groundwater allocation rules",
            "Drinking-water standards, testing duties and public-health requirements",
            "Procurement, infrastructure maintenance and public funding rules that affect reliable rural water",
        ],
        "measure": ["Water points operating", "People with reliable access", "Water-quality tests passed", "Downtime and repair time"],
        "delivery_link": "https://donateworldz.com/fresh-water-mission/",
    },
    "growworldz": {
        "name": "GrowWorldz / FarmWorldz",
        "purpose": "Turn communities from food recipients into food producers wherever local conditions make that possible.",
        "research": [
            "Climate, rainfall, soil, land access and crop suitability",
            "Seeds, fruit trees, nurseries, locally adapted varieties and planting calendars",
            "Irrigation efficiency, water harvesting and drought resilience",
            "Composting, soil improvement, erosion control and integrated pest management",
            "Harvesting, drying, storage, seed continuity, farmer education and local markets",
        ],
        "delivery": [
            "Choose crops for local conditions and local diets",
            "Pair seeds and trees with tools, water and practical training",
            "Build soil health and water efficiency into every growing plan",
            "Plan harvesting and storage before planting at scale",
            "Develop local trainers and repeatable growing systems",
        ],
        "law": [
            "Seed, land, irrigation and agricultural input rules",
            "Public agricultural extension, school-garden and food-security programs",
            "Market, procurement and food-safety rules affecting small producers",
        ],
        "measure": ["Area under productive cultivation", "Harvest volumes", "Households producing food", "Post-harvest loss"],
        "delivery_link": "https://donateworldz.com/grow-food-mission/",
    },
    "healthworldz": {
        "name": "HealthWorldz",
        "purpose": "Research and reproduce health systems that prevent avoidable illness and expand practical access to care.",
        "research": [
            "Primary care, community health workers, clinics and mobile health services",
            "Maternal, newborn and child health systems",
            "Vaccination, prevention, nutrition and communicable-disease control",
            "Essential medicines, supply chains, diagnostics and referral pathways",
            "Dental, mental-health and disability support models with documented outcomes",
        ],
        "delivery": [
            "Start with prevention and primary care close to where people live",
            "Use qualified local health professionals and recognised clinical standards",
            "Design medicine and diagnostic supply chains before opening services",
            "Create clear referral pathways for cases requiring higher-level care",
            "Measure health outcomes rather than counting visits alone",
        ],
        "law": [
            "Healthcare access, public funding and essential-service eligibility",
            "Medicines, licensing, scope-of-practice and telehealth rules",
            "Public-health, vaccination, maternal-care and rural-service policy",
        ],
        "measure": ["People reached", "Preventive services delivered", "Referral completion", "Health outcomes relevant to the program"],
        "delivery_link": "https://donateworldz.com/",
    },
    "shelterworldz": {
        "name": "ShelterWorldz / HomeWorldz",
        "purpose": "Study and deliver safer pathways from homelessness and emergency shelter toward stable housing.",
        "research": [
            "Emergency accommodation, outreach and safe-sleeping systems",
            "Housing First and other evidence-based homelessness responses",
            "Social and affordable housing supply models",
            "Low-cost construction, sanitation, energy and climate-safe housing",
            "Tenancy support, wraparound services and homelessness prevention",
        ],
        "delivery": [
            "Separate immediate safety from long-term housing pathways",
            "Design accommodation with dignity, sanitation and personal safety",
            "Connect housing with health, income, legal and support services where needed",
            "Use durable construction and realistic maintenance models",
            "Track whether people remain housed, not only whether a bed was offered",
        ],
        "law": [
            "Housing, tenancy, planning and social-housing eligibility rules",
            "Homelessness funding and service-delivery frameworks",
            "Building, sanitation and land-use rules affecting low-cost housing",
        ],
        "measure": ["People moved to safer accommodation", "Stable housing placements", "Housing retention", "Time from crisis to housing"],
        "delivery_link": "https://donateworldz.com/community-impact/",
    },
    "educationworldz": {
        "name": "EducationWorldz",
        "purpose": "Find education systems that produce strong, equitable outcomes and make practical learning reachable.",
        "research": [
            "Early childhood, primary and secondary education systems",
            "Teacher training, attendance, curriculum and learning support",
            "Books, devices, internet access and offline learning tools",
            "Vocational training, apprenticeships and livelihood skills",
            "Agricultural, health and community-service education tied to local needs",
        ],
        "delivery": [
            "Prioritise attendance, teacher capacity and basic learning resources",
            "Match technology to connectivity, electricity and maintenance realities",
            "Build vocational pathways around real local opportunities",
            "Include nutrition, water and health barriers that affect learning",
            "Measure learning and completion, not equipment distribution alone",
        ],
        "law": [
            "Compulsory education, access and school-funding rules",
            "Teacher standards, vocational accreditation and skills policy",
            "Digital access, disability support and school-meal policy",
        ],
        "measure": ["Attendance", "Learning progress", "Course completion", "Transition to further education or work"],
        "delivery_link": "https://donateworldz.com/",
    },
    "energyworldz": {
        "name": "EnergyWorldz",
        "purpose": "Reliable energy for water, food storage, health services, education and community infrastructure.",
        "research": [
            "Solar generation, batteries, microgrids and hybrid backup systems",
            "Energy needs for pumps, refrigeration, clinics, schools and communications",
            "System sizing, load management, safety and equipment standards",
            "Local maintenance, spare parts, technician training and lifecycle cost",
            "Productive uses of energy that support farming, food processing and small enterprise",
        ],
        "delivery": [
            "Measure loads before selecting equipment",
            "Design for critical services first",
            "Use serviceable components and documented protection systems",
            "Train local technicians and plan battery/inverter replacement",
            "Track uptime and lifecycle cost",
        ],
        "law": [
            "Mini-grid, electrical licensing and connection rules",
            "Renewable-energy incentives, public procurement and import rules",
            "Safety standards and ownership models for community energy",
        ],
        "measure": ["System uptime", "Critical loads supplied", "Energy cost", "Maintenance response time"],
        "delivery_link": "https://donateworldz.com/",
    },
    "wasteworldz": {
        "name": "WasteWorldz",
        "purpose": "Stop useful resources becoming waste and build circular systems that protect health and the environment.",
        "research": [
            "Food-waste prevention, rescue and redistribution",
            "Composting and organic-waste recovery",
            "Recycling systems, material recovery and packaging reduction",
            "Safe handling of hazardous, medical and electronic waste",
            "Circular procurement, producer responsibility and waste measurement",
        ],
        "delivery": [
            "Prevent waste before designing disposal",
            "Separate edible food from inedible organic waste",
            "Build sorting and recovery around real local markets",
            "Keep hazardous streams out of community reuse systems",
            "Measure tonnes avoided, rescued, recycled and disposed",
        ],
        "law": [
            "Waste, recycling and landfill rules",
            "Food-donation, date-labelling and organics-diversion rules",
            "Producer responsibility, packaging and procurement requirements",
        ],
        "measure": ["Waste prevented", "Food rescued", "Material recovered", "Disposal reduction"],
        "delivery_link": "https://foodworldz.com/food-waste/",
    },
    "transportworldz": {
        "name": "TransportWorldz",
        "purpose": "Move food, water equipment, medicine and humanitarian supplies safely and efficiently to where they are needed.",
        "research": [
            "Freight routing, warehousing and distribution-network design",
            "Cold-chain transport and temperature monitoring",
            "Last-mile delivery in remote or low-infrastructure areas",
            "Vehicle selection, maintenance, fuel and driver safety",
            "Customs, import controls, humanitarian logistics and local procurement",
        ],
        "delivery": [
            "Plan receiving capacity before dispatch",
            "Use local procurement where it improves reliability and value",
            "Match vehicle and route to roads, distance, climate and cargo",
            "Protect cold-chain and sensitive equipment in transit",
            "Track delivery time, loss, damage and cost",
        ],
        "law": [
            "Road, freight, customs and import requirements",
            "Humanitarian exemptions and border processes where available",
            "Vehicle, driver and dangerous-goods safety rules",
        ],
        "measure": ["On-time delivery", "Loss and damage rate", "Cold-chain compliance", "Cost per delivered unit"],
        "delivery_link": "https://donateworldz.com/",
    },
    "moneyworldz": {
        "name": "MoneyWorldz / TaxWorldz",
        "purpose": "Make public budgets, procurement and spending understandable so citizens can evaluate lawful alternatives.",
        "research": [
            "Budgets, appropriations, grants and public expenditure",
            "Procurement, contracts, value-for-money and audit findings",
            "Tax expenditure, subsidies and public investment",
            "Program cost, measured outcomes and alternative uses of public funds",
            "Participatory budgeting and other documented public-input mechanisms",
        ],
        "delivery": [
            "Use official current-year documents and identify the jurisdiction",
            "Separate authorised budget from actual expenditure",
            "Show trade-offs and implementation costs when comparing alternatives",
            "Use plain language and link every material figure to its source",
            "Never present a spending preference as if evidence removes the need for democratic choice",
        ],
        "law": [
            "Budget and appropriation processes",
            "Procurement, grants, disclosure and audit rules",
            "Formal mechanisms for public submissions, petitions and budget consultation",
        ],
        "measure": ["Budget data explained", "Contracts reviewed from public records", "Evidence briefs published", "Formal submissions lodged"],
        "delivery_link": "https://law.oneworldz.com/public-money/",
    },
    "integrityworldz": {
        "name": "IntegrityWorldz",
        "purpose": "Research the strongest transparency and anti-corruption systems using documented evidence, not accusation.",
        "research": [
            "Independent audit and anti-corruption institutions",
            "Open contracting, beneficial ownership and procurement transparency",
            "Whistleblower and protected-disclosure systems",
            "Asset, interest and lobbying disclosure frameworks",
            "Public access to information, data publication and enforcement mechanisms",
        ],
        "delivery": [
            "Start with public records and formal findings",
            "Keep allegations separate from proven findings",
            "Preserve source documents, dates and decision trails",
            "Map which oversight body has jurisdiction",
            "Publish evidence in a form another person can independently check",
        ],
        "law": [
            "Anti-corruption, audit and protected-disclosure law",
            "Procurement transparency and conflict-of-interest rules",
            "Freedom-of-information, lobbying and disclosure requirements",
        ],
        "measure": ["Official records reviewed", "Verified findings documented", "Oversight pathways identified", "Reform briefs sent to LawWorldz"],
        "delivery_link": "https://law.oneworldz.com/integrity/",
    },
}

def e(v):
    return escape(str(v), quote=True)

def grid(items):
    return "".join(f'<div class="dept-card"><strong>{e(item)}</strong></div>' for item in items)

def dept_page(slug, cfg):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(cfg["name"])} | OneWorldz</title>
<meta name="description" content="{e(cfg["purpose"])}">
<link rel="stylesheet" href="/style.css">
<style>
:root{{--accent:#8f45ff;--accent2:#38bdf8}}
.dept-grid{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}}
.dept-card{{padding:16px;border:1px solid rgba(154,66,255,.36);border-radius:15px;background:rgba(255,255,255,.035);line-height:1.5}}
.dept-card strong{{color:#fff}}
.pipeline{{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}}
.pipeline div{{padding:13px;border-radius:13px;text-align:center;font-weight:900;border:1px solid rgba(56,189,248,.28);background:rgba(56,189,248,.06)}}
.handoff{{padding:18px;border-left:4px solid var(--accent2);border-radius:12px;background:rgba(56,189,248,.07);line-height:1.6}}
@media(max-width:820px){{.dept-grid{{grid-template-columns:1fr}}.pipeline{{grid-template-columns:1fr}}}}
</style>
</head>
<body data-oneworldz-build="{BUILD}" data-specialist-worldz="{e(slug)}">
<nav class="nav">
<a href="https://oneworldz.com/">OneWorldz</a>
<a href="https://oneworldz.com/specialist-worldz/">Specialist Worldz</a>
<a href="https://learn.oneworldz.com/">ResearchWorldz</a>
<a href="https://law.oneworldz.com/">LawWorldz</a>
<a href="https://donateworldz.com/">DonateWorldz</a>
</nav>
<main class="shell">
<section class="hero">
<img class="hero-art" src="/hero.png" alt="{e(cfg["name"])} OneWorldz specialist department artwork">
<div class="hero-copy">
<p class="eyebrow">OneWorldz Specialist Department</p>
<h1>{e(cfg["name"])}</h1>
<p>{e(cfg["purpose"])}</p>
</div>
</section>

<section class="section">
<p class="eyebrow">Operating system</p>
<h2>Research → solve → reform → deliver → measure.</h2>
<div class="pipeline"><div>RESEARCHWORLDZ</div><div>{e(cfg["name"].split(" / ")[0].upper())}</div><div>LAWWORLDZ</div><div>DONATEWORLDZ</div><div>MEASURE</div></div>
</section>

<section class="section">
<p class="eyebrow">Research agenda</p>
<h2>What this department must know.</h2>
<div class="dept-grid">{grid(cfg["research"])}</div>
<div class="actions"><a class="btn" href="https://learn.oneworldz.com/">Research with ResearchWorldz</a></div>
</section>

<section class="section">
<p class="eyebrow">Practical standard</p>
<h2>What a real solution must include.</h2>
<div class="dept-grid">{grid(cfg["delivery"])}</div>
<div class="actions"><a class="btn" href="{e(cfg["delivery_link"])}">Open delivery pathway</a></div>
</section>

<section class="section">
<p class="eyebrow">LawWorldz handoff</p>
<h2>When rules block better outcomes, send the evidence forward.</h2>
<div class="dept-grid">{grid(cfg["law"])}</div>
<p class="handoff">The specialist department does not declare a law wrong by itself. It documents the problem, evidence, alternatives, costs, safeguards and expected outcomes, then sends that package to LawWorldz to map the lawful reform process.</p>
<div class="actions"><a class="btn" href="https://law.oneworldz.com/research-handoff/">Send evidence to LawWorldz</a></div>
</section>

<section class="section">
<p class="eyebrow">Measure the result</p>
<h2>Do not call it success until the result can be shown.</h2>
<div class="dept-grid">{grid(cfg["measure"])}</div>
</section>
</main>
<footer class="footer">{e(cfg["name"])} • Research • Practical Solution • Law Reform • Delivery • Measurement</footer>
</body>
</html>'''

# Build every department.
for slug, cfg in DEPARTMENTS.items():
    out = ROOT / "oneworldz.com" / slug / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(dept_page(slug, cfg), encoding="utf-8")

# Specialist Worldz index.
cards = "".join(
    f'<a class="world-card" href="/{e(slug)}/"><strong>{e(cfg["name"])}</strong><span>{e(cfg["purpose"])}</span><b class="enter">OPEN →</b></a>'
    for slug, cfg in DEPARTMENTS.items()
)
index = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Specialist Worldz | OneWorldz</title>
<meta name="description" content="Specialist OneWorldz departments researching and solving water, food production, health, shelter, education, energy, waste, transport, public money and integrity problems.">
<link rel="stylesheet" href="/style.css">
<style>:root{{--accent:#8f45ff;--accent2:#38bdf8}}.world-grid{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}}.world-card{{display:flex;flex-direction:column;gap:10px;min-height:170px;padding:18px;border:1px solid rgba(154,66,255,.38);border-radius:18px;background:rgba(255,255,255,.035)}}.world-card span{{line-height:1.5}}.world-card .enter{{margin-top:auto;color:var(--accent2)}}@media(max-width:720px){{.world-grid{{grid-template-columns:1fr}}}}</style>
</head><body data-oneworldz-build="{BUILD}">
<nav class="nav"><a href="/">OneWorldz</a><a href="https://learn.oneworldz.com/">ResearchWorldz</a><a href="https://foodworldz.com/">FoodWorldz</a><a href="https://law.oneworldz.com/">LawWorldz</a><a href="https://donateworldz.com/">DonateWorldz</a></nav>
<main class="shell">
<section class="hero"><img class="hero-art" src="/hero.png" alt="OneWorldz specialist departments artwork"><div class="hero-copy"><p class="eyebrow">The problem-solving departments</p><h1>Specialist Worldz</h1><p>Each department researches one part of the mission deeply, develops practical standards, sends evidence-backed legal barriers to LawWorldz and connects real delivery to DonateWorldz.</p></div></section>
<section class="section"><p class="eyebrow">Departments</p><h2>Serious subjects. Practical systems.</h2><div class="world-grid">{cards}</div></section>
<section class="section"><p class="eyebrow">One rule for every Worldz</p><h2>Find what works. Prove it. Improve it. Reproduce it.</h2><p>Where existing law prevents the better solution, document the evidence and send it to LawWorldz for a lawful reform pathway.</p></section>
</main><footer class="footer">OneWorldz • A world problem-solving system</footer></body></html>'''
idx = ROOT / "oneworldz.com" / "specialist-worldz" / "index.html"
idx.parent.mkdir(parents=True, exist_ok=True)
idx.write_text(index, encoding="utf-8")

# Put the departments on the OneWorldz home page without introducing crypto.
home = ROOT / "oneworldz.com" / "index.html"
text = home.read_text(encoding="utf-8")
section = f'''<section class="section" id="specialist-worldz" data-specialist-worldz="1">
<p class="eyebrow">Specialist departments</p>
<h2>Every Worldz solves a real part of the mission.</h2>
<p>ResearchWorldz finds the strongest documented systems. Each specialist department turns that evidence into practical standards. LawWorldz handles reform pathways. DonateWorldz connects resources to physical delivery.</p>
<div class="mission-grid">{cards}</div>
<div class="actions"><a class="btn" href="/specialist-worldz/">Open all Specialist Worldz</a></div>
</section>'''
if 'data-specialist-worldz="1"' not in text:
    text = text.replace("</main>", section + "</main>", 1)
text = re.sub(r'data-oneworldz-build="[^"]*"', f'data-oneworldz-build="{BUILD}"', text, count=1)
home.write_text(text, encoding="utf-8")

print(f"SPECIALIST_WORLDZ=PASS departments={len(DEPARTMENTS)} index=1 homepage_section=1")
