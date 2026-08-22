import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const targetRoot = path.join(root, "dist", "ecosystem", "donateworldz");
const pagePath = path.join(targetRoot, "reagan-children", "index.html");
const cssDir = path.join(targetRoot, "assets", "css");
const cssPath = path.join(cssDir, "reagan-mobile-fix.css");
const manifestPath = path.join(targetRoot, "release-manifest.json");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const css = `
/* Reagan & Children mobile reality fix — final build layer. */
@media (max-width: 720px) {
  body.reagan-mobile-layout-fixed .support-hero.section {
    display: grid !important;
    grid-template-columns: 1fr !important;
    align-items: start !important;
    gap: 1rem !important;
    min-height: auto !important;
    padding: 1.25rem 18px 2.5rem !important;
  }

  body.reagan-mobile-layout-fixed .support-emblem {
    width: min(62vw, 260px) !important;
    max-width: 260px !important;
    aspect-ratio: 1 / 1 !important;
    margin: 0 auto .45rem !important;
    padding: .4rem !important;
    border-radius: .85rem !important;
  }

  body.reagan-mobile-layout-fixed .support-emblem img {
    width: 100% !important;
    height: 100% !important;
    object-fit: contain !important;
  }

  body.reagan-mobile-layout-fixed .support-hero > div:last-child {
    min-width: 0 !important;
    width: 100% !important;
  }

  body.reagan-mobile-layout-fixed .support-hero .eyebrow {
    margin: 0 0 .65rem !important;
    font-size: .7rem !important;
    line-height: 1.35 !important;
    letter-spacing: .16em !important;
  }

  body.reagan-mobile-layout-fixed .support-hero h1 {
    max-width: 100% !important;
    margin: 0 !important;
    font-size: clamp(2.35rem, 10.5vw, 3.25rem) !important;
    line-height: .98 !important;
    letter-spacing: -.035em !important;
    overflow-wrap: normal !important;
    word-break: normal !important;
  }

  body.reagan-mobile-layout-fixed .support-hero .lead {
    margin: .85rem 0 0 !important;
    font-size: 1rem !important;
    line-height: 1.55 !important;
  }

  body.reagan-mobile-layout-fixed .support-hero .button-row {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: .7rem !important;
    margin-top: 1.15rem !important;
  }

  body.reagan-mobile-layout-fixed .support-hero .button-row .button {
    width: 100% !important;
    min-height: 52px !important;
    padding: .8rem 1rem !important;
    font-size: .82rem !important;
  }

  body.reagan-mobile-layout-fixed .support-note {
    margin: 1rem 0 0 !important;
    padding: .85rem 1rem !important;
    font-size: .92rem !important;
    line-height: 1.5 !important;
  }

  body.reagan-mobile-layout-fixed #safety.section,
  body.reagan-mobile-layout-fixed section.section-dark {
    padding: 3rem 18px !important;
  }

  body.reagan-mobile-layout-fixed #safety .section-heading,
  body.reagan-mobile-layout-fixed section.section-dark .section-heading {
    margin-bottom: 1.5rem !important;
  }

  body.reagan-mobile-layout-fixed #safety .section-heading h2,
  body.reagan-mobile-layout-fixed section.section-dark .section-heading h2 {
    max-width: 100% !important;
    font-size: clamp(2.1rem, 9.4vw, 3rem) !important;
    line-height: 1.02 !important;
    letter-spacing: -.03em !important;
  }

  body.reagan-mobile-layout-fixed #safety .section-heading > p:last-child,
  body.reagan-mobile-layout-fixed section.section-dark .section-heading > p:last-child {
    font-size: 1rem !important;
    line-height: 1.55 !important;
  }

  body.reagan-mobile-layout-fixed .legal-band {
    margin-top: 1.4rem !important;
    padding: 1rem !important;
  }
}
`;

function addBodyMarker(html) {
  if (html.includes("reagan-mobile-layout-fixed")) return html;
  if (/<body\b[^>]*class="/.test(html)) {
    return html.replace(/<body\b([^>]*?)class="([^"]*)"/, '<body$1class="$2 reagan-mobile-layout-fixed"');
  }
  return html.replace(/<body\b([^>]*)>/, '<body$1 class="reagan-mobile-layout-fixed">');
}

function addCssLink(html) {
  const href = "/assets/css/reagan-mobile-fix.css";
  if (html.includes(href)) return html;
  if (!html.includes("</head>")) throw new Error("Reagan page has no closing head tag");
  return html.replace("</head>", `  <link rel="stylesheet" href="${href}">\n</head>`);
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

async function refreshManifest() {
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
  manifest.reagan_mobile_layout = {
    route: "https://donateworldz.com/reagan-children/",
    max_emblem_width_px: 260,
    mobile_heading_max_rem: 3.25,
    full_width_payment_button: true,
    final_layer: true
  };
  manifest.generated_at = new Date().toISOString();
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

if (!(await stat(pagePath).then(() => true).catch(() => false))) {
  throw new Error("Reagan & Children page missing from DonateWorldz build");
}

let html = await readFile(pagePath, "utf8");
if (!/Reagan\s*&(?:amp;)?\s*Children/i.test(html)) throw new Error("Reagan & Children identity missing from target page");
if (!html.includes("https://donate.stripe.com/14A6oHcG61Ox87Y0Xb0kE01")) throw new Error("Reagan Stripe destination changed or missing");

html = addBodyMarker(html);
html = addCssLink(html);
await mkdir(cssDir, { recursive: true });
await writeFile(cssPath, css, "utf8");
await writeFile(pagePath, html, "utf8");

const proofHtml = await readFile(pagePath, "utf8");
const proofCss = await readFile(cssPath, "utf8");
if (!proofHtml.includes("reagan-mobile-layout-fixed")) throw new Error("Reagan mobile body marker not applied");
if (!proofHtml.includes("/assets/css/reagan-mobile-fix.css")) throw new Error("Reagan mobile CSS link not applied");
if (!proofCss.includes("max-width: 260px")) throw new Error("Reagan emblem mobile cap not applied");
if (!proofCss.includes("font-size: clamp(2.35rem, 10.5vw, 3.25rem)")) throw new Error("Reagan mobile heading cap not applied");
if (!proofCss.includes("width: 100% !important")) throw new Error("Reagan mobile full-width control rule missing");

await refreshManifest();
console.log("REAGAN_MOBILE_LAYOUT_FIX=PASS route=https://donateworldz.com/reagan-children/ emblem_max=260px heading_max=3.25rem stripe_unchanged=YES");
