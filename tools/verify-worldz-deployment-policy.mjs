import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflowsDir = path.join(root, '.github', 'workflows');
const files = fs.readdirSync(workflowsDir).filter(name => name.endsWith('.yml'));
const canonicalDeploys = new Set([
  'deploy-worldz-approved.yml',
  'deploy-pdc-standalone.yml',
  'deploy-solworldz-standalone.yml',
  'deploy-cryptoworldz-standalone.yml'
]);

const failures = [];
function fail(file, reason) { failures.push(`${file}: ${reason}`); }

for (const file of files) {
  const full = path.join(workflowsDir, file);
  const text = fs.readFileSync(full, 'utf8');

  if (file.startsWith('deploy-') && !canonicalDeploys.has(file)) {
    if (!/^name:\s*retired\b/im.test(text)) fail(file, 'legacy deployment workflow is not marked RETIRED');
    if (!/exit\s+1\b/.test(text)) fail(file, 'retired deployment workflow does not hard-fail');
  }

  if (canonicalDeploys.has(file)) {
    const forbidden = [
      [/ssl:verify-certificate\s+no/i, 'certificate verification bypass'],
      [/ssl:check-hostname\s+no/i, 'TLS hostname verification bypass'],
      [/FTP_TLS_VERIFY:\s*['"]?no/i, 'FTP_TLS_VERIFY=no'],
      [/FTP_TLS_CHECK_HOSTNAME:\s*['"]?no/i, 'FTP_TLS_CHECK_HOSTNAME=no'],
      [/\|\|\s*true/, 'failure suppression with || true']
    ];
    for (const [pattern, label] of forbidden) if (pattern.test(text)) fail(file, label);
    if (!/set\s+-euo\s+pipefail/.test(text)) fail(file, 'strict shell failure mode missing');
    if (!/sha256sum/i.test(text)) fail(file, 'no exact SHA-256 verification');
    if (!/rollback|restore previous|restore exact predeploy/i.test(text)) fail(file, 'no rollback path');
    if (!/backup|snapshot/i.test(text)) fail(file, 'no pre-deploy backup');

    const pushBlock = text.match(/\n\s*push:\s*\n([\s\S]*?)(?=\n\s*[a-zA-Z_][\w-]*:\s*\n|\npermissions:|\nconcurrency:)/)?.[1] || '';
    if (pushBlock) {
      const quotedPaths = [...pushBlock.matchAll(/-\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
      const illegal = quotedPaths.filter(p => !p.startsWith('deployments/') || !p.endsWith('.request'));
      if (illegal.length) fail(file, `automatic production trigger paths forbidden: ${illegal.join(', ')}`);
    }
    if (!/workflow_dispatch\s*:/.test(text)) fail(file, 'manual workflow_dispatch trigger missing');
  }

  if ((file.startsWith('audit-worldz-') || canonicalDeploys.has(file)) && /\bexit\s+0\b/.test(text)) {
    fail(file, 'explicit exit 0 is forbidden in audit/canonical deployment workflows');
  }
}

const generic = fs.readFileSync(path.join(workflowsDir, 'deploy-worldz-approved.yml'), 'utf8');
if (/^\s*-\s*cryptoworldz\s*$/im.test(generic)) fail('deploy-worldz-approved.yml', 'CryptoWorldz appears as selectable generic deployment target');
if (!/cryptoworldz\|purplediamondcrew\|solworldz/.test(generic)) fail('deploy-worldz-approved.yml', 'protected-target block is missing');

const crypto = fs.readFileSync(path.join(workflowsDir, 'deploy-cryptoworldz-standalone.yml'), 'utf8');
for (const required of ['CRYPTOWORLDZ.XYZ', 'cryptoworldz-production', 'ultimate.html', 'HOSTINGER_CERT_SHA256']) {
  if (!crypto.includes(required)) fail('deploy-cryptoworldz-standalone.yml', `missing protected CryptoWorldz proof/control: ${required}`);
}
if (/mirror\s+--parallel=.*\s\.\s*$/m.test(crypto)) fail('deploy-cryptoworldz-standalone.yml', 'full remote-root backup/upload is forbidden for bounded Ultimate release');

const comingSoon = fs.readFileSync(path.join(root, 'apps', 'cryptoworldz-web-core', 'assets', 'coming-soon-next.js'), 'utf8');
if (!comingSoon.includes("./assets/worldz-master/cryptoworldz/we-need-you.png")) fail('coming-soon-next.js', 'idle Worldz does not use exact approved We Need You master image');
if (/hero\.part\d+.*\.b64/i.test(comingSoon)) fail('coming-soon-next.js', 'legacy split base64 hero loader still present');

const pdc = fs.readFileSync(path.join(workflowsDir, 'deploy-pdc-standalone.yml'), 'utf8');
for (const required of ['https://gofund.me/c2e4fa936', 'https://oneworldz.com/worldz/impactbased', 'LIVE IMAGE HASH MISMATCH']) {
  if (!pdc.includes(required)) fail('deploy-pdc-standalone.yml', `missing required PDC proof: ${required}`);
}
if (pdc.includes('https://impactbased.oneworldz.com')) fail('deploy-pdc-standalone.yml', 'broken ImpactBased subdomain is forbidden');

const pdcHome = fs.readFileSync(path.join(root, 'apps', 'worldz-sites', 'purplediamondcrew', 'index.html'), 'utf8');
if (!pdcHome.includes('https://oneworldz.com/worldz/impactbased')) fail('purplediamondcrew/index.html', 'PDC ImpactBased button does not use canonical OneWorldz route');
if (pdcHome.includes('https://impactbased.oneworldz.com')) fail('purplediamondcrew/index.html', 'PDC still contains broken ImpactBased subdomain');

const audit = fs.readFileSync(path.join(workflowsDir, 'audit-worldz-live-targets.yml'), 'utf8');
for (const forbiddenTarget of ['impactbased.oneworldz.com', 'law.oneworldz.com', 'learn.oneworldz.com', 'bitcoinworldz.xyz']) {
  if (audit.includes(forbiddenTarget)) fail('audit-worldz-live-targets.yml', `noncanonical/dead target is forbidden: ${forbiddenTarget}`);
}
for (const requiredRoute of ['https://oneworldz.com/worldz/impactbased', 'https://oneworldz.com/worldz/law', 'https://oneworldz.com/worldz/learn', 'https://oneworldz.com/worldz/bitworldz']) {
  if (!audit.includes(requiredRoute)) fail('audit-worldz-live-targets.yml', `canonical live route missing: ${requiredRoute}`);
}
if (/bitworldz\.xyz/.test(audit)) fail('audit-worldz-live-targets.yml', 'standalone BitWorldz domain cannot be claimed live before DNS exists');
if (!audit.includes('--retry-all-errors')) fail('audit-worldz-live-targets.yml', 'robust HTTP retry proof missing');

const sol = fs.readFileSync(path.join(workflowsDir, 'deploy-solworldz-standalone.yml'), 'utf8');
if (!/solworld\\?\.fun/i.test(sol) && !sol.includes('solworld\\.fun')) fail('deploy-solworldz-standalone.yml', 'retired SolWorld.fun rejection check missing');

if (failures.length) {
  for (const item of failures) console.error(`POLICY FAILURE: ${item}`);
  process.exit(1);
}
console.log(`WORLDZ DEPLOYMENT POLICY PASSED: ${canonicalDeploys.size} canonical workflows, broken route assumptions and unsafe deployment patterns forbidden.`);
