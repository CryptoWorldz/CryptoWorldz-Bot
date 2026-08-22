import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const sourceAssets = path.join(root, "source", "assets");
const distRoot = path.join(root, "dist", "ecosystem");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

// Exact identity map only. No pools. No cursor cycling. No fallback girl.
const WORLD_SQUARE = Object.freeze({
  SolWorldz: "solworldz.webp",
  EthWorldz: "ethworldz.webp",
  BaseWorldz: "baseworldz.webp",
  BNBWorldz: "bnbworldz.webp",
  XRPWorldz: "xrpworldz.webp",
  SuiWorldz: "suiworldz.webp",
  HyperWorldz: "hyperworldz.webp",
  RobinWorldz: "robinworldz.webp",
  BitWorldz: "bitworldz.webp",
  HodlerWorldz: "next-big-coin.webp"
});

const TARGET_WORLD = Object.freeze({
  solworldz: "SolWorldz",
  ethworldz: "EthWorldz",
  baseworldz: "BaseWorldz",
  bnbworldz: "BNBWorldz",
  xrpworldz: "XRPWorldz",
  suiworldz: "SuiWorldz",
  hyperworldz: "HyperWorldz",
  robinworldz: "RobinWorldz",
  hodlerworldz: "HodlerWorldz",
  hodlergalaxy: "HodlerWorldz"
});

const CSS_HREF = "/assets/css/exact-image-placement.css";

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function exactSquarePicture(worldName, classes = "production-picture profile-art", alt = "") {
  const mobile = WORLD_SQUARE[worldName];
  if (!mobile) return null;
  return `<picture class="${classes} exact-square-art" data-exact-image="${worldName}"><source media="(max-width: 720px)" srcset="/assets/mobile/${mobile}"><img src="/assets/mobile/${mobile}" alt="${escapeHtml(alt || `${worldName} official identity`)}" loading="lazy" decoding="async"></picture>`;
}

function worldFromMarkup(markup = "") {
  for (const [name, asset] of Object.entries(WORLD_SQUARE)) {
    const key = asset.replace(/\.webp$/i, "");
    if (markup.includes(name) || markup.toLowerCase().includes(key.toLowerCase())) return name;
  }
  return null;
}

function replaceKnownTextWorlds(html) {
  return html.replace(
    /<div class="production-picture text-art ([^"]*\bprofile-art\b[^"]*)" role="img" aria-label="([^"]*)">[\s\S]*?<strong>([^<]+)<\/strong>[\s\S]*?<\/div>/g,
    (whole, classes, aria, label) => {
      const worldName = WORLD_SQUARE[label] ? label : worldFromMarkup(`${aria} ${label}`);
      if (!worldName) return whole;
      return exactSquarePicture(worldName, `production-picture ${classes}`, aria) || whole;
    }
  );
}

function replaceWorldProfilePictures(html) {
  return html.replace(
    /<picture class="([^"]*\bprofile-art\b[^"]*)">([\s\S]*?)<\/picture>/g,
    (whole, classes, inside) => {
      const worldName = worldFromMarkup(inside);
      if (!worldName) return whole;
      const alt = inside.match(/alt="([^"]*)"/)?.[1] || `${worldName} official profile identity`;
      return exactSquarePicture(worldName, classes, alt) || whole;
    }
  );
}

function replaceTargetHeaderIdentity(html, targetKey) {
  const worldName = TARGET_WORLD[targetKey];
  if (!worldName) return html;
  const exact = exactSquarePicture(worldName, "brand-profile exact-square-brand", "");
  if (!exact) return html;

  if (/<picture class="brand-profile">[\s\S]*?<\/picture>/.test(html)) {
    return html.replace(/<picture class="brand-profile">[\s\S]*?<\/picture>/, exact);
  }
  if (/<span class="brand-profile text-brand"[^>]*>[\s\S]*?<\/span>/.test(html)) {
    return html.replace(/<span class="brand-profile text-brand"[^>]*>[\s\S]*?<\/span>/, exact);
  }
  return html;
}

function injectCss(html) {
  if (html.includes(CSS_HREF)) return html;
  if (!html.includes("</head>")) throw new Error("Generated page has no closing head tag");
  return html.replace("</head>", `  <link rel="stylesheet" href="${CSS_HREF}">\n</head>`);
}

const css = `
/* Exact image placement guard. Identity and aspect ratio are slot-specific. */
.exact-square-art,
.exact-square-brand{
  aspect-ratio:1 / 1 !important;
  overflow:hidden !important;
}
.exact-square-art img,
.exact-square-brand img{
  width:100% !important;
  height:100% !important;
  object-fit:contain !important;
  object-position:center !important;
}
.site-brand .exact-square-brand{
  width:58px !important;
  height:58px !important;
  flex:0 0 58px !important;
  border-radius:50% !important;
}
.world-profile-grid .profile-art{
  width:100% !important;
  height:100% !important;
  min-height:0 !important;
  border:0 !important;
  border-radius:0 !important;
  box-shadow:none !important;
}
.world-profile-grid .profile-art img{
  width:100% !important;
  height:100% !important;
  object-fit:contain !important;
  object-position:center !important;
  padding:8px !important;
}
.media-row > picture.production-picture:not(.hero-art){
  width:100% !important;
  max-width:640px !important;
  justify-self:center !important;
}
.media-row > picture.production-picture:not(.hero-art) img{
  width:100% !important;
  height:auto !important;
  max-height:620px !important;
  object-fit:contain !important;
  object-position:center !important;
}
.support-profile{
  aspect-ratio:1 / 1 !important;
}
.support-profile img{
  width:100% !important;
  height:100% !important;
  object-fit:contain !important;
  object-position:center !important;
}
.destination-preview img{
  width:100% !important;
  height:100% !important;
  object-fit:cover !important;
  object-position:center !important;
}
@media(max-width:720px){
  .site-brand .exact-square-brand{
    width:44px !important;
    height:44px !important;
    flex-basis:44px !important;
  }
  .world-profile-grid .profile-art img{padding:5px !important}
  .media-row > picture.production-picture:not(.hero-art){max-width:100% !important}
  .media-row > picture.production-picture:not(.hero-art) img{max-height:none !important}
}
`;

async function ensureReferencedAssets(targetRoot, htmlFiles) {
  const refs = new Set();
  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    for (const match of html.matchAll(/(?:src|srcset)="\/assets\/(desktop|mobile|support)\/([^"?#]+)"/g)) {
      refs.add(`${match[1]}/${match[2]}`);
    }
  }
  for (const rel of refs) {
    if (rel.includes("..")) throw new Error(`Unsafe image reference: ${rel}`);
    const source = path.join(sourceAssets, rel);
    const destination = path.join(targetRoot, "assets", rel);
    if (await stat(destination).then(() => true).catch(() => false)) continue;
    if (!(await stat(source).then(() => true).catch(() => false))) throw new Error(`Approved image source missing: ${rel}`);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination);
  }
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
  manifest.exact_image_placement = {
    ...stats,
    contract: "NO_ROTATION_NO_RANDOM_FALLBACK_EXACT_IDENTITY_AND_SLOT_SHAPE"
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

const targets = (await readdir(distRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory());
const fleet = {};
let totalPages = 0;
let totalChanged = 0;

for (const target of targets) {
  const targetRoot = path.join(distRoot, target.name);
  const htmlFiles = (await walk(targetRoot)).filter((file) => file.endsWith(".html"));
  const cssDir = path.join(targetRoot, "assets", "css");
  await mkdir(cssDir, { recursive: true });
  await writeFile(path.join(cssDir, "exact-image-placement.css"), css.trimStart(), "utf8");

  let changed = 0;
  let squareWorldSlots = 0;
  for (const file of htmlFiles) {
    totalPages += 1;
    const original = await readFile(file, "utf8");
    let html = original;
    html = replaceKnownTextWorlds(html);
    html = replaceWorldProfilePictures(html);
    html = replaceTargetHeaderIdentity(html, target.name);
    html = injectCss(html);

    squareWorldSlots += (html.match(/data-exact-image=/g) || []).length;

    if (/class="[^"]*\bprofile-art\b[^"]*"[\s\S]{0,700}src="\/assets\/desktop\/blockchains\//.test(html)) {
      throw new Error(`Wide blockchain banner still assigned to square profile slot: ${path.relative(distRoot, file)}`);
    }
    if (/jayjay-card-art|jayjay-section-art|community-support-art/.test(html)) {
      throw new Error(`Automatic rotating image slot survived exact-placement build: ${path.relative(distRoot, file)}`);
    }

    if (html !== original) {
      await writeFile(file, html, "utf8");
      changed += 1;
      totalChanged += 1;
    }
  }

  await ensureReferencedAssets(targetRoot, htmlFiles);
  const stats = { pages: htmlFiles.length, pages_changed: changed, exact_square_world_slots: squareWorldSlots };
  await refreshManifest(targetRoot, stats);
  fleet[target.name] = stats;
}

console.log(JSON.stringify({
  event: "exact_image_placement",
  result: "PASS",
  targets: targets.length,
  pages_scanned: totalPages,
  pages_changed: totalChanged,
  rule: "EXACT_IMAGE_IDENTITY_EXACT_SLOT_SHAPE_NO_POOL_ROTATION",
  fleet
}, null, 2));
