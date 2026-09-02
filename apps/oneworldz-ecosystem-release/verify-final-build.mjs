import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productionTargets } from "./production-targets.mjs";
import { pageRoutes, staticTargets } from "./release-contract.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist", "ecosystem");
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function htmlFiles(dir, relative = "") {
  const out = [];
  for (const entry of await readdir(path.join(dir, relative), { withFileTypes: true })) {
    if (entry.name === ".rsync-tmp") continue;
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(dir, child));
    else if (entry.name === "index.html") out.push(child.split(path.sep).join("/"));
  }
  return out.sort();
}

let pages = 0;
for (const target of productionTargets) {
  const targetRoot = path.join(dist, target.key);
  const routes = await htmlFiles(targetRoot);
  if (!routes.length) throw new Error(`${target.key}: no generated HTML routes`);
  for (const route of routes) {
    const file = path.join(targetRoot, route);
    let html = "";
    // Some hosted and virtualised filesystems can briefly expose the previous
    // inode immediately after a cross-process write. Re-read a short bounded
    // number of times; a real missing final contract still fails the build.
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      html = await readFile(file, "utf8");
      const complete = [
        'data-one-screen="true"',
        '/assets/css/visual-fit-final.css',
        '/assets/css/mobile-reality-fix.css',
        'ecosystem-mobile-reality-fixed'
      ].every((invariant) => html.includes(invariant));
      if (complete || attempt === 4) break;
      await wait(250);
    }
    for (const invariant of [
      'data-one-screen="true"',
      '/assets/css/visual-fit-final.css',
      '/assets/css/mobile-reality-fix.css',
      'ecosystem-mobile-reality-fixed'
    ]) {
      if (!html.includes(invariant)) throw new Error(`${target.key}/${route}: missing final invariant ${invariant}`);
    }
  }
  pages += routes.length;
}

if (pages !== pageRoutes) throw new Error(`Expected ${pageRoutes} final routes, found ${pages}`);
if (productionTargets.length !== staticTargets) throw new Error(`Expected ${staticTargets} targets, found ${productionTargets.length}`);
console.log(`FINAL_BUILD_CONTRACT=PASS targets=${staticTargets} routes=${pages} one_screen=true mobile_guard=true`);
