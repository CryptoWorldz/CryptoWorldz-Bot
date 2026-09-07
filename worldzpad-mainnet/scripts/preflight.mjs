import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('worldzpad-mainnet');
const manifestPath = path.join(root, 'mainnet-plan.json');
const plan = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function fail(message) {
  throw new Error(`WLDZ_MAINNET_PREP_FAIL: ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function sum(values) {
  return Object.values(values).reduce((a, b) => a + b, 0);
}

const expectedRoutes = {
  board: 10,
  holderRewards: 40,
  lpGrowth: 20,
  buybackBurn: 15,
  charity: 10,
  raaiiiddGrowth: 5,
};
const expectedMasters = {
  founder: 25000000,
  liquidity: 25000000,
  peopleCharity: 25000000,
  ecosystem: 25000000,
};
const expectedPeople = {
  legends: 14000000,
  boost: 4000000,
  charityEndowment: 7000000,
};

assert(plan.status === 'PREPARATION_ONLY', 'status must remain PREPARATION_ONLY');
assert(plan.executionEnabled === false, 'executionEnabled must remain false');
assert(plan.launchAuthorization === false, 'launchAuthorization must remain false in preparation package');
assert(plan.network === 'mainnet-beta', 'network must be mainnet-beta');
assert(plan.token.program === 'Token-2022', 'token program drift');
assert(plan.token.name === 'WORLDZ' && plan.token.symbol === 'WLDZ', 'token identity drift');
assert(plan.token.vanityMintPrefix === 'WLDZ', 'vanity mint prefix drift');
assert(plan.token.decimals === 9, 'decimals drift');
assert(plan.token.supplyTokens === 100000000, 'supply drift');
assert(plan.token.mintAuthorityAfterInitialMint === 'REVOKED', 'mint authority policy drift');
assert(plan.token.freezeAuthority === 'NONE', 'freeze authority must be NONE');
assert(JSON.stringify(plan.masterAllocationsTokens) === JSON.stringify(expectedMasters), '25/25/25/25 master allocation drift');
assert(sum(plan.masterAllocationsTokens) === 100000000, 'master allocations do not reconcile to supply');
assert(JSON.stringify(plan.peopleCharitySplitTokens) === JSON.stringify(expectedPeople), '14/4/7 People+Charity split drift');
assert(sum(plan.peopleCharitySplitTokens) === 25000000, 'People+Charity split does not reconcile to 25M');
assert(plan.founderPolicyTokens.timeEnforcedLockedTarget === 20000000, 'Founder lock target drift');
assert(plan.founderPolicyTokens.operationalMaximumBeforeLaunchCosts === 5000000, 'Founder operational cap drift');
assert(plan.meteora.venue === 'Meteora DAMM v2', 'Meteora venue drift');
assert(plan.meteora.pair === 'WLDZ/wSOL', 'pool pair drift');
assert(plan.meteora.collectFeeMode === 'OnlyB', 'CollectFeeMode must be OnlyB');
assert(plan.meteora.baseFeeBps === 200, 'base fee must be 200 bps');
assert(plan.meteora.bondingCurve === false, 'bonding curve must remain disabled');
assert(plan.meteora.liquidityLockRequired === true, 'liquidity lock must be required');
assert(plan.meteora.simulateBeforeSend === true, 'simulation-before-send must be required');
assert(JSON.stringify(plan.autoRoutesPercent) === JSON.stringify(expectedRoutes), 'AUTO route drift');
assert(sum(plan.autoRoutesPercent) === 100, 'AUTO routes do not reconcile to 100%');
assert(plan.holderRewards.cadenceHours === 6, 'HODL cadence drift');
assert(plan.holderRewards.proportionalPercent === 70 && plan.holderRewards.equalizerPercent === 30, '70/30 HODL split drift');
assert(plan.holderRewards.excludeSystemAndLockedAccounts === true, 'system/locked reward exclusion must remain enabled');
assert(plan.addressVerification.independentHumanChecksRequired === 2, 'two-person address verification is required');

const proven = [
  'preMainnetExecutionProofPassed',
  'onlyBFeeClaimProofPassed',
  'autoRouteProofPassed',
  'holderNativeSolProofPassed',
  'lpGrowthProofPassed',
  'buybackBurnProofPassed',
  'charityNativeSolProofPassed',
  'atomicRollbackProofPassed',
];
for (const key of proven) assert(plan.readiness[key] === true, `proven gate regressed: ${key}`);

const base58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const blockers = [];
for (const [name, value] of Object.entries(plan.mainnetPublicAddresses)) {
  if (value == null || value === '') {
    blockers.push(`address:${name}`);
  } else {
    assert(typeof value === 'string' && base58.test(value), `invalid Solana public address format: ${name}`);
  }
}
if (!plan.addressVerification.allAddressesVerified) blockers.push('addressVerification:allAddressesVerified');

for (const [name, value] of Object.entries(plan.readiness)) {
  assert(typeof value === 'boolean', `readiness gate must be boolean: ${name}`);
  if (!proven.includes(name) && value === false) blockers.push(`readiness:${name}`);
}

const proof = plan.preMainnetProof;
assert(proof.repository === 'CryptoWorldz/CryptoWorldz-Bot', 'proof repository drift');
assert(proof.workflowRunId === 34155419579, 'accepted proof run drift');
assert(proof.headSha === '9e7f41f7998b78be43d240f12812bc825b1e57f3', 'accepted proof commit drift');
assert(proof.expectedConclusion === 'success', 'proof conclusion expectation drift');
assert(proof.artifactName === 'wldz-localnet-execution-proofs', 'proof artifact name drift');
assert(proof.artifactSha256 === '317f354ff125fe44df2d370a8f6ca893da5f7ce4cede965a8a0441fef5db70ec', 'proof artifact digest drift');

if (process.env.SKIP_NETWORK_PROOF !== '1') {
  const headers = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'WorldzPad-WLDZ-mainnet-preflight' };
  const runUrl = `https://api.github.com/repos/${proof.repository}/actions/runs/${proof.workflowRunId}`;
  const runResponse = await fetch(runUrl, { headers });
  assert(runResponse.ok, `could not verify accepted proof run: HTTP ${runResponse.status}`);
  const run = await runResponse.json();
  assert(run.conclusion === proof.expectedConclusion, `accepted proof run is not successful: ${run.conclusion}`);
  assert(run.head_sha === proof.headSha, 'accepted proof run head SHA mismatch');

  const artifactsResponse = await fetch(`${runUrl}/artifacts`, { headers });
  assert(artifactsResponse.ok, `could not verify proof artifact: HTTP ${artifactsResponse.status}`);
  const artifacts = await artifactsResponse.json();
  const artifact = artifacts.artifacts.find((item) => item.name === proof.artifactName && !item.expired);
  assert(Boolean(artifact), 'accepted proof artifact missing or expired');
  assert(artifact.digest === `sha256:${proof.artifactSha256}`, 'accepted proof artifact digest mismatch');
}

const report = {
  status: 'PASS',
  mode: 'PREPARATION_ONLY',
  executionEnabled: false,
  launchAuthorized: false,
  acceptedProofRun: proof.workflowRunId,
  acceptedProofSha: proof.headSha,
  blockersCount: blockers.length,
  blockers,
};

fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
fs.writeFileSync(path.join(root, 'artifacts', 'wldz-mainnet-preparation-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`WLDZ_MAINNET_PREP=PASS launch_authorized=0 execution_enabled=0 blockers=${blockers.length} proof_run=${proof.workflowRunId}`);
console.log(`WLDZ_MAINNET_BLOCKERS=${blockers.join(',')}`);
