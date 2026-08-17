import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ecosystemDestinations, excludedRootDomains, ownedRootDomains, protectedDestinations } from "../ecosystem-topology.mjs";
import { autoControlPolicy, links, officialDirectory, supportDirectory, worldz } from "../site-data.mjs";
import { productionGate, productionTargets } from "../production-targets.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(appRoot, "dist", "ecosystem");

const unique = (values) => new Set(values).size === values.length;
const expectedTransportDirs = Object.freeze({
  oneworldz: "domains/oneworldz.com/public_html",
  cryptoworldz: "domains/cryptoworldz.xyz/public_html",
  solworldz: "domains/solworldz.xyz/public_html",
  ethworldz: "domains/ethworldz.xyz/public_html",
  baseworldz: "domains/baseworldz.xyz/public_html",
  bnbworldz: "domains/bnbworldz.xyz/public_html",
  xrpworldz: "domains/xrpworldz.xyz/public_html",
  suiworldz: "domains/suiworldz.xyz/public_html",
  hyperworldz: "domains/hyperworldz.xyz/public_html",
  robinworldz: "domains/robinworldz.xyz/public_html",
  hodlerworldz: "domains/hodlerworldz.xyz/public_html",
  purplediamondcrew: "domains/purplediamondcrew.com/public_html",
  impactbased: "domains/cryptoworldz.xyz/public_html/impactbased",
  "law-oneworldz": "domains/oneworldz.com/public_html/law",
  "learn-oneworldz": "domains/oneworldz.com/public_html/learn",
  hodlergalaxy: "domains/hodlergalaxy.xyz/public_html",
  foodworldz: "domains/foodworldz.com/public_html",
  donateworldz: "domains/donateworldz.com/public_html"
});

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
  assert.equal(productionGate.historicalTransportEvidenceState, "PASS_AUTHENTICATED_18_ROOT_PROOF_RECOVERED");
  assert.equal(productionGate.currentDestinationState, "PENDING_REVALIDATION_IMPACTBASED_PUBLIC_ROUTE");
  assert.equal(productionGate.hostingEvidenceRun, 31925927520);
  assert.equal(productionGate.hostingEvidenceJob, 95113450775);
  assert.equal(productionGate.hostingEvidenceTopologySha, "5e4bffb4a40a6968d432ca73e619feb15705859c");
  assert.equal(productionGate.productionWriteAllowed, false);
  assert.equal(productionGate.productionWriteBlocker, "CLEANUP_BUILD_PREVIEW_AND_CURRENT_DESTINATION_PASS_REQUIRED");
  assert.equal(productionGate.canonicalDeploymentRail, "ONE_AUTHENTICATED_HOSTINGER_STATIC_FLEET_RAIL");
});

test("SolWorld.fun is excluded and CryptoBotz remains the protected non-static destination", () => {
  assert.deepEqual(excludedRootDomains, ["solworld.fun"]);
  assert.deepEqual(productionGate.excludedOwnedRootDomains, ["solworld.fun"]);
  const domains = productionTargets.map(({ domain }) => domain);
  assert.ok(!domains.includes("solworld.fun"));
  assert.ok(domains.includes("oneworldz.com"));
  assert.ok(domains.includes("impactbased.oneworldz.com"));
  assert.ok(!domains.includes("impactbased.cryptoworldz.xyz"));
  for (const { domain } of protectedDestinations) assert.ok(!domains.includes(domain), `${domain} must remain protected`);
  assert.deepEqual(new Set(productionGate.protectedDestinations), new Set(["cryptobotz.cryptoworldz.xyz"]));
});

test("every static target has one website root and one exact recorded Hostinger transport destination", () => {
  const keys = productionTargets.map(({ key }) => key);
  const domains = productionTargets.map(({ domain }) => domain);
  const environments = productionTargets.map(({ environment }) => environment);
  const guards = productionTargets.map(({ guard }) => guard);
  const transportDirs = productionTargets.map(({ hostingerTransportDir }) => hostingerTransportDir);
  assert.ok(unique(keys), "target keys must be unique");
  assert.ok(unique(domains), "target domains must be unique");
  assert.ok(unique(environments), "target environment labels must be unique");
  assert.ok(unique(guards), "deployment guards must be unique");
  assert.ok(unique(transportDirs), "Hostinger transport destinations must be unique");
  assert.equal(Object.keys(expectedTransportDirs).length, 18);
  for (const target of productionTargets) {
    assert.equal(target.remoteDir, "/");
    assert.equal(target.root, "/");
    assert.equal(target.hostingerTransportDir, expectedTransportDirs[target.key]);
    assert.equal(target.accountScope, "EXISTING_SHARED_HOSTINGER_ACCOUNT_EXACT_RECORDED_DIR");
    assert.equal(target.historicalTransportStatus, "PASS_AUTHENTICATED_18_ROOT_PROOF_RECOVERED");
    if (target.key === "impactbased") {
      assert.equal(target.domain, "impactbased.oneworldz.com");
      assert.equal(target.publicDomainStatus, "PENDING_REVALIDATION_AFTER_PUBLIC_HOSTNAME_CHANGE");
      assert.equal(target.destinationStatus, "CURRENT_DESTINATION_REVALIDATION_REQUIRED");
    } else {
      assert.equal(target.publicDomainStatus, "UNCHANGED_FROM_HISTORICAL_TRANSPORT_PROOF");
      assert.equal(target.destinationStatus, "HOSTINGER_DESTINATION_PASS");
    }
    assert.equal(target.destinationEvidenceRun, 31925927520);
    assert.equal(target.destinationEvidenceJob, 95113450775);
    assert.equal(target.productionWriteAllowed, false);
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

test("OneWorldz, CryptoWorldz and Purple Diamond Crew keep three distinct locked themes", async () => {
  const oneworldz = await readFile(path.join(distRoot, "oneworldz", "index.html"), "utf8");
  const cryptoworldz = await readFile(path.join(distRoot, "cryptoworldz", "index.html"), "utf8");
  const pdc = await readFile(path.join(distRoot, "purplediamondcrew", "index.html"), "utf8");
  assert.match(oneworldz, /class="oneworldz-blue-white"/);
  assert.match(oneworldz, /--accent:#4da3ff;--accent-2:#ffffff/);
  assert.match(cryptoworldz, /class="cryptoworldz-visual route-home"/);
  assert.match(cryptoworldz, /cryptoworldz-visual\.css/);
  assert.match(pdc, /class="pdc-purple-theme"/);
  assert.match(pdc, /pdc-market\.css/);
});

test("every Blockchain World renders the matching approved profile identity for its own chain", async () => {
  for (const world of worldz) {
    const html = await readFile(path.join(distRoot, world.key, "index.html"), "utf8");
    assert.match(html, new RegExp(`--accent:${world.accent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), `${world.key}: own accent required`);
    assert.match(html, new RegExp(`--accent-2:${world.accent2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), `${world.key}: own second accent required`);
    if (world.image) {
      assert.ok(html.includes(`/assets/desktop/blockchains/${world.image}.png`), `${world.key}: exact desktop profile artwork required`);
      assert.ok(html.includes(`/assets/mobile/${world.image}.webp`), `${world.key}: exact mobile profile artwork required`);
      for (const other of worldz.filter((candidate) => candidate.image && candidate.key !== world.key)) {
        const hero = html.match(/<section class="hero chain-hero">([\s\S]*?)<\/section>/)?.[1] || "";
        assert.ok(!hero.includes(`/assets/desktop/blockchains/${other.image}.png`), `${world.key}: must not use ${other.key} hero art`);
      }
    }
  }
});

test("official public directory and locked support pathways appear on OneWorldz and CryptoWorldz", async () => {
  const oneworldz = await readFile(path.join(distRoot, "oneworldz", "index.html"), "utf8");
  const cryptoworldz = await readFile(path.join(distRoot, "cryptoworldz", "index.html"), "utf8");
  for (const entry of officialDirectory) {
    assert.ok(oneworldz.includes(`href="${entry.url}"`), `OneWorldz directory missing ${entry.url}`);
    assert.ok(cryptoworldz.includes(`href="${entry.url}"`), `CryptoWorldz directory missing ${entry.url}`);
  }
  for (const entry of supportDirectory) assert.ok(oneworldz.includes(`href="${entry.url}"`), `OneWorldz support path missing ${entry.url}`);
  assert.ok(oneworldz.includes(links.reaganChildren));
  assert.ok(oneworldz.includes(links.communityDirectory));
  assert.ok(oneworldz.includes(links.communityImpact));
  assert.ok(oneworldz.includes(links.jayjaySupport));
  assert.ok(oneworldz.includes(links.foodWorldz));
  assert.ok(cryptoworldz.includes(links.impactBased));
  assert.ok(cryptoworldz.includes(links.raaiiidd));
  assert.ok(cryptoworldz.includes(links.nextBigCoin));
});

test("Command Centre registry keeps ZED AUTO GRACE and owner-funds compliance boundaries explicit", async () => {
  const cryptoworldz = await readFile(path.join(distRoot, "cryptoworldz", "index.html"), "utf8");
  assert.ok(cryptoworldz.includes("Command Centre Ultimate™"));
  assert.ok(cryptoworldz.includes("ZED™"));
  assert.ok(cryptoworldz.includes("AUTO • Diamond Buy™"));
  assert.ok(cryptoworldz.includes("G.R.A.C.E.™"));
  assert.ok(cryptoworldz.includes("RECAP™"));
  assert.ok(cryptoworldz.includes("ImpactBased™ × BASED.BID"));
  assert.equal(autoControlPolicy.executionDefault, "DISABLED");
  assert.equal(autoControlPolicy.publicFundsAllowed, false);
  assert.equal(autoControlPolicy.clientCustodyAllowed, false);
  assert.equal(autoControlPolicy.manipulationAllowed, false);
  assert.match(autoControlPolicy.legalCeilingRule, /lowest of JayJayTeamDev's approved owned-funds budget/i);
  assert.match(cryptoworldz, /It never controls donor, customer, beneficiary or community money\./);
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
