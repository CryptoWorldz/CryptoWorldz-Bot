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

test("production gate locks the exact 19 / 15 / 18 architecture and total-deployment authority", () => {
  assert.equal(ecosystemDestinations.length, 19);
  assert.equal(ownedRootDomains.length, 15);
  assert.equal(productionTargets.length, 18);
  assert.equal(productionGate.ecosystemDestinations, 19);
  assert.equal(productionGate.activeOwnedRootDomains, 15);
  assert.equal(productionGate.staticTargets, 18);
  assert.equal(productionGate.deploymentState, "TOTAL_DEPLOYMENT_PLAN_ACTIVE");
  assert.equal(productionGate.ownerAuthority, "PERFORM_TOTAL_DEPLOYMENT_PLAN");
  assert.equal(productionGate.repeatedOwnerApprovalRequired, false);
  assert.equal(productionGate.hostingDestinationState, "PROOF_REQUIRED");
  assert.equal(productionGate.productionWriteAllowed, false);
  assert.equal(productionGate.canonicalDeploymentRail, "ONE_AUTHENTICATED_HOSTINGER_STATIC_FLEET_RAIL");
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

test("every static target requires one authenticated Hostinger website root", () => {
  const keys = productionTargets.map(({ key }) => key);
  const domains = productionTargets.map(({ domain }) => domain);
  const environments = productionTargets.map(({ environment }) => environment);
  const guards = productionTargets.map(({ guard }) => guard);
  assert.ok(unique(keys), "target keys must be unique");
  assert.ok(unique(domains), "target domains must be unique");
  assert.ok(unique(environments), "target environment labels must be unique");
  assert.ok(unique(guards), "deployment guards must be unique");
  for (const target of productionTargets) {
    assert.equal(target.remoteDir, "/");
    assert.equal(target.root, "/");
    assert.equal(target.accountScope, "EXACT_HOSTINGER_WEBSITE_ROOT_REQUIRED");
    assert.equal(target.destinationStatus, "HOSTINGER_PROOF_REQUIRED");
    assert.equal(target.productionWriteAllowed, false);
    assert.ok(target.expectedTitle.length > 10, `${target.key}: title proof required`);
  }
  const serialized = JSON.stringify(productionTargets);
  assert.doesNotMatch(serialized, /public_html/i);
  assert.doesNotMatch(serialized, /domains\//i);
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
