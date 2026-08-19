import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { ecosystemDestinations, ownedRootDomains, protectedDestinations } from '../apps/oneworldz-ecosystem-release/ecosystem-topology.mjs';
import { productionTargets, productionGate } from '../apps/oneworldz-ecosystem-release/production-targets.mjs';

const workflowDir = '.github/workflows';
const workflowFiles = (await readdir(workflowDir)).filter((name) => /\.ya?ml$/i.test(name));
assert.deepEqual(workflowFiles.sort(), ['main.yml'], 'exactly one active deployment workflow is allowed');

const workflow = await readFile(`${workflowDir}/main.yml`, 'utf8');
const requiredWorkflowTokens = [
  'OneWorldz Canonical Full Rebuild Deployment',
  'BUILD current main candidate',
  'TEST full Command Centre and ecosystem',
  'LIGHTHOUSE SEO 100',
  'DESKTOP + MOBILE all generated page routes',
  'Deploy current ZED AUTO GRACE runtime',
  'Deploy current candidate to static transport roots',
  'LIVE PROOF all generated page routes',
  'FINAL current candidate record',
  'CANDIDATE_TREE',
  'CANDIDATE_FINGERPRINT',
  'MIN_PAGE_ROUTES: "83"'
];
for (const token of requiredWorkflowTokens) assert.ok(workflow.includes(token), `main.yml missing current full-rebuild invariant: ${token}`);

const forbiddenHistoricalLocks = [
  'LOCKED_SOURCE_COMMIT',
  'LOCKED_SOURCE_RUN',
  'LOCKED_CANDIDATE_FINGERPRINT',
  '3b52c7eae7834a33f1f74e312433644ea239904c',
  '295e0706bc033b294736d7f87dc6d36f783eaa3a',
  '47ceec16e10ff1f8fca8002c52c75b63781dab8cf6b44742d14ec78d1b4afb59',
  '32219855385'
];
for (const token of forbiddenHistoricalLocks) assert.ok(!workflow.includes(token), `historical candidate lock must not control current deployment: ${token}`);

assert.equal(ecosystemDestinations.length, 19, 'architecture destination count drift');
assert.equal(ownedRootDomains.length, 15, 'active owned root-domain count drift');
assert.equal(productionTargets.length, 18, 'static transport root count drift');
assert.deepEqual(protectedDestinations.map((x) => x.domain), ['cryptobotz.cryptoworldz.xyz']);
assert.equal(productionGate.productionWriteAllowed, false, 'modules must never independently authorize production writes');

const state = await readFile('deployments/oneworldz-19-total.request', 'utf8');
for (const token of [
  'state=TOTAL_DEPLOYMENT_PLAN_ACTIVE',
  'owner_authority=PERFORM_TOTAL_DEPLOYMENT_PLAN',
  'static_targets=18',
  'architecture_destinations=19',
  'candidate_policy=BUILD_CURRENT_MAIN_THEN_FREEZE_WITHIN_RUN',
  'page_route_requirement=COUNT_CURRENT_BUILD_AND_REQUIRE_AT_LEAST_83',
  'production_writer=GITHUB_ACTIONS_CANONICAL_FULL_REBUILD_RAIL_ONLY'
]) assert.ok(state.includes(token), `deployment state missing current policy: ${token}`);

const browserProof = await readFile('apps/oneworldz-ecosystem-release/browser-visual-proof.mjs', 'utf8');
for (const token of ['discoverCandidateRoutes', 'discoverSitemapRoutes', 'brokenImages', 'consoleErrors', 'failedRequests', 'totalHtmlPagesAudited']) {
  assert.ok(browserProof.includes(token), `browser proof missing required fleet evidence: ${token}`);
}

console.log('DEPLOYMENT_STRUCTURE=PASS current-main full rebuild + 18 static transports + 19 destinations + dynamic page-route fleet');
