import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'apps', 'worldz-sites', 'solworldz');
const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
const htaccess = fs.readFileSync(path.join(site, '.htaccess'), 'utf8');

assert.match(html, /<meta name="viewport"/i, 'Mobile viewport is missing');
assert.match(html, /@media\(max-width:560px\)/, 'Phone layout breakpoint is missing');
assert.match(html, /id="pipeline"/, 'Pipeline section is missing');
assert.match(html, /id="impact"/, 'Impact section is missing');
assert.match(html, /id="network"/, 'Network section is missing');
assert.match(html, /SOLWORLDZ/, 'SolWorldz hero is missing');
assert.match(html, /SOLANA ECOSYSTEM/, 'Solana ecosystem artwork is missing');
assert.match(html, /FLAGSHIP OPEN PIPELINE/, 'Flagship pipeline artwork is missing');
assert.match(html, /IMPACTBASED/, 'ImpactBased artwork is missing');
assert.match(html, /ACTION CREATES SMILES/, 'Humanitarian artwork is missing');
assert.match(html, />ZED</, 'Zed artwork is missing');
assert.match(html, /COMMAND CENTRE/, 'Command Centre artwork is missing');

for (const symbol of ['$SMILES', '$SolMars', '$SolBud', '$GIA', '$W', '$NBC', '$RHL']) {
  assert.ok(html.includes(symbol), `Missing token pipeline visual: ${symbol}`);
}

const svgCount = (html.match(/<svg\b/g) || []).length;
assert.ok(svgCount >= 11, `Expected at least 11 inline production visuals, found ${svgCount}`);
assert.ok(!/<img\b/i.test(html), 'Standalone SolWorldz must not depend on raster image URLs');
assert.ok(!/solworldz-(desktop|mobile)-hero\.webp/i.test(html), 'Legacy compressed SolWorldz hero is referenced');
assert.ok(!/assets\/site-router\.js/i.test(html), 'Standalone SolWorldz must not use the shared hostname router');
assert.ok(!/Loading the Worldz experience/i.test(html), 'Shared loading shell leaked into standalone site');
assert.match(htaccess, /Cache-Control "no-store, no-cache/, 'HTML no-cache rule is missing');
assert.match(htaccess, /Content-Security-Policy/, 'Security policy is missing');

console.log(`SolWorldz standalone production gate passed: ${svgCount} inline visuals, 7 token visuals, zero external image dependencies.`);
