import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pdcTokens } from "../site-data.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pdc = path.join(root, "dist", "ecosystem", "purplediamondcrew");

test("PurpleDiamondCrew keeps exactly ten verified legacy positions in a 5 by 2 desktop grid", async () => {
  const html = await readFile(path.join(pdc, "index.html"), "utf8");
  const css = await readFile(path.join(pdc, "assets", "css", "pdc-market.css"), "utf8");
  assert.equal(pdcTokens.length, 10);
  assert.equal((html.match(/class="pdc-token-card"/g) || []).length, 10);
  assert.match(html, /token-grid pdc-token-grid/);
  assert.match(css, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  for (const token of pdcTokens) assert.match(html, new RegExp(token.address.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("PurpleDiamondCrew integrates DEX Screener as read-only live market context", async () => {
  const html = await readFile(path.join(pdc, "index.html"), "utf8");
  const js = await readFile(path.join(pdc, "assets", "js", "pdc-market.js"), "utf8");
  const manifest = JSON.parse(await readFile(path.join(pdc, "release-manifest.json"), "utf8"));
  assert.match(html, /DEX Screener/);
  assert.match(js, /api\.dexscreener\.com\/tokens\/v1\/solana/);
  assert.match(js, /liquidity/);
  assert.equal(manifest.pdc_legacy.tokens, 10);
  assert.equal(manifest.pdc_legacy.dexscreener.execution, false);
  assert.equal(manifest.pdc_legacy.desktop_layout, "5 columns × 2 rows");
});

test("PurpleDiamondCrew approved Hope Chest art is present as the legacy background", async () => {
  const image = await stat(path.join(pdc, "assets", "desktop", "purple-diamond-crew", "hope-chest.png"));
  assert.ok(image.size > 100000);
  const css = await readFile(path.join(pdc, "assets", "css", "pdc-market.css"), "utf8");
  assert.match(css, /purple-diamond-crew\/hope-chest\.png/);
});
