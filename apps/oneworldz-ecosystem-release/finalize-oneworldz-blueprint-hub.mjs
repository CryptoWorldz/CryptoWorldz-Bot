import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, "source");
const target = path.join(root, "dist", "ecosystem", "oneworldz");
const homeFile = path.join(target, "index.html");
const cssSource = path.join(source, "oneworldz-blueprint-hub.css");
const cssTarget = path.join(target, "assets", "css", "oneworldz-blueprint-hub.css");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

const MISSION_TITLE = "END WORLD HUNGER FOR GOOD 💜";
const MISSION_DETAIL = "Build the blueprint, systems, partnerships and real-world action so no child, family or community is left without food, clean water, dignity or hope.";
const REQUIRED_PATHS = Object.freeze([
  "/gpt/",
  "https://law.oneworldz.com/robin-hood-law/",
  "/directory/",
  "/help-the-people-movement/",
  "https://donateworldz.com/",
  "https://cryptoworldz.xyz/"
]);

async function listFiles(dir, rel = "") {
  const out = [];
  for (const entry of await readdir(path.join(dir, rel), { withFileTypes: true })) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(dir, child));
    else out.push(child.split(path.sep).join("/"));
  }
  return out.sort();
}

function addBodyMarker(html) {
  if (/<body\b[^>]*data-oneworldz-blueprint-hub="true"/.test(html)) return html;
  return html.replace(/<body\b([^>]*)>/, '<body$1 data-oneworldz-blueprint-hub="true" data-oneworldz-mission="true">');
}

function addMissionMarker(html) {
  if (/<body\b[^>]*data-oneworldz-mission="true"/.test(html)) return html;
  return html.replace(/<body\b([^>]*)>/, '<body$1 data-oneworldz-mission="true">');
}

function replaceMeta(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

function updateSeo(html) {
  html = html.replace(
    /<title>[\s\S]*?<\/title>/,
    "<title>OneWorldz | End World Hunger for Good | OneWorldzOneVision</title>"
  );
  const description = `OneWorldz Mission: ${MISSION_TITLE}. ${MISSION_DETAIL} Robin Hood Law is Blueprint 001 and OneWorldz GPT supports research and development.`;
  html = replaceMeta(html, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`);
  html = replaceMeta(html, /<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="OneWorldz | End World Hunger for Good">');
  html = replaceMeta(html, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`);
  html = replaceMeta(html, /<meta name="twitter:title" content="[^"]*">/, '<meta name="twitter:title" content="OneWorldz | End World Hunger for Good">');
  html = replaceMeta(html, /<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${description}">`);
  return html;
}

function injectCss(html, version) {
  const versioned = `/assets/css/oneworldz-blueprint-hub.css?v=${version}`;
  if (/\/assets\/css\/oneworldz-blueprint-hub\.css(?:\?[^"']*)?/.test(html)) {
    return html.replace(/\/assets\/css\/oneworldz-blueprint-hub\.css(?:\?[^"']*)?/g, versioned);
  }
  return html.replace("</head>", `<link rel="stylesheet" href="${versioned}" data-oneworldz-blueprint-hub="true"></head>`);
}

function missionMarkup() {
  return `<div class="ow-blueprint-mission" aria-label="OneWorldz Mission: ${MISSION_TITLE}">
      <small>ONEWORLDZ MISSION</small>
      <strong>${MISSION_TITLE}</strong>
      <span>${MISSION_DETAIL}</span>
    </div>`;
}

function missionBeaconMarkup() {
  return `<aside class="ow-mission-beacon" data-oneworldz-mission-visible="true" aria-label="OneWorldz Mission">
    <strong>MISSION • ${MISSION_TITLE}</strong>
    <span>Food • Clean Water • Dignity • Hope</span>
  </aside>`;
}

function hubMarkup() {
  return `<section class="ow-blueprint-hub" data-oneworldz-blueprint-view="true" aria-label="OneWorldz Blueprint Hub">
  <div class="ow-blueprint-content">
    <p class="ow-blueprint-kicker">ONEWORLDZ • ONEWORLDZONEVISION 🌐</p>
    <p class="ow-blueprint-title" role="heading" aria-level="1">One World. One Vision.<span>Build the Blueprint.</span></p>
    <p class="ow-blueprint-lead">OneWorldz turns world problems and ideas into researched, evidence-backed systems designed to make a real difference.</p>
    ${missionMarkup()}
    <div class="ow-blueprint-foundation" aria-label="Robin Hood Law Blueprint 001">
      <strong>BLUEPRINT 001 • ROBIN HOOD LAW</strong>
      <span>Fairness • Equal opportunity • Accountability • Evidence • People before power</span>
    </div>
  </div>
  <nav class="ow-blueprint-pathways" aria-label="OneWorldz next pathways">
    <a class="ow-blueprint-pathway" data-research="true" href="/gpt/">Research + Develop<br>OneWorldz GPT</a>
    <a class="ow-blueprint-pathway" data-foundation="true" href="https://law.oneworldz.com/robin-hood-law/">Robin Hood Law<br>Blueprint 001</a>
    <a class="ow-blueprint-pathway" href="/directory/">Explore<br>OneWorldz</a>
    <a class="ow-blueprint-pathway" href="/help-the-people-movement/">Help the People<br>Movement</a>
    <a class="ow-blueprint-pathway" href="https://donateworldz.com/">DonateWorldz<br>Make a Difference</a>
    <a class="ow-blueprint-pathway" href="https://cryptoworldz.xyz/">CryptoWorldz<br>Command Centre</a>
  </nav>
</section>`;
}

function injectHub(html) {
  if (html.includes('data-oneworldz-blueprint-view="true"')) return html;
  const mainMatch = html.match(/<main\b[^>]*id="main-content"[^>]*>/);
  if (!mainMatch || mainMatch.index == null) throw new Error("OneWorldz main-content insertion point missing");
  const pos = mainMatch.index + mainMatch[0].length;
  return html.slice(0, pos) + hubMarkup() + html.slice(pos);
}

function injectMissionBeacon(html) {
  if (html.includes('data-oneworldz-mission-visible="true"')) return html;
  if (!html.includes("</body>")) throw new Error("OneWorldz route body closing tag missing");
  return html.replace("</body>", `${missionBeaconMarkup()}</body>`);
}

async function ensureArtwork() {
  const artwork = [
    "desktop/oneworldz/oneworldz-master.png",
    "mobile/little-legend.webp",
    "desktop/tokens/robin-hood-law.png"
  ];
  for (const relative of artwork) {
    const destination = path.join(target, "assets", relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(source, "assets", relative), destination);
  }
}

async function refreshManifest(missionRoutes) {
  const manifestPath = path.join(target, "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const files = [];
  for (const rel of await listFiles(target)) {
    if (rel === "release-manifest.json") continue;
    const bytes = await readFile(path.join(target, rel));
    files.push({ path: `/${rel}`, bytes: bytes.byteLength, sha256: hash(bytes) });
  }
  manifest.generated_at = new Date().toISOString();
  manifest.files = files;
  manifest.oneworldz_blueprint_hub = {
    identity: "OneWorldzOneVision",
    mission: MISSION_TITLE,
    mission_detail: MISSION_DETAIL,
    mission_visible_routes: missionRoutes,
    design_base: "Robin Hood Law public-interest blueprint principles",
    flagship_blueprint: "Robin Hood Law — Blueprint 001",
    research_engine: "OneWorldz GPT",
    background_count: 1,
    floating_pathways: REQUIRED_PATHS.length,
    document_scroll_added: false,
    production_services_modified: []
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

await mkdir(path.dirname(cssTarget), { recursive: true });
await cp(cssSource, cssTarget);
await ensureArtwork();
const cssVersion = hash(await readFile(cssTarget)).slice(0, 16);

let home = await readFile(homeFile, "utf8");
if (!home.includes('data-one-screen="true"')) throw new Error("Protected OneWorldz one-screen marker missing before Blueprint Hub finalization");
const h1Before = (home.match(/<h1\b/g) || []).length;
if (h1Before !== 1) throw new Error(`Expected one OneWorldz H1 before Blueprint Hub finalization, got ${h1Before}`);

home = addBodyMarker(home);
home = updateSeo(home);
home = injectCss(home, cssVersion);
home = injectHub(home);

const h1After = (home.match(/<h1\b/g) || []).length;
if (h1After !== 1) throw new Error(`Blueprint Hub must preserve exactly one H1, got ${h1After}`);
if (!home.includes('data-one-screen="true"')) throw new Error("Blueprint Hub changed the one-screen contract marker");
if (!home.includes("OneWorldzOneVision")) throw new Error("OneWorldzOneVision identity missing");
if (!home.includes(MISSION_TITLE) || !home.includes(MISSION_DETAIL)) throw new Error("OneWorldz mission statement missing from hub");
if (!home.includes("BLUEPRINT 001 • ROBIN HOOD LAW")) throw new Error("Robin Hood Law Blueprint 001 marker missing");
if (!home.includes("OneWorldz GPT")) throw new Error("OneWorldz GPT research pathway missing");
for (const href of REQUIRED_PATHS) {
  if (!home.includes(`href="${href}"`)) throw new Error(`Blueprint Hub pathway missing: ${href}`);
}
await writeFile(homeFile, home, "utf8");

let missionRoutes = 1;
const routeFiles = (await listFiles(target)).filter((rel) => rel.endsWith("index.html") && rel !== "index.html");
for (const rel of routeFiles) {
  const file = path.join(target, rel);
  let html = await readFile(file, "utf8");
  if (!html.includes('data-one-screen="true"')) throw new Error(`OneWorldz one-screen marker missing from ${rel}`);
  html = addMissionMarker(html);
  html = injectCss(html, cssVersion);
  html = injectMissionBeacon(html);
  if (!html.includes(MISSION_TITLE)) throw new Error(`Mission visibility missing from ${rel}`);
  await writeFile(file, html, "utf8");
  missionRoutes += 1;
}

if (missionRoutes !== 8) throw new Error(`Expected OneWorldz mission on 8 routes, got ${missionRoutes}`);
await refreshManifest(missionRoutes);

console.log(`ONEWORLDZ_BLUEPRINT_HUB=PASS identity=OneWorldzOneVision mission="${MISSION_TITLE}" mission_routes=${missionRoutes} foundation=RobinHoodLaw blueprint=001 gpt=research_and_development pathways=6 production_write=false`);
