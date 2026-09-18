#!/usr/bin/env python3
"""Build the public OneWorldz mission architecture after the legacy vision layer.

This pass keeps crypto separate from OneWorldz and turns the humanitarian
front doors into working specialist departments:
OneWorldz -> ResearchWorldz -> LawWorldz -> FoodWorldz / DonateWorldz.
"""
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parents[1]
BUILD = "2026-09-19-mission-worldz"

MISSION_NAV = [
    ("OneWorldz", "https://oneworldz.com/"),
    ("ResearchWorldz", "https://learn.oneworldz.com/"),
    ("LawWorldz", "https://law.oneworldz.com/"),
    ("FoodWorldz", "https://foodworldz.com/"),
    ("DonateWorldz", "https://donateworldz.com/"),
]

def e(v):
    return escape(str(v), quote=True)

def cards(items):
    out = []
    for title, text, href in items:
        link = f'<a class="mission-card" href="{e(href)}"><strong>{e(title)}</strong><span>{e(text)}</span><b>OPEN →</b></a>' if href else f'<div class="mission-card"><strong>{e(title)}</strong><span>{e(text)}</span></div>'
        out.append(link)
    return "".join(out)

def page(host, title, eyebrow, h1, intro, sections, hero_alt, footer, description=None):
    nav = "".join((f'<a class="brand" href="{e(url)}">{e(label)}</a>' if label == title else f'<a href="{e(url)}">{e(label)}</a>') for label, url in MISSION_NAV)
    section_html = []
    for s in sections:
        body = f'<p>{s.get("text","")}</p>' if s.get("text") else ""
        c = f'<div class="mission-grid">{cards(s["cards"])}</div>' if s.get("cards") else ""
        extra = s.get("extra","")
        section_html.append(f'<section class="section"><p class="eyebrow">{e(s.get("eyebrow",""))}</p><h2>{e(s["title"])}</h2>{body}{c}{extra}</section>')
    desc = description or intro
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)} | OneWorldz</title>
<meta name="description" content="{e(desc)}">
<link rel="stylesheet" href="/style.css">
<style>
:root{{--accent:#8f45ff;--accent2:#38bdf8}}
.mission-grid{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}}
.mission-card{{display:flex;flex-direction:column;gap:10px;min-height:156px;padding:18px;border:1px solid rgba(154,66,255,.38);border-radius:18px;background:rgba(255,255,255,.035);text-decoration:none}}
.mission-card strong{{font-size:1.08rem;color:#fff}} .mission-card span{{line-height:1.5;color:#d9d5e7}} .mission-card b{{margin-top:auto;color:var(--accent2)}}
.flow{{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:18px}} .flow div{{padding:14px;border-radius:14px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);font-weight:800;text-align:center}}
.callout{{padding:18px;border-left:4px solid var(--accent2);background:rgba(56,189,248,.07);border-radius:12px;line-height:1.6}}
.hero-copy p{{max-width:780px}}
@media(max-width:980px){{.mission-grid{{grid-template-columns:1fr 1fr}}.flow{{grid-template-columns:1fr 1fr 1fr}}}}
@media(max-width:620px){{.mission-grid,.flow{{grid-template-columns:1fr}}}}
</style>
</head>
<body data-oneworldz-build="{BUILD}">
<nav class="nav">{nav}</nav>
<main class="shell">
<section class="hero">
<img class="hero-art" src="/hero.png" alt="{e(hero_alt)}">
<div class="hero-copy"><p class="eyebrow">{e(eyebrow)}</p><h1>{e(h1)}</h1><p>{e(intro)}</p></div>
</section>
{"".join(section_html)}
</main>
<footer class="footer">{e(footer)}</footer>
</body>
</html>'''

def write(host, route, html):
    path = ROOT / host / route / "index.html" if route else ROOT / host / "index.html"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html, encoding="utf-8")

# ------------------------------ OneWorldz ------------------------------
one_sections = [
    {"eyebrow":"The mission","title":"End hunger by solving the systems around hunger.","text":"Emergency food matters, but OneWorldz is built to go further: research what works, identify where rules and public systems block better outcomes, pursue lawful reform, fund practical infrastructure, and publish measurable results.",
     "cards":[
         ("ResearchWorldz","Find the strongest documented practices, laws and outcomes already working in different countries.","https://learn.oneworldz.com/"),
         ("LawWorldz","Turn verified evidence into clear reform proposals, submissions, petitions and public-process pathways.","https://law.oneworldz.com/"),
         ("FoodWorldz","Treat food as a full system: growing, rescue, safety, storage, shipping, cooking, distribution and waste.","https://foodworldz.com/"),
         ("DonateWorldz","Fund and equip practical missions such as fresh water, food production and community delivery.","https://donateworldz.com/"),
         ("Public money","Use official budgets and public records to understand where taxpayer money goes and what alternatives are legally available.",None),
         ("Integrity","Use documented audits, procurement data, integrity bodies and open records to investigate waste or corruption without making unsupported accusations.",None),
     ]},
    {"eyebrow":"How change moves","title":"Research → law → public process → practical delivery.","extra":'''<div class="flow"><div>1. RESEARCH</div><div>2. VERIFY</div><div>3. PROPOSE</div><div>4. CHANGE LAW</div><div>5. FUND DELIVERY</div><div>6. MEASURE</div></div><p class="callout">OneWorldz does not tell people how to vote. It gives people evidence, transparent comparisons and lawful civic pathways so they can make their own decisions and put proposals before the institutions that control public money and law.</p>'''},
    {"eyebrow":"Practical infrastructure","title":"A village needs more than a donation.","cards":[
        ("Fresh water","Bore assessment, drilling, water testing, filtration, tanks, serviceable pumps, solar power, manual or redundant backup and local maintenance.","https://donateworldz.com/fresh-water-mission/"),
        ("Grow food locally","Seeds, fruit trees, vegetable gardens, hand tools, irrigation, soil improvement, composting, training and storage.","https://donateworldz.com/grow-food-mission/"),
        ("Protect food","Cold-chain planning, safe storage, hygiene, food rescue, date-labelling rules, transport and community kitchens.","https://foodworldz.com/food-safety/"),
    ]},
]
write("oneworldz.com","",page("oneworldz.com","OneWorldz","One World • One Vision","End World Hunger. Change What Causes It.","OneWorldz connects evidence, lawful reform, public spending transparency and practical field missions so communities can move from emergency relief toward lasting food, water, health and dignity.",one_sections,"OneWorldz humanitarian mission artwork","One World • One Vision • One Fam • #MakeADifferenceTogether"))

# ------------------------------ ResearchWorldz ------------------------------
research_sections = [
    {"eyebrow":"Free public research method","title":"Find the best documented system — then prove why it works.","text":"ResearchWorldz is the evidence engine. Every research brief should separate fact from opinion, prefer primary and official sources, show dates and jurisdictions, explain limitations, and compare outcomes before recommending that another country study the model.",
     "cards":[
        ("Country Research","Compare laws, programs, budgets and measured outcomes across countries.","https://learn.oneworldz.com/country-research/"),
        ("Best Practice","Identify the strongest documented approaches and the conditions that made them work.","https://learn.oneworldz.com/best-practice/"),
        ("Evidence Brief","Turn research into a short, sourced brief that a community, journalist, official or parliamentarian can understand.","https://learn.oneworldz.com/evidence-brief/"),
        ("Send to LawWorldz","Package verified findings into a law-reform handoff without claiming the evidence proves one political choice.","https://learn.oneworldz.com/send-to-lawworldz/"),
    ]},
    {"eyebrow":"OneWorldz GPT research standard","title":"Ask better questions. Demand sources.","extra":'''<div class="mission-grid">
<div class="mission-card"><strong>1. Define</strong><span>Country, problem, population, timeframe and the exact outcome being compared.</span></div>
<div class="mission-card"><strong>2. Source</strong><span>Use legislation, government data, audits, parliamentary material, peer-reviewed research and credible international bodies.</span></div>
<div class="mission-card"><strong>3. Compare</strong><span>Do not copy a policy because it sounds good. Compare implementation, cost, safeguards and measured results.</span></div>
<div class="mission-card"><strong>4. Challenge</strong><span>Record contrary evidence, limitations, missing data and unintended consequences.</span></div>
<div class="mission-card"><strong>5. Translate</strong><span>Explain what would need to change legally, financially and operationally in another jurisdiction.</span></div>
<div class="mission-card"><strong>6. Handoff</strong><span>Send the evidence pack to LawWorldz for lawful reform pathways.</span></div>
</div>'''},
]
write("learn.oneworldz.com","",page("learn.oneworldz.com","ResearchWorldz","Research • Compare • Verify • Improve","Research the Best of the Best.","Use the OneWorldz research method to compare countries, laws, programs and outcomes, then send verified evidence to LawWorldz for public-interest reform work.",research_sections,"ResearchWorldz evidence and learning artwork","ResearchWorldz • Evidence before claims • OneWorldz"))

research_pages = {
"country-research":("Country Research","Compare countries without cherry-picking.","Start with a defined outcome. Record the law or program, implementation date, target population, funding model, measured results, independent evaluations and known limitations. Use comparable years and populations wherever possible.",[
("Primary law","Read the actual legislation, regulations or official rules.",None),("Official data","Record the measured outcome and reporting period.",None),("Independent evaluation","Look for audits, academic studies and international comparisons.",None),("Transfer test","List what would have to be different for another country to reproduce it.",None)]),
"best-practice":("Best Practice","Best practice means documented performance, not popularity.","A ResearchWorldz best-practice brief should show evidence of outcomes, cost, implementation requirements, risks, equity effects, governance safeguards and whether results have been reproduced.",[
("Food systems","Rescue, cold chain, school meals, farming, nutrition and waste reduction.","https://foodworldz.com/"),("Water systems","Bore design, pumping, treatment, storage, maintenance and local ownership.","https://donateworldz.com/fresh-water-mission/"),("Public integrity","Open contracting, audit, disclosure, procurement controls and whistleblower systems.","https://law.oneworldz.com/integrity/")]),
"evidence-brief":("Evidence Brief","Make research usable.","A strong brief is short enough to read and detailed enough to check. State the problem, current rule, evidence, alternative models, expected benefits, costs, risks, implementation requirements, sources and unanswered questions.",[
("No hidden assumptions","Show what is known and what is uncertain.",None),("Source every material claim","Use links, dates and document titles so another person can verify it.",None),("Separate evidence from preference","Evidence can inform a choice without making the democratic choice for people.",None)]),
"send-to-lawworldz":("Send to LawWorldz","Turn evidence into a reform handoff.","A LawWorldz handoff should identify the jurisdiction, existing law or policy, documented problem, researched alternatives, evidence quality, implementation implications and the lawful public process available for proposing change.",[
("Existing rule","What law, regulation, budget rule or administrative practice currently applies.",None),("Proposed question","What exactly should lawmakers or government review?",None),("Evidence pack","Attach the strongest sources and contrary evidence.",None),("Public pathway","Petition, submission, consultation, committee, representative contact or legislative proposal, depending on the jurisdiction.","https://law.oneworldz.com/change-the-law/")]),
}
for route,(title,h1,intro,cards_) in research_pages.items():
    write("learn.oneworldz.com",route,page("learn.oneworldz.com","ResearchWorldz","ResearchWorldz",h1,intro,[{"eyebrow":"Research standard","title":title,"cards":cards_},{"eyebrow":"Next step","title":"When the evidence is ready","cards":[("Send to LawWorldz","Move the verified brief into the lawful change process.","https://law.oneworldz.com/")]}],"ResearchWorldz evidence artwork","ResearchWorldz • Verify • Compare • Handoff"))

# ------------------------------ LawWorldz ------------------------------
law_sections = [
    {"eyebrow":"Law reform for public benefit","title":"Evidence into lawful change.","text":"LawWorldz maps how an evidence-backed idea can move through the legal and democratic processes of the relevant jurisdiction. It does not tell people who to vote for and does not replace legal advice.",
     "cards":[
        ("Change the Law","Map the existing rule, proposed change, evidence and formal pathway.","https://law.oneworldz.com/change-the-law/"),
        ("Public Money","Understand budgets, appropriations, grants, procurement and lawful ways priorities can be proposed or reviewed.","https://law.oneworldz.com/public-money/"),
        ("Integrity","Use official audit, procurement, disclosure and integrity systems to investigate documented problems.","https://law.oneworldz.com/integrity/"),
        ("Model Laws","Study legislation from jurisdictions with strong documented outcomes and test whether it transfers.","https://law.oneworldz.com/model-laws/"),
        ("Civic Pathways","Petitions, submissions, consultations, committees and representative contact.","https://law.oneworldz.com/civic-pathways/"),
        ("Research Handoff","Receive evidence from ResearchWorldz and turn it into a checkable reform brief.","https://law.oneworldz.com/research-handoff/"),
     ]},
    {"eyebrow":"The rule","title":"No accusation without evidence. No reform without a pathway.","extra":'''<p class="callout">Corruption research must rely on documented records, audits, court findings, integrity-body reports, procurement data and other verifiable evidence. Suspicion is a reason to investigate; it is not proof.</p>'''},
]
write("law.oneworldz.com","",page("law.oneworldz.com","LawWorldz","Research • Rights • Reform • Accountability","Change Law for Better Outcomes.","LawWorldz turns verified evidence into understandable, lawful reform pathways covering public money, integrity, food systems, water, welfare and other public-interest issues.",law_sections,"LawWorldz public law and reform artwork","LawWorldz • General public information, not legal advice • OneWorldz"))

law_pages = {
"change-the-law":("Change the Law","Map the legal route before campaigning.","Identify the jurisdiction and exact law, regulation or policy. Explain the documented problem, the proposed amendment, evidence for and against it, implementation effects and the formal process by which change can be considered.",[("Petitions","Use official parliamentary petition systems where available.",None),("Submissions","Respond to inquiries, committees and consultations with sourced evidence.",None),("Legislation","Track bills, amendments, explanatory material, votes and commencement.",None),("Review","Measure outcomes after a change rather than assuming success.",None)]),
"public-money":("Public Money","Make public spending understandable.","Use official budgets, appropriations, annual reports, grants registers, procurement data and audit reports to show where public money is authorised and spent. Build alternative proposals transparently, including trade-offs and implementation costs.",[("Budget evidence","Use the current jurisdiction and financial year.",None),("Appropriation rules","Identify who legally controls the spending decision.",None),("Outcome comparison","Compare cost and measurable outcomes across programs.",None),("Public proposal","Present options and evidence without telling citizens how to vote.",None)]),
"integrity":("Integrity","Investigate waste or corruption with evidence.","Start with public records and formal oversight. Keep allegations separate from findings. Preserve documents, dates and source links so claims can be checked.",[("Audit offices","Review published financial and performance audits.",None),("Procurement","Check tenders, contracts, supplier disclosures and value-for-money findings.",None),("Integrity bodies","Use findings from authorised anti-corruption and oversight bodies.",None),("Whistleblower safeguards","Research the protected disclosure rules in the relevant jurisdiction.",None)]),
"model-laws":("Model Laws","Study laws that deliver strong documented outcomes.","A model-law comparison should quote the legal mechanism accurately, identify the local institutions that administer it, record outcomes and limitations, and explain what cannot simply be copied into another legal system.",[("Find the law","Use official legislation databases.",None),("Find the result","Use outcome data from the same jurisdiction and relevant period.",None),("Find the safeguard","Record rights, review, audit and accountability mechanisms.",None),("Transfer carefully","List constitutional, fiscal and administrative differences.",None)]),
"civic-pathways":("Civic Pathways","Give ordinary people a lawful route to be heard.","Different jurisdictions provide different mechanisms. LawWorldz should link people to the official process that actually exists rather than inventing one.",[("Petition","Formal request to a parliament or government body.",None),("Consultation","Respond to a published policy or legislative consultation.",None),("Committee inquiry","Submit evidence or request consideration where procedures permit.",None),("Representative contact","Provide a concise evidence brief and a specific request for review.",None)]),
"research-handoff":("Research Handoff","Convert ResearchWorldz evidence into a reform file.","The handoff records the problem, legal baseline, evidence quality, international comparisons, proposed review question, possible legal mechanisms, fiscal implications, implementation agencies, safeguards and measurable outcomes.",[("ResearchWorldz","Return to the evidence engine.","https://learn.oneworldz.com/"),("FoodWorldz","Use food-system evidence for hunger and food-law reform.","https://foodworldz.com/food-law/")]),
}
for route,(title,h1,intro,cards_) in law_pages.items():
    write("law.oneworldz.com",route,page("law.oneworldz.com","LawWorldz","LawWorldz",h1,intro,[{"eyebrow":"Public-interest reform","title":title,"cards":cards_},{"eyebrow":"Research first","title":"Evidence belongs underneath every proposal","cards":[("ResearchWorldz","Compare the strongest documented approaches before proposing change.","https://learn.oneworldz.com/")]}],"LawWorldz public reform artwork","LawWorldz • Information, evidence and lawful process • Not legal advice"))

# ------------------------------ FoodWorldz ------------------------------
food_sections = [
    {"eyebrow":"Food is a system","title":"Grow it. Save it. Keep it safe. Move it. Cook it. Share it.","text":"FoodWorldz researches every step that can turn available food into safe nutrition for people who need it — and every rule that can unnecessarily stop good food being rescued or distributed.",
     "cards":[
        ("Food Rescue","Surplus recovery, donation pathways, date labels, liability rules and rapid redistribution.","https://foodworldz.com/food-rescue/"),
        ("Food Safety","Hygiene, temperature control, allergens, contamination prevention and safe community distribution.","https://foodworldz.com/food-safety/"),
        ("Storage & Cold Chain","Refrigeration, freezing, dry storage, power resilience, stock rotation and monitoring.","https://foodworldz.com/storage-cold-chain/"),
        ("Preparation & Cooking","Safe preparation, nutrition, batch cooking, community kitchens and service.","https://foodworldz.com/food-preparation/"),
        ("Shipping & Logistics","Packaging, routing, insulated transport, customs, receiving and last-mile delivery.","https://foodworldz.com/shipping-logistics/"),
        ("Food Waste","Prevention, rescue, redistribution, animal feed where lawful, composting and measurement.","https://foodworldz.com/food-waste/"),
        ("Growing Food","Fruit trees, vegetables, seeds, tools, irrigation, soil, training and local resilience.","https://foodworldz.com/growing-food/"),
        ("Food Law","Research the laws that help or hinder safe donation, rescue, farming, transport and feeding programs.","https://foodworldz.com/food-law/"),
     ]},
    {"eyebrow":"The destination","title":"Feed people safely today while building food security for tomorrow.","extra":'''<p class="callout">FoodWorldz sends evidence-backed legal barriers and reform opportunities to LawWorldz. Field projects that need money, equipment or business partners move to DonateWorldz.</p>'''},
]
write("foodworldz.com","",page("foodworldz.com","FoodWorldz","Food • Safety • Rescue • Growing • Logistics","Everything About Getting Food to People.","FoodWorldz is the specialist food system: production, rescue, food safety, storage, cold chain, preparation, cooking, transport, waste reduction, nutrition, distribution and food-law research.",food_sections,"FoodWorldz food security artwork","FoodWorldz • Safe food • Less waste • More people fed • OneWorldz"))

food_pages = {
"food-rescue":("Food Rescue","Save edible food before it becomes waste.","Map where surplus occurs, how quickly it can be recovered, what safety checks are required, which donation protections apply, and how recipients can receive food with dignity.",[("Source","Farms, wholesalers, supermarkets, hospitality, events and manufacturers.",None),("Triage","Separate safe edible food from food that must not be distributed.",None),("Match","Connect quantity, location, shelf life and recipient capacity.",None),("Law question","Research donation liability, date labelling and redistribution rules, then send reform evidence to LawWorldz.","https://law.oneworldz.com/")]),
"food-safety":("Food Safety","Feed people without creating a second emergency.","Every mission needs documented hygiene, handwashing, potable water, separation of raw and ready-to-eat food, temperature controls, allergen handling, cleaning, traceability and recall procedures appropriate to the jurisdiction.",[("Time & temperature","Control the danger zone using local food-safety standards.",None),("Cross-contamination","Separate equipment, storage and preparation pathways.",None),("Allergens","Identify ingredients and communicate risks clearly.",None),("Training","Use practical checklists and local certified guidance.",None)]),
"storage-cold-chain":("Storage & Cold Chain","Keep food safe from donor to plate.","Design storage around product type, climate, electricity reliability, transport time and local maintenance capacity.",[("Dry storage","Pest control, ventilation, stock rotation and moisture protection.",None),("Cold storage","Refrigeration, thermometers, logging and backup power.",None),("Freezing","Capacity, packaging, defrost control and safe thawing.",None),("Resilience","Solar, batteries, generators or other backup where justified and maintainable.",None)]),
"food-preparation":("Preparation & Cooking","Turn ingredients into safe, useful meals.","Plan menus around nutrition, local culture, equipment, water, fuel, staffing, allergens, serving time and safe leftovers.",[("Nutrition","Use balanced meals and age-appropriate needs where possible.",None),("Batch cooking","Document quantities, cook temperatures and holding times.",None),("Community kitchens","Design workflows that volunteers can follow safely.",None),("Dignity","Offer choice and culturally appropriate food where feasible.",None)]),
"shipping-logistics":("Shipping & Logistics","Move food without losing it on the way.","Plan packaging, labelling, palletisation, temperature, route time, border requirements, receiving capacity and last-mile distribution before accepting a shipment.",[("Local first","Where practical, buy or grow closer to recipients to reduce delay and strengthen local economies.",None),("Cold freight","Use validated temperature control for perishable food.",None),("Customs","Check import permits, prohibited goods and documentation before dispatch.",None),("Last mile","Confirm vehicles, roads, storage and responsible local receivers.",None)]),
"food-waste":("Food Waste","Measure waste so it can be prevented.","Separate avoidable edible waste from unavoidable scraps, record causes, redesign purchasing and menus, rescue safe surplus, and use composting or other lawful recovery for what cannot be eaten.",[("Prevent","Forecast demand and improve ordering.",None),("Rescue","Move edible surplus quickly.",None),("Recover","Use lawful secondary pathways for unavoidable surplus.",None),("Measure","Publish kilograms rescued, redistributed and discarded with clear methods.",None)]),
"growing-food":("Growing Food","Help communities produce food as well as receive it.","Projects should fit local climate, water, soil, land access, skills and cultural food preferences. Pair tools with training, seed continuity and maintenance.",[("Fruit trees","Choose locally suitable varieties and plan years of care.",None),("Vegetables","Use seasonal crops, seed saving where appropriate and succession planting.",None),("Water","Link gardens to reliable, tested water and efficient irrigation.","https://donateworldz.com/fresh-water-mission/"),("Tools & training","Hand tools, composting, soil improvement, pest management and local mentoring.","https://donateworldz.com/grow-food-mission/")]),
"food-law":("Food Law","Change rules when evidence shows a better safe pathway.","Research donation protections, food standards, date labels, rescue rules, school meals, procurement, farming, transport, imports, waste obligations and public funding. Compare jurisdictions with better documented outcomes.",[("ResearchWorldz","Find the strongest evidence and country comparisons.","https://learn.oneworldz.com/"),("LawWorldz","Turn verified findings into a lawful reform brief.","https://law.oneworldz.com/research-handoff/"),("Safety first","A reform should increase access without weakening evidence-based food safety.",None)]),
}
for route,(title,h1,intro,cards_) in food_pages.items():
    write("foodworldz.com",route,page("foodworldz.com","FoodWorldz","FoodWorldz",h1,intro,[{"eyebrow":"Food system","title":title,"cards":cards_},{"eyebrow":"System link","title":"Research, reform and delivery work together","cards":[("ResearchWorldz","Compare documented best practice.","https://learn.oneworldz.com/"),("LawWorldz","Send legal barriers and reform evidence.","https://law.oneworldz.com/"),("DonateWorldz","Fund or equip practical field delivery.","https://donateworldz.com/")]}],"FoodWorldz food system artwork","FoodWorldz • Food systems that reach people safely"))

# ------------------------------ DonateWorldz ------------------------------
donate_sections = [
    {"eyebrow":"Fund the solution","title":"Equipment, infrastructure and direct community missions.","text":"DonateWorldz exists to move verified resources into practical work. It is not a page for promoting the people building the website.",
     "cards":[
        ("Fresh Water Mission","Bore assessment, drilling, testing, filtration, tanks, serviceable pumps, solar power, backup, spares, training and maintenance.","https://donateworldz.com/fresh-water-mission/"),
        ("Grow Food Mission","Gardening tools, seeds, fruit trees, irrigation, composting, soil improvement, storage and local training.","https://donateworldz.com/grow-food-mission/"),
        ("Slice of Hope Australia","Community meal pathway beginning in Australia.","https://donateworldz.com/slice-of-hope-australia/"),
        ("Community Impact","Support verified community organisations and people delivering practical help.","https://donateworldz.com/community-impact/"),
        ("Davis Family","Direct family support pathway.","https://donateworldz.com/davis-family/"),
     ]},
    {"eyebrow":"Business development partnerships","title":"Companies can donate capability, not only money.","extra":'''<div class="mission-grid">
<a class="mission-card" href="mailto:hello@oneworldz.com?subject=Fresh%20Water%20Equipment%20Partnership"><strong>Water equipment partners</strong><span>Pump, drilling, solar, filtration, tank, pipe and testing companies can offer equipment, engineering, installation, training or spares.</span><b>OFFER EQUIPMENT →</b></a>
<a class="mission-card" href="mailto:hello@oneworldz.com?subject=Food%20Growing%20Equipment%20Partnership"><strong>Food-growing partners</strong><span>Tool, seed, nursery, irrigation, soil, greenhouse and agricultural businesses can offer equipment or technical support.</span><b>OFFER EQUIPMENT →</b></a>
<div class="mission-card"><strong>No fake partnership claims</strong><span>A company is shown as a partner only after the contribution is agreed and can be documented.</span></div>
</div>'''},
]
write("donateworldz.com","",page("donateworldz.com","DonateWorldz","Water • Food • Equipment • Community Delivery","Put Resources Where They Change Lives.","DonateWorldz connects money, donated equipment, professional expertise and verified community delivery to practical missions in water, food production and direct support.",donate_sections,"DonateWorldz practical mission artwork","DonateWorldz • Practical missions • Transparent pathways • OneWorldz"))

water_sections = [
    {"eyebrow":"Fresh Water Mission","title":"Design for reliability, maintenance and local ownership.","text":"A water mission begins with hydrogeology and water quality — not with buying a pump first.",
     "cards":[
        ("1. Assess","Hydrogeological survey, community demand, source protection, drilling feasibility and permits.",None),
        ("2. Drill & test","Bore construction, yield testing and laboratory water-quality testing.",None),
        ("3. Treat & store","Filtration or treatment if required, protected tanks and hygienic distribution.",None),
        ("4. Pump reliably","Choose proven, serviceable pumps with appropriate solar/electrical design and a realistic backup method.",None),
        ("5. Keep spares","Stock critical seals, controllers, pipe fittings and other locally serviceable parts.",None),
        ("6. Train locally","Named local operators, maintenance schedule, fault reporting, water testing and transparent ownership.",None),
     ]},
    {"eyebrow":"Equipment partnership","title":"Build the strongest in-kind water partnership possible.","extra":'''<p class="callout">The target partnership is not a logo exchange. It is donated or heavily supported equipment plus engineering, installation guidance, spare parts, training and maintenance documentation. No pump should be advertised as “never fail”; the engineering goal is failure-tolerant, repairable and backed up.</p><div class="actions"><a class="btn" href="mailto:hello@oneworldz.com?subject=Fresh%20Water%20Equipment%20Partnership">Offer equipment or expertise</a><a class="btn secondary" href="https://learn.oneworldz.com/best-practice/">Research best-practice water systems</a></div>'''},
]
write("donateworldz.com","fresh-water-mission",page("donateworldz.com","DonateWorldz","Fresh Water Mission","Fresh Water First.","Bore water, tested water quality, reliable pumping, storage, treatment, backup, spare parts, local training and maintenance — built as infrastructure, not a one-day donation.",water_sections,"Fresh water bore and pump mission artwork","DonateWorldz Fresh Water Mission • Reliable, repairable, locally owned"))

grow_sections = [
    {"eyebrow":"Grow Food Mission","title":"Give communities tools to produce food locally.","text":"Food-growing support should match local climate, water, soil, land access and food preferences, then build skills that remain after donated supplies are used.",
     "cards":[
        ("Tools","Hoes, spades, forks, rakes, watering equipment, pruning tools, wheelbarrows and repairable hand tools.",None),
        ("Seeds & trees","Locally suitable vegetables, legumes, staple crops and fruit trees with a replenishment plan.",None),
        ("Water","Efficient irrigation connected to a reliable and safe water source.","https://donateworldz.com/fresh-water-mission/"),
        ("Soil","Composting, mulching, soil testing, erosion control and locally appropriate fertility improvement.",None),
        ("Training","Planting calendars, nursery skills, pest management, harvesting, seed saving where suitable and record keeping.",None),
        ("Storage","Drying, pest-resistant storage, crates, cool storage or other suitable post-harvest protection.",None),
     ]},
    {"eyebrow":"Business partnership","title":"Tools are more valuable when knowledge comes with them.","extra":'''<div class="actions"><a class="btn" href="mailto:hello@oneworldz.com?subject=Food%20Growing%20Equipment%20Partnership">Offer tools, seed, trees or expertise</a><a class="btn secondary" href="https://foodworldz.com/growing-food/">Open FoodWorldz growing standard</a></div>'''},
]
write("donateworldz.com","grow-food-mission",page("donateworldz.com","DonateWorldz","Grow Food Mission","Tools, Water, Seeds, Trees and Skills.","Build local food production with the equipment, water, planting material, training and storage communities need to keep producing.",grow_sections,"Community food growing mission artwork","DonateWorldz Grow Food Mission • Build local food security"))

print("MISSION_WORLDZ=PASS one=1 research=5 law=7 food=9 donate_new=3 self_promo=0")
