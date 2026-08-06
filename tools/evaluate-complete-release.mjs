import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = path.join(repoRoot, 'apps', 'cryptoworldz-web-core');
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(webRoot, relativePath));

const visualFiles = [
  'assets/images/oneworldz-hero.webp',
  'assets/images/oneworldz-impact-mosaic.webp',
  'assets/worldz-imagery.js',
  'assets/worldz-imagery.css',
  'assets/jayjayteamdev.js',
  'assets/jayjayteamdev.css',
  'assets/pdc-asset.js',
  'assets/pdc-asset.css'
];

for (const relativePath of visualFiles) {
  assert.ok(exists(relativePath), `Missing release visual: ${relativePath}`);
  assert.ok(fs.statSync(path.join(webRoot, relativePath)).size > 0, `Empty release visual: ${relativePath}`);
}

const indexSource = read('index.html');
const oneWorldzSource = read('assets/oneworldz.js');
const imagerySource = read('assets/worldz-imagery.js');
const founderSource = read('assets/jayjayteamdev.js');
const pdcAssetSource = read('assets/pdc-asset.js');
const hostSource = fs.readFileSync(path.join(repoRoot, 'src', 'pdc-host.js'), 'utf8');

assert.doesNotThrow(() => new Function(imagerySource), 'Shared Worldz imagery JavaScript is invalid');
assert.doesNotThrow(() => new Function(founderSource), 'JayJayTeamDev page JavaScript is invalid');

assert.match(indexSource, /worldz-imagery\.css/, 'Shared Worldz imagery stylesheet is not loaded');
assert.match(indexSource, /worldz-imagery\.js/, 'Shared Worldz imagery script is not loaded');
assert.match(indexSource, /jayjayteamdev\.css/, 'Founder page stylesheet is not loaded');
assert.match(indexSource, /jayjayteamdev\.js/, 'Founder page route is not loaded');

assert.match(oneWorldzSource, /oneworldz-hero\.webp/, 'OneWorldz hero image is not displayed');
assert.match(oneWorldzSource, /oneworldz-impact-mosaic\.webp/, 'OneWorldz impact image is not displayed');
assert.match(founderSource, /365%/, 'Founder effort dial is missing');
assert.match(founderSource, /self-reported|motivational estimate/i, 'Founder effort accuracy disclosure is missing');
assert.match(founderSource, /Public Build Record/, 'Founder evidence link is missing');

for (const slug of [
  'cryptoworldz',
  'oneworldz',
  'purplediamondcrew',
  'solworldz',
  'ethworldz',
  'baseworldz',
  'bnbworldz',
  'xrpworldz',
  'suiworldz',
  'hyperworldz',
  'robinworldz',
  'bitcoinworldz',
  'hodlerworldz',
  'impactbased',
  'robinhoodlaw',
  'learnworldz'
]) {
  assert.match(imagerySource, new RegExp(`${slug}:`), `Shared official visual is missing for ${slug}`);
}

for (const hostname of [
  'purplediamondcrew.com',
  'oneworldz.com',
  'cryptoworldz.xyz',
  'solworldz.xyz',
  'ethworldz.xyz',
  'baseworldz.xyz',
  'bnbworldz.xyz',
  'xrpworldz.xyz',
  'suiworldz.xyz',
  'hyperworldz.xyz',
  'robinworldz.xyz',
  'bitcoinworldz.xyz',
  'hodlerworldz.xyz',
  'impactbased.oneworldz.com',
  'law.oneworldz.com',
  'learn.oneworldz.com'
]) {
  assert.ok(hostSource.includes(`"${hostname}"`), `Zed host routing is missing ${hostname}`);
}

assert.match(hostSource, /pdc-asset\.js/, 'PDC Hope Chest fallback asset route is missing');
assert.match(hostSource, /allowPdcPreview/, 'PDC fallback visual authorization is missing');
assert.match(pdcAssetSource, /pdc-hope-chest/, 'PDC verified Hope Chest image registry slug is missing');

for (const forbidden of [
  'AUTO_WALLET_PRIVATE_KEY',
  'AUTO_WALLET_SEED',
  'AUTO_SIGNER_SECRET',
  'GRACE_X_CLIENT_SECRET='
]) {
  assert.ok(![indexSource, oneWorldzSource, imagerySource, founderSource].join('\n').includes(forbidden), `Public release contains forbidden secret marker: ${forbidden}`);
}

console.log(`Complete release evaluation passed: ${visualFiles.length} visual files and all registered Worldz routes verified.`);
