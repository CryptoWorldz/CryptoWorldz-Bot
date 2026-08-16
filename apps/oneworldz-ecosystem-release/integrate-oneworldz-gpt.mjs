import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, "source");
const dist = path.join(root, "dist", "ecosystem");
const targets = ["oneworldz", "donateworldz"];
const referenceArtwork = path.join(source, "assets", "desktop", "oneworldz", "oneworldz-gpt.png");

const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");

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

async function refreshManifest(target) {
  const manifestPath = path.join(target, "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const files = [];
  for (const file of await listFiles(target)) {
    if (file === "release-manifest.json") continue;
    const buffer = await readFile(path.join(target, file));
    files.push({ path: `/${file}`, bytes: buffer.byteLength, sha256: hash(buffer) });
  }
  manifest.generated_at = new Date().toISOString();
  manifest.files = files;
  manifest.integrations = Array.from(new Set([...(manifest.integrations || []), "oneworldz-gpt-openai-api"]));
  manifest.oneworldz_gpt = {
    api: "https://cryptobotz.cryptoworldz.xyz/api/oneworldz-gpt/chat",
    reference_artwork: "/assets/oneworldz-gpt/oneworldz-gpt.png",
    secret_location: "protected-server-only",
    payments_in_chat: false
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

for (const key of targets) {
  const target = path.join(dist, key);
  await mkdir(path.join(target, "assets", "css"), { recursive: true });
  await mkdir(path.join(target, "assets", "js"), { recursive: true });
  await mkdir(path.join(target, "assets", "oneworldz-gpt"), { recursive: true });
  await cp(path.join(source, "oneworldz-gpt.css"), path.join(target, "assets", "css", "oneworldz-gpt.css"));
  await cp(path.join(source, "oneworldz-gpt.js"), path.join(target, "assets", "js", "oneworldz-gpt.js"));
  await cp(referenceArtwork, path.join(target, "assets", "oneworldz-gpt", "oneworldz-gpt.png"));

  const indexPath = path.join(target, "index.html");
  let html = await readFile(indexPath, "utf8");
  if (!html.includes("/assets/css/oneworldz-gpt.css")) {
    html = html.replace("</head>", '<link rel="stylesheet" href="/assets/css/oneworldz-gpt.css"></head>');
  }
  if (!html.includes("/assets/js/oneworldz-gpt.js")) {
    html = html.replace("</body>", '<script src="/assets/js/oneworldz-gpt.js" defer></script></body>');
  }
  await writeFile(indexPath, html, "utf8");
  await refreshManifest(target);
}

console.log("OneWorldz GPT integrated into OneWorldz.com and DonateWorldz.com with the approved OneWorldz GPT reference artwork.");
