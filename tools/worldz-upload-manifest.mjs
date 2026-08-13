import fs from 'node:fs/promises';
import path from 'node:path';

const sourceRoot = path.resolve(process.argv[2] || 'apps/cryptoworldz-web-core');
const outputPath = process.argv[3] ? path.resolve(process.argv[3]) : null;

const rootFiles = [
  '404.html',
  '_headers',
  'live.html',
  '.htaccess',
  'donate.html',
  'gofundme.html',
  'reagan-kauja.html',
  'ultimate.html',
  'robots.txt',
  'sitemap.xml'
];

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function relativeSafe(full) {
  const rel = path.relative(sourceRoot, full).split(path.sep).join('/');
  if (!rel || rel.startsWith('../') || rel === '..' || rel.includes('\n') || rel.includes('\r')) {
    throw new Error(`Unsafe Worldz upload path: ${full}`);
  }
  return rel;
}

const files = [];
for (const rel of rootFiles) {
  const full = path.join(sourceRoot, rel);
  if (await exists(full)) files.push(full);
}

for (const dirName of ['assets', 'config', 'command-centre']) {
  const dir = path.join(sourceRoot, dirName);
  if (await exists(dir)) files.push(...await walk(dir));
}

const indexFile = path.join(sourceRoot, 'index.html');
if (!await exists(indexFile)) throw new Error('Approved Worldz package is missing index.html');
files.push(indexFile);

const manifest = [...new Set(files.map(relativeSafe))].sort();
if (!manifest.length) throw new Error('Worldz upload manifest is empty');
const text = `${manifest.join('\n')}\n`;

if (outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, text, 'utf8');
} else {
  process.stdout.write(text);
}

console.error(`Worldz upload manifest contains ${manifest.length} files.`);