import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflowsDir = path.join(root, '.github', 'workflows');
const files = fs.readdirSync(workflowsDir).filter(name => name.endsWith('.yml'));
const canonicalDeploys = new Set([
  'deploy-worldz-approved.yml',
  'deploy-pdc-standalone.yml',
  'deploy-solworldz-standalone.yml'
]);

const failures = [];
function fail(file, reason) { failures.push(`${file}: ${reason}`); }

for (const file of files) {
  const full = path.join(workflowsDir, file);
  const text = fs.readFileSync(full, 'utf8');
  const lower = text.toLowerCase();

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
      [/\|\|\s*true/, 'failure suppression with || true'],
      [/set\s+\+e\b/, 'set +e failure suppression']
    ];
    for (const [pattern, label] of forbidden) if (pattern.test(text)) fail(file, label);
    if (!/sha256sum/i.test(text)) fail(file, 'no exact SHA-256 verification');
    if (!/rollback|restore previous|restore previous site/i.test(text)) fail(file, 'no rollback path');
    if (!/backup|snapshot/i.test(text)) fail(file, 'no pre-deploy backup');
  }

  if ((file.startsWith('audit-worldz-') || canonicalDeploys.has(file)) && /\bexit\s+0\b/.test(text)) {
    fail(file, 'explicit exit 0 is forbidden in audit/canonical deployment workflows');
  }
}

const generic = fs.readFileSync(path.join(workflowsDir, 'deploy-worldz-approved.yml'), 'utf8');
if (/^\s*-\s*cryptoworldz\s*$/im.test(generic)) fail('deploy-worldz-approved.yml', 'CryptoWorldz appears as selectable generic deployment target');
if (!/cryptoworldz\|purplediamondcrew\|solworldz/.test(generic)) fail('deploy-worldz-approved.yml', 'protected-target block is missing');

const comingSoon = fs.readFileSync(path.join(root, 'apps', 'cryptoworldz-web-core', 'assets', 'coming-soon-next.js'), 'utf8');
if (!comingSoon.includes("./assets/worldz-master/cryptoworldz/we-need-you.png")) fail('coming-soon-next.js', 'idle Worldz does not use exact approved We Need You master image');
if (/hero\.part\d+.*\.b64/i.test(comingSoon)) fail('coming-soon-next.js', 'legacy split base64 hero loader still present');

const pdc = fs.readFileSync(path.join(workflowsDir, 'deploy-pdc-standalone.yml'), 'utf8');
for (const required of ['https://gofund.me/65129e58', 'https://impactbased.oneworldz.com', 'LIVE IMAGE HASH MISMATCH']) {
  if (!pdc.includes(required)) fail('deploy-pdc-standalone.yml', `missing required PDC proof: ${required}`);
}

const sol = fs.readFileSync(path.join(workflowsDir, 'deploy-solworldz-standalone.yml'), 'utf8');
if (!/solworld\\?\.fun/i.test(sol) && !sol.includes('solworld\\.fun')) fail('deploy-solworldz-standalone.yml', 'retired SolWorld.fun rejection check missing');

if (failures.length) {
  for (const item of failures) console.error(`POLICY FAILURE: ${item}`);
  process.exit(1);
}
console.log(`WORLDZ DEPLOYMENT POLICY PASSED: ${canonicalDeploys.size} canonical deployment workflows, legacy deploys retired, unsafe bypasses forbidden.`);
