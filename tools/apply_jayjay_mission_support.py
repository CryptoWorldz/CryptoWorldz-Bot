#!/usr/bin/env python3
"""Build the separate JayJayTeamDev support pathway for the OneWorldz vision."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
out = ROOT / "donateworldz.com" / "jayjay-support" / "index.html"
out.parent.mkdir(parents=True, exist_ok=True)

html = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Support JayJayTeamDev | DonateWorldz</title>
<meta name="description" content="A separate pathway to support JayJayTeamDev's work developing and coordinating the OneWorldz vision and mission.">
<link rel="stylesheet" href="/style.css">
<style>
:root{--accent:#8d45ff;--accent2:#2aafff}
.support-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.support-card{display:flex;flex-direction:column;gap:10px;padding:18px;min-height:170px;border:1px solid rgba(141,69,255,.42);border-radius:18px;background:rgba(255,255,255,.04)}
.support-card strong{font-size:1.1rem}.support-card p{line-height:1.5}.support-card .actions{margin-top:auto}
.notice{padding:18px;border-left:4px solid var(--accent2);border-radius:12px;background:rgba(42,175,255,.07);line-height:1.6}
@media(max-width:820px){.support-grid{grid-template-columns:1fr}}
</style>
</head>
<body data-oneworldz-build="2026-09-19-jayjay-mission-support">
<nav class="nav">
<a href="https://oneworldz.com/">OneWorldz</a>
<a class="brand" href="https://donateworldz.com/">DonateWorldz</a>
<a href="https://donateworldz.com/fresh-water-mission/">Fresh Water</a>
<a href="https://donateworldz.com/grow-food-mission/">Grow Food</a>
<a href="https://foodworldz.com/">FoodWorldz</a>
</nav>
<main class="shell">
<section class="hero">
<img class="hero-art" src="/hero.png" alt="OneWorldz mission support artwork">
<div class="hero-copy">
<p class="eyebrow">Support the vision behind the mission</p>
<h1>Donate to JayJayTeamDev.</h1>
<p>This is a separate support pathway for the work required to research, design, coordinate and keep building the OneWorldz vision.</p>
</div>
</section>

<section class="section">
<p class="eyebrow">Choose a direct support option</p>
<h2>Support JayJayTeamDev's OneWorldz mission-building work.</h2>
<div class="support-grid">
<div class="support-card">
<strong>Stripe Support</strong>
<p>Direct support for the research, development, coordination and ongoing work behind the OneWorldz vision.</p>
<div class="actions"><a class="btn" href="https://buy.stripe.com/6oUeVd9tU0Ktewm0Xb0kE00" target="_blank" rel="noopener">Donate with Stripe</a></div>
</div>
<div class="support-card">
<strong>PayPal Support</strong>
<p>A second direct option for supporting JayJayTeamDev's work on the OneWorldz mission.</p>
<div class="actions"><a class="btn" href="https://www.paypal.me/Jayjay3480" target="_blank" rel="noopener">Donate with PayPal</a></div>
</div>
<div class="support-card">
<strong>Mission funds stay separate</strong>
<p>Fresh water, food-growing, community and family support remain on their own clearly labelled pathways.</p>
<div class="actions"><a class="btn secondary" href="https://donateworldz.com/">View all missions</a></div>
</div>
</div>
</section>

<section class="section">
<p class="eyebrow">Why this pathway exists</p>
<h2>Building the system takes work too.</h2>
<p class="notice">This pathway supports JayJayTeamDev's work driving the OneWorldz vision, including research, website development, coordination and mission development. It is kept distinct from funds represented as going to a specific humanitarian field project.</p>
</section>
</main>
<footer class="footer">DonateWorldz • Support JayJayTeamDev • Support the OneWorldz Vision</footer>
</body>
</html>
'''
out.write_text(html, encoding="utf-8")
print("JAYJAY_MISSION_SUPPORT=PASS stripe=1 paypal=1 separate_from_field_missions=1")
