import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(root, "dist", "ecosystem");
const CSS_HREF = "/assets/css/full-background-experience.css";
const BODY_CLASS = "full-background-experience";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

function addBodyClass(html) {
  if (new RegExp(`<body\\b[^>]*class="[^"]*\\b${BODY_CLASS}\\b`).test(html)) return html;
  if (/<body\b[^>]*class="/.test(html)) {
    return html.replace(/<body\b([^>]*?)class="([^"]*)"/, `<body$1class="$2 ${BODY_CLASS}"`);
  }
  return html.replace(/<body\b([^>]*)>/, `<body$1 class="${BODY_CLASS}">`);
}

function addCssLink(html) {
  if (html.includes(CSS_HREF)) return html;
  if (!html.includes("</head>")) throw new Error("Generated page has no closing head tag");
  return html.replace("</head>", `  <link rel="stylesheet" href="${CSS_HREF}">\n</head>`);
}

const css = `
/* Layout-only glass/background treatment.
   This file is forbidden from choosing, replacing, rotating, or guessing image assets. */
html{background:#02050f}
body.full-background-experience{position:relative;isolation:isolate;min-height:100svh;background:#02050f;color:#f7fbff}
body.full-background-experience .site-header{background:rgba(3,11,27,.56)!important;border-bottom-color:rgba(117,190,255,.28)!important;backdrop-filter:blur(18px) saturate(1.25);-webkit-backdrop-filter:blur(18px) saturate(1.25)}
body.full-background-experience .site-menu{background:rgba(3,11,27,.90)!important;backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px)}
body.full-background-experience main{position:relative;z-index:1;background:transparent!important}
body.full-background-experience .hero,body.full-background-experience .compact-hero,body.full-background-experience .support-hero,body.full-background-experience .section,body.full-background-experience .section-dark{background:transparent!important}
body.full-background-experience .hero-copy,body.full-background-experience .section-heading{position:relative;z-index:2;text-shadow:0 2px 22px rgba(0,0,0,.72)}
body.full-background-experience .info-grid article,body.full-background-experience .profile-card,body.full-background-experience .community-support-card,body.full-background-experience .cw-registry-card,body.full-background-experience .cw-project-card,body.full-background-experience .cw-link-preview,body.full-background-experience .launch-grid a,body.full-background-experience .official-directory-grid a,body.full-background-experience .support-card,body.full-background-experience .stat-card{background:linear-gradient(145deg,rgba(5,15,34,.58),rgba(8,9,30,.40))!important;border-color:rgba(126,198,255,.30)!important;box-shadow:0 18px 54px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.05);backdrop-filter:blur(15px) saturate(1.15);-webkit-backdrop-filter:blur(15px) saturate(1.15)}
body.full-background-experience .button,body.full-background-experience .button-row a,body.full-background-experience a.button,body.full-background-experience button:not(.menu-button){background:linear-gradient(135deg,rgba(74,180,255,.46),rgba(133,86,255,.42))!important;border:1px solid rgba(210,235,255,.62)!important;box-shadow:0 10px 34px rgba(44,118,255,.18),inset 0 1px 0 rgba(255,255,255,.22);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#fff!important}
body.full-background-experience .button.secondary,body.full-background-experience .button-row a.secondary{background:rgba(5,15,34,.42)!important}
body.full-background-experience .section{border-top-color:rgba(117,190,255,.18)!important;border-bottom-color:rgba(117,190,255,.18)!important}
body.full-background-experience .site-footer{position:relative;z-index:2;background:rgba(2,7,20,.68)!important;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
@media(max-width:720px){
  body.full-background-experience .info-grid article,body.full-background-experience .profile-card,body.full-background-experience .community-support-card,body.full-background-experience .cw-registry-card,body.full-background-experience .cw-project-card,body.full-background-experience .cw-link-preview,body.full-background-experience .launch-grid a,body.full-background-experience .official-directory-grid a{background:linear-gradient(145deg,rgba(4,12,29,.64),rgba(7,9,28,.48))!important;backdrop-filter:blur(12px) saturate(1.12);-webkit-backdrop-filter:blur(12px) saturate(1.12)}
}
`;

async function refreshManifest(targetRoot) {
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
  files.sort((a,b) => a.path.localeCompare(b.path));
  manifest.files = files;
  manifest.full_background_experience = {
    mode: "LAYOUT_ONLY_NO_IMAGE_AUTHORITY",
    image_selection: "FORBIDDEN"
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

const targets = (await readdir(distRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory());
let pages = 0;

for (const target of targets) {
  const targetRoot = path.join(distRoot, target.name);
  const cssDir = path.join(targetRoot, "assets", "css");
  await mkdir(cssDir, { recursive: true });
  await writeFile(path.join(cssDir, "full-background-experience.css"), css.trimStart(), "utf8");

  const htmlFiles = (await walk(targetRoot)).filter((file) => file.endsWith(".html"));
  for (const file of htmlFiles) {
    const original = await readFile(file, "utf8");
    let html = addBodyClass(original);
    html = addCssLink(html);
    if (html !== original) await writeFile(file, html, "utf8");
    pages += 1;
  }
  await refreshManifest(targetRoot);
}

console.log(JSON.stringify({
  event: "full_background_experience",
  result: "PASS",
  targets: targets.length,
  pages,
  mode: "LAYOUT_ONLY_NO_IMAGE_AUTHORITY"
}, null, 2));
