import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jayJayLaunchContract } from "./jayjay-launch-contract.mjs";
import { productionTargets } from "./production-targets.mjs";
import { links, worldz } from "./site-data.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "../..");
const distRoot = path.join(root, "dist", "ecosystem");

async function exists(file) {
  return stat(file).then(() => true).catch(() => false);
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

function routeFile(targetRoot, route) {
  const clean = route.replace(/^\/+|\/+$/g, "");
  return clean ? path.join(targetRoot, clean, "index.html") : path.join(targetRoot, "index.html");
}

if (productionTargets.length !== 18) throw new Error(`Expected 18 static targets; found ${productionTargets.length}`);

const stripeDestinations = [links.reaganStripe, links.communityStripe, links.jayjayStripe];
if (new Set(stripeDestinations).size !== stripeDestinations.length || stripeDestinations.some((value) => !value)) {
  throw new Error("Separated Stripe destinations are missing or duplicated");
}
if (!links.protectedMiniApp.startsWith("https://cryptobotz.cryptoworldz.xyz/")) throw new Error("Protected Mini App URL drifted");
if (!links.zedCommandCentre.startsWith("https://cryptobotz.cryptoworldz.xyz")) throw new Error("Protected Command Centre URL drifted");

const required = new Map([
  ["oneworldz", ["/", jayJayLaunchContract.oneWorldz.sponsorApplyRoute]],
  ["cryptoworldz", ["/", jayJayLaunchContract.cryptoWorldz.marketsRoute, jayJayLaunchContract.cryptoWorldz.applyRoute]],
  ["donateworldz", ["/", "/reagan-children/", "/community-impact/", "/support-jayjayteamdev/"]]
]);
for (const world of worldz.filter((entry) => entry.image)) {
  const list = required.get(world.key) || ["/"];
  list.push(jayJayLaunchContract.worldDex.route);
  required.set(world.key, list);
}

let totalPages = 0;
let totalVisualSlots = 0;
const fleet = {};

for (const target of productionTargets) {
  const targetRoot = path.join(distRoot, target.key);
  if (!await exists(targetRoot)) throw new Error(`Missing built target: ${target.key}`);
  const htmlFiles = (await walk(targetRoot)).filter((file) => file.endsWith(".html"));
  if (!htmlFiles.length) throw new Error(`No HTML pages built for ${target.key}`);
  totalPages += htmlFiles.length;

  for (const route of required.get(target.key) || ["/"]) {
    if (!await exists(routeFile(targetRoot, route))) throw new Error(`${target.key}: required route missing ${route}`);
  }

  const allHtml = (await Promise.all(htmlFiles.map((file) => readFile(file, "utf8")))).join("\n");
  if (/gofundme/i.test(allHtml)) throw new Error(`${target.key}: GoFundMe reference survived production build`);
  if (/coming soon/i.test(allHtml)) throw new Error(`${target.key}: Coming Soon placeholder survived production build`);
  if (/jayjay-card-art|jayjay-section-art|community-support-art/.test(allHtml)) throw new Error(`${target.key}: legacy automatic image class survived`);

  const reportPath = path.join(targetRoot, "exact-visual-map.json");
  if (!await exists(reportPath)) throw new Error(`${target.key}: exact visual map report missing`);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  if (report.target !== target.key) throw new Error(`${target.key}: exact visual map target mismatch`);
  if (report.pages !== htmlFiles.length) throw new Error(`${target.key}: visual-map page count mismatch`);
  for (const record of report.records || []) {
    for (const field of ["route", "section", "slot", "visual", "desktop", "mobile", "shape", "fit"]) {
      if (!String(record[field] || "").trim()) throw new Error(`${target.key}: incomplete exact visual record field ${field}`);
    }
    for (const publicPath of [record.desktop, record.mobile]) {
      if (!publicPath.startsWith("/assets/")) throw new Error(`${target.key}: visual escaped asset boundary ${publicPath}`);
      if (!await exists(path.join(targetRoot, publicPath.slice(1)))) throw new Error(`${target.key}: mapped visual missing ${publicPath}`);
    }
    if (["brand", "profile", "support-emblem", "support-profile"].includes(record.slot) && record.shape !== "square") {
      throw new Error(`${target.key}/${record.route}: ${record.slot} must be square; got ${record.shape}`);
    }
  }
  totalVisualSlots += (report.records || []).length;
  fleet[target.key] = { pages: htmlFiles.length, visual_slots: (report.records || []).length };

  const sitemapPath = path.join(targetRoot, "sitemap.xml");
  if (await exists(sitemapPath)) {
    const sitemap = await readFile(sitemapPath, "utf8");
    const sameDomain = [...sitemap.matchAll(/<loc>https:\/\/([^/]+)(\/[^<]*)?<\/loc>/g)]
      .filter((match) => match[1] === target.domain)
      .map((match) => match[2] || "/");
    for (const route of sameDomain) {
      if (!await exists(routeFile(targetRoot, route))) throw new Error(`${target.key}: sitemap route has no built HTML ${route}`);
    }
  }
}

if (totalPages < 83) throw new Error(`Generated fleet unexpectedly small: ${totalPages} HTML pages`);

const appPackage = await readFile(path.join(root, "package.json"), "utf8");
for (const forbidden of ["fill-real-image-slots.mjs", "apply-jayjay-images.mjs", "materialize-approved-visuals.mjs"]) {
  if (appPackage.includes(forbidden)) throw new Error(`Forbidden visual authority remains in build: ${forbidden}`);
}
for (const requiredStage of ["apply-exact-visual-map.mjs", "apply-full-background-experience.mjs", "fix-reagan-mobile.mjs", "validate-clean-build.mjs"]) {
  if (!appPackage.includes(requiredStage)) throw new Error(`Required clean build stage missing: ${requiredStage}`);
}
const exactPos = appPackage.indexOf("apply-exact-visual-map.mjs");
const layoutPos = appPackage.indexOf("apply-full-background-experience.mjs");
const mobilePos = appPackage.indexOf("fix-reagan-mobile.mjs");
const validatePos = appPackage.indexOf("validate-clean-build.mjs");
if (!(exactPos < layoutPos && layoutPos < mobilePos && mobilePos < validatePos)) throw new Error("Final build-stage order is not exact-map -> layout -> mobile -> validate");

for (const legacyPath of [
  path.join(root, "fill-real-image-slots.mjs"),
  path.join(root, "apply-jayjay-images.mjs"),
  path.join(root, "materialize-approved-visuals.mjs")
]) {
  if (await exists(legacyPath)) throw new Error(`Legacy visual file still exists: ${path.basename(legacyPath)}`);
}

const productionWorkflow = path.join(repoRoot, ".github", "workflows", "production-release.yml");
if (!await exists(productionWorkflow)) throw new Error("Manual production release workflow missing");
const workflow = await readFile(productionWorkflow, "utf8");
if (!workflow.includes("workflow_dispatch:")) throw new Error("Production workflow is not manually dispatched");
if (/\n\s*push\s*:/.test(workflow)) throw new Error("Production workflow still has a push trigger");
if (!workflow.includes("deploy_websites") || !workflow.includes("deploy_zed")) throw new Error("Independent production selections missing");
if (!workflow.includes("/domains/cryptobotz.cryptoworldz.xyz/nodejs")) throw new Error("Protected ZED destination not explicit in production workflow");

for (const oldWorkflow of ["website-images-direct.yml", "zed-direct.yml", "main.yml", "approve-production-once.yml"]) {
  if (await exists(path.join(repoRoot, ".github", "workflows", oldWorkflow))) throw new Error(`Obsolete production workflow still exists: ${oldWorkflow}`);
}

const staticDeploy = await readFile(path.join(repoRoot, ".github", "full-current-static-deploy.sh"), "utf8");
if (/cryptobotz|\/nodejs/.test(staticDeploy)) throw new Error("Static deploy script references protected ZED destination");

console.log(JSON.stringify({
  event: "clean_build_validation",
  result: "PASS",
  static_targets: productionTargets.length,
  generated_html_pages: totalPages,
  exact_visual_slots: totalVisualSlots,
  production_workflow: "MANUAL_ONLY_TWO_ISOLATED_JOBS",
  fleet
}, null, 2));
