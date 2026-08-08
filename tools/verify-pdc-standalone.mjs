import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'apps', 'worldz-sites', 'purplediamondcrew');
const read = (...parts) => fs.readFileSync(path.join(site, ...parts), 'utf8');
const home = read('index.html');
const crew = read('crew', 'index.html');
const chest = read('hope-chest', 'index.html');
const css = read('assets', 'pdc.css');
const js = read('assets', 'pdc.js');
const htaccess = read('.htaccess');
const pages = [home, crew, chest];

for (const [label, html] of [['home', home], ['crew', crew], ['hope-chest', chest]]) {
  assert.match(html, /<meta name="viewport"/i, `${label}: mobile viewport missing`);
  assert.match(html, /PURPLE DIAMOND CREW/i, `${label}: PDC identity missing`);
  assert.match(html, /\/assets\/pdc\.css\?v=/, `${label}: standalone CSS missing`);
  assert.match(html, /\/assets\/pdc\.js\?v=/, `${label}: standalone JS missing`);
  assert.ok(!html.includes('assets/site-router.js'), `${label}: shared hostname router leaked in`);
  assert.ok(!html.includes('Loading the Worldz experience'), `${label}: shared loading shell leaked in`);
}

assert.match(home, /THE ACTION TEAM ON THE GROUND/i, 'Action Team page missing');
assert.match(home, /WE DON.?T JUST TALK/i, 'Locked PDC action motto missing');
for (const need of ['FOOD', 'WATER', 'HEALTHCARE', 'HOUSING', 'EDUCATION']) {
  assert.ok(home.includes(need), `Action Team category missing: ${need}`);
}
assert.match(crew, /SUPPORT • CONTRIBUTE • APPLY/i, 'Crew three-lane structure missing');
assert.match(crew, /Bring a Project/i, 'Project application pathway missing');
assert.ok(home.includes('https://gofund.me/65129e58'), 'Current donation link missing');
assert.ok(!pages.some((html) => html.includes('65129e58a')), 'Stale donation link still present');
assert.ok(pages.some((html) => html.includes('https://t.me/PurpleDiamondCrew')), 'PDC Telegram link missing');
assert.ok(crew.includes('https://x.com/PDCrew'), 'PDC X link missing');

assert.match(chest, /THE ONEWORLDZ HOPE CHEST/i, 'Hope Chest identity missing');
assert.match(chest, /not presented as active/i, 'Legacy archive disclaimer missing');
assert.match(chest, /Watch the chest\. Watch the Worldz\./i, 'Hidden revival clue missing');
assert.match(chest, /data-hope-chest-master="pdc-hope-chest"/, 'Verified Hope Chest master hook missing');
assert.match(js, /slug=eq\.pdc-hope-chest/, 'Verified Hope Chest registry lookup missing');
assert.match(js, /asset\.data_uri\.length < 10000/, 'Hope Chest integrity gate missing');

const tokens = [
  ['Devy', '4vfa4vqqWq8qax1BeBtSaohvE898MD4x6diL2z5nBcDr'],
  ['Tony', '8TSZFxu5fZY6A4VP7yhUWXPjieTA2BQaqqxSd7X4wUQA'],
  ['Dream', 'GiuPbVzaWtoLkb41FZ2zsiLcpzyR32LdG9hNpkDAgNmX'],
  ['Guru', 'HASXsaoHbMQS6WC79BBus4wduEQ1FMqomLCbcBATi1x2'],
  ['Mum', '9kbUPambLUzsoLbJDgEqKTwAwLUZiCgmcXinMmBWqc3D'],
  ['PJ', 'AjAHSAH5ea8yWZ9yPBQm1h9Qp1VmXLufhPQN36zpEaMq'],
  ['Oakwyn', 'zF3ahKvi1LcLj3hxn7JPtVya5CkMkgXW5JW9KUj2yZc'],
  ['Reagan', '9WUncJ4hs9FEZeWDxvjk3AJR3ZADJ6tA5TJ1zuvDbqr1'],
  ['Thirteen', '9Hpb8P8if2qGPVVJeBePzhksA2v5MiHWUVKv8JB7n2Qw'],
  ['Baby Emu', '8QbrfnGeZGCoSrWbkJ3EE2pLD4YUxXhLVY9pW5NukdUx']
];
for (const [name, ca] of tokens) {
  assert.ok(chest.includes(`>${name}<`) || chest.includes(`>${name}</h3>`), `Legacy token missing: ${name}`);
  assert.ok(chest.includes(ca), `Verified contract missing for ${name}`);
}
assert.equal((chest.match(/class="token-card"/g) || []).length, 10, 'Hope Chest must contain exactly 10 legacy token cards');
assert.ok((chest.match(/<svg\b/g) || []).length >= 11, 'Hope Chest needs vector fallback art for chest + all tokens');
assert.equal((chest.match(/data-optional-logo/g) || []).length, 10, 'Each legacy token must mark its remote logo as optional');
assert.match(js, /img\.remove\(\)/, 'Broken optional-logo cleanup missing');
assert.match(js, /data-mobile-collapse/, 'Mobile Hope Chest collapse behavior missing');
assert.match(css, /grid-template-columns:repeat\(5,1fr\)/, 'Desktop Hope Chest must be two rows of five');
assert.match(css, /@media\(max-width:620px\)/, 'Phone layout breakpoint missing');

assert.match(htaccess, /Cache-Control "no-store, no-cache/, 'HTML no-cache rule missing');
assert.match(htaccess, /Content-Security-Policy/, 'CSP missing');
assert.match(htaccess, /hknymhhyqldtzmplzuzh\.supabase\.co/, 'Hope Chest Supabase CSP permission missing');
assert.ok(!pages.some((html) => /<img(?![^>]*data-optional-logo)/i.test(html)), 'A required image depends on an external raster URL');

console.log('PurpleDiamondCrew standalone production gate passed: 3 pages, 10 verified legacy tokens, built-in vector fallbacks, resilient Hope Chest master.');
