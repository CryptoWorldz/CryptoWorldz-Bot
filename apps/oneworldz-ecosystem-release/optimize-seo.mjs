import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productionTargets } from "./production-targets.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(root, "dist", "ecosystem");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

const escAttr = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");
const escXml = (value = "") => escAttr(value).replaceAll("'", "&apos;");
const decode = (value = "") => String(value)
  .replaceAll("&amp;", "&")
  .replaceAll("&quot;", '"')
  .replaceAll("&#39;", "'")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">");
const plain = (value = "") => decode(String(value).replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

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

function routeForFile(file) {
  if (file === "index.html") return "/";
  if (file.endsWith("/index.html")) return `/${file.slice(0, -"index.html".length)}`;
  return `/${file}`;
}

function firstMatch(html, re) {
  return html.match(re)?.[1]?.trim() || "";
}

function normalDescription(html, fallback) {
  const existing = decode(firstMatch(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["'][^>]*>/i));
  const firstParagraph = plain(firstMatch(html, /<p\b[^>]*>([\s\S]*?)<\/p>/i));
  let value = existing || firstParagraph || fallback;
  value = value.replace(/\s+/g, " ").trim();
  if (value.length < 50) value = `${value} Explore verified information, connected pathways and practical action across the OneWorldz ecosystem.`;
  if (value.length > 180) value = `${value.slice(0, 176).replace(/[\s,;:.-]+$/g, "")}…`;
  return value;
}

function absoluteAsset(domain, src) {
  if (!src) return "";
  try {
    const url = new URL(src, `https://${domain}/`);
    if (!/^https?:$/.test(url.protocol)) return "";
    return url.href;
  } catch {
    return "";
  }
}

function chooseSocialImage(html, domain) {
  const previous = firstMatch(html, /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["'][^>]*>/i);
  const main = firstMatch(html, /<main\b[^>]*>([\s\S]*?)<\/main>/i) || html;
  const images = [...main.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  const useful = images.find((img) => {
    const alt = firstMatch(img, /\balt=["']([^"']*)["']/i);
    return alt && !/aria-hidden=["']true["']/i.test(img);
  }) || images[0] || "";
  const src = firstMatch(useful, /\bsrc=["']([^"']+)["']/i);
  const alt = decode(firstMatch(useful, /\balt=["']([^"']*)["']/i));
  return { url: absoluteAsset(domain, src) || previous, alt };
}

function cleanSeoHead(html) {
  const patterns = [
    /\s*<meta\s+name=["']keywords["'][^>]*>/gi,
    /\s*<meta\s+name=["']robots["'][^>]*>/gi,
    /\s*<meta\s+property=["']og:[^"']+["'][^>]*>/gi,
    /\s*<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi,
    /\s*<link\s+rel=["']canonical["'][^>]*>/gi,
    /\s*<link\s+rel=["']sitemap["'][^>]*>/gi,
    /\s*<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi
  ];
  for (const pattern of patterns) html = html.replace(pattern, "");
  return html;
}

function normalizeImages(html, siteName) {
  const mainStart = html.search(/<main\b/i);
  let primaryAssigned = false;
  return html.replace(/<img\b[^>]*>/gi, (tag, offset) => {
    const decorative = /aria-hidden=["']true["']/i.test(tag);
    let alt = firstMatch(tag, /\balt=["']([^"']*)["']/i);
    if (!alt && !decorative) {
      const src = firstMatch(tag, /\bsrc=["']([^"']+)["']/i);
      const basename = decodeURIComponent((src.split("/").pop() || "image").split("?")[0]).replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
      alt = `${siteName} ${basename}`.trim();
      if (/\balt=["'][^"']*["']/i.test(tag)) tag = tag.replace(/\balt=["'][^"']*["']/i, `alt="${escAttr(alt)}"`);
      else tag = tag.replace(/<img\b/i, `<img alt="${escAttr(alt)}"`);
    } else if (!/\balt=/i.test(tag)) {
      tag = tag.replace(/<img\b/i, '<img alt=""');
    }
    if (!/\bdecoding=/i.test(tag)) tag = tag.replace(/>$/, ' decoding="async">');

    const inMain = mainStart >= 0 && offset > mainStart;
    const contentImage = !decorative && inMain;
    if (contentImage && !primaryAssigned) {
      primaryAssigned = true;
      if (/\bloading=["'][^"']+["']/i.test(tag)) tag = tag.replace(/\bloading=["'][^"']+["']/i, 'loading="eager"');
      else tag = tag.replace(/>$/, ' loading="eager">');
      if (/\bfetchpriority=["'][^"']+["']/i.test(tag)) tag = tag.replace(/\bfetchpriority=["'][^"']+["']/i, 'fetchpriority="high"');
      else tag = tag.replace(/>$/, ' fetchpriority="high">');
    } else if (contentImage) {
      if (/\bloading=["'][^"']+["']/i.test(tag)) tag = tag.replace(/\bloading=["'][^"']+["']/i, 'loading="lazy"');
      else tag = tag.replace(/>$/, ' loading="lazy">');
      tag = tag.replace(/\s+fetchpriority=["'][^"']+["']/i, "");
    }
    return tag;
  });
}

function structuredData({ canonical, domain, title, description, siteName, socialImage }) {
  const websiteId = `https://${domain}/#website`;
  const webpageId = `${canonical}#webpage`;
  const graph = [
    {
      "@type": "WebSite",
      "@id": websiteId,
      url: `https://${domain}/`,
      name: siteName,
      inLanguage: "en"
    },
    {
      "@type": "WebPage",
      "@id": webpageId,
      url: canonical,
      name: title,
      description,
      inLanguage: "en",
      isPartOf: { "@id": websiteId }
    }
  ];
  if (socialImage.url) {
    graph[1].primaryImageOfPage = {
      "@type": "ImageObject",
      url: socialImage.url,
      ...(socialImage.alt ? { caption: socialImage.alt } : {})
    };
  }
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replaceAll("<", "\\u003c");
}

function optimizeHtml(html, { domain, file, expectedTitle }) {
  const route = routeForFile(file);
  const canonical = `https://${domain}${route}`;
  const existingTitle = decode(firstMatch(html, /<title>([\s\S]*?)<\/title>/i));
  const h1 = plain(firstMatch(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i));
  const title = existingTitle || (h1 ? `${h1} | ${domain}` : expectedTitle || domain);
  const siteName = (title.split("|")[0] || h1 || domain).trim();
  const description = normalDescription(html, `${siteName} connects verified information, practical action and trusted OneWorldz pathways.`);
  html = normalizeImages(html, siteName);
  const socialImage = chooseSocialImage(html, domain);
  html = cleanSeoHead(html);

  if (!/<html\b[^>]*\blang=/i.test(html)) html = html.replace(/<html\b/i, '<html lang="en"');
  if (!/<meta\s+name=["']description["']/i.test(html)) html = html.replace(/<title>[\s\S]*?<\/title>/i, (m) => `${m}<meta name="description" content="${escAttr(description)}">`);
  else html = html.replace(/<meta\s+name=["']description["']\s+content=["'][^"']*["'][^>]*>/i, `<meta name="description" content="${escAttr(description)}">`);

  const schema = structuredData({ canonical, domain, title, description, siteName, socialImage });
  const tags = [
    `<link rel="canonical" href="${canonical}">`,
    '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">',
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${escAttr(siteName)}">`,
    '<meta property="og:locale" content="en_AU">',
    `<meta property="og:title" content="${escAttr(title)}">`,
    `<meta property="og:description" content="${escAttr(description)}">`,
    `<meta property="og:url" content="${canonical}">`,
    ...(socialImage.url ? [
      `<meta property="og:image" content="${escAttr(socialImage.url)}">`,
      `<meta property="og:image:secure_url" content="${escAttr(socialImage.url)}">`,
      ...(socialImage.alt ? [`<meta property="og:image:alt" content="${escAttr(socialImage.alt)}">`] : [])
    ] : []),
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escAttr(title)}">`,
    `<meta name="twitter:description" content="${escAttr(description)}">`,
    ...(socialImage.url ? [
      `<meta name="twitter:image" content="${escAttr(socialImage.url)}">`,
      ...(socialImage.alt ? [`<meta name="twitter:image:alt" content="${escAttr(socialImage.alt)}">`] : [])
    ] : []),
    '<link rel="sitemap" type="application/xml" href="/sitemap.xml">',
    `<script type="application/ld+json">${schema}</script>`
  ].join("\n  ");
  html = html.replace("</head>", `  ${tags}\n</head>`);
  return { html, canonical, title, description, socialImage };
}

function imageEntries(html, domain) {
  const entries = [];
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const alt = decode(firstMatch(tag, /\balt=["']([^"']*)["']/i));
    if (!alt || /aria-hidden=["']true["']/i.test(tag)) continue;
    const src = firstMatch(tag, /\bsrc=["']([^"']+)["']/i);
    const url = absoluteAsset(domain, src);
    if (url && new URL(url).hostname === domain) entries.push({ url, alt });
  }
  return [...new Map(entries.map((entry) => [entry.url, entry])).values()];
}

async function refreshManifest(packageDir, seoSummary) {
  const manifestPath = path.join(packageDir, "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const records = [];
  for (const file of await listFiles(packageDir)) {
    if (file === "release-manifest.json") continue;
    const bytes = await readFile(path.join(packageDir, file));
    records.push({ path: `/${file}`, bytes: bytes.byteLength, sha256: hash(bytes) });
  }
  manifest.generated_at = new Date().toISOString();
  manifest.seo = seoSummary;
  manifest.files = records;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

let totalPages = 0;
let totalImages = 0;
for (const target of productionTargets) {
  const packageDir = path.join(distRoot, target.key);
  const files = (await listFiles(packageDir)).filter((file) => file.endsWith(".html"));
  const pages = [];
  const titles = new Set();
  const descriptions = new Set();
  for (const file of files) {
    const htmlPath = path.join(packageDir, file);
    const original = await readFile(htmlPath, "utf8");
    const optimized = optimizeHtml(original, { domain: target.domain, file, expectedTitle: target.expectedTitle });
    if (titles.has(optimized.title)) throw new Error(`${target.key}/${file}: duplicate title '${optimized.title}'`);
    if (descriptions.has(optimized.description)) throw new Error(`${target.key}/${file}: duplicate meta description`);
    titles.add(optimized.title);
    descriptions.add(optimized.description);
    await writeFile(htmlPath, optimized.html, "utf8");
    const images = imageEntries(optimized.html, target.domain);
    pages.push({ ...optimized, file, images });
    totalImages += images.length;
  }

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...pages.map((page) => {
      const imageXml = page.images.map((image) => `<image:image><image:loc>${escXml(image.url)}</image:loc><image:caption>${escXml(image.alt)}</image:caption></image:image>`).join("");
      return `<url><loc>${escXml(page.canonical)}</loc>${imageXml}</url>`;
    }),
    '</urlset>',
    ''
  ].join("\n");
  await writeFile(path.join(packageDir, "sitemap.xml"), sitemap, "utf8");
  await writeFile(path.join(packageDir, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: https://${target.domain}/sitemap.xml\n`, "utf8");
  await refreshManifest(packageDir, {
    standard: "Google Search Central people-first technical SEO",
    keyword_stuffing: false,
    meta_keywords: false,
    pages: pages.length,
    unique_titles: titles.size,
    unique_descriptions: descriptions.size,
    canonical_urls: pages.length,
    image_sitemap: true,
    descriptive_alt_text_required: true,
    open_graph: true,
    twitter_cards: true,
    structured_data: "WebSite + WebPage",
    robots_index_follow: true
  });
  totalPages += pages.length;
}

console.log(`SEO optimizer complete: ${productionTargets.length} destinations, ${totalPages} HTML pages, ${totalImages} indexable image references. No meta-keyword stuffing used.`);
