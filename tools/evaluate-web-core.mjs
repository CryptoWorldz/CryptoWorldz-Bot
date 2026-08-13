import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = path.join(repoRoot, 'apps', 'cryptoworldz-web-core');
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(webRoot, relativePath));

const requiredFiles = [
  'index.html', '404.html', '.htaccess', '_headers', 'donate.html', 'gofundme.html', 'reagan-kauja.html',
  'command-centre/ultimate/index.html', 'config/worlds.js',
  'assets/site-router.js', 'assets/app.js', 'assets/oneworldz-next.js', 'assets/impactbased.js',
  'assets/pdc-site.js', 'assets/pdc-site.css', 'assets/pdc-asset.js', 'assets/pdc-asset.css',
  'assets/solworldz.js', 'assets/worldz-imagery.js', 'assets/worldz-imagery.css',
  'assets/jayjayteamdev.js', 'assets/jayjayteamdev.css', 'assets/styles.css'
];
for (const relativePath of requiredFiles) {
  assert.ok(exists(relativePath), `Missing required current web file: ${relativePath}`);
}

const indexSource = read('index.html');
const donateSource = read('donate.html');
const gofundmeSource = read('gofundme.html');
const routerSource = read('assets/site-router.js');
const appSource = read('assets/app.js');
const oneWorldzSource = read('assets/oneworldz-next.js');
const pdcSiteSource = read('assets/pdc-site.js');
const pdcAssetSource = read('assets/pdc-asset.js');
const solWorldzSource = read('assets/solworldz.js');
const imagerySource = read('assets/worldz-imagery.js');
const configSource = read('config/worlds.js');
const hostingerSource = read('.htaccess');

for (const [name, source] of [
  ['site router', routerSource], ['main app', appSource], ['OneWorldz', oneWorldzSource],
  ['PDC site', pdcSiteSource], ['PDC asset', pdcAssetSource], ['SolWorldz', solWorldzSource],
  ['shared imagery', imagerySource]
]) {
  assert.doesNotThrow(() => new Function(source), `${name} contains invalid JavaScript`);
}

const context = { window: {} };
vm.createContext(context);
vm.runInContext(configSource, context, { filename: 'config/worlds.js' });
const config = context.window.CRYPTOWORLDZ_CONFIG;
assert.ok(config, 'CRYPTOWORLDZ_CONFIG was not created');
assert.match(config.supabasePublishableKey, /^sb_publishable_/, 'Frontend must use a publishable Supabase key');

const requiredDomains = {
  'cryptoworldz.xyz': 'markets',
  'oneworldz.com': 'mission',
  'purplediamondcrew.com': 'directory',
  'solworldz.xyz': 'world',
  'ethworldz.xyz': 'world',
  'baseworldz.xyz': 'world',
  'xrpworldz.xyz': 'world',
  'hyperworldz.xyz': 'world',
  'robinworldz.xyz': 'world',
  'bitcoinworldz.xyz': 'world',
  'hodlerworldz.xyz': 'portfolio'
};
for (const [domain, expectedMode] of Object.entries(requiredDomains)) {
  assert.equal(config.domains[domain]?.mode, expectedMode, `${domain} must use ${expectedMode} mode`);
}
assert.equal(config.domains['impact.oneworldz.com'], undefined, 'retired impact.oneworldz.com duplicate must remain removed');
assert.equal(config.domains['bitworldz.xyz'], undefined, 'unowned BitWorldz domain must not be registered in the current browser config');

const communityFund = 'https://gofund.me/933219353';
const reaganFund = 'https://gofund.me/c2e4fa936';
const jayProfile = 'https://www.gofundme.com/u/jayjayteamdev';
for (const [label, source] of [['donation directory', donateSource], ['GoFundMe hub', gofundmeSource]]) {
  assert.ok(source.includes(communityFund), `${label}: Community Survival Fund missing`);
  assert.ok(source.includes(reaganFund), `${label}: Reagan fundraiser missing`);
  assert.ok(source.includes(jayProfile), `${label}: JayJayTeamDev profile missing`);
}
assert.match(donateSource, /The Davis Family/i, 'Davis Family dedicated campaign missing');
assert.match(gofundmeSource, /The Davis Family/i, 'Davis Family campaign missing from GoFundMe hub');

assert.match(routerSource, /oneworldz-next\.js/, 'OneWorldz current page route is missing');
assert.match(routerSource, /pdc-site\.js/, 'Purple Diamond Crew current page route is missing');
assert.match(routerSource, /solworldz\.js/, 'SolWorldz current page route is missing');
assert.match(oneWorldzSource, /https:\/\/oneworldz\.com\/worldz\/impactbased/, 'OneWorldz must use the canonical ImpactBased route');
assert.doesNotMatch(oneWorldzSource, /https:\/\/impactbased\.oneworldz\.com/, 'OneWorldz still links to the broken ImpactBased subdomain');
assert.match(solWorldzSource, /class="sw-hero-visual"/, 'SolWorldz code-native hero is missing');
assert.doesNotMatch(solWorldzSource, /solworldz-(?:desktop|mobile)-hero\.webp/, 'SolWorldz must not depend on retired corrupt hero WebPs');
assert.match(pdcAssetSource, /pdc-hope-chest/, 'PDC Hope Chest verified asset slug is missing');
assert.match(hostingerSource, /RewriteRule \^ index\.html \[L\]/, 'Hostinger fallback routing is missing');

const publicSource = [
  indexSource, donateSource, gofundmeSource, routerSource, appSource, oneWorldzSource,
  pdcSiteSource, pdcAssetSource, solWorldzSource, imagerySource, configSource, hostingerSource
].join('\n');
for (const forbidden of ['service_role', 'SUPABASE_SERVICE_ROLE', 'sb_secret_', 'AUTO_WALLET_PRIVATE_KEY', 'AUTO_WALLET_SEED']) {
  assert.ok(!publicSource.includes(forbidden), `Public web files contain forbidden secret marker: ${forbidden}`);
}

console.log(`CryptoWorldz web-core evaluation passed: ${requiredFiles.length} current files, ${Object.keys(requiredDomains).length} canonical domains and fundraiser routes verified.`);
