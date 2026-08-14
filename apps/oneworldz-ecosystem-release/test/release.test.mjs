import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { deploymentTargets, divisions, links, pdcTokens, supportProfiles, worldz } from "../site-data.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(appRoot, "dist", "ecosystem");

async function htmlFiles(root, relative = "") {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) results.push(...await htmlFiles(root, child));
    else if (entry.name.endsWith(".html")) results.push(path.join(root, child));
  }
  return results;
}

test("every confirmed domain has a root package and exact Hostinger root contract", async () => {
  assert.equal(deploymentTargets.length, 13);
  for (const target of deploymentTargets) {
    const targetRoot = path.join(distRoot, target.key);
    await access(path.join(targetRoot, "index.html"));
    await access(path.join(targetRoot, "assets"));
    const manifest = JSON.parse(await readFile(path.join(targetRoot, "release-manifest.json"), "utf8"));
    assert.equal(manifest.ftp_root, "/");
    assert.equal(manifest.homepage, "/index.html");
    assert.equal(manifest.assets_root, "/assets/");
    assert.deepEqual(manifest.protected_services_modified, []);
  }
});

test("OneWorldz and CryptoBotz are never deployment targets", () => {
  const keys = deploymentTargets.map(({ key }) => key);
  assert.ok(!keys.includes("oneworldz"));
  assert.ok(!keys.includes("cryptobotz"));
});

test("banned images, GoFundMe, placeholders and Coming Soon are absent", async () => {
  const files = await htmlFiles(distRoot);
  assert.ok(files.length >= 26);
  for (const file of files) {
    const html = await readFile(file, "utf8");
    assert.doesNotMatch(html, /go\s?fund\s?me|gofundme/i, file);
    assert.doesNotMatch(html, /coming soon/i, file);
    assert.doesNotMatch(html, /one-world-one-mission\.webp|100002482[01]|Screenshot_2026/i, file);
    assert.doesNotMatch(html, /recapthisbot-reference-set/i, file);
    assert.doesNotMatch(html, /Support destination \d|Facebook Support Profile \d/i, file);
    assert.doesNotMatch(html, /<img[^>]+src="data:/i, file);
  }
});

test("every HTML page has responsive, accessible and self-closing-menu foundations", async () => {
  const files = await htmlFiles(distRoot);
  for (const file of files) {
    const html = await readFile(file, "utf8");
    assert.match(html, /<html lang="en">/, file);
    assert.match(html, /name="viewport"/, file);
    assert.match(html, /class="skip-link"/, file);
    assert.match(html, /aria-controls="site-menu"/, file);
    assert.match(html, /class="menu-backdrop"/, file);
    assert.match(html, /<main id="main-content">/, file);
    assert.match(html, /site\.js/, file);
  }
});

test("CryptoWorldz includes every locked route and all verified payment destinations", async () => {
  const root = path.join(distRoot, "cryptoworldz");
  const requiredRoutes = [
    "command-centre/index.html", "miniapp/index.html",
    "support/reagan-children/index.html", "support/community-impact/index.html", "support/jayjayteamdev/index.html",
    ...divisions.map((division) => `divisions/${division.key}/index.html`)
  ];
  for (const route of requiredRoutes) await access(path.join(root, route));
  const all = (await Promise.all((await htmlFiles(root)).map((file) => readFile(file, "utf8")))).join("\n");
  for (const url of [links.reaganStripe, links.communityStripe, links.jayjayStripe, links.jayjayPaypal, links.zed, links.raaiiidd]) assert.match(all, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("CryptoWorldz preserves the complete locked section order with acknowledgements last", async () => {
  const html = await readFile(path.join(distRoot, "cryptoworldz", "index.html"), "utf8");
  const ids = ["top", "purpose", "worldz", "learn", "safety", "command", "human-leadership", "governance", "rewards", "launchpad", "impactbased", "impact", "pdc", "updates", "oneworldz", "acknowledgements"];
  const positions = ids.map((id) => html.indexOf(`id="${id}"`));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  const main = html.match(/<main id="main-content">([\s\S]*?)<\/main>/)?.[1] || "";
  assert.match(main.trimEnd(), /id="acknowledgements"[\s\S]*<\/section>$/);
});

test("community page preserves 35 unique verified destinations without generic production names", async () => {
  const html = await readFile(path.join(distRoot, "cryptoworldz", "support", "community-impact", "index.html"), "utf8");
  assert.equal(supportProfiles.length, 35);
  assert.equal(new Set(supportProfiles.map(({ url }) => url)).size, 35);
  for (const profile of supportProfiles) {
    assert.match(html, new RegExp(profile.id));
    assert.ok(html.includes(profile.name));
  }
  assert.equal((html.match(/VERIFIED FACEBOOK DESTINATION/g) || []).length, 33);
  assert.equal((html.match(/FACEBOOK VISIBILITY RESTRICTED/g) || []).length, 2);
  assert.doesNotMatch(html, /Facebook Support Profile \d+/i);
});

test("Command Centre preserves five system roles, five human leaders and safe boundaries", async () => {
  const html = await readFile(path.join(distRoot, "cryptoworldz", "command-centre", "index.html"), "utf8");
  for (const name of ["ZED", "AUTO", "G.R.A.C.E.", "RECAP", "BASED.BID", "Solmusic", "Savage", "JayJayTeamDev", "Remediy", "Stepper"]) assert.ok(html.includes(name));
  assert.match(html, /Zero signing • zero execution/);
  assert.match(html, /Supabase logic/);
  assert.match(html, /Self-funded source configuration and budget limits/);
  assert.match(html, /Approval state, pause and emergency-stop controls/);
  assert.match(html, /Transaction simulation and preview do not sign or execute/);
  assert.match(html, /Audit history, system health and owner confirmation gates/);
  assert.match(html, /Open protected MiniApp/);
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
  for (const world of worldz) assert.ok(crypto.includes(`https://${world.domain}`), world.domain);
  assert.doesNotMatch(crypto, /bitcoinworldz\.xyz|suiworldz\.xyz/i);
  for (const world of worldz) {
    const html = await readFile(path.join(distRoot, world.key, "index.html"), "utf8");
    assert.ok(html.includes("https://oneworldz.com"));
    assert.ok(html.includes("https://cryptoworldz.xyz"));
    assert.ok(html.includes("#acknowledgements"));
  }
});

test("all referenced local assets exist and are non-empty", async () => {
  for (const target of deploymentTargets) {
    const targetRoot = path.join(distRoot, target.key);
    for (const file of await htmlFiles(targetRoot)) {
      const html = await readFile(file, "utf8");
      const refs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
      for (const ref of refs) {
        const local = path.join(targetRoot, ref.replace(/^\//, ""));
        const info = await stat(local);
        assert.ok(info.size > 0, `${file}: ${ref}`);
      }
    }
  }
});

test("every production picture uses separate desktop and mobile files", async () => {
  for (const file of await htmlFiles(distRoot)) {
    const html = await readFile(file, "utf8");
    const pictures = [...html.matchAll(/<picture[^>]*>([\s\S]*?)<\/picture>/g)].map((match) => match[1]);
    for (const markup of pictures) {
      const mobile = markup.match(/<source[^>]+srcset="([^"]+)"/)?.[1];
      const desktop = markup.match(/<img[^>]+src="([^"]+)"/)?.[1];
      assert.ok(mobile && desktop, `${file}: incomplete responsive picture`);
      assert.notEqual(mobile, desktop, `${file}: desktop/mobile file reused`);
      assert.match(mobile, /\/(?:mobile|support\/mobile)\//, `${file}: mobile path`);
      assert.match(desktop, /\/(?:desktop|support\/desktop)\//, `${file}: desktop path`);
    }
  }
});

test("no production artwork is duplicated inside a page main region", async () => {
  for (const file of await htmlFiles(distRoot)) {
    const html = await readFile(file, "utf8");
    const main = html.match(/<main id="main-content">([\s\S]*?)<\/main>/)?.[1] || "";
    const refs = [...main.matchAll(/(?:src|srcset)="(\/assets\/(?:desktop|mobile|support)\/[^"]+)"/g)].map((match) => match[1]);
    const duplicates = refs.filter((ref, index) => refs.indexOf(ref) !== index);
    assert.deepEqual(duplicates, [], `${file}: ${duplicates.join(", ")}`);
    const targetKey = path.relative(distRoot, file).split(path.sep)[0];
    const targetRoot = path.join(distRoot, targetKey);
    const hashes = [];
    for (const ref of refs) {
      const bytes = await readFile(path.join(targetRoot, ref.replace(/^\//, "")));
      hashes.push(createHash("sha256").update(bytes).digest("hex"));
    }
    const duplicateContent = hashes.filter((hash, index) => hashes.indexOf(hash) !== index);
    assert.deepEqual(duplicateContent, [], `${file}: duplicate production-image content`);
  }
});

test("HodlerWorldz never substitutes Bitcoin artwork", async () => {
  const html = await readFile(path.join(distRoot, "hodlerworldz", "index.html"), "utf8");
  const hero = html.match(/<section class="hero chain-hero">([\s\S]*?)<\/section>/)?.[1] || "";
  assert.doesNotMatch(hero, /bitworldz\.(?:png|webp)/);
  assert.match(hero, /HodlerWorldz education recognition and rewards identity/);
});

test("responsive stylesheet enforces Android-safe layout and reduced motion", async () => {
  const css = await readFile(path.join(distRoot, "cryptoworldz", "assets", "css", "site.css"), "utf8");
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /min-width: 320px/);
  assert.match(css, /min-height: 52px/);
  assert.match(css, /overflow-x: clip/);
});
