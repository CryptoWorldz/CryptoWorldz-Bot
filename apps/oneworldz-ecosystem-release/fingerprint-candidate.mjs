import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'apps/oneworldz-ecosystem-release/dist/ecosystem');
const textExt = new Set(['.html','.htm','.json','.xml','.txt','.js','.mjs','.cjs','.css','.webmanifest','.md','.csv','.tsv','.yml','.yaml']);
const iso = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/g;
const ledgerNames = new Set(['release-manifest.json','site-tree.json','user-structure-tree.json']);

async function walk(dir, rel = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(child, childRel));
    else if (entry.isFile()) out.push(childRel);
  }
  return out;
}

const files = (await walk(root)).sort().filter((rel) => !ledgerNames.has(path.basename(rel)));
if (!files.length) throw new Error(`No candidate files found under ${root}`);
const aggregate = createHash('sha256');
for (const rel of files) {
  const file = path.join(root, rel);
  let bytes = await readFile(file);
  if (textExt.has(path.extname(rel).toLowerCase())) {
    bytes = Buffer.from(bytes.toString('utf8').replace(iso, '<BUILD_TIMESTAMP>'), 'utf8');
  }
  const digest = createHash('sha256').update(bytes).digest('hex');
  aggregate.update(rel);
  aggregate.update('\0');
  aggregate.update(digest);
  aggregate.update('\n');
}
process.stdout.write(`${aggregate.digest('hex')}\n`);
