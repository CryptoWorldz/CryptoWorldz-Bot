import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expansionTargets, ecosystemDestinations, ownedRootDomains, excludedRootDomains } from "./ecosystem-topology.mjs";
import { donateSupportPage, donateWorldzPage, foodWorldzPage, hodlerGalaxyPage } from "./expansion-pages.mjs";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.join(appRoot, "source");
const distRoot = path.join(appRoot, "dist", "ecosystem");
const generatedAt = new Date().toISOString();

function pageUrl(domain, route = "") {
  const clean = String(route).replace(/^\/+|\/+$/g, "");
  return clean ? `https://${domain}/${clean}/` : `https://${domain}/`;
}

function escapeAttribute(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function enhanceSeo(target, route, sourceHtml) {
  const canonical = pageUrl(target.domain, route);
  const title = sourceHtml.match(/<title>([\s\S]*?)<\/title>/)?.[1] || target.key;
  const description = sourceHtml.match(/<meta name="description" content="([^"]*)">/)?.[1] || "OneWorldz ecosystem destination.";
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title.replace(/&amp;/g, "&"),
    description,
    url: canonical,
    inLanguage: "en",
    isPartOf: { "@type": "WebSite", name: target.key, url: `https://${target.domain}/` },
    creator: { "@type": "Organization", name: "OneWorldz" }
  }).replaceAll("<", "\\u003c");
  const tags = [
    '  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">',
    '  <meta name="author" content="JayJayTeamDev™">',
    '  <meta property="og:type" content="website">',
    `  <meta property="og:title" content="${escapeAttribute(title)}">`,
    `  <meta property="og:description" content="${escapeAttribute(description)}">`,
    `  <meta property="og:url" content="${canonical}">`,
    '  <meta name="twitter:card" content="summary_large_image">',
    `  <meta name="twitter:title" content="${escapeAttribute(title)}">`,
    `  <meta name="twitter:description" content="${escapeAttribute(description)}">`,
    '  <link rel="sitemap" type="application/xml" href="/sitemap.xml">',
    `  <script type="application/ld+json">${schema}</script>`
  ];
  let html = sourceHtml.replace("</head>", `${tags.join("\n")}\n</head>`);
  html = html.replaceAll('loading="eager"', 'loading="lazy"');
  const mainStart = html.indexOf('<main id="main-content">');
  const mainEnd = mainStart >= 0 ? html.indexOf("</main>", mainStart) : -1;
  if (mainStart >= 0 && mainEnd >= 0) {
    const before = html.slice(0, mainStart);
    let main = html.slice(mainStart, mainEnd);
    const after = html.slice(mainEnd);
    main = main.replace(/<img\b([^>]*?)loading="lazy"([^>]*)>/, (match, left, right) => `<img${left}loading="eager" fetchpriority="high"${right}>`);
    html = `${before}${main}${after}`;
  }
  return html;
}

async function listFiles(root, relative = "") {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, child));
    else files.push(child.split(path.sep).join("/"));
  }
  return files.sort();
}

async function writeRoute(targetRoot, target, route, html) {
  const routeRoot = path.join(targetRoot, route);
  await mkdir(routeRoot, { recursive: true });
  await writeFile(path.join(routeRoot, "index.html"), enhanceSeo(target, route, html), "utf8");
}

async function copyShell(targetRoot) {
  await mkdir(path.join(targetRoot, "assets", "css"), { recursive: true });
  await mkdir(path.join(targetRoot, "assets", "js"), { recursive: true });
  await cp(path.join(sourceRoot, "site.css"), path.join(targetRoot, "assets", "css", "site.css"));
  await cp(path.join(sourceRoot, "site.js"), path.join(targetRoot, "assets", "js", "site.js"));
}

async function copyReferencedMedia(targetRoot) {
  const html = (await Promise.all((await listFiles(targetRoot)).filter((file) => file.endsWith(".html")).map((file) => readFile(path.join(targetRoot, file), "utf8")))).join("\n");
  const media = new Set([...html.matchAll(/(?:src|srcset)="(\/assets\/(?:desktop|mobile|support)\/[^"?#]+)"/g)].map((match) => match[1].slice("/assets/".length)));
  for (const relative of media) {
    if (relative.includes("..")) throw new Error(`Unsafe asset path: ${relative}`);
    const source = path.join(sourceRoot, "assets", relative);
    const destination = path.join(targetRoot, "assets", relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination);
  }
}

async function writeDiscovery(target, targetRoot) {
  const pages = (await listFiles(targetRoot)).filter((file) => file.endsWith("index.html")).map((file) => file === "index.html" ? `https://${target.domain}/` : `https://${target.domain}/${file.replace(/\/index\.html$/, "")}/`).sort();
  const sitemap = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...pages.map((url) => `  <url><loc>${url}</loc></url>`), '</urlset>', ''].join("\n");
  const robots = ["User-agent: *", "Allow: /", `Sitemap: https://${target.domain}/sitemap.xml`, ""].join("\n");
  await writeFile(path.join(targetRoot, "sitemap.xml"), sitemap, "utf8");
  await writeFile(path.join(targetRoot, "robots.txt"), robots, "utf8");
}

async function writeManifest(target, targetRoot) {
  const records = [];
  for (const file of await listFiles(targetRoot)) {
    const bytes = await readFile(path.join(targetRoot, file));
    records.push({ path: `/${file}`, bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  const manifest = {
    release: "oneworldz-ecosystem-19-destination-build-v1",
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

async function buildExpansionTarget(target) {
  const targetRoot = path.join(distRoot, target.key);
  await mkdir(targetRoot, { recursive: true });
  await copyShell(targetRoot);
  if (target.key === "foodworldz") {
    await writeRoute(targetRoot, target, "", foodWorldzPage());
  } else if (target.key === "donateworldz") {
    await writeRoute(targetRoot, target, "", donateWorldzPage());
    await writeRoute(targetRoot, target, "reagan-children", donateSupportPage("reagan"));
    await writeRoute(targetRoot, target, "community-impact", donateSupportPage("community"));
    await writeRoute(targetRoot, target, "jayjayteamdev", donateSupportPage("jayjay"));
  } else if (target.key === "hodlergalaxy") {
    await writeRoute(targetRoot, target, "", hodlerGalaxyPage());
  } else {
    throw new Error(`Unknown expansion target: ${target.key}`);
  }
  await copyReferencedMedia(targetRoot);
  await writeDiscovery(target, targetRoot);
  await writeManifest(target, targetRoot);
}

for (const target of expansionTargets) await buildExpansionTarget(target);

const fleetManifestPath = path.join(distRoot, "fleet-manifest.json");
const fleetManifest = JSON.parse(await readFile(fleetManifestPath, "utf8"));
fleetManifest.release = "oneworldz-ecosystem-19-destination-build-v1";
fleetManifest.generated_at = generatedAt;
fleetManifest.architecture = {
  ecosystem_destinations: 19,
  active_owned_root_domains: ownedRootDomains.length,
  static_build_targets: fleetManifest.targets.length + expansionTargets.length,
  protected_existing_destinations: ["https://oneworldz.com", "https://cryptobotz.cryptoworldz.xyz"],
  excluded_owned_root_domains: excludedRootDomains
};
fleetManifest.targets.push(...expansionTargets.map((target) => ({ ...target, package: `./${target.key}/`, live_url: `https://${target.domain}/` })));
fleetManifest.ecosystem_destinations = ecosystemDestinations;
await writeFile(fleetManifestPath, `${JSON.stringify(fleetManifest, null, 2)}\n`, "utf8");

console.log(`Expanded build to ${fleetManifest.targets.length} static packages representing ${ecosystemDestinations.length} ecosystem destinations.`);
