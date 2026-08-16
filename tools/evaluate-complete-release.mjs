import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = path.join(repoRoot, 'apps', 'cryptoworldz-web-core');
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(webRoot, relativePath));

const visualFiles = [
  'assets/images/website-core/oneworldz/oneworldz-one-vision-one-future.webp',
  'assets/images/website-core/purple-diamond-crew/hope-chest-by-firelight.webp',
  'assets/oneworldz-live-fix.css',
  'assets/worldz-imagery.js',
  'assets/worldz-imagery.css',
  'assets/jayjayteamdev.js',
  'assets/jayjayteamdev.css',
  'assets/pdc-asset.js',
  'assets/pdc-asset.css'
];
for (const relativePath of visualFiles) {
  assert.ok(exists(relativePath), `Missing current release visual: ${relativePath}`);
  assert.ok(fs.statSync(path.join(webRoot, relativePath)).size > 0, `Empty current release visual: ${relativePath}`);
}

const indexSource = read('index.html');
const routerSource = read('assets/site-router.js');
const oneWorldzSource = read('assets/oneworldz-next.js');
const imagerySource = read('assets/worldz-imagery.js');
const founderSource = read('assets/jayjayteamdev.js');
const pdcAssetSource = read('assets/pdc-asset.js');
const hostSource = fs.readFileSync(path.join(repoRoot, 'src', 'pdc-host.js'), 'utf8');

for (const [name, source] of [
  ['Worldz router', routerSource],
  ['OneWorldz current page', oneWorldzSource],
  ['Shared Worldz imagery', imagerySource],
  ['JayJayTeamDev page', founderSource]
]) {
  assert.doesNotThrow(() => new Function(source), `${name} JavaScript is invalid`);
}

assert.match(indexSource, /worldz-imagery\.css/, 'Shared Worldz imagery stylesheet is not loaded');
assert.match(indexSource, /worldz-imagery\.js/, 'Shared Worldz imagery script is not loaded');
assert.match(indexSource, /jayjayteamdev\.css/, 'JayJayTeamDev stylesheet is not loaded');
assert.match(indexSource, /site-router\.js/, 'Worldz router is not loaded');
assert.match(routerSource, /oneworldz-next\.js/, 'Current OneWorldz route is not loaded');
assert.match(routerSource, /oneworldz-live-fix\.css/, 'Strict OneWorldz visual repair stylesheet is not loaded');
assert.match(routerSource, /jayjayteamdev\.js/, 'JayJayTeamDev page route is not loaded');

assert.match(oneWorldzSource, /oneworldz-one-vision-one-future\.webp/, 'Current OneWorldz master hero is not displayed');
assert.match(oneWorldzSource, /hope-chest-by-firelight\.webp/, 'Current Hope Chest master artwork is not displayed');
assert.match(oneWorldzSource, /https:\/\/impactbased\.cryptoworldz\.xyz\//, 'Current ImpactBased production page is not linked');
assert.doesNotMatch(oneWorldzSource, /https:\/\/impactbased\.oneworldz\.com/, 'Retired ImpactBased subdomain remains in OneWorldz public links');
assert.match(oneWorldzSource, /https:\/\/donateworldz\.com\/reagan-children\//, 'Dedicated Action Spreads Smiles support page is not linked');
assert.doesNotMatch(oneWorldzSource, /NEXT PASS/i, 'Internal deployment placeholder text remains on the OneWorldz public page');
assert.match(founderSource, /Public Build Record/, 'Founder evidence link is missing');
assert.match(pdcAssetSource, /pdc-hope-chest/, 'PDC verified Hope Chest registry slug is missing');

for (const hostname of [
  'purplediamondcrew.com',
  'oneworldz.com',
  'cryptoworldz.xyz',
  'solworldz.xyz',
  'ethworldz.xyz',
  'baseworldz.xyz',
  'xrpworldz.xyz',
  'hyperworldz.xyz',
  'robinworldz.xyz',
  'bitcoinworldz.xyz',
  'hodlerworldz.xyz'
]) {
  assert.ok(hostSource.includes(`"${hostname}"`), `Zed host routing is missing ${hostname}`);
}

assert.match(hostSource, /pdc-asset\.js/, 'PDC Hope Chest fallback asset route is missing');
assert.match(hostSource, /allowPdcPreview/, 'PDC fallback visual authorization is missing');

const publicReleaseSource = [indexSource, routerSource, oneWorldzSource, imagerySource, founderSource, pdcAssetSource].join('\n');
for (const forbidden of [
  'AUTO_WALLET_PRIVATE_KEY',
  'AUTO_WALLET_SEED',
  'AUTO_SIGNER_SECRET',
  'GRACE_X_CLIENT_SECRET=',
  'sb_secret_',
  'SUPABASE_SERVICE_ROLE'
]) {
  assert.ok(!publicReleaseSource.includes(forbidden), `Public release contains forbidden secret marker: ${forbidden}`);
}

console.log(`Complete release evaluation passed: ${visualFiles.length} current visual assets and canonical Worldz routes verified.`);
