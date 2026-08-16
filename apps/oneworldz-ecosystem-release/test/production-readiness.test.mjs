import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ecosystemDestinations, excludedRootDomains, ownedRootDomains, protectedDestinations } from "../ecosystem-topology.mjs";
import { productionGate, productionTargets } from "../production-targets.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(appRoot, "dist", "ecosystem");

const unique = (values) => new Set(values).size === values.length;
const expectedRemoteDirs = Object.freeze({
  impactbased: "domains/cryptoworldz.xyz/public_html/impactbased",
  "law-oneworldz": "domains/oneworldz.com/public_html/law",
  "learn-oneworldz": "domains/oneworldz.com/public_html/learn"
});

test("production gate locks the exact 19 / 15 / 18 architecture", () => {
  assert.equal(ecosystemDestinations.length, 19);
  assert.equal(ownedRootDomains.length, 15);
  assert.equal(productionTargets.length, 18);
  assert.equal(productionGate.ecosystemDestinations, 19);
  assert.equal(productionGate.activeOwnedRootDomains, 15);
  assert.equal(productionGate.staticTargets, 18);
  assert.equal(productionGate.deploymentState, "NOT_EXECUTED");
});

test("SolWorld.fun is excluded and CryptoBotz remains the protected non-static destination", () => {
  assert.deepEqual(excludedRootDomains, ["solworld.fun"]);
  assert.deepEqual(productionGate.excludedOwnedRootDomains, ["solworld.fun"]);
  const domains = productionTargets.map(({ domain }) => domain);
  assert.ok(!domains.includes("solworld.fun"));
  assert.ok(domains.includes("oneworldz.com"));
  for (const { domain } of protectedDestinations) assert.ok(!domains.includes(domain), `${domain} must remain protected`);
  assert.deepEqual(new Set(productionGate.protectedDestinations), new Set(["cryptobotz.cryptoworldz.xyz"]));
});

test("every static target has one exact Hostinger root and deployment guard", () => {
  const keys = productionTargets.map(({ key }) => key);
  const domains = productionTargets.map(({ domain }) => domain);
  const remoteDirs = productionTargets.map(({ remoteDir }) => remoteDir);
  const guards = productionTargets.map(({ guard }) => guard);
  assert.ok(unique(keys), "target keys must be unique");
  assert.ok(unique(domains), "target domains must be unique");
  assert.ok(unique(remoteDirs), "remote directories must be unique");
  assert.ok(unique(guards), "deployment guards must be unique");
  for (const target of productionTargets) {
    assert.equal(target.remoteDir, expectedRemoteDirs[target.key] || `domains/${target.domain}/public_html`);
    assert.equal(target.root, "/");
    assert.equal(target.accountScope, "SHARED_ACCOUNT_EXACT_TARGET");
    assert.ok(target.expectedTitle.length > 10, `${target.key}: title proof required`);
  }
});

test("the verified build produces all 18 exact production packages with title contracts", async () => {
  for (const target of productionTargets) {
    const homepage = path.join(distRoot, target.key, "index.html");
    const info = await stat(homepage);
    assert.ok(info.size > 0, `${target.key}: homepage must exist`);
    const html = await readFile(homepage, "utf8");
    assert.match(html, new RegExp(`<title>${target.expectedTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</title>`));
  }
});

test("fleet manifest records the same architecture and never creates CryptoBotz as a static package", async () => {
  const manifest = JSON.parse(await readFile(path.join(distRoot, "fleet-manifest.json"), "utf8"));
  assert.equal(manifest.targets.length, 18);
  assert.equal(manifest.architecture?.ecosystem_destinations, 19);
  assert.equal(manifest.architecture?.active_owned_root_domains, 15);
  assert.equal(manifest.architecture?.static_build_targets, 18);
  assert.deepEqual(manifest.architecture?.excluded_owned_root_domains, ["solworld.fun"]);
  assert.equal(manifest.ecosystem_destinations?.length, 19);
  const oneWorldz = await stat(path.join(distRoot, "oneworldz", "index.html"));
  assert.ok(oneWorldz.size > 0);
  await assert.rejects(stat(path.join(distRoot, "cryptobotz")));
});
