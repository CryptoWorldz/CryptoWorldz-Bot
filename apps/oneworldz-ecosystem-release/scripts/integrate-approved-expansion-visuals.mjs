import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const approvedRoot = path.join(appRoot, "source", "approved-visuals");
const desktopRoot = path.join(appRoot, "source", "assets", "desktop", "expansion");
const mobileRoot = path.join(appRoot, "source", "assets", "mobile", "expansion");
const pagesPath = path.join(appRoot, "expansion-pages.mjs");

const specs = {
  foodworldz: { parts: 5, desktop: "foodworldz-hero.avif", mobile: "foodworldz-hero.svg" },
  donateworldz: { parts: 4, desktop: "donateworldz-hero.avif", mobile: "donateworldz-hero.svg" },
  hodlergalaxy: { parts: 4, desktop: "hodlergalaxy-hero.avif", mobile: "hodlergalaxy-hero.svg" },
};

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function decodeApprovedVisual(key, partCount) {
  const chunks = [];
  for (let index = 1; index <= partCount; index += 1) {
    const suffix = String(index).padStart(2, "0");
    const file = path.join(approvedRoot, `${key}.part${suffix}.b64`);
    chunks.push((await readFile(file, "utf8")).replace(/\s+/g, ""));
  }
  const encoded = chunks.join("");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error(`Invalid base64 for ${key}`);
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length < 16 || bytes.subarray(4, 12).toString("ascii").includes("ftyp") === false) {
    throw new Error(`Decoded ${key} is not an AVIF/ISO BMFF image`);
  }
  return bytes;
}

function mobileSvg(desktopFile, label) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 900" role="img" aria-label="${label}">\n  <image href="../../desktop/expansion/${desktopFile}" x="0" y="0" width="720" height="900" preserveAspectRatio="xMaxYMid slice"/>\n</svg>\n`;
}

await mkdir(desktopRoot, { recursive: true });
await mkdir(mobileRoot, { recursive: true });

const manifest = {
  approval: "user-approved-2026-08-14",
  purpose: "OneWorldz 19-destination expansion visual lock",
  visuals: {},
};

for (const [key, spec] of Object.entries(specs)) {
  const bytes = await decodeApprovedVisual(key, spec.parts);
  await writeFile(path.join(desktopRoot, spec.desktop), bytes);
  await writeFile(path.join(mobileRoot, spec.mobile), mobileSvg(spec.desktop, `${key} approved mobile hero`), "utf8");
  manifest.visuals[key] = {
    desktop: `desktop/expansion/${spec.desktop}`,
    mobile: `mobile/expansion/${spec.mobile}`,
    sha256: sha256(bytes),
  };
}

let pages = await readFile(pagesPath, "utf8");
const replacements = new Map([
  ["desktop/humanitarian/action-creates-smiles-banner.png", "desktop/expansion/foodworldz-hero.avif"],
  ["support/mobile/reagan-children-emblem-mobile.webp", "mobile/expansion/foodworldz-hero.svg"],
  ["desktop/oneworldz/oneworldz-master.png", "desktop/expansion/donateworldz-hero.avif"],
  ["support/mobile/community-impact-emblem-mobile.webp", "mobile/expansion/donateworldz-hero.svg"],
  ["desktop/cryptoworldz/we-need-you.png", "desktop/expansion/hodlergalaxy-hero.avif"],
  ["mobile/five-leaders-alliance.webp", "mobile/expansion/hodlergalaxy-hero.svg"],
]);

for (const [from, to] of replacements) {
  if (!pages.includes(from) && !pages.includes(to)) throw new Error(`Expected expansion hero reference missing: ${from}`);
  pages = pages.replaceAll(from, to);
}

await writeFile(pagesPath, pages, "utf8");
await writeFile(path.join(approvedRoot, "approved-visuals.lock.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log("Approved FoodWorldz, DonateWorldz and HodlerGalaxy visuals integrated.");
