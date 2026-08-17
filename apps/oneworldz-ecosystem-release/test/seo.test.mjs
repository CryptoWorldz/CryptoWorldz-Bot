import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { deploymentTargets, links } from "../site-data.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(appRoot, "dist", "ecosystem");

async function htmlFiles(root, relative = "") {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) results.push(...await htmlFiles(root, child));
    else if (entry.name.endsWith(".html")) results.push(child.split(path.sep).join("/"));
  }
  return results.sort();
}

function pageUrl(domain, file) {
  if (file === "index.html") return `https://${domain}/`;
  return `https://${domain}/${file.replace(/\/index\.html$/, "")}/`;
}

function publicDomain(target) {
  return target.key === "impactbased" ? new URL(links.impactBased).hostname : target.domain;
}

test("every production page has complete indexable SEO metadata", async () => {
  for (const target of deploymentTargets) {
    const targetRoot = path.join(distRoot, target.key);
    const domain = publicDomain(target);
    const seenTitles = new Set();
    const seenDescriptions = new Set();
    for (const file of await htmlFiles(targetRoot)) {
      const html = await readFile(path.join(targetRoot, file), "utf8");
      const expectedUrl = pageUrl(domain, file);
      assert.equal((html.match(/<title>/g) || []).length, 1, `${target.key}/${file}: title count`);
      const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || "";
      const description = html.match(/<meta name="description" content="([^"]{30,220})">/)?.[1] || "";
      assert.ok(title, `${target.key}/${file}: title`);
      assert.ok(description, `${target.key}/${file}: description`);
      assert.ok(!seenTitles.has(title), `${target.key}/${file}: duplicate title`);
      assert.ok(!seenDescriptions.has(description), `${target.key}/${file}: duplicate description`);
      seenTitles.add(title);
      seenDescriptions.add(description);
      assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">/, `${target.key}/${file}: robots`);
      assert.ok(html.includes(`<link rel="canonical" href="${expectedUrl}">`), `${target.key}/${file}: canonical ${expectedUrl}`);
      assert.ok(html.includes(`<meta property="og:url" content="${expectedUrl}">`), `${target.key}/${file}: og:url`);
      assert.match(html, /<meta property="og:site_name" content="[^"]+">/, `${target.key}/${file}: og:site_name`);
      assert.match(html, /<meta property="og:locale" content="en_AU">/, `${target.key}/${file}: og:locale`);
      assert.match(html, /<meta property="og:title" content="[^"]+">/, `${target.key}/${file}: og:title`);
      assert.match(html, /<meta property="og:description" content="[^"]+">/, `${target.key}/${file}: og:description`);
      assert.match(html, /<meta name="twitter:card" content="summary_large_image">/, `${target.key}/${file}: twitter card`);
      assert.match(html, /<meta name="twitter:title" content="[^"]+">/, `${target.key}/${file}: twitter title`);
      assert.match(html, /<meta name="twitter:description" content="[^"]+">/, `${target.key}/${file}: twitter description`);
      assert.match(html, /<script type="application\/ld\+json">[\s\S]+?<\/script>/, `${target.key}/${file}: JSON-LD`);
      assert.match(html, /"@type":"WebSite"/, `${target.key}/${file}: WebSite structured data`);
      assert.match(html, /"@type":"WebPage"/, `${target.key}/${file}: WebPage structured data`);
      assert.match(html, /<link rel="sitemap" type="application\/xml" href="\/sitemap\.xml">/, `${target.key}/${file}: sitemap link`);
      assert.equal((html.match(/<h1\b/g) || []).length, 1, `${target.key}/${file}: exactly one h1`);
      assert.doesNotMatch(html, /<meta\s+name="keywords"/i, `${target.key}/${file}: meta keywords must not be used`);
      const images = html.match(/<img\b[^>]*>/g) || [];
      for (const image of images) {
        const alt = image.match(/\balt="([^"]*)"/)?.[1];
        assert.notEqual(alt, undefined, `${target.key}/${file}: image missing alt`);
        if (!alt) assert.match(image, /aria-hidden="true"/, `${target.key}/${file}: empty alt must be decorative`);
        assert.match(image, /decoding="async"/, `${target.key}/${file}: async image decode`);
      }
      if (images.some((image) => /\balt="[^"]+"/.test(image))) {
        assert.match(html, /<meta property="og:image" content="https:\/\/[^"]+">/, `${target.key}/${file}: og:image`);
        assert.match(html, /<meta name="twitter:image" content="https:\/\/[^"]+">/, `${target.key}/${file}: twitter:image`);
      }
    }
  }
});

test("every production domain publishes crawlable robots and an image-aware sitemap", async () => {
  for (const target of deploymentTargets) {
    const targetRoot = path.join(distRoot, target.key);
    const domain = publicDomain(target);
    const files = await htmlFiles(targetRoot);
    const robots = await readFile(path.join(targetRoot, "robots.txt"), "utf8");
    const sitemap = await readFile(path.join(targetRoot, "sitemap.xml"), "utf8");
    assert.match(robots, /^User-agent: \*$/m, domain);
    assert.match(robots, /^Allow: \/$/m, domain);
    assert.ok(robots.includes(`Sitemap: https://${domain}/sitemap.xml`), domain);
    assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9" xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1">/, domain);
    for (const file of files) {
      assert.ok(sitemap.includes(`<loc>${pageUrl(domain, file)}</loc>`), `${domain}: ${file}`);
    }
    if (sitemap.includes("<image:image>")) {
      assert.match(sitemap, /<image:loc>https:\/\//, `${domain}: absolute image URL`);
      assert.match(sitemap, /<image:caption>[^<]+<\/image:caption>/, `${domain}: image caption`);
    }
  }
});

test("page image loading prioritises the first main visual and defers later media", async () => {
  for (const target of deploymentTargets) {
    const targetRoot = path.join(distRoot, target.key);
    for (const file of await htmlFiles(targetRoot)) {
      const html = await readFile(path.join(targetRoot, file), "utf8");
      const main = html.match(/<main id="main-content">([\s\S]*?)<\/main>/)?.[1] || "";
      const images = (main.match(/<img\b[^>]*>/g) || []).filter((image) => !/aria-hidden="true"/.test(image));
      if (!images.length) continue;
      assert.match(images[0], /loading="eager"/, `${target.key}/${file}: first main image eager`);
      assert.match(images[0], /fetchpriority="high"/, `${target.key}/${file}: first main image high priority`);
      for (const image of images.slice(1)) assert.match(image, /loading="lazy"/, `${target.key}/${file}: later image lazy`);
    }
  }
});
