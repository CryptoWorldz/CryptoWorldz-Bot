import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(appRoot, "dist", "ecosystem");

const donation = Object.freeze({
  reagan: {
    page: "https://donateworldz.com/reagan-children/",
    stripe: "https://donate.stripe.com/14A6oHcG61Ox87Y0Xb0kE01"
  },
  community: {
    page: "https://donateworldz.com/community-impact/",
    stripe: "https://donate.stripe.com/9B67sLgWm78R73U35j0kE02"
  },
  davis: {
    page: "https://donateworldz.com/davis-family/",
    stripe: "https://donate.stripe.com/dRm8wPdKa0Kt2NE7lz0kE03"
  },
  jayjay: {
    page: "https://donateworldz.com/jayjayteamdev/",
    stripe: "https://buy.stripe.com/6oUeVd9tU0Ktewm0Xb0kE00"
  }
});

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const visionFooter = '<footer class="site-footer vision-footer"><div><strong>Created with the Vision</strong><span>When Someone say\'s You can\'t Change the World 🌐 just Say “Why can\'t I?”</span></div></footer>';

const siteShell = ({ title, description, canonical, heading, eyebrow, lead, primaryLabel, primaryHref, secondaryLabel, secondaryHref }) => `<!doctype html>
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
<body style="--accent:#ff6fae;--accent-2:#ffd36a">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="site-header">
    <a class="site-brand" href="/" aria-label="Back to Home"><span class="brand-profile text-brand" aria-hidden="true"><b>D</b></span><span><strong>${canonical.includes("cryptoworldz.xyz") ? "CryptoWorldz" : "DonateWorldz"}</strong><small>Back to Home</small></span></a>
    <button class="menu-button" type="button" aria-expanded="false" aria-controls="site-menu"><span></span><span></span><span></span><b>Menu</b></button>
    <nav class="site-menu" id="site-menu" aria-label="Primary navigation">
      <a href="${canonical.includes("cryptoworldz.xyz") ? "https://donateworldz.com/davis-family/" : "/"}">All Support</a>
      <a href="https://donateworldz.com/community-impact/" target="_blank" rel="noopener noreferrer">Community Impact</a>
      <a href="https://donateworldz.com/reagan-children/" target="_blank" rel="noopener noreferrer">Reagan &amp; Children</a>
      <a href="https://donateworldz.com/jayjayteamdev/" target="_blank" rel="noopener noreferrer">Support JayJayTeamDev</a>
      <a href="https://oneworldz.com" target="_blank" rel="noopener noreferrer">OneWorldz</a>
    </nav>
  </header>
  <button class="menu-backdrop" type="button" aria-label="Close menu" tabindex="-1"></button>
  <main id="main-content">
    <section class="support-hero section" id="purpose">
      <div class="support-emblem text-art" role="img" aria-label="Davis Family dedicated support"><span>D</span><strong>DAVIS FAMILY</strong><small>OneWorldz • Dedicated Support</small></div>
      <div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(heading)}</h1><p class="lead">${escapeHtml(lead)}</p><div class="button-row"><a class="button primary" href="${primaryHref}" target="_blank" rel="noopener noreferrer">${escapeHtml(primaryLabel)}</a><a class="button secondary" href="${secondaryHref}">${escapeHtml(secondaryLabel)}</a></div><p class="support-note">This is a dedicated Davis Family support stream with its own Stripe payment destination and separate Stripe records. No payment or bank credentials are stored on this website.</p></div>
    </section>
    <section class="section section-dark"><div class="section-heading"><p class="eyebrow">PAYMENT SAFETY</p><h2>One purpose. One dedicated destination.</h2><p>Confirm Davis Family is shown before continuing to Stripe. This page never combines or reallocates donations between support purposes.</p></div><div class="legal-band"><strong>Safety boundary</strong><p>Payment is completed only on Stripe. Verify the destination before paying. OneWorldz public pages never store card details, bank credentials, Stripe secrets, private keys or verification codes.</p></div></section>
  </main>
  ${visionFooter}
  <script src="/assets/js/site.js" defer></script>
</body>
</html>`;

async function read(relative) {
  return readFile(path.join(distRoot, relative), "utf8");
}

async function write(relative, content) {
  const destination = path.join(distRoot, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content, "utf8");
}

function insertOnce(html, marker, insertion, label) {
  if (html.includes(insertion)) return html;
  if (!html.includes(marker)) throw new Error(`Donation finalizer marker missing: ${label}`);
  return html.replace(marker, insertion + marker);
}

function addSitemapUrl(xml, url) {
  if (xml.includes(`<loc>${url}</loc>`)) return xml;
  if (!xml.includes("</urlset>")) throw new Error("Sitemap closing tag missing");
  return xml.replace("</urlset>", `  <url><loc>${url}</loc></url>\n</urlset>`);
}

async function listFiles(root, relative = "") {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, child));
    else files.push(child.split(path.sep).join("/"));
  }
  return files.sort();
}

const donateDavis = siteShell({
  title: "Davis Family | DonateWorldz",
  description: "Dedicated OneWorldz support pathway for the Davis Family with a separate Stripe payment destination and records.",
  canonical: donation.davis.page,
  heading: "Davis Family",
  eyebrow: "DEDICATED FAMILY SUPPORT",
  lead: "A separate OneWorldz DonateWorldz support pathway for the Davis Family. Funds paid through this page are recorded under the Davis Family funding stream.",
  primaryLabel: "Continue securely with Stripe",
  primaryHref: donation.davis.stripe,
  secondaryLabel: "All DonateWorldz Support",
  secondaryHref: "/"
});
await write("donateworldz/davis-family/index.html", donateDavis);

const cryptoDavis = siteShell({
  title: "Davis Family | CryptoWorldz Support",
  description: "CryptoWorldz entry to the dedicated Davis Family support pathway on DonateWorldz.",
  canonical: "https://cryptoworldz.xyz/support/davis-family/",
  heading: "Davis Family",
  eyebrow: "ONEWORLDZ DIRECT SUPPORT",
  lead: "Open the dedicated Davis Family DonateWorldz page before payment. The Davis Family stream stays separate from Reagan & Children, Community Impact and Support JayJayTeamDev.",
  primaryLabel: "Open Davis Family on DonateWorldz",
  primaryHref: donation.davis.page,
  secondaryLabel: "CryptoWorldz Home",
  secondaryHref: "/"
});
await write("cryptoworldz/support/davis-family/index.html", cryptoDavis);

let donateHome = await read("donateworldz/index.html");
const donateCard = '<a class="profile-card" href="/davis-family/"><span class="profile-copy"><small>DEDICATED FAMILY SUPPORT</small><strong>Davis Family</strong><em>Open dedicated support pathway <b aria-hidden="true">→</b></em></span></a>';
donateHome = insertOnce(donateHome, '<div class="profile-grid support-card-grid">', donateCard, "DonateWorldz support grid");
donateHome = donateHome
  .replaceAll("Three clearly separated support pathways.", "Four clearly separated support pathways.")
  .replaceAll("three support streams", "four support streams")
  .replaceAll("three support pathways", "four support pathways")
  .replaceAll("Three separated support pathways", "Four separated support pathways");
await write("donateworldz/index.html", donateHome);

let cryptoHome = await read("cryptoworldz/index.html");
const cryptoCard = '<a class="profile-card" href="https://cryptoworldz.xyz/support/davis-family/"><span class="profile-copy"><small>Dedicated family support</small><strong>Davis Family</strong><em>Dedicated support page <b aria-hidden="true">→</b></em></span></a>';
const jayjayCardMarker = '<a class="profile-card" href="https://cryptoworldz.xyz/support/jayjayteamdev/">';
cryptoHome = insertOnce(cryptoHome, jayjayCardMarker, cryptoCard, "CryptoWorldz support grid");
await write("cryptoworldz/index.html", cryptoHome);

let oneWorldzHome = await read("oneworldz/index.html");
if (!oneWorldzHome.includes(donation.davis.page)) {
  const acknowledgementMarker = '<section class="section" id="acknowledgements">';
  const davisSection = `<section class="section section-dark" id="davis-family-support"><div class="section-heading"><p class="eyebrow">DAVIS FAMILY • DEDICATED SUPPORT</p><h2>A separate DonateWorldz pathway.</h2><p>Davis Family support is kept separate from Reagan &amp; Children, Community Impact and Support JayJayTeamDev.</p></div><div class="button-row"><a class="button primary" href="${donation.davis.page}" target="_blank" rel="noopener noreferrer">Open Davis Family Support</a><a class="button secondary" href="https://donateworldz.com" target="_blank" rel="noopener noreferrer">Open DonateWorldz</a></div></section>`;
  oneWorldzHome = insertOnce(oneWorldzHome, acknowledgementMarker, davisSection, "OneWorldz acknowledgements");
}
oneWorldzHome = oneWorldzHome.replaceAll("Three separated support pathways", "Four separated support pathways");
await write("oneworldz/index.html", oneWorldzHome);

let donateSitemap = await read("donateworldz/sitemap.xml");
donateSitemap = addSitemapUrl(donateSitemap, donation.davis.page);
await write("donateworldz/sitemap.xml", donateSitemap);

let cryptoSitemap = await read("cryptoworldz/sitemap.xml");
cryptoSitemap = addSitemapUrl(cryptoSitemap, "https://cryptoworldz.xyz/support/davis-family/");
await write("cryptoworldz/sitemap.xml", cryptoSitemap);

const donateCommunity = await read("donateworldz/community-impact/index.html");
const oneWorldzCommunity = await read("oneworldz/community-support/index.html");
const donateFacebookCount = (donateCommunity.match(/https:\/\/(?:www\.)?facebook\.com\//gi) || []).length;
const oneWorldzFacebookCount = (oneWorldzCommunity.match(/https:\/\/(?:www\.)?facebook\.com\//gi) || []).length;
if (donateFacebookCount !== 35) throw new Error(`DonateWorldz Community Impact must contain exactly 35 Facebook destinations; found ${donateFacebookCount}`);
if (oneWorldzFacebookCount !== 35) throw new Error(`OneWorldz Community Support must contain exactly 35 Facebook destinations; found ${oneWorldzFacebookCount}`);
if (!donateCommunity.includes(donation.community.stripe)) throw new Error("Community Impact Stripe destination missing");
if (!(await read("donateworldz/reagan-children/index.html")).includes(donation.reagan.stripe)) throw new Error("Reagan Stripe destination missing");
if (!(await read("donateworldz/jayjayteamdev/index.html")).includes(donation.jayjay.stripe)) throw new Error("JayJayTeamDev Stripe destination missing");
if (!donateDavis.includes(donation.davis.stripe)) throw new Error("Davis Family Stripe destination missing");

const stripeDestinations = Object.values(donation).map((stream) => stream.stripe);
if (new Set(stripeDestinations).size !== 4) throw new Error("Donation Stripe destinations must be four unique live links");

const bankClaim = "This support stream has a separate Stripe payment destination and separate Stripe records. Cause-specific bank payout routing is shown as active only after the verified destination bank account is connected in Stripe.";
const htmlFiles = (await listFiles(distRoot)).filter((file) => file.endsWith(".html"));
for (const file of htmlFiles) {
  let html = await read(file);
  html = html
    .replaceAll("This humanitarian support stream has its own Stripe destination, associated bank settlement configuration and separate records.", bankClaim)
    .replaceAll("This community support stream has its own Stripe destination, associated bank settlement configuration and separate records.", bankClaim)
    .replaceAll("Three separated support pathways", "Four separated support pathways");
  if (/gofund\.me|gofundme/i.test(html)) throw new Error(`GoFundMe reference remains in built HTML: ${file}`);
  for (const match of html.matchAll(/href="(https?:\/\/[^"#]+)"/g)) {
    const url = new URL(match[1]);
    if (url.protocol !== "https:") throw new Error(`Non-HTTPS external link in ${file}: ${url.href}`);
  }
  await write(file, html);
}

const report = {
  generated_at: new Date().toISOString(),
  streams: {
    reagan_children: donation.reagan,
    community_impact: donation.community,
    davis_family: donation.davis,
    jayjayteamdev: donation.jayjay
  },
  community_facebook_destinations: 35,
  community_directory_pages_verified: [
    "https://oneworldz.com/community-support/",
    "https://donateworldz.com/community-impact/"
  ],
  stripe_destinations_unique: true,
  stripe_optional_managed_payments_disabled: true,
  stripe_automatic_tax_disabled_for_donation_links: true,
  stripe_invoice_creation_disabled_for_donation_links: true,
  stripe_account_payout_schedule: "daily",
  stripe_connected_bank_destinations_observed: 1,
  cause_specific_bank_payout_routing_active: false,
  cause_specific_bank_payout_activation_requirement: "Connect and verify a separate eligible Stripe payout bank destination/account for each support stream before claiming direct bank separation.",
  gofundme_references_in_static_build: 0,
  public_bank_credentials_stored: false
};
await write("donateworldz/donation-separation-report.json", `${JSON.stringify(report, null, 2)}\n`);

console.log("Donation separation finalized: 4 unique Stripe destinations, Davis Family added, 35 Facebook destinations verified, GoFundMe absent from static HTML, and bank-routing claims kept exact.");
