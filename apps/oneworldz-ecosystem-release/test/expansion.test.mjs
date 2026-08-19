import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { deploymentTargets19, ecosystemDestinations, excludedRootDomains, ownedRootDomains, protectedDestinations } from "../ecosystem-topology.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(appRoot, "dist", "ecosystem");
let distBuilt = true;
try {
  await access(distRoot);
} catch {
  distBuilt = false;
}

const buildTest = (name, fn) => test(name, { skip: !distBuilt }, fn);

test("19-destination architecture is exact", () => {
  assert.equal(ecosystemDestinations.length, 19);
  assert.equal(ownedRootDomains.length, 15);
  assert.equal(protectedDestinations.length, 1);
  assert.equal(deploymentTargets19.length, 18);
  assert.deepEqual(excludedRootDomains, ["solworld.fun"]);
  assert.ok(!ecosystemDestinations.some(({ domain }) => domain === "solworld.fun"));
});

test("active root-domain fleet contains FoodWorldz DonateWorldz and HodlerGalaxy", () => {
  for (const domain of ["foodworldz.com", "donateworldz.com", "hodlergalaxy.xyz"]) {
    assert.ok(ownedRootDomains.includes(domain), domain);
  }
});

test("OneWorldz is the rebuilt global gateway while CryptoBotz remains protected", () => {
  const protectedDomains = protectedDestinations.map(({ domain }) => domain);
  assert.deepEqual(protectedDomains, ["cryptobotz.cryptoworldz.xyz"]);
  const staticDomains = deploymentTargets19.map(({ domain }) => domain);
  assert.ok(staticDomains.includes("oneworldz.com"));
  assert.ok(!staticDomains.includes("cryptobotz.cryptoworldz.xyz"));
});

buildTest("expansion build produces all three new root-domain packages", async () => {
  for (const key of ["foodworldz", "donateworldz", "hodlergalaxy"]) {
    await access(path.join(distRoot, key, "index.html"));
    await access(path.join(distRoot, key, "release-manifest.json"));
    await access(path.join(distRoot, key, "robots.txt"));
    await access(path.join(distRoot, key, "sitemap.xml"));
  }
});

buildTest("DonateWorldz contains four separated support routes and payment boundaries", async () => {
  const root = path.join(distRoot, "donateworldz");
  for (const route of ["reagan-children", "community-impact", "support-jayjayteamdev", "davis-family"]) {
    await access(path.join(root, route, "index.html"));
  }
  const home = await readFile(path.join(root, "index.html"), "utf8");
  assert.match(home, /central action hub/i);
  assert.match(home, /separate/i);
  assert.doesNotMatch(home, /solworld\.fun/i);
});

buildTest("FoodWorldz routes support action through DonateWorldz", async () => {
  const html = await readFile(path.join(distRoot, "foodworldz", "index.html"), "utf8");
  assert.match(html, /https:\/\/donateworldz\.com/);
  assert.match(html, /FoodWorldz explains why\. DonateWorldz handles how\./);
  assert.doesNotMatch(html, /solworld\.fun/i);
});

buildTest("HodlerGalaxy is discovery rather than a duplicate homepage", async () => {
  const html = await readFile(path.join(distRoot, "hodlergalaxy", "index.html"), "utf8");
  assert.match(html, /discovery layer/i);
  assert.match(html, /https:\/\/cryptobotz\.cryptoworldz\.xyz/);
  assert.match(html, /https:\/\/foodworldz\.com/);
  assert.match(html, /https:\/\/donateworldz\.com/);
});

buildTest("fleet manifest records 18 static packages representing 19 destinations", async () => {
  const manifest = JSON.parse(await readFile(path.join(distRoot, "fleet-manifest.json"), "utf8"));
  assert.equal(manifest.targets.length, 18);
  assert.equal(manifest.architecture.ecosystem_destinations, 19);
  assert.equal(manifest.architecture.active_owned_root_domains, 15);
  assert.equal(manifest.architecture.static_build_targets, 18);
  assert.deepEqual(manifest.architecture.excluded_owned_root_domains, ["solworld.fun"]);
  assert.deepEqual(manifest.architecture.protected_existing_destinations, ["https://cryptobotz.cryptoworldz.xyz"]);
  assert.equal(manifest.ecosystem_destinations.length, 19);
});
