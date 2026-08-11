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
const fundraiser = 'https://gofund.me/c2e4fa936';
assert.ok(home.includes(fundraiser), 'Current donation link missing');
assert.ok(donate.includes(fundraiser), 'Donate page current fundraiser missing');
assert.ok(!pages.some(html => html.includes('https://gofund.me/65129e58')), 'Stale Reagan fundraiser link still present');
assert.ok(pages.some(html => html.includes('https://t.me/PurpleDiamondCrew')), 'PDC Telegram link missing');
assert.ok(pages.some(html => html.includes('https://cryptoworldz.xyz')), 'CryptoWorldz link missing');
assert.ok(pages.some(html => html.includes('https://oneworldz.com')), 'OneWorldz link missing');
assert.ok(pages.some(html => html.includes('https://impactbased.oneworldz.com')), 'ImpactBased link missing');

assert.match(chest, /THE ONEWORLDZ HOPE CHEST/i, 'Hope Chest identity missing');
assert.match(chest, /pdc-hope-chest\.png/, 'Approved Hope Chest raster is not used');
assert.match(chest, /data-approved-art="pdc-hope-chest"/, 'Hope Chest approved-art marker missing');
assert.match(chest, /glass-dock/, 'Hope Chest glass button dock missing');
assert.match(chest, /not presented as active launches/i, 'Legacy archive disclaimer missing');
assert.match(chest, /Watch the chest\. Watch the Worldz\./i, 'Hope Chest legacy clue missing');

const tokens = [
  ['Original PDC','F82HFwxDLKFAbQWq7BmniWWxMgUerQsVu8jS357epump'],
  ['First PDC1','PDC1K9aG6vAg5jFYkLin2tdTgwqZypsdvVHhHN2WnWw'],
  ['PDC1-2','PDC1NgvtvLZwnopTfQdzXT5iAqBeGyLdFXEcqnvsR52'],
  ['PDCMAGA','7mwWRQeNpwWrnNhRpC48k7xQCdjCXDWfLLuYsphupump'],
  ['PDCShares','PDCLsBaTM3MxCzTWNoRvQejZ4kkhAWZiSc3ipCsoFuE'],
  ['PurpleDC','9Jd67VEgqWA2K5mck7yiYGxfLrQnmrTnXXzDYE3b7MLf'],
  ['OG Purple','DyZP9zn6vRu8J8XCQLNCREgCc12YN4JndnrmE5Upump'],
  ['PCC1 legacy','DcekG6rLbQ3K5LtZfSMLgecfqnFAZgJUSpoY7tBgmuGv'],
  ['INVEST','VeSt6vaWE5JsT36sVCzL21daiY7nNNs73TJcJMHgnjC'],
  ['Limited Edition','Lmtdfb2b392STncVxf2rD6csY4w1rxuHEMizv7vXVtY']
];
for (const [name,ca] of tokens) assert.ok(chest.includes(ca), `Verified contract missing for ${name}`);
assert.equal((chest.match(/class="token-card"/g)||[]).length,10,'Hope Chest must contain exactly 10 real PDC legacy token cards');
for (const wrong of ['Devy','Tony','Dream','Guru','Oakwyn','Baby Emu']) assert.ok(!chest.includes(`>${wrong}<`), `Unrelated legacy token still present: ${wrong}`);
assert.ok(chest.includes('H86DeZxeSNMpVrzctTybsmU8xUegfJScsExtbjXfRYyp'), 'LMTD 2036 Dev Streamflow lock missing');
assert.ok(chest.includes('G3kNk8F6TX4f6VpRAH6BdqPwAANbZh2fa8apAGguf1td'), 'LMTD Community Streamflow lock missing');

for (const media of ['pdc-mission-board.png','pdc-hope-chest.png','pdc-crest.png']) {
  assert.ok(exists('assets','media',media), `Approved PDC media missing: ${media}`);
  assert.ok(fs.statSync(path.join(site,'assets','media',media)).size > 50000, `Approved PDC media is unexpectedly small: ${media}`);
}
assert.match(css,/backdrop-filter:blur\(18px\)/,'Glass treatment missing');
assert.match(css,/filter:none!important/,'Approved raster anti-blur rule missing');
assert.match(htaccess,/Content-Security-Policy/,'CSP missing');
assert.ok(!js.includes('supabase.co'),'PDC visuals must not depend on Supabase');
console.log('PurpleDiamondCrew production gate passed: approved PNG artwork, current fundraiser, seven site pages, 10 real PDC legacy records and LMTD Streamflow locks verified.');
