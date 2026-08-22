import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const sourceAssets = path.join(root, "source", "assets");
const distRoot = path.join(root, "dist", "ecosystem");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const pools = {
  oneworldz: [
    ["oneworldz/little-legend.png", "little-legend.webp"],
    ["oneworldz/oneworldz-master.png", "little-legend.webp"],
    ["purple-diamond-crew/action-team.png", "hope-chest.webp"],
    ["tokens/global-impact-alliance.png", "global-impact-alliance.webp"],
    ["tokens/uganda-unite.png", "global-impact-alliance.webp"],
    ["oneworldz/oneworldz-gpt.png", "five-leaders-alliance.webp"],
    ["oneworldz/reagan-kauja.png", "little-legend.webp"]
  ],
  cryptoworldz: [
    ["cryptoworldz/zed-command-centre.png", "blockchain-portal.webp"],
    ["cryptoworldz/command-centre-five.png", "five-leaders-alliance.webp"],
    ["cryptoworldz/grace.png", "five-leaders-master.webp"],
    ["cryptoworldz/zed-auto.png", "five-leaders-alliance.webp"],
    ["cryptoworldz/impactbased.png", "cryptoworldz-basedbid-partnership.webp"],
    ["cryptoworldz/we-need-you.png", "five-leaders-alliance.webp"]
  ],
  purplediamondcrew: [
    ["purple-diamond-crew/action-team.png", "hope-chest.webp"],
    ["purple-diamond-crew/banner.png", "hope-chest.webp"],
    ["purple-diamond-crew/hope-chest.png", "hope-chest.webp"]
  ],
  impactbased: [
    ["cryptoworldz/impactbased.png", "cryptoworldz-basedbid-partnership.webp"],
    ["cryptoworldz/cryptoworldz-basedbid.webp", "cryptoworldz-basedbid-partnership.webp"]
  ],
  "law-oneworldz": [["tokens/robin-hood-law.png", "robin-hood-law.webp"]],
  "learn-oneworldz": [
    ["oneworldz/oneworldz-gpt.png", "five-leaders-alliance.webp"],
    ["oneworldz/little-legend.png", "little-legend.webp"]
  ],
  hodlergalaxy: [["tokens/next-big-coin.png", "next-big-coin.webp"]],
  hodlerworldz: [["tokens/next-big-coin.png", "next-big-coin.webp"]],
  donateworldz: [
    ["tokens/global-impact-alliance.png", "global-impact-alliance.webp"],
    ["oneworldz/reagan-kauja.png", "little-legend.webp"],
    ["purple-diamond-crew/action-team.png", "hope-chest.webp"],
    ["oneworldz/hope-chest.png", "hope-chest.webp"]
  ],
  foodworldz: [
    ["purple-diamond-crew/action-team.png", "hope-chest.webp"],
    ["tokens/global-impact-alliance.png", "global-impact-alliance.webp"],
    ["oneworldz/reagan-kauja.png", "little-legend.webp"]
  ]
};

const chainKeys = new Set(["solworldz","ethworldz","baseworldz","bnbworldz","xrpworldz","suiworldz","hyperworldz","robinworldz"]);
const oneworldzSectionArt = {
  partnerships: ["tokens/global-impact-alliance.png", "global-impact-alliance.webp"],
  "crypto-separation": ["cryptoworldz/zed-command-centre.png", "blockchain-portal.webp"],
  "davis-family-support": ["oneworldz/hope-chest.png", "hope-chest.webp"],
  "launch-network": ["oneworldz/oneworldz-master.png", "little-legend.webp"],
  "heroes-pathway": ["purple-diamond-crew/action-team.png", "hope-chest.webp"],
  acknowledgements: ["oneworldz/little-legend.png", "little-legend.webp"],
  "community-support": ["tokens/global-impact-alliance.png", "global-impact-alliance.webp"],
  "official-directory": ["oneworldz/oneworldz-master.png", "little-legend.webp"],
  "support-directory": ["oneworldz/reagan-kauja.png", "little-legend.webp"]
};

function poolFor(key) {
  if (chainKeys.has(key)) return [[`blockchains/${key}.png`, `${key}.webp`]];
  return pools[key] || pools.oneworldz;
}

function picture(art, className, alt = "") {
  const [desktop, mobile] = art;
  return `<picture class="${className}"><source media="(max-width: 720px)" srcset="/assets/mobile/${mobile}"><img src="/assets/desktop/${desktop}" alt="${alt.replaceAll('"','&quot;')}" loading="lazy" decoding="async"></picture>`;
}

function decorateContainerArticles(html, pool, stats) {
  let cursor = 0;
  return html.replace(/<div class="([^"]*\binfo-grid\b[^"]*)">([\s\S]*?)<\/div>/g, (whole, classes, body) => {
    const replaced = body.replace(/<article([^>]*)>([\s\S]*?)<\/article>/g, (article, attrs, inside) => {
      if (/<picture\b|<img\b/.test(inside)) return article;
      const art = pool[cursor++ % pool.length];
      stats.cardImages += 1;
      return `<article${attrs}>${picture(art, "jayjay-card-art", "OneWorldz approved visual")} ${inside}</article>`;
    });
    return `<div class="${classes}">${replaced}</div>`;
  });
}

function decorateLinkGrid(html, classToken, pool, stats) {
  let cursor = 0;
  const rx = new RegExp(`<div class="([^\"]*\\b${classToken}\\b[^\"]*)">([\\s\\S]*?)<\\/div>`, "g");
  return html.replace(rx, (whole, classes, body) => {
    const replaced = body.replace(/<a([^>]*)>([\s\S]*?)<\/a>/g, (link, attrs, inside) => {
      if (/<picture\b|<img\b/.test(inside)) return link;
      const art = pool[cursor++ % pool.length];
      stats.linkImages += 1;
      return `<a${attrs}>${picture(art, "jayjay-card-art", "OneWorldz approved destination visual")}${inside}</a>`;
    });
    return `<div class="${classes}">${replaced}</div>`;
  });
}

function replaceSupportTextArt(html, pool, stats) {
  return html.replace(/<div class="support-emblem text-art"[^>]*>[\s\S]*?<\/div>/g, () => {
    stats.textArtReplaced += 1;
    return picture(pool[0], "support-emblem jayjay-support-art", "Dedicated OneWorldz support artwork");
  });
}

function decorateBareHeroes(html, pool, stats) {
  let cursor = 0;
  return html.replace(/<section class="([^"]*\bhero(?:\s|\b)[^"]*)"([^>]*)>([\s\S]*?)<\/section>/g, (whole, classes, attrs, body) => {
    if (/<picture\b|<img\b/.test(body)) return whole;
    const art = pool[cursor++ % pool.length];
    stats.heroImages += 1;
    return `<section class="${classes}"${attrs}>${picture(art, "production-picture hero-art jayjay-hero-art", "Approved ecosystem hero artwork")}${body}</section>`;
  });
}

function decorateSectionById(html, id, art, stats) {
  const openRx = new RegExp(`<section class="([^"]*)" id="${id}">`);
  const match = html.match(openRx);
  if (!match) return html;
  const start = match.index;
  const openEnd = start + match[0].length;
  const close = html.indexOf("</section>", openEnd);
  if (close < 0) return html;
  const body = html.slice(openEnd, close);
  if (body.includes("jayjay-section-art")) return html;
  const visual = picture(art, "jayjay-section-art", "Approved OneWorldz section artwork");
  stats.sectionImages += 1;
  return html.slice(0, openEnd) + visual + html.slice(openEnd);
}

function injectCss(html) {
  if (html.includes('/assets/css/jayjay-full-images.css')) return html;
  return html.replace("</head>", '<link rel="stylesheet" href="/assets/css/jayjay-full-images.css"></head>');
}

const css = `
.jayjay-card-art{display:block;width:100%;aspect-ratio:1/1;overflow:hidden;border-radius:18px;margin:0 0 16px;background:#07182f}
.jayjay-card-art img{display:block;width:100%;height:100%;object-fit:cover;object-position:center}
.jayjay-section-art{display:block;width:min(100%,760px);aspect-ratio:16/10;overflow:hidden;border-radius:24px;margin:0 auto 28px;background:#07182f}
.jayjay-section-art img{display:block;width:100%;height:100%;object-fit:cover;object-position:center}
.jayjay-hero-art{display:block;width:100%;overflow:hidden}
.jayjay-hero-art img{display:block;width:100%;height:auto;max-height:720px;object-fit:contain;object-position:center;background:#061328}
.jayjay-support-art{display:block;overflow:hidden;border-radius:24px;aspect-ratio:1/1}
.jayjay-support-art img{width:100%;height:100%;display:block;object-fit:cover;object-position:center}
.launch-grid a,.official-directory-grid a{overflow:hidden}
.launch-grid a small,.launch-grid a strong,.launch-grid a span,.official-directory-grid a small,.official-directory-grid a strong,.official-directory-grid a em{display:block;max-width:100%;overflow-wrap:anywhere;word-break:break-word}
@media(max-width:720px){
  .jayjay-section-art{aspect-ratio:1/1;margin-bottom:22px}
  .jayjay-hero-art img{max-height:none}
  .info-grid article .jayjay-card-art{margin-bottom:14px}
}
`;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

async function ensureAssets(targetRoot, htmlFiles) {
  const refs = new Set();
  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    for (const m of html.matchAll(/(?:src|srcset)="\/assets\/(desktop|mobile)\/([^"?#]+)"/g)) refs.add(`${m[1]}/${m[2]}`);
  }
  for (const rel of refs) {
    const source = path.join(sourceAssets, rel);
    const dest = path.join(targetRoot, "assets", rel);
    if (await stat(dest).then(()=>true).catch(()=>false)) continue;
    if (!(await stat(source).then(()=>true).catch(()=>false))) throw new Error(`Approved image source missing: ${rel}`);
    await mkdir(path.dirname(dest), { recursive: true });
    await cp(source, dest);
  }
}

async function refreshManifest(targetRoot, imageStats) {
  const manifestPath = path.join(targetRoot, "release-manifest.json");
  if (!(await stat(manifestPath).then(()=>true).catch(()=>false))) return;
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const files = [];
  for (const file of await walk(targetRoot)) {
    const rel = path.relative(targetRoot, file).split(path.sep).join("/");
    if (rel === "release-manifest.json") continue;
    const bytes = await readFile(file);
    files.push({ path: `/${rel}`, bytes: bytes.byteLength, sha256: sha256(bytes) });
  }
  manifest.generated_at = new Date().toISOString();
  manifest.files = files.sort((a,b)=>a.path.localeCompare(b.path));
  manifest.jayjay_real_image_slots = { ...imageStats, contract: "NO_TEXT_ONLY_VISUAL_SLOTS" };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

const results = {};
for (const target of (await readdir(distRoot, { withFileTypes: true })).filter(x=>x.isDirectory())) {
  const key = target.name;
  const targetRoot = path.join(distRoot, key);
  const pool = poolFor(key);
  const stats = { pagesChanged:0, cardImages:0, linkImages:0, heroImages:0, sectionImages:0, textArtReplaced:0 };
  const cssDir = path.join(targetRoot, "assets", "css");
  await mkdir(cssDir, { recursive: true });
  await writeFile(path.join(cssDir, "jayjay-full-images.css"), css.trimStart(), "utf8");

  const htmlFiles = (await walk(targetRoot)).filter(file=>file.endsWith(".html"));
  for (const file of htmlFiles) {
    const original = await readFile(file, "utf8");
    let html = original;
    html = replaceSupportTextArt(html, pool, stats);
    html = decorateBareHeroes(html, pool, stats);
    html = decorateContainerArticles(html, pool, stats);
    html = decorateLinkGrid(html, "official-directory-grid", pool, stats);
    html = decorateLinkGrid(html, "launch-grid", pool, stats);

    if (key === "oneworldz" && path.basename(file) === "index.html" && path.dirname(file) === targetRoot) {
      for (const [id, art] of Object.entries(oneworldzSectionArt)) html = decorateSectionById(html, id, art, stats);
    }

    html = injectCss(html);
    if (html !== original) {
      await writeFile(file, html, "utf8");
      stats.pagesChanged += 1;
    }
  }

  await ensureAssets(targetRoot, htmlFiles);
  await refreshManifest(targetRoot, stats);
  results[key] = stats;
}

const oneHome = await readFile(path.join(distRoot, "oneworldz", "index.html"), "utf8");
for (const id of ["partnerships","crypto-separation","davis-family-support","launch-network","heroes-pathway","acknowledgements","community-support","official-directory","support-directory"]) {
  if (oneHome.includes(`id="${id}"`)) {
    const pos = oneHome.indexOf(`id="${id}"`);
    const end = oneHome.indexOf("</section>", pos);
    const section = oneHome.slice(pos, end);
    if (!/<picture\b|<img\b/.test(section)) throw new Error(`OneWorldz visual section still text-only: ${id}`);
  }
}
if (/class="launch-grid"[\s\S]*?https:\/\/x\.com\/OneWorldzX/.test(oneHome) && !oneHome.includes("jayjay-full-images.css")) throw new Error("OneWorldz launch network visual CSS missing");

console.log(JSON.stringify({ event:"real_image_slot_pass", result:"PASS", targets:results }, null, 2));
