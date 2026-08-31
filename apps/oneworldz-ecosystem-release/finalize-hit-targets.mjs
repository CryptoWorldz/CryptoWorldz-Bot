import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist', 'ecosystem');

const HIT_STYLE = `<style id="oneworldz-hit-target-authority">\n/* FINAL INTERACTION AUTHORITY: decorative panels stay click-through; real controls remain tappable. */\nbody[data-universal-floating="true"] .screen-panel :is(a[href],button,[role="button"],input,select,textarea,label,[tabindex]:not([tabindex="-1"])) { pointer-events:auto!important; }\n</style>`;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (entry.name === 'index.html') out.push(full);
  }
  return out;
}

let scanned = 0;
let changed = 0;
for (const file of await walk(dist)) {
  scanned += 1;
  let html = await readFile(file, 'utf8');
  if (!html.includes('data-universal-floating="true"')) continue;
  if (html.includes('id="oneworldz-hit-target-authority"')) continue;
  if (!html.includes('</head>')) throw new Error(`Missing </head> in ${file}`);
  html = html.replace('</head>', `${HIT_STYLE}</head>`);
  await writeFile(file, html, 'utf8');
  changed += 1;
}

if (scanned !== 93) throw new Error(`Expected 93 final route documents; found ${scanned}`);
if (changed < 1) throw new Error('No universal-floating pages received hit-target authority');

console.log(`REAL_HIT_TARGET_FINALIZER=PASS routes=${scanned} universal_routes_changed=${changed} pointer_restore=true production_write=false`);
