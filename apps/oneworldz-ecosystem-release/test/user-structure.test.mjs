import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { productionTargets } from "../production-targets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist", "ecosystem");
const read = (key, rel) => readFile(path.join(dist, key, rel), "utf8");

async function indexPages(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await indexPages(child));
    else if (entry.name === "index.html") out.push(child);
  }
  return out;
}

test("structural tree represents more than fifty directly addressable webpages", async () => {
  const tree = JSON.parse(await readFile(path.join(dist, "user-structure-tree.json"), "utf8"));
  assert.equal(tree.static_hosts, 18);
  assert.ok(tree.published_webpages > 50, `expected >50 pages, got ${tree.published_webpages}`);
  assert.equal(tree.direct_page_access, true);
  assert.equal((await indexPages(dist)).length, tree.published_webpages);
});

test("every production host has a direct directory and acknowledgements page in its sitemap", async () => {
  for (const target of productionTargets) {
    await stat(path.join(dist, target.key, "directory", "index.html"));
    await stat(path.join(dist, target.key, "acknowledgements", "index.html"));
    const sitemap = await read(target.key, "sitemap.xml");
    assert.ok(sitemap.includes(`https://${target.domain}/directory/`), `${target.key}: directory missing from sitemap`);
    assert.ok(sitemap.includes(`https://${target.domain}/acknowledgements/`), `${target.key}: acknowledgements missing from sitemap`);
    const tree = JSON.parse(await read(target.key, "site-tree.json"));
    assert.ok(tree.route_count >= 3, `${target.key}: route tree too small`);
    assert.equal(tree.routes.length, tree.route_count);
  }
});

test("OneWorldz has the exact global acknowledgement and directory canonical URLs", async () => {
  const acknowledgements = await read("oneworldz", "acknowledgements/index.html");
  const directory = await read("oneworldz", "directory/index.html");
  assert.match(acknowledgements, /<title>Acknowledgements \| OneWorldz<\/title>/);
  assert.ok(acknowledgements.includes('<link rel="canonical" href="https://oneworldz.com/acknowledgements/">'));
  assert.ok(acknowledgements.includes("Acknowledgements@OneWorldz"));
  assert.ok(directory.includes('<link rel="canonical" href="https://oneworldz.com/directory/">'));
  for (const target of productionTargets) assert.ok(directory.includes(`https://${target.domain}/directory/`), `global directory missing ${target.domain}`);
});

test("Support JayJayTeamDev gets a dedicated search-focused canonical DonateWorldz page", async () => {
  const support = await read("donateworldz", "support-jayjayteamdev/index.html");
  assert.match(support, /<title>Support JayJayTeamDev \| DonateWorldz<\/title>/);
  assert.ok(support.includes('<link rel="canonical" href="https://donateworldz.com/support-jayjayteamdev/">'));
  assert.ok(support.includes("JayJayTeamDev@DonateWorldz"));
  assert.ok(support.includes("Support JayJayTeamDev"));
  assert.ok(support.includes('href="/jayjayteamdev/"'));
  const legacy = await read("donateworldz", "jayjayteamdev/index.html");
  assert.ok(legacy.includes('<link rel="canonical" href="https://donateworldz.com/support-jayjayteamdev/">'));
});

test("CryptoWorldz has a direct public Command Centre command guide while protected controls remain out of the public page", async () => {
  const commands = await read("cryptoworldz", "command-centre/commands/index.html");
  assert.ok(commands.includes('<link rel="canonical" href="https://cryptoworldz.xyz/command-centre/commands/">'));
  assert.ok(commands.includes("CryptoWorldz Command Centre Commands"));
  assert.ok(commands.includes("/profile"));
  assert.ok(commands.includes("/missions"));
  for (const protectedCommand of ["/autoemergency","/setprojectwallet","/appointexecutive","/metacheck"]) {
    assert.equal(commands.includes(protectedCommand), false, `public guide exposed ${protectedCommand}`);
  }
});

test("every structural page is crawlable, canonical and has exactly one h1", async () => {
  const pages = [
    ["oneworldz", "directory/index.html"],
    ["oneworldz", "acknowledgements/index.html"],
    ["donateworldz", "support-jayjayteamdev/index.html"],
    ["cryptoworldz", "command-centre/commands/index.html"]
  ];
  for (const [key, rel] of pages) {
    const html = await read(key, rel);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${key}/${rel}: expected one h1`);
    assert.ok(html.includes('name="description"'), `${key}/${rel}: description missing`);
    assert.ok(html.includes('name="robots" content="index,follow'), `${key}/${rel}: crawl directive missing`);
    assert.ok(html.includes('rel="canonical"'), `${key}/${rel}: canonical missing`);
    assert.ok(html.includes('BreadcrumbList'), `${key}/${rel}: breadcrumb schema missing`);
    assert.ok(html.length > 1500, `${key}/${rel}: page unexpectedly thin`);
  }
});
