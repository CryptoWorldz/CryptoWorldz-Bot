import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'apps/worldz-master-library/oneworldz/oneworldz-gpt.webp',
  'apps/worldz-master-library/oneworldz/oneworldz-master.webp',
  'apps/worldz-master-library/oneworldz/little-legend.webp',
  'apps/worldz-master-library/oneworldz/reagan-kauja.webp',
  'apps/worldz-master-library/oneworldz/hope-chest.webp',
  'apps/worldz-master-library/cryptoworldz/command-centre-five.webp',
  'apps/worldz-master-library/cryptoworldz/command-centre-leader-team.webp',
  'apps/worldz-master-library/cryptoworldz/zed-command-centre.webp',
  'apps/worldz-master-library/cryptoworldz/zed-auto.webp',
  'apps/worldz-master-library/cryptoworldz/grace.webp',
  'apps/worldz-master-library/cryptoworldz/impactbased.webp',
  'apps/worldz-master-library/cryptoworldz/cryptoworldz-basedbid.webp',
  'apps/worldz-master-library/cryptoworldz/we-need-you.webp',
  'apps/worldz-master-library/blockchains/bitworldz.webp',
  'apps/worldz-master-library/blockchains/solworldz.webp',
  'apps/worldz-master-library/blockchains/ethworldz.webp',
  'apps/worldz-master-library/blockchains/baseworldz.webp',
  'apps/worldz-master-library/blockchains/bnbworldz.webp',
  'apps/worldz-master-library/blockchains/xrpworldz.webp',
  'apps/worldz-master-library/blockchains/suiworldz.webp',
  'apps/worldz-master-library/blockchains/hyperworldz.webp',
  'apps/worldz-master-library/blockchains/robinworldz.webp',
  'apps/worldz-master-library/tokens/recover-your-debt.webp',
  'apps/worldz-master-library/tokens/uganda-unite.webp',
  'apps/worldz-master-library/tokens/robin-hood-law.webp',
  'apps/worldz-master-library/tokens/global-impact-alliance.webp',
  'apps/worldz-master-library/tokens/next-big-coin.webp',
  'apps/worldz-master-library/tokens/solmars.webp',
  'apps/worldz-master-library/tokens/solbud.webp',
  'apps/worldz-master-library/tokens/soltoken.webp',
];

let failed = false;
for (const rel of required) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.error(`MISSING MASTER IMAGE: ${rel}`);
    failed = true;
    continue;
  }
  const size = fs.statSync(file).size;
  if (size < 100_000) {
    console.error(`MASTER IMAGE TOO SMALL (${size} bytes): ${rel}`);
    failed = true;
  }
}

const textExt = new Set(['.html','.js','.mjs','.css','.json','.md','.yml','.yaml']);
const forbidden = [/crypto\s*universe/ig, /cryptouniverse/ig];
const excludedRoots = new Set(['.git','node_modules']);
function walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    if (excludedRoots.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (textExt.has(path.extname(entry.name))) {
      const text = fs.readFileSync(p, 'utf8');
      for (const rx of forbidden) {
        if (rx.test(text)) {
          console.error(`FORBIDDEN LEGACY BRANDING in ${path.relative(root,p)}: ${rx}`);
          failed = true;
        }
        rx.lastIndex = 0;
      }
    }
  }
}
walk(path.join(root, 'apps'));

if (failed) process.exit(1);
console.log(`MASTER IMAGE GATE PASSED: ${required.length} approved assets present and legacy branding scan clean.`);
