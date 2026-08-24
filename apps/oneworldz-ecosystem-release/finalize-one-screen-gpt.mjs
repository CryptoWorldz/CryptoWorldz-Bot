import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist", "ecosystem");
const source = path.join(root, "source");
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function listFiles(dir, rel = "") {
  const out = [];
  for (const entry of await readdir(path.join(dir, rel), { withFileTypes: true })) {
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
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

const routes = [
  { target: "oneworldz", route: "gpt" },
  { target: "cryptoworldz", route: "gtp" }
];

for (const { target, route } of routes) {
  const dir = path.join(dist, target);
  await mkdir(path.join(dir, "assets", "css"), { recursive: true });
  await mkdir(path.join(dir, "assets", "js"), { recursive: true });
  await cp(path.join(source, "one-screen-gpt.css"), path.join(dir, "assets", "css", "one-screen-gpt.css"));
  await cp(path.join(source, "one-screen-gpt-bridge.js"), path.join(dir, "assets", "js", "one-screen-gpt-bridge.js"));
  const file = path.join(dir, route, "index.html");
  let html = await readFile(file, "utf8");
  if (!html.includes('data-one-screen="true"') || !html.includes('href="#open-gpt"') || !html.includes('/assets/js/oneworldz-gpt.js')) {
    throw new Error(`One-screen GPT route contract missing: ${target}/${route}`);
  }
  if (!html.includes('/assets/css/one-screen-gpt.css')) {
    html = html.replace('</head>', '<link rel="stylesheet" href="/assets/css/one-screen-gpt.css" data-one-screen-gpt="true"></head>');
  }
  if (!html.includes('/assets/js/one-screen-gpt-bridge.js')) {
    html = html.replace('</body>', '<script src="/assets/js/one-screen-gpt-bridge.js" defer></script></body>');
  }
  await writeFile(file, html, "utf8");
  await refreshManifest(dir);
}

console.log("ONE_SCREEN_GPT_FINALIZER=PASS routes=2 fixed_overlay=true document_scroll=false");
