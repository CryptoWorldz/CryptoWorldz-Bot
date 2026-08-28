import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productionTargets } from "./production-targets.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, "source");
const dist = path.join(root, "dist", "ecosystem");
const cssSource = path.join(source, "universal-floating-final.css");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const SPECIAL = new Set(["oneworldz", "purplediamondcrew"]);

async function walk(dir, rel = "") {
  const out = [];
  for (const entry of await readdir(path.join(dir, rel), { withFileTypes: true })) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...await walk(dir, child));
    else out.push(child.split(path.sep).join("/"));
  }
  return out.sort();
}

function addMarker(html) {
  if (/\bdata-universal-floating="true"/.test(html)) return html;
  return html.replace(/<body\b([^>]*)>/, '<body$1 data-universal-floating="true">');
}

function injectCss(html, version) {
  const href = `/assets/css/universal-floating-final.css?v=${version}`;
  if (/\/assets\/css\/universal-floating-final\.css(?:\?[^"']*)?/.test(html)) {
    return html.replace(/\/assets\/css\/universal-floating-final\.css(?:\?[^"']*)?/g, href);
  }
  return html.replace("</head>", `<link rel="stylesheet" href="${href}" data-universal-floating-final="true"></head>`);
}

function injectMission(html) {
  if (html.includes('class="universal-mission-line"')) return html;
  const copy = /<p class="screen-copy">[\s\S]*?<\/p>/;
  if (!copy.test(html)) return html;
  return html.replace(copy, (m) => `${m}<p class="universal-mission-line">ONEWORLDZ MISSION • END WORLD HUNGER FOR GOOD 💜</p>`);
}

let routeCount = 0;
let targetCount = 0;
const results = {};

for (const target of productionTargets) {
  if (SPECIAL.has(target.key)) continue;
  const targetRoot = path.join(dist, target.key);
  const cssDir = path.join(targetRoot, "assets", "css");
  await mkdir(cssDir, { recursive: true });
  const cssTarget = path.join(cssDir, "universal-floating-final.css");
  await cp(cssSource, cssTarget);
  const version = hash(await readFile(cssTarget)).slice(0, 16);

  const htmlFiles = (await walk(targetRoot)).filter((rel) => rel.endsWith(".html"));
  if (!htmlFiles.length) throw new Error(`Universal floating shell found no routes for ${target.key}`);

  let changed = 0;
  for (const rel of htmlFiles) {
    const file = path.join(targetRoot, rel);
    let html = await readFile(file, "utf8");
    if (!html.includes('data-one-screen="true"')) throw new Error(`Protected one-screen marker missing: ${target.key}/${rel}`);
    if (!html.includes('class="screen-art"')) throw new Error(`Screen artwork missing: ${target.key}/${rel}`);
    if (!html.includes('class="screen-header"')) throw new Error(`Screen header missing: ${target.key}/${rel}`);
    if ((html.match(/<h1\b/g) || []).length !== 1) throw new Error(`Expected exactly one H1: ${target.key}/${rel}`);

    const before = html;
    html = addMarker(html);
    html = injectCss(html, version);
    html = injectMission(html);
    if (html !== before) changed += 1;
    await writeFile(file, html, "utf8");
  }

  const manifestPath = path.join(targetRoot, "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const files = [];
  for (const rel of await walk(targetRoot)) {
    if (rel === "release-manifest.json") continue;
    const bytes = await readFile(path.join(targetRoot, rel));
    files.push({ path: `/${rel}`, bytes: bytes.byteLength, sha256: hash(bytes) });
  }
  manifest.generated_at = new Date().toISOString();
  manifest.files = files;
  manifest.universal_floating_experience = {
    version: "oneworldz-universal-floating-v1",
    full_background: true,
    shared_panel: false,
    controls: "independent-semi-transparent-floating-pills",
    desktop_zone: "middle-lower",
    mobile_zone: "thumb-reachable-middle-lower",
    mission_visible: "ONEWORLDZ MISSION • END WORLD HUNGER FOR GOOD 💜",
    normal_page_scrolling: false,
    special_layout_exclusions: ["oneworldz", "purplediamondcrew"],
    production_services_modified: []
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  targetCount += 1;
  routeCount += htmlFiles.length;
  results[target.key] = { routes: htmlFiles.length, changed, css: `/assets/css/universal-floating-final.css?v=${version}` };
}

if (targetCount !== 16) throw new Error(`Expected universal floating shell on 16 non-special production targets, got ${targetCount}`);
if (routeCount !== 81) throw new Error(`Expected 81 routes outside OneWorldz/PDC, got ${routeCount}`);
console.log(JSON.stringify({ event: "UNIVERSAL_FLOATING_FINAL", result: "PASS", targets: targetCount, routes: routeCount, results }, null, 2));
