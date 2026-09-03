#!/usr/bin/env python3
from pathlib import Path
import html
import json

BUILD = "2026-09-03-145"
ROOT = Path(__file__).resolve().parents[1]
SITES = json.loads(r"""{"oneworldz.com": {"name": "OneWorldz", "accent": "#9a42ff", "accent2": "#27b8ff", "tagline": "OneWorldz 🌐 One Vision", "hero": "/hero.png", "routes": [["ecosystem", "Ecosystem", "One mission, many worlds, real pathways into action."], ["vision", "One Vision", "A people-first vision connecting practical help, learning, technology and community."], ["mission", "Mission", "Helping the People Who Help People through food, water, dignity, opportunity and action."], ["make-the-difference", "Make the Difference", "Simple ways to turn attention, time and resources into practical help."], ["global-impact", "Global Impact", "Connect local action to a wider movement without losing transparency or purpose."], ["kindness", "Kindness", "Kindness becomes powerful when it is practical, repeatable and shared."], ["hope", "Hope", "Build reasons to believe tomorrow can be better through visible action today."], ["action", "Action", "Move from good intentions to useful, measurable help."], ["dignity", "Dignity", "Support should protect choice, respect and human dignity."], ["opportunity", "Opportunity", "Education, tools and community support can open lasting opportunities."], ["community", "Community", "Strong communities are built by people showing up for one another."], ["food", "Food", "Direct attention to meals, food security and the people already feeding communities."], ["clean-water", "Clean Water", "Clean water infrastructure changes health, education and daily life."], ["shelter", "Shelter", "Safe shelter gives people room to recover, rebuild and plan."], ["education", "Education", "Learning creates options that can outlast a single donation."], ["medical-care", "Medical Care", "Health support removes barriers that can trap families in crisis."], ["children", "Children", "Protect childhood, education, nutrition, safety and a fair chance at the future."], ["volunteers", "Volunteers", "Make it easier for practical helpers to connect, coordinate and act."], ["destinations-of-hope", "Destinations of Hope", "Take support to the places and people where it can make a practical difference."], ["heroes", "Real-World Heroes", "Profiles for people whose public work is centred on helping people directly."], ["heroes/just-knate", "Just Knate", "A OneWorldz hero page using the approved poster label and focusing on practical help for people experiencing homelessness."], ["heroes/victor-good-boss", "Victor — The Good Boss", "A OneWorldz hero page using the approved poster label and focusing on second chances, recovery and practical support."], ["heroes/sam-weidenhofer", "Sam Weidenhofer", "A OneWorldz hero page using the approved poster label and focusing on public acts of kindness."], ["heroes/dylan-thiry", "Dylan Thiry", "A OneWorldz hero page using the approved poster label and focusing on building hope through education, water and opportunity."], ["heroes/bi-phakathi", "Bi Phakathi", "A OneWorldz hero page using the approved poster label and focusing on direct compassion and practical help."], ["heroes/mdmotivator", "MDMotivator", "A OneWorldz hero page recognising public kindness and community impact."], ["heroes/reagan-kauja", "Reagan Kauja", "Action Spreads Smiles — Uganda: food, water, education, shelter, medical needs and community support."], ["heroes/bob-roofer", "Bob — The Giving Roofer", "A OneWorldz hero page using the approved poster label and recognising practical community help."], ["heroes/solmotivator", "SolMotivator", "A OneWorldz hero page using the approved poster label: one act of kindness can change the world."]]}, "cryptoworldz.xyz": {"name": "CryptoWorldz", "accent": "#8b5cf6", "accent2": "#38bdf8", "tagline": "One World • One Mission • One CryptoWorldz", "hero": "/hero.png", "routes": [["ecosystem", "CryptoWorldz Ecosystem", "One universe connecting the Worldz, education, community and real-world impact."], ["command-centre", "Command Centre", "The public doorway to the existing Command Centre. The live Command Centre itself remains separate and untouched."], ["zed", "Zed", "Commander-facing information for the CryptoWorldz ecosystem."], ["auto", "A.U.T.O.", "A dedicated information page for the A.U.T.O. identity inside CryptoWorldz."], ["grace", "G.R.A.C.E.", "A dedicated information page for the G.R.A.C.E. identity inside CryptoWorldz."], ["recap", "RECAP", "Community recap and coordination concepts without pretending unfinished automation is already live."], ["raaiiidd", "Raaiiidd Team", "Community participation, missions and shared momentum across the Worldz."], ["wallet-safety", "Wallet Safety", "Plain-language wallet safety: verify links, protect seed phrases and understand approvals."], ["scam-awareness", "Scam Awareness", "Simple checks for suspicious links, impersonation, fake support and rushed transactions."], ["governance", "Governance", "People-first ideas for transparent community decisions and visible rules."], ["builders", "Builders", "A place for developers, designers, organisers and contributors to understand the ecosystem."], ["community", "Community", "Connect people around learning, participation and real-world impact."], ["learn", "Learn Crypto", "Start with plain language before making decisions involving wallets, tokens or chains."], ["impact", "Real-World Impact", "CryptoWorldz is connected to OneWorldz practical-help pathways rather than existing only on-chain."], ["launchpads", "LaunchPads", "Launch infrastructure must be transparent, independently branded and real before buttons claim functionality."], ["tokens", "Tokens", "Educational navigation for ecosystem token history and concepts; no invented performance promises."], ["roadmap", "Roadmap", "Build useful foundations first, verify them, then expand without unnecessary complexity."], ["links", "Official Links", "A central route back to the owned Worldz destinations and the protected Command Centre doorway."], ["worldz", "Explore the Worldz", "Move between SolWorldz, EthWorldz, BaseWorldz, BNBWorldz, XRPWorldz, SuiWorldz, HyperWorldz and RobinWorldz."]]}, "solworldz.xyz": {"name": "SolWorldz", "accent": "#7c3aed", "accent2": "#38bdf8", "tagline": "One World • One Mission • SolWorldz", "hero": "/hero.png", "routes": [["overview", "Overview", "Understand this Worldz identity, its role in the ecosystem and its connection back to CryptoWorldz. Built around Solana education and community."], ["learn", "Learn", "Plain-language education before tools, wallets or transactions. Built around Solana education and community."], ["community", "Community", "A place for people, builders and supporters to connect around this Worldz. Built around Solana education and community."], ["builders", "Builders", "Technical and creative contribution pathways without inventing unfinished functionality. Built around Solana education and community."], ["ecosystem", "Ecosystem", "See how this Worldz connects to the wider OneWorldz and CryptoWorldz network. Built around Solana education and community."]]}, "ethworldz.xyz": {"name": "EthWorldz", "accent": "#8b5cf6", "accent2": "#38bdf8", "tagline": "One World • One Mission • EthWorldz", "hero": "/hero.png", "routes": [["overview", "Overview", "Understand this Worldz identity, its role in the ecosystem and its connection back to CryptoWorldz. Built around Ethereum education and community."], ["learn", "Learn", "Plain-language education before tools, wallets or transactions. Built around Ethereum education and community."], ["community", "Community", "A place for people, builders and supporters to connect around this Worldz. Built around Ethereum education and community."], ["builders", "Builders", "Technical and creative contribution pathways without inventing unfinished functionality. Built around Ethereum education and community."], ["ecosystem", "Ecosystem", "See how this Worldz connects to the wider OneWorldz and CryptoWorldz network. Built around Ethereum education and community."]]}, "baseworldz.xyz": {"name": "BaseWorldz", "accent": "#2563eb", "accent2": "#38bdf8", "tagline": "One World • One Mission • BaseWorldz", "hero": "/hero.png", "routes": [["overview", "Overview", "Understand this Worldz identity, its role in the ecosystem and its connection back to CryptoWorldz. Built around Base education and community."], ["learn", "Learn", "Plain-language education before tools, wallets or transactions. Built around Base education and community."], ["community", "Community", "A place for people, builders and supporters to connect around this Worldz. Built around Base education and community."], ["builders", "Builders", "Technical and creative contribution pathways without inventing unfinished functionality. Built around Base education and community."], ["ecosystem", "Ecosystem", "See how this Worldz connects to the wider OneWorldz and CryptoWorldz network. Built around Base education and community."]]}, "bnbworldz.xyz": {"name": "BNBWorldz", "accent": "#f59e0b", "accent2": "#facc15", "tagline": "One World • One Mission • BNBWorldz", "hero": "/hero.png", "routes": [["overview", "Overview", "Understand this Worldz identity, its role in the ecosystem and its connection back to CryptoWorldz. Built around BNB Chain education and community."], ["learn", "Learn", "Plain-language education before tools, wallets or transactions. Built around BNB Chain education and community."], ["community", "Community", "A place for people, builders and supporters to connect around this Worldz. Built around BNB Chain education and community."], ["builders", "Builders", "Technical and creative contribution pathways without inventing unfinished functionality. Built around BNB Chain education and community."], ["ecosystem", "Ecosystem", "See how this Worldz connects to the wider OneWorldz and CryptoWorldz network. Built around BNB Chain education and community."]]}, "xrpworldz.xyz": {"name": "XRPWorldz", "accent": "#38bdf8", "accent2": "#7dd3fc", "tagline": "One World • One Mission • XRPWorldz", "hero": "/hero.png", "routes": [["overview", "Overview", "Understand this Worldz identity, its role in the ecosystem and its connection back to CryptoWorldz. Built around XRP Ledger education and community."], ["learn", "Learn", "Plain-language education before tools, wallets or transactions. Built around XRP Ledger education and community."], ["community", "Community", "A place for people, builders and supporters to connect around this Worldz. Built around XRP Ledger education and community."], ["builders", "Builders", "Technical and creative contribution pathways without inventing unfinished functionality. Built around XRP Ledger education and community."], ["ecosystem", "Ecosystem", "See how this Worldz connects to the wider OneWorldz and CryptoWorldz network. Built around XRP Ledger education and community."]]}, "suiworldz.xyz": {"name": "SuiWorldz", "accent": "#0ea5e9", "accent2": "#67e8f9", "tagline": "One World • One Mission • SuiWorldz", "hero": "/hero.png", "routes": [["overview", "Overview", "Understand this Worldz identity, its role in the ecosystem and its connection back to CryptoWorldz. Built around Sui education and community."], ["learn", "Learn", "Plain-language education before tools, wallets or transactions. Built around Sui education and community."], ["community", "Community", "A place for people, builders and supporters to connect around this Worldz. Built around Sui education and community."], ["builders", "Builders", "Technical and creative contribution pathways without inventing unfinished functionality. Built around Sui education and community."], ["ecosystem", "Ecosystem", "See how this Worldz connects to the wider OneWorldz and CryptoWorldz network. Built around Sui education and community."]]}, "hyperworldz.xyz": {"name": "HyperWorldz", "accent": "#10b981", "accent2": "#5eead4", "tagline": "One World • One Mission • HyperWorldz", "hero": "/hero.png", "routes": [["overview", "Overview", "Understand this Worldz identity, its role in the ecosystem and its connection back to CryptoWorldz. Built around Hyperliquid education and community."], ["learn", "Learn", "Plain-language education before tools, wallets or transactions. Built around Hyperliquid education and community."], ["community", "Community", "A place for people, builders and supporters to connect around this Worldz. Built around Hyperliquid education and community."], ["builders", "Builders", "Technical and creative contribution pathways without inventing unfinished functionality. Built around Hyperliquid education and community."], ["ecosystem", "Ecosystem", "See how this Worldz connects to the wider OneWorldz and CryptoWorldz network. Built around Hyperliquid education and community."]]}, "robinworldz.xyz": {"name": "RobinWorldz", "accent": "#84cc16", "accent2": "#a3e635", "tagline": "One World • One Mission • RobinWorldz", "hero": "/hero.png", "routes": [["overview", "Overview", "Understand this Worldz identity, its role in the ecosystem and its connection back to CryptoWorldz. Built around Robin Hood Chain education and community."], ["learn", "Learn", "Plain-language education before tools, wallets or transactions. Built around Robin Hood Chain education and community."], ["community", "Community", "A place for people, builders and supporters to connect around this Worldz. Built around Robin Hood Chain education and community."], ["builders", "Builders", "Technical and creative contribution pathways without inventing unfinished functionality. Built around Robin Hood Chain education and community."], ["ecosystem", "Ecosystem", "See how this Worldz connects to the wider OneWorldz and CryptoWorldz network. Built around Robin Hood Chain education and community."]]}, "hodlerworldz.xyz": {"name": "HodlerWorldz", "accent": "#8b5cf6", "accent2": "#38bdf8", "tagline": "Learn • Protect • Participate", "hero": "/hero.png", "routes": [["community", "HodlerWorldz Community", "Long-term community identity centred on learning, patience and safer participation."], ["holding-basics", "Holding Basics", "Understand volatility, custody and risk before deciding to hold any digital asset."], ["wallet-safety", "Wallet Safety", "Protect seed phrases, verify destinations and understand wallet permissions."], ["ecosystem", "Ecosystem", "Connect HodlerWorldz back to CryptoWorldz and the wider OneWorldz mission."]]}, "hodlergalaxy.xyz": {"name": "HodlerGalaxy", "accent": "#a855f7", "accent2": "#38bdf8", "tagline": "Explore the wider Worldz galaxy", "hero": "/hero.png", "routes": [["explore", "Explore the Galaxy", "Navigate Worldz identities, learning and community pathways."], ["community", "Community", "A broader space for people exploring the Worldz ecosystem together."], ["education", "Education", "Plain-language learning around crypto, safety and participation."], ["ecosystem", "Ecosystem", "Return to the verified Worldz network and OneWorldz mission."]]}, "purplediamondcrew.com": {"name": "Purple Diamond Crew", "accent": "#a53cff", "accent2": "#df7bff", "tagline": "Real People • Real Help • Real Impact", "hero": "/hero.png", "routes": [["hope-chest", "Hope Chest 1927", "The central Purple Diamond Crew visual concept and doorway to genuine legacy records."], ["legacy", "Legacy", "Preserve genuine PDC history without fabricating tokens, partnerships or performance."], ["action", "Take Action", "Real people, real help, real impact — practical community support."], ["food", "Food", "Meals and essentials are part of showing up where help is needed."], ["water", "Water", "Clean-water projects can change health, safety and opportunity."], ["shelter", "Shelter", "Support safer places to sleep, recover and rebuild."], ["education", "Education", "Learning and practical skills strengthen long-term community outcomes."]]}, "impactbased.oneworldz.com": {"name": "ImpactBased LaunchPad", "accent": "#73ff5d", "accent2": "#a947ff", "tagline": "Independent OneWorldz launch infrastructure", "hero": null, "routes": [["about", "About ImpactBased", "Independent OneWorldz launch infrastructure with no retired external launch-board dependency."], ["standards", "Launch Standards", "Clear purpose, truthful claims, visible rules and tested functionality before launch."], ["safety", "Safety", "No fake launch buttons, hidden dependencies or claims that unfinished systems are live."], ["impact", "Impact", "Purpose-led projects should explain how community benefit is intended and measured."], ["roadmap", "Roadmap", "Build the real launch engine, test it, then present execution as functional."]]}, "law.oneworldz.com": {"name": "Law.OneWorldz", "accent": "#79e452", "accent2": "#55b9ff", "tagline": "Rights • Fairness • Practical pathways", "hero": "/hero.png", "routes": [["rights", "Rights", "Plain-language public information about rights and pathways to reliable official help."], ["fairness", "Fairness", "Explore people-first ideas about fairness, accountability and equal treatment."], ["civic-learning", "Civic Learning", "Understand institutions, public processes and how to find authoritative information."], ["practical-pathways", "Practical Pathways", "Turn a concern into a practical next step: document, verify, ask in writing and use official channels."], ["resources", "Resources", "A structured doorway to reliable public information. This site is not a substitute for legal advice."]]}, "learn.oneworldz.com": {"name": "Learn.OneWorldz", "accent": "#55b9ff", "accent2": "#9a42ff", "tagline": "Plain-language learning", "hero": "/hero.png", "routes": [["crypto-basics", "Crypto Basics", "Understand networks, wallets, transactions and risk in plain language."], ["wallet-safety", "Wallet Safety", "Seed phrases stay private. Verify links and permissions before signing."], ["scam-awareness", "Scam Awareness", "Slow down, verify identities and distrust pressure, impersonation and guaranteed-return claims."], ["rights", "Rights & Civic Learning", "Learn how to locate authoritative public information and understand basic civic processes."], ["kindness", "Kindness & Community", "Practical learning for volunteering, community projects and people-first action."]]}, "foodworldz.com": {"name": "FoodWorldz", "accent": "#39d5ff", "accent2": "#7ee787", "tagline": "Food • Water • Practical Support", "hero": "/hero.png", "routes": [["meals", "Meals", "Support practical food pathways and people already feeding communities."], ["clean-water", "Clean Water", "Water access supports health, school attendance and daily dignity."], ["shelter", "Shelter", "Food security works best alongside safety and stable shelter."], ["education", "Education", "Nutrition and education reinforce each other in long-term community outcomes."], ["community", "Community", "Back local helpers and transparent pathways rather than inventing distant promises."]]}, "donateworldz.com": {"name": "DonateWorldz", "accent": "#8d45ff", "accent2": "#2aafff", "tagline": "Give Clearly • Support Directly", "hero": "/hero.png", "routes": [["reagan-children", "Reagan & Children", "Action Spreads Smiles — a distinct support pathway for children and community needs in Uganda."], ["community-impact", "Community Impact", "A separate pathway for community causes and people already helping people."], ["jayjay-support", "Support JayJayTeamDev", "A separate support pathway for the work required to build and coordinate OneWorldz."], ["transparency", "Transparency", "Keep support pathways distinct, clearly labelled and free from fake counters or invented outcomes."]]}}""")

ROOT_LINKS = [
    ("OneWorldz", "https://oneworldz.com/"),
    ("DonateWorldz", "https://donateworldz.com/"),
    ("FoodWorldz", "https://foodworldz.com/"),
    ("CryptoWorldz", "https://cryptoworldz.xyz/"),
    ("Purple Diamond Crew", "https://purplediamondcrew.com/"),
    ("ImpactBased LaunchPad", "https://impactbased.oneworldz.com/"),
    ("Learn", "https://learn.oneworldz.com/"),
    ("Law", "https://law.oneworldz.com/"),
]
WORLDZ = [
    ("SolWorldz", "https://solworldz.xyz/"),
    ("EthWorldz", "https://ethworldz.xyz/"),
    ("BaseWorldz", "https://baseworldz.xyz/"),
    ("BNBWorldz", "https://bnbworldz.xyz/"),
    ("XRPWorldz", "https://xrpworldz.xyz/"),
    ("SuiWorldz", "https://suiworldz.xyz/"),
    ("HyperWorldz", "https://hyperworldz.xyz/"),
    ("RobinWorldz", "https://robinworldz.xyz/"),
    ("HodlerWorldz", "https://hodlerworldz.xyz/"),
    ("HodlerGalaxy", "https://hodlergalaxy.xyz/"),
]
HEROES = [
    ("Just Knate", "https://oneworldz.com/heroes/just-knate/"),
    ("Victor — The Good Boss", "https://oneworldz.com/heroes/victor-good-boss/"),
    ("Sam Weidenhofer", "https://oneworldz.com/heroes/sam-weidenhofer/"),
    ("Dylan Thiry", "https://oneworldz.com/heroes/dylan-thiry/"),
    ("Bi Phakathi", "https://oneworldz.com/heroes/bi-phakathi/"),
    ("MDMotivator", "https://oneworldz.com/heroes/mdmotivator/"),
    ("Reagan Kauja", "https://oneworldz.com/heroes/reagan-kauja/"),
    ("Bob — The Giving Roofer", "https://oneworldz.com/heroes/bob-roofer/"),
    ("SolMotivator", "https://oneworldz.com/heroes/solmotivator/"),
]

def esc(value):
    return html.escape(str(value), quote=True)

def route_url(host, route=""):
    return f"https://{host}/{route.strip('/')}/" if route else f"https://{host}/"

def image_for(host, route):
    if host == "oneworldz.com" and route == "ecosystem":
        return "/ecosystem-art.png"
    if host == "oneworldz.com" and route == "heroes/reagan-kauja":
        return "/reagan.png"
    if host == "cryptoworldz.xyz":
        if route == "auto": return "/auto.png"
        if route == "grace": return "/grace.png"
        if route in ("community","raaiiidd"): return "/we-need-you.png"
        if route in ("ecosystem","worldz"): return "/command-centre-five.png"
        return "/hero.png"
    if host == "foodworldz.com" and route == "community":
        return "/reagan.png"
    if host == "donateworldz.com" and route == "reagan-children":
        return "/reagan.png"
    return SITES[host].get("hero")

def special_links(host, route):
    if host == "oneworldz.com" and route == "ecosystem":
        return ROOT_LINKS + WORLDZ
    if host == "oneworldz.com" and route == "heroes":
        return HEROES
    if host == "cryptoworldz.xyz" and route in ("ecosystem","worldz"):
        return WORLDZ
    if host == "cryptoworldz.xyz" and route == "command-centre":
        return [("Open Command Centre", "https://cryptobotz.cryptoworldz.xyz/")]
    if host == "donateworldz.com":
        if route == "reagan-children":
            return [("Donate securely", "https://donate.stripe.com/14A6oHcG61Ox87Y0Xb0kE01"), ("Back to DonateWorldz","https://donateworldz.com/")]
        if route == "community-impact":
            return [("Donate securely", "https://donate.stripe.com/9B67sLgWm78R73U35j0kE02"), ("Back to DonateWorldz","https://donateworldz.com/")]
        if route == "jayjay-support":
            return [("Stripe support", "https://buy.stripe.com/6oUeVd9tU0Ktewm0Xb0kE00"), ("PayPal", "https://www.paypal.me/Jayjay3480")]
    return []

def sibling_links(host, route):
    out = []
    for r, title, _ in SITES[host]["routes"]:
        if r != route:
            out.append((title, route_url(host, r)))
    return out[:8]

def page_html(host, route, title, summary):
    cfg = SITES[host]
    canonical = route_url(host, route)
    img = image_for(host, route)
    cards = special_links(host, route) or sibling_links(host, route)[:6]
    img_markup = f'<img class="route-art" src="{esc(img)}" alt="{esc(title)} artwork">' if img else ""
    cards_markup = "".join(
        f'<a class="route-card" href="{esc(url)}"{" target=_blank rel=noopener" if url.startswith("http") and host not in url else ""}><strong>{esc(label)}</strong><span>Open →</span></a>'
        for label, url in cards
    )
    note = ""
    if host.endswith("worldz.xyz") or host == "cryptoworldz.xyz":
        note = '<p class="notice">Educational ecosystem information only. Verify official chain documentation and understand risk before using wallets or transacting.</p>'
    if host == "law.oneworldz.com":
        note = '<p class="notice">General public information only — not legal advice. Use authoritative services for advice about your circumstances.</p>'
    if host == "impactbased.oneworldz.com":
        note = '<p class="notice">No launch execution is represented as live until a real launch engine is connected and tested.</p>'
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)} | {esc(cfg["name"])}</title>
<meta name="description" content="{esc(summary)}">
<link rel="canonical" href="{esc(canonical)}">
<meta property="og:title" content="{esc(title)} | {esc(cfg["name"])}">
<meta property="og:description" content="{esc(summary)}">
<meta property="og:url" content="{esc(canonical)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/style.css">
<style>
:root{{--accent:{esc(cfg["accent"])};--accent2:{esc(cfg["accent2"])};}}
.route-hero{{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.9fr);gap:0;align-items:stretch;border:1px solid color-mix(in srgb,var(--accent) 60%,transparent);border-radius:20px;overflow:hidden;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 18%,#05030a),#05030a);box-shadow:0 0 45px color-mix(in srgb,var(--accent) 16%,transparent)}}
.route-copy{{padding:clamp(22px,4vw,58px);display:flex;flex-direction:column;justify-content:center;min-height:420px}}
.route-copy h1{{margin:.15em 0;font-size:clamp(2.4rem,6vw,6rem);line-height:.92;letter-spacing:-.04em}}
.route-copy>p:not(.eyebrow){{max-width:760px;font-size:clamp(1rem,1.7vw,1.28rem);line-height:1.55;color:#d9d5e7}}
.route-art{{width:100%;height:100%;max-height:760px;object-fit:contain;background:#000}}
.route-grid{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}}
.route-card{{display:flex;flex-direction:column;min-height:112px;padding:15px;border:1px solid color-mix(in srgb,var(--accent) 55%,transparent);border-radius:15px;background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 13%,#0b0712),#08050d)}}
.route-card strong{{font-size:1rem}}
.route-card span{{margin-top:auto;padding-top:16px;color:var(--accent2);font-weight:900}}
.notice{{margin-top:14px;padding:12px 14px;border-left:4px solid var(--accent2);border-radius:10px;background:rgba(255,255,255,.04)}}
@media(max-width:900px){{.route-hero{{grid-template-columns:1fr}}.route-copy{{min-height:auto}}.route-grid{{grid-template-columns:1fr 1fr}}}}
@media(max-width:520px){{.route-grid{{grid-template-columns:1fr}}.route-copy{{padding:18px}}}}
</style>
</head>
<body data-oneworldz-build="{BUILD}" data-oneworldz-route="{esc(route)}">
<nav class="nav">
<a href="https://oneworldz.com/">OneWorldz</a>
<a class="brand" href="https://{esc(host)}/">{esc(cfg["name"])}</a>
<a href="https://{esc(host)}/sitemap.xml">Sitemap</a>
<a href="https://cryptoworldz.xyz/">CryptoWorldz</a>
<a href="https://donateworldz.com/">DonateWorldz</a>
</nav>
<main class="shell">
<section class="route-hero">
<div class="route-copy">
<p class="eyebrow">{esc(cfg["tagline"])}</p>
<h1>{esc(title)}</h1>
<p>{esc(summary)}</p>
<div class="actions"><a class="btn" href="https://{esc(host)}/">Back to {esc(cfg["name"])}</a><a class="btn secondary" href="https://oneworldz.com/ecosystem/">Explore Ecosystem</a></div>
</div>
{img_markup}
</section>
<section class="section">
<h2>Built to be useful</h2>
<div class="mission-band">
<div class="info-card"><strong>Clear</strong><span>No fake functionality or invented claims.</span></div>
<div class="info-card"><strong>Connected</strong><span>Every page links back into the wider ecosystem.</span></div>
<div class="info-card"><strong>Responsive</strong><span>Simple static HTML and CSS that works across screen sizes.</span></div>
<div class="info-card"><strong>People-first</strong><span>Real-world usefulness stays ahead of unnecessary complexity.</span></div>
</div>
{note}
</section>
<section class="section">
<p class="eyebrow">Continue</p>
<h2>Explore more</h2>
<div class="route-grid">{cards_markup}</div>
</section>
</main>
<footer class="footer">{esc(cfg["name"])} • One World • One Mission • One Fam</footer>
</body>
</html>
"""

def write_page(host, route, title, summary):
    out = ROOT / host / route / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page_html(host, route, title, summary), encoding="utf-8")

def write_sitemap(host):
    urls = [route_url(host)]
    urls.extend(route_url(host, r) for r, _, _ in SITES[host]["routes"])
    xml = ['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        xml.append(f"  <url><loc>{esc(u)}</loc></url>")
    xml.append("</urlset>")
    (ROOT/host/"sitemap.xml").write_text("\n".join(xml)+"\n", encoding="utf-8")
    (ROOT/host/"robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: https://{host}/sitemap.xml\n", encoding="utf-8")
    return urls

def main():
    urls = []
    for host, cfg in SITES.items():
        site_dir = ROOT / host
        if not (site_dir/"index.html").exists():
            raise SystemExit(f"Missing root page: {host}/index.html")
        if not (site_dir/"style.css").exists():
            raise SystemExit(f"Missing stylesheet: {host}/style.css")
        for route, title, summary in cfg["routes"]:
            write_page(host, route, title, summary)
        urls.extend(write_sitemap(host))
    if len(urls) != 145:
        raise SystemExit(f"Expected 145 pages, got {len(urls)}")
    (ROOT/".ecosystem-urls.txt").write_text("\n".join(urls)+"\n", encoding="utf-8")
    print(f"ECOSYSTEM_BUILD=PASS pages={len(urls)} sites={len(SITES)}")

if __name__ == "__main__":
    main()
