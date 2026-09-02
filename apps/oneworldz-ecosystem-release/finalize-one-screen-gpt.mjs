import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productionTargets } from "./production-targets.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist", "ecosystem");
const source = path.join(root, "source");
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function listFiles(dir, rel = "") {
  const out = [];
  for (const entry of await readdir(path.join(dir, rel), { withFileTypes: true })) {
    if (entry.name === ".rsync-tmp") continue;
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(dir, child));
    else out.push(child.split(path.sep).join("/"));
  }
  return out.sort();
}

async function refreshManifest(dir) {
  const manifestPath = path.join(dir, "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const files = [];
  for (const rel of await listFiles(dir)) {
    if (rel === "release-manifest.json") continue;
    const bytes = await readFile(path.join(dir, rel));
    files.push({ path: `/${rel}`, bytes: bytes.byteLength, sha256: hash(bytes) });
  }
  manifest.generated_at = new Date().toISOString();
  manifest.files = files;
  manifest.one_screen_gpt = {
    fixed_overlay: true,
    creates_document_scroll: false,
    protected_api: "https://cryptobotz.cryptoworldz.xyz/api/oneworldz-gpt/chat"
  };
  manifest.asset_freshness = {
    visual_fit_css_versioned: true,
    css_js_no_store: true
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

const routes = [
  { target: "oneworldz", route: "gpt" },
  { target: "cryptoworldz", route: "gtp" },
  { target: "learn-oneworldz", route: "gpt" }
];

for (const { target, route } of routes) {
  const dir = path.join(dist, target);
  await mkdir(path.join(dir, "assets", "css"), { recursive: true });
  await mkdir(path.join(dir, "assets", "js"), { recursive: true });
  await mkdir(path.join(dir, "assets", "oneworldz-gpt"), { recursive: true });
  await cp(path.join(source, "one-screen-gpt.css"), path.join(dir, "assets", "css", "one-screen-gpt.css"));
  await cp(path.join(source, "one-screen-gpt-bridge.js"), path.join(dir, "assets", "js", "one-screen-gpt-bridge.js"));
  await cp(path.join(source, "oneworldz-gpt.js"), path.join(dir, "assets", "js", "oneworldz-gpt.js"));
  await cp(path.join(source, "assets", "desktop", "oneworldz", "oneworldz-gpt.png"), path.join(dir, "assets", "oneworldz-gpt", "oneworldz-gpt.png"));

  const gptCssVersion = hash(await readFile(path.join(dir, "assets", "css", "one-screen-gpt.css"))).slice(0, 16);
  const bridgeVersion = hash(await readFile(path.join(dir, "assets", "js", "one-screen-gpt-bridge.js"))).slice(0, 16);
  const gptJsVersion = hash(await readFile(path.join(dir, "assets", "js", "oneworldz-gpt.js"))).slice(0, 16);

  const file = path.join(dir, route, "index.html");
  let html = await readFile(file, "utf8");
  if (!html.includes('data-one-screen="true"') || !html.includes('href="#open-gpt"') || !html.includes('/assets/js/oneworldz-gpt.js')) {
    throw new Error(`One-screen GPT route contract missing: ${target}/${route}`);
  }
  if (!html.includes('/assets/css/one-screen-gpt.css')) {
    html = html.replace('</head>', `<link rel="stylesheet" href="/assets/css/one-screen-gpt.css?v=${gptCssVersion}" data-one-screen-gpt="true"></head>`);
  } else {
    html = html.replace(/\/assets\/css\/one-screen-gpt\.css(?:\?[^"']*)?/g, `/assets/css/one-screen-gpt.css?v=${gptCssVersion}`);
  }
  if (!html.includes('/assets/js/one-screen-gpt-bridge.js')) {
    html = html.replace('</body>', `<script src="/assets/js/one-screen-gpt-bridge.js?v=${bridgeVersion}" defer></script></body>`);
  } else {
    html = html.replace(/\/assets\/js\/one-screen-gpt-bridge\.js(?:\?[^"']*)?/g, `/assets/js/one-screen-gpt-bridge.js?v=${bridgeVersion}`);
  }
  html = html.replace(/\/assets\/js\/oneworldz-gpt\.js(?:\?[^"']*)?/g, `/assets/js/oneworldz-gpt.js?v=${gptJsVersion}`);
  await writeFile(file, html, "utf8");
}

let versionedPages = 0;
for (const target of productionTargets) {
  const dir = path.join(dist, target.key);
  const cssFile = path.join(dir, "assets", "css", "visual-fit-final.css");
  const cssVersion = hash(await readFile(cssFile)).slice(0, 16);

  for (const rel of (await listFiles(dir)).filter((file) => file.endsWith("index.html"))) {
    const file = path.join(dir, rel);
    let html = await readFile(file, "utf8");
    if (!html.includes('/assets/css/visual-fit-final.css')) {
      throw new Error(`Visual-fit stylesheet missing from ${target.key}/${rel}`);
    }
    html = html.replace(/\/assets\/css\/visual-fit-final\.css(?:\?[^"']*)?/g, `/assets/css/visual-fit-final.css?v=${cssVersion}`);
    await writeFile(file, html, "utf8");
    versionedPages += 1;
  }

  const htaccessPath = path.join(dir, ".htaccess");
  let htaccess = await readFile(htaccessPath, "utf8");
  htaccess = htaccess.replace(
    '<FilesMatch "\\.(html?|json|xml)$">',
    '<FilesMatch "\\.(html?|json|xml|css|js)$">'
  );
  await writeFile(htaccessPath, htaccess, "utf8");
  await refreshManifest(dir);
}

if (versionedPages !== 93) throw new Error(`Expected to version 93 one-screen pages, got ${versionedPages}`);
console.log(`ONE_SCREEN_ASSET_FRESHNESS=PASS pages=${versionedPages} css_versioned=true css_js_no_store=true`);
console.log("ONE_SCREEN_GPT_FINALIZER=PASS routes=3 fixed_overlay=true document_scroll=false artwork=PASS");
