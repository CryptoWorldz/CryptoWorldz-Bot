import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exactAltVisual, resolvedVisual } from "./visual-image-map.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, "source");
const dist = path.join(root, "dist", "ecosystem");
const one = path.join(dist, "oneworldz");
const donate = path.join(dist, "donateworldz");
const crypto = path.join(dist, "cryptoworldz");

const links = Object.freeze({
  reaganStripe: "https://donate.stripe.com/14A6oHcG61Ox87Y0Xb0kE01",
  communityStripe: "https://donate.stripe.com/9B67sLgWm78R73U35j0kE02",
  davisStripe: "https://donate.stripe.com/dRm8wPdKa0Kt2NE7lz0kE03",
  jayjayStripe: "https://buy.stripe.com/6oUeVd9tU0Ktewm0Xb0kE00",
  jayjayFacebook: "https://www.facebook.com/share/1AmeMtWBPd/"
});

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const footer = '<footer class="site-footer vision-footer"><div><strong>Created with the Vision</strong><span>When Someone say\'s You can\'t Change the World 🌐 just Say “Why can\'t I?”</span></div></footer>';

async function read(file) { return readFile(file, "utf8"); }
async function write(file, text) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, text, "utf8"); }
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(file)); else out.push(file);
  }
  return out;
}
function injectBeforeMainEnd(html, marker, section) {
  if (html.includes(marker)) return html;
  const pos = html.lastIndexOf("</main>");
  if (pos < 0) throw new Error(`Missing </main> for ${marker}`);
  return html.slice(0, pos) + section + html.slice(pos);
}
function injectHead(html, marker, value) {
  if (html.includes(marker)) return html;
  if (!html.includes("</head>")) throw new Error(`Missing </head> for ${marker}`);
  return html.replace("</head>", `${value}\n</head>`);
}
function addSitemapUrl(xml, url) {
  if (xml.includes(`<loc>${url}</loc>`)) return xml;
  if (!xml.includes("</urlset>")) throw new Error("Sitemap closing tag missing");
  return xml.replace("</urlset>", `  <url><loc>${url}</loc></url>\n</urlset>`);
}
function claimStandaloneLinkPreviews(html, pageName) {
  return html.replace(/<img\b([^>]*?)src="(\/assets\/link-previews\/[^"]+)"([^>]*?)alt="([^"]*)"([^>]*)>/g, (whole, before, src, middle, alt, after) => {
    const key = exactAltVisual[alt];
    if (!key) throw new Error(`${pageName}: link preview has no exact visual mapping: ${alt} (${src})`);
    const visual = resolvedVisual(key, "media");
    let updated = `<img${before}src="${visual.desktop}"${middle}alt="${alt}"${after}>`;
    return updated.replace(/\sdata-exact-visual="[^"]*"/g, "").replace(">", ` data-exact-visual="${visual.key}">`);
  });
}

function oneWorldzPage({ title, description, canonical, nav, main, accent = "#65b9ff", accent2 = "#ffffff" }) {
  const navMarkup = nav.map(([label, href]) => `<a href="${href}">${escapeHtml(label)}</a>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#061328"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${canonical}"><link rel="stylesheet" href="/assets/css/site.css"></head><body style="--accent:${accent};--accent-2:${accent2}"><a class="skip-link" href="#main-content">Skip to content</a><header class="site-header"><a class="site-brand" href="/" aria-label="OneWorldz Back to Home"><span class="brand-profile text-brand" aria-hidden="true"><b>W</b></span><span><strong>OneWorldz</strong><small>One Vision</small></span></a><button class="menu-button" type="button" aria-expanded="false" aria-controls="site-menu"><span></span><span></span><span></span><b>Menu</b></button><nav class="site-menu" id="site-menu" aria-label="Primary navigation">${navMarkup}</nav></header><button class="menu-backdrop" type="button" aria-label="Close menu" tabindex="-1"></button><main id="main-content">${main}</main>${footer}<script src="/assets/js/site.js" defer></script></body></html>`;
}

const stewardship = oneWorldzPage({
  title: "Public Stewardship & Peace Dividend | OneWorldz",
  description: "A nonpartisan OneWorldz public proposal for transparent taxpayer oversight, humanitarian alternatives and peaceful public stewardship.",
  canonical: "https://oneworldz.com/public-stewardship/",
  accent: "#7f5cff",
  accent2: "#65b9ff",
  nav: [["Home","/"],["Humanity Newsroom","/humanity-news/"],["DonateWorldz","https://donateworldz.com/"]],
  main: `<section class="hero"><picture class="production-picture hero-art"><source media="(max-width:720px)" srcset="/assets/desktop/humanitarian/action-creates-smiles-banner.png"><img src="/assets/desktop/humanitarian/action-creates-smiles-banner.png" alt="OneWorldz humanitarian action and public stewardship vision" loading="eager" decoding="async"></picture><div class="hero-copy"><p class="eyebrow">PUBLIC STEWARDSHIP • PEACE DIVIDEND PROPOSAL</p><h1>Taxpayer money should be visible, accountable and measured against human need.</h1><p>OneWorldz proposes a lawful, nonpartisan public-stewardship model: transparent budgets, independent public auditing, democratic oversight and a permanent comparison between military expenditure and life-saving alternatives.</p><div class="button-row"><a class="button primary" href="#proposal">Read the proposal</a><a class="button secondary" href="/humanity-news/">Evidence &amp; Context</a></div></div></section><section class="section" id="proposal"><div class="section-heading"><p class="eyebrow">THE PROPOSAL</p><h2>Public oversight without pretending to be a government.</h2><p>A worldwide public board could publish evidence, audit commitments, compare spending choices and represent participating communities. It would only gain legal authority where democratic processes, legislation, treaties or institutions lawfully grant that authority.</p></div><div class="info-grid"><article><span>01</span><h3>See the money</h3><p>Publish accessible public spending data, contracts, outcomes and long-term costs.</p></article><article><span>02</span><h3>Compare the choices</h3><p>For major spending decisions, show credible humanitarian, health, food, water, housing and education alternatives alongside them.</p></article><article><span>03</span><h3>Keep power accountable</h3><p>Use independent audit, conflict-of-interest rules, public minutes, corrections and transparent appointment or election procedures.</p></article></div></section><section class="section section-dark"><div class="section-heading"><p class="eyebrow">PEACE DIVIDEND</p><h2>The aim is not to rewrite facts. It is to make the human choice impossible to ignore.</h2><p>Countries have legitimate security obligations and different legal systems. OneWorldz advocates stronger public scrutiny of military spending and much greater investment in preventing hunger and avoidable human suffering. The proposal is advocacy, not an existing governmental mandate.</p></div></section><section class="section"><div class="legal-band"><strong>Democratic boundary</strong><p>OneWorldz does not claim authority over any government, taxpayer, military or public budget. Any binding oversight body must be created through lawful democratic and institutional processes. Public evidence, peaceful advocacy and voluntary participation remain the operating boundary.</p></div></section>`
});

const newsroom = oneWorldzPage({
  title: "Humanity Newsroom | OneWorldz",
  description: "OneWorldz Humanity Newsroom standards: verified facts, sources, human impact, spending context, alternatives, uncertainty and corrections.",
  canonical: "https://oneworldz.com/humanity-news/",
  nav: [["Home","/"],["Public Stewardship","/public-stewardship/"]],
  main: `<section class="section"><div class="section-heading"><p class="eyebrow">HUMANITY NEWSROOM</p><h1>Do not rewrite the facts. Rewrite what the public is allowed to see around them.</h1><p>Every OneWorldz news item must separate verified reporting from analysis, opinion and proposal. The goal is more context, not manufactured certainty.</p></div><div class="info-grid"><article><span>01</span><h3>What happened?</h3><p>State the event, date, place and primary evidence. Link the source.</p></article><article><span>02</span><h3>Who paid the human price?</h3><p>Show credible effects on civilians, children, families, health, food, housing and public services where evidence exists.</p></article><article><span>03</span><h3>What did it cost?</h3><p>Put public spending and long-term commitments in understandable context without inventing comparisons.</p></article><article><span>04</span><h3>What else was possible?</h3><p>Present evidence-based alternatives and competing policy views fairly.</p></article><article><span>05</span><h3>What is uncertain?</h3><p>Label disputed claims, estimates and incomplete information clearly.</p></article><article><span>06</span><h3>Corrections stay visible.</h3><p>If OneWorldz gets something wrong, correct it openly rather than silently rewriting history.</p></article></div></section><section class="section section-dark"><div class="legal-band"><strong>Editorial boundary</strong><p>News, evidence, analysis and advocacy must be labelled separately. OneWorldz may argue for humanitarian priorities, but it must not fabricate facts or present a proposal as an existing law, mandate or public authority.</p></div></section>`
});

await write(path.join(one, "public-stewardship", "index.html"), stewardship);
await write(path.join(one, "humanity-news", "index.html"), newsroom);

let oneHome = await read(path.join(one, "index.html"));
oneHome = injectBeforeMainEnd(oneHome, 'id="public-stewardship-path"', `<section class="section section-dark" id="public-stewardship-path"><div class="section-heading"><p class="eyebrow">PUBLIC STEWARDSHIP • PEACE DIVIDEND</p><h2>Make public spending answer to the public.</h2><p>Explore a lawful, transparent proposal for independent public oversight, humanitarian alternatives and evidence-first accountability.</p></div><div class="button-row"><a class="button primary" href="/public-stewardship/">Open Public Stewardship</a><a class="button secondary" href="/humanity-news/">Open Humanity Newsroom</a></div></section>`);
await write(path.join(one, "index.html"), oneHome);
let oneSitemap = await read(path.join(one, "sitemap.xml"));
oneSitemap = addSitemapUrl(oneSitemap, "https://oneworldz.com/public-stewardship/");
oneSitemap = addSitemapUrl(oneSitemap, "https://oneworldz.com/humanity-news/");
await write(path.join(one, "sitemap.xml"), oneSitemap);

const jayjayMission = `<section class="section section-dark" id="jayjay-mission-truth"><div class="section-heading"><p class="eyebrow">JAYJAYTEAMDEV • MISSION SUPPORT</p><h2>Support the person building the system — with the allocation stated plainly.</h2><p>JayJayTeamDev is organising OneWorldz around a public fellowship goal: reduce child hunger and avoidable suffering by connecting people, projects, evidence, technology and direct support. This payment stream is not represented as a direct donation to a child or charity.</p></div><div class="legal-band"><strong>Current live Stripe allocation</strong><p>Net support after Stripe fees is recorded 50% JayJayTeamDev personal support and 50% OneWorldz operations. The OneWorldz operations waterfall supports essential bills, platform access and the systems needed to operate the mission. Reagan &amp; Children and Community Impact retain their own separate payment links and records.</p></div><div class="button-row"><a class="button primary" href="${links.jayjayStripe}" target="_blank" rel="noopener noreferrer">Support JayJayTeamDev + OneWorldz</a><a class="button secondary" href="${links.jayjayFacebook}" target="_blank" rel="noopener noreferrer">JayJay TeamDev on Facebook</a></div></section>`;
let donateHome = await read(path.join(donate, "index.html"));
donateHome = injectBeforeMainEnd(donateHome, 'id="jayjay-mission-highlight"', jayjayMission.replace('id="jayjay-mission-truth"','id="jayjay-mission-highlight"'));
await write(path.join(donate, "index.html"), donateHome);
let jayjayPage = await read(path.join(donate, "jayjayteamdev", "index.html"));
jayjayPage = injectBeforeMainEnd(jayjayPage, 'id="jayjay-mission-truth"', jayjayMission);
await write(path.join(donate, "jayjayteamdev", "index.html"), jayjayPage);

let reaganPage = await read(path.join(donate, "reagan-children", "index.html"));
reaganPage = injectBeforeMainEnd(reaganPage, 'id="reagan-direct-impact-truth"', `<section class="section section-dark" id="reagan-direct-impact-truth"><div class="section-heading"><p class="eyebrow">REAGAN &amp; CHILDREN • DIRECT IMPACT STREAM</p><h2>One purpose. One live Stripe destination. Separate records.</h2><p>This page exists for the Reagan &amp; Children support stream. It does not share its Stripe payment link with Community Impact, Davis Family or JayJayTeamDev support.</p></div><div class="button-row"><a class="button primary" href="${links.reaganStripe}" target="_blank" rel="noopener noreferrer">Support Reagan &amp; Children securely</a><a class="button secondary" href="/">All DonateWorldz Support</a></div><div class="legal-band"><strong>Payment truth</strong><p>Stripe processes the payment. DonateWorldz does not store card or bank credentials. Any bank-payout claim must match the payout destination actually verified in Stripe.</p></div></section>`);
await write(path.join(donate, "reagan-children", "index.html"), reaganPage);

const registry = JSON.parse(await read(path.join(source, "community-support-profiles.json")));
const profiles = Array.isArray(registry.profiles) ? [...registry.profiles].sort((a,b)=>Number(a.display_order)-Number(b.display_order)) : [];
if (profiles.length !== 35) throw new Error(`Canonical Community Impact requires 35 Facebook URLs; found ${profiles.length}`);
const cards = profiles.map((row) => `<article class="community-support-card" data-display-order="${Number(row.display_order)}" data-preview-status="pending"><span class="number">${String(row.display_order).padStart(2,"0")}</span><h2>Verified Community Support Link</h2><p class="community-preview-description">Exact Facebook destination preserved. Verified Facebook preview metadata appears automatically only after it is confirmed.</p><div class="meta"><span>Facebook</span><span class="community-preview-state">Preview pending verification</span></div><a href="${escapeHtml(row.facebook_url)}" target="_blank" rel="noopener noreferrer">Open Exact Facebook Destination</a></article>`).join("");
let communityPage = await read(path.join(donate, "community-impact", "index.html"));
if (!communityPage.includes('id="community-support-grid"')) communityPage = communityPage.replace(/<div class="profile-directory">[\s\S]*?<\/div><\/section>/, `<div class="community-support-grid" id="community-support-grid">${cards}</div></section>`);
if (!communityPage.includes('id="community-support-grid"')) throw new Error("DonateWorldz Community Impact grid replacement failed");
communityPage = injectHead(communityPage, "/assets/css/community-support.css", '<link rel="stylesheet" href="/assets/css/community-support.css">');
if (!communityPage.includes('/assets/js/community-support.js')) communityPage = communityPage.replace("</body>", '<script src="/assets/js/community-support.js" defer></script></body>');
communityPage = injectBeforeMainEnd(communityPage, 'id="facebook-preview-contract"', `<section class="section section-dark" id="facebook-preview-contract"><div class="section-heading"><p class="eyebrow">35 EXACT FACEBOOK DESTINATIONS</p><h2>Real preview or no preview. Never an invented person.</h2><p>Every card keeps its exact Facebook URL. A title, description or image is shown only when the live registry marks that metadata verified. Restricted or unavailable Facebook data remains clearly labelled instead of being guessed.</p></div></section>`);
await write(path.join(donate, "community-impact", "index.html"), communityPage);
await mkdir(path.join(donate, "assets", "css"), { recursive: true });
await mkdir(path.join(donate, "assets", "js"), { recursive: true });
await cp(path.join(source, "community-support.css"), path.join(donate, "assets", "css", "community-support.css"));
await cp(path.join(source, "community-support.js"), path.join(donate, "assets", "js", "community-support.js"));

for (const file of (await walk(crypto)).filter((entry) => entry.endsWith(".html"))) {
  const before = await read(file);
  const after = claimStandaloneLinkPreviews(before, path.relative(crypto, file));
  if (after !== before) await write(file, after);
}

const allStripe = [links.reaganStripe,links.communityStripe,links.davisStripe,links.jayjayStripe];
if (new Set(allStripe).size !== 4) throw new Error("Canonical Stripe links are not unique");
for (const [file,url] of [[path.join(donate,"reagan-children","index.html"),links.reaganStripe],[path.join(donate,"community-impact","index.html"),links.communityStripe],[path.join(donate,"davis-family","index.html"),links.davisStripe],[path.join(donate,"jayjayteamdev","index.html"),links.jayjayStripe]]) if (!(await read(file)).includes(url)) throw new Error(`Live Stripe destination missing from ${file}`);
if ((communityPage.match(/https:\/\/(?:www\.)?facebook\.com\//gi)||[]).length !== 35) throw new Error("DonateWorldz Community Impact must expose exactly 35 Facebook destinations");

console.log("Canonical mission finalizer: mobile-safe stewardship + Humanity Newsroom + Stripe truth + 35 Facebook preview contract + central visual ownership complete.");
