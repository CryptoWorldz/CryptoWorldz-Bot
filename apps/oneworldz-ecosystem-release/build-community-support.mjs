import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, "source");
const target = path.join(root, "dist", "ecosystem", "oneworldz");
const pageDir = path.join(target, "community-support");
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");

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

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#061a36"><title>Community Support | OneWorldz Full Support</title><meta name="description" content="The dedicated OneWorldz Community Support registry: 35 verified Facebook support destinations preserved in display order with no invented replacements."><link rel="canonical" href="https://oneworldz.com/community-support/"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:title" content="Community Support | OneWorldz Full Support"><meta property="og:description" content="35 verified Community Impact Facebook support destinations from the OneWorldz registry."><meta property="og:url" content="https://oneworldz.com/community-support/"><link rel="stylesheet" href="/assets/css/site.css"><link rel="stylesheet" href="/assets/css/community-support.css"></head><body class="community-support-page" style="--accent:#65b9ff;--accent-2:#ffffff"><a class="skip-link" href="#main-content">Skip to content</a><header class="site-header"><a class="site-brand" href="/" aria-label="OneWorldz Back to Home"><span class="brand-profile text-brand" aria-hidden="true"><b>W</b></span><span><strong>OneWorldz</strong><small>Back to Home</small></span></a><button class="menu-button" type="button" aria-expanded="false" aria-controls="site-menu"><span></span><span></span><span></span><b>Menu</b></button><nav class="site-menu" id="site-menu" aria-label="Primary navigation"><a href="/">OneWorldz</a><a href="https://donateworldz.com/community-impact/">Community Impact</a><a href="https://donateworldz.com/reagan-children/">Reagan & Children</a><a href="https://donateworldz.com/jayjayteamdev/">Support JayJayTeamDev</a></nav></header><button class="menu-backdrop" type="button" aria-label="Close menu" tabindex="-1"></button><main id="main-content"><section class="community-support-hero"><p class="eyebrow">ONEWORLDZ 🌐 FULL SUPPORT™ • COMMUNITY IMPACT</p><h1>35 verified support links. No invented people.</h1><p>This page reads the existing OneWorldz Supabase Community Support registry in display order 1–35. Saved Facebook links are preserved exactly. When a public display name has not yet been independently resolved, the page uses a controlled neutral label instead of pretending we know the person or organisation name.</p><div class="community-support-status"><span id="community-support-count">Loading registry proof…</span><span id="community-support-resolved">Checking public-name metadata…</span><span>Source: public.oneworldz_support_profiles</span></div></section><section class="community-support-shell"><div class="community-support-intro"><div><p class="eyebrow">DEDICATED COMMUNITY SUPPORT PAGE</p><h2>One place for the complete recovered support network.</h2><p>Each card opens the original verified Facebook destination. Community Impact donations remain a separate support stream from Reagan & Children and Support JayJayTeamDev.</p></div><div class="community-support-note"><strong>Accuracy rule</strong>We do not publish generic database placeholders as if they were real names. A verified link may remain visible with a neutral label until public metadata can be confirmed.</div></div><div class="community-support-grid" id="community-support-grid"><div class="community-support-loading">Loading all 35 verified Community Support links…</div></div><div class="community-support-actions"><a href="https://donateworldz.com/community-impact/">Support Community Impact</a><a class="secondary" href="/">Return to OneWorldz</a></div></section></main><footer class="site-footer"><div><strong>OneWorldz Community Support</strong><span>One World • One Mission • One Fam</span></div><nav aria-label="Footer"><a href="https://oneworldz.com">OneWorldz</a><a href="https://foodworldz.com">FoodWorldz</a><a href="https://donateworldz.com">DonateWorldz</a><a href="https://purplediamondcrew.com">On the Ground</a></nav><p>JayJayTeamDev™ • Helping the People Who Help People</p></footer><script src="/assets/js/site.js" defer></script><script src="/assets/js/community-support.js" defer></script></body></html>`;

await mkdir(pageDir, { recursive: true });
await mkdir(path.join(target, "assets", "css"), { recursive: true });
await mkdir(path.join(target, "assets", "js"), { recursive: true });
await cp(path.join(source, "community-support.css"), path.join(target, "assets", "css", "community-support.css"));
await cp(path.join(source, "community-support.js"), path.join(target, "assets", "js", "community-support.js"));
await writeFile(path.join(pageDir, "index.html"), page, "utf8");

const homePath = path.join(target, "index.html");
let home = await readFile(homePath, "utf8");
if (!home.includes('href="/community-support/"')) {
  const marker = '<section class="section" id="acknowledgements">';
  const section = '<section class="section section-dark" id="community-support"><div class="section-heading"><p class="eyebrow">COMMUNITY IMPACT • 35 VERIFIED LINKS</p><h2>Meet the wider support network.</h2><p>One dedicated OneWorldz page loads all 35 saved Facebook support destinations from the protected Supabase registry without inventing missing names or links.</p></div><div class="button-row"><a class="button primary" href="/community-support/">Open Community Support</a><a class="button secondary" href="https://donateworldz.com/community-impact/" target="_blank" rel="noopener noreferrer">Support Community Impact</a></div></section>';
  if (!home.includes(marker)) throw new Error("OneWorldz acknowledgements marker missing");
  home = home.replace(marker, section + marker);
  await writeFile(homePath, home, "utf8");
}

const sitemapPath = path.join(target, "sitemap.xml");
await writeFile(sitemapPath, '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://oneworldz.com/</loc></url><url><loc>https://oneworldz.com/community-support/</loc></url></urlset>\n', "utf8");

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
manifest.community_support = {
  route: "/community-support/",
  live_registry_api: "https://cryptobotz.cryptoworldz.xyz/api/oneworldz-community-support",
  source_table: "public.oneworldz_support_profiles",
  required_count: 35,
  order: "1-35",
  generic_database_names_publicly_exposed: false,
  missing_name_policy: "controlled-neutral-label-no-invention"
};
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log("OneWorldz Community Support built: dedicated /community-support/ page with protected live 35-profile Supabase registry API.");
