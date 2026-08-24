import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { officialDirectory, supportDirectory } from "./site-data.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const site = path.join(root, "dist", "ecosystem", "oneworldz");
const mustExist = async (relative) => {
  const file = path.join(site, relative);
  const info = await stat(file).catch(() => null);
  if (!info?.isFile() || info.size <= 0) throw new Error(`ONEWORLDZ_PERFECT missing file: ${relative}`);
};

for (const relative of [
  "index.html",
  "gpt/index.html",
  "community-support/index.html",
  "sponsor-apply/index.html",
  "heroes/index.html",
  "directory/index.html",
  "acknowledgements/index.html",
  "assets/css/oneworldz-perfect.css",
  "assets/desktop/oneworldz/oneworldz-master.png",
  "assets/mobile/little-legend.webp",
  "assets/oneworldz-gpt/oneworldz-gpt.png",
  "release-manifest.json"
]) await mustExist(relative);

const home = await readFile(path.join(site, "index.html"), "utf8");
const css = await readFile(path.join(site, "assets/css/oneworldz-perfect.css"), "utf8");
const gpt = await readFile(path.join(site, "gpt/index.html"), "utf8");
const manifest = JSON.parse(await readFile(path.join(site, "release-manifest.json"), "utf8"));
const bodyTag = home.match(/<body\b[^>]*>/)?.[0] || "";

if (!bodyTag.includes('data-oneworldz-perfect="true"')) throw new Error("ONEWORLDZ_PERFECT body marker missing");
if (bodyTag.includes("full-background-experience")) throw new Error("ONEWORLDZ_PERFECT repeated full background still armed");
if (!home.includes('/assets/desktop/oneworldz/oneworldz-master.png')) throw new Error("ONEWORLDZ_PERFECT desktop master image missing");
if (!home.includes('/assets/mobile/little-legend.webp')) throw new Error("ONEWORLDZ_PERFECT mobile master image missing");
if (!home.includes('data-visual-contract="oneworldz-main-image"')) throw new Error("ONEWORLDZ_PERFECT main image contract missing");
if (!home.includes('id="oneworldz-visual-link-hub"')) throw new Error("ONEWORLDZ_PERFECT visual link hub missing");
if (!css.includes('[data-fit="contain"] img')) throw new Error("ONEWORLDZ_PERFECT contain-fit rule missing");
if (!css.includes('object-fit:contain!important')) throw new Error("ONEWORLDZ_PERFECT no-distortion rule missing");
if (!gpt.includes('/assets/oneworldz-gpt/oneworldz-gpt.png') || !gpt.includes('data-gpt-open')) throw new Error("ONEWORLDZ_PERFECT GPT visual/open contract missing");

for (const entry of officialDirectory) {
  if (!home.includes(`href="${entry.url}"`)) throw new Error(`ONEWORLDZ_PERFECT missing official link: ${entry.url}`);
}
for (const entry of supportDirectory) {
  if (!home.includes(`href="${entry.url}"`)) throw new Error(`ONEWORLDZ_PERFECT missing support link: ${entry.url}`);
}
for (const route of ["/community-support/","/sponsor-apply/","/heroes/","/gpt/","/directory/","/acknowledgements/","https://donateworldz.com/davis-family/"]) {
  if (!home.includes(`href="${route}"`)) throw new Error(`ONEWORLDZ_PERFECT missing visual route link: ${route}`);
}

const cardCount = (home.match(/data-perfect-card="true"/g) || []).length;
const visualCount = (home.match(/data-visual-required="true"/g) || []).length;
if (cardCount < 19) throw new Error(`ONEWORLDZ_PERFECT expected at least 19 imaged directory/support cards, got ${cardCount}`);
if (visualCount < 25) throw new Error(`ONEWORLDZ_PERFECT expected at least 25 visual-required elements, got ${visualCount}`);

const contract = manifest.oneworldz_perfect_visual_contract;
if (!contract?.master_site || contract.image_fit !== "CONTAIN_NO_STRETCH_NO_CROP" || contract.rollout_state !== "ONEWORLDZ_ONLY") {
  throw new Error("ONEWORLDZ_PERFECT release manifest contract missing or drifted");
}

console.log(JSON.stringify({
  event: "oneworldz_perfect_acceptance",
  result: "PASS",
  official_links: officialDirectory.length,
  support_links: supportDirectory.length,
  imaged_cards: cardCount,
  visual_elements: visualCount,
  gpt_ui: "PASS",
  fit: "CONTAIN_NO_STRETCH_NO_CROP",
  scope: "ONEWORLDZ_ONLY"
}, null, 2));
