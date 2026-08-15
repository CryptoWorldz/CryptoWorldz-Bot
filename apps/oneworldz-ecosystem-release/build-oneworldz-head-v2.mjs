import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { oneWorldzHeadV2Page, requiredOneWorldzV2Media } from "./oneworldz-head-v2.mjs";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.join(appRoot, "source");
const outputRoot = path.join(appRoot, "dist", "oneworldz-head-v2");

async function requireFile(file) {
  const full = path.join(sourceRoot, "assets", file);
  const info = await stat(full).catch(() => null);
  if (!info?.isFile() || info.size === 0) throw new Error(`Missing required OneWorldz V2 production visual: ${file}`);
  return full;
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(path.join(outputRoot, "assets", "css"), { recursive: true });
await mkdir(path.join(outputRoot, "assets", "js"), { recursive: true });

await cp(path.join(sourceRoot, "site.css"), path.join(outputRoot, "assets", "css", "site.css"));
await cp(path.join(sourceRoot, "head-v2.css"), path.join(outputRoot, "assets", "css", "head-v2.css"));
await cp(path.join(sourceRoot, "site.js"), path.join(outputRoot, "assets", "js", "site.js"));

for (const media of requiredOneWorldzV2Media) {
  const source = await requireFile(media);
  const destination = path.join(outputRoot, "assets", media);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination);
}

const html = oneWorldzHeadV2Page();
await writeFile(path.join(outputRoot, "index.html"), html, "utf8");
await writeFile(path.join(outputRoot, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: https://oneworldz.com/sitemap.xml\n", "utf8");
await writeFile(path.join(outputRoot, "sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://oneworldz.com/</loc></url></urlset>\n', "utf8");

const checks = [
  ["OneWorldz title", /<title>OneWorldz \| One Vision\.<\/title>/],
  ["Learn route", /https:\/\/learn\.oneworldz\.com/],
  ["Law route", /https:\/\/law\.oneworldz\.com/],
  ["Impact route", /https:\/\/impactbased\.oneworldz\.com/],
  ["Food route", /https:\/\/foodworldz\.com/],
  ["Donate route", /https:\/\/donateworldz\.com/],
  ["Protected command route", /https:\/\/cryptobotz\.cryptoworldz\.xyz/]
];
for (const [label, pattern] of checks) if (!pattern.test(html)) throw new Error(`OneWorldz V2 check failed: ${label}`);

const css = await readFile(path.join(outputRoot, "assets", "css", "head-v2.css"), "utf8");
if (!css.includes("@media(max-width:640px)")) throw new Error("OneWorldz V2 mobile CSS gate missing");
if (!css.includes("prefers-reduced-motion")) throw new Error("OneWorldz V2 reduced-motion gate missing");

await writeFile(path.join(outputRoot, "REVIEW-ONLY.txt"), "ONEWORLDZ HEAD V2 REVIEW BUILD\nNO PRODUCTION DEPLOYMENT AUTHORIZED BY THIS FILE.\nDNS, mail and CryptoBotz must remain untouched.\n", "utf8");
console.log(`Built isolated review package at ${outputRoot}`);
