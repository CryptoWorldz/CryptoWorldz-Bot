import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ecosystemDestinations, excludedRootDomains, ownedRootDomains, protectedDestinations } from "./ecosystem-topology.mjs";
import { links } from "./site-data.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, "source");
const dist = path.join(root, "dist", "ecosystem");
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

function escapeAttribute(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function decodeEntities(value = "") {
  return String(value).replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
}

function ensureProductionSeo(html, domain) {
  const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1] || `https://${domain}/`;
  const titleMarkup = html.match(/<title>([\s\S]*?)<\/title>/)?.[1] || domain;
  const descriptionMarkup = html.match(/<meta name="description" content="([^"]*)">/)?.[1] || "OneWorldz Full Support destination connecting people with verified information and practical action.";
  const title = decodeEntities(titleMarkup);
  const description = decodeEntities(descriptionMarkup);
  const siteName = title.split("|")[0].trim() || domain;

  html = html.replace(/<meta name="robots" content="[^"]*">/g, "");
  html = html.replace(/<meta name="twitter:card" content="[^"]*">/g, "");
  html = html.replace(/<meta name="twitter:title" content="[^"]*">/g, "");
  html = html.replace(/<meta name="twitter:description" content="[^"]*">/g, "");
  html = html.replace(/<link rel="sitemap" type="application\/xml" href="\/sitemap\.xml">/g, "");
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: canonical,
    inLanguage: "en",
    isPartOf: { "@type": "WebSite", name: siteName, url: `https://${domain}/` },
    creator: { "@type": "Organization", name: "OneWorldz" }
  }).replaceAll("<", "\\u003c");

  const tags = [
    '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeAttribute(title)}">`,
    `<meta name="twitter:description" content="${escapeAttribute(description)}">`,
    '<link rel="sitemap" type="application/xml" href="/sitemap.xml">',
    `<script type="application/ld+json">${schema}</script>`
  ].join("");
  html = html.replace("</head>", `${tags}</head>`);

  const mainStart = html.indexOf('<main id="main-content">');
  const mainEnd = mainStart >= 0 ? html.indexOf("</main>", mainStart) : -1;
  if (mainStart >= 0 && mainEnd >= 0) {
    const before = html.slice(0, mainStart);
    let main = html.slice(mainStart, mainEnd);
    const after = html.slice(mainEnd);
    main = main.replaceAll('loading="eager"', 'loading="lazy"').replaceAll(' fetchpriority="high"', "");
    main = main.replace(/<img\b([^>]*?)loading="lazy"([^>]*)>/, (match, left, right) => `<img${left}loading="eager" fetchpriority="high"${right}>`);
    html = `${before}${main}${after}`;
  }
  return html;
}

function reconcileImpactBased(html) {
  const official = links.impactBased;
  html = html.replace(/<link rel="canonical" href="[^"]+">/, `<link rel="canonical" href="${official}">`);
  html = html.replace(/<meta property="og:url" content="[^"]+">/g, `<meta property="og:url" content="${official}">`);
  html = html.replace(
    '<p>Transparent project identity, community discovery and real-world impact—kept separate from investment performance claims.</p>',
    '<p>Helping the People Who Help People 💜 Real Impact • Real People • Real Change. Purpose-led project identity, community discovery and real-world action—kept separate from investment performance claims.</p>'
  );
  const purposeMarker = '<section class="section" id="purpose">';
  if (!html.includes('id="impactbased-official"')) {
    const officialBlock = `<section class="section section-dark" id="impactbased-official"><div class="section-heading"><p class="eyebrow">IMPACTBASED 🌍</p><h2>Helping the People Who Help People 💜</h2><p>Real Impact • Real People • Real Change</p></div><div class="info-grid"><article><span>01</span><h3>Powered by Based.bid</h3><p>ImpactBased connects to the reviewed Based.bid pathway without claiming automatic launch authority.</p><a href="${links.basedBid}" target="_blank" rel="noopener noreferrer">Open Based.bid →</a></article><article><span>02</span><h3>@CryptoWorldzBot</h3><p>ZED connects verified community missions, profiles, points and governance presentation.</p><a href="${links.zed}" target="_blank" rel="noopener noreferrer">Open ZED →</a></article><article><span>03</span><h3>AUTO • ZED • G.R.A.C.E.</h3><p>Command Centre Ultimate™ keeps protected system roles separate. AUTO remains owner-funds only and execution-disabled until its safety and compliance gates are satisfied.</p><a href="${links.zedCommandCentre}" target="_blank" rel="noopener noreferrer">Command Centre Ultimate™ →</a></article></div></section>`;
    const pos = html.indexOf(purposeMarker);
    if (pos < 0) throw new Error("ImpactBased purpose insertion point missing");
    html = html.slice(0, pos) + officialBlock + html.slice(pos);
  }
  for (const required of ["Helping the People Who Help People", "Real Impact • Real People • Real Change", "Powered by Based.bid", "@CryptoWorldzBot", "AUTO • ZED • G.R.A.C.E.", "Command Centre Ultimate™", official]) {
    if (!html.includes(required)) throw new Error(`ImpactBased locked identity missing: ${required}`);
  }
  return html;
}

async function reconcileImpactDiscovery() {
  const target = path.join(dist, "impactbased");
  const oldOrigin = "https://impactbased.cryptoworldz.xyz";
  const officialOrigin = links.impactBased.replace(/\/$/, "");
  const robotsPath = path.join(target, "robots.txt");
  const sitemapPath = path.join(target, "sitemap.xml");
  let robots = await readFile(robotsPath, "utf8");
  let sitemap = await readFile(sitemapPath, "utf8");
  robots = robots.replaceAll(oldOrigin, officialOrigin);
  sitemap = sitemap.replaceAll(oldOrigin, officialOrigin);
  if (!robots.includes(`Sitemap: ${officialOrigin}/sitemap.xml`)) throw new Error("ImpactBased official robots sitemap URL missing");
  if (!sitemap.includes(`<loc>${officialOrigin}/</loc>`)) throw new Error("ImpactBased official sitemap URL missing");
  await writeFile(robotsPath, robots, "utf8");
  await writeFile(sitemapPath, sitemap, "utf8");
}

async function refreshManifest(key, additions = {}) {
  const target = path.join(dist, key);
  const manifestPath = path.join(target, "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const files = [];
  for (const file of await listFiles(target)) {
    if (file === "release-manifest.json") continue;
    const bytes = await readFile(path.join(target, file));
    files.push({ path: `/${file}`, bytes: bytes.byteLength, sha256: hash(bytes) });
  }
  Object.assign(manifest, additions, { files, generated_at: new Date().toISOString() });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

const fleetPath = path.join(dist, "fleet-manifest.json");
const fleet = JSON.parse(await readFile(fleetPath, "utf8"));
fleet.architecture = {
  ecosystem_destinations: ecosystemDestinations.length,
  active_owned_root_domains: ownedRootDomains.length,
  static_build_targets: fleet.targets.length,
  protected_existing_destinations: protectedDestinations.map(({ domain }) => `https://${domain}`),
  excluded_owned_root_domains: [...excludedRootDomains]
};
fleet.ecosystem_destinations = ecosystemDestinations;
fleet.protected_unchanged = protectedDestinations.map(({ domain }) => `https://${domain}`);
fleet.public_aliases = { impactbased: links.impactBased };
await writeFile(fleetPath, JSON.stringify(fleet, null, 2) + "\n", "utf8");

for (const [key, domain] of [
  ["oneworldz", "oneworldz.com"],
  ["purplediamondcrew", "purplediamondcrew.com"],
  ["law-oneworldz", "law.oneworldz.com"],
  ["learn-oneworldz", "learn.oneworldz.com"]
]) {
  const file = path.join(dist, key, "index.html");
  let html = await readFile(file, "utf8");
  html = ensureProductionSeo(html, domain);
  await writeFile(file, html, "utf8");
}

{
  const file = path.join(dist, "impactbased", "index.html");
  let html = await readFile(file, "utf8");
  html = reconcileImpactBased(html);
  html = ensureProductionSeo(html, "impactbased.oneworldz.com");
  await writeFile(file, html, "utf8");
  await reconcileImpactDiscovery();
}

{
  const target = path.join(dist, "oneworldz");
  const file = path.join(target, "index.html");
  let html = await readFile(file, "utf8");
  const occurrences = [...html.matchAll(/srcset="\/assets\/mobile\/little-legend\.webp"/g)];
  if (occurrences.length > 1) {
    const secondIndex = occurrences[1].index;
    html = html.slice(0, secondIndex) + html.slice(secondIndex).replace('srcset="/assets/mobile/little-legend.webp"', 'srcset="/assets/mobile/uganda-unite.webp"');
  }
  await mkdir(path.join(target, "assets", "mobile"), { recursive: true });
  await cp(path.join(source, "assets", "mobile", "uganda-unite.webp"), path.join(target, "assets", "mobile", "uganda-unite.webp"));
  await writeFile(file, html, "utf8");
}

for (const key of ["foodworldz", "donateworldz", "hodlergalaxy"]) {
  await refreshManifest(key, {
    approved_visual: {
      key,
      desktop: `/assets/approved/desktop/${key}-hero.avif`,
      mobile: `/assets/approved/mobile/${key}-hero.avif`
    }
  });
}

for (const key of ["oneworldz", "purplediamondcrew", "law-oneworldz", "learn-oneworldz"]) {
  await refreshManifest(key);
}
await refreshManifest("impactbased", {
  official_public_url: links.impactBased,
  transport_target_unchanged: true,
  impactbased_identity: "Helping the People Who Help People • Real Impact • Real People • Real Change"
});

console.log("Perfect Plan reconciled: 18 static packages + protected CryptoBotz = 19 destinations, production SEO restored, approved visuals preserved, ImpactBased official identity and public alias recorded.");
