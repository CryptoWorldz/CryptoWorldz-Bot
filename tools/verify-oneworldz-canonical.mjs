import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const authorityPath = 'governance/ONEWORLDZ-CANONICAL-BUILD-AUTHORITY.md';
const webRoot = 'apps/cryptoworldz-web-core';

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
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

const index = read(`${webRoot}/index.html`);
const one = read(`${webRoot}/assets/oneworldz-next.js`);
const css = read(`${webRoot}/assets/oneworldz-live-fix.css`);
const router = read(`${webRoot}/assets/site-router.js`);
const communityHtml = read(`${webRoot}/community-support.html`);
const communityJs = read(`${webRoot}/assets/community-support.js`);
const activeCore = [index, one, css, router, communityHtml, communityJs].join('\n');

// Never allow internal/status placeholders to become public approval.
forbidText(activeCore, /NEXT PASS/i, 'OneWorldz active source');
forbidText(activeCore, /Facebook Support Profile\s*0?\d+/i, 'OneWorldz active source');

// GoFundMe was superseded by the separated DonateWorldz/Stripe/PayPal support plan.
const publicFiles = walk(path.join(root, webRoot)).filter((p) => /\.(?:html|js|css|json)$/i.test(p));
for (const file of publicFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (/gofundme/i.test(text)) {
    errors.push(`stale GoFundMe production reference/file must be retired: ${path.relative(root, file)}`);
  }
}

// OneWorldz identity and mobile/card contract.
requireText(one, 'little-legend', 'OneWorldz lead visual');
requireText(one, 'wx-world-profile', 'Worldz profile-image cards');
requireText(one, 'site-profile-home', 'top-left profile/home identity');
requireText(css, '--owz-blue', 'OneWorldz blue/white theme');
requireText(css, '--owz-white', 'OneWorldz blue/white theme');
requireText(css, 'wx-world-profile', 'Worldz profile-image card styling');

// Connected and humanitarian routes.
for (const route of [
  'https://donateworldz.com/reagan-children/',
  'https://donateworldz.com/community-impact/',
  'https://donateworldz.com/jayjayteamdev/',
  'https://impactbased.cryptoworldz.xyz/',
  'https://cryptoworldz.xyz/',
  'https://purplediamondcrew.com/'
]) requireText(activeCore, route, 'OneWorldz connected routes');

// 35-profile community page must exist and be data-driven from the locked registry.
requireText(communityHtml, 'Community Support', '35-profile community page');
requireText(communityJs, 'oneworldz_support_profiles', '35-profile Supabase registry');
requireText(communityJs, 'display_order', '35-profile ordering');
requireText(communityJs, 'facebook_url', '35-profile verified Facebook links');
requireText(communityJs, 'display_name', '35-profile resolved labels');
requireText(communityJs, '35', '35-profile completeness gate');

// The page may not ship with generic DB fixture labels.
forbidText(communityJs, /Facebook Support Profile/i, '35-profile community page');

if (errors.length) {
  console.error('\nONEWORLDZ CANONICAL BUILD GATE: FAIL\n');
  for (const e of errors) console.error(`- ${e}`);
  console.error('\nNo JayJayTeamDev × ChatGPT approval or production deployment may be claimed until every item is fixed.\n');
  process.exit(1);
}

console.log('ONEWORLDZ CANONICAL BUILD GATE: PASS');
