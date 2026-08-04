import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = path.join(repoRoot, 'apps', 'cryptoworldz-web-core');
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), 'utf8');

const requiredFiles = [
  'index.html',
  '404.html',
  '.htaccess',
  '_headers',
  'assets/app.js',
  'assets/pdc-directory.js',
  'assets/pdc-site.js',
  'assets/pdc-site.css',
  'assets/pdc-asset.js',
  'assets/pdc-asset.css',
  'assets/styles.css',
  'assets/token-directory.css',
  'config/worlds.js',
  'docs/DEPLOYMENT.md',
  'docs/REGISTRY.md',
  'TOKEN-INTAKE.md'
];

for (const relativePath of requiredFiles) {
  assert.ok(fs.existsSync(path.join(webRoot, relativePath)), `Missing required file: ${relativePath}`);
}

const indexSource = read('index.html');
const appSource = read('assets/app.js');
const pdcDirectorySource = read('assets/pdc-directory.js');
const pdcSiteSource = read('assets/pdc-site.js');
const pdcStyleSource = read('assets/pdc-site.css');
const pdcAssetSource = read('assets/pdc-asset.js');
const pdcAssetStyleSource = read('assets/pdc-asset.css');
const configSource = read('config/worlds.js');
const fallbackSource = read('404.html');
const headerSource = read('_headers');
const hostingerSource = read('.htaccess');

assert.doesNotThrow(() => new Function(appSource), 'assets/app.js contains invalid JavaScript');
assert.doesNotThrow(() => new Function(pdcDirectorySource), 'assets/pdc-directory.js contains invalid JavaScript');
assert.doesNotThrow(() => new Function(pdcSiteSource), 'assets/pdc-site.js contains invalid JavaScript');
assert.doesNotThrow(() => new Function(pdcAssetSource), 'assets/pdc-asset.js contains invalid JavaScript');

const context = { window: {} };
vm.createContext(context);
vm.runInContext(configSource, context, { filename: 'config/worlds.js' });
const config = context.window.CRYPTOWORLDZ_CONFIG;
assert.ok(config, 'CRYPTOWORLDZ_CONFIG was not created');
assert.match(config.supabasePublishableKey, /^sb_publishable_/, 'Frontend must use a publishable Supabase key');

const requiredDomains = {
  'cryptoworldz.xyz': 'markets',
  'test.oneworldz.com': 'markets',
  'oneworldz.com': 'mission',
  'impact.oneworldz.com': 'impact',
  'impactbased.oneworldz.com': 'impact',
  'law.oneworldz.com': 'law',
  'learn.oneworldz.com': 'learn',
  'purplediamondcrew.com': 'directory',
  'solworldz.xyz': 'world',
  'ethworldz.xyz': 'world',
  'baseworldz.xyz': 'world',
  'bnbworldz.xyz': 'world',
  'xrpworldz.xyz': 'world',
  'suiworldz.xyz': 'world',
  'hyperworldz.xyz': 'world',
  'robinworldz.xyz': 'world',
  'bitcoinworldz.xyz': 'world',
  'bitworldz.xyz': 'world',
  'hodlerworldz.xyz': 'portfolio'
};

for (const [domain, expectedMode] of Object.entries(requiredDomains)) {
  assert.equal(config.domains[domain]?.mode, expectedMode, `${domain} must use ${expectedMode} mode`);
}

const supportedModes = new Set(['markets', 'mission', 'impact', 'law', 'learn', 'directory', 'world', 'portfolio']);
for (const [domain, route] of Object.entries(config.domains)) {
  assert.ok(route.slug, `${domain} is missing a slug`);
  assert.ok(supportedModes.has(route.mode), `${domain} uses unsupported mode ${route.mode}`);
}

assert.match(appSource, /https:\/\/purplediamondcrew\.com/, 'CryptoWorldz must link to Purple Diamond Crew');
assert.match(appSource, /metadata\.x_url/, 'Token social metadata support is missing');
assert.match(appSource, /feeSplitLabel/, 'Token fee split rendering is missing');

assert.match(pdcDirectorySource, /slug=eq\.purple-diamond-crew/, 'PDC directory must select the verified project record');
assert.match(pdcDirectorySource, /launch_status=in\.\(live,paused,archived\)/, 'PDC directory must include verified current and historical statuses');
assert.match(pdcDirectorySource, /token\.contract_address && token\.verified_at/, 'PDC directory must require contract and verification data');
assert.match(pdcDirectorySource, /does not imply current liquidity or tradability/, 'PDC historical records must include a market-status warning');

assert.match(pdcSiteSource, /PAGE ONE • ACTION TEAM ON THE GROUND/, 'PDC action page is missing');
assert.match(pdcSiteSource, /PAGE TWO • SUPPORT, CONTRIBUTIONS & APPLICATIONS/, 'PDC support page is missing');
assert.match(pdcSiteSource, /PAGE THREE • A SECRET FOR THOSE WHO CHOOSE TO SEARCH/, 'PDC Hope Chest page is missing');
assert.match(pdcSiteSource, /If only some things could be new again/, 'PDC Hope Chest hint is missing');
assert.match(pdcSiteSource, /launch_status=in\.\(live,paused,archived\)/, 'PDC Hope Chest must load verified current and historical tokens');
assert.match(pdcSiteSource, /contract_address=not\.is\.null/, 'PDC Hope Chest must require a contract');
assert.match(pdcSiteSource, /verified_at=not\.is\.null/, 'PDC Hope Chest must require verification');
assert.match(pdcSiteSource, /if \(safeUrl\(token\.trade_url\)\) return \['Invest'/, 'Invest must require a verified trade URL');
assert.match(pdcSiteSource, /not a guarantee of liquidity, price, recovery or investment return/, 'PDC revival disclosure is missing');
assert.match(pdcStyleSource, /repeat\(5, minmax\(0, 1fr\)\)/, 'Desktop Hope Chest must use two rows of five for ten tokens');
assert.match(pdcStyleSource, /background: rgba\(12, 7, 19, \.7\)/, 'Legacy cards must remain translucent over the treasured image');

assert.match(pdcAssetSource, /rest\/v1\/site_assets/, 'Hope Chest asset must be loaded from the protected public asset registry');
assert.match(pdcAssetSource, /slug=eq\.pdc-hope-chest/, 'Hope Chest asset slug is missing');
assert.match(pdcAssetSource, /startsWith\('data:image\/jpeg;base64,'\)/, 'Hope Chest image data must be validated before use');
assert.match(pdcAssetSource, /data\.hopeChestAsset = 'verified'/, 'Hope Chest asset verification state is missing');
assert.match(pdcAssetStyleSource, /hope-chest-page/, 'Hope Chest fallback styling is missing');
assert.ok(!pdcStyleSource.includes('pdc-hope-chest-bg.jpg'), 'Obsolete static Hope Chest image reference remains');

assert.match(indexSource, /assets\/styles\.css/, 'Base stylesheet is not loaded');
assert.match(indexSource, /assets\/token-directory\.css/, 'Token directory stylesheet is not loaded');
assert.match(indexSource, /assets\/pdc-site\.css/, 'PDC website stylesheet is not loaded');
assert.match(indexSource, /assets\/pdc-asset\.css/, 'PDC Hope Chest asset stylesheet is not loaded');
assert.match(indexSource, /config\/worlds\.js/, 'Domain configuration is not loaded');
assert.match(indexSource, /hostname === 'purplediamondcrew\.com'/, 'PDC hostname routing is missing');
assert.match(indexSource, /\? '\.\/assets\/pdc-site\.js'/, 'PurpleDiamondCrew.com must route to the complete PDC website');
assert.match(indexSource, /assets\/pdc-directory\.js/, 'Standalone directory mode must remain available');
assert.match(indexSource, /assets\/pdc-asset\.js/, 'Verified Hope Chest asset loader is not loaded');
assert.match(indexSource, /assets\/app\.js/, 'Main application script is not routed');
assert.match(fallbackSource, /location\.replace\('\/'\)/, '404 fallback must return visitors to the app root');
assert.match(headerSource, /connect-src[^\n]*supabase\.co/, 'Portable CSP must permit the Supabase registry');
assert.match(headerSource, /frame-src[^\n]*dexscreener\.com/, 'Portable CSP must permit DEX Screener charts');
assert.match(hostingerSource, /RewriteRule \^ index\.html \[L\]/, 'Hostinger must route unknown paths to index.html');
assert.match(hostingerSource, /Content-Security-Policy/, 'Hostinger security headers are missing');
assert.match(hostingerSource, /supabase\.co/, 'Hostinger CSP must permit the Supabase registry');
assert.match(hostingerSource, /dexscreener\.com/, 'Hostinger CSP must permit DEX Screener charts');

const combinedPublicSource = [
  indexSource,
  appSource,
  pdcDirectorySource,
  pdcSiteSource,
  pdcStyleSource,
  pdcAssetSource,
  pdcAssetStyleSource,
  configSource,
  headerSource,
  hostingerSource
].join('\n');

for (const forbidden of ['service_role', 'SUPABASE_SERVICE_ROLE', 'sb_secret_']) {
  assert.ok(!combinedPublicSource.includes(forbidden), `Public web files contain forbidden secret marker: ${forbidden}`);
}

console.log(`CryptoWorldz web-core evaluation passed: ${Object.keys(config.domains).length} domain routes, ${requiredFiles.length} required files.`);
