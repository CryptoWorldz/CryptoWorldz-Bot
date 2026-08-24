import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, "source");
const target = path.join(root, "dist", "ecosystem", "cryptoworldz");
const indexPath = path.join(target, "index.html");

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

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

async function copyAsset(from, to) {
  const destination = path.join(target, to);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(path.join(source, from), destination);
}

function removeSectionById(html, id) {
  const idIndex = html.indexOf(`id="${id}"`);
  if (idIndex < 0) return html;
  const start = html.lastIndexOf("<section", idIndex);
  const end = html.indexOf("</section>", idIndex);
  if (start < 0 || end < 0) throw new Error(`CryptoWorldz section boundary missing for #${id}`);
  return html.slice(0, start) + html.slice(end + "</section>".length);
}

function cleanBody(html) {
  html = html.replace(/(<body\b[^>]*class=")([^"]*)(")/, (whole, start, classes, end) => {
    const cleaned = classes.split(/\s+/).filter(Boolean).filter((token) => token !== "full-background-experience");
    return `${start}${cleaned.join(" ")}${end}`;
  });
  if (!/<body\b[^>]*data-cryptoworldz-perfect=/.test(html)) {
    html = html.replace(/<body\b([^>]*)>/, '<body$1 data-cryptoworldz-perfect="true">');
  }
  return html;
}

function perfectHero(html) {
  const heroStart = html.indexOf('<section class="hero');
  if (heroStart < 0) throw new Error("CryptoWorldz home hero missing");
  const heroOpenEnd = html.indexOf(">", heroStart);
  let opening = html.slice(heroStart, heroOpenEnd + 1);
  if (!opening.includes("cw-perfect-hero")) opening = opening.replace('class="', 'class="cw-perfect-hero ');
  html = html.slice(0, heroStart) + opening + html.slice(heroOpenEnd + 1);

  const pictureStart = html.indexOf("<picture", heroStart);
  const pictureOpenEnd = pictureStart >= 0 ? html.indexOf(">", pictureStart) : -1;
  if (pictureStart < 0 || pictureOpenEnd < 0) throw new Error("CryptoWorldz hero picture missing");
  let pictureOpen = html.slice(pictureStart, pictureOpenEnd + 1);
  if (!pictureOpen.includes('data-visual-contract="cryptoworldz-main-image"')) {
    pictureOpen = pictureOpen.replace(/>$/, ' data-fit="contain" data-visual-required="true" data-visual-contract="cryptoworldz-main-image">');
  }
  html = html.slice(0, pictureStart) + pictureOpen + html.slice(pictureOpenEnd + 1);
  return html;
}

function compactCommandRoles(html) {
  const sectionIndex = html.indexOf('id="command"');
  if (sectionIndex < 0 || html.includes('class="cw-role-strip"')) return html;
  const sectionEnd = html.indexOf("</section>", sectionIndex);
  const roleStart = html.indexOf('<div class="role-grid">', sectionIndex);
  if (roleStart < 0 || roleStart > sectionEnd) return html;
  const roleEnd = html.indexOf("</div>", roleStart);
  if (roleEnd < 0 || roleEnd > sectionEnd) throw new Error("CryptoWorldz role grid boundary missing");
  const strip = '<div class="cw-role-strip" aria-label="Five protected Command Centre roles"><span>ZED</span><span>AUTO</span><span>G.R.A.C.E.</span><span>RECAP</span><span>BASED.BID</span></div>';
  return html.slice(0, roleStart) + strip + html.slice(roleEnd + "</div>".length);
}

function addDavisFamily(html) {
  if (html.includes("https://donateworldz.com/davis-family/")) return html;
  const supportIndex = html.indexOf('id="support"');
  if (supportIndex < 0) throw new Error("CryptoWorldz support grid missing");
  const sectionEnd = html.indexOf("</section>", supportIndex);
  const gridStart = html.indexOf('<div class="profile-grid support-card-grid">', supportIndex);
  if (gridStart < 0 || gridStart > sectionEnd) throw new Error("CryptoWorldz support-card grid missing");
  const gridEnd = html.indexOf("</div>", gridStart);
  if (gridEnd < 0 || gridEnd > sectionEnd) throw new Error("CryptoWorldz support-card grid close missing");
  const card = `<a class="profile-card cw-davis-card" href="https://donateworldz.com/davis-family/" target="_blank" rel="noopener noreferrer"><span class="cw-davis-art" data-fit="contain" data-visual-required="true"><img src="/assets/support/davis-family/davis-family-hero.webp" alt="Davis Family dedicated support" loading="lazy" decoding="async"></span><span class="profile-copy"><small>Dedicated family support</small><strong>Davis Family</strong><em>Dedicated support page <b aria-hidden="true">→</b></em></span></a>`;
  return html.slice(0, gridEnd) + card + html.slice(gridEnd);
}

function addGptAssets(html) {
  if (!html.includes('/assets/css/oneworldz-gpt.css')) html = html.replace("</head>", '<link rel="stylesheet" href="/assets/css/oneworldz-gpt.css"></head>');
  if (!html.includes('/assets/css/cryptoworldz-perfect.css')) html = html.replace("</head>", '<link rel="stylesheet" href="/assets/css/cryptoworldz-perfect.css"></head>');
  if (!html.includes('/assets/js/oneworldz-gpt.js')) html = html.replace("</body>", '<script src="/assets/js/oneworldz-gpt.js" defer></script></body>');
  return html;
}

function fixKnownDisplayDrift(html) {
  html = html.replaceAll('/assets/mobile/impactbased-square.webp', '/assets/mobile/impactbased-landscape.webp');
  html = html.replace(/Raaaiiidd\s*Teamhttps:\/\/t\.me\/CryptoWorldzRaaaiiiddTeam/g, "Raaaiiidd Team");
  html = html.replace(/<\/a>https:\/\/t\.me\/CryptoWorldzRaaaiiiddTeam/g, "</a>");
  html = html.replace("Three purposes. Three separate support systems.", "Four purposes. Four separate support pathways.");
  html = html.replace("Each image-led page keeps its own purpose, payment destination and records clear.", "Reagan & Children, Community Impact, Davis Family and Support JayJayTeamDev each keep their own purpose, destination and records clear.");
  return html;
}

async function refreshManifest() {
  const manifestPath = path.join(target, "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const records = [];
  for (const file of await listFiles(target)) {
    if (file === "release-manifest.json") continue;
    const bytes = await readFile(path.join(target, file));
    records.push({ path: `/${file}`, bytes: bytes.byteLength, sha256: hash(bytes) });
  }
  manifest.generated_at = new Date().toISOString();
  manifest.files = records;
  manifest.cryptoworldz_perfect = {
    homepage: "concise_image_led_master",
    hero: "full_contain_no_crop_no_stretch",
    davis_family_visual: true,
    shared_oneworldz_gpt: true,
    text_only_home_sections_removed: ["learn", "safety", "human-leadership", "governance", "rewards", "updates", "official-directory", "project-registry", "acknowledgements"],
    protected_command_roles_compacted: true,
    impactbased_mobile_landscape: true
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

await copyAsset("cryptoworldz-perfect.css", "assets/css/cryptoworldz-perfect.css");
await copyAsset("oneworldz-gpt.css", "assets/css/oneworldz-gpt.css");
await copyAsset("oneworldz-gpt.js", "assets/js/oneworldz-gpt.js");
await copyAsset("assets/desktop/oneworldz/oneworldz-gpt.png", "assets/oneworldz-gpt/oneworldz-gpt.png");
await copyAsset("assets/support/davis-family/davis-family-hero.webp", "assets/support/davis-family/davis-family-hero.webp");
await copyAsset("assets/mobile/impactbased-landscape.webp", "assets/mobile/impactbased-landscape.webp");

let html = await readFile(indexPath, "utf8");
html = cleanBody(html);
html = perfectHero(html);
html = compactCommandRoles(html);
for (const id of ["learn", "safety", "human-leadership", "governance", "rewards", "updates", "official-directory", "project-registry", "acknowledgements"]) html = removeSectionById(html, id);
html = addDavisFamily(html);
html = fixKnownDisplayDrift(html);
html = addGptAssets(html);

for (const required of [
  'data-cryptoworldz-perfect="true"',
  'data-visual-contract="cryptoworldz-main-image"',
  'class="cw-role-strip"',
  "https://donateworldz.com/davis-family/",
  "/assets/support/davis-family/davis-family-hero.webp",
  "/assets/js/oneworldz-gpt.js",
  "/assets/css/cryptoworldz-perfect.css"
]) if (!html.includes(required)) throw new Error(`CryptoWorldz perfect contract missing: ${required}`);
if (/Raaaiiidd\s*Teamhttps:\/\//.test(html)) throw new Error("CryptoWorldz malformed Raaiiidd link returned");

await writeFile(indexPath, html, "utf8");
await refreshManifest();
console.log("CRYPTOWORLDZ_PERFECT=PASS hero=contain concise_home=true davis_image=true shared_gpt=true");
