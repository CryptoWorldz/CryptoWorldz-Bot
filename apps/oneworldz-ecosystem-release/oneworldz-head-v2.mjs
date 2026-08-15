const links = Object.freeze({
  crypto: "https://cryptoworldz.xyz",
  learn: "https://learn.oneworldz.com",
  law: "https://law.oneworldz.com",
  impact: "https://impactbased.oneworldz.com",
  food: "https://foodworldz.com",
  donate: "https://donateworldz.com",
  command: "https://cryptobotz.cryptoworldz.xyz"
});

const esc = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const external = (href) => /^https?:\/\//.test(href) ? ' target="_blank" rel="noopener noreferrer"' : "";
const button = (label, href, variant = "primary") => `<a class="button ${variant}" href="${href}"${external(href)}>${esc(label)}</a>`;
const picture = (desktop, mobile, alt, className = "") => `<picture class="production-picture ${className}"><source media="(max-width:720px)" srcset="/assets/${mobile}"><img src="/assets/${desktop}" alt="${esc(alt)}" loading="lazy" decoding="async"></picture>`;

const header = () => `<header class="site-header head-v2-header">
  <a class="site-brand" href="/" aria-label="OneWorldz home"><span class="brand-profile text-brand" aria-hidden="true"><b>1</b></span><span><strong>OneWorldz</strong><small>One Vision.</small></span></a>
  <button class="menu-button" type="button" aria-expanded="false" aria-controls="site-menu"><span></span><span></span><span></span><b>Menu</b></button>
  <nav class="site-menu" id="site-menu" aria-label="Primary navigation">
    <a href="#worldz">Worldz</a><a href="${links.learn}">Learn</a><a href="${links.law}">Law</a><a href="${links.impact}">Impact</a><a href="#stand-as-one">2030</a>
  </nav>
</header><button class="menu-backdrop" type="button" aria-label="Close menu" tabindex="-1"></button>`;

const footer = () => `<footer class="site-footer head-v2-footer"><div><strong>OneWorldz</strong><span>One World • One Mission</span></div><nav aria-label="Footer"><a href="${links.crypto}">CryptoWorldz</a><a href="${links.learn}">Learn</a><a href="${links.law}">Law</a><a href="${links.impact}">ImpactBased</a><a href="${links.donate}">DonateWorldz</a></nav><p>Designed by JayJayTeamDev™ • Helping the People Who Help People.</p></footer>`;

export const requiredOneWorldzV2Media = Object.freeze([
  "desktop/oneworldz-v2/global-humanity-hero.webp",
  "mobile/oneworldz-v2/global-humanity-hero.webp",
  "desktop/oneworldz-v2/people-before-systems.webp",
  "mobile/oneworldz-v2/people-before-systems.webp",
  "desktop/oneworldz-v2/learn-hero.webp",
  "mobile/oneworldz-v2/learn-hero.webp",
  "desktop/oneworldz-v2/law-hero.webp",
  "mobile/oneworldz-v2/law-hero.webp",
  "desktop/oneworldz-v2/impactbased-hero.webp",
  "mobile/oneworldz-v2/impactbased-hero.webp",
  "desktop/oneworldz-v2/stand-as-one-2030.webp",
  "mobile/oneworldz-v2/stand-as-one-2030.webp"
]);

export function oneWorldzHeadV2Page() {
  const divisions = [
    { cls: "learn", eyebrow: "LEARN.ONEWORLDZ.COM", title: "Knowledge Creates Power.", copy: "Practical learning for digital life, blockchain safety, AI literacy, money awareness and confident participation.", href: links.learn, cta: "Enter Learn" , desktop: "desktop/oneworldz-v2/learn-hero.webp", mobile: "mobile/oneworldz-v2/learn-hero.webp", alt: "Learn.OneWorldz future learning environment" },
    { cls: "law", eyebrow: "LAW.ONEWORLDZ.COM", title: "Understand the pathway.", copy: "Plain-language public information, rights awareness and practical navigation—with clear boundaries around professional legal advice.", href: links.law, cta: "Enter Law", desktop: "desktop/oneworldz-v2/law-hero.webp", mobile: "mobile/oneworldz-v2/law-hero.webp", alt: "Law.OneWorldz public information and fairness pathway" },
    { cls: "impact", eyebrow: "IMPACTBASED.ONEWORLDZ.COM", title: "Ideas with purpose. Projects with proof.", copy: "Discover humanitarian and community projects, understand their purpose and follow transparent routes to participation.", href: links.impact, cta: "Enter ImpactBased", desktop: "desktop/oneworldz-v2/impactbased-hero.webp", mobile: "mobile/oneworldz-v2/impactbased-hero.webp", alt: "ImpactBased people creating real world change" }
  ];

  const divisionMarkup = divisions.map((item) => `<article class="head-division ${item.cls}">${picture(item.desktop, item.mobile, item.alt, "head-division-art")}<div class="head-division-copy"><p class="eyebrow">${item.eyebrow}</p><h3>${item.title}</h3><p>${item.copy}</p>${button(item.cta, item.href)}</div></article>`).join("");

  const worldCards = [
    ["Crypto & Command", "CryptoWorldz", "Crypto education, community and the protected Command Centre.", links.crypto],
    ["Humanitarian", "FoodWorldz", "See needs, projects and impact before choosing how to help.", links.food],
    ["Support", "DonateWorldz", "Clearly separated support pathways and payment destinations.", links.donate],
    ["Learning", "Learn.OneWorldz", "Knowledge, safety and practical skills.", links.learn],
    ["Public Information", "Law.OneWorldz", "Understand systems, pathways and questions to ask.", links.law],
    ["Projects", "ImpactBased", "Purpose-driven project discovery and transparent participation.", links.impact]
  ].map(([eyebrow, title, copy, href]) => `<a class="head-world-card" href="${href}"${external(href)}><small>${eyebrow}</small><strong>${title}</strong><span>${copy}</span><b aria-hidden="true">→</b></a>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#070510">
  <title>OneWorldz | One Vision.</title>
  <meta name="description" content="OneWorldz is the global gateway for people-first impact, learning, public information, community projects and the connected Worldz ecosystem.">
  <link rel="canonical" href="https://oneworldz.com/">
  <link rel="stylesheet" href="/assets/css/site.css">
  <link rel="stylesheet" href="/assets/css/head-v2.css">
</head>
<body class="oneworldz-head-v2">
<a class="skip-link" href="#main-content">Skip to content</a>
${header()}
<main id="main-content">
  <section class="head-v2-hero">${picture("desktop/oneworldz-v2/global-humanity-hero.webp", "mobile/oneworldz-v2/global-humanity-hero.webp", "A global OneWorldz community looking toward a shared future", "head-v2-hero-art")}<div class="head-v2-hero-shade"></div><div class="head-v2-hero-copy"><p class="eyebrow">ONE WORLD • ONE MISSION</p><h1>OneWorldz <span>One Vision.</span></h1><p class="lead">A connected world of people, knowledge, practical action and technology—built around helping people help people.</p><div class="button-row">${button("Explore the Worldz", "#worldz")}${button("Help People", links.donate, "secondary")}${button("Learn", links.learn, "secondary")}</div></div></section>

  <section class="section head-mission">${picture("desktop/oneworldz-v2/people-before-systems.webp", "mobile/oneworldz-v2/people-before-systems.webp", "People helping people through food learning infrastructure and community", "head-mission-art")}<div class="head-mission-copy"><p class="eyebrow">PEOPLE BEFORE SYSTEMS</p><h2>Build around what people actually need.</h2><p>Food and dignity. Knowledge and opportunity. Fair pathways. Community projects. Responsible technology. OneWorldz connects specialised destinations without pretending one website can do everything.</p><div class="head-principles"><span>Food & dignity</span><span>Knowledge & opportunity</span><span>Fair pathways</span><span>Community action</span><span>Responsible technology</span></div></div></section>

  <section class="section section-dark head-divisions"><div class="section-heading"><p class="eyebrow">THREE FLAGSHIP DIVISIONS</p><h2>One identity. Three completely different jobs.</h2><p>Learn, Law and ImpactBased remain specialised destinations while sharing the OneWorldz standard of clarity, humanity and trust.</p></div>${divisionMarkup}</section>

  <section class="section" id="worldz"><div class="section-heading"><p class="eyebrow">EXPLORE THE WORLDZ</p><h2>Go directly to what you came here for.</h2><p>Every destination has a purpose. OneWorldz is the map—not a duplicate of every place it connects.</p></div><div class="head-world-grid">${worldCards}</div></section>

  <section class="section section-dark head-action"><div><p class="eyebrow">SEE • UNDERSTAND • ACT</p><h2>Help should be clear.</h2><p>FoodWorldz explains the need and the project. DonateWorldz provides clearly labelled support routes. Payments and records stay separate by purpose.</p><div class="button-row">${button("See the Need", links.food)}${button("Choose a Purpose", links.donate, "secondary")}</div></div></section>

  <section class="head-stand" id="stand-as-one">${picture("desktop/oneworldz-v2/stand-as-one-2030.webp", "mobile/oneworldz-v2/stand-as-one-2030.webp", "OneWorldz Stand As One worldwide humanitarian music and community event concept", "head-stand-art")}<div class="head-stand-copy"><p class="eyebrow">2026 → 2030</p><h2>Stand As One.</h2><p>A developing worldwide humanitarian event concept bringing music, community, food, knowledge, infrastructure and practical action together. Participation, artists, sponsors and venues are only presented as confirmed when they genuinely are.</p><div class="button-row">${button("Explore the Mission", "#worldz")}${button("Command Centre", links.command, "secondary")}</div></div></section>

  <section class="section head-boundary"><p><strong>OneWorldz is a public gateway.</strong> It does not provide personalised legal advice, store payment credentials, expose owner-only Command Centre controls or make guaranteed financial or humanitarian outcome claims.</p></section>
</main>
${footer()}
<script src="/assets/js/site.js" defer></script>
</body>
</html>`;
}
