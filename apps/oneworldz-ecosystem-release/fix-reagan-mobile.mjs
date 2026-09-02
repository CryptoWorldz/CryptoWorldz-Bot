import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productionTargets } from "./production-targets.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(root, "dist", "ecosystem");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const BODY_MARKER = "ecosystem-mobile-reality-fixed";
const CSS_HREF = "/assets/css/mobile-reality-fix.css";

const css = `
/* OneWorldz ecosystem mobile reality guard — final build layer. */
@media (max-width: 720px) {
  html,
  body.ecosystem-mobile-reality-fixed {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: clip !important;
  }

  body.ecosystem-mobile-reality-fixed * {
    min-width: 0;
  }

  body.ecosystem-mobile-reality-fixed img,
  body.ecosystem-mobile-reality-fixed picture,
  body.ecosystem-mobile-reality-fixed video,
  body.ecosystem-mobile-reality-fixed canvas,
  body.ecosystem-mobile-reality-fixed svg,
  body.ecosystem-mobile-reality-fixed iframe {
    max-width: 100% !important;
  }

  body.ecosystem-mobile-reality-fixed .site-header {
    min-height: 70px !important;
    padding: 8px 14px !important;
    gap: .6rem !important;
  }

  body.ecosystem-mobile-reality-fixed .site-brand {
    gap: .55rem !important;
    max-width: calc(100vw - 86px) !important;
  }

  body.ecosystem-mobile-reality-fixed .brand-profile {
    flex-basis: 44px !important;
    width: 44px !important;
    height: 44px !important;
  }

  body.ecosystem-mobile-reality-fixed .site-brand strong {
    font-size: clamp(.88rem, 4.1vw, 1.08rem) !important;
    overflow-wrap: anywhere !important;
  }

  body.ecosystem-mobile-reality-fixed .site-brand small {
    font-size: .56rem !important;
    letter-spacing: .12em !important;
  }

  body.ecosystem-mobile-reality-fixed .section,
  body.ecosystem-mobile-reality-fixed .support-hero.section {
    padding-left: 18px !important;
    padding-right: 18px !important;
  }

  body.ecosystem-mobile-reality-fixed .support-hero.section {
    display: grid !important;
    grid-template-columns: 1fr !important;
    align-items: start !important;
    gap: 1rem !important;
    min-height: auto !important;
    padding-top: 1.25rem !important;
    padding-bottom: 2.75rem !important;
  }

  body.ecosystem-mobile-reality-fixed .support-emblem {
    width: min(62vw, 260px) !important;
    max-width: 260px !important;
    aspect-ratio: 1 / 1 !important;
    margin: 0 auto .45rem !important;
    padding: .4rem !important;
  }

  body.ecosystem-mobile-reality-fixed .support-emblem img {
    width: 100% !important;
    height: 100% !important;
    object-fit: contain !important;
  }

  body.ecosystem-mobile-reality-fixed .hero-copy,
  body.ecosystem-mobile-reality-fixed .support-hero > div:last-child,
  body.ecosystem-mobile-reality-fixed .section-heading {
    width: 100% !important;
    max-width: 100% !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  body.ecosystem-mobile-reality-fixed .hero-copy {
    padding-left: 18px !important;
    padding-right: 18px !important;
  }

  body.ecosystem-mobile-reality-fixed .hero h1,
  body.ecosystem-mobile-reality-fixed .support-hero h1 {
    max-width: 100% !important;
    font-size: clamp(2.25rem, 10.5vw, 3.35rem) !important;
    line-height: .99 !important;
    letter-spacing: -.035em !important;
    overflow-wrap: normal !important;
    word-break: normal !important;
  }

  body.ecosystem-mobile-reality-fixed .section-heading h2,
  body.ecosystem-mobile-reality-fixed .media-row h2 {
    max-width: 100% !important;
    font-size: clamp(2rem, 9.2vw, 3rem) !important;
    line-height: 1.02 !important;
    letter-spacing: -.03em !important;
    overflow-wrap: normal !important;
    word-break: normal !important;
  }

  body.ecosystem-mobile-reality-fixed .eyebrow {
    font-size: .68rem !important;
    line-height: 1.35 !important;
    letter-spacing: .15em !important;
    overflow-wrap: anywhere !important;
  }

  body.ecosystem-mobile-reality-fixed .lead,
  body.ecosystem-mobile-reality-fixed .hero-copy > p:not(.eyebrow),
  body.ecosystem-mobile-reality-fixed .section-heading > p:last-child {
    font-size: 1rem !important;
    line-height: 1.55 !important;
  }

  body.ecosystem-mobile-reality-fixed .media-row,
  body.ecosystem-mobile-reality-fixed .media-row.reverse,
  body.ecosystem-mobile-reality-fixed .info-grid,
  body.ecosystem-mobile-reality-fixed .role-grid,
  body.ecosystem-mobile-reality-fixed .token-grid,
  body.ecosystem-mobile-reality-fixed .profile-grid,
  body.ecosystem-mobile-reality-fixed .profile-directory,
  body.ecosystem-mobile-reality-fixed .launch-grid,
  body.ecosystem-mobile-reality-fixed .official-directory-grid {
    grid-template-columns: 1fr !important;
  }

  body.ecosystem-mobile-reality-fixed .media-row.reverse > picture {
    order: 0 !important;
  }

  body.ecosystem-mobile-reality-fixed .role-grid article:last-child {
    grid-column: auto !important;
  }

  body.ecosystem-mobile-reality-fixed .profile-card {
    grid-template-columns: 96px minmax(0, 1fr) !important;
    min-height: 96px !important;
  }

  body.ecosystem-mobile-reality-fixed .profile-copy {
    padding: .8rem .9rem !important;
  }

  body.ecosystem-mobile-reality-fixed .profile-copy strong {
    font-size: clamp(1.18rem, 5.8vw, 1.5rem) !important;
    overflow-wrap: anywhere !important;
  }

  body.ecosystem-mobile-reality-fixed .button-row {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: .7rem !important;
    width: 100% !important;
  }

  body.ecosystem-mobile-reality-fixed .button-row .button,
  body.ecosystem-mobile-reality-fixed .button-row a,
  body.ecosystem-mobile-reality-fixed a.button {
    width: 100% !important;
    max-width: 100% !important;
    min-height: 52px !important;
    padding: .8rem 1rem !important;
    white-space: normal !important;
    overflow-wrap: anywhere !important;
  }

  body.ecosystem-mobile-reality-fixed .support-note,
  body.ecosystem-mobile-reality-fixed .legal-band {
    max-width: 100% !important;
    margin-top: 1rem !important;
    padding: 1rem !important;
    font-size: .92rem !important;
    line-height: 1.5 !important;
    overflow-wrap: anywhere !important;
  }

  body.ecosystem-mobile-reality-fixed table {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
  }

  body.ecosystem-mobile-reality-fixed pre,
  body.ecosystem-mobile-reality-fixed code {
    max-width: 100% !important;
    overflow-x: auto !important;
    white-space: pre-wrap !important;
    overflow-wrap: anywhere !important;
  }

  body.ecosystem-mobile-reality-fixed p,
  body.ecosystem-mobile-reality-fixed li,
  body.ecosystem-mobile-reality-fixed a,
  body.ecosystem-mobile-reality-fixed span,
  body.ecosystem-mobile-reality-fixed strong,
  body.ecosystem-mobile-reality-fixed em {
    max-width: 100%;
  }

  body.ecosystem-mobile-reality-fixed iframe {
    width: 100% !important;
  }
}
`;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === ".rsync-tmp") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

function addBodyMarker(html) {
  if (html.includes(BODY_MARKER)) return html;
  if (/<body\b[^>]*class="/.test(html)) {
    return html.replace(/<body\b([^>]*?)class="([^"]*)"/, `<body$1class="$2 ${BODY_MARKER}"`);
  }
  return html.replace(/<body\b([^>]*)>/, `<body$1 class="${BODY_MARKER}">`);
}

function addCssLink(html) {
  if (html.includes(CSS_HREF)) return html;
  if (!html.includes("</head>")) throw new Error("Generated page has no closing head tag");
  return html.replace("</head>", `  <link rel="stylesheet" href="${CSS_HREF}">\n</head>`);
}

async function refreshManifest(targetRoot, pageCount) {
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
  manifest.mobile_reality_guard = {
    final_layer: true,
    pages_covered: pageCount,
    max_support_emblem_width_px: 260,
    mobile_primary_heading_max_rem: 3.35,
    single_column_narrow_grids: true,
    full_width_primary_controls: true,
    horizontal_overflow_guard: true
  };
  manifest.generated_at = new Date().toISOString();
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

let totalPages = 0;
let totalTargets = 0;

for (const target of productionTargets) {
  const targetRoot = path.join(distRoot, target.key);
  if (!(await stat(targetRoot).then(() => true).catch(() => false))) {
    throw new Error(`Built target missing: ${target.key}`);
  }

  const htmlFiles = (await walk(targetRoot)).filter((file) => file.endsWith(".html"));
  if (!htmlFiles.length) throw new Error(`No HTML pages found for ${target.key}`);

  const cssDir = path.join(targetRoot, "assets", "css");
  await mkdir(cssDir, { recursive: true });
  await writeFile(path.join(cssDir, "mobile-reality-fix.css"), css, "utf8");

  for (const file of htmlFiles) {
    let html = await readFile(file, "utf8");
    html = addBodyMarker(html);
    html = addCssLink(html);
    await writeFile(file, html, "utf8");

    const proof = await readFile(file, "utf8");
    if (!proof.includes(BODY_MARKER)) throw new Error(`Mobile body marker missing: ${file}`);
    if (!proof.includes(CSS_HREF)) throw new Error(`Mobile CSS link missing: ${file}`);
  }

  await refreshManifest(targetRoot, htmlFiles.length);
  totalPages += htmlFiles.length;
  totalTargets += 1;
  console.log(`MOBILE_REALITY_TARGET=PASS target=${target.key} pages=${htmlFiles.length}`);
}

if (totalTargets !== productionTargets.length) throw new Error(`Mobile guard target mismatch: ${totalTargets}/${productionTargets.length}`);
if (totalPages < 89) throw new Error(`Expected at least 89 static HTML pages; found ${totalPages}`);

console.log(`ECOSYSTEM_MOBILE_REALITY_FIX=PASS targets=${totalTargets} pages=${totalPages} one_final_layer=YES`);
