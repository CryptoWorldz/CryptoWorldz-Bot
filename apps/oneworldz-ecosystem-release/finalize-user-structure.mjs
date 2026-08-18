import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { productionTargets } from "./production-targets.mjs";

const require = createRequire(import.meta.url);
const { groupsForRole } = require("../../src/command-registry.js");
const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist", "ecosystem");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const escape = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function canonical(domain, route = "") {
  const clean = String(route).replace(/^\/+|\/+$/g, "");
  return clean ? `https://${domain}/${clean}/` : `https://${domain}/`;
}

async function listFiles(dir, rel = "") {
  const out = [];
  for (const entry of await readdir(path.join(dir, rel), { withFileTypes: true })) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(dir, child));
    else out.push(child.split(path.sep).join("/"));
  }
  return out.sort();
}

async function routesFor(targetRoot) {
  return (await listFiles(targetRoot))
    .filter((file) => file.endsWith("index.html"))
    .map((file) => file === "index.html" ? "/" : `/${file.replace(/\/index\.html$/, "")}/`)
    .sort((a, b) => a.localeCompare(b));
}

function pageShell({ target, route, title, description, label, h1, intro, body, breadcrumbs = [] }) {
  const url = canonical(target.domain, route);
  const crumbs = [
    { name: target.requiredIdentityText, url: canonical(target.domain) },
    ...breadcrumbs,
    { name: label, url }
  ];
  const schema = JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url,
      inLanguage: "en-AU",
      isPartOf: { "@type": "WebSite", name: target.requiredIdentityText, url: canonical(target.domain) },
      creator: { "@type": "Organization", name: "OneWorldz" }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: crumb.url
      }))
    }
  ]).replaceAll("<", "\\u003c");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#090713"><title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><meta name="author" content="JayJayTeamDev™"><link rel="canonical" href="${escape(url)}"><link rel="sitemap" type="application/xml" href="/sitemap.xml"><meta property="og:type" content="website"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(url)}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><link rel="stylesheet" href="/assets/css/site.css"><script type="application/ld+json">${schema}</script></head><body><a class="skip-link" href="#main-content">Skip to content</a><header class="site-header"><a class="site-brand" href="/"><span class="brand-profile text-brand"><b>${escape(target.requiredIdentityText[0] || "O")}</b></span><span><strong>${escape(target.requiredIdentityText)}</strong><small>Direct Page Access</small></span></a><button class="menu-button" type="button" aria-expanded="false" aria-controls="site-menu"><span></span><span></span><span></span><b>Menu</b></button><nav class="site-menu" id="site-menu"><a href="/">Home</a><a href="/directory/">Directory</a><a href="/acknowledgements/">Acknowledgements</a><a href="https://oneworldz.com/directory/">OneWorldz Directory</a></nav></header><button class="menu-backdrop" type="button" aria-label="Close menu" tabindex="-1"></button><main id="main-content"><section class="hero"><div class="hero-copy"><p class="eyebrow">${escape(label)}</p><h1>${escape(h1)}</h1><p>${escape(intro)}</p></div></section>${body}</main><footer class="site-footer vision-footer"><div><strong>Created with the Vision</strong><span>When Someone say's You can't Change the World 🌐 just Say “Why can't I?”</span></div></footer><script src="/assets/js/site.js" defer></script></body></html>`;
}

function routeLabel(route) {
  if (route === "/") return "Home";
  return route.replace(/^\/+|\/+$/g, "").split("/").map((part) => part.split("-").map((word) => word ? word[0].toUpperCase() + word.slice(1) : word).join(" ")).join(" › ");
}

function directoryBody(target, localRoutes) {
  const local = localRoutes.map((route) => `<article><span>${escape(route)}</span><h2>${escape(routeLabel(route))}</h2><p>Direct webpage on ${escape(target.requiredIdentityText)}.</p><a href="${escape(route)}">Open ${escape(routeLabel(route))} →</a></article>`).join("");
  const network = productionTargets.map((item) => `<article><span>${escape(item.domain)}</span><h2>${escape(item.requiredIdentityText)}</h2><p>Open this ecosystem host's complete direct-page directory.</p><a href="https://${escape(item.domain)}/directory/">${escape(item.requiredIdentityText)} Directory →</a></article>`).join("");
  return `<section class="section"><div class="section-heading"><p class="eyebrow">DIRECT PAGE ACCESS</p><h2>Every published page on this host.</h2><p>Each entry has its own canonical URL and can be opened directly without navigating through the homepage first.</p></div><div class="info-grid">${local}</div></section>${target.key === "oneworldz" ? `<section class="section section-dark"><div class="section-heading"><p class="eyebrow">ONEWORLDZ NETWORK TREE</p><h2>Every current ecosystem host.</h2><p>OneWorldz is the top-level directory into the wider domain and subdomain structure.</p></div><div class="info-grid">${network}</div></section>` : ""}`;
}

function acknowledgementsBody(target) {
  return `<section class="section"><div class="section-heading"><p class="eyebrow">ACKNOWLEDGEMENTS@${escape(target.requiredIdentityText.toUpperCase())}</p><h2>People, communities, tools and contributors matter.</h2><p>This dedicated acknowledgement page exists so recognition is never buried inside another page. ${escape(target.requiredIdentityText)} is part of the wider OneWorldz ecosystem created with a vision of practical action, transparent systems and people working together.</p></div><div class="info-grid"><article><span>01</span><h3>Community</h3><p>We acknowledge the people who contribute ideas, time, care, skills, testing, feedback and real-world action.</p></article><article><span>02</span><h3>Partners & Platforms</h3><p>Where third-party services, communities or platforms are used, their contribution remains distinct from ownership or endorsement of OneWorldz.</p></article><article><span>03</span><h3>Transparency</h3><p>Recognition does not replace verification. Public claims, support pathways and system roles remain subject to the specific disclosures on their own pages.</p></article></div><div class="button-row"><a class="button primary" href="/directory/">Open ${escape(target.requiredIdentityText)} Directory</a><a class="button secondary" href="https://oneworldz.com/acknowledgements/">Global OneWorldz Acknowledgements</a></div></section>`;
}

function publicCommandsBody() {
  const groups = groupsForRole("member");
  const cards = groups.map((group) => `<section class="section"><div class="section-heading"><p class="eyebrow">${escape(group.minimumRole.toUpperCase())}</p><h2>${escape(group.label)}</h2></div><div class="info-grid">${group.commands.map((item) => `<article><span>/${escape(item.command)}</span><h3>${escape(item.command)}</h3><p>${escape(item.description)}</p></article>`).join("")}</div></section>`).join("");
  return `${cards}<section class="section section-dark"><div class="section-heading"><p class="eyebrow">PROTECTED COMMANDS</p><h2>Admin, Executive and Owner controls stay authenticated.</h2><p>The public command guide intentionally does not publish sensitive operational instructions. Inside Telegram, /commands expands according to the signed-in user's access and /ownercommands is restricted to JayJayTeamDev.</p></div><div class="button-row"><a class="button primary" href="https://t.me/CryptoWorldzBot">Open @CryptoWorldzBot</a></div></section>`;
}

function supportJayBody() {
  return `<section class="section"><div class="section-heading"><p class="eyebrow">JAYJAYTEAMDEV@DONATEWORLDZ</p><h2>Support JayJayTeamDev directly.</h2><p>This is the dedicated official OneWorldz ecosystem page for people specifically searching for Support JayJayTeamDev, JayJayTeamDev support, or ways to support the creator and ongoing ecosystem development.</p></div><div class="info-grid"><article><span>01</span><h3>Exact Purpose</h3><p>This pathway supports JayJayTeamDev and ecosystem development. It is separate from Reagan & Children and Community Impact support purposes.</p></article><article><span>02</span><h3>Full Support Page</h3><p>The detailed support information and currently approved payment pathways remain on the existing DonateWorldz JayJayTeamDev page.</p><a href="/jayjayteamdev/">Open Full JayJayTeamDev Support →</a></article><article><span>03</span><h3>Other Purposes</h3><p>If you want to support children or community causes instead, use the separate DonateWorldz pathways.</p><a href="/">Choose a DonateWorldz Purpose →</a></article></div><div class="button-row"><a class="button primary" href="/jayjayteamdev/">Support JayJayTeamDev</a><a class="button secondary" href="https://oneworldz.com/directory/">OneWorldz Directory</a></div></section>`;
}

async function writePage(target, route, html) {
  const targetRoot = path.join(dist, target.key);
  const routeRoot = path.join(targetRoot, route);
  await mkdir(routeRoot, { recursive: true });
  await writeFile(path.join(routeRoot, "index.html"), html, "utf8");
}

async function rewriteDiscovery(target) {
  const targetRoot = path.join(dist, target.key);
  const routes = await routesFor(targetRoot);
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...routes.map((route) => `  <url><loc>${canonical(target.domain, route)}</loc></url>`),
    '</urlset>',
    ''
  ].join("\n");
  await writeFile(path.join(targetRoot, "sitemap.xml"), sitemap, "utf8");
  const tree = {
    host: target.domain,
    name: target.requiredIdentityText,
    directory: canonical(target.domain, "directory"),
    acknowledgements: canonical(target.domain, "acknowledgements"),
    route_count: routes.length,
    routes: routes.map((route) => ({ route, url: canonical(target.domain, route), label: routeLabel(route) }))
  };
  await writeFile(path.join(targetRoot, "site-tree.json"), `${JSON.stringify(tree, null, 2)}\n`, "utf8");
  return tree;
}

async function refreshManifest(target, tree) {
  const targetRoot = path.join(dist, target.key);
  const manifestPath = path.join(targetRoot, "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const files = [];
  for (const file of await listFiles(targetRoot)) {
    if (file === "release-manifest.json") continue;
    const bytes = await readFile(path.join(targetRoot, file));
    files.push({ path: `/${file}`, bytes: bytes.byteLength, sha256: hash(bytes) });
  }
  manifest.user_structure = {
    directory: tree.directory,
    acknowledgements: tree.acknowledgements,
    route_count: tree.route_count,
    every_route_directly_addressable: true,
    sitemap_driven_browser_proof_required: true
  };
  manifest.files = files;
  manifest.generated_at = new Date().toISOString();
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

for (const target of productionTargets) {
  const targetRoot = path.join(dist, target.key);
  const currentRoutes = await routesFor(targetRoot);
  const ackRoute = "acknowledgements";
  await writePage(target, ackRoute, pageShell({
    target,
    route: ackRoute,
    title: `Acknowledgements | ${target.requiredIdentityText}`,
    description: `Dedicated ${target.requiredIdentityText} acknowledgements page for contributors, communities, partners and transparent recognition across the OneWorldz ecosystem.`,
    label: `Acknowledgements@${target.requiredIdentityText}`,
    h1: `${target.requiredIdentityText} Acknowledgements`,
    intro: `Direct acknowledgement page for ${target.requiredIdentityText}.`,
    body: acknowledgementsBody(target)
  }));

  if (target.key === "donateworldz") {
    await writePage(target, "support-jayjayteamdev", pageShell({
      target,
      route: "support-jayjayteamdev",
      title: "Support JayJayTeamDev | DonateWorldz",
      description: "Official Support JayJayTeamDev page on DonateWorldz. Direct support for JayJayTeamDev and OneWorldz ecosystem development, separate from child and community donation purposes.",
      label: "JayJayTeamDev@DonateWorldz",
      h1: "Support JayJayTeamDev",
      intro: "The exact official page for people searching for Support JayJayTeamDev.",
      body: supportJayBody()
    }));
    const legacy = path.join(targetRoot, "jayjayteamdev", "index.html");
    let legacyHtml = await readFile(legacy, "utf8");
    legacyHtml = legacyHtml.replace(/<link rel="canonical" href="[^"]+">/, '<link rel="canonical" href="https://donateworldz.com/support-jayjayteamdev/">');
    await writeFile(legacy, legacyHtml, "utf8");
  }

  if (target.key === "cryptoworldz") {
    await writePage(target, "command-centre/commands", pageShell({
      target,
      route: "command-centre/commands",
      title: "CryptoWorldz Command Centre Commands | ZED User Guide",
      description: "Public CryptoWorldz Command Centre command guide for ZED users, profiles, missions, websites, community routes and safe member functions. Protected controls stay authenticated.",
      label: "Commands@CryptoWorldz",
      h1: "CryptoWorldz Command Centre Commands",
      intro: "A direct, searchable guide to the public and member Command Centre structure.",
      body: publicCommandsBody(),
      breadcrumbs: [{ name: "Command Centre", url: canonical(target.domain, "command-centre") }]
    }));
  }

  const routesWithSpecials = await routesFor(targetRoot);
  const directoryRoute = "directory";
  await writePage(target, directoryRoute, pageShell({
    target,
    route: directoryRoute,
    title: `${target.requiredIdentityText} Directory | Every Page & Direct Link`,
    description: `Complete ${target.requiredIdentityText} webpage directory with direct canonical links to every currently published page on ${target.domain}.`,
    label: `Directory@${target.requiredIdentityText}`,
    h1: `${target.requiredIdentityText} Page Directory`,
    intro: `Every published ${target.requiredIdentityText} page has its own direct webpage address.`,
    body: directoryBody(target, [...new Set([...currentRoutes, ...routesWithSpecials, "/directory/"])].sort())
  }));
}

const trees = [];
for (const target of productionTargets) {
  const tree = await rewriteDiscovery(target);
  await refreshManifest(target, tree);
  trees.push(tree);
}

const fleetTree = {
  generated_at: new Date().toISOString(),
  static_hosts: trees.length,
  published_webpages: trees.reduce((sum, tree) => sum + tree.route_count, 0),
  direct_page_access: true,
  search_structure: {
    acknowledgements: "https://oneworldz.com/acknowledgements/",
    support_jayjayteamdev: "https://donateworldz.com/support-jayjayteamdev/",
    command_centre_commands: "https://cryptoworldz.xyz/command-centre/commands/",
    directory: "https://oneworldz.com/directory/"
  },
  hosts: trees
};
await writeFile(path.join(dist, "user-structure-tree.json"), `${JSON.stringify(fleetTree, null, 2)}\n`, "utf8");
if (fleetTree.published_webpages <= 50) throw new Error(`Structural tree must represent more than 50 directly addressable webpages; got ${fleetTree.published_webpages}`);
console.log(`User structural tree PASS: ${fleetTree.static_hosts} hosts, ${fleetTree.published_webpages} directly addressable webpages, sitemap-driven desktop/mobile proof enabled.`);
