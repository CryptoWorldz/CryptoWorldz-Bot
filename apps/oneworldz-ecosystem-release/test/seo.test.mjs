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
    for (const file of await htmlFiles(targetRoot)) {
      const html = await readFile(path.join(targetRoot, file), "utf8");
      const expectedUrl = pageUrl(domain, file);
      assert.equal((html.match(/<title>/g) || []).length, 1, `${target.key}/${file}: title count`);
      assert.match(html, /<meta name="description" content="[^"]{30,220}">/, `${target.key}/${file}: description`);
      assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">/, `${target.key}/${file}: robots`);
      assert.ok(html.includes(`<link rel="canonical" href="${expectedUrl}">`), `${target.key}/${file}: canonical ${expectedUrl}`);
      assert.ok(html.includes(`<meta property="og:url" content="${expectedUrl}">`), `${target.key}/${file}: og:url`);
      assert.match(html, /<meta property="og:title" content="[^"]+">/, `${target.key}/${file}: og:title`);
      assert.match(html, /<meta property="og:description" content="[^"]+">/, `${target.key}/${file}: og:description`);
      assert.match(html, /<meta name="twitter:card" content="summary_large_image">/, `${target.key}/${file}: twitter card`);
      assert.match(html, /<meta name="twitter:title" content="[^"]+">/, `${target.key}/${file}: twitter title`);
      assert.match(html, /<meta name="twitter:description" content="[^"]+">/, `${target.key}/${file}: twitter description`);
      assert.match(html, /<script type="application\/ld\+json">[\s\S]+?<\/script>/, `${target.key}/${file}: JSON-LD`);
      assert.match(html, /<link rel="sitemap" type="application\/xml" href="\/sitemap\.xml">/, `${target.key}/${file}: sitemap link`);
      assert.equal((html.match(/<h1\b/g) || []).length, 1, `${target.key}/${file}: exactly one h1`);
      for (const image of html.match(/<img\b[^>]*>/g) || []) {
        const alt = image.match(/\balt="([^"]*)"/)?.[1];
        assert.notEqual(alt, undefined, `${target.key}/${file}: image missing alt`);
        if (!alt) assert.match(image, /aria-hidden="true"/, `${target.key}/${file}: empty alt must be decorative`);
      }
    }
  }
});

test("every production domain publishes robots.txt and a complete sitemap.xml", async () => {
  for (const target of deploymentTargets) {
    const targetRoot = path.join(distRoot, target.key);
    const domain = publicDomain(target);
    const files = await htmlFiles(targetRoot);
    const robots = await readFile(path.join(targetRoot, "robots.txt"), "utf8");
    const sitemap = await readFile(path.join(targetRoot, "sitemap.xml"), "utf8");
    assert.match(robots, /^User-agent: \*$/m, domain);
    assert.match(robots, /^Allow: \/$/m, domain);
    assert.ok(robots.includes(`Sitemap: https://${domain}/sitemap.xml`), domain);
    assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/, domain);
    for (const file of files) {
      assert.ok(sitemap.includes(`<loc>${pageUrl(domain, file)}</loc>`), `${domain}: ${file}`);
    }
  }
});

test("page image loading prioritises the first main visual and defers later media", async () => {
  for (const target of deploymentTargets) {
    const targetRoot = path.join(distRoot, target.key);
    for (const file of await htmlFiles(targetRoot)) {
      const html = await readFile(path.join(targetRoot, file), "utf8");
      const main = html.match(/<main id="main-content">([\s\S]*?)<\/main>/)?.[1] || "";
      const images = main.match(/<img\b[^>]*>/g) || [];
      if (!images.length) continue;
      assert.match(images[0], /loading="eager"/, `${target.key}/${file}: first main image eager`);
      assert.match(images[0], /fetchpriority="high"/, `${target.key}/${file}: first main image high priority`);
      for (const image of images.slice(1)) assert.match(image, /loading="lazy"/, `${target.key}/${file}: later image lazy`);
    }
  }
});
