import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'apps', 'worldz-sites', 'solworldz');
const out = path.join(root, 'dist', 'solworldz');
const archive = path.join(root, 'media', 'approved-worldz', 'worldz-master-images-approved-v2.zip');
const expectedArchiveSha = 'eacf0f88f7034b2e0f0c6e638f1209770a7fa48865ac424eed77dd426f23f152';

const masterAssets = [
  ['blockchains/solworldz.png','assets/master/blockchains/solworldz.jpg',1200,500],
  ['blockchains/ethworldz.png','assets/master/blockchains/ethworldz.jpg',1200,500],
  ['blockchains/baseworldz.png','assets/master/blockchains/baseworldz.jpg',1200,500],
  ['blockchains/bnbworldz.png','assets/master/blockchains/bnbworldz.jpg',1200,500],
  ['blockchains/xrpworldz.png','assets/master/blockchains/xrpworldz.jpg',1200,500],
  ['blockchains/hyperworldz.png','assets/master/blockchains/hyperworldz.jpg',1200,500],
  ['blockchains/robinworldz.png','assets/master/blockchains/robinworldz.jpg',1200,500],
  ['blockchains/suiworldz.png','assets/master/blockchains/suiworldz.jpg',1200,500],
  ['blockchains/bitworldz.png','assets/master/blockchains/bitworldz.jpg',1200,500],
  ['oneworldz/oneworldz-master.png','assets/master/oneworldz/oneworldz-master.jpg',1200,900],
  ['cryptoworldz/command-centre-five.png','assets/master/cryptoworldz/command-centre-five.jpg',1200,800],
  ['cryptoworldz/impactbased.png','assets/master/cryptoworldz/impactbased.jpg',1200,1200],
  ['purple-diamond-crew/banner.png','assets/master/purple-diamond-crew/banner.jpg',1200,450],
  ['humanitarian/action-creates-smiles-banner.png','assets/master/humanitarian/action-creates-smiles-banner.jpg',1200,550],
  ['tokens/solmars.png','assets/master/tokens/solmars.jpg',1200,1200],
  ['tokens/solbud.png','assets/master/tokens/solbud.jpg',1200,1200],
  ['tokens/global-impact-alliance.png','assets/master/tokens/global-impact-alliance.jpg',1200,1200],
  ['tokens/uganda-unite.png','assets/master/tokens/uganda-unite.jpg',1200,1200],
  ['tokens/next-big-coin.png','assets/master/tokens/next-big-coin.jpg',1200,1200],
  ['tokens/soltoken.png','assets/master/tokens/soltoken.jpg',1200,1200]
];

const sha256Buffer = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const sha256File = file => sha256Buffer(fs.readFileSync(file));

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error('Not JPEG data');
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset++; continue; }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  throw new Error('JPEG dimensions not found');
}

function extract(entry) {
  const result = spawnSync('unzip', ['-p', archive, entry], { encoding: null, maxBuffer: 25 * 1024 * 1024 });
  if (result.status !== 0 || !result.stdout?.length) throw new Error(`Unable to extract approved master asset: ${entry}`);
  return result.stdout;
}

if (!fs.existsSync(archive)) throw new Error('Approved Worldz master archive is missing');
const archiveSha = sha256File(archive);
if (archiveSha !== expectedArchiveSha) throw new Error(`Approved master archive checksum mismatch: ${archiveSha}`);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const manifest = {
  release: 'SolWorldz approved-master production candidate',
  domain: 'solworldz.xyz',
  masterArchive: 'media/approved-worldz/worldz-master-images-approved-v2.zip',
  masterArchiveSha256: archiveSha,
  legacyDomainPolicy: 'retired legacy domain references are forbidden from public release output',
  generatedAt: new Date().toISOString(),
  files: []
};

for (const relative of ['index.html', '.htaccess']) {
  const source = path.join(site, relative);
  const destination = path.join(out, relative);
  if (!fs.existsSync(source)) throw new Error(`Missing SolWorldz source: ${source}`);
  fs.copyFileSync(source, destination);
  manifest.files.push({ path: relative, bytes: fs.statSync(destination).size, sha256: sha256File(destination), source: path.relative(root, source).replaceAll('\\','/') });
}

for (const [entry, relative, minWidth, minHeight] of masterAssets) {
  const buffer = extract(entry);
  if (buffer.length < 250000) throw new Error(`Approved master asset unexpectedly small: ${entry} (${buffer.length} bytes)`);
  const { width, height } = jpegDimensions(buffer);
  if (width < minWidth || height < minHeight) throw new Error(`Approved master asset below release dimensions: ${entry} is ${width}x${height}`);
  const destination = path.join(out, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, buffer);
  manifest.files.push({ path: relative, bytes: buffer.length, width, height, sha256: sha256Buffer(buffer), source: `approved-master-archive:${entry}` });
}

for (const relative of ['index.html', '.htaccess']) {
  const text = fs.readFileSync(path.join(out, relative), 'utf8');
  if (/solworld\.fun/i.test(text)) throw new Error(`Retired legacy-domain reference found in release ${relative}`);
}

fs.writeFileSync(path.join(out, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`SolWorldz approved-master release assembled at ${path.relative(root, out)}`);
console.log(`Master archive SHA-256: ${archiveSha}`);
for (const file of manifest.files) console.log(`${file.sha256}  ${file.path}${file.width ? `  ${file.width}x${file.height}` : ''}`);
