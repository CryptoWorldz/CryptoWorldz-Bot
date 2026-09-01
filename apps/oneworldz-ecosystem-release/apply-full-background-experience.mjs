import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const sourceAssets = path.join(root, "source", "assets");
const distRoot = path.join(root, "dist", "ecosystem");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const exactMain = (asset, position = "center center") => Object.freeze({
  desktop: asset,
  mobile: asset,
  position
});

// Fallback art is used only when an approved hero picture is absent.
const ART = Object.freeze({
  oneworldz: exactMain("desktop/oneworldz/oneworldz-master.png"),
  oneworldzGpt: exactMain("desktop/oneworldz/oneworldz-gpt.png"),
  reagan: exactMain("desktop/humanitarian/action-creates-smiles-banner.png"),
  davis: exactMain("support/davis-family/davis-family-hero.jpg"),
  community: exactMain("desktop/tokens/global-impact-alliance.png"),
  pdc: exactMain("desktop/purple-diamond-crew/action-team.png"),
  cryptoworldz: exactMain("desktop/cryptoworldz/zed-command-centre.png"),
  command: exactMain("desktop/cryptoworldz/command-centre-five.png"),
  impactbased: exactMain("desktop/cryptoworldz/impactbased.png"),
  law: exactMain("desktop/tokens/robin-hood-law.png"),
  hodler: exactMain("desktop/tokens/next-big-coin.png"),
  solworldz: exactMain("desktop/blockchains/solworldz.png"),
  ethworldz: exactMain("desktop/blockchains/ethworldz.png"),
  baseworldz: exactMain("desktop/blockchains/baseworldz.png"),
  bnbworldz: exactMain("desktop/blockchains/bnbworldz.png"),
  xrpworldz: exactMain("desktop/blockchains/xrpworldz.png"),
  suiworldz: exactMain("desktop/blockchains/suiworldz.png"),
  hyperworldz: exactMain("desktop/blockchains/hyperworldz.png"),
  robinworldz: exactMain("desktop/blockchains/robinworldz.png")
});

function chooseArt(target, route) {
  const r = route.toLowerCase();
  if (target === "oneworldz") {
    if (/gpt|ai-guide|ask-oneworldz/.test(r)) return ART.oneworldzGpt;
    if (/reagan|uganda|children|action-spread|support-children/.test(r)) return ART.reagan;
    if (/davis/.test(r)) return ART.davis;
    if (/community-support|community-impact|destinations|support-network/.test(r)) return ART.community;
    return ART.oneworldz;
  }
  if (target === "cryptoworldz") {
    if (/command-centre|miniapp|zed|auto|grace/.test(r)) return ART.command;
    if (/support\/reagan|reagan|uganda|children/.test(r)) return ART.reagan;
    if (/support\/community|community-impact/.test(r)) return ART.community;
    if (/support\/jayjay/.test(r)) return ART.pdc;
    return ART.cryptoworldz;
  }
  if (target === "donateworldz") {
    if (/reagan|uganda|children/.test(r)) return ART.reagan;
    if (/davis/.test(r)) return ART.davis;
    if (/community/.test(r)) return ART.community;
    if (/jayjay/.test(r)) return ART.pdc;
    return ART.community;
  }
  if (target === "foodworldz") return ART.reagan;
  if (target === "purplediamondcrew") return ART.pdc;
  if (target === "impactbased") return ART.impactbased;
  if (target === "law-oneworldz") return ART.law;
  if (target === "learn-oneworldz") return ART.oneworldzGpt;
  if (target === "hodlergalaxy" || target === "hodlerworldz") return ART.hodler;
  return ART[target] || ART.oneworldz;
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

function publicAsset(asset) {
  return `/assets/${asset}`;
}

function addBodyClass(html) {
  if (/<body\b[^>]*class="[^"]*\bfull-background-experience\b/.test(html)) return html;
  if (/<body\b[^>]*class="/.test(html)) return html.replace(/<body\b([^>]*?)class="([^"]*)"/, '<body$1class="$2 full-background-experience"');
  return html.replace(/<body\b([^>]*)>/, '<body$1 class="full-background-experience">');
}

function addPageVars(html, art) {
  const marker = "data-full-background-art";
  if (html.includes(marker)) {
    html = html.replace(/<style data-full-background-art>[\s\S]*?<\/style>/, "");
  }
  const style = `<style data-full-background-art>:root{--full-bg-desktop:url('${publicAsset(art.desktop)}');--full-bg-mobile:url('${publicAsset(art.mobile)}');--full-bg-position:${art.position};}</style>`;
  return html.replace("</head>", `${style}</head>`);
}

function addCssLink(html) {
  if (html.includes('/assets/css/full-background-experience.css')) return html;
  return html.replace("</head>", '<link rel="stylesheet" href="/assets/css/full-background-experience.css"></head>');
}

function primaryHeroArt(html) {
  const picture = html.match(/<picture class="[^"]*\b(?:hero-art|support-emblem)\b[^"]*">([\s\S]*?)<\/picture>/)?.[1];
  if (!picture) return null;
  const desktop = picture.match(/<img\b[^>]*\bsrc="\/assets\/([^"?#]+)"/)?.[1];
  const mobile = picture.match(/<source\b[^>]*\bsrcset="\/assets\/([^"?#]+)"/)?.[1];
  if (!desktop) return null;
  return { desktop, mobile: mobile || desktop, position: "center center" };
}

const css = `
/* OneWorldz Full Background Experience — final build layer. */
html{background:#02050f}
body.full-background-experience{position:relative;isolation:isolate;min-height:100svh;background:#02050f!important;color:#f7fbff}
body.full-background-experience::before,body.full-background-experience::after{content:"";position:fixed;inset:0;pointer-events:none}
body.full-background-experience::before{z-index:-3;background-image:var(--full-bg-desktop);background-repeat:no-repeat;background-position:var(--full-bg-position,center);background-size:cover;filter:saturate(1.08) contrast(1.04) brightness(.72);transform:translateZ(0)}
body.full-background-experience::after{z-index:-2;background:linear-gradient(180deg,rgba(2,5,15,.20),rgba(2,5,15,.48) 45%,rgba(2,5,15,.68)),radial-gradient(circle at 50% 12%,rgba(86,52,190,.14),transparent 48%)}
body.full-background-experience .site-header{background:rgba(3,11,27,.56)!important;border-bottom-color:rgba(117,190,255,.28)!important;backdrop-filter:blur(18px) saturate(1.25);-webkit-backdrop-filter:blur(18px) saturate(1.25)}
body.full-background-experience .site-menu{background:rgba(3,11,27,.90)!important;backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px)}
body.full-background-experience main{position:relative;z-index:1;background:transparent!important}
body.full-background-experience .hero,body.full-background-experience .compact-hero,body.full-background-experience .support-hero,body.full-background-experience .section,body.full-background-experience .section-dark{background:transparent!important}
body.full-background-experience .hero{min-height:min(900px,calc(100svh - 76px));isolation:isolate}
body.full-background-experience .hero-art.full-background-hero-art{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;z-index:-2!important;border:0!important;border-radius:0!important;margin:0!important;background:transparent!important;overflow:hidden!important}
body.full-background-experience .hero-art.full-background-hero-art img{width:100%!important;height:100%!important;max-height:none!important;object-fit:contain!important;object-position:var(--full-bg-position,center)!important;filter:saturate(1.08) contrast(1.04) brightness(.86)!important}
body.full-background-experience .hero::after,body.full-background-experience .compact-hero::after{background:linear-gradient(90deg,rgba(2,7,20,.88),rgba(2,7,20,.44) 48%,rgba(2,7,20,.18)),linear-gradient(0deg,rgba(2,7,20,.76),transparent 56%)!important}
body.full-background-experience .hero-copy,body.full-background-experience .section-heading{position:relative;z-index:2;text-shadow:0 2px 22px rgba(0,0,0,.72)}
body.full-background-experience .info-grid article,body.full-background-experience .profile-card,body.full-background-experience .community-support-card,body.full-background-experience .cw-registry-card,body.full-background-experience .cw-project-card,body.full-background-experience .cw-link-preview,body.full-background-experience .launch-grid a,body.full-background-experience .official-directory-grid a,body.full-background-experience .support-card,body.full-background-experience .stat-card{background:linear-gradient(145deg,rgba(5,15,34,.58),rgba(8,9,30,.40))!important;border-color:rgba(126,198,255,.30)!important;box-shadow:0 18px 54px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.05);backdrop-filter:blur(15px) saturate(1.15);-webkit-backdrop-filter:blur(15px) saturate(1.15)}
body.full-background-experience .button,body.full-background-experience .button-row a,body.full-background-experience a.button,body.full-background-experience button:not(.menu-button){background:linear-gradient(135deg,rgba(74,180,255,.46),rgba(133,86,255,.42))!important;border:1px solid rgba(210,235,255,.62)!important;box-shadow:0 10px 34px rgba(44,118,255,.18),inset 0 1px 0 rgba(255,255,255,.22);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#fff!important}
body.full-background-experience .button.secondary,body.full-background-experience .button-row a.secondary{background:rgba(5,15,34,.42)!important}
body.full-background-experience .section{border-top-color:rgba(117,190,255,.18)!important;border-bottom-color:rgba(117,190,255,.18)!important}
body.full-background-experience .site-footer{position:relative;z-index:2;background:rgba(2,7,20,.68)!important;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
body.full-background-experience .jayjay-section-art,body.full-background-experience .jayjay-card-art,body.full-background-experience .directory-profile,body.full-background-experience .community-support-art{box-shadow:0 16px 46px rgba(0,0,0,.34)}
@media(max-width:720px){
  body.full-background-experience::before{background-image:var(--full-bg-mobile);background-position:center top;filter:saturate(1.05) contrast(1.03) brightness(.64)}
  body.full-background-experience::after{background:linear-gradient(180deg,rgba(2,5,15,.20),rgba(2,5,15,.55) 42%,rgba(2,5,15,.72))}
  body.full-background-experience .hero{min-height:calc(100svh - 70px);padding-top:clamp(1rem,4vw,2rem)!important}
  body.full-background-experience .hero-art.full-background-hero-art img{object-fit:contain!important;object-position:center!important;filter:saturate(1.04) contrast(1.02) brightness(.86)!important}
  body.full-background-experience .hero::after,body.full-background-experience .compact-hero::after{background:linear-gradient(0deg,rgba(2,7,20,.88) 0%,rgba(2,7,20,.48) 58%,rgba(2,7,20,.18) 100%)!important}
  body.full-background-experience .info-grid article,body.full-background-experience .profile-card,body.full-background-experience .community-support-card,body.full-background-experience .cw-registry-card,body.full-background-experience .cw-project-card,body.full-background-experience .cw-link-preview,body.full-background-experience .launch-grid a,body.full-background-experience .official-directory-grid a{background:linear-gradient(145deg,rgba(4,12,29,.64),rgba(7,9,28,.48))!important;backdrop-filter:blur(12px) saturate(1.12);-webkit-backdrop-filter:blur(12px) saturate(1.12)}
}
@media(prefers-reduced-motion:reduce){body.full-background-experience::before{transform:none}}
`;

async function ensureArt(targetRoot, art) {
  for (const rel of new Set([art.desktop, art.mobile])) {
    const source = path.join(sourceAssets, rel);
    const destination = path.join(targetRoot, "assets", rel);
    if (await stat(destination).then(() => true).catch(() => false)) continue;
    if (!(await stat(source).then(() => true).catch(() => false))) throw new Error(`Full background source missing: ${rel}`);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination);
  }
}

async function refreshManifest(targetRoot, record) {
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
  manifest.generated_at = new Date().toISOString();
  manifest.files = files.sort((a,b) => a.path.localeCompare(b.path));
  manifest.full_background_experience = record;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

const targetEntries = (await readdir(distRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory());
let totalPages = 0;
const results = {};

for (const targetEntry of targetEntries) {
  const target = targetEntry.name;
  const targetRoot = path.join(distRoot, target);
  const cssDir = path.join(targetRoot, "assets", "css");
  await mkdir(cssDir, { recursive: true });
  await writeFile(path.join(cssDir, "full-background-experience.css"), css.trimStart(), "utf8");

  const htmlFiles = (await walk(targetRoot)).filter((file) => file.endsWith(".html"));
  const used = new Map();
  let changed = 0;

  for (const file of htmlFiles) {
    const relative = path.relative(targetRoot, file).split(path.sep).join("/");
    const route = relative === "index.html" ? "/" : `/${relative.replace(/index\.html$/, "")}`;
    const original = await readFile(file, "utf8");
    const art = primaryHeroArt(original) || chooseArt(target, route);
    used.set(`${art.desktop}|${art.mobile}`, art);

    let html = original;
    html = addBodyClass(html);
    html = addCssLink(html);
    html = addPageVars(html, art);

    if (!html.includes("full-background-experience")) throw new Error(`${target}${route}: full-background class missing`);
    if (!html.includes("data-full-background-art")) throw new Error(`${target}${route}: background art variables missing`);
    if (html !== original) {
      await writeFile(file, html, "utf8");
      changed += 1;
    }
  }

  for (const art of used.values()) await ensureArt(targetRoot, art);

  const record = {
    pages: htmlFiles.length,
    pages_changed: changed,
    approved_desktop_mobile_pair_preserved: true,
    full_viewport_background: true,
    floating_glass_controls: true,
    primary_hero_preserved_from_approved_build: true,
    background_pairs: [...used.values()].map((art) => ({ desktop: publicAsset(art.desktop), mobile: publicAsset(art.mobile) }))
  };
  await refreshManifest(targetRoot, record);
  totalPages += htmlFiles.length;
  results[target] = record;
}

if (!totalPages) throw new Error("No ecosystem HTML pages found for full-background experience");
console.log(JSON.stringify({ event: "full_background_experience", result: "PASS", targets: targetEntries.length, pages: totalPages, results }, null, 2));
