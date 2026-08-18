import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { jayJayLaunchContract } from "../jayjay-launch-contract.mjs";
import { pdcTokens, worldz } from "../site-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist", "ecosystem");
const read = (key, relative) => readFile(path.join(dist, key, relative), "utf8");

test("JayJayTeamDev official OneWorldz and CryptoWorldz social launch network is present", async () => {
  const one = await read("oneworldz", "index.html");
  const crypto = await read("cryptoworldz", "index.html");
  assert.ok(one.includes(jayJayLaunchContract.socials.oneWorldzX.url));
  assert.ok(one.includes(jayJayLaunchContract.socials.oneWorldzTelegram.url));
  assert.ok(one.includes(jayJayLaunchContract.oneWorldz.motto));
  assert.ok(crypto.includes(jayJayLaunchContract.socials.cryptoWorldzX.url));
  assert.ok(crypto.includes(jayJayLaunchContract.socials.zedBot.url));
  assert.ok(crypto.includes(jayJayLaunchContract.socials.raaiiiddTeam.url));
});

test("CryptoWorldz has total markets and protected wallet entry while OneWorldz has no crypto market surface", async () => {
  await stat(path.join(dist, "cryptoworldz", "markets", "index.html"));
  const markets = await read("cryptoworldz", "markets/index.html");
  assert.ok(markets.includes("Total chart coverage lives in CryptoWorldz."));
  assert.ok(markets.includes(jayJayLaunchContract.cryptoWorldz.protectedWalletEntry));
  for (const token of pdcTokens) assert.ok(markets.includes(token.address), `markets missing verified ${token.name} address`);
  const oneFiles = ["index.html", "community-support/index.html", "sponsor-apply/index.html"];
  for (const relative of oneFiles) {
    const html = await read("oneworldz", relative);
    assert.doesNotMatch(html, /DEX Chart|wallet portfolio|trading interface/i, `OneWorldz crypto market surface leaked into ${relative}`);
  }
});

test("every Blockchain World has its dedicated DEX Chart route and homepage link", async () => {
  for (const world of worldz) {
    await stat(path.join(dist, world.key, "dex", "index.html"));
    const dex = await read(world.key, "dex/index.html");
    const home = await read(world.key, "index.html");
    assert.ok(dex.includes(`${world.name} DEX Chart`));
    assert.ok(dex.includes("Verified addresses only."));
    assert.ok(dex.includes("CryptoWorldz Markets"));
    assert.ok(home.includes('href="/dex/"'), `${world.key}: home must link dedicated DEX route`);
    const sitemap = await read(world.key, "sitemap.xml");
    assert.ok(sitemap.includes(`https://${world.domain}/dex/`), `${world.key}: DEX route must be audited through sitemap`);
  }
});

test("Sponsor Apply routes are real launch pages, not placeholders", async () => {
  await stat(path.join(dist, "oneworldz", "sponsor-apply", "index.html"));
  await stat(path.join(dist, "cryptoworldz", "apply", "index.html"));
  const one = await read("oneworldz", "sponsor-apply/index.html");
  const crypto = await read("cryptoworldz", "apply/index.html");
  assert.ok(one.includes(jayJayLaunchContract.socials.oneWorldzTelegram.url));
  assert.ok(one.includes(jayJayLaunchContract.socials.oneWorldzX.url));
  assert.ok(crypto.includes(jayJayLaunchContract.socials.zedBot.url));
  assert.ok(crypto.includes("Application is not approval."));
  assert.doesNotMatch(one + crypto, /Coming Soon|placeholder/i);
});

test("Acknowledgements is the last section wherever it exists", async () => {
  const targets = ["oneworldz", "cryptoworldz", ...worldz.map((world) => world.key)];
  for (const key of targets) {
    const html = await read(key, "index.html");
    if (!html.includes('id="acknowledgements"')) continue;
    const ack = html.indexOf('id="acknowledgements"');
    const lastSection = html.lastIndexOf("<section");
    const ackSection = html.lastIndexOf("<section", ack);
    assert.equal(lastSection, ackSection, `${key}: Acknowledgements must remain the final section`);
  }
});

test("launch build contains no GoFundMe or Coming Soon production placeholders", async () => {
  const walk = async (dir) => {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...await walk(child));
      else if (entry.name.endsWith(".html")) files.push(child);
    }
    return files;
  };
  for (const file of await walk(dist)) {
    const html = await readFile(file, "utf8");
    assert.doesNotMatch(html, /gofund\.me|gofundme/i, file);
    assert.doesNotMatch(html, /Coming Soon/i, file);
  }
});

test("the first build stage no longer detours through the superseded ImpactBased alias or old OneWorldz protected state", async () => {
  const build = await readFile(path.join(root, "build.mjs"), "utf8");
  assert.doesNotMatch(build, /ImpactBased belongs under CryptoWorldz/);
  assert.doesNotMatch(build, /https:\/\/impactbased\.cryptoworldz\.xyz/);
  assert.doesNotMatch(build, /protected_unchanged:\s*\["https:\/\/oneworldz\.com"/);
});
