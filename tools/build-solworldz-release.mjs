import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'apps', 'worldz-sites', 'solworldz');
const mediaRoot = path.join(root, 'apps', 'cryptoworldz-web-core', 'assets', 'images', 'website-core');
const out = path.join(root, 'dist', 'solworldz');

const files = [
  ['index.html', path.join(site, 'index.html')],
  ['.htaccess', path.join(site, '.htaccess')],
  ['PRODUCTION_MEDIA_CONTRACT.md', path.join(site, 'PRODUCTION_MEDIA_CONTRACT.md')],
  ['assets/images/website-core/solworldz/solworldz-desktop-hero.webp', path.join(mediaRoot, 'solworldz', 'solworldz-desktop-hero.webp')],
  ['assets/images/website-core/solworldz/solworldz-mobile-hero.webp', path.join(mediaRoot, 'solworldz', 'solworldz-mobile-hero.webp')],
  ['assets/images/website-core/blockchain/blockchain-worldz-multichain-directory.webp', path.join(mediaRoot, 'blockchain', 'blockchain-worldz-multichain-directory.webp')]
];

const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const manifest = {
  release: 'SolWorldz production candidate',
  domain: 'solworldz.xyz',
  legacyDomainPolicy: 'SolWorld.fun is retired and forbidden from release output',
  generatedAt: new Date().toISOString(),
  files: []
};

for (const [relative, source] of files) {
  if (!fs.existsSync(source)) throw new Error(`Missing release source: ${path.relative(root, source)}`);
  const destination = path.join(out, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  manifest.files.push({
    path: relative,
    bytes: fs.statSync(destination).size,
    sha256: sha256(destination),
    source: path.relative(root, source).replaceAll('\\', '/')
  });
}

for (const relative of ['index.html', '.htaccess']) {
  const text = fs.readFileSync(path.join(out, relative), 'utf8');
  if (/solworld\.fun/i.test(text)) throw new Error(`Retired SolWorld.fun reference found in release ${relative}`);
}

fs.writeFileSync(path.join(out, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`SolWorldz release assembled at ${path.relative(root, out)}`);
for (const file of manifest.files) console.log(`${file.sha256}  ${file.path}`);
