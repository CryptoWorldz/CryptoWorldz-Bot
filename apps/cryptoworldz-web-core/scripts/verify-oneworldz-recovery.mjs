import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rendererPath = path.join(root, 'assets', 'oneworldz-next.js');
const htmlPath = path.join(root, 'oneworldz-index.html');
const cssPath = path.join(root, 'assets', 'oneworldz-recovery.css');

const names = [
  '01-global-gateway.webp',
  '02-little-legend-future.webp',
  '03-humanitarian-action.webp',
  '04-people-planet-tech-leadership.webp',
  '05-learn.webp',
  '06-law.webp',
  '07-impactbased.webp',
  '08-hope-chest.webp',
  '09-worldz-ecosystem.webp',
  '10-stand-as-one-2030.webp'
];

const failures = [];
for (const viewport of ['desktop', 'mobile']) {
  for (const name of names) {
    const file = path.join(root, 'assets', 'images', 'oneworldz-recovery', viewport, name);
    try { await access(file); } catch { failures.push(`Missing ${viewport} production image: ${name}`); }
  }
}

const renderer = await readFile(rendererPath, 'utf8');
const html = await readFile(htmlPath, 'utf8');
const css = await readFile(cssPath, 'utf8');

const required = [
  ['OneWorldz identity', 'ONEWORLDZ 🌏 ONE VISION'],
  ['mission', 'Helping the People Who Help People'],
  ['Learn', 'https://learn.oneworldz.com'],
  ['Law', 'https://law.oneworldz.com'],
  ['ImpactBased', 'https://impactbased.oneworldz.com'],
  ['FoodWorldz', 'https://foodworldz.com'],
  ['DonateWorldz', 'https://donateworldz.com'],
  ['CryptoWorldz', 'https://cryptoworldz.xyz'],
  ['PDC', 'https://purplediamondcrew.com'],
  ['Command Centre', 'https://cryptobotz.cryptoworldz.xyz'],
  ['Stand As One', 'Stand As One.'],
  ['research loop', 'Research → Compare → Verify → Recommend → Implement → Measure Results → Improve Again']
];
for (const [label, value] of required) if (!renderer.includes(value)) failures.push(`Missing required ${label}: ${value}`);

const forbidden = [
  'oneworldz-one-vision-one-future.webp',
  'hope-chest-by-firelight.webp',
  'gofundme.com',
  'goFundMe',
  'APPROVE TOTAL DEPLOYMENT'
];
for (const value of forbidden) if (renderer.toLowerCase().includes(value.toLowerCase())) failures.push(`Forbidden recovery renderer value present: ${value}`);

if (!html.includes('oneworldz-recovery.css')) failures.push('Recovery stylesheet is not wired into OneWorldz HTML');
if (!css.includes('@media(max-width:780px)')) failures.push('Mobile-specific recovery CSS is missing');
if (!css.includes('prefers-reduced-motion')) failures.push('Reduced-motion recovery rule is missing');

if (failures.length) {
  console.error('ONEWORLDZ RECOVERY GATE: BLOCKED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('ONEWORLDZ RECOVERY GATE: PASS');
console.log('20/20 purpose-built production images present and renderer contract satisfied.');
