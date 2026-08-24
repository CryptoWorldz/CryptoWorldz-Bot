import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(root, "dist", "ecosystem", "cryptoworldz");
const mustExist = [
  "index.html",
  "release-manifest.json",
  "assets/css/cryptoworldz-perfect.css",
  "assets/css/oneworldz-gpt.css",
  "assets/js/oneworldz-gpt.js",
  "assets/oneworldz-gpt/oneworldz-gpt.png",
  "assets/support/davis-family/davis-family-hero.webp",
  "assets/mobile/impactbased-landscape.webp"
];
for (const rel of mustExist) {
  const info = await stat(path.join(target, rel)).catch(() => null);
  if (!info?.isFile() || info.size <= 0) throw new Error(`CryptoWorldz required file missing: ${rel}`);
}

const html = await readFile(path.join(target, "index.html"), "utf8");
const css = await readFile(path.join(target, "assets/css/cryptoworldz-perfect.css"), "utf8");
const manifest = JSON.parse(await readFile(path.join(target, "release-manifest.json"), "utf8"));

for (const token of [
  'data-cryptoworldz-perfect="true"',
  'data-visual-contract="cryptoworldz-main-image"',
  'class="cw-role-strip"',
  "Four purposes. Four separate support pathways.",
  "https://donateworldz.com/davis-family/",
  "/assets/support/davis-family/davis-family-hero.webp",
  "/assets/css/oneworldz-gpt.css",
  "/assets/js/oneworldz-gpt.js",
  "https://cryptoworldz.xyz",
  "https://t.me/CryptoWorldzRaaiiiddTeam"
]) if (!html.includes(token)) throw new Error(`CryptoWorldz homepage proof missing: ${token}`);

for (const forbidden of [
  'id="learn"',
  'id="safety"',
  'id="human-leadership"',
  'id="governance"',
  'id="rewards"',
  'id="updates"',
  'id="official-directory"',
  'id="project-registry"',
  'id="acknowledgements"',
  "Raaaiiidd Teamhttps://"
]) if (html.includes(forbidden)) throw new Error(`CryptoWorldz homepage bloat/display drift returned: ${forbidden}`);

if ((html.match(/<span>ZED<\/span>|<span>AUTO<\/span>|<span>G\.R\.A\.C\.E\.<\/span>|<span>RECAP<\/span>|<span>BASED\.BID<\/span>/g) || []).length !== 5) {
  throw new Error("CryptoWorldz compact five-role strip incomplete");
}
if (!/\.cw-perfect-hero[\s\S]*object-fit:contain!important/.test(css)) throw new Error("CryptoWorldz hero contain contract missing");
if (!manifest.cryptoworldz_perfect?.davis_family_visual || !manifest.cryptoworldz_perfect?.shared_oneworldz_gpt) throw new Error("CryptoWorldz release manifest perfect contract missing");

console.log("CRYPTOWORLDZ_VISUAL_MASTER=PASS HERO=FULL DAVIS=PASS GPT=SHARED BLOAT=REMOVED");
