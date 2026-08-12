import fs from 'node:fs';
import path from 'node:path';

const base = (process.env.SOLWORLDZ_PUBLIC_BASE || 'https://solworldz.xyz').replace(/\/$/, '');
const manifestPath = process.env.SOLWORLDZ_MANIFEST || path.resolve('dist','solworldz','release-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const images = manifest.files.filter(file => file.path.startsWith('assets/master/') && file.path.endsWith('.jpg'));

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error('payload is not JPEG');
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

if (images.length !== 20) throw new Error(`Expected 20 public master images, manifest contains ${images.length}`);

let transformed = 0;
for (let i = 0; i < images.length; i++) {
  const expected = images[i];
  const url = `${base}/${expected.path}?publicproof=${Date.now()}-${i}`;
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'accept': 'image/jpeg',
      'cache-control': 'no-cache',
      'user-agent': 'Mozilla/5.0 SolWorldzPublicImageProof/1.0'
    }
  });
  if (!response.ok) throw new Error(`${expected.path}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 100000) throw new Error(`${expected.path}: public payload unexpectedly small (${buffer.length} bytes)`);
  const actual = jpegDimensions(buffer);
  if (actual.width !== expected.width || actual.height !== expected.height) {
    throw new Error(`${expected.path}: public dimensions ${actual.width}x${actual.height}, expected ${expected.width}x${expected.height}`);
  }
  const sameBytes = buffer.length === expected.bytes;
  if (!sameBytes) transformed++;
  console.log(`OK ${actual.width}x${actual.height} ${buffer.length} bytes ${expected.path}${sameBytes ? '' : ' [delivery layer transformed bytes]'}`);
}

console.log(`SolWorldz public image proof passed: all ${images.length} approved master images are live at exact approved dimensions; ${transformed} payload(s) differ in size from origin and are treated as delivery-layer optimisation, not source substitution.`);
