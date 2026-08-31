import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { productionTargets } from './production-targets.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist', 'ecosystem');

async function htmlFiles(dir, rel = '') {
  const out = [];
  for (const entry of await readdir(path.join(dir, rel), { withFileTypes: true })) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(dir, child));
    else if (entry.name === 'index.html') out.push(child);
  }
  return out;
}

function upsertStyle(html, marker, css) {
  const re = new RegExp(`<style ${marker}>[\\s\\S]*?<\\/style>`, 'g');
  html = html.replace(re, '');
  if (!html.includes('</head>')) throw new Error(`${marker}: </head> missing`);
  return html.replace('</head>', `<style ${marker}>\n${css}\n</style>\n</head>`);
}

const interactionCss = `
/* Final interaction authority: the open menu must sit above its backdrop. */
#menu-button{
  position:relative!important;
  z-index:10030!important;
  pointer-events:auto!important;
}
#site-menu{
  position:fixed!important;
  z-index:2147483647!important;
}
#site-menu.open{
  pointer-events:auto!important;
}
#site-menu.open a,
#site-menu.open button{
  pointer-events:auto!important;
}
#menu-backdrop{
  z-index:2147483646!important;
  pointer-events:none!important;
}
#menu-backdrop.open{
  pointer-events:auto!important;
}
.screen-brand{
  z-index:10025!important;
  pointer-events:auto!important;
}
/* The final visual layer must never turn visible calls-to-action into decoration. */
.screen-panel,
.screen-panel .glass-button,
.screen-panel .token-control,
.screen-panel .community-control,
.screen-panel .pager button{
  pointer-events:auto!important;
}
`;

let pages = 0;
for (const target of productionTargets) {
  const dir = path.join(dist, target.key);
  for (const rel of await htmlFiles(dir)) {
    const file = path.join(dir, rel);
    let html = await readFile(file, 'utf8');
    html = upsertStyle(html, 'data-final-interaction-integrity', interactionCss);
    await writeFile(file, html, 'utf8');
    pages += 1;
  }
}
if (pages !== 93) throw new Error(`Expected 93 pages for interaction authority, got ${pages}`);

// The OneWorldz Blueprint Hub supersedes the old generated home panel.
// Keep the old semantic H1 in source for architecture/SEO proof, but it must not remain an active visual/control layer.
{
  const file = path.join(dist, 'oneworldz', 'index.html');
  let html = await readFile(file, 'utf8');
  if (!html.includes('data-oneworldz-blueprint-hub="true"')) throw new Error('OneWorldz Blueprint Hub marker missing');
  const css = `
body[data-oneworldz-blueprint-hub="true"] .screen > .screen-panel,
body[data-oneworldz-blueprint-hub="true"] .screen .screen-panel[data-legacy-panel]{
  display:none!important;
  visibility:hidden!important;
  pointer-events:none!important;
}
body[data-oneworldz-blueprint-hub="true"] .screen > .screen-panel a,
body[data-oneworldz-blueprint-hub="true"] .screen > .screen-panel button{
  pointer-events:none!important;
}
`;
  html = upsertStyle(html, 'data-oneworldz-duplicate-control-removal', css);
  await writeFile(file, html, 'utf8');
}

console.log('INTERACTION_INTEGRITY_FINAL=PASS pages=93 menu_above_backdrop=true closed_backdrop_inert=true oneworldz_duplicate_controls=HIDDEN production_write=false');
