import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(appRoot, "dist", "ecosystem");
let distBuilt = true;
try {
  await access(distRoot);
} catch {
  distBuilt = false;
}

const buildTest = (name, fn) => test(name, { skip: !distBuilt }, fn);
const specs = ["foodworldz", "donateworldz", "hodlergalaxy"];

function isAvif(bytes) {
  return bytes.length > 16
    && bytes.subarray(4, 8).toString("ascii") === "ftyp"
    && bytes.subarray(8, 12).toString("ascii") === "avif";
}

buildTest("approved expansion visuals are materialized into distinct desktop and mobile release assets", async () => {
  for (const key of specs) {
    const root = path.join(distRoot, key);
    const desktopPath = path.join(root, "assets", "approved", "desktop", `${key}-hero.avif`);
    const mobilePath = path.join(root, "assets", "approved", "mobile", `${key}-hero.avif`);
    const desktop = await readFile(desktopPath);
    const mobile = await readFile(mobilePath);

    assert.ok(isAvif(desktop), `${key} desktop visual must be AVIF`);
    assert.ok(isAvif(mobile), `${key} mobile visual must be AVIF`);
    assert.ok(desktop.byteLength > 2_000, `${key} desktop visual must not be placeholder-sized`);
    assert.ok(mobile.byteLength > 2_000, `${key} mobile visual must not be placeholder-sized`);
    assert.notDeepEqual(desktop, mobile, `${key} desktop and mobile production renders must be distinct`);

    const homepage = await readFile(path.join(root, "index.html"), "utf8");
    assert.match(homepage, new RegExp(`data-approved-visual="${key}"`));
    assert.match(homepage, new RegExp(`/assets/approved/desktop/${key}-hero\\.avif`));
    assert.match(homepage, new RegExp(`/assets/approved/mobile/${key}-hero\\.avif`));

    const release = JSON.parse(await readFile(path.join(root, "release-manifest.json"), "utf8"));
    assert.equal(release.approved_visual.key, key);
    assert.equal(release.approved_visual.responsive_policy, "distinct-production-renders");
    assert.ok(release.files.some(({ path: file }) => file === `/assets/approved/desktop/${key}-hero.avif`));
    assert.ok(release.files.some(({ path: file }) => file === `/assets/approved/mobile/${key}-hero.avif`));
  }
});

buildTest("approved visual manifest records owner approval, production-only sources and no reference-library substitution", async () => {
  const manifest = JSON.parse(await readFile(path.join(distRoot, "approved-visuals-manifest.json"), "utf8"));
  assert.equal(manifest.stage, "FINAL_APPROVED_VISUAL_MATERIALIZATION");
  assert.equal(manifest.approved_by, "JayJayTeamDev");
  assert.equal(manifest.source_policy, "APPROVED_GENERATED_PRODUCTION_ASSETS_ONLY");
  assert.equal(manifest.reference_library_policy, "REFERENCE_ONLY_NEVER_DEPLOY");
  assert.equal(manifest.reference_library_substitution, false);
  assert.equal(manifest.responsive_policy, "DISTINCT_DESKTOP_AND_MOBILE_PRODUCTION_RENDERS");
  assert.deepEqual(manifest.visuals.map(({ key }) => key), specs);

  for (const visual of manifest.visuals) {
    assert.equal(visual.format, "avif");
    assert.match(visual.desktop.sha256, /^[a-f0-9]{64}$/);
    assert.match(visual.mobile.sha256, /^[a-f0-9]{64}$/);
    assert.notEqual(visual.desktop.sha256, visual.mobile.sha256);
    assert.ok(visual.desktop.bytes > 2_000);
    assert.ok(visual.mobile.bytes > 2_000);
    assert.equal(visual.responsive_policy, "distinct-desktop-and-mobile-production-renders");
  }

  const donate = manifest.visuals.find(({ key }) => key === "donateworldz");
  assert.equal(donate.source_mode, "approved-support-composite");
  assert.deepEqual(donate.desktop_source_assets, [
    "desktop/reagan-children-emblem-desktop.webp",
    "desktop/community-impact-emblem-desktop.webp",
    "desktop/jayjayteamdev-emblem-desktop.webp"
  ]);
  assert.deepEqual(donate.mobile_source_assets, [
    "mobile/reagan-children-emblem-mobile.webp",
    "mobile/community-impact-emblem-mobile.webp",
    "mobile/jayjayteamdev-emblem-mobile.webp"
  ]);
});