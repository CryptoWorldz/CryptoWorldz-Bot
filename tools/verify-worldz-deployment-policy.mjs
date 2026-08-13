import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflowsDir = path.join(root, '.github', 'workflows');
const failures = [];
const fail = (file, reason) => failures.push(`${file}: ${reason}`);

const activeProductionWorkflows = [
  'deploy-solworldz-proof-first.yml',
  'recover-solworldz-approved-release.yml'
];

const retiredDuplicateWorkflows = [
  'deploy-worldz-approved.yml',
  'deploy-pdc-standalone.yml',
  'deploy-solworldz-standalone.yml',
  'deploy-cryptoworldz-standalone.yml'
];

function readRequired(relativePath) {
  const full = path.join(root, relativePath);
  if (!fs.existsSync(full)) {
    fail(relativePath, 'required file is missing');
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function requirePattern(file, text, pattern, reason) {
  if (!pattern.test(text)) fail(file, reason);
}

for (const legacy of retiredDuplicateWorkflows) {
  if (fs.existsSync(path.join(workflowsDir, legacy))) {
    fail(legacy, 'duplicate legacy deployment path was restored; cleaned architecture requires it to remain removed');
  }
}

for (const file of activeProductionWorkflows) {
  const text = readRequired(path.join('.github', 'workflows', file));
  if (!text) continue;

  requirePattern(file, text, /set\s+-euo\s+pipefail/, 'strict shell failure mode missing');
  requirePattern(file, text, /source_commit/, 'immutable source commit check missing');
  requirePattern(file, text, /requested_by/, 'owner attribution check missing');
  requirePattern(file, text, /JayJayTeamDev/, 'JayJayTeamDev owner gate missing');
  requirePattern(file, text, /authorization/, 'explicit authorization check missing');
  requirePattern(file, text, /DOMAIN_ONLY/, 'domain-only hosting scope gate missing');
  requirePattern(file, text, /DEPLOY_GUARD/, 'domain deployment guard missing');
  requirePattern(file, text, /sha256sum/i, 'exact SHA-256 proof missing');
  requirePattern(file, text, /assets\/master/, 'approved master image release path missing');
  requirePattern(file, text, /solworld\.fun/i, 'retired SolWorld.fun rejection check missing');
  requirePattern(file, text, /ssl:verify-certificate\s+true/i, 'FTPS certificate verification is not enforced');
  requirePattern(file, text, /openssl\s+s_client/i, 'FTPS identity proof missing');

  if (/ssl:verify-certificate\s+no/i.test(text)) fail(file, 'certificate verification bypass detected');
  if (/FTP_TLS_VERIFY:\s*['"]?no/i.test(text)) fail(file, 'FTP_TLS_VERIFY=no detected');

  const requestPaths = [...text.matchAll(/-\s*['"](deployments\/[^'"]+\.request)['"]/g)].map(match => match[1]);
  if (!requestPaths.length) fail(file, 'production workflow must be triggered by a bounded deployments/*.request file');
}

const deploy = readRequired('.github/workflows/deploy-solworldz-proof-first.yml');
if (deploy) {
  requirePattern('deploy-solworldz-proof-first.yml', deploy, /back\s*up|backup/i, 'pre-deployment backup missing');
  requirePattern('deploy-solworldz-proof-first.yml', deploy, /rollback|restore previous|restore exact predeploy/i, 'safe rollback path missing');
  requirePattern('deploy-solworldz-proof-first.yml', deploy, /desktop and mobile before hosting changes/i, 'pre-hosting visual proof missing');
  requirePattern('deploy-solworldz-proof-first.yml', deploy, /index last/i, 'atomic index-last release switch missing');
}

const recover = readRequired('.github/workflows/recover-solworldz-approved-release.yml');
if (recover) {
  requirePattern('recover-solworldz-approved-release.yml', recover, /Prove desktop and mobile before touching hosting/i, 'pre-recovery visual proof missing');
  requirePattern('recover-solworldz-approved-release.yml', recover, /Restore all approved master assets and index last/i, 'approved-master recovery path missing');
  requirePattern('recover-solworldz-approved-release.yml', recover, /live_asset_sha/, 'live image byte proof missing');
}

const comingSoon = readRequired('apps/cryptoworldz-web-core/assets/coming-soon-next.js');
if (comingSoon) {
  if (!comingSoon.includes('./assets/worldz-master/cryptoworldz/we-need-you.png')) {
    fail('coming-soon-next.js', 'idle Worldz does not use the exact approved We Need You master image');
  }
  if (/hero\.part\d+.*\.b64/i.test(comingSoon)) {
    fail('coming-soon-next.js', 'legacy split base64 hero loader is forbidden');
  }
}

const pdcHome = readRequired('apps/worldz-sites/purplediamondcrew/index.html');
if (pdcHome) {
  if (!pdcHome.includes('https://oneworldz.com/worldz/impactbased')) {
    fail('purplediamondcrew/index.html', 'ImpactBased button does not use the canonical OneWorldz route');
  }
  if (pdcHome.includes('https://impactbased.oneworldz.com')) {
    fail('purplediamondcrew/index.html', 'broken ImpactBased subdomain is still present');
  }
}

if (failures.length) {
  for (const item of failures) console.error(`POLICY FAILURE: ${item}`);
  process.exit(1);
}

console.log('WORLDZ DEPLOYMENT POLICY PASSED: cleaned workflow architecture preserved; active SolWorldz deploy/recovery paths remain owner-gated, proof-first, domain-restricted and exact-image verified.');
