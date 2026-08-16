import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { perfectPlan } from "./perfect-plan.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, "source");
const target = path.join(root, "dist", "ecosystem", "cryptoworldz");
const cssSource = path.join(source, "cryptoworldz-visual.css");
const cssTarget = path.join(target, "assets", "css", "cryptoworldz-visual.css");
const previewDir = path.join(target, "assets", "link-previews");

const pages = [
  ["home", "index.html"],
  ["command-centre", "command-centre/index.html"],
  ["miniapp", "miniapp/index.html"],
  ["support-reagan", "support/reagan-children/index.html"],
  ["support-community", "support/community-impact/index.html"],
  ["support-jayjay", "support/jayjayteamdev/index.html"],
  ["division-vision", "divisions/visionworldz/index.html"],
  ["division-ai", "divisions/aiworldz/index.html"],
  ["division-music", "divisions/musicworldz/index.html"],
  ["division-movie", "divisions/movieworldz/index.html"],
  ["division-art", "divisions/artworldz/index.html"],
  ["division-learn", "divisions/learnworldz/index.html"],
  ["division-business", "divisions/businessworldz/index.html"],
  ["division-law", "divisions/lawworldz/index.html"]
];

const previewAssets = [
  [path.join(source, "assets", "desktop", "cryptoworldz", "zed-command-centre.png"), "cryptoworldz.png"],
  [path.join(source, "assets", "desktop", "cryptoworldz", "command-centre-five.png"), "command-centre.png"],
  [path.join(source, "assets", "desktop", "cryptoworldz", "zed-auto.png"), "miniapp.png"],
  [path.join(source, "assets", "desktop", "oneworldz", "oneworldz-master.png"), "oneworldz.png"]
];

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");
const external = (href) => /^https?:\/\//.test(href) ? ' target="_blank" rel="noopener noreferrer"' : "";

const previewCards = `
<section class="section section-dark cw-link-previews" aria-labelledby="cw-connected-title">
  <div class="section-heading"><p class="eyebrow">CONNECTED CRYPTOWORLDZ LINKS</p><h2 id="cw-connected-title">See where each link takes you.</h2><p>Visual previews keep the main CryptoWorldz destinations clear on desktop and mobile.</p></div>
  <div class="cw-link-preview-grid">
    <a class="cw-link-preview" href="/"><span class="cw-link-preview-image"><img src="/assets/link-previews/cryptoworldz.png" alt="CryptoWorldz headquarters preview" loading="lazy" decoding="async"></span><span><small>Headquarters</small><strong>CryptoWorldz</strong><em>Open home →</em></span></a>
    <a class="cw-link-preview" href="/command-centre/"><span class="cw-link-preview-image"><img src="/assets/link-previews/command-centre.png" alt="Command Centre Ultimate preview" loading="lazy" decoding="async"></span><span><small>Protected roles</small><strong>Command Centre Ultimate™</strong><em>Open preview →</em></span></a>
    <a class="cw-link-preview" href="/miniapp/"><span class="cw-link-preview-image"><img src="/assets/link-previews/miniapp.png" alt="CryptoWorldz MiniApp preview" loading="lazy" decoding="async"></span><span><small>Protected entry</small><strong>CryptoWorldz MiniApp</strong><em>Open splash →</em></span></a>
    <a class="cw-link-preview" href="https://oneworldz.com" target="_blank" rel="noopener noreferrer"><span class="cw-link-preview-image"><img src="/assets/link-previews/oneworldz.png" alt="OneWorldz gateway preview" loading="lazy" decoding="async"></span><span><small>Human gateway</small><strong>OneWorldz</strong><em>Open gateway →</em></span></a>
  </div>
</section>`;

function officialDirectorySection() {
  const cards = perfectPlan.officialDirectory.map((entry) => `<a class="cw-registry-card" href="${entry.url}"${external(entry.url)}><small>${escapeHtml(entry.role)}</small><strong>${escapeHtml(entry.name)}</strong><em>${escapeHtml(entry.url.replace(/^https?:\/\//, ""))}</em></a>`).join("");
  return `<section class="section cw-official-directory" id="official-directory"><div class="section-heading"><p class="eyebrow">CRYPTOWORLDZ OFFICIAL WEBSITE DIRECTORY</p><h2>Save the official addresses.</h2><p>One directory connects the public headquarters, Worldz, support sites, protected Command Centre, ImpactBased, learning, law and the official CryptoWorldz Raaiiidd Team. A listed address does not activate a planned feature by itself.</p></div><div class="cw-registry-grid">${cards}</div></section>`;
}

function projectRegistrySection() {
  const cards = perfectPlan.projectRegistry.map((entry) => `<article class="cw-project-card"><span>${escapeHtml(entry.state)}</span><h3>${escapeHtml(entry.name)}</h3><p>${escapeHtml(entry.area)}</p><a href="${entry.url}"${external(entry.url)}>Official / connected destination →</a></article>`).join("");
  const auto = perfectPlan.autoControl;
  return `<section class="section section-dark cw-project-registry" id="project-registry"><div class="section-heading"><p class="eyebrow">JAYJAYTEAMDEV PROJECT REGISTRY</p><h2>Built, protected, planned and historical — labelled honestly.</h2><p>The registry keeps OneWorldz, CryptoWorldz, Command Centre Ultimate™, ZED, AUTO, G.R.A.C.E., RECAP, ImpactBased, the Help the People movement and token concepts visible without pretending planned execution is already live.</p></div><div class="cw-project-grid">${cards}</div><div class="cw-auto-law"><strong>${escapeHtml(auto.name)}</strong><p>${escapeHtml(auto.legalCeilingRule)}</p><p>AUTO starts disabled. It may only use JayJayTeamDev-owned funds after wallet ownership, budget/risk caps, legal/compliance classification, destination allowlists, audit records and an emergency stop are verified. It never controls donor, customer, beneficiary or community money.</p></div></section>`;
}

function injectVisualCss(html) {
  if (html.includes('/assets/css/cryptoworldz-visual.css')) return html;
  return html.replace("</head>", '<link rel="stylesheet" href="/assets/css/cryptoworldz-visual.css"></head>');
}

function injectBodyClass(html, routeClass) {
  if (html.includes('class="cryptoworldz-visual')) return html;
  return html.replace(/<body\s+style="([^"]*)">/, `<body class="cryptoworldz-visual route-${routeClass}" style="$1">`);
}

function injectHomeRegistry(html, routeClass) {
  if (routeClass !== "home" || html.includes('id="project-registry"')) return html;
  const pos = html.lastIndexOf("</main>");
  if (pos < 0) throw new Error("CryptoWorldz home missing </main>");
  return html.slice(0, pos) + officialDirectorySection() + projectRegistrySection() + html.slice(pos);
}

function injectLinkPreviews(html) {
  if (html.includes('class="section section-dark cw-link-previews"')) return html;
  const pos = html.lastIndexOf("</main>");
  if (pos < 0) throw new Error("CryptoWorldz page missing </main>");
  return html.slice(0, pos) + previewCards + html.slice(pos);
}

function verifyHashes(html, pageName) {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const match of html.matchAll(/href="#([^"]+)"/g)) {
    if (!ids.has(match[1])) throw new Error(`${pageName} broken local link #${match[1]}`);
  }
}

async function listFiles(dir, rel = "") {
  const entries = await readdir(path.join(dir, rel), { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(dir, child));
    else out.push(child.split(path.sep).join("/"));
  }
  return out.sort();
}

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

await mkdir(path.dirname(cssTarget), { recursive: true });
await mkdir(previewDir, { recursive: true });
await cp(cssSource, cssTarget);
for (const [from, filename] of previewAssets) await cp(from, path.join(previewDir, filename));

for (const [routeClass, relative] of pages) {
  const file = path.join(target, relative);
  let html = await readFile(file, "utf8");
  html = injectVisualCss(html);
  html = injectBodyClass(html, routeClass);
  html = injectHomeRegistry(html, routeClass);
  html = injectLinkPreviews(html);

  if (!html.includes(`route-${routeClass}`)) throw new Error(`${relative}: route visual class missing`);
  if (!html.includes('/assets/css/cryptoworldz-visual.css')) throw new Error(`${relative}: visual stylesheet missing`);
  if (!/hero-art|support-emblem/.test(html)) throw new Error(`${relative}: main visual missing`);
  if (!html.includes('property="og:image"')) throw new Error(`${relative}: Open Graph image missing`);
  if (!html.includes('name="twitter:card" content="summary_large_image"')) throw new Error(`${relative}: Twitter large preview missing`);
  if ((html.match(/class="cw-link-preview"/g) || []).length !== 4) throw new Error(`${relative}: four visual link previews required`);
  if (routeClass === "home") {
    for (const entry of perfectPlan.officialDirectory) if (!html.includes(`href="${entry.url}"`)) throw new Error(`CryptoWorldz official directory missing ${entry.url}`);
    if (!html.includes("Command Centre Ultimate™")) throw new Error("Command Centre Ultimate missing from project registry");
    if (!html.includes("AUTO • Diamond Buy™")) throw new Error("AUTO Diamond Buy project registry missing");
    if (!html.includes("G.R.A.C.E.™")) throw new Error("G.R.A.C.E. project registry missing");
  }
  verifyHashes(html, relative);
  await writeFile(file, html, "utf8");
}

const manifestPath = path.join(target, "release-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const files = [];
for (const file of await listFiles(target)) {
  if (file === "release-manifest.json") continue;
  const bytes = await readFile(path.join(target, file));
  files.push({ path: `/${file}`, bytes: bytes.byteLength, sha256: hash(bytes) });
}
manifest.generated_at = new Date().toISOString();
manifest.files = files;
manifest.cryptoworldz_visual_contract = {
  pages: pages.length,
  theme: "BLUE_PURPLE",
  page_routes: pages.map(([, file]) => file === "index.html" ? "/" : `/${file.replace(/index\.html$/, "")}`),
  desktop_mobile_main_visuals: true,
  full_background_hero_treatment: true,
  approved_separate_mobile_hero_assets_preserved: true,
  support_pages_ambient_full_backgrounds: true,
  visual_link_previews_per_page: 4,
  official_directory_entries: perfectPlan.officialDirectory.length,
  project_registry_entries: perfectPlan.projectRegistry.length,
  auto_execution_default: perfectPlan.autoControl.executionDefault,
  isolated_link_preview_assets: true,
  open_graph_preview_images: true,
  twitter_large_image_previews: true,
  local_hash_links_verified: true,
  protected_cryptobotz_modified: false
};
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log(`CryptoWorldz finalised: blue-purple visual treatment, ${perfectPlan.officialDirectory.length} official links, ${perfectPlan.projectRegistry.length} labelled projects and protected AUTO boundary.`);
