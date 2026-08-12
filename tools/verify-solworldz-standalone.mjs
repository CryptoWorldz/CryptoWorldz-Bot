import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'apps', 'worldz-sites', 'solworldz');
const archive = path.join(root, 'media', 'approved-worldz', 'worldz-master-images-approved-v2.zip');
const expectedArchiveSha = 'eacf0f88f7034b2e0f0c6e638f1209770a7fa48865ac424eed77dd426f23f152';
const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
const htaccess = fs.readFileSync(path.join(site, '.htaccess'), 'utf8');

assert.match(html, /<meta name="viewport"/i, 'Mobile viewport is missing');
assert.match(html, /@media\(max-width:560px\)/, 'Phone layout breakpoint is missing');
assert.match(html, /id="pipeline"/, 'Pipeline section is missing');
assert.match(html, /id="impact"/, 'Impact section is missing');
assert.match(html, /id="network"/, 'Network section is missing');
assert.match(html, /CLICKABLE WORLDZ NETWORK/, 'Clickable Worldz network is missing');
assert.match(html, /data-approved-art="approved-master-archive"/, 'Approved master archive hero marker missing');
assert.match(html, /\/assets\/master\/blockchains\/solworldz\.jpg/, 'Approved SolWorldz master hero missing');
assert.match(html, /\/assets\/master\/tokens\/solmars\.jpg/, 'SolMars master art missing');
assert.match(html, /\/assets\/master\/tokens\/solbud\.jpg/, 'SolBud master art missing');
assert.match(html, /\/assets\/master\/tokens\/global-impact-alliance\.jpg/, 'GIA master art missing');
assert.match(html, /\/assets\/master\/tokens\/uganda-unite\.jpg/, 'Uganda Unite master art missing');
assert.match(html, /\/assets\/master\/tokens\/next-big-coin\.jpg/, 'NBC master art missing');
assert.match(html, /\/assets\/master\/tokens\/soltoken\.jpg/, 'SolToken master art missing');
assert.match(html, /\/assets\/master\/humanitarian\/action-creates-smiles-banner\.jpg/, 'Action Creates Smiles master art missing');
assert.match(html, /FLAGSHIP OPEN PIPELINE/, 'Pipeline structure missing');
assert.match(html, /IMPACTBASED/i, 'ImpactBased presence missing');
assert.match(html, /ACTION CREATES SMILES/i, 'Humanitarian link missing');
assert.match(html, /COMMAND CENTRE/i, 'Command Centre reference missing');
assert.match(html, /Trade Station/i, 'Trade Station link missing');
assert.ok(html.includes('https://oneworldz.com/gofundme/'), 'OneWorldz GoFundMe hub link missing');

for (const symbol of ['$SMILES', '$SolMars', '$SolBud', '$GIA', '$W', '$NBC', '$SolToken']) assert.ok(html.includes(symbol), `Missing Solana pipeline record: ${symbol}`);
assert.ok(!html.includes('<h3>$RHL</h3>'), 'RecoverYourDebt / RHL must not be presented as a Solana pipeline token');
assert.match(html, /RecoverYourDebt belongs to Robin Hood Chain \/ RobinWorldz/i, 'Robin Hood Chain classification missing');
assert.match(html, /filter:none!important/, 'Anti-blur image rule missing');
assert.ok(!/assets\/site-router\.js/i.test(html), 'Standalone SolWorldz must not use shared hostname router');
assert.ok(!/Loading the Worldz experience/i.test(html), 'Shared loading shell leaked into standalone site');
assert.ok(!/assets\/images\/website-core/i.test(html), 'Legacy low-resolution website-core image paths must not be used');
assert.match(htaccess, /Content-Security-Policy/, 'Security policy is missing');

for (const [name, text] of [['index.html', html], ['.htaccess', htaccess]]) assert.ok(!/solworld\.fun/i.test(text), `${name} contains retired SolWorld.fun reference`);

const liveWorldz = ['https://oneworldz.com','https://cryptoworldz.xyz','https://solworldz.xyz','https://ethworldz.xyz','https://baseworldz.xyz','https://bnbworldz.xyz','https://xrpworldz.xyz','https://hyperworldz.xyz','https://robinworldz.xyz','https://www.based.bid/b/ImpactBased','https://purplediamondcrew.com'];
for (const url of liveWorldz) assert.ok(html.includes(url), `Clickable Worldz destination missing: ${url}`);
for (const name of ['SuiWorldz','BitcoinWorldz','LearnWorldz']) assert.match(html, new RegExp(`<strong>${name}<\\/strong><small>COMING SOON<\\/small>`), `${name} must remain visibly marked Coming Soon until its live target passes`);
for (const blockedUntilLive of ['href="https://suiworldz.com"','href="https://bitcoinworldz.com"','href="https://impactbased.oneworldz.com"','href="https://learn.oneworldz.com"']) assert.ok(!html.includes(blockedUntilLive), `Unreachable Worldz destination must not be published as a clickable link: ${blockedUntilLive}`);

assert.ok(fs.existsSync(archive), 'Approved Worldz master archive is missing');
const archiveSha = crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
assert.equal(archiveSha, expectedArchiveSha, 'Approved Worldz master archive checksum changed');
const list = spawnSync('unzip', ['-Z1', archive], { encoding: 'utf8' });
assert.equal(list.status, 0, 'Approved Worldz master archive cannot be listed');
for (const entry of ['blockchains/solworldz.png','blockchains/ethworldz.png','blockchains/baseworldz.png','blockchains/bnbworldz.png','blockchains/xrpworldz.png','blockchains/hyperworldz.png','blockchains/robinworldz.png','blockchains/suiworldz.png','blockchains/bitworldz.png','oneworldz/oneworldz-master.png','cryptoworldz/command-centre-five.png','cryptoworldz/impactbased.png','purple-diamond-crew/banner.png','humanitarian/action-creates-smiles-banner.png','tokens/solmars.png','tokens/solbud.png','tokens/global-impact-alliance.png','tokens/uganda-unite.png','tokens/next-big-coin.png','tokens/soltoken.png']) assert.ok(list.stdout.split(/\r?\n/).includes(entry), `Approved archive entry missing: ${entry}`);

const masterRefs = [...html.matchAll(/src="\/assets\/master\//g)].length;
assert.ok(masterRefs >= 20, `Expected at least 20 approved master image references, found ${masterRefs}`);
console.log(`SolWorldz production gate passed: retired domain blocked, approved archive ${archiveSha.slice(0,12)}… locked, ${masterRefs} master images referenced, live Worldz clickable and pending Worldz safe.`);
