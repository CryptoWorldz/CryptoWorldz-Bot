import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist", "ecosystem");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const esc = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const requirements = Object.freeze([
  {
    target: "oneworldz",
    route: "sponsor-apply/index.html",
    links: [
      ["Open @OneWorldzX", "https://x.com/OneWorldzX"]
    ]
  },
  {
    target: "cryptoworldz",
    route: "command-centre/index.html",
    links: [
      ["@CryptoWorldzX", "https://x.com/CryptoWorldzX"],
      ["Raaiiidd Team", "https://t.me/CryptoWorldzRaaiiiddTeam"]
    ]
  },
  {
    target: "donateworldz",
    route: "reagan-children/index.html",
    links: [
      ["Reagan Facebook", "https://www.facebook.com/reagankauja2/"],
      ["Action Spread Smiles TikTok", "https://www.tiktok.com/@actionspreadsmilesorg"],
      ["Action Spread Smiles YouTube", "https://www.youtube.com/@action_spread_smiles"]
    ]
  }
]);

async function walk(dir, rel = "") {
  const out = [];
  for (const entry of await readdir(path.join(dir, rel), { withFileTypes: true })) {
    // Some filesystems expose a short-lived dot-prefixed file while replacing
    // a page. It is not a release asset and can disappear between readdir and
    // readFile, which previously made the production build nondeterministic.
    if (entry.name.startsWith(".") && entry.name !== ".htaccess") continue;
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...await walk(dir, child));
    else out.push(child.split(path.sep).join("/"));
  }
  return out.sort();
}

function actionMarkup(label, href) {
  return `<a class="glass-button" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
}

function injectActions(html, links, identity) {
  const pattern = /<div class="screen-actions">([\s\S]*?)<\/div>/;
  const match = html.match(pattern);
  if (!match) throw new Error(`Missing screen-actions for ${identity}`);
  let body = match[1];
  for (const [label, href] of links) {
    if (!html.includes(`href="${href}"`)) body += actionMarkup(label, href);
  }
  return html.replace(pattern, `<div class="screen-actions">${body}</div>`);
}

async function refreshManifest(target) {
  const targetRoot = path.join(dist, target);
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
  manifest.perfect_link_authority = {
    version: "public-outlet-final-v1",
    final_authority: true,
    required_outlets_preserved_after_visual_finalizers: true,
    production_services_modified: []
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

const touched = new Set();
for (const requirement of requirements) {
  const file = path.join(dist, requirement.target, requirement.route);
  let html = await readFile(file, "utf8");
  if (!html.includes('data-one-screen="true"')) throw new Error(`One-screen marker missing: ${requirement.target}/${requirement.route}`);
  html = injectActions(html, requirement.links, `${requirement.target}/${requirement.route}`);
  for (const [, href] of requirement.links) {
    if (!html.includes(`href="${href}"`)) throw new Error(`Required outlet missing after final authority: ${href}`);
  }
  await writeFile(file, html, "utf8");
  touched.add(requirement.target);
}

for (const target of touched) await refreshManifest(target);

console.log("PERFECT_LINK_AUTHORITY=PASS required_outlets=6 targets=3 final_authority=true production_write=false");
