import { readFileSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const mini = read('public/miniapp/index.html');
const publicProfile = read('cryptoworldz.xyz/dipshit/index.html');
const centre = read('cryptoworldz.xyz/command-centre-max/index.html');
const runtime = read('src/command-centre.js');
const treasuries = JSON.parse(read('launchpad.cryptoworldz.xyz/worldz-app/core/treasury-profiles.json'));

assert.match(mini, /id="dipshit"/);
assert.match(mini, /data-screen="dipshit"/);
assert.match(mini, /<link rel="stylesheet" href="\/miniapp\/max\.css/);
assert.match(mini, /<script src="\/miniapp\/max\.js/);
assert.doesNotMatch(mini, /\\n\s*<(?:link|script|section)/);
assert.match(runtime, /\/dipshit/);
assert.match(publicProfile, /\/dipshit\/avatar\.png/);
assert.match(centre, /\/dipshit\//);
assert.deepEqual(treasuries.profiles.map((profile) => profile.governance.display), ['4-of-10', '5-of-10', '6-of-9']);

for (const file of ['public/miniapp/dipshit-worldz-dude.png', 'cryptoworldz.xyz/dipshit/avatar.png']) {
  assert.ok(statSync(new URL(`../${file}`, import.meta.url)).size > 1000, `${file} is missing`);
}

console.log('Worldz Command Centre deployment structure: PASS');
