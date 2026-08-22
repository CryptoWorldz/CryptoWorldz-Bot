import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const sourceAssets = path.join(root, "source", "assets");
const distRoot = path.join(root, "dist", "ecosystem");

const WORLD_ART = Object.freeze({
  SolWorldz: ["blockchains/solworldz.png", "solworldz.webp"],
  EthWorldz: ["blockchains/ethworldz.png", "ethworldz.webp"],
  BaseWorldz: ["blockchains/baseworldz.png", "baseworldz.webp"],
  BNBWorldz: ["blockchains/bnbworldz.png", "bnbworldz.webp"],
  XRPWorldz: ["blockchains/xrpworldz.png", "xrpworldz.webp"],
  SuiWorldz: ["blockchains/suiworldz.png", "suiworldz.webp"],
  HyperWorldz: ["blockchains/hyperworldz.png", "hyperworldz.webp"],
  RobinWorldz: ["blockchains/robinworldz.png", "robinworldz.webp"],
  HodlerWorldz: ["tokens/next-big-coin.png", "next-big-coin.webp"]
});

const MISSION_ART = Object.freeze([
  ["purple-diamond-crew/action-team.png", "hope-chest.webp"],
  ["oneworldz/oneworldz-master.png", "little-legend.webp"],
  ["tokens/global-impact-alliance.png", "global-impact-alliance.webp"],
  ["tokens/uganda-unite.png", "uganda-unite.webp"],
  ["oneworldz/hope-chest.png", "hope-chest.webp"]
]);

const FALLBACK_ART = Object.freeze(["oneworldz/oneworldz-master.png", "little-legend.webp"]);

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(child));
    else out.push(child);
  }
  return out;
}

function artPicture({ desktop, mobile, alt = "", className = "jayjay-image", decorative = false }) {
  const hidden = decorative ? ' aria-hidden="true"' : "";
  const altText = decorative ? "" : escapeHtml(alt);
  return `<picture class="${className}"${hidden}><source media="(max-width: 720px)" srcset="/assets/mobile/${mobile}"><img src="/assets/desktop/${desktop}" alt="${altText}" loading="lazy" decoding="async"></picture>`;
}

function replaceTextArt(html) {
  return html.replace(
    /<div class="production-picture text-art ([^"]*)" role="img" aria-label="([^"]*)"><span>[^<]*<\/span><strong>([^<]+)<\/strong>(?:<small>[^<]*<\/small>)?<\/div>/g,
    (whole, classes, aria, label) => {
      const art = WORLD_ART[label];
      if (!art) return artPicture({ desktop: FALLBACK_ART[0], mobile: FALLBACK_ART[1], alt: aria, className: `production-picture ${classes} jayjay-image` });
      return artPicture({ desktop: art[0], mobile: art[1], alt: aria, className: `production-picture ${classes} jayjay-image jayjay-world-art` });
    }
  );
}

function replaceGenericBrand(html) {
  const isHodler = /<strong>HodlerWorldz<\/strong><small>Back to Home<\/small>/.test(html);
  const art = isHodler ? WORLD_ART.HodlerWorldz : FALLBACK_ART;
  return html.replace(
    /<span class="brand-profile text-brand"[^>]*><b>[^<]*<\/b><\/span>/g,
    artPicture({ desktop: art[0], mobile: art[1], className: "brand-profile jayjay-image", decorative: true })
  );
}

function replaceDirectoryInitials(html) {
  let index = 0;
  return html.replace(
    /<span class="directory-profile" aria-hidden="true"><b>[^<]*<\/b><small>[^<]*<\/small><\/span>/g,
    () => {
      const art = MISSION_ART[index++ % MISSION_ART.length];
      return artPicture({ desktop: art[0], mobile: art[1], className: "directory-profile jayjay-image", decorative: true });
    }
  );
}

function addCommunityCardArt(html) {
  let index = 0;
  return html.replace(/(<article class="community-support-card"[^>]*>)(?!<picture)/g, (whole, open) => {
    const art = MISSION_ART[index++ % MISSION_ART.length];
    return `${open}${artPicture({ desktop: art[0], mobile: art[1], className: "community-support-art jayjay-image", decorative: true })}`;
  });
}

function injectImageCss(html) {
  if (html.includes('/assets/css/jayjay-images.css')) return html;
  return html.replace("</head>", '<link rel="stylesheet" href="/assets/css/jayjay-images.css"></head>');
}

const css = `
/* JayJayTeamDev image-only visual pass: real ecosystem artwork in every image slot. */
.jayjay-image{display:block;overflow:hidden}
.profile-card .jayjay-image,.directory-profile.jayjay-image,.community-support-art.jayjay-image{aspect-ratio:1/1;border-radius:18px;background:radial-gradient(circle at 50% 35%,rgba(142,101,255,.28),rgba(5,12,29,.96))}
.profile-card .jayjay-image img,.directory-profile.jayjay-image img,.community-support-art.jayjay-image img{width:100%;height:100%;display:block;object-fit:contain;object-position:center}
.brand-profile.jayjay-image{width:54px;height:54px;border-radius:50%;flex:0 0 54px}
.brand-profile.jayjay-image img{width:100%;height:100%;display:block;object-fit:cover;object-position:center}
.directory-profile.jayjay-image{width:76px;min-width:76px;height:76px}
.community-support-card .community-support-art{width:100%;max-width:240px;margin:0 auto 16px}
.community-support-card .community-support-art img{object-fit:cover}
@media(max-width:720px){
  .directory-profile.jayjay-image{width:64px;min-width:64px;height:64px}
  .community-support-card .community-support-art{max-width:190px}
}
`;

async function ensureReferencedAssets(targetRoot, htmlFiles) {
  const refs = new Set();
  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    for (const match of html.matchAll(/(?:src|srcset)="\/assets\/(desktop|mobile)\/([^"?#]+)"/g)) {
      refs.add(`${match[1]}/${match[2]}`);
    }
  }
  for (const rel of refs) {
    if (rel.includes("..")) throw new Error(`Unsafe image reference: ${rel}`);
    const source = path.join(sourceAssets, rel);
    const destination = path.join(targetRoot, "assets", rel);
    const exists = await stat(destination).then(() => true).catch(() => false);
    if (exists) continue;
    const sourceExists = await stat(source).then(() => true).catch(() => false);
    if (!sourceExists) throw new Error(`Approved image source missing: ${rel}`);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination);
  }
}

const targets = (await readdir(distRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory());
let pagesChanged = 0;
let genericTextArtRemoved = 0;
let genericBrandsRemoved = 0;
let directoryImagesAdded = 0;
let communityCardImagesAdded = 0;

for (const targetEntry of targets) {
  const targetRoot = path.join(distRoot, targetEntry.name);
  const htmlFiles = (await walk(targetRoot)).filter((file) => file.endsWith(".html"));
  await mkdir(path.join(targetRoot, "assets", "css"), { recursive: true });
  await writeFile(path.join(targetRoot, "assets", "css", "jayjay-images.css"), css.trimStart(), "utf8");

  for (const file of htmlFiles) {
    const original = await readFile(file, "utf8");
    let html = original;
    const textBefore = (html.match(/production-picture text-art/g) || []).length;
    const brandBefore = (html.match(/brand-profile text-brand/g) || []).length;
    const directoryBefore = (html.match(/class="directory-profile" aria-hidden="true"/g) || []).length;
    const communityBefore = (html.match(/class="community-support-card"/g) || []).length;

    html = replaceTextArt(html);
    html = replaceGenericBrand(html);
    html = replaceDirectoryInitials(html);
    html = addCommunityCardArt(html);
    html = injectImageCss(html);

    genericTextArtRemoved += textBefore - (html.match(/production-picture text-art/g) || []).length;
    genericBrandsRemoved += brandBefore - (html.match(/brand-profile text-brand/g) || []).length;
    directoryImagesAdded += directoryBefore;
    if (communityBefore && !original.includes("community-support-art")) communityCardImagesAdded += communityBefore;

    if (html !== original) {
      await writeFile(file, html, "utf8");
      pagesChanged += 1;
    }
  }

  await ensureReferencedAssets(targetRoot, htmlFiles);
}

console.log(JSON.stringify({
  event: "jayjay_image_pass",
  targets: targets.length,
  pages_changed: pagesChanged,
  generic_text_art_removed: genericTextArtRemoved,
  generic_brand_letters_removed: genericBrandsRemoved,
  directory_images_added: directoryImagesAdded,
  community_card_images_added: communityCardImagesAdded,
  rule: "REAL_ONEWORLDZ_ART_ONLY_NO_LAYOUT_REWRITE"
}));
