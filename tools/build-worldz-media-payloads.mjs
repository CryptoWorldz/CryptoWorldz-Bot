import fs from 'node:fs/promises';
import path from 'node:path';

const siteRoot = path.resolve(process.argv[2] || 'apps/cryptoworldz-web-core');
const imageRoot = path.join(siteRoot, 'assets', 'images');
const payloadRoot = path.join(siteRoot, 'assets', 'media-payload');
const chunkSize = 12000;

const mimeByExt = new Map([
  ['.webp', 'image/webp'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.avif', 'image/avif'],
  ['.svg', 'image/svg+xml']
]);

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const output = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...await walk(full));
    else output.push(full);
  }
  return output;
}

if (!await exists(imageRoot)) {
  console.log(`No image directory at ${imageRoot}; payload generation skipped.`);
  process.exit(0);
}

const files = (await walk(imageRoot)).filter(file => mimeByExt.has(path.extname(file).toLowerCase()));
if (!files.length) {
  console.log(`No supported images at ${imageRoot}; payload generation skipped.`);
  process.exit(0);
}

await fs.rm(payloadRoot, { recursive: true, force: true });
await fs.mkdir(payloadRoot, { recursive: true });

const assets = {};
for (const file of files) {
  const relative = path.relative(imageRoot, file).split(path.sep).join('/');
  const ext = path.extname(file).toLowerCase();
  const mime = mimeByExt.get(ext);
  const bytes = await fs.readFile(file);
  const base64 = bytes.toString('base64');
  const parts = [];
  const partCount = Math.max(1, Math.ceil(base64.length / chunkSize));
  const outDir = path.join(payloadRoot, path.dirname(relative));
  await fs.mkdir(outDir, { recursive: true });

  for (let index = 0; index < partCount; index += 1) {
    const suffix = String(index + 1).padStart(2, '0');
    const partRelative = `${relative}.part${suffix}.b64`;
    const partPath = path.join(payloadRoot, ...partRelative.split('/'));
    await fs.writeFile(partPath, base64.slice(index * chunkSize, (index + 1) * chunkSize), 'utf8');
    parts.push(`/assets/media-payload/${partRelative}`);
  }

  assets[`/assets/images/${relative}`] = {
    mime,
    bytes: bytes.length,
    parts
  };
}

const manifest = {
  version: '2026-08-09-media-payload-2',
  generatedAt: new Date().toISOString(),
  assetCount: Object.keys(assets).length,
  assets
};
await fs.writeFile(path.join(payloadRoot, 'manifest.json'), `${JSON.stringify(manifest)}\n`, 'utf8');
console.log(`Generated text payloads for ${manifest.assetCount} Worldz images.`);
