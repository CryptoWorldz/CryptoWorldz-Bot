import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const site = path.join(root, "dist", "ecosystem", "oneworldz");
const cssFile = path.join(site, "assets", "css", "oneworldz-perfect.css");
const marker = "ONEWORLDZ_PERFECT_HERO_FLOW_FIX";
let css = await readFile(cssFile, "utf8");
if (!css.includes(marker)) {
  css += `\n/* ${marker}: base hero CSS is absolute; exact artwork must remain in document flow. */\nbody[data-oneworldz-perfect="true"] .oneworldz-master-hero img,body[data-oneworldz-perfect="true"] .oneworldz-gpt-hero img{position:relative!important;inset:auto!important;display:block!important}\n`;
  await writeFile(cssFile, css, "utf8");
}

async function walk(dir, rel = "") {
  const out = [];
  for (const entry of await readdir(path.join(dir, rel), { withFileTypes: true })) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...await walk(dir, child));
    else out.push(child.split(path.sep).join("/"));
  }
  return out.sort();
}
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifestPath = path.join(site, "release-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const files = [];
for (const relative of await walk(site)) {
  if (relative === "release-manifest.json") continue;
  const bytes = await readFile(path.join(site, relative));
  files.push({ path: `/${relative}`, bytes: bytes.byteLength, sha256: sha256(bytes) });
}
manifest.generated_at = new Date().toISOString();
manifest.files = files;
manifest.oneworldz_perfect_visual_contract = {
  ...(manifest.oneworldz_perfect_visual_contract || {}),
  hero_in_document_flow: true
};
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log("ONEWORLDZ_PERFECT_HERO_FLOW=PASS");
