import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const authorityPath = 'governance/ONEWORLDZ-CANONICAL-BUILD-AUTHORITY.md';
const manifestPath = 'governance/master-use-library-manifest.v1.json';
const webRoot = 'apps/cryptoworldz-web-core';

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    errors.push(`missing required file: ${rel}`);
    return '';
  }
  return fs.readFileSync(p, 'utf8');
}
function requireText(text, token, label) {
  if (!text.includes(token)) errors.push(`${label}: missing required marker ${JSON.stringify(token)}`);
}
function forbidText(text, pattern, label) {
  if (pattern.test(text)) errors.push(`${label}: contains prohibited production content matching ${pattern}`);
}
function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const authority = read(authorityPath);
requireText(authority, 'Latest direct JayJayTeamDev instruction', 'canonical authority');
requireText(authority, 'Dedicated 35-profile Facebook Community Support page', 'canonical authority');
requireText(authority, 'Technical-live and visual/UX approval are separate gates', 'canonical authority');

let manifest = null;
try { manifest = JSON.parse(read(manifestPath)); } catch { errors.push('Master Use Library manifest is not valid JSON'); }
if (manifest) {
  if (manifest.version !== '1.0' || manifest.asset_count !== 45 || manifest.files?.length !== 45) {
    errors.push('Master Use Library manifest must remain exact V1 with 45 hashed entries');
  }
  const requiredHashes = new Map([
    ['production/oneworldz/little-legend.webp','1598b2b3d11a3ba3ce9a181366973b675e8b15dd25ad6addd789ac2b7e6c1919'],
    ['production/oneworldz/hope-chest.webp','a4bb625c906c11961b877a1d24ed199fd95aa22177a7815ab39dfd7d666567b3'],
    ['production/command-centre/zed-grace-auto.webp','2bc8fee7e6d2790c5cc1b9cf5583fbf45818558786bc806de4d3d576fe1acca9'],
    ['production/impactbased/impactbased-square.webp','4aa3c8c532fb06e07c3ab4dcfac6901012e6fd6cc758e02db67a18e226241554'],
    ['production/blockchain-worldz/solworldz.webp','a8a3969f961c5f45e6d21da4f44c4a98a8bbba87e1c05705d6537e191109612d'],
    ['production/blockchain-worldz/ethworldz.webp','a6dafe4f7cb11b57e89acaeed6559e55bea212ac0a394bdbfc911b4968df14d3'],
    ['production/blockchain-worldz/baseworldz.webp','9e33ac3d5b52c71749151025b989a1b88a026bd8f0089dc8030effc77dc86bda'],
    ['production/blockchain-worldz/bnbworldz.webp','6122e2075e7dfe657bbaae4353144e395771c7f38c36b79d920ab68d3b448000'],
    ['production/blockchain-worldz/xrpworldz.webp','53a011d58de88799a3a3e0ef4e09a1aac9b48f75c7f6a3c098e5514d4b57ac24'],
    ['production/blockchain-worldz/suiworldz.webp','80507346c696ab1ee67c4427adc23594a52856dffe139f2176e5c3b550e0f56c'],
    ['production/blockchain-worldz/hyperworldz.webp','bbeaa4415abb7a19a073b14c2fa545491a8af871f5f43f1b83150e9d3bdf2b46'],
    ['production/blockchain-worldz/robinworldz.webp','4473ac1d3af43336254b642ab24d6a68a65297cdee67cb826273fa12ca046897']
  ]);
  for (const [asset, hash] of requiredHashes) {
    const row = manifest.files.find((x) => x.path === asset);
    if (!row || row.sha256 !== hash) errors.push(`Master Use Library identity/hash drift: ${asset}`);
  }
}

const index = read(`${webRoot}/index.html`);
const one = read(`${webRoot}/assets/oneworldz-next.js`);
const css = read(`${webRoot}/assets/oneworldz-live-fix.css`);
const router = read(`${webRoot}/assets/site-router.js`);
const communityHtml = read(`${webRoot}/community-support.html`);
const communityJs = read(`${webRoot}/assets/community-support.js`);
const activeCore = [index, one, css, router, communityHtml, communityJs].join('\n');

forbidText(activeCore, /NEXT PASS/i, 'OneWorldz active source');
forbidText(activeCore, /Facebook Support Profile\s*0?\d+/i, 'OneWorldz active source');

const publicFiles = walk(path.join(root, webRoot)).filter((p) => /\.(?:html|js|css|json)$/i.test(p));
for (const file of publicFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (/gofundme/i.test(text)) errors.push(`stale GoFundMe production reference/file must be retired: ${path.relative(root, file)}`);
}

requireText(one, 'little-legend', 'OneWorldz lead visual');
requireText(one, 'wx-world-profile', 'Worldz profile-image cards');
requireText(one, 'site-profile-home', 'top-left profile/home identity');
requireText(css, '--owz-blue', 'OneWorldz blue/white theme');
requireText(css, '--owz-white', 'OneWorldz blue/white theme');
requireText(css, 'wx-world-profile', 'Worldz profile-image card styling');

for (const route of [
  'https://donateworldz.com/reagan-children/',
  'https://donateworldz.com/community-impact/',
  'https://donateworldz.com/jayjayteamdev/',
  'https://impactbased.cryptoworldz.xyz/',
  'https://cryptoworldz.xyz/',
  'https://purplediamondcrew.com/'
]) requireText(activeCore, route, 'OneWorldz connected routes');

requireText(communityHtml, 'Community Support', '35-profile community page');
requireText(communityJs, 'oneworldz_support_profiles', '35-profile Supabase registry');
requireText(communityJs, 'display_order', '35-profile ordering');
requireText(communityJs, 'facebook_url', '35-profile verified Facebook links');
requireText(communityJs, 'display_name', '35-profile resolved labels');
requireText(communityJs, '35', '35-profile completeness gate');
forbidText(communityJs, /Facebook Support Profile/i, '35-profile community page');

if (errors.length) {
  console.error('\nONEWORLDZ CANONICAL BUILD GATE: FAIL\n');
  for (const e of errors) console.error(`- ${e}`);
  console.error('\nNo JayJayTeamDev × ChatGPT approval or production deployment may be claimed until every item is fixed.\n');
  process.exit(1);
}

console.log('ONEWORLDZ CANONICAL BUILD GATE: PASS');
