import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const site=path.join(root,'apps','worldz-sites','solworldz');
const html=fs.readFileSync(path.join(site,'index.html'),'utf8');
const htaccess=fs.readFileSync(path.join(site,'.htaccess'),'utf8');
const media=name=>path.join(site,'assets','media',name);

assert.match(html,/<meta name="viewport"/i,'Mobile viewport is missing');
assert.match(html,/@media\(max-width:560px\)/,'Phone layout breakpoint is missing');
assert.match(html,/id="pipeline"/,'Pipeline section is missing');
assert.match(html,/id="impact"/,'Impact section is missing');
assert.match(html,/id="network"/,'Network section is missing');
assert.match(html,/data-approved-art="solworldz-hero"/,'Approved SolWorldz hero marker missing');
assert.match(html,/solworldz-hero-desktop\.webp/,'Desktop approved hero missing');
assert.match(html,/solworldz-hero-mobile\.webp/,'Mobile approved hero missing');
assert.match(html,/solworldz-approved-atlas\.webp/,'Approved SolWorldz atlas missing');
assert.match(html,/FLAGSHIP OPEN PIPELINE/,'Pipeline structure missing');
assert.match(html,/IMPACTBASED/i,'ImpactBased link missing');
assert.match(html,/ACTION CREATES SMILES/i,'Humanitarian link missing');
assert.match(html,/COMMAND CENTRE/i,'Command Centre reference missing');
assert.match(html,/Trade Station/i,'Trade Station link missing');
for(const symbol of ['$SMILES','$SolMars','$SolBud','$GIA','$W','$NBC','$SolToken']) assert.ok(html.includes(symbol),`Missing Solana pipeline record: ${symbol}`);
assert.ok(!html.includes('<h3>$RHL</h3>'),'RecoverYourDebt / RHL must not be presented as a Solana pipeline token');
assert.match(html,/RecoverYourDebt belongs to Robin Hood Chain \/ RobinWorldz/i,'Robin Hood Chain classification missing');
for(const name of ['solworldz-hero-desktop.webp','solworldz-hero-mobile.webp','solworldz-approved-atlas.webp']){assert.ok(fs.existsSync(media(name)),`Approved media missing: ${name}`);assert.ok(fs.statSync(media(name)).size>50000,`Approved media unexpectedly small: ${name}`)}
assert.match(html,/filter:none!important/,'Anti-blur image rule missing');
assert.ok(!/assets\/site-router\.js/i.test(html),'Standalone SolWorldz must not use shared hostname router');
assert.ok(!/Loading the Worldz experience/i.test(html),'Shared loading shell leaked into standalone site');
assert.match(htaccess,/Content-Security-Policy/,'Security policy is missing');
console.log('SolWorldz production gate passed: approved desktop/mobile hero, approved atlas, current pipeline and Robin Hood Chain classification verified.');
