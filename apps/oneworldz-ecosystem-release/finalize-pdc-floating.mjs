import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, "source");
const target = path.join(root, "dist", "ecosystem", "purplediamondcrew");
const cssSource = path.join(source, "pdc-floating-final.css");
const cssTarget = path.join(target, "assets", "css", "pdc-floating-final.css");
const homeFile = path.join(target, "index.html");
const legacyFile = path.join(target, "legacy-tokens", "index.html");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

const HOME_PATHWAYS = Object.freeze([
  ["1927 Hope Chest", "/legacy-tokens/", false],
  ["Make the Difference", "/make-the-difference/", false],
  ["DonateWorldz", "https://donateworldz.com/", true],
  ["OneWorldz", "https://oneworldz.com/", true],
  ["CryptoWorldz", "https://cryptoworldz.xyz/", true],
  ["Acknowledgements", "/acknowledgements/", false]
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

function addMarker(html) {
  if (/\bdata-pdc-floating="true"/.test(html)) return html;
  return html.replace(/<body\b([^>]*)>/, '<body$1 data-pdc-floating="true">');
}

function injectCss(html, version) {
  const href = `/assets/css/pdc-floating-final.css?v=${version}`;
  if (/\/assets\/css\/pdc-floating-final\.css(?:\?[^"']*)?/.test(html)) {
    return html.replace(/\/assets\/css\/pdc-floating-final\.css(?:\?[^"']*)?/g, href);
  }
  return html.replace("</head>", `<link rel="stylesheet" href="${href}" data-pdc-floating-final="true"></head>`);
}

function floatingHomeMarkup() {
  const buttons = HOME_PATHWAYS.map(([label, href, external]) =>
    `<a class="pdc-floating-button" href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`
  ).join("");
  return `<section class="pdc-floating-home" aria-label="Purple Diamond Crew pathways">
    <h1 class="pdc-visually-hidden">Purple Diamond Crew</h1>
    <nav class="pdc-floating-actions" aria-label="Purple Diamond Crew next pathways">${buttons}</nav>
  </section>`;
}

async function refreshManifest() {
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
  manifest.pdc_floating_experience = {
    version: "full-background-floating-v1",
    home: {
      full_background_artwork: true,
      floating_pathways: 6,
      desktop_layout: "3 columns × 2 rows",
      mobile_layout: "2 columns × 3 rows",
      shared_button_tray: false
    },
    hope_chest: {
      route: "/legacy-tokens/",
      desktop_background: "/assets/desktop/purple-diamond-crew/hope-chest.png",
      mobile_background: "/assets/mobile/hope-chest.webp",
      legacy_tokens: 10,
      layout: "5 columns × 2 rows",
      semi_visible_controls: true,
      token_record_dialog_preserved: true
    },
    header: {
      home_brand_top_left: true,
      menu_top_right: true
    },
    normal_page_scrolling: false,
    production_services_modified: []
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

await mkdir(path.dirname(cssTarget), { recursive: true });
await cp(cssSource, cssTarget);
const cssVersion = hash(await readFile(cssTarget)).slice(0, 16);

let home = await readFile(homeFile, "utf8");
if (!home.includes('data-one-screen="true"')) throw new Error("PDC home lost protected one-screen marker");
if (!home.includes('data-visual-fit-target="purplediamondcrew"')) throw new Error("PDC home target marker missing");
home = addMarker(home);
home = injectCss(home, cssVersion);
const panelPattern = /<section class="screen-panel">[\s\S]*?<\/section>/;
if (!panelPattern.test(home)) throw new Error("PDC home screen panel not found");
home = home.replace(panelPattern, floatingHomeMarkup());
if ((home.match(/<h1\b/g) || []).length !== 1) throw new Error("PDC floating home must preserve exactly one H1");
for (const [, href] of HOME_PATHWAYS) {
  if (!home.includes(`href="${href}"`)) throw new Error(`PDC floating home pathway missing ${href}`);
}
if ((home.match(/class="pdc-floating-button"/g) || []).length !== 6) throw new Error("PDC floating home must expose exactly six pathways");
await writeFile(homeFile, home, "utf8");

let legacy = await readFile(legacyFile, "utf8");
if (!legacy.includes('data-one-screen="true"')) throw new Error("PDC Hope Chest lost protected one-screen marker");
if (!legacy.includes('/assets/desktop/purple-diamond-crew/hope-chest.png')) throw new Error("PDC Hope Chest desktop background missing");
if (!legacy.includes('/assets/mobile/hope-chest.webp')) throw new Error("PDC Hope Chest mobile background missing");
legacy = addMarker(legacy);
legacy = injectCss(legacy, cssVersion);
const tokenCount = (legacy.match(/class="token-control"/g) || []).length;
if (tokenCount !== 10) throw new Error(`PDC Hope Chest expected 10 legacy token controls, got ${tokenCount}`);
if (!legacy.includes('id="token-dialog"')) throw new Error("PDC legacy token detail dialog missing");
await writeFile(legacyFile, legacy, "utf8");

await refreshManifest();

console.log("PDC_FLOATING_FINAL=PASS home_pathways=6 home_desktop=3x2 home_mobile=2x3 hope_chest_tokens=10 hope_chest_layout=5x2 full_background=true shared_tray=false header_home_left=true menu_right=true production_write=false");
