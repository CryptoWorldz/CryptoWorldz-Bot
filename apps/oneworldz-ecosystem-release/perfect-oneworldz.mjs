import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { officialDirectory, supportDirectory } from "./site-data.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const sourceAssets = path.join(root, "source", "assets");
const target = path.join(root, "dist", "ecosystem", "oneworldz");
const cssDir = path.join(target, "assets", "css");
const perfectCssPath = path.join(cssDir, "oneworldz-perfect.css");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

const assets = Object.freeze({
  heroDesktop: "desktop/oneworldz/oneworldz-master.png",
  heroMobile: "mobile/little-legend.webp",
  littleLegend: "desktop/oneworldz/little-legend.png",
  gpt: "desktop/oneworldz/oneworldz-gpt.png",
  pdc: "desktop/purple-diamond-crew/action-team.png",
  donate: "support/desktop/community-impact-emblem-desktop.webp",
  reagan: "support/desktop/reagan-children-emblem-desktop.webp",
  jayjay: "support/desktop/jayjayteamdev-emblem-desktop.webp",
  davis: "support/davis-family/davis-family-hero.webp",
  food: "desktop/humanitarian/action-creates-smiles-banner.png",
  law: "desktop/tokens/robin-hood-law.png",
  crypto: "desktop/cryptoworldz/zed-command-centre.png",
  cryptoTeam: "desktop/cryptoworldz/command-centre-leader-team.png",
  impact: "desktop/cryptoworldz/impactbased.png",
  sol: "mobile/solworldz.webp",
  robin: "mobile/robinworldz.webp",
  nextBigCoin: "mobile/next-big-coin.webp"
});

const publicAsset = (relative) => `/assets/${relative}`;
const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const officialImages = new Map([
  ["https://oneworldz.com", [assets.heroDesktop, "OneWorldz One Vision"]],
  ["https://cryptoworldz.xyz", [assets.crypto, "CryptoWorldz Command Centre"]],
  ["https://solworldz.xyz", [assets.sol, "SolWorldz"]],
  ["https://purplediamondcrew.com", [assets.pdc, "Purple Diamond Crew on the ground"]],
  ["https://robinworldz.xyz", [assets.robin, "RobinWorldz"]],
  ["https://nextbigcoin.oneworldz.com", [assets.nextBigCoin, "Next Big Coin"]],
  ["https://cryptobotz.cryptoworldz.xyz", [assets.crypto, "Zed Command Centre"]],
  ["https://impactbased.oneworldz.com", [assets.impact, "ImpactBased"]],
  ["https://learn.oneworldz.com", [assets.gpt, "LearnWorldz"]],
  ["https://law.oneworldz.com", [assets.law, "OneWorldz Law"]],
  ["https://donateworldz.com", [assets.donate, "DonateWorldz"]],
  ["https://foodworldz.com", [assets.food, "FoodWorldz"]],
  ["https://t.me/CryptoWorldzRaaiiiddTeam", [assets.cryptoTeam, "CryptoWorldz Raaiiidd Team"]]
]);

const supportImages = new Map([
  ["https://donateworldz.com/reagan-children/", [assets.reagan, "Reagan and Children support"]],
  ["https://oneworldz.com/community-support/", [assets.donate, "OneWorldz Community Support"]],
  ["https://donateworldz.com", [assets.donate, "DonateWorldz"]],
  ["https://donateworldz.com/community-impact/", [assets.donate, "Community Impact"]],
  ["https://donateworldz.com/support-jayjayteamdev/", [assets.jayjay, "Support JayJayTeamDev"]],
  ["https://foodworldz.com", [assets.food, "FoodWorldz"]]
]);

const routeCards = Object.freeze([
  ["/community-support/", assets.donate, "Community Support", "35 verified support destinations"],
  ["/sponsor-apply/", assets.heroDesktop, "Sponsor / Apply", "Partnership and contribution pathway"],
  ["/heroes/", assets.littleLegend, "OneWorldz Heroes", "Recognise real work with evidence"],
  ["/gpt/", assets.gpt, "OneWorldz GPT", "Open the full visual AI guide"],
  ["/directory/", assets.heroDesktop, "Official Directory", "Every OneWorldz destination in one place"],
  ["/acknowledgements/", assets.littleLegend, "Acknowledgements", "People, communities and contributors"],
  ["https://donateworldz.com/davis-family/", assets.davis, "Davis Family", "Dedicated DonateWorldz support pathway"]
]);

const sectionArt = Object.freeze([
  ["movement", assets.food, "2026 to 2030 Help the People movement"],
  ["partnerships", assets.heroDesktop, "OneWorldz partnerships and sponsors"],
  ["people", assets.littleLegend, "OneWorldz people who inspire action"],
  ["crypto-separation", assets.crypto, "CryptoWorldz separate blockchain home"],
  ["official-channels", assets.heroDesktop, "Official OneWorldz channels"],
  ["davis-family-support", assets.davis, "Davis Family dedicated support"],
  ["gpt-display-path", assets.gpt, "OneWorldz GPT display"]
]);

const routeLeadArt = new Map([
  ["community-support/index.html", [assets.donate, "OneWorldz Community Support"]],
  ["sponsor-apply/index.html", [assets.heroDesktop, "OneWorldz Sponsor and Apply"]],
  ["heroes/index.html", [assets.littleLegend, "OneWorldz Heroes"]],
  ["directory/index.html", [assets.heroDesktop, "OneWorldz Official Directory"]],
  ["acknowledgements/index.html", [assets.littleLegend, "OneWorldz Acknowledgements"]]
]);

async function exists(file) {
  return stat(file).then(() => true).catch(() => false);
}

async function copyAsset(relative) {
  const source = path.join(sourceAssets, relative);
  const destination = path.join(target, "assets", relative);
  if (!(await exists(source))) throw new Error(`Approved OneWorldz asset missing: ${relative}`);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination);
}

async function walk(dir, rel = "") {
  const out = [];
  for (const entry of await readdir(path.join(dir, rel), { withFileTypes: true })) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...await walk(dir, child));
    else out.push(child.split(path.sep).join("/"));
  }
  return out.sort();
}

function injectCss(html) {
  const href = "/assets/css/oneworldz-perfect.css";
  if (html.includes(href)) return html;
  return html.replace("</head>", `<link rel="stylesheet" href="${href}"></head>`);
}

function cleanBody(html) {
  html = html.replace(/(<body\b[^>]*class=")([^"]*)(")/, (whole, start, classes, end) => {
    const cleaned = classes.split(/\s+/).filter(Boolean).filter((token) => token !== "full-background-experience");
    return `${start}${cleaned.join(" ")}${end}`;
  });
  if (/<body\b/.test(html) && !/<body\b[^>]*data-oneworldz-perfect=/.test(html)) {
    html = html.replace(/<body\b([^>]*)>/, '<body$1 data-oneworldz-perfect="true">');
  }
  return html;
}

function replaceHomeHero(html) {
  const exact = `<picture class="production-picture hero-art oneworldz-master-hero" data-fit="contain" data-visual-required="true" data-visual-contract="oneworldz-main-image"><source media="(max-width:720px)" srcset="${publicAsset(assets.heroMobile)}"><img src="${publicAsset(assets.heroDesktop)}" alt="OneWorldz One Vision official main artwork" loading="eager" decoding="async" fetchpriority="high"></picture>`;
  const heroStart = html.indexOf('<section class="hero"');
  if (heroStart < 0) throw new Error("OneWorldz home hero missing");
  const pictureStart = html.indexOf("<picture", heroStart);
  const pictureEnd = pictureStart >= 0 ? html.indexOf("</picture>", pictureStart) : -1;
  if (pictureStart < 0 || pictureEnd < 0) throw new Error("OneWorldz home hero picture missing");
  return html.slice(0, pictureStart) + exact + html.slice(pictureEnd + "</picture>".length);
}

function markDestinationPreviews(html) {
  return html.replace(/<span class="destination-preview"(?![^>]*data-fit)/g, '<span class="destination-preview" data-fit="contain" data-visual-required="true"');
}

function visualArt(image, alt, className = "perfect-card-art") {
  return `<span class="${className}" data-fit="contain"><img src="${publicAsset(image)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"></span>`;
}

function decorateDirectoryHref(html, href, image, alt) {
  const needle = `href="${href}"`;
  let cursor = 0;
  for (;;) {
    const hrefIndex = html.indexOf(needle, cursor);
    if (hrefIndex < 0) break;
    const openStart = html.lastIndexOf("<a ", hrefIndex);
    const openEnd = html.indexOf(">", hrefIndex);
    if (openStart < 0 || openEnd < 0) break;
    const opening = html.slice(openStart, openEnd + 1);
    if (!opening.includes("official-directory-card")) {
      cursor = openEnd + 1;
      continue;
    }
    if (opening.includes("data-perfect-card")) {
      cursor = openEnd + 1;
      continue;
    }
    let replacement = opening.replace('class="official-directory-card', 'class="official-directory-card visual-directory-card');
    replacement = replacement.replace(/>$/, ' data-perfect-card="true" data-visual-required="true">');
    const art = visualArt(image, alt, "official-card-art");
    html = html.slice(0, openStart) + replacement + art + html.slice(openEnd + 1);
    cursor = openStart + replacement.length + art.length;
  }
  return html;
}

function addSectionArt(html, id, image, alt) {
  if (html.includes(`data-perfect-section-art="${id}"`)) return html;
  const idNeedle = `id="${id}"`;
  const idIndex = html.indexOf(idNeedle);
  if (idIndex < 0) return html;
  const openStart = html.lastIndexOf("<section", idIndex);
  const openEnd = html.indexOf(">", idIndex);
  if (openStart < 0 || openEnd < 0) return html;
  const art = `<div class="perfect-section-art" data-perfect-section-art="${id}" data-fit="contain" data-visual-required="true"><img src="${publicAsset(image)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"></div>`;
  return html.slice(0, openEnd + 1) + art + html.slice(openEnd + 1);
}

function addVisualHub(html) {
  if (html.includes('id="oneworldz-visual-link-hub"')) return html;
  const cards = routeCards.map(([href, image, title, copy]) => {
    const external = /^https?:\/\//.test(href) ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a class="perfect-link-card" href="${href}"${external} data-visual-required="true"><span class="perfect-link-art" data-fit="contain"><img src="${publicAsset(image)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async"></span><span class="perfect-link-copy"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(copy)}</small><b aria-hidden="true">Open →</b></span></a>`;
  }).join("");
  const section = `<section class="section section-dark oneworldz-visual-link-hub" id="oneworldz-visual-link-hub"><div class="section-heading"><p class="eyebrow">ONEWORLDZ VISUAL DIRECTORY</p><h2>See it. Know it. Open the right place.</h2><p>Every major OneWorldz page below carries its approved visual so the destination is clear before you tap.</p></div><div class="perfect-link-grid">${cards}</div></section>`;
  const official = html.indexOf('id="official-directory"');
  if (official >= 0) {
    const sectionStart = html.lastIndexOf("<section", official);
    if (sectionStart >= 0) return html.slice(0, sectionStart) + section + html.slice(sectionStart);
  }
  const ack = html.indexOf('id="acknowledgements"');
  const pos = ack >= 0 ? html.lastIndexOf("<section", ack) : html.lastIndexOf("</main>");
  if (pos < 0) throw new Error("OneWorldz visual hub insertion point missing");
  return html.slice(0, pos) + section + html.slice(pos);
}

function addRouteLead(html, image, alt) {
  if (html.includes('data-perfect-route-lead="true"')) return html;
  const main = '<main id="main-content">';
  const pos = html.indexOf(main);
  if (pos < 0) throw new Error(`OneWorldz route main missing for ${alt}`);
  const art = `<section class="perfect-route-lead" data-perfect-route-lead="true" data-visual-required="true"><div class="perfect-route-lead-art" data-fit="contain"><img src="${publicAsset(image)}" alt="${escapeHtml(alt)}" loading="eager" decoding="async" fetchpriority="high"></div></section>`;
  return html.slice(0, pos + main.length) + art + html.slice(pos + main.length);
}

function replaceGptHero(html) {
  const heroStart = html.indexOf('<section class="hero"');
  if (heroStart < 0) return html;
  const pictureStart = html.indexOf("<picture", heroStart);
  const pictureEnd = pictureStart >= 0 ? html.indexOf("</picture>", pictureStart) : -1;
  if (pictureStart < 0 || pictureEnd < 0) return html;
  const exact = `<picture class="production-picture hero-art oneworldz-gpt-hero" data-fit="contain" data-visual-required="true"><img src="/assets/oneworldz-gpt/oneworldz-gpt.png" alt="OneWorldz GPT official artwork" loading="eager" decoding="async" fetchpriority="high"></picture>`;
  return html.slice(0, pictureStart) + exact + html.slice(pictureEnd + "</picture>".length);
}

const perfectCss = `
/* OneWorldz visual master contract: exact artwork, readable layouts, zero image distortion. */
body[data-oneworldz-perfect="true"]{background:radial-gradient(circle at 50% -12%,rgba(69,137,255,.13),transparent 34rem),#020817!important;color:#fff}
body[data-oneworldz-perfect="true"]::before,body[data-oneworldz-perfect="true"]::after{display:none!important;background:none!important}
body[data-oneworldz-perfect="true"] main{background:transparent!important}
body[data-oneworldz-perfect="true"] .section{background:#020817!important}
body[data-oneworldz-perfect="true"] .section-dark{background:linear-gradient(180deg,#05142b,#020817)!important}
body[data-oneworldz-perfect="true"] .hero{display:grid!important;grid-template-columns:minmax(0,.92fr) minmax(420px,1.08fr)!important;align-items:center!important;gap:clamp(1.5rem,4vw,4rem)!important;min-height:0!important;padding:clamp(2rem,5vw,5rem) max(22px,calc((100vw - var(--content))/2))!important;background:linear-gradient(135deg,#020817,#061b38)!important;overflow:visible!important}
body[data-oneworldz-perfect="true"] .hero::after{display:none!important}
body[data-oneworldz-perfect="true"] .hero-copy{position:relative!important;grid-column:1!important;grid-row:1!important;align-self:center!important;width:auto!important;margin:0!important;padding:clamp(1.25rem,3vw,2.5rem)!important;border:1px solid rgba(101,185,255,.24);border-radius:1.1rem;background:rgba(2,12,30,.74)!important;box-shadow:0 24px 70px rgba(0,0,0,.28);backdrop-filter:blur(10px);text-shadow:none!important}
body[data-oneworldz-perfect="true"] .oneworldz-master-hero,body[data-oneworldz-perfect="true"] .oneworldz-gpt-hero{position:relative!important;inset:auto!important;grid-column:2!important;grid-row:1!important;width:100%!important;height:auto!important;max-width:760px!important;justify-self:center!important;border:1px solid rgba(101,185,255,.28)!important;border-radius:1.2rem!important;background:#01050d!important;box-shadow:0 24px 80px rgba(0,0,0,.38)!important;overflow:hidden!important}
body[data-oneworldz-perfect="true"] [data-fit="contain"] img,body[data-oneworldz-perfect="true"] img[data-fit="contain"]{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center!important;transform:none!important}
body[data-oneworldz-perfect="true"] .oneworldz-master-hero img,body[data-oneworldz-perfect="true"] .oneworldz-gpt-hero img{height:auto!important;max-height:min(76svh,820px)!important;object-fit:contain!important;background:#01050d!important}
body[data-oneworldz-perfect="true"] .destination-preview-card{grid-template-columns:minmax(190px,34%) minmax(0,1fr)!important;min-height:210px!important;background:linear-gradient(145deg,#071c39,#020b1d)!important}
body[data-oneworldz-perfect="true"] .destination-preview{display:grid!important;place-items:center!important;min-height:210px!important;padding:.65rem!important;background:#010713!important}
body[data-oneworldz-perfect="true"] .destination-preview img{min-height:0!important;object-fit:contain!important;object-position:center!important;border-radius:.55rem}
body[data-oneworldz-perfect="true"] .official-directory-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:1rem!important}
body[data-oneworldz-perfect="true"] .visual-directory-card{display:grid!important;grid-template-columns:1fr!important;grid-template-rows:190px auto auto auto!important;min-height:360px!important;padding:0 1.15rem 1.2rem!important;overflow:hidden!important;background:linear-gradient(145deg,#071b37,#020a1a)!important}
body[data-oneworldz-perfect="true"] .official-card-art{display:grid!important;place-items:center!important;width:calc(100% + 2.3rem)!important;height:190px!important;margin:0 -1.15rem .85rem!important;padding:.7rem!important;background:#010611!important;border-bottom:1px solid rgba(101,185,255,.2)}
body[data-oneworldz-perfect="true"] .visual-directory-card>span:not(.official-card-art){margin-top:.1rem}
body[data-oneworldz-perfect="true"] .perfect-section-art{display:grid;place-items:center;width:min(920px,100%);max-height:620px;margin:0 auto clamp(2rem,5vw,4rem);padding:clamp(.4rem,1.5vw,.8rem);border:1px solid rgba(101,185,255,.26);border-radius:1rem;background:#010611;box-shadow:0 22px 70px rgba(0,0,0,.28);overflow:hidden}
body[data-oneworldz-perfect="true"] .perfect-section-art img{width:100%!important;height:auto!important;max-height:600px!important;object-fit:contain!important}
body[data-oneworldz-perfect="true"] .perfect-link-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}
body[data-oneworldz-perfect="true"] .perfect-link-card{display:grid;grid-template-rows:220px 1fr;overflow:hidden;border:1px solid rgba(101,185,255,.28);border-radius:1rem;background:linear-gradient(145deg,#071c39,#020a1a);color:#fff;text-decoration:none;box-shadow:0 18px 50px rgba(0,0,0,.25)}
body[data-oneworldz-perfect="true"] .perfect-link-art{display:grid;place-items:center;padding:.75rem;background:#010611;border-bottom:1px solid rgba(101,185,255,.2)}
body[data-oneworldz-perfect="true"] .perfect-link-copy{display:grid;align-content:start;gap:.4rem;padding:1.1rem}
body[data-oneworldz-perfect="true"] .perfect-link-copy strong{font-family:Georgia,"Times New Roman",serif;font-size:1.45rem;color:#65b9ff}
body[data-oneworldz-perfect="true"] .perfect-link-copy small{color:#d7e9fb;font-size:.86rem;line-height:1.45}
body[data-oneworldz-perfect="true"] .perfect-link-copy b{margin-top:.4rem;color:#fff;font-size:.8rem}
body[data-oneworldz-perfect="true"] .perfect-route-lead{padding:clamp(1rem,3vw,2rem) max(18px,calc((100vw - var(--content))/2)) 0!important;background:#020817!important}
body[data-oneworldz-perfect="true"] .perfect-route-lead-art{display:grid;place-items:center;width:min(900px,100%);max-height:620px;margin:0 auto;padding:.7rem;border:1px solid rgba(101,185,255,.26);border-radius:1rem;background:#010611;overflow:hidden}
body[data-oneworldz-perfect="true"] .perfect-route-lead-art img{width:100%!important;height:auto!important;max-height:600px!important;object-fit:contain!important}
body[data-oneworldz-perfect="true"] .oneworldz-gpt-reference img{object-fit:contain!important;object-position:center!important}
@media(max-width:1100px){body[data-oneworldz-perfect="true"] .official-directory-grid,body[data-oneworldz-perfect="true"] .perfect-link-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:720px){body[data-oneworldz-perfect="true"] .hero{grid-template-columns:1fr!important;padding:1rem 14px 2.25rem!important;gap:1rem!important}body[data-oneworldz-perfect="true"] .oneworldz-master-hero,body[data-oneworldz-perfect="true"] .oneworldz-gpt-hero{grid-column:1!important;grid-row:1!important;max-width:100%!important}body[data-oneworldz-perfect="true"] .hero-copy{grid-column:1!important;grid-row:2!important;padding:1.15rem!important}body[data-oneworldz-perfect="true"] .oneworldz-master-hero img,body[data-oneworldz-perfect="true"] .oneworldz-gpt-hero img{max-height:none!important}body[data-oneworldz-perfect="true"] .destination-preview-card{grid-template-columns:1fr!important;min-height:0!important}body[data-oneworldz-perfect="true"] .destination-preview{min-height:0!important;aspect-ratio:16/10!important;padding:.65rem!important}body[data-oneworldz-perfect="true"] .official-directory-grid,body[data-oneworldz-perfect="true"] .perfect-link-grid{grid-template-columns:1fr!important}body[data-oneworldz-perfect="true"] .visual-directory-card{grid-template-rows:220px auto auto auto!important;min-height:390px!important}body[data-oneworldz-perfect="true"] .official-card-art{height:220px!important}body[data-oneworldz-perfect="true"] .perfect-link-card{grid-template-rows:minmax(220px,58vw) 1fr}body[data-oneworldz-perfect="true"] .perfect-section-art,body[data-oneworldz-perfect="true"] .perfect-route-lead-art{max-height:none!important}body[data-oneworldz-perfect="true"] .perfect-section-art img,body[data-oneworldz-perfect="true"] .perfect-route-lead-art img{max-height:none!important}}
`;

await mkdir(cssDir, { recursive: true });
await writeFile(perfectCssPath, perfectCss.trimStart(), "utf8");

const requiredAssets = new Set(Object.values(assets));
for (const [image] of [...officialImages.values(), ...supportImages.values()]) requiredAssets.add(image);
for (const [, image] of routeCards) requiredAssets.add(image);
for (const [, image] of sectionArt) requiredAssets.add(image);
for (const [image] of routeLeadArt.values()) requiredAssets.add(image);
for (const relative of requiredAssets) await copyAsset(relative);

const homePath = path.join(target, "index.html");
let home = await readFile(homePath, "utf8");
home = injectCss(cleanBody(home));
home = replaceHomeHero(home);
home = markDestinationPreviews(home);
for (const [href, [image, alt]] of officialImages) home = decorateDirectoryHref(home, href, image, alt);
for (const [href, [image, alt]] of supportImages) home = decorateDirectoryHref(home, href, image, alt);
for (const [id, image, alt] of sectionArt) home = addSectionArt(home, id, image, alt);
home = addVisualHub(home);
await writeFile(homePath, home, "utf8");

for (const [relative, [image, alt]] of routeLeadArt) {
  const file = path.join(target, relative);
  if (!(await exists(file))) throw new Error(`Required OneWorldz route missing: ${relative}`);
  let html = await readFile(file, "utf8");
  html = injectCss(cleanBody(html));
  html = addRouteLead(html, image, alt);
  await writeFile(file, html, "utf8");
}

const gptPath = path.join(target, "gpt", "index.html");
let gpt = await readFile(gptPath, "utf8");
gpt = injectCss(cleanBody(gpt));
gpt = replaceGptHero(gpt);
if (!gpt.includes("data-gpt-open")) throw new Error("OneWorldz GPT open control missing");
await writeFile(gptPath, gpt, "utf8");

for (const relative of (await walk(target)).filter((file) => file.endsWith(".html"))) {
  const file = path.join(target, relative);
  let html = await readFile(file, "utf8");
  const updated = injectCss(cleanBody(html));
  if (updated !== html) await writeFile(file, updated, "utf8");
}

const finalHome = await readFile(homePath, "utf8");
const bodyTag = finalHome.match(/<body\b[^>]*>/)?.[0] || "";
if (!bodyTag.includes('data-oneworldz-perfect="true"')) throw new Error("OneWorldz final visual marker missing");
if (bodyTag.includes("full-background-experience")) throw new Error("Repeated full-background experience survived OneWorldz perfect layer");
for (const token of [publicAsset(assets.heroDesktop), publicAsset(assets.heroMobile), "/assets/css/oneworldz-perfect.css", 'id="oneworldz-visual-link-hub"']) {
  if (!finalHome.includes(token)) throw new Error(`OneWorldz perfect visual token missing: ${token}`);
}
for (const entry of officialDirectory) if (!finalHome.includes(`href="${entry.url}"`)) throw new Error(`Official destination missing: ${entry.url}`);
for (const entry of supportDirectory) if (!finalHome.includes(`href="${entry.url}"`)) throw new Error(`Support destination missing: ${entry.url}`);
const visualRequiredCount = (finalHome.match(/data-visual-required="true"/g) || []).length;
if (visualRequiredCount < 25) throw new Error(`OneWorldz visual coverage too low: ${visualRequiredCount}`);

for (const htmlRelative of (await walk(target)).filter((file) => file.endsWith(".html"))) {
  const html = await readFile(path.join(target, htmlRelative), "utf8");
  for (const match of html.matchAll(/(?:src|srcset)="(\/assets\/[^"?#]+)"/g)) {
    const assetPath = path.join(target, match[1].slice(1));
    if (!(await exists(assetPath))) throw new Error(`Broken OneWorldz local image reference: ${htmlRelative} -> ${match[1]}`);
  }
}

const manifestPath = path.join(target, "release-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const files = [];
for (const relative of await walk(target)) {
  if (relative === "release-manifest.json") continue;
  const bytes = await readFile(path.join(target, relative));
  files.push({ path: `/${relative}`, bytes: bytes.byteLength, sha256: hash(bytes) });
}
manifest.generated_at = new Date().toISOString();
manifest.files = files;
manifest.oneworldz_perfect_visual_contract = {
  master_site: true,
  exact_main_image: publicAsset(assets.heroDesktop),
  exact_mobile_image: publicAsset(assets.heroMobile),
  image_fit: "CONTAIN_NO_STRETCH_NO_CROP",
  repeated_full_page_background_removed: true,
  official_directory_visuals: officialDirectory.length,
  support_directory_visuals: supportDirectory.length,
  visual_link_hub_cards: routeCards.length,
  visual_required_elements: visualRequiredCount,
  gpt_visual_and_launcher_required: true,
  rollout_state: "ONEWORLDZ_ONLY"
};
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log(JSON.stringify({
  event: "oneworldz_perfect_visual_master",
  result: "PASS",
  master_image: publicAsset(assets.heroDesktop),
  mobile_image: publicAsset(assets.heroMobile),
  official_directory_visuals: officialDirectory.length,
  support_directory_visuals: supportDirectory.length,
  visual_link_hub_cards: routeCards.length,
  visual_required_elements: visualRequiredCount,
  other_static_sites_modified: 0
}, null, 2));
