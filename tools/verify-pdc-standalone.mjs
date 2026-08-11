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
assert.match(chest, /not promises of liquidity/i, 'Legacy archive disclaimer missing');
assert.match(chest, /Watch the chest\. Watch the Worldz\./i, 'Hidden revival clue missing');
assert.match(chest, /data-hope-chest-master="pdc-hope-chest"/, 'Verified Hope Chest master hook missing');
assert.match(js, /slug=eq\.pdc-hope-chest/, 'Verified Hope Chest registry lookup missing');
assert.match(js, /asset\.data_uri\.length < 10000/, 'Hope Chest integrity gate missing');

const tokens = [
  ['Purple Diamond Crew', 'F82HFwxDLKFAbQWq7BmniWWxMgUerQsVu8jS357epump'],
  ['The Purple Diamond Crew', 'PDC1K9aG6vAg5jFYkLin2tdTgwqZypsdvVHhHN2WnWw'],
  ['PDC1-2', 'PDC1NgvtvLZwnopTfQdzXT5iAqBeGyLdFXEcqnvsR52'],
  ['MAGA Edition', '7mwWRQeNpwWrnNhRpC48k7xQCdjCXDWfLLuYsphupump'],
  ['PurpleDiamondCrewShares', 'PDCLsBaTM3MxCzTWNoRvQejZ4kkhAWZiSc3ipCsoFuE'],
  ['PurpleDC', '9Jd67VEgqWA2K5mck7yiYGxfLrQnmrTnXXzDYE3b7MLf'],
  ['OG Purple Diamond', 'DyZP9zn6vRu8J8XCQLNCREgCc12YN4JndnrmE5Upump'],
  ['PCC1 / PDC1 Legacy', 'DcekG6rLbQ3K5LtZfSMLgecfqnFAZgJUSpoY7tBgmuGv'],
  ['INVEST', 'VeSt6vaWE5JsT36sVCzL21daiY7nNNs73TJcJMHgnjC'],
  ['Limited Edition', 'Lmtdfb2b392STncVxf2rD6csY4w1rxuHEMizv7vXVtY']
];
for (const [name, ca] of tokens) {
  assert.ok(chest.includes(name), `PDC legacy token missing: ${name}`);
  assert.ok(chest.includes(ca), `PDC contract missing: ${name}`);
}
assert.equal((chest.match(/class="token-card"/g) || []).length, 10, 'Hope Chest must contain exactly 10 PDC legacy token cards');
assert.ok((chest.match(/<svg\b/g) || []).length >= 11, 'Hope Chest needs vector art for chest + all tokens');

const wrongLegacy = ['Devy', 'Tony', 'Dream', 'Guru', '>Mum<', '>PJ<', 'Oakwyn', '>Reagan<', 'Thirteen', 'Baby Emu'];
for (const wrong of wrongLegacy) {
  assert.ok(!chest.includes(wrong), `Unrelated legacy token leaked into PDC Hope Chest: ${wrong}`);
}

assert.ok(chest.includes('H86DeZxeSNMpVrzctTybsmU8xUegfJScsExtbjXfRYyp'), 'LMTD 2036 Dev Streamflow lock missing');
assert.ok(chest.includes('G3kNk8F6TX4f6VpRAH6BdqPwAANbZh2fa8apAGguf1td'), 'LMTD Community & Charity Streamflow lock missing');
assert.match(chest, /950,000 remained locked/i, 'LMTD Community lock reviewed balance missing');
assert.match(chest, /February 2036/i, 'LMTD 2036 Dev unlock record missing');

assert.match(js, /data-mobile-collapse/, 'Mobile Hope Chest collapse behavior missing');
assert.match(css, /grid-template-columns:repeat\(5,1fr\)/, 'Desktop Hope Chest must be two rows of five');
assert.match(css, /@media\(max-width:620px\)/, 'Phone layout breakpoint missing');

assert.match(htaccess, /Cache-Control "no-store, no-cache/, 'HTML no-cache rule missing');
assert.match(htaccess, /Content-Security-Policy/, 'CSP missing');
assert.match(htaccess, /hknymhhyqldtzmplzuzh\.supabase\.co/, 'Hope Chest Supabase CSP permission missing');
assert.ok(!pages.some((html) => /<img(?![^>]*data-optional-logo)/i.test(html)), 'A required image depends on an external raster URL');

console.log('PurpleDiamondCrew standalone production gate passed: 3 pages, 10 canonical PDC legacy records, no unrelated legacy tokens, LMTD Streamflow locks recorded, built-in vector fallbacks.');
