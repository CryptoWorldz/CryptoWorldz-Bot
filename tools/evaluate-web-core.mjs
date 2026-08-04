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
const configSource = read('config/worlds.js');
const fallbackSource = read('404.html');
const headerSource = read('_headers');
const hostingerSource = read('.htaccess');

assert.doesNotThrow(() => new Function(appSource), 'assets/app.js contains invalid JavaScript');

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

assert.match(appSource, /launch_status === 'live'/, 'Live-token directory must require live status');
assert.match(appSource, /Boolean\(token\.contract_address\)/, 'Live-token directory must require a contract address');
assert.match(appSource, /Boolean\(token\.verified_at\)/, 'Live-token directory must require verification');
assert.match(appSource, /https:\/\/purplediamondcrew\.com/, 'CryptoWorldz must link to Purple Diamond Crew');
assert.match(appSource, /metadata\.x_url/, 'Token social metadata support is missing');
assert.match(appSource, /feeSplitLabel/, 'Token fee split rendering is missing');

assert.match(indexSource, /assets\/styles\.css/, 'Base stylesheet is not loaded');
assert.match(indexSource, /assets\/token-directory\.css/, 'Token directory stylesheet is not loaded');
assert.match(indexSource, /config\/worlds\.js/, 'Domain configuration is not loaded');
assert.match(indexSource, /assets\/app\.js/, 'Application script is not loaded');
assert.match(fallbackSource, /location\.replace\('\/'\)/, '404 fallback must return visitors to the app root');
assert.match(headerSource, /connect-src[^\n]*supabase\.co/, 'Portable CSP must permit the Supabase registry');
assert.match(headerSource, /frame-src[^\n]*dexscreener\.com/, 'Portable CSP must permit DEX Screener charts');
assert.match(hostingerSource, /RewriteRule \^ index\.html \[L\]/, 'Hostinger must route unknown paths to index.html');
assert.match(hostingerSource, /Content-Security-Policy/, 'Hostinger security headers are missing');
assert.match(hostingerSource, /supabase\.co/, 'Hostinger CSP must permit the Supabase registry');
assert.match(hostingerSource, /dexscreener\.com/, 'Hostinger CSP must permit DEX Screener charts');

const combinedPublicSource = [indexSource, appSource, configSource, headerSource, hostingerSource].join('\n');
for (const forbidden of ['service_role', 'SUPABASE_SERVICE_ROLE', 'sb_secret_']) {
  assert.ok(!combinedPublicSource.includes(forbidden), `Public web files contain forbidden secret marker: ${forbidden}`);
}

console.log(`CryptoWorldz web-core evaluation passed: ${Object.keys(config.domains).length} domain routes, ${requiredFiles.length} required files.`);
