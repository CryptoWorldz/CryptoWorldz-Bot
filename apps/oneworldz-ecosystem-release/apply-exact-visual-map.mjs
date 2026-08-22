import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productionTargets } from "./production-targets.mjs";
import { chainVisualByTarget, exactAltVisual, resolvedVisual, rootHeroByTarget, visualForExactPath } from "./visual-image-map.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const sourceAssets = path.join(root, "source", "assets");
const distRoot = path.join(root, "dist", "ecosystem");
const cssHref = "/assets/css/exact-visual-map.css";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const css = `
/* Exact visual map: image identity is assigned before this CSS. */
picture.exact-visual{display:block;max-width:100%;overflow:hidden}
picture.exact-visual img{display:block;max-width:100%;margin:0 auto;object-position:center}
picture.exact-visual[data-visual-fit="contain"] img{object-fit:contain!important}
picture.exact-visual[data-visual-fit="cover"] img{object-fit:cover!important}
picture.exact-visual[data-visual-shape="square"]{aspect-ratio:1/1}
picture.exact-visual[data-visual-shape="square"] img{width:100%!important;height:100%!important;object-fit:contain!important}
picture.exact-visual.brand-profile{width:58px!important;height:58px!important;flex:0 0 58px!important;border-radius:50%!important}
picture.exact-visual.profile-art{width:100%!important;height:100%!important;min-height:0!important}
picture.exact-visual.support-emblem,picture.exact-visual.support-profile{aspect-ratio:1/1;max-width:320px;margin-inline:auto}
.media-row>picture.exact-visual[data-visual-shape="wide"]{width:min(100%,760px)}
.media-row>picture.exact-visual[data-visual-shape="landscape"]{width:min(100%,680px)}
.media-row>picture.exact-visual[data-visual-shape="square"]{width:min(100%,560px)}
.media-row>picture.exact-visual[data-visual-shape="portrait"]{width:min(100%,500px)}
.media-row>picture.exact-visual img{width:100%!important;height:auto!important;max-height:680px!important;object-fit:contain!important}
.hero>picture.exact-visual.hero-art,.compact-hero>picture.exact-visual.hero-art{max-width:100%}
.hero>picture.exact-visual.hero-art img,.compact-hero>picture.exact-visual.hero-art img{width:100%!important;height:100%!important;max-height:none!important;object-fit:contain!important;object-position:center!important}
.destination-preview img[data-exact-visual]{width:100%!important;height:100%!important;object-fit:contain!important;object-position:center!important}
@media(max-width:720px){
  picture.exact-visual.brand-profile{width:44px!important;height:44px!important;flex-basis:44px!important}
  .media-row>picture.exact-visual{width:100%!important;max-width:100%!important}
  .media-row>picture.exact-visual img{max-height:none!important}
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

function attr(markup, name) {
  return markup.match(new RegExp(`${name}="([^"]*)"`))?.[1] || "";
}

function classes(markup) {
  return new Set(attr(markup, "class").split(/\s+/).filter(Boolean));
}

function sectionAt(html, offset) {
  const before = html.slice(0, offset);
  const open = before.lastIndexOf("<section");
  const close = before.lastIndexOf("</section>");
  if (open < 0 || close > open) return "page";
  const tagEnd = html.indexOf(">", open);
  if (tagEnd < 0 || tagEnd > offset) return "page";
  const opening = html.slice(open, tagEnd + 1);
  return attr(opening, "id") || "section";
}

function slotFromPicture(opening, counters, section) {
  const set = classes(opening);
  if (set.has("hero-art")) return "hero";
  if (set.has("brand-profile")) return "brand";
  if (set.has("support-emblem")) return "support-emblem";
  if (set.has("support-profile")) return "support-profile";
  if (set.has("profile-art")) return "profile";
  const key = section || "page";
  const next = (counters.get(key) || 0) + 1;
  counters.set(key, next);
  return `media-${next}`;
}

function publicToSource(publicPath) {
  if (!publicPath.startsWith("/assets/")) return null;
  return path.join(sourceAssets, publicPath.slice("/assets/".length));
}

async function ensureAsset(targetRoot, publicPath) {
  const source = publicToSource(publicPath);
  if (!source) throw new Error(`Unsupported visual path: ${publicPath}`);
  if (!(await stat(source).then(() => true).catch(() => false))) {
    throw new Error(`Approved visual source missing: ${publicPath}`);
  }
  const destination = path.join(targetRoot, publicPath.slice(1));
  if (await stat(destination).then(() => true).catch(() => false)) return;
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination);
}

function addPictureAttrs(opening, resolved, section, slot) {
  let out = opening;
  const set = classes(opening);
  if (!set.has("exact-visual")) {
    if (opening.includes('class="')) out = out.replace(/class="([^"]*)"/, 'class="$1 exact-visual"');
    else out = out.replace("<picture", '<picture class="exact-visual"');
  }
  for (const name of ["data-visual-key", "data-visual-section", "data-visual-slot", "data-visual-shape", "data-visual-fit"]) {
    out = out.replace(new RegExp(`\\s${name}="[^"]*"`, "g"), "");
  }
  return out.replace(">", ` data-visual-key="${resolved.key}" data-visual-section="${section}" data-visual-slot="${slot}" data-visual-shape="${resolved.shape}" data-visual-fit="${resolved.fit}">`);
}

function replacePictureSources(whole, resolved, section, slot) {
  let updated = whole.replace(/^<picture\b[^>]*>/, (opening) => addPictureAttrs(opening, resolved, section, slot));
  if (/<source\b[^>]*srcset="[^"]+"[^>]*>/.test(updated)) {
    updated = updated.replace(/(<source\b[^>]*srcset=")[^"]+("[^>]*>)/, `$1${resolved.mobile}$2`);
  } else {
    updated = updated.replace(/(<img\b)/, `<source media="(max-width: 720px)" srcset="${resolved.mobile}">$1`);
  }
  if (!/<img\b[^>]*src="[^"]+"[^>]*>/.test(updated)) throw new Error(`Visual slot ${section}/${slot} has no image`);
  updated = updated.replace(/(<img\b[^>]*src=")[^"]+("[^>]*>)/, `$1${resolved.desktop}$2`);
  return updated;
}

function resolveKey({ target, route, slot, alt, desktop, mobile }) {
  if (route === "index.html" && slot === "hero" && rootHeroByTarget[target]) return rootHeroByTarget[target];
  if (exactAltVisual[alt]) return exactAltVisual[alt];
  return visualForExactPath(desktop) || visualForExactPath(mobile);
}

function addCssLink(html) {
  if (html.includes(cssHref)) return html;
  if (!html.includes("</head>")) throw new Error("Generated page has no closing head tag");
  return html.replace("</head>", `  <link rel="stylesheet" href="${cssHref}">\n</head>`);
}

function replaceCurrentWorldTextArt(html, target) {
  const key = chainVisualByTarget[target];
  if (!key) return html;
  const resolved = resolvedVisual(key, "profile");
  return html.replace(
    /<div class="production-picture text-art ([^"]*\bprofile-art\b[^"]*)" role="img" aria-label="([^"]*)">[\s\S]*?<strong>([^<]+)<\/strong>[\s\S]*?<\/div>/g,
    (whole, extraClasses, alt) => `<picture class="production-picture ${extraClasses} exact-visual" data-visual-key="${resolved.key}" data-visual-section="worldz" data-visual-slot="profile" data-visual-shape="square" data-visual-fit="contain"><source media="(max-width: 720px)" srcset="${resolved.mobile}"><img src="${resolved.desktop}" alt="${alt}" loading="lazy" decoding="async"></picture>`
  );
}

function replaceStandalonePreviews(html, target, route, records) {
  return html.replace(/<img\b([^>]*?)src="([^"]+)"([^>]*?)alt="([^"]*)"([^>]*)>/g, (whole, before, src, middle, alt, after, offset) => {
    if (!whole.includes("/assets/previews/") && !whole.includes('class="destination-preview')) return whole;
    const key = exactAltVisual[alt];
    if (!key) throw new Error(`${target}/${route}: unmapped standalone visual alt: ${alt}`);
    const resolved = resolvedVisual(key, "media");
    const section = sectionAt(html, offset);
    records.push({ target, route, section, slot: "destination-preview", visual: resolved.key, desktop: resolved.desktop, mobile: resolved.mobile, shape: resolved.shape, fit: resolved.fit });
    let updated = `<img${before}src="${resolved.desktop}"${middle}alt="${alt}"${after}>`;
    updated = updated.replace(/\sdata-exact-visual="[^"]*"/g, "").replace(">", ` data-exact-visual="${resolved.key}">`);
    return updated;
  });
}

async function refreshManifest(targetRoot, stats) {
  const manifestPath = path.join(targetRoot, "release-manifest.json");
  if (!(await stat(manifestPath).then(() => true).catch(() => false))) return;
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const files = [];
  for (const file of await walk(targetRoot)) {
    const rel = path.relative(targetRoot, file).split(path.sep).join("/");
    if (rel === "release-manifest.json") continue;
    const bytes = await readFile(file);
    files.push({ path: `/${rel}`, bytes: bytes.byteLength, sha256: sha256(bytes) });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  manifest.files = files;
  manifest.exact_visual_map = stats;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

const packageText = await readFile(path.join(root, "package.json"), "utf8");
for (const forbidden of ["fill-real-image-slots.mjs", "apply-jayjay-images.mjs"]) {
  if (packageText.includes(forbidden)) throw new Error(`Forbidden legacy image pass remains in build chain: ${forbidden}`);
}
const backgroundText = await readFile(path.join(root, "apply-full-background-experience.mjs"), "utf8");
for (const forbidden of ["chooseArt(", "enforcePrimaryHero(", "heroPicture("]) {
  if (backgroundText.includes(forbidden)) throw new Error(`Layout layer still has image authority: ${forbidden}`);
}

const fleetRecords = [];
let totalPages = 0;
let totalPictures = 0;

for (const target of productionTargets) {
  const targetRoot = path.join(distRoot, target.key);
  const htmlFiles = (await walk(targetRoot)).filter((file) => file.endsWith(".html"));
  const cssDir = path.join(targetRoot, "assets", "css");
  await mkdir(cssDir, { recursive: true });
  await writeFile(path.join(cssDir, "exact-visual-map.css"), css.trimStart(), "utf8");
  const records = [];

  for (const file of htmlFiles) {
    totalPages += 1;
    const route = path.relative(targetRoot, file).split(path.sep).join("/");
    let html = await readFile(file, "utf8");
    html = replaceCurrentWorldTextArt(html, target.key);
    const originalForSections = html;
    const counters = new Map();

    html = html.replace(/<picture\b[^>]*>[\s\S]*?<\/picture>/g, (whole, offset) => {
      const opening = whole.match(/^<picture\b[^>]*>/)?.[0] || "<picture>";
      const source = whole.match(/<source\b[^>]*srcset="([^"]+)"[^>]*>/)?.[1] || "";
      const image = whole.match(/<img\b[^>]*src="([^"]+)"[^>]*>/)?.[1] || "";
      const alt = whole.match(/<img\b[^>]*alt="([^"]*)"[^>]*>/)?.[1] || "";
      const section = sectionAt(originalForSections, offset);
      const slot = slotFromPicture(opening, counters, section);
      const key = resolveKey({ target: target.key, route, slot, alt, desktop: image, mobile: source });
      if (!key) throw new Error(`${target.key}/${route}: unmapped picture at ${section}/${slot}; desktop=${image}; mobile=${source}; alt=${alt}`);
      const resolved = resolvedVisual(key, slot);
      records.push({ target: target.key, route, section, slot, visual: resolved.key, desktop: resolved.desktop, mobile: resolved.mobile, shape: resolved.shape, fit: resolved.fit });
      totalPictures += 1;
      return replacePictureSources(whole, resolved, section, slot);
    });

    html = replaceStandalonePreviews(html, target.key, route, records);
    html = addCssLink(html);

    for (const legacy of ["jayjay-card-art", "jayjay-section-art", "community-support-art"]) {
      if (html.includes(legacy)) throw new Error(`${target.key}/${route}: legacy automatic image class survived: ${legacy}`);
    }
    for (const opening of html.matchAll(/<picture\b[^>]*>/g)) {
      if (!opening[0].includes("data-visual-key=")) throw new Error(`${target.key}/${route}: picture survived without exact visual mapping`);
    }
    const withoutPictures = html.replace(/<picture\b[^>]*>[\s\S]*?<\/picture>/g, "");
    for (const image of withoutPictures.matchAll(/<img\b[^>]*src="(\/assets\/[^"]+)"[^>]*>/g)) {
      if (!image[0].includes("data-exact-visual=")) throw new Error(`${target.key}/${route}: standalone asset image survived without exact mapping: ${image[1]}`);
    }

    await writeFile(file, html, "utf8");
  }

  for (const record of records) {
    await ensureAsset(targetRoot, record.desktop);
    await ensureAsset(targetRoot, record.mobile);
  }

  const report = {
    target: target.key,
    domain: target.domain,
    pages: htmlFiles.length,
    visual_slots: records.length,
    records
  };
  await writeFile(path.join(targetRoot, "exact-visual-map.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
  await refreshManifest(targetRoot, { pages: htmlFiles.length, visual_slots: records.length, authority: "EXACT_ONLY_NO_POOL_NO_RANDOM_NO_FALLBACK" });
  fleetRecords.push(...records);
}

console.log(JSON.stringify({
  event: "exact_visual_map",
  result: "PASS",
  targets: productionTargets.length,
  pages: totalPages,
  pictures: totalPictures,
  visual_slots: fleetRecords.length,
  authority: "SITE_ROUTE_SECTION_SLOT_EXACT_ASSET"
}, null, 2));
