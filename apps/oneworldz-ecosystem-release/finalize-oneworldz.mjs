import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { links, officialDirectory, supportDirectory } from "./site-data.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, "source");
const target = path.join(root, "dist", "ecosystem", "oneworldz");
const homeFile = path.join(target, "index.html");
const supportFile = path.join(target, "community-support", "index.html");
const visualCssSource = path.join(source, "oneworldz-visual.css");
const visualCssTarget = path.join(target, "assets", "css", "oneworldz-visual.css");
const previewDir = path.join(target, "assets", "previews");

const previewAssets = [
  [path.join(source, "assets", "desktop", "purple-diamond-crew", "action-team.png"), "purple-diamond-crew.png"],
  [path.join(source, "assets", "support", "desktop", "community-impact-emblem-desktop.webp"), "donateworldz.webp"],
  [path.join(source, "assets", "desktop", "humanitarian", "action-creates-smiles-banner.png"), "foodworldz.png"],
  [path.join(source, "assets", "desktop", "tokens", "robin-hood-law.png"), "law-oneworldz.png"],
  [path.join(source, "assets", "desktop", "oneworldz", "little-legend.png"), "learn-oneworldz.png"],
  [path.join(source, "assets", "desktop", "oneworldz", "oneworldz-master.png"), "partnerships.png"],
  [path.join(source, "assets", "desktop", "humanitarian", "action-creates-smiles-banner.png"), "help-the-people.png"],
  [path.join(source, "assets", "desktop", "cryptoworldz", "zed-command-centre.png"), "cryptoworldz.png"],
  [path.join(source, "assets", "desktop", "humanitarian", "action-creates-smiles-banner.png"), "community-impact-background.png"]
];

const destinationPreviews = [
  [links.purpleDiamondCrew, "/assets/previews/purple-diamond-crew.png", "Purple Diamond Crew on-the-ground action preview"],
  [links.donateWorldz, "/assets/previews/donateworldz.webp", "DonateWorldz support preview"],
  [links.foodWorldz, "/assets/previews/foodworldz.png", "FoodWorldz humanitarian action preview"],
  [links.oneWorldzLaw, "/assets/previews/law-oneworldz.png", "Law.OneWorldz preview"],
  [links.learnWorldz, "/assets/previews/learn-oneworldz.png", "Learn.OneWorldz preview"],
  ["#partnerships", "/assets/previews/partnerships.png", "OneWorldz partnerships and sponsors preview"],
  ["#movement", "/assets/previews/help-the-people.png", "2026 to 2030 Help the People movement preview"],
  [links.cryptoworldz, "/assets/previews/cryptoworldz.png", "CryptoWorldz preview"]
];

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const external = (href) => /^https?:\/\//.test(href) ? ' target="_blank" rel="noopener noreferrer"' : "";

function injectStylesheet(html) {
  if (html.includes('/assets/css/oneworldz-visual.css')) return html;
  return html.replace("</head>", '<link rel="stylesheet" href="/assets/css/oneworldz-visual.css"></head>');
}

function injectPreviewMeta(html, { title, description, canonical, image, imageAlt }) {
  if (html.includes('property="og:image"')) return html;
  const tags = [
    '<meta property="og:site_name" content="OneWorldz">',
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    `<meta name="twitter:image" content="${image}">`,
    `<meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}">`,
    `<meta property="og:url" content="${canonical}">`
  ].join("");
  html = html.replace(/<meta property="og:url" content="[^"]+">/g, "");
  return html.replace("</head>", `${tags}</head>`);
}

function addDestinationPreview(html, href, image, alt) {
  const destinationsStart = html.indexOf('id="destinations"');
  if (destinationsStart < 0) throw new Error("OneWorldz destinations section missing");
  const hrefNeedle = `href="${href}"`;
  const hrefIndex = html.indexOf(hrefNeedle, destinationsStart);
  if (hrefIndex < 0) throw new Error(`OneWorldz destination link missing: ${href}`);
  const openStart = html.lastIndexOf('<a class="profile-card', hrefIndex);
  const openEnd = html.indexOf(">", hrefIndex);
  if (openStart < destinationsStart || openEnd < 0) throw new Error(`OneWorldz preview card opening tag missing: ${href}`);

  let opening = html.slice(openStart, openEnd + 1);
  if (!opening.includes("destination-preview-card")) {
    opening = opening.replace('class="profile-card', 'class="profile-card destination-preview-card');
    html = html.slice(0, openStart) + opening + html.slice(openEnd + 1);
  }

  const adjustedOpenEnd = openStart + opening.length - 1;
  const copyIndex = html.indexOf('<span class="profile-copy">', adjustedOpenEnd);
  if (copyIndex < 0) throw new Error(`OneWorldz preview card copy missing: ${href}`);
  const previewMarkup = `<span class="destination-preview" aria-hidden="true"><img src="${image}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"></span>`;
  if (!html.slice(adjustedOpenEnd + 1, copyIndex).includes('class="destination-preview"')) {
    html = html.slice(0, copyIndex) + previewMarkup + html.slice(copyIndex);
  }
  return html;
}

function officialDirectorySection() {
  const cards = officialDirectory.map((entry, index) => `<a class="official-directory-card" href="${entry.url}"${external(entry.url)}><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(entry.role)}</small><em>${escapeHtml(entry.url.replace(/^https?:\/\//, ""))}</em></a>`).join("");
  return `<section class="section section-dark official-directory" id="official-directory"><div class="section-heading"><p class="eyebrow">ONEWORLDZ OFFICIAL WEBSITE DIRECTORY</p><h2>One connected ecosystem. One trusted directory.</h2><p>Save these addresses. They are the owner-designated public destinations for the OneWorldz and CryptoWorldz ecosystem. A listed address is not a claim that every planned feature is already active.</p></div><div class="official-directory-grid">${cards}</div></section>`;
}

function supportDirectorySection() {
  const cards = supportDirectory.map((entry, index) => `<a class="official-directory-card support-directory-card" href="${entry.url}"${external(entry.url)}><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(entry.name)}</strong><small>OneWorldz Full Support™</small><em>${escapeHtml(entry.url.replace(/^https?:\/\//, ""))}</em></a>`).join("");
  return `<section class="section support-directory" id="support-directory"><div class="section-heading"><p class="eyebrow">SUPPORT • ACTION • FOOD</p><h2>Every support pathway stays clear and separate.</h2><p>Reagan &amp; Children, the 35-destination Community Support directory, Community Impact, JayJayTeamDev support and FoodWorldz each keep their own purpose and destination.</p></div><div class="official-directory-grid">${cards}</div></section>`;
}

function injectOfficialSections(html) {
  if (html.includes('id="official-directory"')) return html;
  const acknowledgement = html.indexOf('<section class="section" id="acknowledgements">');
  const alternateAcknowledgement = html.indexOf('<section class="section section-dark" id="acknowledgements">');
  const pos = acknowledgement >= 0 ? acknowledgement : alternateAcknowledgement;
  if (pos < 0) throw new Error("OneWorldz acknowledgements insertion point missing");
  const sections = `${officialDirectorySection()}${supportDirectorySection()}`;
  return html.slice(0, pos) + sections + html.slice(pos);
}

function verifyHashLinks(html, pageName) {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  const hashes = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
  for (const hash of hashes) {
    if (!ids.has(hash)) throw new Error(`${pageName} broken local hash link: #${hash}`);
  }
}

async function listFiles(dir, rel = "") {
  const entries = await readdir(path.join(dir, rel), { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(dir, child));
    else out.push(child.split(path.sep).join("/"));
  }
  return out.sort();
}

const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");

await mkdir(path.dirname(visualCssTarget), { recursive: true });
await mkdir(previewDir, { recursive: true });
await cp(visualCssSource, visualCssTarget);
for (const [from, filename] of previewAssets) await cp(from, path.join(previewDir, filename));

let home = await readFile(homeFile, "utf8");
home = home.replace(
  '<body style="--accent:#4da3ff;--accent-2:#b763ff">',
  '<body class="oneworldz-blue-white" style="--accent:#4da3ff;--accent-2:#ffffff;background:#061328;color:#ffffff">'
);
if (!home.includes('class="oneworldz-blue-white"')) throw new Error("OneWorldz blue/white theme marker missing");
home = home.replace(
  '<h1>OneWorldz One Vision</h1>',
  '<h1 class="visually-hidden-page-title" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0">OneWorldz One Vision</h1>'
);
if (!home.includes('class="visually-hidden-page-title"')) throw new Error("OneWorldz duplicate visible title suppression missing");
home = injectStylesheet(home);
home = injectPreviewMeta(home, {
  title: "OneWorldz | OneWorldz One Vision",
  description: "OneWorldz Full Support connects people, humanitarian action, food, learning, public-interest ideas, donations, partnerships and on-the-ground impact.",
  canonical: "https://oneworldz.com/",
  image: "https://oneworldz.com/assets/desktop/oneworldz/oneworldz-master.png",
  imageAlt: "OneWorldz One Vision humanitarian gateway"
});
for (const [href, image, alt] of destinationPreviews) home = addDestinationPreview(home, href, image, alt);
home = injectOfficialSections(home);

if (!home.includes("little-legend.webp")) throw new Error("Little Legend mobile / future scholar lead visual missing from OneWorldz");
if (!home.includes('href="/community-support/"')) throw new Error("Dedicated Community Support route missing from OneWorldz");
if (!home.includes("2026–2030 HELP THE PEOPLE MOVEMENT")) throw new Error("2026–2030 Help the People movement missing from OneWorldz");
if ((home.match(/class="destination-preview"/g) || []).length !== destinationPreviews.length) throw new Error("Every OneWorldz destination card must have a visual preview");
for (const entry of officialDirectory) if (!home.includes(`href="${entry.url}"`)) throw new Error(`Official directory link missing: ${entry.url}`);
for (const entry of supportDirectory) if (!home.includes(`href="${entry.url}"`)) throw new Error(`Support directory link missing: ${entry.url}`);
if (!home.includes(links.impactBased)) throw new Error("Owner-designated ImpactBased URL missing");
if (!home.includes(links.nextBigCoin)) throw new Error("Next Big Coin official portal missing");
if (!home.includes(links.zedCommandCentre)) throw new Error("Zed Command Centre official address missing");
if (!home.includes(links.raaiiidd)) throw new Error("CryptoWorldz Raaiiidd Team address missing");
verifyHashLinks(home, "OneWorldz home");
await writeFile(homeFile, home, "utf8");

let support = await readFile(supportFile, "utf8");
support = injectStylesheet(support);
support = injectPreviewMeta(support, {
  title: "Community Support | OneWorldz Full Support",
  description: "35 verified Community Impact Facebook support destinations from the OneWorldz registry.",
  canonical: "https://oneworldz.com/community-support/",
  image: "https://oneworldz.com/assets/previews/community-impact-background.png",
  imageAlt: "OneWorldz Community Support humanitarian action"
});
if (!support.includes('class="community-support-page"')) throw new Error("Community Support page marker missing");
if (!support.includes('class="community-support-hero"')) throw new Error("Community Support hero missing");
verifyHashLinks(support, "Community Support");
await writeFile(supportFile, support, "utf8");

const manifestPath = path.join(target, "release-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const files = [];
for (const file of await listFiles(target)) {
  if (file === "release-manifest.json") continue;
  const bytes = await readFile(path.join(target, file));
  files.push({ path: `/${file}`, bytes: bytes.byteLength, sha256: hash(bytes) });
}
manifest.generated_at = new Date().toISOString();
manifest.files = files;
manifest.oneworldz_visual_contract = {
  pages: ["/", "/community-support/"],
  theme: "BLUE_WHITE",
  desktop_mobile_backgrounds: true,
  home_full_background_picture: true,
  community_support_full_background_image: true,
  destination_preview_cards: destinationPreviews.length,
  official_directory_entries: officialDirectory.length,
  support_directory_entries: supportDirectory.length,
  duplicate_visible_title_removed: true,
  open_graph_preview_images: true,
  twitter_large_image_previews: true,
  local_hash_links_verified: true
};
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log(`OneWorldz finalised: blue/white visual treatment, ${officialDirectory.length} official directory entries, ${supportDirectory.length} support pathways and verified desktop/mobile links.`);