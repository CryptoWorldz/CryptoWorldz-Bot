import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pdcTokens } from "./site-data.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, "source");
const target = path.join(root, "dist", "ecosystem", "purplediamondcrew");
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");
const e = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const wrappedSol = "So11111111111111111111111111111111111111112";

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

const cards = pdcTokens.map((token) => {
  const jupiter = `https://www.jup.ag/?buy=${encodeURIComponent(token.address)}&sell=${wrappedSol}`;
  return `<article class="pdc-token-card" data-token-address="${e(token.address)}"><span>${e(token.number)} • PDC LEGACY</span><h3>${e(token.name)}</h3><code>${e(token.address)}</code><div class="pdc-market" data-state="loading"><small>DEX Screener</small><strong>Checking live market view…</strong><span>Legacy token history remains separate from humanitarian support.</span></div><div class="pdc-token-links"><a href="${e(token.url)}" target="_blank" rel="noopener noreferrer">Solscan</a><a data-dex-link href="https://dexscreener.com/solana/${e(token.address)}" target="_blank" rel="noopener noreferrer">DEX Screener</a><a data-swap-link href="${e(jupiter)}" target="_blank" rel="noopener noreferrer" hidden>Buy / Swap</a></div></article>`;
}).join("");

let html = await readFile(path.join(target, "index.html"), "utf8");
html = html.replace(/<body\s+style="([^"]*)">/, '<body class="pdc-purple-theme" style="$1">');
if (!html.includes('class="pdc-purple-theme"')) throw new Error("Purple Diamond Crew theme marker missing");
const tokenGrid = /<div class="token-grid">[\s\S]*?<\/div><\/section><\/main>/;
if (!tokenGrid.test(html)) throw new Error("PDC legacy token grid not found");
html = html.replace(tokenGrid, `<div class="token-grid pdc-token-grid">${cards}</div><p class="pdc-market-note"><strong>Live market view:</strong> DEX Screener data is fetched from its public Solana token API. When an active Solana pair is returned, the card exposes DEX Screener and an external Jupiter Buy / Swap route using the exact legacy mint address. Jupiter performs the wallet connection, quote and transaction confirmation; PurpleDiamondCrew.com never takes custody or signs the trade. If no live pair is found, the purchase route stays hidden and the Solscan legacy record remains available. Prices, liquidity and routes can change quickly.</p><span class="pdc-dex-status" data-state="loading">Preparing DEX Screener market view…</span></section></main>`);
html = html.replace('<section class="section" id="legacy">', '<section class="section pdc-legacy-stage" id="legacy">');
html = html.replace("</head>", '<link rel="stylesheet" href="/assets/css/pdc-market.css"></head>');
html = html.replace("</body>", '<script src="/assets/js/pdc-market.js" defer></script></body>');
await writeFile(path.join(target, "index.html"), html, "utf8");

await mkdir(path.join(target, "assets", "css"), { recursive: true });
await mkdir(path.join(target, "assets", "js"), { recursive: true });
await mkdir(path.join(target, "assets", "desktop", "purple-diamond-crew"), { recursive: true });
await cp(path.join(source, "pdc-market.css"), path.join(target, "assets", "css", "pdc-market.css"));
await cp(path.join(source, "pdc-market.js"), path.join(target, "assets", "js", "pdc-market.js"));
await cp(path.join(source, "assets", "desktop", "purple-diamond-crew", "hope-chest.png"), path.join(target, "assets", "desktop", "purple-diamond-crew", "hope-chest.png"));

const manifestPath = path.join(target, "release-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const files = [];
for (const file of await listFiles(target)) {
  if (file === "release-manifest.json") continue;
  const bytes = await readFile(path.join(target, file));
  files.push({ path: `/${file}`, bytes: bytes.byteLength, sha256: hash(bytes) });
}
manifest.generated_at = new Date().toISOString();
manifest.files = files;
manifest.pdc_theme = "PURPLE_DIAMOND";
manifest.pdc_legacy = {
  tokens: 10,
  desktop_layout: "5 columns × 2 rows",
  source: "verified PDC legacy register",
  dexscreener: {
    integration: "https://api.dexscreener.com/tokens/v1/solana/{tokenAddresses}",
    display: "highest-liquidity returned Solana pair per legacy address"
  },
  swap_route: {
    provider: "Jupiter",
    route: "https://www.jup.ag/?buy={tokenMint}&sell=So11111111111111111111111111111111111111112",
    visibility: "shown only when DEX Screener returns an active Solana pair",
    site_execution: false,
    site_custody: false
  },
  background: {
    desktop: "/assets/desktop/purple-diamond-crew/hope-chest.png",
    mobile: "/assets/mobile/hope-chest.webp",
    treatment: "full-page-cover-with-readable-overlay"
  }
};
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log("PurpleDiamondCrew enhanced: full-background purple identity, 10 verified legacy tokens in 5×2 desktop layout, DEX Screener live market data and guarded external Jupiter swap routes.");
