import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'apps', 'worldz-sites', 'solworldz');
const mediaRoot = path.join(root, 'apps', 'cryptoworldz-web-core', 'assets', 'images', 'website-core');
const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
const htaccess = fs.readFileSync(path.join(site, '.htaccess'), 'utf8');

assert.match(html, /<meta name="viewport"/i, 'Mobile viewport is missing');
assert.match(html, /@media\(max-width:560px\)/, 'Phone layout breakpoint is missing');
assert.match(html, /id="pipeline"/, 'Pipeline section is missing');
assert.match(html, /id="impact"/, 'Impact section is missing');
assert.match(html, /id="network"/, 'Network section is missing');
assert.match(html, /CLICKABLE WORLDZ NETWORK/, 'Clickable Worldz network is missing');
assert.match(html, /data-approved-art="solworldz-hero"/, 'Approved SolWorldz hero marker missing');
assert.match(html, /solworldz-desktop-hero\.webp/, 'Desktop approved hero missing');
assert.match(html, /solworldz-mobile-hero\.webp/, 'Mobile approved hero missing');
assert.match(html, /blockchain-worldz-multichain-directory\.webp/, 'Approved clickable Worldz directory artwork missing');
assert.match(html, /FLAGSHIP OPEN PIPELINE/, 'Pipeline structure missing');
assert.match(html, /IMPACTBASED/i, 'ImpactBased presence missing');
assert.match(html, /ACTION CREATES SMILES/i, 'Humanitarian link missing');
assert.match(html, /COMMAND CENTRE/i, 'Command Centre reference missing');
assert.match(html, /Trade Station/i, 'Trade Station link missing');
assert.ok(html.includes('https://oneworldz.com/gofundme/'), 'OneWorldz GoFundMe hub link missing');

for (const symbol of ['$SMILES', '$SolMars', '$SolBud', '$GIA', '$W', '$NBC', '$SolToken']) {
  assert.ok(html.includes(symbol), `Missing Solana pipeline record: ${symbol}`);
}

assert.ok(!html.includes('<h3>$RHL</h3>'), 'RecoverYourDebt / RHL must not be presented as a Solana pipeline token');
assert.match(html, /RecoverYourDebt belongs to Robin Hood Chain \/ RobinWorldz/i, 'Robin Hood Chain classification missing');
assert.match(html, /filter:none!important/, 'Anti-blur image rule missing');
assert.ok(!/assets\/site-router\.js/i.test(html), 'Standalone SolWorldz must not use shared hostname router');
assert.ok(!/Loading the Worldz experience/i.test(html), 'Shared loading shell leaked into standalone site');
assert.match(htaccess, /Content-Security-Policy/, 'Security policy is missing');

for (const [name, text] of [['index.html', html], ['.htaccess', htaccess]]) {
  assert.ok(!/solworld\.fun/i.test(text), `${name} contains retired SolWorld.fun reference`);
}

const liveWorldz = [
  'https://oneworldz.com',
  'https://cryptoworldz.xyz',
  'https://solworldz.xyz',
  'https://ethworldz.xyz',
  'https://baseworldz.xyz',
  'https://bnbworldz.xyz',
  'https://xrpworldz.xyz',
  'https://hyperworldz.xyz',
  'https://robinworldz.xyz',
  'https://www.based.bid/b/ImpactBased',
  'https://purplediamondcrew.com'
];
for (const url of liveWorldz) assert.ok(html.includes(url), `Clickable Worldz destination missing: ${url}`);

for (const name of ['SuiWorldz', 'BitcoinWorldz', 'LearnWorldz']) {
  assert.match(html, new RegExp(`${name}<small>COMING SOON<\\/small>`), `${name} must remain visibly marked Coming Soon until its live DNS target passes`);
}

for (const blockedUntilLive of [
  'href="https://suiworldz.com"',
  'href="https://bitcoinworldz.com"',
  'href="https://impactbased.oneworldz.com"',
  'href="https://learn.oneworldz.com"'
]) {
  assert.ok(!html.includes(blockedUntilLive), `Unreachable Worldz destination must not be published as a clickable link: ${blockedUntilLive}`);
}

const approvedMedia = [
  path.join(mediaRoot, 'solworldz', 'solworldz-desktop-hero.webp'),
  path.join(mediaRoot, 'solworldz', 'solworldz-mobile-hero.webp'),
  path.join(mediaRoot, 'blockchain', 'blockchain-worldz-multichain-directory.webp')
];
for (const file of approvedMedia) {
  assert.ok(fs.existsSync(file), `Approved media missing: ${path.relative(root, file)}`);
  assert.ok(fs.statSync(file).size > 5000, `Approved media unexpectedly small: ${path.relative(root, file)}`);
}

console.log('SolWorldz production gate passed: retired domain blocked, canonical approved media present, live Worldz clickable, unconnected Worldz safely marked pending.');
