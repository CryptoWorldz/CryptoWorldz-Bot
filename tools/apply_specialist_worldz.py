#!/usr/bin/env python3
"""Build the OneWorldz specialist departments.

Each department follows the same operating system:
ResearchWorldz -> Specialist Worldz -> LawWorldz -> DonateWorldz -> Measure.
"""
from pathlib import Path
from html import escape
import re

ROOT = Path(__file__).resolve().parents[1]
BUILD = "2026-10-02-worldz-reference-001"

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


# WORLDZ REFERENCE #001 — permanent public accountability case file.
# This intentionally overwrites the generic IntegrityWorldz page after the
# department loop so the permanent route survives prune/deploy while retaining
# the Specialist Worldz contract.
INTEGRITY_REFERENCE_001 = r'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WORLDZ REFERENCE #001 | IntegrityWorldz</title>
<meta name="description" content="WORLDZ REFERENCE #001 — a source-first case study in disability, government financial management, housing, mental-health support, complaints, public money and written accountability.">
<link rel="stylesheet" href="/style.css">
<style>
:root{--accent:#9a42ff;--accent2:#38bdf8;--gold:#f0c85b}
.ref-hero{min-height:0;background:radial-gradient(circle at 18% 10%,rgba(154,66,255,.24),transparent 40%),radial-gradient(circle at 86% 16%,rgba(56,189,248,.16),transparent 36%),linear-gradient(145deg,#120822,#05030a 74%)}
.ref-hero .hero-copy{padding:clamp(28px,6vw,76px);min-height:0}
.ref-hero h1{max-width:1050px;font-size:clamp(2.5rem,7vw,6rem);line-height:.94;letter-spacing:-.04em}
.ref-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.ref-card{padding:18px;border:1px solid rgba(154,66,255,.35);border-radius:18px;background:rgba(255,255,255,.035);line-height:1.55}
.ref-card strong{display:block;color:#fff;margin-bottom:8px}
.ref-card small{display:block;color:#bdb6ce;margin-top:8px}
.status{display:inline-block;padding:5px 9px;border-radius:999px;border:1px solid rgba(56,189,248,.38);font-size:.78rem;font-weight:900;letter-spacing:.03em;color:#bdeaff;margin-bottom:8px}
.timeline{display:grid;gap:12px}
.event{padding:16px;border-left:4px solid var(--accent2);border-radius:12px;background:rgba(56,189,248,.055)}
.event b{display:block;color:#fff;margin-bottom:5px}
.event time{font-weight:900;color:#bdeaff}
.funding{overflow-x:auto;border:1px solid rgba(255,255,255,.12);border-radius:16px}
.funding table{width:100%;border-collapse:collapse;min-width:820px}
.funding th,.funding td{padding:12px 14px;text-align:left;vertical-align:top;border-bottom:1px solid rgba(255,255,255,.1)}
.funding th{background:#170d2b}
.evidence-note{padding:18px;border-left:4px solid var(--gold);background:rgba(240,200,91,.07);border-radius:12px;line-height:1.62}
.source-list a{overflow-wrap:anywhere}
@media(max-width:760px){.ref-grid{grid-template-columns:1fr}}
</style>
</head>
<body data-oneworldz-build="2026-10-02-worldz-reference-001" data-specialist-worldz="integrityworldz" data-worldz-reference="001">
<nav class="nav">
<a class="brand" href="/">WorldzEcosystem™</a>
<a href="/specialist-worldz/">Specialist Worldz</a>
<a href="#research">ResearchWorldz</a>
<a href="#law">LawWorldz</a>
<a href="#public-money">Public Money</a>
<a href="#timeline">Evidence Timeline</a>
</nav>
<main class="shell">
<section class="hero ref-hero" data-verified-identity="text-first">
<div class="hero-copy">
<p class="eyebrow">IntegrityWorldz • ResearchWorldz • LawWorldz</p>
<h1>WORLDZ REFERENCE #001</h1>
<p><strong>Government Service Accountability — Evidence • Disability • Public Money • Written Records</strong></p>
<p>This is a source-first reference case showing how one Australian documented dealings with government agencies and government-funded services, preserved written evidence, separated verified records from recollection and opinion, and used lawful complaint, review and court pathways.</p>
</div>
</section>

<section class="section">
<p class="eyebrow">No.1 Reference & Guidance</p>
<h2>Start with the person's documented circumstances — then examine the service record.</h2>
<div class="evidence-note">
<p><strong>Primary Australian Government evidence:</strong> a Services Australia Income Statement dated 12 March 2026 records that Jason Wright was receiving the maximum-rate Disability Support Pension and gives a DSP grant date of 29 May 1997.</p>
<p><strong>Primary tribunal evidence:</strong> an NCAT Financial Management Order issued 12 November 2025 states that Jason Wright's estate is subject to management under the NSW Trustee and Guardian Act 2009, commits management to NSW Trustee &amp; Guardian, and requires review within 12 months.</p>
<p>Disability or financial-management status does not make clear written communication, accurate records, understandable explanations, lawful review pathways or attention to essential living needs unimportant. This case is published to show how records can be built and checked.</p>
</div>
</section>

<section class="section">
<p class="eyebrow">Evidence status</p>
<h2>Not every statement has the same evidentiary weight.</h2>
<div class="ref-grid">
<div class="ref-card"><span class="status">PRIMARY VERIFIED RECORD</span><strong>Original official document</strong><span>An order, government statement, official letter or other original record available in the evidence set.</span></div>
<div class="ref-card"><span class="status">SECONDARY VERIFIED RECORD</span><strong>Dated correspondence describing another record</strong><span>For example, court-related correspondence describing a medical report where the original report has not yet been recovered.</span></div>
<div class="ref-card"><span class="status">USER'S DOCUMENTED STATEMENT</span><strong>What Jason put in writing at the time</strong><span>This proves what was communicated. It does not automatically prove every allegation inside the message.</span></div>
<div class="ref-card"><span class="status">USER RECOLLECTION</span><strong>A remembered verbal conversation</strong><span>Used only where no recording or contemporaneous written confirmation has been located.</span></div>
<div class="ref-card"><span class="status">ALLEGATION / OPINION</span><strong>A criticism that has not been independently established</strong><span>Presented as Jason's view unless a court, tribunal, Ombudsman, audit or other authority has made a finding.</span></div>
<div class="ref-card"><span class="status">PUBLIC FUNDING RECORD</span><strong>Official budget, appropriation, grant or procurement source</strong><span>Each amount is labelled by financial year and program so unrelated funding is not falsely combined.</span></div>
</div>
</section>

<section class="section" id="research">
<p class="eyebrow">Medical and disability evidence trail</p>
<h2>Use the strongest record actually available.</h2>
<div class="ref-grid">
<div class="ref-card"><span class="status">PRIMARY VERIFIED RECORD</span><strong>Services Australia — 12 March 2026</strong><span>Income Statement confirms maximum-rate DSP and records a DSP grant date of 29 May 1997. Private identifiers such as address, date of birth and customer reference are not reproduced here.</span></div>
<div class="ref-card"><span class="status">PRIMARY TRANSMISSION RECORD</span><strong>Dubbo Medicare Mental Health Centre — 12 March 2026</strong><span>A sent email titled “Jason Wright's Information” included both the NCAT Order and the Services Australia Income Statement as attachments, establishing that those records were supplied to that service.</span></div>
<div class="ref-card"><span class="status">CORROBORATING RECORD</span><strong>Western Plains Medical Centre</strong><span>Appointment records establish an ongoing treatment relationship, including appointments with Dr Logan Jeyaindruan/Jeyaindran.</span></div>
<div class="ref-card"><span class="status">SECONDARY VERIFIED RECORD</span><strong>GP report described in court-related correspondence</strong><span>Solicitor correspondence dated 4 July 2026 describes a Dr Jeyaindran report dated 27 October 2025 addressing schizophrenia, depression and gambling-related financial decision-making concerns, and states that the report could be relied on at the hearing.</span><small>The original 27 October 2025 GP report itself has not yet been located in the currently accessible source archive, so this page does not pretend it has been independently inspected.</small></div>
</div>
<p class="evidence-note"><strong>Transmission caution:</strong> Jason states that Western Plains Medical Centre certificates were supplied to agencies when requested. This archive only marks a particular agency as having received a particular certificate where an email, attachment or other delivery record verifies that transmission.</p>
</section>

<section class="section" id="timeline">
<p class="eyebrow">Evidence timeline</p>
<h2>Key documented events from the case record.</h2>
<div class="timeline">
<div class="event"><time>12 NOV 2025</time><b>NCAT Financial Management Order</b><span>The order placed Jason Wright's estate under management by NSW Trustee &amp; Guardian and required review within 12 months.</span></div>
<div class="event"><time>12 MAR 2026</time><b>Services Australia DSP evidence supplied to Dubbo Medicare Mental Health Centre</b><span>The sent email included the NCAT Order and Centrelink Income Statement as attachments.</span></div>
<div class="event"><time>MAY 2026</time><b>Homes NSW complaint and urgent-housing correspondence</b><span>The mailbox record contains complaints and follow-ups concerning housing assistance and response times.</span></div>
<div class="event"><time>2 JUN 2026</time><b>Homes NSW priority-housing outcome</b><span>Homes NSW Dubbo wrote: “Please see attached outcome letter confirming you have been approved for priority housing in Narromine.”</span></div>
<div class="event"><time>4 JUL 2026</time><b>Court-related medical evidence described</b><span>Solicitor correspondence describes the 27 October 2025 Western Plains Medical Centre GP report and the financial-management evidence being considered.</span></div>
<div class="event"><time>28 AUG 2026</time><b>Dubbo Medicare Mental Health Centre / Stride response</b><span>Correspondence acknowledged Jason's stress, supplied housing/homelessness contacts, described the centre's short-to-medium-term psychosocial-support role and stated that it could not contact the identified accommodation/homelessness services or make enquiries on his behalf.</span></div>
<div class="event"><time>31 AUG 2026</time><b>NSW Ombudsman correspondence trail</b><span>Jason forwarded material concerning homelessness and government services. Ombudsman acknowledgement material explained complaint assessment, supporting-document requirements and the Ombudsman's powers and limitations.</span></div>
<div class="event"><time>SEP 2026</time><b>Accommodation and allowance correspondence</b><span>TAG correspondence addressed caravan-park accommodation, scheduled allowances, an approved shoes payment and the handling of essential living costs.</span></div>
<div class="event"><time>1–2 OCT 2026</time><b>Formal requests for written financial records</b><span>Jason requested an itemised history of previous payments, the date/amount/purpose of each future payment, written notice of budget or schedule changes, urgent food assistance and communication by email rather than requiring a phone call.</span></div>
</div>
</section>

<section class="section" id="correspondence-register" data-evidence-register="v1">
<p class="eyebrow">Correspondence Evidence Register</p>
<h2>Material agency wording, preserved by date and source.</h2>
<p>The original emails remain in the source mailboxes. This public register reproduces only the material lines needed to understand the decision or service response, while removing private identifiers, unrelated third-party details and email-signature clutter.</p>
<div class="timeline">
<div class="event"><time>2 JUN 2026</time><b>Homes NSW Dubbo — “Housing Application Outcome letter”</b><span class="status">VERIFIED AGENCY EMAIL</span><p>“Please see attached outcome letter confirming you have been approved for priority housing in Narromine.”</p></div>

<div class="event"><time>28 AUG 2026</time><b>Dubbo Medicare Mental Health Centre / Stride — “Request for Support – Jason Wright – Current Hospital, Housing and Bail Situation”</b><span class="status">VERIFIED SERVICE EMAIL</span><p>The Clinical Care Coordinator acknowledged Jason's stress and supplied housing/homelessness contacts. The email stated that the centre provides short-to-medium-term psychosocial support and that “we are unable to contact these services or make enquiries on your behalf.”</p><p>It also stated that a letter provided the previous day confirmed Jason's attendance and engagement with the service for psychosocial support.</p></div>

<div class="event"><time>31 AUG 2026</time><b>NSW Ombudsman — “Message Received By NSW Ombudsman”</b><span class="status">VERIFIED OMBUDSMAN ACKNOWLEDGEMENT</span><p>“Thank you for your email. It has been forwarded to an appropriate person for action.”</p><p>The acknowledgement explained that emails also directed to other parties are generally treated as information unless a response is assessed as warranted, and directed a person intending to lodge a complaint to the Ombudsman's complaint process.</p><p>It also stated that the Ombudsman can assess NSW-government administration complaints, does not have to investigate every complaint, cannot force an agency to act in the way a court can, and does not give legal advice.</p></div>

<div class="event"><time>4 SEP 2026</time><b>NSW Trustee &amp; Guardian — “Centrelink Advance”</b><span class="status">VERIFIED TAG EMAIL</span><p>TAG wrote that the Trust account balance was $800 and that an additional $200 had been placed into Jason's account for the weekend. The email said that balance did not afford the proposed car purchase and directed Jason to the Dubbo housing office regarding accommodation.</p></div>

<div class="event"><time>14 SEP 2026</time><b>NSW Trustee &amp; Guardian — urgent personal-funds correspondence</b><span class="status">VERIFIED TAG EMAIL</span><p>TAG wrote that Jason was receiving “the bulk” of his funds, approved additional phone credit, and stated: “No other funds are affordable at this time.”</p></div>

<div class="event"><time>15 SEP 2026</time><b>NSW Trustee &amp; Guardian — rent follow-up</b><span class="status">VERIFIED TAG EMAIL</span><p>TAG wrote: “We do not have any funds available to cover your rent.” It stated that Jason was receiving all funds allocated to him and would need to use those funds to pay rent, and said further emails would be answered on Friday.</p></div>

<div class="event"><time>1–2 OCT 2026</time><b>Jason Wright → NSW Trustee &amp; Guardian</b><span class="status">USER'S DOCUMENTED REQUESTS</span><p>Jason sent written requests for an explanation of the unexpected $160 payment, urgent food assistance, email-based communication, an itemised history of previous payments, and an individual written explanation of every future payment and budget/schedule change.</p></div>
</div>
<p class="evidence-note"><strong>Archive rule:</strong> a source excerpt proves what the source said on that date. It does not by itself prove a broader allegation about motive, misconduct or legality. Full original messages are retained separately so context can be checked if legitimately required.</p>
</section>

<section class="section">
<p class="eyebrow">The 15-day statement</p>
<h2>Recollection and published rule are kept separate.</h2>
<div class="evidence-note">
<p><strong>Jason's recollection:</strong> during his first phone call with his newly assigned NSW Trustee &amp; Guardian manager after review, he recalls being told words to the effect that there was a 15-day period available to respond to client emails about money.</p>
<p><strong>Evidence limitation:</strong> no recording or written confirmation of that exact statement has been located.</p>
<p><strong>Published standard:</strong> NSW Trustee &amp; Guardian's complaints information describes a 15-business-day target for a written response to a formal complaint after acknowledgement. The official material reviewed does not establish that every ordinary urgent money, food or payment email automatically carries the same response window.</p>
</div>
</section>

<section class="section" id="public-money">
<p class="eyebrow">Public Money Behind the Services</p>
<h2>Use official figures — and label what each figure actually means.</h2>
<div class="funding"><table>
<thead><tr><th>Organisation / service</th><th>Period</th><th>Official amount</th><th>What the figure means</th></tr></thead>
<tbody>
<tr><td>NSW Trustee &amp; Guardian</td><td>2026–27</td><td><strong>A$142.474m</strong> total expenses</td><td>Budget papers also record A$88.560m sales/services revenue, A$36.994m grants &amp; contributions and A$12.620m investment revenue. The whole expense budget is therefore <strong>not</strong> described here as taxpayer funding.</td></tr>
<tr><td>NSW Ombudsman</td><td>2026–27</td><td><strong>A$56.548163m</strong> appropriation</td><td>The Appropriation Bill notes this plus other sources is intended to fund A$60.683222m of expenses and A$0.5m capital expenditure.</td></tr>
<tr><td>Homes NSW / social housing</td><td>2024–25 to 2027–28</td><td><strong>A$6.1b</strong> allocated</td><td>A$5.1b for new/replacement homes and A$1b for urgent public-housing repairs and maintenance under Building Homes for NSW.</td></tr>
<tr><td>Dubbo Medicare Mental Health Centre</td><td>Announced 30 Sep 2025</td><td><strong>A$14.35m</strong></td><td>Commonwealth + NSW governments' combined investment for establishment and operation. The centre is commissioned by Western NSW Primary Health Network and operated by Stride.</td></tr>
<tr><td>Stride — LikeMind</td><td>July 2026</td><td><strong>A$2,095,104</strong></td><td>Separate NSW Health grant for LikeMind services in Orange and Wagga Wagga. This is <strong>not</strong> presented as Dubbo MMHC funding or as money spent on Jason's individual care.</td></tr>
<tr><td>Stride — Dubbo sub-acute day program</td><td>Dec 2025–Jan 2027</td><td><strong>A$154,000</strong></td><td>Separate HealthShare NSW contract for a Dubbo sub-acute mental-health day program, distinct from the Medicare Mental Health Centre funding.</td></tr>
</tbody></table></div>
<div class="source-list">
<p><strong>Official source links:</strong></p>
<p><a href="https://www.parliament.nsw.gov.au/tp/files/211356/2026-27%20Budget%20Paper%20No.04%20-%20Agency%20Financial%20Statements.pdf">NSW Budget Paper No.4 — Agency Financial Statements 2026–27</a></p>
<p><a href="https://www.parliament.nsw.gov.au/bill/files/18923/First%20Print.pdf">NSW Appropriation Bill 2026</a></p>
<p><a href="https://www.nsw.gov.au/departments-and-agencies/homes-nsw/building-homes-for-nsw">Homes NSW — Building Homes for NSW</a></p>
<p><a href="https://www.health.gov.au/ministers/the-hon-emma-mcbride-mp/media/dubbo-medicare-mental-health-centre-now-open">Australian Government — Dubbo Medicare Mental Health Centre</a></p>
<p><a href="https://www.nsw.gov.au/grants-and-funding/mental-health-ad-hoc-grants/recipients">NSW mental-health ad hoc grant recipients</a></p>
<p><a href="https://buy.nsw.gov.au/notices/C9D41C5A-B1A2-40A1-B60A1599C0C7E900">buy.nsw — Stride Dubbo sub-acute day-program contract</a></p>
</div>
</section>

<section class="section" id="law">
<p class="eyebrow">LawWorldz Guidance</p>
<h2>How another person can build a checkable evidence file.</h2>
<div class="ref-grid">
<div class="ref-card"><strong>1. Keep originals</strong><span>Save orders, letters, attachments, emails and complaint acknowledgements.</span></div>
<div class="ref-card"><strong>2. Ask in writing</strong><span>For decisions involving money, housing, access or essential needs, request a written explanation.</span></div>
<div class="ref-card"><strong>3. Build a dated timeline</strong><span>Record what was requested, when, who responded and what changed.</span></div>
<div class="ref-card"><strong>4. Separate evidence levels</strong><span>Do not present memory, allegation or opinion as though it were an official finding.</span></div>
<div class="ref-card"><strong>5. Request itemised records</strong><span>When money is managed for you, ask for dates, amounts, purposes and changes to the payment plan.</span></div>
<div class="ref-card"><strong>6. Use formal review pathways</strong><span>Complaints, internal review, tribunal/court processes, advocacy and legal advice each have different roles.</span></div>
<div class="ref-card"><strong>7. Follow the public money</strong><span>Use budgets, appropriations, annual reports, grant registers, procurement records and audits.</span></div>
<div class="ref-card"><strong>8. Protect the source file</strong><span>Publish a privacy-safe copy while preserving the original record for legitimate evidentiary use.</span></div>
</div>
</section>

<section class="section">
<p class="eyebrow">Publication standard</p>
<h2>Evidence before accusation.</h2>
<p class="evidence-note">This public reference does not publish residential addresses, dates of birth, Centrelink/customer reference numbers, bank details, login/security data or unrelated third-party private information. Historical messages that contain abusive or threatening language may remain part of the original evidence record, but they are not reproduced here as advocacy or endorsed conduct. The case record distinguishes official findings from Jason's allegations, criticism and recollections.</p>
</section>
</main>
<footer class="footer">WORLDZ REFERENCE #001 • IntegrityWorldz • ResearchWorldz • LawWorldz • Evidence before accusation</footer>
</body>
</html>'''

integrity_out = ROOT / "oneworldz.com" / "integrityworldz" / "index.html"
integrity_out.write_text(INTEGRITY_REFERENCE_001, encoding="utf-8")

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
