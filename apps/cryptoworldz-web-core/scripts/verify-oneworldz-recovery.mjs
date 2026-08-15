import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rendererPath = path.join(root, 'assets', 'oneworldz-next.js');
const htmlPath = path.join(root, 'oneworldz-index.html');
const failures = [];

const requiredAssets = [
  ['desktop','oneworldz-hero.webp'],
  ['mobile','oneworldz-hero.webp'],
  ['desktop','hope-chest.webp'],
  ['mobile','hope-chest.webp']
];
for (const [viewport,name] of requiredAssets) {
  const file = path.join(root,'assets','images','oneworldz-pass110',viewport,name);
  try { await access(file); } catch { failures.push(`Missing ${viewport} production image: ${name}`); }
}

const renderer = await readFile(rendererPath,'utf8');
const html = await readFile(htmlPath,'utf8');

const required = [
  ['identity','ONEWORLDZ 🌏 ONE VISION'],
  ['mission','Helping the People Who Help People'],
  ['Learn section','id="learn"'],
  ['Law section','id="law"'],
  ['ImpactBased section','id="impact"'],
  ['FoodWorldz','https://foodworldz.com'],
  ['DonateWorldz','https://donateworldz.com'],
  ['CryptoWorldz','https://cryptoworldz.xyz'],
  ['Purple Diamond Crew','https://purplediamondcrew.com'],
  ['Command Centre','https://cryptobotz.cryptoworldz.xyz'],
  ['research loop','Research → Compare → Verify → Recommend → Implement → Measure → Improve Again'],
  ['fresh asset path','assets/images/oneworldz-pass110']
];
for (const [label,value] of required) if (!renderer.includes(value)) failures.push(`Missing required ${label}: ${value}`);

const forbidden = [
  'assets/images/oneworldz-recovery',
  'oneworldz-one-vision-one-future.webp',
  'hope-chest-by-firelight.webp',
  'gofundme.com',
  'oneworldz-recovery.css'
];
for (const value of forbidden) {
  if (renderer.toLowerCase().includes(value.toLowerCase()) || html.toLowerCase().includes(value.toLowerCase())) {
    failures.push(`Forbidden stale OneWorldz value present: ${value}`);
  }
}

if (!html.includes('20260815-pass110')) failures.push('Fresh cache-busting shell version missing');
if (!html.includes('./assets/oneworldz.css')) failures.push('Proven OneWorldz stylesheet not wired');

const heroRefs = (renderer.match(/oneworldz-hero\.webp/g) || []).length;
const chestRefs = (renderer.match(/hope-chest\.webp/g) || []).length;
if (heroRefs !== 2) failures.push(`Hero must have exactly desktop/mobile references; found ${heroRefs}`);
if (chestRefs !== 2) failures.push(`Hope Chest must have exactly desktop/mobile references; found ${chestRefs}`);

if (failures.length) {
  console.error('ONEWORLDZ SOURCE GATE: BLOCKED');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log('ONEWORLDZ SOURCE GATE: PASS');
console.log('Proven layout restored; 2 semantic image positions with independent desktop/mobile fitment are ready.');
