import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'apps', 'worldz-sites', 'purplediamondcrew');
const read = (...parts) => fs.readFileSync(path.join(site, ...parts), 'utf8');
const exists = (...parts) => fs.existsSync(path.join(site, ...parts));
const home = read('index.html');
const crew = read('crew', 'index.html');
const mission = read('mission', 'index.html');
const work = read('our-work', 'index.html');
const impact = read('impact', 'index.html');
const donate = read('donate', 'index.html');
const chest = read('hope-chest', 'index.html');
const css = read('assets', 'pdc.css');
const js = read('assets', 'pdc.js');
const htaccess = read('.htaccess');
const pages = [home, crew, mission, work, impact, donate, chest];

for (const [label, html] of [['home',home],['crew',crew],['mission',mission],['our-work',work],['impact',impact],['donate',donate],['hope-chest',chest]]) {
  assert.match(html, /<meta name="viewport"/i, `${label}: mobile viewport missing`);
  assert.match(html, /PURPLE DIAMOND CREW/i, `${label}: PDC identity missing`);
  assert.match(html, /\/assets\/pdc\.css\?v=/, `${label}: standalone CSS missing`);
  assert.ok(!html.includes('assets/site-router.js'), `${label}: shared hostname router leaked in`);
  assert.ok(!html.includes('Loading the Worldz experience'), `${label}: shared loading shell leaked in`);
}

assert.match(home, /pdc-mission-board\.png/, 'Approved PDC mission board is not the home hero');
assert.match(home, /Real People/i, 'PDC action identity missing');
for (const need of ['FOOD','CLOTHING','CLEAN WATER','MEDICAL HELP','SHELTER','EDUCATION','GARDENS']) assert.match(home, new RegExp(need,'i'), `PDC category missing: ${need}`);
assert.match(home, /A DREAM BUILT ON KINDNESS/i, 'Kindness section missing');
assert.ok(home.includes('https://gofund.me/65129e58'), 'Current donation link missing');
assert.ok(donate.includes('https://gofund.me/65129e58'), 'Donate page current fundraiser missing');
assert.ok(pages.some(html => html.includes('https://t.me/PurpleDiamondCrew')), 'PDC Telegram link missing');
assert.ok(pages.some(html => html.includes('https://cryptoworldz.xyz')), 'CryptoWorldz link missing');
assert.ok(pages.some(html => html.includes('https://oneworldz.com')), 'OneWorldz link missing');
assert.ok(pages.some(html => html.includes('https://impactbased.oneworldz.com')), 'ImpactBased link missing');

assert.match(chest, /THE ONEWORLDZ HOPE CHEST/i, 'Hope Chest identity missing');
assert.match(chest, /pdc-hope-chest\.png/, 'Approved Hope Chest raster is not used');
assert.match(chest, /data-approved-art="pdc-hope-chest"/, 'Hope Chest approved-art marker missing');
assert.match(chest, /glass-dock/, 'Hope Chest glass button dock missing');
assert.match(chest, /not presented as active|not presented as current|not presented as active launches|not presented as active launches or endorsements/i, 'Legacy archive disclaimer missing');
assert.match(chest, /Watch the chest\. Watch the Worldz\./i, 'Hope Chest legacy clue missing');

const tokens = [
  ['Devy','4vfa4vqqWq8qax1BeBtSaohvE898MD4x6diL2z5nBcDr'],['Tony','8TSZFxu5fZY6A4VP7yhUWXPjieTA2BQaqqxSd7X4wUQA'],['Dream','GiuPbVzaWtoLkb41FZ2zsiLcpzyR32LdG9hNpkDAgNmX'],['Guru','HASXsaoHbMQS6WC79BBus4wduEQ1FMqomLCbcBATi1x2'],['Mum','9kbUPambLUzsoLbJDgEqKTwAwLUZiCgmcXinMmBWqc3D'],['PJ','AjAHSAH5ea8yWZ9yPBQm1h9Qp1VmXLufhPQN36zpEaMq'],['Oakwyn','zF3ahKvi1LcLj3hxn7JPtVya5CkMkgXW5JW9KUj2yZc'],['Reagan','9WUncJ4hs9FEZeWDxvjk3AJR3ZADJ6tA5TJ1zuvDbqr1'],['Thirteen','9Hpb8P8if2qGPVVJeBePzhksA2v5MiHWUVKv8JB7n2Qw'],['Baby Emu','8QbrfnGeZGCoSrWbkJ3EE2pLD4YUxXhLVY9pW5NukdUx']
];
for (const [name,ca] of tokens) { assert.match(chest,new RegExp(`>${name}<`),`Legacy token missing: ${name}`); assert.ok(chest.includes(ca),`Verified contract missing for ${name}`); }
assert.equal((chest.match(/class="token-card"/g)||[]).length,10,'Hope Chest must contain exactly 10 legacy token cards');

for (const media of ['pdc-mission-board.png','pdc-hope-chest.png','pdc-crest.png']) {
  assert.ok(exists('assets','media',media), `Approved PDC media missing: ${media}`);
  assert.ok(fs.statSync(path.join(site,'assets','media',media)).size > 50000, `Approved PDC media is unexpectedly small: ${media}`);
}
assert.match(css,/backdrop-filter:blur\(18px\)/,'Glass treatment missing');
assert.match(css,/filter:none!important/,'Approved raster anti-blur rule missing');
assert.match(htaccess,/Content-Security-Policy/,'CSP missing');
assert.ok(!js.includes('supabase.co'),'PDC visuals must not depend on Supabase');
console.log('PurpleDiamondCrew production gate passed: approved PNG artwork, glass Hope Chest links, seven site pages and 10 legacy records verified.');
