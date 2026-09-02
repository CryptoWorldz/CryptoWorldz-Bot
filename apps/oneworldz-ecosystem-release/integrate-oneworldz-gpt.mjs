import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, "source");
const dist = path.join(root, "dist", "ecosystem");
const targets = ["oneworldz", "donateworldz"];
const referenceArtwork = path.join(source, "assets", "desktop", "oneworldz", "oneworldz-gpt.png");
const oneWorldzX = "https://x.com/OneWorldzX";
const oneWorldzTelegram = "https://t.me/OneWorldzTG";

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

async function refreshManifest(target, key) {
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
  if (key === "oneworldz") {
    manifest.official_social_channels = {
      x: oneWorldzX,
      telegram: oneWorldzTelegram
    };
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

function injectOfficialChannels(html) {
  if (html.includes('id="official-channels"')) return html;
  const section = `<section class="section section-dark" id="official-channels"><div class="section-heading"><p class="eyebrow">OFFICIAL ONEWORLDZ CHANNELS</p><h2>Follow OneWorldz. Join the movement.</h2><p>Follow the official OneWorldz X page and join the OneWorldz Telegram community for updates, action and connection.</p></div><div class="button-row"><a class="button primary" href="${oneWorldzX}" target="_blank" rel="noopener noreferrer">Follow @OneWorldzX</a><a class="button secondary" href="${oneWorldzTelegram}" target="_blank" rel="noopener noreferrer">Join OneWorldz Telegram</a></div></section>`;
  const acknowledgement = html.indexOf('<section class="section" id="acknowledgements">');
  const alternateAcknowledgement = html.indexOf('<section class="section section-dark" id="acknowledgements">');
  const pos = acknowledgement >= 0 ? acknowledgement : alternateAcknowledgement;
  // Final one-screen writers intentionally replace the page body and do not
  // preserve the legacy acknowledgement section. Keep the official channels
  // visible by using the end of the body as the stable insertion point.
  if (pos < 0) return html.replace("</body>", `${section}</body>`);
  return html.slice(0, pos) + section + html.slice(pos);
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
  if (key === "oneworldz") {
    html = injectOfficialChannels(html);
    if (!html.includes(`href="${oneWorldzX}"`)) throw new Error("Official OneWorldz X link missing");
    if (!html.includes(`href="${oneWorldzTelegram}"`)) throw new Error("Official OneWorldz Telegram link missing");
  }
  await writeFile(indexPath, html, "utf8");
  await refreshManifest(target, key);
}

console.log("OneWorldz GPT integrated into OneWorldz.com and DonateWorldz.com; official OneWorldz X and Telegram channels are included on OneWorldz.com.");
