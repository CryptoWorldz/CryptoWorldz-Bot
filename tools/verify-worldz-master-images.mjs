import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'apps/cryptoworldz-web-core/assets/worldz-master/oneworldz/oneworldz-gpt.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/oneworldz/oneworldz-master.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/oneworldz/little-legend.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/oneworldz/reagan-kauja.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/oneworldz/hope-chest.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/cryptoworldz/command-centre-five.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/cryptoworldz/command-centre-leader-team.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/cryptoworldz/zed-command-centre.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/cryptoworldz/zed-auto.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/cryptoworldz/grace.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/cryptoworldz/impactbased.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/cryptoworldz/cryptoworldz-basedbid.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/cryptoworldz/we-need-you.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/blockchains/bitworldz.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/blockchains/solworldz.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/blockchains/ethworldz.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/blockchains/baseworldz.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/blockchains/bnbworldz.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/blockchains/xrpworldz.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/blockchains/suiworldz.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/blockchains/hyperworldz.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/blockchains/robinworldz.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/tokens/recover-your-debt.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/tokens/uganda-unite.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/tokens/robin-hood-law.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/tokens/global-impact-alliance.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/tokens/next-big-coin.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/tokens/solmars.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/tokens/solbud.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/tokens/soltoken.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/purple-diamond-crew/action-team.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/purple-diamond-crew/banner.png',
  'apps/cryptoworldz-web-core/assets/worldz-master/purple-diamond-crew/hope-chest.png'
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

if (failed) process.exit(1);
console.log(`MASTER IMAGE GATE PASSED: ${required.length} approved production assets present and byte-checked.`);
