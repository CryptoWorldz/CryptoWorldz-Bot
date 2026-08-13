import {
  divisions,
  humanLeaders,
  lessons,
  links,
  pdcTokens,
  supportProfiles,
  systemRoles,
  worldz
} from "./site-data.mjs";

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const external = (href) => /^https?:\/\//.test(href)
  ? ' target="_blank" rel="noopener noreferrer"'
  : "";

const button = (label, href, variant = "primary") =>
  `<a class="button ${variant}" href="${href}"${external(href)}>${escapeHtml(label)}</a>`;

const picture = ({ desktop, mobile, alt, className = "" }) => `
  <picture class="production-picture ${className}">
    <source media="(max-width: 720px)" srcset="/assets/mobile/${mobile}">
    <img src="/assets/desktop/${desktop}" alt="${escapeHtml(alt)}" loading="eager" decoding="async">
  </picture>`;

const supportPicture = ({ base, alt, className = "" }) => `<picture class="${className}">
  <source media="(max-width: 720px)" srcset="/assets/support/mobile/${base}-mobile.webp">
  <img src="/assets/support/desktop/${base}-desktop.webp" alt="${escapeHtml(alt)}" loading="eager" decoding="async">
</picture>`;

const chainPicture = (world, alt = `${world.name} approved production artwork`, className = "") => world.image
  ? picture({ desktop: `blockchains/${world.image}.png`, mobile: `${world.image}.webp`, alt, className })
  : `<div class="production-picture text-art ${className}" role="img" aria-label="${escapeHtml(alt)}"><span>H</span><strong>HodlerWorldz</strong><small>Education • Recognition • Rewards</small></div>`;

const brandAssets = {
  crypto: ["cryptoworldz/zed-command-centre.png", "blockchain-portal.webp"],
  pdc: ["purple-diamond-crew/banner.png", "hope-chest.webp"],
  impactbased: ["cryptoworldz/impactbased.png", "impactbased-square.webp"],
  law: ["tokens/robin-hood-law.png", "robin-hood-law.webp"],
  learn: ["oneworldz/oneworldz-gpt.png", "little-legend.webp"],
  "oneworldz-master": ["oneworldz/oneworldz-master.png", "little-legend.webp"],
  "oneworldz-gpt": ["oneworldz/oneworldz-gpt.png", "five-leaders-alliance.webp"],
  "little-legend": ["oneworldz/little-legend.png", "little-legend.webp"],
  "we-need-you": ["cryptoworldz/we-need-you.png", "five-leaders-alliance.webp"],
  "action-team": ["purple-diamond-crew/action-team.png", "hope-chest.webp"],
  "five-leaders-alliance": ["cryptoworldz/command-centre-five.png", "five-leaders-alliance.webp"],
  "robin-hood-law": ["tokens/robin-hood-law.png", "robin-hood-law.webp"]
};

const brandPicture = (image) => {
  if (!image) return `<span class="brand-profile text-brand" aria-hidden="true"><b>H</b></span>`;
  const [desktop, mobile] = brandAssets[image] || [`blockchains/${image}.png`, `${image}.webp`];
  return `<picture class="brand-profile">
    <source media="(max-width: 720px)" srcset="/assets/mobile/${mobile}">
    <img src="/assets/desktop/${desktop}" alt="" aria-hidden="true">
  </picture>`;
};

const header = ({ name, home = "/", image = "crypto", nav = [] }) => {
  const brand = brandPicture(image);
  const linksMarkup = nav.map(([label, href]) => `<a href="${href}">${escapeHtml(label)}</a>`).join("");
  return `<header class="site-header">
    <a class="site-brand" href="${home}" aria-label="${escapeHtml(name)} Back to Home">
      ${brand}
      <span><strong>${escapeHtml(name)}</strong><small>Back to Home</small></span>
    </a>
    <button class="menu-button" type="button" aria-expanded="false" aria-controls="site-menu"><span></span><span></span><span></span><b>Menu</b></button>
    <nav class="site-menu" id="site-menu" aria-label="Primary navigation">
      ${linksMarkup}
      <a href="${links.oneworldz}"${external(links.oneworldz)}>OneWorldz</a>
    </nav>
  </header>
  <button class="menu-backdrop" type="button" aria-label="Close menu" tabindex="-1"></button>`;
};

const document = ({ title, description, body, accent = "#b763ff", accent2 = "#79bfff", canonical }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#070510">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  ${canonical ? `<link rel="canonical" href="${canonical}">` : ""}
  <link rel="stylesheet" href="/assets/css/site.css">
</head>
<body style="--accent:${accent};--accent-2:${accent2}">
  <a class="skip-link" href="#main-content">Skip to content</a>
  ${body}
  <script src="/assets/js/site.js" defer></script>
</body>
</html>`;

const sectionHeading = (eyebrow, title, copy = "") => `<div class="section-heading">
  <p class="eyebrow">${escapeHtml(eyebrow)}</p>
  <h2>${escapeHtml(title)}</h2>
  ${copy ? `<p>${escapeHtml(copy)}</p>` : ""}
</div>`;

const worldCards = ({ current = "" } = {}) => `<div class="profile-grid world-profile-grid">
  ${worldz.map((world) => `<a class="profile-card${current === world.key ? " current" : ""}" href="https://${world.domain}"${external(`https://${world.domain}`)}>
    ${current === world.key ? `<div class="production-picture text-art profile-art" role="img" aria-label="${escapeHtml(world.name)} current World identity"><span>${escapeHtml(world.name.charAt(0))}</span><strong>${escapeHtml(world.name)}</strong></div>` : chainPicture(world, world.image ? `${world.name} official approved profile artwork` : `${world.name} education recognition and rewards identity`, "profile-art")}
    <span class="profile-copy"><small>${escapeHtml(world.chain)}</small><strong>${escapeHtml(world.name)}</strong><em>${current === world.key ? "Current World" : "Open World"} <b aria-hidden="true">→</b></em></span>
  </a>`).join("")}
</div>`;

const supportCards = (base = "https://cryptoworldz.xyz") => `<div class="profile-grid support-card-grid">
  <a class="profile-card" href="${base}/support/reagan-children/">
    ${supportPicture({ base: "reagan-children-emblem", alt: "Reagan and Children support emblem", className: "support-profile" })}
    <span class="profile-copy"><small>Action Spread Smiles</small><strong>Reagan &amp; Children</strong><em>Dedicated support page <b aria-hidden="true">→</b></em></span>
  </a>
  <a class="profile-card" href="${base}/support/community-impact/">
    ${supportPicture({ base: "community-impact-emblem", alt: "OneWorldz Community Impact emblem", className: "support-profile" })}
    <span class="profile-copy"><small>35 verified destinations</small><strong>Community Impact</strong><em>Dedicated support page <b aria-hidden="true">→</b></em></span>
  </a>
  <a class="profile-card" href="${base}/support/jayjayteamdev/">
    ${supportPicture({ base: "jayjayteamdev-emblem", alt: "JayJayTeamDev Helping Hands emblem", className: "support-profile" })}
    <span class="profile-copy"><small>Stripe + PayPal</small><strong>Support JayJayTeamDev</strong><em>Voluntary support page <b aria-hidden="true">→</b></em></span>
  </a>
</div>`;

const legal = (extra = "") => `<div class="legal-band"><strong>Safety boundary</strong><p>Educational and community information only. Nothing here is financial or legal advice, a guarantee of returns, custody, a token launch, wallet signing, buying, selling, transfer execution or payment credential storage. Verify every destination before acting.${extra ? ` ${escapeHtml(extra)}` : ""}</p></div>`;

const footer = (name, acknowledgementHref = "#acknowledgements") => `<footer class="site-footer">
  <div><strong>${escapeHtml(name)}</strong><span>One World • One Mission</span></div>
  <nav aria-label="Footer"><a href="${links.oneworldz}"${external(links.oneworldz)}>OneWorldz</a><a href="https://cryptoworldz.xyz">CryptoWorldz</a><a href="${acknowledgementHref}">Acknowledgements</a></nav>
  <p>Designed by JayJayTeamDev™ • Helping the People Who Help People</p>
</footer>`;

const commandRoles = () => `<div class="role-grid">${systemRoles.map(([name, role, boundary], index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(name)}</h3><strong>${escapeHtml(role)}</strong><p>${escapeHtml(boundary)}</p></article>`).join("")}</div>`;

const learningCards = () => `<div class="info-grid">${lessons.map(([number, title, copy]) => `<article><span>${number}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></article>`).join("")}</div>`;

const humanLeadership = () => `<div class="name-list">${humanLeaders.map((name) => `<span>${escapeHtml(name)}</span>`).join("")}</div>`;

export function cryptoHome() {
  const body = `${header({
    name: "CryptoWorldz",
    nav: [["Worldz", "#worldz"], ["Learn", "#learn"], ["Command Centre", "/command-centre/"], ["Impact", "#impact"], ["Support", "#support"]]
  })}
  <main id="main-content">
    <section class="hero" id="top">
      ${picture({ desktop: "cryptoworldz/zed-command-centre.png", mobile: "blockchain-portal.webp", alt: "Approved CryptoWorldz headquarters production artwork", className: "hero-art" })}
      <div class="hero-copy"><p class="eyebrow">ONE WORLD • ONE MISSION</p><h1>Building the Future of Crypto Together</h1><p>Education, verified communities, protected tools and human impact—connected through one CryptoWorldz headquarters.</p><div class="button-row">${button("Enter the Worldz", "#worldz")}${button("Open Command Centre", "/command-centre/", "secondary")}</div></div>
    </section>

    <section class="section" id="purpose">${sectionHeading("CRYPTOWORLDZ PURPOSE", "Proof before promises. People before hype.", "CryptoWorldz connects clear education, safe discovery, protected community systems and purpose-led action.")}
      <div class="media-row">${picture({ desktop: "cryptoworldz/we-need-you.png", mobile: "five-leaders-alliance.webp", alt: "Approved CryptoWorldz builder and alliance production artwork" })}<div class="info-grid compact"><article><span>01</span><h3>Learn clearly</h3><p>Understand the foundations before making decisions.</p></article><article><span>02</span><h3>Explore safely</h3><p>Use verified destinations and transparent boundaries.</p></article><article><span>03</span><h3>Build with purpose</h3><p>Turn digital connection into real community impact.</p></article></div></div>
    </section>

    <section class="section section-dark" id="worldz">${sectionHeading("EXPLORE THE WORLDZ", "Choose your World.", "Every portal keeps its own approved identity while sharing one connected network and mission.")}${worldCards()}</section>

    <section class="section" id="learn">${sectionHeading("BEGINNER CRYPTO EDUCATION", "Knowledge creates power.", "Plain-language foundations for every new participant.")}${learningCards()}</section>

    <section class="section section-dark" id="safety">${sectionHeading("SAFETY & SCAM REGISTER", "Check first. Connect second.", "Never share a seed phrase or private key. Confirm the exact domain, account, contract, network, recipient and fee before approving an action.")}<div class="link-stack">${button("Official Zed Bot", links.zed)}${button("Official Raaiiidd Team", links.raaiiidd, "secondary")}</div>${legal("AUTO remains safe locked with zero signing and zero execution.")}</section>

    <section class="section" id="command">${sectionHeading("COMMAND CENTRE ULTIMATE™", "Five leaders. Five separate protected roles.", "ZED, AUTO, G.R.A.C.E., RECAP and BASED.BID work together without sharing hidden authority.")}<div class="media-row">${picture({ desktop: "cryptoworldz/command-centre-five.png", mobile: "five-leaders-master.webp", alt: "The five approved CryptoWorldz system leaders" })}<div>${commandRoles()}<div class="button-row">${button("Open Command Centre", "/command-centre/")}${button("Open MiniApp Splash", "/miniapp/", "secondary")}</div></div></div></section>

    <section class="section section-dark" id="human-leadership"><div class="media-row reverse">${picture({ desktop: "cryptoworldz/command-centre-leader-team.png", mobile: "leader-team.webp", alt: "Approved separately labelled human leadership artwork" })}<div>${sectionHeading("HUMAN LEADERSHIP", "People and system roles remain separate.", "Solmusic, Savage, JayJayTeamDev, Remediy and Stepper never replace the five protected system roles.")}${humanLeadership()}</div></div></section>

    <section class="section section-dark" id="governance"><div class="media-row reverse">${picture({ desktop: "cryptoworldz/grace.png", mobile: "zed-grace-auto.webp", alt: "Approved ZED G.R.A.C.E. and AUTO production artwork" })}<div>${sectionHeading("ZED MISSIONS & GOVERNANCE", "One Legend. One Vote.", "Registration, profiles, wallet association, verified Raaiiidd missions, Legend Points, leaderboards and owner-controlled governance connect through Zed.")}<div class="button-row">${button("Open Zed", links.zed)}${button("Join Raaiiidd Team", links.raaiiidd, "secondary")}</div></div></div></section>

    <section class="section" id="rewards">${sectionHeading("REWARDS CENTRE", "Progress shown honestly.", "Legend Points and reward history appear only through verified Command Centre records—never invented balances or payout claims.")}<div class="info-grid"><article><span>01</span><h3>Legend Points</h3><p>Earned through verified missions.</p></article><article><span>02</span><h3>Reward History</h3><p>Clear records linked to real activity.</p></article><article><span>03</span><h3>Protected status</h3><p>Command Centre access is required.</p></article></div></section>

    <section class="section section-dark" id="launchpad"><div class="media-row">${picture({ desktop: "cryptoworldz/cryptoworldz-basedbid.webp", mobile: "cryptoworldz-basedbid-partnership.webp", alt: "Approved CryptoWorldz and Based.bid partnership production artwork" })}<div>${sectionHeading("LAUNCHPAD × BASED.BID", "Review. Prepare. Build responsibly.", "Projects may be introduced for identity review, mission clarity and community discovery. Submission is not approval, investment advice, an automatic launch or a promise of returns.")}<div class="button-row">${button("Open ImpactBased", "https://impactbased.oneworldz.com")}${button("Open Based.bid pathway", links.basedBid, "secondary")}</div></div></div></section>

    <section class="section" id="impactbased"><div class="media-row reverse">${picture({ desktop: "cryptoworldz/impactbased.png", mobile: "impactbased-square.webp", alt: "Approved ImpactBased production artwork" })}<div>${sectionHeading("IMPACTBASED", "Purpose-led projects. Transparent boundaries.", "ImpactBased keeps humanitarian and purpose-led projects separate from investment performance claims.")}${button("Enter ImpactBased", "https://impactbased.oneworldz.com")}</div></div></section>

    <section class="section section-dark" id="impact">${sectionHeading("HUMAN IMPACT", "Three purposes. Three separate support systems.", "Each image-led page keeps its own purpose, payment destination and records clear.")}<div id="support">${supportCards()}</div></section>

    <section class="section" id="pdc"><div class="media-row reverse">${picture({ desktop: "purple-diamond-crew/banner.png", mobile: "hope-chest.webp", alt: "Approved Purple Diamond Crew and Hope Chest production artwork" })}<div>${sectionHeading("PURPLE DIAMOND CREW", "The legacy lives on.", "Ten genuine legacy-token positions, one verified registry and one on-the-ground action pathway.")}${button("Open Purple Diamond Crew", "https://purplediamondcrew.com")}</div></div></section>

    <section class="section section-dark" id="updates">${sectionHeading("NEWS & UPDATES", "One connected working system.", "Every listed destination opens its real domain, public page or protected service.")}<div class="info-grid"><article><span>LIVE</span><h3>CryptoWorldz Headquarters</h3><p>Education, safety, Worldz discovery, Command Centre and impact gateway.</p></article><article><span>OPEN</span><h3>Builder pathways</h3><p>Values-aligned builders may enter through the Command Centre for review.</p></article><article><span>CONNECTED</span><h3>Worldz directory</h3><p>Approved World profiles route to their owned domains.</p></article></div></section>

    <section class="section" id="oneworldz"><div class="media-row">${picture({ desktop: "oneworldz/oneworldz-master.png", mobile: "little-legend.webp", alt: "Approved OneWorldz One Vision production artwork" })}<div>${sectionHeading("THE GLOBAL GATEWAY", "OneWorldz One Vision. 🌏", "Return to the global gateway for the connected Worldz, humanitarian mission and complete support network.")}${button("Enter OneWorldz", links.oneworldz)}</div></div></section>

    <section class="section section-dark" id="acknowledgements">${sectionHeading("ACKNOWLEDGEMENTS", "Built together. Credited clearly.")}<div class="info-grid"><article><span>01</span><h3>JayJayTeamDev™</h3><p>Founder, designer and mission lead.</p></article><article><span>02</span><h3>Reagan Kauja &amp; Action Spread Smiles</h3><p>Humanitarian mission.</p></article><article><span>03</span><h3>OneWorldz Community</h3><p>Admins, builders, supporters and confirmed partners.</p></article></div>${legal()}</section>
  </main>${footer("CryptoWorldz")}`;

  return document({
    title: "CryptoWorldz | One World • One Mission",
    description: "CryptoWorldz connects blockchain education, protected community systems and real-world impact under one mission.",
    canonical: "https://cryptoworldz.xyz/",
    body
  });
}

export function chainHome(world) {
  const otherWorldCards = worldCards({ current: world.key });
  const body = `${header({ name: world.name, image: world.image, nav: [["Purpose", "#purpose"], ["Worldz", "#worldz"], ["Learn", "#learn"], ["Safety", "#safety"], ["Impact", "#impact"]] })}
  <main id="main-content">
    <section class="hero chain-hero">${chainPicture(world, world.image ? `${world.name} approved desktop and mobile production artwork` : `${world.name} education recognition and rewards identity`, "hero-art")}<div class="hero-copy"><p class="eyebrow">${escapeHtml(world.chain)} • ONE WORLD • ONE MISSION</p><h1>${escapeHtml(world.name)}</h1><p>${escapeHtml(world.purpose)}</p><div class="button-row">${button(`Explore ${world.name}`, "#purpose")}${button("CryptoWorldz Headquarters", "https://cryptoworldz.xyz", "secondary")}</div></div></section>

    <section class="section" id="purpose">${sectionHeading(`${world.name.toUpperCase()} PURPOSE`, `Learn ${world.chain}. Build with purpose.`, world.purpose)}<div class="info-grid">${world.focus.map((item, index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(item)}</h3><p>Clear information, verified pathways and protected community participation.</p></article>`).join("")}</div></section>

    <section class="section section-dark" id="worldz">${sectionHeading("EXPLORE THE CONNECTED WORLDZ", "One ecosystem. Unique identities.", "Move between owned Worldz destinations through reciprocal working links.")}${otherWorldCards}</section>

    <section class="section" id="learn">${sectionHeading(`BEGINNER ${world.chain.toUpperCase()} EDUCATION`, "Knowledge before action.", `Understand ${world.chain} foundations, wallets, transactions, network fees, tokens and smart contracts before making decisions.`)}${learningCards()}</section>

    <section class="section section-dark" id="safety">${sectionHeading("SAFETY & SCAM REGISTER", "Check first. Connect second.", "Never share a seed phrase or private key. Confirm the exact domain, network, recipient, fee and action before approval.")}${legal(`${world.name} does not execute signing, buying, selling or transfers.`)}</section>

    <section class="section" id="command"><div class="media-row reverse">${picture({ desktop: "cryptoworldz/command-centre-five.png", mobile: "five-leaders-master.webp", alt: "Command Centre Ultimate five protected system roles" })}<div>${sectionHeading("COMMAND CENTRE ULTIMATE™", "Five separate protected roles.", "ZED, AUTO, G.R.A.C.E., RECAP and BASED.BID remain separate, with human leadership labelled separately.")}${button("Open Command Centre", "https://cryptoworldz.xyz/command-centre/")}</div></div></section>

    <section class="section section-dark" id="governance">${sectionHeading("ZED MISSIONS & GOVERNANCE", "One Legend. One Vote.", "Profiles, wallet association, verified Raaiiidd missions, Legend Points, leaderboards and governance presentation remain inside the protected Command Centre.")}<div class="button-row">${button("Open Zed", links.zed)}${button("Join Raaiiidd Team", links.raaiiidd, "secondary")}</div></section>

    <section class="section" id="rewards">${sectionHeading("REWARDS CENTRE", "Verified records only.", "No invented balances, payout claims or return promises.")}<div class="info-grid"><article><span>01</span><h3>Legend Points</h3><p>Verified mission records.</p></article><article><span>02</span><h3>Reward history</h3><p>Transparent activity context.</p></article><article><span>03</span><h3>Protected access</h3><p>Command Centre controlled.</p></article></div></section>

    <section class="section section-dark" id="launchpad"><div class="media-row">${picture({ desktop: "cryptoworldz/cryptoworldz-basedbid.webp", mobile: "cryptoworldz-basedbid-partnership.webp", alt: "Approved LaunchPad and Based.bid partnership artwork" })}<div>${sectionHeading("LAUNCHPAD × BASED.BID", "Reviewed pathways only.", "No automatic launch, fee claim, wallet signing or external authority is enabled by this website.")}${button("Open reviewed pathway", links.basedBid)}</div></div></section>

    <section class="section" id="impactbased"><div class="media-row reverse">${picture({ desktop: "cryptoworldz/impactbased.png", mobile: "impactbased-square.webp", alt: "Approved ImpactBased production artwork" })}<div>${sectionHeading("IMPACTBASED", "Purpose kept separate from performance.", "Discover purpose-led projects without investment-performance claims.")}${button("Enter ImpactBased", "https://impactbased.oneworldz.com")}</div></div></section>

    <section class="section section-dark" id="impact">${sectionHeading("HUMAN IMPACT", "Helping the People Who Help People.", "Three separate support purposes, payment destinations and records.")}${supportCards()}</section>

    <section class="section" id="pdc"><div class="media-row">${picture({ desktop: "purple-diamond-crew/banner.png", mobile: "hope-chest.webp", alt: "Approved Purple Diamond Crew production artwork" })}<div>${sectionHeading("PURPLE DIAMOND CREW", "Ten verified legacy-token positions.", "The Hope Chest registry and on-the-ground action pathway remain separate from investment claims.")}${button("Open Purple Diamond Crew", "https://purplediamondcrew.com")}</div></div></section>

    <section class="section section-dark" id="updates">${sectionHeading(`${world.name.toUpperCase()} NEWS & UPDATES`, "Proven states only.", "Public information changes only when the corresponding destination or record is verified.")}<div class="info-grid"><article><span>LIVE</span><h3>${escapeHtml(world.name)}</h3><p>Official custom-domain headquarters.</p></article><article><span>OPEN</span><h3>Education</h3><p>Beginner-clear public learning.</p></article><article><span>CONNECTED</span><h3>OneWorldz ecosystem</h3><p>Reciprocal routes across every approved destination.</p></article></div></section>

    <section class="section" id="oneworldz"><div class="media-row reverse">${picture({ desktop: "oneworldz/oneworldz-master.png", mobile: "little-legend.webp", alt: "Approved OneWorldz global gateway artwork" })}<div>${sectionHeading("ONEWORLDZ CONNECTION", "OneWorldz One Vision. 🌏", "Return to the global gateway or continue through CryptoWorldz.")}<div class="button-row">${button("Enter OneWorldz", links.oneworldz)}${button("Enter CryptoWorldz", "https://cryptoworldz.xyz", "secondary")}</div></div></div></section>

    <section class="section section-dark" id="acknowledgements">${sectionHeading("ACKNOWLEDGEMENTS", "People, mission and community.")}<div class="info-grid"><article><span>01</span><h3>JayJayTeamDev™</h3><p>Founder, designer and mission lead.</p></article><article><span>02</span><h3>Humanitarian mission</h3><p>Reagan Kauja and Action Spread Smiles.</p></article><article><span>03</span><h3>Community</h3><p>Admins, builders, supporters and confirmed partners.</p></article></div>${legal()}</section>
  </main>${footer(world.name)}`;

  return document({ title: `${world.name} | One World • One Mission`, description: world.purpose, canonical: `https://${world.domain}/`, accent: world.accent, accent2: world.accent2, body });
}

export function commandCentrePage() {
  const body = `${header({ name: "CryptoWorldz", nav: [["Five Roles", "#roles"], ["Human Leadership", "#human"], ["Owner Control", "#owner-control"], ["MiniApp", "/miniapp/"], ["Safety", "#safety"]] })}<main id="main-content">
    <section class="hero compact-hero">${picture({ desktop: "cryptoworldz/command-centre-five.png", mobile: "five-leaders-master.webp", alt: "Command Centre Ultimate five approved system leaders", className: "hero-art" })}<div class="hero-copy"><p class="eyebrow">COMMAND CENTRE ULTIMATE™</p><h1>Five leaders. Five protected roles.</h1><p>Website presentation only. System code, permissions, Supabase logic, automation, social connections and owner controls remain untouched.</p><div class="button-row">${button("Open Zed", links.zed)}${button("MiniApp Splash", "/miniapp/", "secondary")}</div></div></section>
    <section class="section" id="roles">${sectionHeading("FIVE SYSTEM ROLES", "Separate by design. Protected by boundary.")}${commandRoles()}</section>
    <section class="section section-dark" id="human"><div class="media-row">${picture({ desktop: "cryptoworldz/command-centre-leader-team.png", mobile: "leader-team.webp", alt: "Approved separate human leadership team artwork" })}<div>${sectionHeading("HUMAN LEADERSHIP", "People remain separately labelled.", "Solmusic, Savage, JayJayTeamDev, Remediy and Stepper never replace the five system roles.")}${humanLeadership()}</div></div></section>
    <section class="section" id="protected-core"><div class="media-row reverse">${picture({ desktop: "cryptoworldz/zed-auto.png", mobile: "zed-grace-auto.webp", alt: "Approved ZED G.R.A.C.E. and AUTO protected-core artwork" })}<div>${sectionHeading("PROTECTED CORE", "Presentation without execution.", "AUTO remains safe locked. No wallet signing, buying, transfers, token launches or financial execution are enabled.")}<div class="safe-lock"><strong>AUTO SAFE LOCK</strong><span>Zero signing • zero execution • protected owner controls</span></div></div></div></section>
    <section class="section section-dark" id="owner-control">${sectionHeading("AUTO OWNER CONTROL", "Ready for protected testing. Hidden from public control.", "The existing owner-authenticated CryptoBotz MiniApp retains the working control surface. This public page exposes no credentials, owner actions or financial execution.")}<div class="info-grid"><article><span>01</span><h3>Source &amp; limits</h3><p>Self-funded source configuration and budget limits remain owner-authenticated.</p></article><article><span>02</span><h3>Approval &amp; stop</h3><p>Approval state, pause and emergency-stop controls remain inside the protected service.</p></article><article><span>03</span><h3>Simulation</h3><p>Transaction simulation and preview do not sign or execute a transaction.</p></article><article><span>04</span><h3>Audit &amp; health</h3><p>Audit history, system health and owner confirmation gates remain protected.</p></article></div><div class="button-row">${button("Open protected MiniApp", links.protectedMiniApp)}${button("Open Zed", links.zed, "secondary")}</div>${legal("AUTO remains safe locked. Buying, transfers, wallet signing and bank movement stay disabled without a separate verified financial activation.")}</section>
    <section class="section section-dark" id="safety">${legal("CryptoBotz and all protected Command Centre services are separate from this static website.")}<div class="button-row">${button("Official Zed Bot", links.zed)}${button("Protected CryptoBotz service", links.protectedBot, "secondary")}</div></section>
    <section class="section" id="acknowledgements">${sectionHeading("ACKNOWLEDGEMENTS", "Built by people. Operated with boundaries.")}<p class="lead">JayJayTeamDev™, the separately labelled human leadership team, Reagan Kauja, Action Spread Smiles, the OneWorldz community and confirmed partners.</p></section>
  </main>${footer("Command Centre Ultimate™")}`;
  return document({ title: "Command Centre Ultimate™ | CryptoWorldz", description: "Five separate protected CryptoWorldz system roles and separately labelled human leadership.", canonical: "https://cryptoworldz.xyz/command-centre/", body });
}

export function miniAppPage() {
  const body = `${header({ name: "CryptoWorldz", nav: [["MiniApp", "#miniapp"], ["Protected functions", "#functions"], ["Safety", "#safety"]] })}<main id="main-content">
    <section class="hero compact-hero" id="miniapp">${picture({ desktop: "cryptoworldz/zed-auto.png", mobile: "zed-grace-auto.webp", alt: "Approved CryptoWorldz MiniApp splash artwork", className: "hero-art" })}<div class="hero-copy"><p class="eyebrow">CRYPTOWORLDZ MINIAPP</p><h1>Command Centre in your pocket.</h1><p>Approved public splash for the protected Telegram MiniApp. The static website does not change bot code, authentication, data, permissions or owner controls.</p><div class="button-row">${button("Open protected MiniApp", links.protectedMiniApp)}${button("Open Zed", links.zed, "secondary")}</div></div></section>
    <section class="section" id="functions">${sectionHeading("PROTECTED FUNCTIONS", "Clear public entry. Controlled system access.")}<div class="info-grid"><article><span>01</span><h3>Profiles</h3><p>Registration and protected member context.</p></article><article><span>02</span><h3>Raaiiidd missions</h3><p>Verified mission coordination and records.</p></article><article><span>03</span><h3>Legend Points</h3><p>Verified progress and reward history.</p></article><article><span>04</span><h3>Governance</h3><p>One Legend • One Vote presentation.</p></article></div></section>
    <section class="section section-dark" id="owner-control">${sectionHeading("OWNER-AUTHENTICATED AUTO CONTROL", "Protected service. Safe testing boundary.", "Self-funded source configuration, budget limits, approval state, pause/stop, simulation, audit history, health and owner confirmation remain inside the existing authenticated MiniApp.")}<div class="safe-lock"><strong>PUBLIC EXECUTION DISABLED</strong><span>No signing • no buying • no transfers • no bank movement</span></div><div class="button-row">${button("Open protected MiniApp", links.protectedMiniApp)}</div></section>
    <section class="section" id="safety">${legal("The MiniApp link enters a separate protected Hostinger Node service.")}</section>
  </main>${footer("CryptoWorldz MiniApp", "/#acknowledgements")}`;
  return document({ title: "CryptoWorldz MiniApp | Command Centre Ultimate™", description: "Approved CryptoWorldz MiniApp splash and protected entry.", canonical: "https://cryptoworldz.xyz/miniapp/", body });
}

export function supportPage(type) {
  const configs = {
    reagan: {
      title: "Reagan & Children", eyebrow: "ACTION SPREAD SMILES",
      description: "Direct humanitarian support for Reagan Kauja, the children in his care and the Action Spread Smiles mission in Uganda.",
      emblem: "reagan-children-emblem", alt: "Reagan and Children support emblem", stripe: links.reaganStripe,
      note: "This humanitarian support stream has its own Stripe destination, associated bank settlement configuration and separate records."
    },
    community: {
      title: "Community Impact", eyebrow: "HELPING THE PEOPLE WHO HELP PEOPLE",
      description: "A separate community support stream connecting all 35 verified Facebook destinations and its dedicated Stripe records.",
      emblem: "community-impact-emblem", alt: "OneWorldz Community Impact emblem", stripe: links.communityStripe,
      note: "This community support stream has its own Stripe destination, associated bank settlement configuration and separate records."
    },
    jayjay: {
      title: "Support JayJayTeamDev", eyebrow: "VOLUNTARY MISSION SUPPORT",
      description: "Voluntary support for the design, operation and Helping the People Who Help People mission.",
      emblem: "jayjayteamdev-emblem", alt: "JayJayTeamDev Helping Hands emblem", stripe: links.jayjayStripe,
      note: "This voluntary support stream has its own Stripe destination and separate records. It is not represented as a tax-deductible charitable donation."
    }
  };
  const config = configs[type];
  const profileDirectory = type === "community" ? `<section class="section section-dark" id="directory">${sectionHeading("35 VERIFIED DESTINATIONS", "Community support directory", "Each image-left identity card opens the exact Facebook share destination retained in the locked OneWorldz registry. Restricted Facebook visibility is labelled without replacing its saved link.")}<div class="profile-directory">${supportProfiles.map((profile) => `<a href="${profile.url}" target="_blank" rel="noopener noreferrer" aria-label="Open ${profile.name} on Facebook"><span class="directory-profile" aria-hidden="true"><b>${profile.initials || profile.number}</b><small>${profile.number}</small></span><span><small>${profile.restricted ? "REGISTRY LINK • FACEBOOK VISIBILITY RESTRICTED" : "VERIFIED FACEBOOK DESTINATION"}</small><strong>${profile.name}</strong><em>Open original destination →</em></span></a>`).join("")}</div></section>` : "";
  const paypal = type === "jayjay" ? button("Support with PayPal", links.jayjayPaypal, "secondary") : "";
  const canonicalPath = type === "reagan" ? "reagan-children" : type === "community" ? "community-impact" : "jayjayteamdev";
  const body = `${header({ name: "CryptoWorldz", nav: [["Purpose", "#purpose"], ...(type === "community" ? [["35 destinations", "#directory"]] : []), ["Payment safety", "#safety"]] })}<main id="main-content">
    <section class="support-hero section" id="purpose">${supportPicture({ base: config.emblem, alt: config.alt, className: "support-emblem" })}<div><p class="eyebrow">${config.eyebrow}</p><h1>${config.title}</h1><p class="lead">${config.description}</p><div class="button-row">${button("Support securely with Stripe", config.stripe)}${paypal}</div><p class="support-note">${config.note} No payment or bank credentials are stored on this website.</p></div></section>
    ${profileDirectory}
    <section class="section" id="safety">${sectionHeading("PAYMENT SAFETY", "One purpose. One dedicated destination.", "Check the support page title and payment destination before continuing.")}${legal()}</section>
  </main>${footer(config.title, "/#acknowledgements")}`;
  return document({ title: `${config.title} | CryptoWorldz Support`, description: config.description, canonical: `https://cryptoworldz.xyz/support/${canonicalPath}/`, body });
}

export function divisionPage(division) {
  const artwork = {
    "oneworldz-master": { desktop: "oneworldz/oneworldz-master.png", mobile: "little-legend.webp" },
    "oneworldz-gpt": { desktop: "oneworldz/oneworldz-gpt.png", mobile: "five-leaders-alliance.webp" },
    "little-legend": { desktop: "oneworldz/little-legend.png", mobile: "little-legend.webp" },
    "we-need-you": { desktop: "cryptoworldz/we-need-you.png", mobile: "five-leaders-alliance.webp" },
    "action-team": { desktop: "purple-diamond-crew/action-team.png", mobile: "hope-chest.webp" },
    "five-leaders-alliance": { desktop: "cryptoworldz/command-centre-five.png", mobile: "five-leaders-alliance.webp" },
    "impactbased": { desktop: "cryptoworldz/impactbased.png", mobile: "impactbased-square.webp" },
    "robin-hood-law": { desktop: "tokens/robin-hood-law.png", mobile: "robin-hood-law.webp" }
  }[division.image];
  const body = `${header({ name: division.name, image: division.image, nav: [["Purpose", "#purpose"], ["Connections", "#connections"], ["Safety", "#safety"]] })}<main id="main-content">
    <section class="hero compact-hero">${picture({ ...artwork, alt: `${division.name} approved production artwork`, className: "hero-art" })}<div class="hero-copy"><p class="eyebrow">CONNECTED ONEWORLDZ DIVISION</p><h1>${division.name}</h1><p>${division.line}</p><div class="button-row">${button("Explore the division", "#purpose")}${button("OneWorldz Gateway", links.oneworldz, "secondary")}</div></div></section>
    <section class="section" id="purpose">${sectionHeading(`${division.name.toUpperCase()} PURPOSE`, division.line, "A connected public division built under the OneWorldz people-first, proof-first and protected-system principles.")}<div class="info-grid"><article><span>01</span><h3>People</h3><p>Human benefit remains the starting point.</p></article><article><span>02</span><h3>Proof</h3><p>Verified information before public claims.</p></article><article><span>03</span><h3>Connection</h3><p>Reciprocal paths across the OneWorldz ecosystem.</p></article></div></section>
    <section class="section section-dark" id="connections">${sectionHeading("CONNECTED DESTINATIONS", "One ecosystem. Clear pathways.")}<div class="button-row">${button("OneWorldz", links.oneworldz)}${button("CryptoWorldz", "https://cryptoworldz.xyz", "secondary")}${button("Command Centre", "https://cryptoworldz.xyz/command-centre/", "secondary")}</div></section>
    <section class="section" id="safety">${legal("This division does not claim professional, financial, medical or legal authority.")}</section>
  </main>${footer(division.name, "/#acknowledgements")}`;
  return document({ title: `${division.name} | OneWorldz`, description: division.line, canonical: `https://cryptoworldz.xyz/divisions/${division.key}/`, body });
}

export function pdcPage() {
  const body = `${header({ name: "Purple Diamond Crew", image: "pdc", nav: [["Hope Chest", "#registry"], ["Action", "#action"], ["Safety", "#safety"]] })}<main id="main-content">
    <section class="hero">${picture({ desktop: "purple-diamond-crew/banner.png", mobile: "hope-chest.webp", alt: "Approved Purple Diamond Crew Hope Chest production artwork", className: "hero-art" })}<div class="hero-copy"><p class="eyebrow">THE LEGACY LIVES ON</p><h1>Purple Diamond Crew</h1><p>Ten genuine legacy-token positions. One history. Every registry destination verified.</p><div class="button-row">${button("Open the Hope Chest", "#registry")}${button("OneWorldz Gateway", links.oneworldz, "secondary")}</div></div></section>
    <section class="section" id="registry">${sectionHeading("TEN VERIFIED POSITIONS", "The Hope Chest registry.", "Each card preserves the exact recorded token name, contract address and Solscan destination.")}<div class="token-grid">${pdcTokens.map((token) => `<article><span>${token.number}</span><h3>${token.name}</h3><code>${token.address}</code><a href="${token.url}" target="_blank" rel="noopener noreferrer">Verify on Solscan →</a></article>`).join("")}</div></section>
    <section class="section section-dark" id="action"><div class="media-row reverse">${picture({ desktop: "purple-diamond-crew/action-team.png", mobile: "little-legend.webp", alt: "Approved Purple Diamond Crew action team production artwork" })}<div>${sectionHeading("ON-THE-GROUND ACTION", "Helping the People Who Help People.", "Purple Diamond Crew connects legacy, community and transparent action without return promises.")}${button("Community Impact", "https://cryptoworldz.xyz/support/community-impact/")}</div></div></section>
    <section class="section" id="safety">${legal("Registry links are identity and history references, not buy instructions or performance claims.")}</section>
    <section class="section section-dark" id="acknowledgements">${sectionHeading("ACKNOWLEDGEMENTS", "Legacy preserved. Mission continued.", "JayJayTeamDev™, the Purple Diamond Crew community, Reagan Kauja, Action Spread Smiles and all confirmed supporters.")}</section>
  </main>${footer("Purple Diamond Crew")}`;
  return document({ title: "Purple Diamond Crew | The Legacy Lives On", description: "The verified Purple Diamond Crew Hope Chest registry and action pathway.", canonical: "https://purplediamondcrew.com/", accent: "#c46aff", accent2: "#f0c5ff", body });
}

export function impactBasedPage() {
  const body = `${header({ name: "ImpactBased", image: "impactbased", nav: [["Purpose", "#purpose"], ["Pathway", "#pathway"], ["Support", "#support"], ["Safety", "#safety"]] })}<main id="main-content">
    <section class="hero">${picture({ desktop: "cryptoworldz/impactbased.png", mobile: "impactbased-square.webp", alt: "Approved ImpactBased desktop and mobile production artwork", className: "hero-art" })}<div class="hero-copy"><p class="eyebrow">PURPOSE-DRIVEN LAUNCH BOARD</p><h1>ImpactBased</h1><p>Transparent project identity, community discovery and real-world impact—kept separate from investment performance claims.</p><div class="button-row">${button("Explore the pathway", "#pathway")}${button("CryptoWorldz", "https://cryptoworldz.xyz", "secondary")}</div></div></section>
    <section class="section" id="purpose">${sectionHeading("IMPACTBASED PURPOSE", "Mission clarity before launch claims.", "Projects may present identity, purpose, evidence and community pathways for review.")}<div class="info-grid"><article><span>01</span><h3>Identity</h3><p>Who is responsible for the project.</p></article><article><span>02</span><h3>Mission</h3><p>What real purpose the project serves.</p></article><article><span>03</span><h3>Evidence</h3><p>What can be verified publicly.</p></article></div></section>
    <section class="section section-dark" id="pathway"><div class="media-row">${picture({ desktop: "cryptoworldz/cryptoworldz-basedbid.webp", mobile: "cryptoworldz-basedbid-partnership.webp", alt: "Approved CryptoWorldz and Based.bid pathway artwork" })}<div>${sectionHeading("REVIEWED PATHWAY", "Prepare. Review. Build responsibly.", "This page does not approve or execute token launches, connect wallets or guarantee any outcome.")}<div class="button-row">${button("Based.bid pathway", links.basedBid)}${button("Command Centre", "https://cryptoworldz.xyz/command-centre/", "secondary")}</div></div></div></section>
    <section class="section" id="support">${sectionHeading("HUMAN IMPACT", "Three separate support systems.")}${supportCards()}</section>
    <section class="section section-dark" id="safety">${legal("Impact language is not an investment-performance claim.")}</section>
    <section class="section" id="acknowledgements">${sectionHeading("ACKNOWLEDGEMENTS", "Purpose is built together.", "JayJayTeamDev™, OneWorldz, CryptoWorldz, the community and confirmed partners.")}</section>
  </main>${footer("ImpactBased")}`;
  return document({ title: "ImpactBased | Purpose-Driven Launch Board", description: "Purpose-led project identity and reviewed pathways without investment-performance claims.", canonical: "https://impactbased.oneworldz.com/", accent: "#ffbc4b", accent2: "#d465ff", body });
}

export function lawPage() {
  const body = `${header({ name: "Law.OneWorldz", image: "law", nav: [["Purpose", "#purpose"], ["RobinWorldz", "#robin"], ["Safety", "#safety"]] })}<main id="main-content">
    <section class="hero compact-hero">${picture({ desktop: "tokens/robin-hood-law.png", mobile: "robin-hood-law.webp", alt: "Approved Robin Hood Law production artwork", className: "hero-art" })}<div class="hero-copy"><p class="eyebrow">PUBLIC INFORMATION PATHWAY</p><h1>Law.OneWorldz</h1><p>Clear public information and verified pathways without pretending to be a lawyer or providing individual legal advice.</p><div class="button-row">${button("Purpose", "#purpose")}${button("OneWorldz", links.oneworldz, "secondary")}</div></div></section>
    <section class="section" id="purpose">${sectionHeading("CLEAR BOUNDARIES", "Information is not legal advice.", "Laws, rights, deadlines and remedies depend on facts and jurisdiction. Use qualified professional advice for individual decisions.")}<div class="info-grid"><article><span>01</span><h3>Information</h3><p>Plain-language public context.</p></article><article><span>02</span><h3>Verification</h3><p>Check jurisdiction and current official sources.</p></article><article><span>03</span><h3>Professional help</h3><p>Seek qualified advice for personal matters.</p></article></div></section>
    <section class="section section-dark" id="robin">${sectionHeading("ROBINWORLDZ CONNECTION", "Robin Hood Chain and RecoverYourDebt.", "RobinWorldz remains separate from legal-advice claims and is not represented as Solana.")}${button("Open RobinWorldz", "https://robinworldz.xyz")}</section>
    <section class="section" id="safety">${legal("Nothing on this page creates a lawyer-client relationship.")}</section>
    <section class="section section-dark" id="acknowledgements">${sectionHeading("ACKNOWLEDGEMENTS", "People-first information.", "JayJayTeamDev™, OneWorldz and the connected community.")}</section>
  </main>${footer("Law.OneWorldz")}`;
  return document({ title: "Law.OneWorldz | Public Information", description: "People-first public information with clear legal-advice boundaries.", canonical: "https://law.oneworldz.com/", accent: "#76db63", accent2: "#f0c85b", body });
}

export function learnPage() {
  const body = `${header({ name: "Learn.OneWorldz", image: "learn", nav: [["Foundations", "#foundations"], ["Worldz", "#worldz"], ["Safety", "#safety"]] })}<main id="main-content">
    <section class="hero compact-hero">${picture({ desktop: "oneworldz/oneworldz-gpt.png", mobile: "little-legend.webp", alt: "Approved OneWorldz learning production artwork", className: "hero-art" })}<div class="hero-copy"><p class="eyebrow">KNOWLEDGE CREATES POWER</p><h1>Learn.OneWorldz</h1><p>Plain-language education for confident, safe and purpose-led participation.</p><div class="button-row">${button("Start with foundations", "#foundations")}${button("OneWorldz", links.oneworldz, "secondary")}</div></div></section>
    <section class="section" id="foundations">${sectionHeading("CRYPTO FOUNDATIONS", "Understand before you act.")}${learningCards()}</section>
    <section class="section section-dark" id="worldz">${sectionHeading("CONNECTED WORLDZ", "Choose a learning pathway.")}${worldCards()}</section>
    <section class="section" id="safety">${legal("Learning content does not verify a particular asset, project or expected outcome.")}</section>
    <section class="section section-dark" id="acknowledgements">${sectionHeading("ACKNOWLEDGEMENTS", "Knowledge shared with purpose.", "JayJayTeamDev™, OneWorldz, CryptoWorldz and the connected community.")}</section>
  </main>${footer("Learn.OneWorldz")}`;
  return document({ title: "Learn.OneWorldz | Knowledge Creates Power", description: "Plain-language OneWorldz education and verified ecosystem pathways.", canonical: "https://learn.oneworldz.com/", accent: "#54bfff", accent2: "#c56cff", body });
}

export { divisions, worldz };
