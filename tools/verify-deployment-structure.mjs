import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { ecosystemDestinations, ownedRootDomains, protectedDestinations } from '../apps/oneworldz-ecosystem-release/ecosystem-topology.mjs';
import { productionTargets, productionGate } from '../apps/oneworldz-ecosystem-release/production-targets.mjs';

const workflowDir = '.github/workflows';
const workflowFiles = (await readdir(workflowDir)).filter((name) => /\.ya?ml$/i.test(name));
assert.deepEqual(workflowFiles.sort(), ['main.yml'], 'exactly one active deployment workflow is allowed');

const workflow = await readFile(`${workflowDir}/main.yml`, 'utf8');
const oneWorldzOnlyMode = workflow.includes('OneWorldz First — Single Site Fix & Proof');
const cryptoWorldzOnlyMode = workflow.includes('CryptoWorldz Second — Single Site Fix & Proof');
const fullFleetMode = workflow.includes('OneWorldz Safe Static Fleet Deployment');
const activeModes = [oneWorldzOnlyMode, cryptoWorldzOnlyMode, fullFleetMode].filter(Boolean).length;
assert.ok(activeModes === 1, 'main.yml must arm exactly one staged single-site rail or the canonical static fleet rail');

if (oneWorldzOnlyMode) {
  const requiredOneWorldzTokens = [
    'ONEWORLDZ BUILD → MOBILE PROOF → DEPLOY → LIVE PROOF',
    'Build exact OneWorldz candidate',
    'Prove OneWorldz contract only',
    'Prove every OneWorldz route on desktop and mobile',
    'Refuse stale source and recheck exact OneWorldz destination',
    'Backup, deploy and byte-prove OneWorldz only',
    'Prove live OneWorldz desktop and mobile routes',
    'bash .github/oneworldz-only-deploy.sh',
    'oneworldz.com',
    'domains/oneworldz.com/public_html',
    'ONEWORLDZ_FINAL PASS'
  ];
  for (const token of requiredOneWorldzTokens) assert.ok(workflow.includes(token), `main.yml missing OneWorldz-only recovery invariant: ${token}`);

  const forbiddenFleetWrites = [
    'bash .github/full-current-static-deploy.sh',
    'bash .github/resume-locked-static-deploy.sh',
    'Backup, deploy and byte-prove all Hostinger destinations',
    'Prove every live desktop and mobile route'
  ];
  for (const token of forbiddenFleetWrites) assert.ok(!workflow.includes(token), `OneWorldz-only recovery rail must not arm fleet write path: ${token}`);

  const deployScript = await readFile('.github/oneworldz-only-deploy.sh', 'utf8');
  for (const token of [
    "test \"$key\" = 'oneworldz'",
    "test \"$domain\" = 'oneworldz.com'",
    "test \"$transport\" = 'domains/oneworldz.com/public_html'",
    'Rolling back OneWorldz only. No other Hostinger destination is touched.',
    'ONEWORLDZ_ONLY_HOSTINGER_DEPLOYMENT=PASS'
  ]) assert.ok(deployScript.includes(token), `OneWorldz-only deployment script missing safety invariant: ${token}`);
} else if (cryptoWorldzOnlyMode) {
  const requiredCryptoWorldzTokens = [
    'CRYPTOWORLDZ BUILD → VISUAL PROOF → GPT SHARE → DEPLOY → LIVE PROOF',
    'Build exact CryptoWorldz candidate',
    'Prove CryptoWorldz destination contract only',
    'Prove every CryptoWorldz route on desktop and mobile',
    'Deploy shared OneWorldz GPT origin support',
    'Refuse stale source and recheck exact CryptoWorldz destination',
    'Backup, deploy and byte-prove CryptoWorldz only',
    'Prove live CryptoWorldz desktop and mobile routes',
    'bash .github/cryptoworldz-only-deploy.sh',
    'cryptoworldz.xyz',
    'domains/cryptoworldz.xyz/public_html',
    'CRYPTOWORLDZ_FINAL PASS'
  ];
  for (const token of requiredCryptoWorldzTokens) assert.ok(workflow.includes(token), `main.yml missing CryptoWorldz-only recovery invariant: ${token}`);

  const forbiddenFleetWrites = [
    'bash .github/full-current-static-deploy.sh',
    'bash .github/resume-locked-static-deploy.sh',
    'Backup, deploy and byte-prove all Hostinger destinations',
    'Prove every live desktop and mobile route'
  ];
  for (const token of forbiddenFleetWrites) assert.ok(!workflow.includes(token), `CryptoWorldz-only recovery rail must not arm fleet write path: ${token}`);

  const deployScript = await readFile('.github/cryptoworldz-only-deploy.sh', 'utf8');
  for (const token of [
    "test \"$key\" = 'cryptoworldz'",
    "test \"$domain\" = 'cryptoworldz.xyz'",
    "test \"$transport\" = 'domains/cryptoworldz.xyz/public_html'",
    'Rolling back CryptoWorldz only. No other Hostinger destination is touched.',
    'CRYPTOWORLDZ_ONLY_HOSTINGER_DEPLOYMENT=PASS'
  ]) assert.ok(deployScript.includes(token), `CryptoWorldz-only deployment script missing safety invariant: ${token}`);
} else {
  const requiredFleetTokens = [
    'OneWorldz Safe Static Fleet Deployment',
    'Build and freeze exact candidate',
    'Prove links, separation, visuals, destinations and SEO',
    'Prove every generated desktop and mobile route',
    'Refuse stale source and compare the exact Hostinger map',
    'Backup, deploy and byte-prove all Hostinger destinations',
    'Prove every live desktop and mobile route',
    'CANDIDATE_TREE',
    'CANDIDATE_FINGERPRINT',
    'MIN_PAGE_ROUTES: "83"'
  ];
  for (const token of requiredFleetTokens) assert.ok(workflow.includes(token), `main.yml missing current full-rebuild invariant: ${token}`);
}

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
  assert.ok(browserProof.includes(token), `browser proof missing required evidence: ${token}`);
}

console.log(oneWorldzOnlyMode
  ? 'DEPLOYMENT_STRUCTURE=PASS staged OneWorldz-only rail + exact Hostinger root + desktop/mobile proof; other destinations write-disabled'
  : cryptoWorldzOnlyMode
    ? 'DEPLOYMENT_STRUCTURE=PASS staged CryptoWorldz-only rail + exact Hostinger root + shared GPT origin proof + desktop/mobile proof; other destinations write-disabled'
    : 'DEPLOYMENT_STRUCTURE=PASS one canonical static rail + 18 Hostinger transports + dynamic desktop/mobile live proof');
