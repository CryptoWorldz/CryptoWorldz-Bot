import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { ecosystemDestinations, ownedRootDomains, protectedDestinations } from "../apps/oneworldz-ecosystem-release/ecosystem-topology.mjs";
import { productionTargets, productionGate } from "../apps/oneworldz-ecosystem-release/production-targets.mjs";
import { releaseContract } from "../apps/oneworldz-ecosystem-release/release-contract.mjs";

const workflowDir = ".github/workflows";
const workflows = (await readdir(workflowDir)).filter((name) => /\.ya?ml$/i.test(name)).sort();
assert.deepEqual(workflows, ["main.yml", "protected-runtime.yml", "visual-fit-audit.yml"]);

const staticWorkflow = await readFile(`${workflowDir}/main.yml`, "utf8");
for (const token of [
  "name: OneWorldz Static Release",
  "Fail fast on Hostinger FTPS certificate",
  "python3 .github/ftps-preflight.py",
  "Load canonical release contract",
  "bash .github/full-current-static-deploy.sh",
  "bash .github/full-current-live-proof.sh",
  "contents: read",
  "cancel-in-progress: false"
]) assert.ok(staticWorkflow.includes(token), `static workflow missing ${token}`);
for (const forbidden of ["full-current-oneworldz-gpt-extension.sh", "operation-oneworldz-gpt.sh", "contents: write", "publish-progress.sh"]) {
  assert.ok(!staticWorkflow.includes(forbidden), `static workflow must not contain ${forbidden}`);
}

const protectedWorkflow = await readFile(`${workflowDir}/protected-runtime.yml`, "utf8");
for (const token of [
  "name: OneWorldz Protected Runtime Release",
  "Fail fast on Hostinger FTPS certificate",
  "bash .github/full-current-oneworldz-gpt-extension.sh",
  "src/oneworldz-gpt/**",
  "contents: read"
]) assert.ok(protectedWorkflow.includes(token), `protected workflow missing ${token}`);
for (const forbidden of ["full-current-static-deploy.sh", "resume-locked-static-deploy.sh"]) {
  assert.ok(!protectedWorkflow.includes(forbidden), `protected workflow must not contain ${forbidden}`);
}

const visualWorkflow = await readFile(`${workflowDir}/visual-fit-audit.yml`, "utf8");
for (const required of ["branches: [main", "ASPECT_MISMATCHES=0", "BROKEN_IMAGES=0", "contents: read"]) {
  assert.ok(visualWorkflow.includes(required), `visual audit missing ${required}`);
}
assert.ok(!visualWorkflow.includes("audit-live-every-click-v2.mjs || true"), "visual audit must not ignore every-click failures");

assert.deepEqual(releaseContract, {
  staticTargets: 18,
  architectureDestinations: 19,
  pageRoutes: 93,
  protectedDomain: "cryptobotz.cryptoworldz.xyz"
});
assert.equal(ecosystemDestinations.length, releaseContract.architectureDestinations);
assert.equal(ownedRootDomains.length, 15);
assert.equal(productionTargets.length, releaseContract.staticTargets);
assert.deepEqual(protectedDestinations.map(({ domain }) => domain), [releaseContract.protectedDomain]);
assert.equal(productionGate.productionWriteAllowed, false, "modules must never independently authorize production writes");

for (const retired of [
  ".github/oneworldz-only-deploy.sh",
  ".github/cryptoworldz-only-deploy.sh",
  ".github/full-current-zed-runtime.sh",
  ".github/oneworldz-gpt-proof-or-repair.sh",
  ".github/preflight-live-zed.sh",
  ".github/resume-locked-zed.sh",
  ".github/publish-progress.sh"
]) await assert.rejects(access(retired), `retired deployment path still exists: ${retired}`);

const deploymentState = await readFile("deployments/oneworldz-19-total.request", "utf8");
for (const token of [
  "state=TOTAL_DEPLOYMENT_PLAN_ACTIVE",
  "candidate_policy=BUILD_CURRENT_MAIN_THEN_FREEZE_WITHIN_RUN",
  "production_writer=GITHUB_ACTIONS_CANONICAL_FULL_REBUILD_RAIL_ONLY"
]) assert.ok(deploymentState.includes(token), `deployment state missing ${token}`);

const browserProof = await readFile("apps/oneworldz-ecosystem-release/browser-visual-proof.mjs", "utf8");
for (const token of ["discoverCandidateRoutes", "discoverSitemapRoutes", "brokenImages", "consoleErrors", "failedRequests"]) {
  assert.ok(browserProof.includes(token), `browser proof missing ${token}`);
}

console.log(`DEPLOYMENT_STRUCTURE=PASS static_targets=${releaseContract.staticTargets} routes=${releaseContract.pageRoutes} protected_runtime=separate ftps_preflight=required`);
