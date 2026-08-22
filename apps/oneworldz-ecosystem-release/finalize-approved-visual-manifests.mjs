import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productionTargets } from "./production-targets.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist", "ecosystem");
const source = path.join(root, "source");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function listFiles(dir, rel = "") {
  const entries = await readdir(path.join(dir, rel), { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(dir, child));
    else out.push(child.split(path.sep).join("/"));
  }
  return out.sort();
}

const siteRuntime = await readFile(path.join(source, "site.js"));
const siteRuntimeName = `site.${hash(siteRuntime).slice(0, 12)}.js`;
const oldRuntimeRef = 'src="/assets/js/site.js"';
const newRuntimeRef = `src="/assets/js/${siteRuntimeName}"`;
let rewrittenPages = 0;
let expectedPages = 0;

for (const target of productionTargets) {
  const packageDir = path.join(dist, target.key);
  const jsDir = path.join(packageDir, "assets", "js");
  await mkdir(jsDir, { recursive: true });
  await writeFile(path.join(jsDir, siteRuntimeName), siteRuntime);

  const htmlFiles = (await listFiles(packageDir)).filter((file) => file.endsWith(".html"));
  for (const file of htmlFiles) {
    const htmlPath = path.join(packageDir, file);
    const original = await readFile(htmlPath, "utf8");
    if (!original.includes(oldRuntimeRef)) continue;
    expectedPages += 1;
    const updated = original.replaceAll(oldRuntimeRef, newRuntimeRef);
    if (updated === original) throw new Error(`${target.key}/${file}: site runtime cache-bust rewrite failed`);
    await writeFile(htmlPath, updated, "utf8");
    rewrittenPages += 1;
  }

  const manifestPath = path.join(packageDir, "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  delete manifest.approved_visual;
  manifest.runtime = {
    ...(manifest.runtime || {}),
    site_script: `/assets/js/${siteRuntimeName}`,
    cache_policy: "content-hashed-runtime"
  };

  const files = [];
  for (const file of await listFiles(packageDir)) {
    if (file === "release-manifest.json") continue;
    const bytes = await readFile(path.join(packageDir, file));
    files.push({ path: `/${file}`, bytes: bytes.byteLength, sha256: hash(bytes) });
  }
  manifest.files = files;
  manifest.generated_at = new Date().toISOString();
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

if (expectedPages === 0 || rewrittenPages !== expectedPages) {
  throw new Error(`Expected to cache-bust ${expectedPages} published HTML pages, rewrote ${rewrittenPages}`);
}

console.log(`Shared runtime cache-busted as ${siteRuntimeName} across ${rewrittenPages} HTML pages. Image identity is intentionally left to apply-exact-visual-map.mjs.`);
