import { ecosystemDestinations } from "./ecosystem-topology.mjs";
import { links as coreLinks, supportProfiles } from "./site-data.mjs";

const links = Object.freeze({
  ...coreLinks,
  oneWorldz: "https://oneworldz.com",
  cryptoWorldz: "https://cryptoworldz.xyz",
  foodWorldz: "https://foodworldz.com",
  donateWorldz: "https://donateworldz.com",
  hodlerGalaxy: "https://hodlergalaxy.xyz",
  impactBased: coreLinks.impactBased,
  learn: "https://learn.oneworldz.com",
  law: "https://law.oneworldz.com",
  commandCentre: "https://cryptobotz.cryptoworldz.xyz"
});

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

const picture = ({ desktop, mobile, alt, className = "" }) => `<picture class="production-picture ${className}">
  <source media="(max-width: 720px)" srcset="/assets/${mobile}">
  <img src="/assets/${desktop}" alt="${escapeHtml(alt)}" loading="eager" decoding="async">
</picture>`;

const header = (name, nav = []) => `<header class="site-header">
  <a class="site-brand" href="/" aria-label="${escapeHtml(name)} Back to Home">
    <span class="brand-profile text-brand" aria-hidden="true"><b>${escapeHtml(name.charAt(0))}</b></span>
    <span><strong>${escapeHtml(name)}</strong><small>Back to Home</small></span>
  </a>
  <button class="menu-button" type="button" aria-expanded="false" aria-controls="site-menu"><span></span><span></span><span></span><b>Menu</b></button>
  <nav class="site-menu" id="site-menu" aria-label="Primary navigation">
    ${nav.map(([label, href]) => `<a href="${href}"${external(href)}>${escapeHtml(label)}</a>`).join("")}
    <a href="${links.oneWorldz}" target="_blank" rel="noopener noreferrer">OneWorldz</a>
  </nav>
</header>
<button class="menu-backdrop" type="button" aria-label="Close menu" tabindex="-1"></button>`;

const footer = () => `<footer class="site-footer vision-footer"><div><strong>Created with the Vision</strong><span>When Someone say's You can't Change the World 🌐 just Say “Why can't I?”</span></div></footer>`;

const sectionHeading = (eyebrow, title, copy = "") => `<div class="section-heading">
  <p class="eyebrow">${escapeHtml(eyebrow)}</p>
  <h2>${escapeHtml(title)}</h2>
  ${copy ? `<p>${escapeHtml(copy)}</p>` : ""}
</div>`;

const legal = (copy) => `<div class="legal-band"><strong>Safety boundary</strong><p>${escapeHtml(copy)}</p></div>`;

const document = ({ title, description, canonical, body, accent = "#b763ff", accent2 = "#79bfff" }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#070510">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <link rel="stylesheet" href="/assets/css/site.css">
</head>
<body style="--accent:${accent};--accent-2:${accent2}">
  <a class="skip-link" href="#main-content">Skip to content</a>
  ${body}
  <script src="/assets/js/site.js" defer></script>
</body>
</html>`;

const supportConfigs = Object.freeze({
  reagan: {
    slug: "reagan-children",
    title: "Reagan & Children",
    eyebrow: "ACTION SPREAD SMILES",
    description: "Dedicated humanitarian support for Reagan, the children and their verified needs.",
    emblem: "reagan-children-emblem",
    stripe: coreLinks.reaganStripe,
    note: "This support stream keeps its own Stripe destination and separate records."
  },
  community: {
    slug: "community-impact",
    title: "Community Impact",
    eyebrow: "HELPING THE PEOPLE WHO HELP PEOPLE",
    description: "Dedicated support for the verified community network and its separate impact records.",
    emblem: "community-impact-emblem",
    stripe: coreLinks.communityStripe,
    note: "This support stream keeps its own Stripe destination and separate records."
  },
  jayjay: {
    slug: "jayjayteamdev",
    title: "Support JayJayTeamDev",
    eyebrow: "VOLUNTARY MISSION SUPPORT",
    description: "Voluntary support for JayJayTeamDev mission work and the OneWorldz ecosystem.",
    emblem: "jayjayteamdev-emblem",
    stripe: coreLinks.jayjayStripe,
    note: "This is voluntary mission support and is not represented as tax-deductible charitable giving."
  }
});

export function foodWorldzPage() {
  const body = `${header("FoodWorldz", [["Need", "#need"], ["Action", "#action"], ["Impact", "#impact"], ["Donate", links.donateWorldz]])}
  <main id="main-content">
    <section class="hero">${picture({ desktop: "desktop/humanitarian/action-creates-smiles-banner.png", mobile: "support/mobile/reagan-children-emblem-mobile.webp", alt: "FoodWorldz humanitarian support pathway", className: "hero-art" })}<div class="hero-copy"><p class="eyebrow">FOOD • DIGNITY • COMMUNITY</p><h1>FoodWorldz</h1><p>See the need. Understand the project. Follow the impact. Then choose how to help through DonateWorldz.</p><div class="button-row">${button("See how to help", "#action")}${button("DonateWorldz", links.donateWorldz, "secondary")}</div></div></section>
    <section class="section" id="need">${sectionHeading("SEE THE NEED", "Food support starts with clear information.", "FoodWorldz is the public home for food needs, meal support, community projects, stories and verified outcomes across the OneWorldz mission.")}<div class="info-grid"><article><span>01</span><h3>Needs</h3><p>Describe the real food requirement and who it supports.</p></article><article><span>02</span><h3>Projects</h3><p>Show the activity, people and delivery pathway.</p></article><article><span>03</span><h3>Outcomes</h3><p>Record what support achieved without exaggeration.</p></article></div></section>
    <section class="section section-dark" id="action">${sectionHeading("TAKE ACTION", "FoodWorldz explains why. DonateWorldz handles how.", "Keeping information and payment action separate makes the pathway easier to understand and keeps each support destination distinct.")}<div class="button-row">${button("Open DonateWorldz", links.donateWorldz)}${button("Community Impact", `${links.donateWorldz}/community-impact/`, "secondary")}</div></section>
    <section class="section" id="impact">${sectionHeading("CONNECTED IMPACT", "Food is one part of a wider mission.", "Education, medical support, water, children, skills and community tools remain connected through OneWorldz without being forced into one donation stream.")}<div class="button-row">${button("OneWorldz", links.oneWorldz)}${button("Learn.OneWorldz", links.learn, "secondary")}</div></section>
    <section class="section section-dark">${legal("FoodWorldz does not store payment credentials. Donation actions continue only through the clearly labelled DonateWorldz support pathways.")}</section>
  </main>${footer("FoodWorldz")}`;
  return document({ title: "FoodWorldz | See the Need • Support the Mission", description: "FoodWorldz connects food needs, projects and impact to clear DonateWorldz support pathways.", canonical: "https://foodworldz.com/", accent: "#ffb84d", accent2: "#8be28b", body });
}

export function donateWorldzPage() {
  const cards = Object.values(supportConfigs).map((config) => `<a class="profile-card" href="/${config.slug}/"><span class="profile-copy"><small>${config.eyebrow}</small><strong>${config.title}</strong><em>Open dedicated support pathway <b aria-hidden="true">→</b></em></span></a>`).join("");
  const body = `${header("DonateWorldz", [["Choose", "#choose"], ["Safety", "#safety"], ["FoodWorldz", links.foodWorldz], ["OneWorldz", links.oneWorldz]])}
  <main id="main-content">
    <section class="hero">${picture({ desktop: "desktop/oneworldz/oneworldz-master.png", mobile: "support/mobile/community-impact-emblem-mobile.webp", alt: "DonateWorldz central support gateway", className: "hero-art" })}<div class="hero-copy"><p class="eyebrow">CHOOSE A PURPOSE • SUPPORT CLEARLY</p><h1>DonateWorldz</h1><p>One central action hub for approved donation and support pathways—while every payment destination and record stays separate.</p><div class="button-row">${button("Choose a purpose", "#choose")}${button("FoodWorldz", links.foodWorldz, "secondary")}</div></div></section>
    <section class="section" id="choose">${sectionHeading("CHOOSE YOUR PURPOSE", "Three clearly separated support pathways.", "Opening a pathway shows its exact purpose and payment destination before you continue.")}<div class="profile-grid support-card-grid">${cards}</div></section>
    <section class="section section-dark" id="safety">${sectionHeading("PAYMENT SAFETY", "One purpose. One destination. Separate records.", "DonateWorldz is the directory and action layer. It does not merge the three support streams into one account.")}${legal("No bank credentials, Stripe secrets, PayPal credentials, private keys or verification codes are stored in public website code.")}</section>
    <section class="section">${sectionHeading("CONNECTED MISSION", "See the need before taking action.", "FoodWorldz explains food projects and impact. OneWorldz provides the wider mission and ecosystem context.")}<div class="button-row">${button("Open FoodWorldz", links.foodWorldz)}${button("Open OneWorldz", links.oneWorldz, "secondary")}</div></section>
  </main>${footer("DonateWorldz")}`;
  return document({ title: "DonateWorldz | Choose a Purpose • Support Clearly", description: "DonateWorldz is the central OneWorldz support hub with clearly separated donation and voluntary-support pathways.", canonical: "https://donateworldz.com/", accent: "#ff6fae", accent2: "#ffd36a", body });
}

export function donateSupportPage(type) {
  const config = supportConfigs[type];
  if (!config) throw new Error(`Unknown DonateWorldz support type: ${type}`);
  const directory = type === "community" ? `<section class="section section-dark" id="directory">${sectionHeading("35 VERIFIED DESTINATIONS", "Community support directory", "The existing verified community registry is preserved as a transparent reference layer.")}<div class="profile-directory">${supportProfiles.map((profile) => `<a href="${profile.url}" target="_blank" rel="noopener noreferrer"><span class="directory-profile" aria-hidden="true"><b>${profile.initials || profile.number}</b><small>${profile.number}</small></span><span><small>${profile.restricted ? "REGISTRY LINK • FACEBOOK VISIBILITY RESTRICTED" : "VERIFIED FACEBOOK DESTINATION"}</small><strong>${profile.name}</strong><em>Open original destination →</em></span></a>`).join("")}</div></section>` : "";
  const paypal = type === "jayjay" ? button("Support with PayPal", coreLinks.jayjayPaypal, "secondary") : "";
  const body = `${header("DonateWorldz", [["Purpose", "#purpose"], ...(type === "community" ? [["Directory", "#directory"]] : []), ["Safety", "#safety"], ["All support", "/"]])}<main id="main-content">
    <section class="support-hero section" id="purpose">${picture({ desktop: `support/desktop/${config.emblem}-desktop.webp`, mobile: `support/mobile/${config.emblem}-mobile.webp`, alt: `${config.title} support emblem`, className: "support-emblem" })}<div><p class="eyebrow">${config.eyebrow}</p><h1>${config.title}</h1><p class="lead">${config.description}</p><div class="button-row">${button("Continue securely with Stripe", config.stripe)}${paypal}</div><p class="support-note">${config.note} No payment or bank credentials are stored on this website.</p></div></section>
    ${directory}
    <section class="section" id="safety">${sectionHeading("PAYMENT SAFETY", "Confirm the purpose before paying.", "Check the page title and payment destination before continuing.")}${legal("Each support pathway keeps its own payment destination and records. Nothing on this page combines or reallocates payments between purposes.")}</section>
  </main>${footer(config.title)}`;
  return document({ title: `${config.title} | DonateWorldz`, description: config.description, canonical: `https://donateworldz.com/${config.slug}/`, accent: "#ff6fae", accent2: "#ffd36a", body });
}

export function hodlerGalaxyPage() {
  const visible = ecosystemDestinations.filter((destination) => destination.key !== "hodlergalaxy" && destination.key !== "cryptobotz");
  const cards = visible.map((destination) => `<a class="profile-card" href="https://${destination.domain}" target="_blank" rel="noopener noreferrer"><span class="profile-copy"><small>${escapeHtml(destination.type.toUpperCase())}</small><strong>${escapeHtml(destination.name)}</strong><em>${escapeHtml(destination.role)} <b aria-hidden="true">→</b></em></span></a>`).join("");
  const body = `${header("HodlerGalaxy", [["Explore", "#explore"], ["Command Centre", links.commandCentre], ["Learn", links.learn], ["OneWorldz", links.oneWorldz]])}
  <main id="main-content">
    <section class="hero">${picture({ desktop: "desktop/cryptoworldz/we-need-you.png", mobile: "mobile/five-leaders-alliance.webp", alt: "HodlerGalaxy ecosystem discovery gateway", className: "hero-art" })}<div class="hero-copy"><p class="eyebrow">EXPLORE THE CONNECTED WORLDZ</p><h1>HodlerGalaxy</h1><p>A discovery layer for moving between Worldz, learning, impact, projects and community destinations without turning HodlerGalaxy into another duplicate homepage.</p><div class="button-row">${button("Explore the Galaxy", "#explore")}${button("HodlerWorldz", "https://hodlerworldz.xyz", "secondary")}</div></div></section>
    <section class="section" id="explore">${sectionHeading("ECOSYSTEM DISCOVERY", "Every destination has one job.", "Use HodlerGalaxy to discover where to go next; use each destination for its specialised purpose.")}<div class="profile-grid world-profile-grid">${cards}</div></section>
    <section class="section section-dark">${sectionHeading("PROTECTED COMMAND LAYER", "CryptoBotz is a destination, not a marketing clone.", "ZED and the Command Centre remain on the protected CryptoBotz application while HodlerGalaxy provides discovery only.")}<div class="button-row">${button("Open Command Centre", links.commandCentre)}${button("CryptoWorldz", links.cryptoWorldz, "secondary")}</div>${legal("HodlerGalaxy is a discovery and education surface. It does not execute trades, wallet signing, transfers or token launches.")}</section>
  </main>${footer("HodlerGalaxy")}`;
  return document({ title: "HodlerGalaxy | Explore the OneWorldz Ecosystem", description: "HodlerGalaxy is the visual discovery layer connecting the specialised OneWorldz ecosystem destinations.", canonical: "https://hodlergalaxy.xyz/", accent: "#8e72ff", accent2: "#62d9ff", body });
}
