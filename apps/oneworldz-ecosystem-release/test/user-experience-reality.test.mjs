import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { experienceContract } from "../experience-contract.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const dist = path.join(appRoot, "dist", "ecosystem");
const require = createRequire(import.meta.url);
const { commandsForRole } = require(path.join(repoRoot, "src", "command-registry.js"));
const read = (file) => readFile(file, "utf8");

test("unique MiniApp SplashBack and complete participant screens are present", async () => {
  const html = await read(path.join(repoRoot, "public", "miniapp", "index.html"));
  assert.ok(html.includes('id="splashback"'));
  assert.ok(html.includes("Command Centre <span>Ultimate™</span>"));
  for (const leader of experienceContract.protectedMiniApp.systemLeaders) assert.ok(html.includes(leader), `SplashBack missing ${leader}`);
  for (const id of ["missions", "zed-guide", "create", "heroes", "admin-review"]) assert.ok(html.includes(`id="${id}"`), `MiniApp missing ${id}`);
  assert.ok(html.includes("/miniapp/experience.css"));
  assert.ok(html.includes("/miniapp/experience.js"));
});

test("signed-in ZED guide can access mission context and participant experience APIs", async () => {
  const guide = await read(path.join(repoRoot, "src", "zed-guide.js"));
  const ux = await read(path.join(repoRoot, "src", "user-experience.js"));
  assert.ok(guide.includes('/api/mini/zed/chat'));
  assert.ok(guide.includes("repository.listActiveMissions()"));
  assert.ok(guide.includes("SIGNED PARTICIPANT CONTEXT JSON"));
  for (const token of ["/api/mini/referral-progress", "/api/mini/creator/draft", "/api/mini/creator/image", "/api/mini/creator/submit", "/api/mini/heroes/apply", "/api/mini/admin/creator", "/api/mini/admin/heroes"]) assert.ok(ux.includes(token), `participant API missing ${token}`);
  assert.ok(ux.includes("60 * 60 * 1000"), "hourly review digest missing");
  assert.ok(ux.includes("Nothing is auto-approved"));
});

test("current donation experience uses DonateWorldz and legacy GoFundMe MiniApp route is gone", async () => {
  const app = await read(path.join(repoRoot, "public", "miniapp", "app.js"));
  const impact = await read(path.join(repoRoot, "src", "current-impact.js"));
  assert.ok(app.includes("https://donateworldz.com/reagan-children/"));
  assert.ok(impact.includes("https://donateworldz.com/reagan-children/"));
  assert.doesNotMatch(app, /gofund\.me|gofundme/i);
  assert.doesNotMatch(impact, /gofund\.me|gofundme/i);
});

test("current impact handler wins before the legacy Telegram module and public Hero CORS is narrow", async () => {
  const runtime = await read(path.join(repoRoot, "src", "full-runtime-entry.js"));
  const currentAt = runtime.indexOf("registerCurrentImpactHandlers({ bot })");
  const legacyAt = runtime.indexOf("registerTelegramHandlers({ bot, repository, config })");
  assert.ok(currentAt >= 0 && legacyAt > currentAt, "current DonateWorldz command route must register before legacy Telegram handlers");
  const cors = await read(path.join(repoRoot, "src", "oneworldz-public-cors.js"));
  assert.ok(cors.includes("https://oneworldz.com"));
  assert.doesNotMatch(cors, /Access-Control-Allow-Origin[^\n]*\*/);
});

test("Command Centre registry exposes Creator, Heroes and human Review Queue by role", () => {
  const member = new Set(commandsForRole("member").map((x) => x.command));
  const admin = new Set(commandsForRole("admin").map((x) => x.command));
  assert.ok(member.has("creator"));
  assert.ok(member.has("heroes"));
  assert.ok(member.has("supportreagan"));
  assert.ok(admin.has("reviewqueue"));
  assert.ok(!member.has("reviewqueue"));
});

test("OneWorldz Heroes is a real canonical page inside the sitemap and direct-page tree", async () => {
  const html = await read(path.join(dist, "oneworldz", "heroes", "index.html"));
  assert.ok(html.includes("OneWorldz Heroes | Real-World Action & Recognition"));
  assert.ok(html.includes("Evidence → Human Review → Recognition"));
  assert.ok(html.includes("/assets/js/heroes.js"));
  const heroesJs = await read(path.join(dist, "oneworldz", "assets", "js", "heroes.js"));
  assert.ok(heroesJs.includes("https://cryptobotz.cryptoworldz.xyz/api/public/heroes"));
  assert.ok(heroesJs.includes('location.hostname === "oneworldz.com"'));
  assert.ok(heroesJs.includes('location.hostname === "www.oneworldz.com"'));
  const sitemap = await read(path.join(dist, "oneworldz", "sitemap.xml"));
  assert.ok(sitemap.includes("https://oneworldz.com/heroes/"));
  const siteTree = JSON.parse(await read(path.join(dist, "oneworldz", "site-tree.json")));
  assert.ok(siteTree.routes.some((x) => x.route === "/heroes/"));
  const fleetTree = JSON.parse(await read(path.join(dist, "user-structure-tree.json")));
  const one = fleetTree.hosts.find((x) => x.host === "oneworldz.com");
  assert.ok(one?.routes?.some((x) => x.route === "/heroes/"));
});

test("distinct theme contract is physically applied to the destinations that needed stronger identities", async () => {
  const required = ["oneworldz", "cryptoworldz", "purplediamondcrew", "impactbased", "law-oneworldz", "learn-oneworldz", "foodworldz", "donateworldz", "hodlergalaxy", "hodlerworldz"];
  for (const key of required) {
    assert.ok(experienceContract.themes[key], `theme contract missing ${key}`);
    const css = await read(path.join(dist, key, "assets", "css", "experience-theme.css"));
    assert.ok(css.includes(experienceContract.themes[key].accent));
    const home = await read(path.join(dist, key, "index.html"));
    assert.ok(home.includes("experience-theme"), `${key}: experience theme class missing`);
    assert.ok(home.includes("/assets/css/experience-theme.css"), `${key}: experience theme CSS missing`);
  }
});

test("canonical build orders public experience before structural discovery and themes after it", async () => {
  const pkg = JSON.parse(await read(path.join(appRoot, "package.json")));
  const build = pkg.scripts.build;
  const experienceAt = build.indexOf("build-experience.mjs");
  const structureAt = build.indexOf("finalize-user-structure.mjs");
  const themesAt = build.indexOf("finalize-themes.mjs");
  assert.ok(experienceAt >= 0 && structureAt > experienceAt && themesAt > structureAt);
});

test("experience contract preserves human approval and pre-existing real-world Hero recognition", () => {
  assert.equal(experienceContract.protectedMiniApp.creatorAutoPublish, false);
  assert.equal(experienceContract.protectedMiniApp.heroAutoPublish, false);
  assert.equal(experienceContract.protectedMiniApp.hourlyHumanReview, true);
  assert.equal(experienceContract.heroes.preExistingRealWorldWorkAllowed, true);
});
