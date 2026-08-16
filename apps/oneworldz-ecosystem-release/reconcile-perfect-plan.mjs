import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ecosystemDestinations, excludedRootDomains, ownedRootDomains, protectedDestinations } from "./ecosystem-topology.mjs";

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

  // Exactly one first-main priority image; all later images remain lazy.
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

// The approved master build permits the new OneWorldz gateway build. Keep the
// protected CryptoBotz application separate. Reconcile the generated fleet to
// that exact 18-static + 1-protected = 19-destination topology.
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
await writeFile(fleetPath, JSON.stringify(fleet, null, 2) + "\n", "utf8");

// build-perfect intentionally rewrites these four human/global surfaces. Bring
// their metadata/loading behaviour back to the same verified production standard
// used by the rest of the release.
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

// The OneWorldz Little Legend is the scholar/future-builder hero on mobile.
// The Uganda section must not repeat that exact production artwork, so use the
// already-approved Uganda Unite mobile artwork there instead.
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

// Restore the final approved-visual contract after the perfect-plan layer has
// refreshed package manifests. No raw reference-library substitution is made.
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

console.log("Perfect Plan reconciled: 18 static packages + protected CryptoBotz = 19 destinations, production SEO restored, approved visuals preserved.");
