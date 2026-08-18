import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deploymentTargets } from "./site-data.mjs";
import {
  chainHome,
  commandCentrePage,
  cryptoHome,
  divisionPage,
  divisions,
  impactBasedPage,
  lawPage,
  learnPage,
  miniAppPage,
  pdcPage,
  supportPage,
  worldz
} from "./template.mjs";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.join(appRoot, "source");
const distRoot = path.join(appRoot, "dist", "ecosystem");
const generatedAt = new Date().toISOString();

const decodeEntities = (value = "") => String(value)
  .replaceAll("&amp;", "&")
  .replaceAll("&quot;", '"')
  .replaceAll("&#39;", "'")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">");

const escapeAttribute = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const escapeXml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

function absoluteRoute(domain, route = "") {
  const clean = String(route).replace(/^\/+|\/+$/g, "");
  return clean ? `https://${domain}/${clean}/` : `https://${domain}/`;
}

function applyProductionCorrections(target, route, sourceHtml) {
  let html = sourceHtml;

  if (target.key === "cryptoworldz" && route === "") {
    html = html.replace(
      "Approved CryptoWorldz headquarters production artwork",
      "Approved ZED Command Centre artwork for CryptoWorldz headquarters"
    );

    html = html.replace(
      /<picture class="production-picture[^"]*">\s*<source media="\(max-width: 720px\)" srcset="\/assets\/mobile\/zed-grace-auto\.webp">\s*<img src="\/assets\/desktop\/cryptoworldz\/grace\.png" alt="Approved ZED G\.R\.A\.C\.E\. and AUTO production artwork" loading="eager" decoding="async">\s*<\/picture>/,
      '<img class="production-picture" src="/assets/mobile/zed-grace-auto.webp" alt="Approved ZED, AUTO and G.R.A.C.E. production artwork" loading="eager" decoding="async">'
    );
  }

  return html;
}

function optimizeImageLoading(html) {
  let output = html.replaceAll('loading="eager"', 'loading="lazy"');
  const mainStart = output.indexOf('<main id="main-content">');
  const mainEnd = mainStart >= 0 ? output.indexOf("</main>", mainStart) : -1;
  if (mainStart < 0 || mainEnd < 0) return output;
  const before = output.slice(0, mainStart);
  let main = output.slice(mainStart, mainEnd);
  const after = output.slice(mainEnd);
  main = main.replace(/<img\b([^>]*?)loading="lazy"([^>]*)>/, (match, left, right) => {
    const priority = /fetchpriority=/.test(match) ? "" : ' fetchpriority="high"';
    return `<img${left}loading="eager"${priority}${right}>`;
  });
  return `${before}${main}${after}`;
}

function enhanceSeo(target, route, sourceHtml) {
  const correctedHtml = applyProductionCorrections(target, route, sourceHtml);
  const canonicalMatch = correctedHtml.match(/<link rel="canonical" href="([^"]+)">/);
  const canonical = canonicalMatch?.[1] || absoluteRoute(target.domain, route);
  const titleMarkup = correctedHtml.match(/<title>([\s\S]*?)<\/title>/)?.[1] || target.key;
  const descriptionMarkup = correctedHtml.match(/<meta name="description" content="([^"]*)">/)?.[1] || "";
  const title = decodeEntities(titleMarkup);
  const description = decodeEntities(descriptionMarkup);
  const siteName = title.split("|")[0].trim() || target.key;
  const heroMarkup = correctedHtml.match(/<section class="[^"]*hero[^"]*"[^>]*>([\s\S]*?)<\/section>/)?.[1] || "";
  const heroImage = heroMarkup.match(/<img[^>]+src="([^"]+)"/)?.[1];
  const imageUrl = heroImage ? new URL(heroImage, canonical).href : "";
  const imageAlt = heroMarkup.match(/<img[^>]+alt="([^"]*)"/)?.[1] || `${siteName} official production artwork`;
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: canonical,
    inLanguage: "en",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: `https://${target.domain}/`
    },
    creator: {
      "@type": "Organization",
      name: "OneWorldz"
    }
  }).replaceAll("<", "\\u003c");

  const tags = [
    '  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">',
    '  <meta name="author" content="JayJayTeamDev™">',
    '  <meta name="application-name" content="OneWorldz">',
    '  <meta property="og:type" content="website">',
    '  <meta property="og:locale" content="en_AU">',
    `  <meta property="og:site_name" content="${escapeAttribute(siteName)}">`,
    `  <meta property="og:title" content="${escapeAttribute(title)}">`,
    `  <meta property="og:description" content="${escapeAttribute(description)}">`,
    `  <meta property="og:url" content="${escapeAttribute(canonical)}">`,
    '  <meta name="twitter:card" content="summary_large_image">',
    `  <meta name="twitter:title" content="${escapeAttribute(title)}">`,
    `  <meta name="twitter:description" content="${escapeAttribute(description)}">`,
    '  <link rel="sitemap" type="application/xml" href="/sitemap.xml">'
  ];
  if (imageUrl) {
    tags.push(`  <meta property="og:image" content="${escapeAttribute(imageUrl)}">`);
    tags.push(`  <meta property="og:image:alt" content="${escapeAttribute(decodeEntities(imageAlt))}">`);
    tags.push(`  <meta name="twitter:image" content="${escapeAttribute(imageUrl)}">`);
  }
  tags.push(`  <script type="application/ld+json">${schema}</script>`);

  let html = correctedHtml.replace("</head>", `${tags.join("\n")}\n</head>`);
  html = optimizeImageLoading(html);
  return html;
}

async function writeRoute(targetRoot, target, route, html) {
  const routeRoot = path.join(targetRoot, route);
  await mkdir(routeRoot, { recursive: true });
  await writeFile(path.join(routeRoot, "index.html"), enhanceSeo(target, route, html), "utf8");
}

async function copyShellAssets(targetRoot) {
  const assetsRoot = path.join(targetRoot, "assets");
  await mkdir(path.join(assetsRoot, "css"), { recursive: true });
  await mkdir(path.join(assetsRoot, "js"), { recursive: true });
  await cp(path.join(sourceRoot, "site.css"), path.join(assetsRoot, "css", "site.css"));
  await cp(path.join(sourceRoot, "site.js"), path.join(assetsRoot, "js", "site.js"));
}

async function copyReferencedMedia(targetRoot) {
  const files = await listFiles(targetRoot);
  const media = new Set();
  for (const file of files.filter((candidate) => candidate.endsWith(".html"))) {
    const html = await readFile(path.join(targetRoot, file), "utf8");
    for (const match of html.matchAll(/(?:src|srcset)="(\/assets\/(?:desktop|mobile|support)\/[^"?#]+)"/g)) {
      media.add(match[1].slice("/assets/".length));
    }
  }
  for (const relative of [...media].sort()) {
    if (relative.includes("..")) throw new Error(`Unsafe media path: ${relative}`);
    const source = path.join(sourceRoot, "assets", relative);
    const destination = path.join(targetRoot, "assets", relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination);
  }
}

async function listFiles(root, relative = "") {
  const current = path.join(root, relative);
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".rsync")) continue;
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, child));
    else files.push(child.split(path.sep).join("/"));
  }
  return files.sort();
}

async function writeSeoDiscoveryFiles(target, targetRoot) {
  const files = await listFiles(targetRoot);
  const pages = files
    .filter((file) => file.endsWith("index.html"))
    .map((file) => {
      if (file === "index.html") return `https://${target.domain}/`;
      const route = file.replace(/\/index\.html$/, "");
      return `https://${target.domain}/${route}/`;
    })
    .sort();
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`),
    '</urlset>',
    ''
  ].join("\n");
  const robots = [
    "User-agent: *",
    "Allow: /",
    `Sitemap: https://${target.domain}/sitemap.xml`,
    ""
  ].join("\n");
  await writeFile(path.join(targetRoot, "sitemap.xml"), sitemap, "utf8");
  await writeFile(path.join(targetRoot, "robots.txt"), robots, "utf8");
}

async function createPackageManifest(target, targetRoot) {
  const files = await listFiles(targetRoot);
  const records = [];
  for (const file of files) {
    const bytes = await readFile(path.join(targetRoot, file));
    records.push({
      path: `/${file}`,
      bytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex")
    });
  }
  const manifest = {
    release: "oneworldz-ecosystem-locked-v1",
    generated_at: generatedAt,
    target: target.key,
    live_url: `https://${target.domain}/`,
    github_environment: target.environment,
    deploy_guard: target.guard,
    ftp_account_scope: "DOMAIN_ONLY",
    ftp_root: "/",
    homepage: "/index.html",
    assets_root: "/assets/",
    protected_services_modified: [],
    files: records
  };
  await writeFile(path.join(targetRoot, "release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function buildTarget(target) {
  const targetRoot = path.join(distRoot, target.key);
  await mkdir(targetRoot, { recursive: true });
  await copyShellAssets(targetRoot);

  if (target.key === "cryptoworldz") {
    await writeRoute(targetRoot, target, "", cryptoHome());
    await writeRoute(targetRoot, target, "command-centre", commandCentrePage());
    await writeRoute(targetRoot, target, "miniapp", miniAppPage());
    await writeRoute(targetRoot, target, "support/reagan-children", supportPage("reagan"));
    await writeRoute(targetRoot, target, "support/community-impact", supportPage("community"));
    await writeRoute(targetRoot, target, "support/jayjayteamdev", supportPage("jayjay"));
    for (const division of divisions) await writeRoute(targetRoot, target, `divisions/${division.key}`, divisionPage(division));
  } else if (target.key === "purplediamondcrew") {
    await writeRoute(targetRoot, target, "", pdcPage());
  } else if (target.key === "impactbased") {
    await writeRoute(targetRoot, target, "", impactBasedPage());
  } else if (target.key === "law-oneworldz") {
    await writeRoute(targetRoot, target, "", lawPage());
  } else if (target.key === "learn-oneworldz") {
    await writeRoute(targetRoot, target, "", learnPage());
  } else {
    const world = worldz.find((candidate) => candidate.key === target.key);
    if (!world) throw new Error(`No Worldz configuration for ${target.key}`);
    await writeRoute(targetRoot, target, "", chainHome(world));
  }

  await copyReferencedMedia(targetRoot);
  await writeSeoDiscoveryFiles(target, targetRoot);
  await createPackageManifest(target, targetRoot);
}

await rm(path.join(appRoot, "dist"), { recursive: true, force: true });
await mkdir(distRoot, { recursive: true });
for (const target of deploymentTargets) await buildTarget(target);

const fleetManifest = {
  release: "oneworldz-ecosystem-locked-v1",
  generated_at: generatedAt,
  protected_unchanged: [linksSafe("https://cryptobotz.cryptoworldz.xyz")],
  targets: deploymentTargets.map((target) => ({
    ...target,
    package: `./${target.key}/`,
    live_url: `https://${target.domain}/`
  }))
};
await writeFile(path.join(distRoot, "fleet-manifest.json"), `${JSON.stringify(fleetManifest, null, 2)}\n`, "utf8");

function linksSafe(value) {
  return value;
}

console.log(`Built ${deploymentTargets.length} domain packages at ${distRoot}`);
