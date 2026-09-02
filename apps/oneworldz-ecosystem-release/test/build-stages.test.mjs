import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildStages, buildSteps } from "../build-stages.mjs";
import { releaseContract } from "../release-contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const expectedOrder = [
  "build.mjs", "build-expansion.mjs", "materialize-approved-visuals.mjs", "materialize-approved-visuals.mjs", "materialize-approved-visuals.mjs",
  "build-perfect.mjs", "reconcile-perfect-plan.mjs", "enhance-pdc.mjs", "build-community-support.mjs", "finalize-oneworldz.mjs",
  "integrate-oneworldz-gpt.mjs", "finalize-cryptoworldz.mjs", "finalize-donation-separation.mjs", "finalize-jayjay-launch.mjs", "build-experience.mjs",
  "finalize-user-structure.mjs", "build-special-displays.mjs", "finalize-support-links.mjs", "optimize-seo.mjs", "finalize-breadcrumbs.mjs",
  "finalize-themes.mjs", "fix-oneworldz-mobile.mjs", "finalize-approved-visual-manifests.mjs", "write-static-cache-policy.mjs", "apply-jayjay-images.mjs",
  "apply-full-background-experience.mjs", "perfect-oneworldz.mjs", "finalize-oneworldz-perfect-layout.mjs", "perfect-cryptoworldz.mjs",
  "finalize-visual-fit.mjs", "finalize-one-screen-gpt.mjs", "finalize-pdc-floating.mjs", "finalize-oneworldz-blueprint-hub.mjs", "finalize-universal-floating.mjs",
  "finalize-perfect-links.mjs", "fix-reagan-mobile.mjs", "verify-final-build.mjs"
];

test("staged build preserves the established production order", () => {
  assert.deepEqual(buildSteps.map(({ script }) => script), expectedOrder);
  assert.deepEqual(buildStages.map(({ name }) => name), [
    "core-generation", "public-surface", "discovery-and-theme", "visual-experience", "release-integrity"
  ]);
  assert.equal(buildSteps.length, 37);
  assert.equal(buildStages.flatMap(({ steps }) => steps).length, 37);
  assert.deepEqual(buildSteps.slice(2, 5).map(({ env }) => env.APPROVED_VISUAL_KEY), ["foodworldz", "donateworldz", "hodlergalaxy"]);
});

test("the package uses the staged orchestrator and retains the legacy command for parity checks", async () => {
  const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  assert.equal(pkg.scripts.build, "node build-release.mjs");
  assert.ok(pkg.scripts["build:legacy"].includes("node build.mjs"));
  assert.ok(pkg.scripts["build:legacy"].includes("node finalize-perfect-links.mjs"));
});

test("release cardinality has one authoritative contract", () => {
  assert.deepEqual(releaseContract, {
    staticTargets: 18,
    architectureDestinations: 19,
    pageRoutes: 93,
    protectedDomain: "cryptobotz.cryptoworldz.xyz"
  });
});
