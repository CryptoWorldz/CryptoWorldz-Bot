import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { deploymentTargets, humanLeaders, pdcTokens, supportProfiles, systemRoles, worldz } from "../site-data.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(appRoot, "dist", "ecosystem");

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(target));
    else if (entry.name.endsWith(".html")) out.push(target);
  }
  return out;
}

test("every confirmed domain has a root package and exact Hostinger root contract", async () => {
  for (const target of deploymentTargets) {
    assert.equal(target.root, "/");
    assert.ok(target.environment.endsWith("-production"));
    assert.ok(target.guard.length > 6);
    assert.ok((await stat(path.join(distRoot, target.key, "index.html"))).size > 0, target.key);
  }
});

test("OneWorldz and CryptoBotz are never deployment targets", () => {
  const domains = new Set(deploymentTargets.map((target) => target.domain));
  assert.equal(domains.has("oneworldz.com"), false);
  assert.equal(domains.has("cryptobotz.cryptoworldz.xyz"), false);
});

test("banned images, GoFundMe, placeholders and Coming Soon are absent", async () => {
  for (const target of deploymentTargets) {
    for (const file of await htmlFiles(path.join(distRoot, target.key))) {
      const html = await readFile(file, "utf8");
      assert.doesNotMatch(html, /oneworld-one-mission-smile|one-world-one-mission-smile|oneworld-one-mission|go fund me|gofundme|coming soon|placeholder/i, file);
    }
  }
});

test("every HTML page has responsive, accessible and self-closing-menu foundations", async () => {
  for (const target of deploymentTargets) {
    for (const file of await htmlFiles(path.join(distRoot, target.key))) {
      const html = await readFile(file, "utf8");
      assert.match(html, /<meta name="viewport"/);
      assert.match(html, /class="menu-button"/);
      assert.match(html, /aria-controls="site-menu"/);
      assert.match(html, /class="menu-backdrop"/);
      assert.match(html, /assets\/js\/site\.js/);
    }
  }
});

test("CryptoWorldz includes every locked route and all verified payment destinations", async () => {
  const html = await readFile(path.join(distRoot, "cryptoworldz", "index.html"), "utf8");
  const required = [
    "EXPLORE THE WORLDZ", "BEGINNER CRYPTO EDUCATION", "SAFETY & SCAM REGISTER", "COMMAND CENTRE ULTIMATE™",
    "HUMAN LEADERSHIP", "ZED MISSIONS & GOVERNANCE", "REWARDS CENTRE", "LAUNCHPAD × BASED.BID", "IMPACTBASED",
    "HUMAN IMPACT", "PURPLE DIAMOND CREW", "NEWS & UPDATES", "THE GLOBAL GATEWAY", "ACKNOWLEDGEMENTS"
  ];
  for (const item of required) assert.ok(html.includes(item), item);
  assert.ok((await stat(path.join(distRoot, "cryptoworldz", "support", "reagan-children", "index.html"))).size > 0);
  assert.ok((await stat(path.join(distRoot, "cryptoworldz", "support", "community-impact", "index.html"))).size > 0);
  assert.ok((await stat(path.join(distRoot, "cryptoworldz", "support", "jayjayteamdev", "index.html"))).size > 0);
  assert.ok(html.includes("https://donate.stripe.com/14A6oHcG61Ox87Y0Xb0kE01"));
  assert.ok(html.includes("https://donate.stripe.com/9B67sLgWm78R73U35j0kE02"));
  assert.ok(html.includes("https://buy.stripe.com/6oUeVd9tU0Ktewm0Xb0kE00"));
});

test("CryptoWorldz preserves the complete locked section order with acknowledgements last", async () => {
  const html = await readFile(path.join(distRoot, "cryptoworldz", "index.html"), "utf8");
  const ids = ["purpose", "worldz", "learn", "safety", "command", "human-leadership", "governance", "rewards", "launchpad", "impactbased", "impact", "pdc", "updates", "oneworldz", "acknowledgements"];
  let last = -1;
  for (const id of ids) {
    const position = html.indexOf(`id="${id}"`);
    assert.ok(position > last, `${id} must remain in locked order`);
    last = position;
  }
});

test("community page preserves 35 unique verified destinations without generic production names", async () => {
  const html = await readFile(path.join(distRoot, "cryptoworldz", "support", "community-impact", "index.html"), "utf8");
  assert.equal(supportProfiles.length, 35);
  assert.equal(new Set(supportProfiles.map((profile) => profile.url)).size, 35);
  for (const profile of supportProfiles) {
    assert.ok(html.includes(profile.url));
    assert.ok(html.includes(profile.name));
  }
  assert.doesNotMatch(html, /Facebook Support Profile\s*\d+/i);
});

test("Command Centre preserves five system roles, five human leaders and safe boundaries", async () => {
  const html = await readFile(path.join(distRoot, "cryptoworldz", "command-centre", "index.html"), "utf8");
  assert.equal(systemRoles.length, 5);
  assert.equal(humanLeaders.length, 5);
  for (const [name] of systemRoles) assert.ok(html.includes(name), name);
  for (const name of humanLeaders) assert.ok(html.includes(name), name);
  assert.match(html, /Zero signing • zero execution • protected owner controls/);
});

test("PDC registry contains exactly ten verified positions and exact addresses", async () => {
  const html = await readFile(path.join(distRoot, "purplediamondcrew", "index.html"), "utf8");
  assert.equal(pdcTokens.length, 10);
  for (const token of pdcTokens) {
    assert.ok(html.includes(token.name));
    assert.ok(html.includes(token.address));
    assert.ok(html.includes(token.url));
  }
});

test("only currently authorised Worldz destinations are presented as open reciprocal links", async () => {
  const crypto = await readFile(path.join(distRoot, "cryptoworldz", "index.html"), "utf8");
  assert.equal(worldz.length, 9);
  for (const world of worldz) assert.ok(crypto.includes(`https://${world.domain}`), world.domain);
  for (const world of worldz) {
    const html = await readFile(path.join(distRoot, world.key, "index.html"), "utf8");
    assert.ok(html.includes("https://oneworldz.com"));
    assert.ok(html.includes("https://cryptoworldz.xyz"));
    assert.ok(html.includes('id="acknowledgements"'));
  }
});

test("all referenced local assets exist and are non-empty", async () => {
  for (const target of deploymentTargets) {
    const targetRoot = path.join(distRoot, target.key);
    for (const file of await htmlFiles(targetRoot)) {
      const html = await readFile(file, "utf8");
      const refs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
      for (const ref of refs) {
        const absolute = path.join(targetRoot, ref.replace(/^\//, ""));
        assert.ok((await stat(absolute)).size > 0, `${target.key}: ${ref}`);
      }
    }
  }
});

test("every production picture uses separate desktop and mobile files", async () => {
  for (const target of deploymentTargets) {
    const targetRoot = path.join(distRoot, target.key);
    for (const file of await htmlFiles(targetRoot)) {
      const html = await readFile(file, "utf8");
      for (const match of html.matchAll(/<picture class="production-picture[^>]*>[\s\S]*?<source[^>]+srcset="([^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/g)) {
        assert.notEqual(match[1], match[2], `${file}: desktop and mobile files must differ`);
      }
    }
  }
});

test("no production artwork is duplicated inside a page main region", async () => {
  for (const target of deploymentTargets) {
    const targetRoot = path.join(distRoot, target.key);
    for (const file of await htmlFiles(targetRoot)) {
      const html = await readFile(file, "utf8");
      const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] || "";
      const desktopImages = [...main.matchAll(/<img[^>]+src="([^"]+)"/g)].map((match) => match[1]);
      const counts = new Map();
      for (const src of desktopImages) counts.set(src, (counts.get(src) || 0) + 1);
      for (const [src, count] of counts) assert.ok(count <= 1, `${file}: duplicated ${src}`);
    }
  }
});

test("HodlerWorldz preserves its dedicated identity", async () => {
  const html = await readFile(path.join(distRoot, "hodlerworldz", "index.html"), "utf8");
  assert.match(html, /HodlerWorldz/);
  assert.match(html, /Education • Recognition • Rewards/);
  assert.doesNotMatch(html, /SuiWorldz approved desktop/i);
});

test("responsive stylesheet enforces Android-safe layout and reduced motion", async () => {
  const css = await readFile(path.join(distRoot, "cryptoworldz", "assets", "css", "site.css"), "utf8");
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /overflow-x:\s*clip/);
});
