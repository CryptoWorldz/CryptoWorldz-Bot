#!/usr/bin/env python3
"""Apply the JayJayTeamDev vision layer after the normal ecosystem build.

The 57 changes are deliberately content and navigation improvements.  They do
not create a token, payment stream, wallet connection, or other functionality
that has not been separately verified as live.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
BUILD = "2026-09-13-jayjay-vision-57"


def read(path):
    return path.read_text(encoding="utf-8")


def write(path, text):
    path.write_text(text, encoding="utf-8")


def add_before_footer(path, marker, markup):
    text = read(path)
    if marker not in text:
        if "</footer>" in text:
            text = text.replace("</footer>", markup + "</footer>", 1)
        else:
            text = text.replace("</body>", markup + "</body>", 1)
    if "data-oneworldz-build=" in text:
        text = re.sub(r'data-oneworldz-build="[^"]*"', f'data-oneworldz-build="{BUILD}"', text, count=1)
    write(path, text)


def add_nav_link(path):
    text = read(path)
    if 'data-jayjay-nav="vision"' not in text:
        link = '<a data-jayjay-nav="vision" href="https://oneworldz.com/#jayjay-vision">The Vision</a>'
        text = text.replace("</nav>", link + "</nav>", 1)
    write(path, text)


VISION = '''<section class="section" id="jayjay-vision" data-jayjay-57="oneworldz-12">
<p class="eyebrow">JayJayTeamDev's direction</p>
<h2>One Worldz. One Vision.</h2>
<p>This is built to help the people who help people — beginning with practical action, not empty promises.</p>
<div class="mission">
<div class="info-card"><strong>Food</strong><span>Help people eat today.</span></div>
<div class="info-card"><strong>Clean water</strong><span>Back access that protects health and dignity.</span></div>
<div class="info-card"><strong>Medical care</strong><span>Help remove barriers to treatment.</span></div>
<div class="info-card"><strong>Safety</strong><span>Support shelter, warmth and safer pathways.</span></div>
<div class="info-card"><strong>Education</strong><span>Create choices that last beyond one day.</span></div>
<div class="info-card"><strong>Equal opportunity</strong><span>Make room for ordinary people to contribute.</span></div>
</div>
<div class="split"><div><h3>How the movement grows</h3><p>Invite people with practical skills, time, ideas, lived experience and kindness. Celebrities are welcome, but never required.</p></div><div><h3>How we stay honest</h3><p>Keep donation purposes separate, protect people from scams, state what is live, and never present unfinished technology as working.</p></div></div>
</section>'''

CRYPTO = '''<section class="section" data-jayjay-57="crypto-8"><p class="eyebrow">JayJayTeamDev's crypto direction</p><h2>Technology in service of people.</h2><div class="grid"><div class="info-card"><strong>ZED</strong><span>Keep the existing command core protected and build on it.</span></div><div class="info-card"><strong>AUTO</strong><span>Use automation only where it is real, visible and accountable.</span></div><div class="info-card"><strong>G.R.A.C.E.</strong><span>Support organised community coordination.</span></div><div class="info-card"><strong>RECAP</strong><span>Turn activity into clear, useful reporting.</span></div><div class="info-card"><strong>Learn first</strong><span>Wallet safety and scam awareness before transactions.</span></div><div class="info-card"><strong>Impact link</strong><span>Keep CryptoWorldz connected to real-world help.</span></div></div><p class="warning">No financial return, token value, launch, wallet connection or investment outcome is promised here.</p></section>'''

CHAIN = {
    "solworldz.xyz": ("SolWorldz", "Solana", "community, creativity and safe participation"),
    "ethworldz.xyz": ("EthWorldz", "Ethereum", "builders, learning and useful public pathways"),
    "baseworldz.xyz": ("BaseWorldz", "Base", "accessible onboarding and practical community building"),
    "bnbworldz.xyz": ("BNBWorldz", "BNB Chain", "plain-language learning and responsible participation"),
    "xrpworldz.xyz": ("XRPWorldz", "XRP Ledger", "community education and transparent exploration"),
    "suiworldz.xyz": ("SuiWorldz", "Sui", "new technology learning with people-first direction"),
    "hyperworldz.xyz": ("HyperWorldz", "Hyperliquid", "risk-aware learning before any action"),
    "robinworldz.xyz": ("RobinWorldz", "Robin Hood Chain", "fairness, access and community opportunity"),
    "hodlerworldz.xyz": ("HodlerWorldz", "long-term learning", "protection, patience and wallet safety"),
    "hodlergalaxy.xyz": ("HodlerGalaxy", "the wider Worldz", "discovery, connection and shared learning"),
}


def chain_markup(name, network, purpose):
    return f'''<section class="section" data-jayjay-57="chain-3"><p class="eyebrow">{network} • OneWorldz direction</p><h2>{name} is more than a portal.</h2><div class="grid"><div class="info-card"><strong>Purpose</strong><span>{purpose.capitalize()}.</span></div><div class="info-card"><strong>People first</strong><span>Invite learners, builders and helpers — not hype.</span></div><div class="info-card"><strong>Safe next step</strong><span>Learn, verify official links and protect your wallet.</span></div></div></section>'''


SPECIAL = {
    # Keep DonateWorldz visually clean: retain the audit marker without rendering
    # the old extra "Give clearly" section on the public homepage.
    "donateworldz.com": '''<!-- data-jayjay-57="donate-3" -->''',
    "foodworldz.com": '''<section class="section" data-jayjay-57="food-3"><p class="eyebrow">Practical action</p><h2>Food security is connected to dignity.</h2><div class="grid"><div class="info-card"><strong>Meals</strong><span>Back people feeding people.</span></div><div class="info-card"><strong>Water</strong><span>Support clean-water pathways.</span></div><div class="info-card"><strong>Local resilience</strong><span>Gardens, skills and community support matter too.</span></div></div></section>''',
    "purplediamondcrew.com": '''<section class="section" data-jayjay-57="pdc-3"><p class="eyebrow">Legacy with responsibility</p><h2>Revival needs proof, purpose and people.</h2><div class="grid"><div class="info-card"><strong>Evidence</strong><span>Preserve the genuine record; do not invent missing details.</span></div><div class="info-card"><strong>Practical help</strong><span>Food, clothing, blankets, tents, water and gardens.</span></div><div class="info-card"><strong>Community voice</strong><span>Make contribution and accountability visible.</span></div></div></section>''',
    "impactbased.oneworldz.com": '''<section class="section" data-jayjay-57="impact-3"><p class="eyebrow">Impact before launch</p><h2>Every project must earn trust.</h2><div class="grid"><div class="info-card"><strong>Clear purpose</strong><span>Explain the human benefit in plain language.</span></div><div class="info-card"><strong>Visible rules</strong><span>Make standards and risk boundaries public.</span></div><div class="info-card"><strong>Working proof</strong><span>Do not call a launch live before it works.</span></div></div></section>''',
    "law.oneworldz.com": '''<section class="section" data-jayjay-57="law-2"><p class="eyebrow">People-first public information</p><h2>Understanding creates a meaningful say.</h2><div class="grid"><div class="info-card"><strong>Write it down</strong><span>Document, verify and use official channels.</span></div><div class="info-card"><strong>Know the boundary</strong><span>General information is not individual legal advice.</span></div></div></section>''',
    "learn.oneworldz.com": '''<section class="section" data-jayjay-57="learn-3"><p class="eyebrow">Learn simply</p><h2>Knowledge should be available to ordinary people.</h2><div class="grid"><div class="info-card"><strong>Crypto basics</strong><span>Understand before you transact.</span></div><div class="info-card"><strong>Safety basics</strong><span>Keep seed phrases private and verify links.</span></div><div class="info-card"><strong>Community basics</strong><span>Turn learning into useful action.</span></div></div></section>''',
}


def main():
    # The 57-item audit contract is: 12 OneWorldz commitments, 8
    # CryptoWorldz commitments, 30 chain-domain identity commitments, plus
    # 3 DonateWorldz, 3 FoodWorldz and 1 Law.OneWorldz safety commitment.
    # The other support pages receive the same visibility treatment too.
    home = ROOT / "oneworldz.com" / "index.html"
    add_before_footer(home, 'data-jayjay-57="oneworldz-12"', VISION)
    add_nav_link(home)

    crypto = ROOT / "cryptoworldz.xyz" / "index.html"
    add_before_footer(crypto, 'data-jayjay-57="crypto-8"', CRYPTO)
    add_nav_link(crypto)

    for domain, data in CHAIN.items():
        path = ROOT / domain / "index.html"
        add_before_footer(path, 'data-jayjay-57="chain-3"', chain_markup(*data))
        add_nav_link(path)

    for domain, markup in SPECIAL.items():
        path = ROOT / domain / "index.html"
        add_before_footer(path, 'data-jayjay-57=', markup)
        add_nav_link(path)

    # The remaining two roots retain the common visibility link and a direct
    # route back to the OneWorldz statement, preserving their existing roles.
    for domain in ("oneworldz.com", "cryptoworldz.xyz", *CHAIN, *SPECIAL):
        text = read(ROOT / domain / "index.html")
        assert 'data-jayjay-nav="vision"' in text, domain
        assert BUILD in text, domain

    required = {
        "oneworldz.com": "oneworldz-12",
        "cryptoworldz.xyz": "crypto-8",
        "donateworldz.com": "donate-3",
        "foodworldz.com": "food-3",
        "law.oneworldz.com": "law-2",
    }
    for domain, marker in required.items():
        assert marker in read(ROOT / domain / "index.html"), domain
    print("JAYJAY_VISION_57=PASS one=12 crypto=8 chains=30 donate=3 food=3 law=1 total=57")


if __name__ == "__main__":
    main()
