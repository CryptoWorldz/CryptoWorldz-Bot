#!/usr/bin/env python3
"""Apply source-labelled insight tooling after every other production builder."""
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]

def inject(path, marker, section):
    text=path.read_text(encoding="utf-8")
    text=re.sub(rf'<section\\b[^>]*{re.escape(marker)}="1"[^>]*>[\\s\\S]*?</section>',"",text,flags=re.I)
    assert "</main>" in text, path
    path.write_text(text.replace("</main>",section+"\n</main>",1),encoding="utf-8")

inject(ROOT/"oneworldz.com/index.html","data-verified-insight-standard",'''
<section class="section" data-verified-insight-standard="1">
<p class="eyebrow">Verified Insight Standard</p><h2>Separate evidence from claims.</h2>
<p>Across OneWorldz research, changing public issues should be dated and source-labelled. Separate enacted law, court decisions, agency action, measured outcomes, public or market reaction, and claims made by interested parties. Prefer primary sources, show what can still change, and never turn evidence into instructions on how someone should vote or think.</p>
</section>''')

inject(ROOT/"donateworldz.com/index.html","data-donation-transparency-standard",'''
<section class="section" data-donation-transparency-standard="1">
<p class="eyebrow">Transparency Standard</p><h2>Donations stay donations.</h2>
<p>DonateWorldz keeps humanitarian support separate from investment, token-price or market-return claims. Donation pages identify the purpose, destination and status of a support pathway clearly; changing financial or regulatory information belongs in a separate dated, source-labelled research surface.</p>
</section>''')

inject(ROOT/"cryptoworldz.xyz/index.html","data-crypto-verified-insight",'''
<section class="section" data-crypto-verified-insight="1">
<p class="eyebrow">Verified Insight Tooling • Updated 20 September 2026</p><h2>CLARITY + XRP Status Watch</h2>
<div class="split"><div><p><strong>Law, court, agency action, market reaction and company claims are different layers.</strong> The tracker keeps them separate, links primary sources and labels proposals as proposals.</p>
<div class="actions"><a class="btn" href="/clarity-watch.html">Open Verified Insight</a><a class="btn secondary" href="https://xrpworldz.xyz/">Open XRPWorldz</a></div></div>
<div class="info-card"><strong>STATUS</strong><span>Senate cloture not invoked 49–50 • motion to reconsider entered • SEC interpretation lists XRP as a digital commodity • Ripple appeals dismissed • agency rulemaking remains active.</span></div></div>
</section>''')

inject(ROOT/"xrpworldz.xyz/index.html","data-xrp-verified-insight",'''
<section class="section" data-xrp-verified-insight="1">
<p class="eyebrow">Verified Insight • Updated 20 September 2026</p><h2>XRP + U.S. Market-Structure Status</h2>
<p>Read the dated court record, SEC/CFTC interpretation, Senate procedural status and rulemaking watch together. No price target and no claim that one source settles every transaction context.</p>
<div class="actions"><a class="btn" href="https://cryptoworldz.xyz/clarity-watch.html">Open CLARITY + XRP Watch</a></div>
</section>''')

clarity=ROOT/"cryptoworldz.xyz/clarity-watch.html"
text=clarity.read_text(encoding="utf-8")
if '/mobile-safe.css' not in text:
    text=text.replace('<link rel="stylesheet" href="/style.css">','<link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/mobile-safe.css">',1)
if 'data-verified-insight-page="1"' not in text:
    text=text.replace("<body ", '<body data-verified-insight-page="1" ',1)
old='On 15 September 2026, cloture on the motion to proceed to H.R. 3633 was not invoked, 49–50. The procedural vote required 60 votes. This was not a final vote on passage.'
new='On 15 September 2026, cloture on the motion to proceed to H.R. 3633 was not invoked, 49–50. This was a procedural vote, not final passage. The official Senate floor record also says a motion to reconsider the vote was entered.'
text=text.replace(old,new)
text=text.replace('https://www.democrats.senate.gov/2026/09/15/wrap-up-for-tuesday-september-15-2026','https://www.senate.gov/legislative/LIS/floor_activity/09_15_2026_Senate_Floor.htm')
text=text.replace('U.S. Senate wrap-up • 15 Sep 2026 • 49–50 cloture result','U.S. Senate floor activity • 15 Sep 2026 • 49–50 + reconsideration motion')
if 'data-rulemaking-watch="1"' not in text:
    block='''<section class="section" data-rulemaking-watch="1"><p class="eyebrow">Rulemaking watch</p><h2>Agency work continues — but proposals are not final rules.</h2><p>On 18 August 2026 the SEC proposed “Regulation Crypto Assets,” a proposed securities-offering framework for certain investment contracts involving crypto assets. CryptoWorldz labels this as a proposal, not enacted law or a final rule.</p><div class="actions"><a class="btn secondary" target="_blank" rel="noopener" href="https://www.sec.gov/newsroom/press-releases/2026-76-sec-proposes-new-regulation-crypto-assets">SEC proposal • 18 Aug 2026</a></div></section>'''
    text=text.replace('<section class="section sources">',block+'<section class="section sources">',1)
clarity.write_text(text,encoding="utf-8")

one=(ROOT/"oneworldz.com/index.html").read_text(encoding="utf-8").lower()
assert 'data-verified-insight-standard="1"' in one
for forbidden in ("cryptoworldz","xrp"):
    assert forbidden not in one, ("oneworldz-separation",forbidden)
donate=(ROOT/"donateworldz.com/index.html").read_text(encoding="utf-8")
crypto=(ROOT/"cryptoworldz.xyz/index.html").read_text(encoding="utf-8")
xrp=(ROOT/"xrpworldz.xyz/index.html").read_text(encoding="utf-8")
page=clarity.read_text(encoding="utf-8")
assert 'data-donation-transparency-standard="1"' in donate
assert 'data-crypto-verified-insight="1"' in crypto and '/clarity-watch.html' in crypto
assert 'data-xrp-verified-insight="1"' in xrp and 'clarity-watch.html' in xrp
for required in ('data-verified-insight-page="1"','/mobile-safe.css','49–50','motion to reconsider','digital commodity','US$125,035,150','data-rulemaking-watch="1"','Regulation Crypto Assets'):
    assert required in page, required
print("VERIFIED_INSIGHTS=PASS crypto=1 xrp=1 oneworldz_method=1 donate_transparency=1 clarity_page=1")
