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

buildTest("approved expansion visuals are materialized into all three release packages", async () => {
  for (const key of specs) {
    const root = path.join(distRoot, key);
    const desktopPath = path.join(root, "assets", "approved", "desktop", `${key}-hero.avif`);
    const mobilePath = path.join(root, "assets", "approved", "mobile", `${key}-hero.avif`);
    const desktop = await readFile(desktopPath);
    const mobile = await readFile(mobilePath);

    assert.ok(isAvif(desktop), `${key} desktop visual must be AVIF`);
    assert.ok(desktop.byteLength > 2_000, `${key} approved visual must not be empty or placeholder-sized`);
    assert.deepEqual(desktop, mobile, `${key} mobile path must preserve the exact approved master until a separate mobile crop is approved`);

    const homepage = await readFile(path.join(root, "index.html"), "utf8");
    assert.match(homepage, new RegExp(`data-approved-visual="${key}"`));
    assert.match(homepage, new RegExp(`/assets/approved/desktop/${key}-hero\\.avif`));
    assert.match(homepage, new RegExp(`/assets/approved/mobile/${key}-hero\\.avif`));

    const release = JSON.parse(await readFile(path.join(root, "release-manifest.json"), "utf8"));
    assert.equal(release.approved_visual.key, key);
    assert.ok(release.files.some(({ path: file }) => file === `/assets/approved/desktop/${key}-hero.avif`));
    assert.ok(release.files.some(({ path: file }) => file === `/assets/approved/mobile/${key}-hero.avif`));
  }
});

buildTest("approved visual manifest records explicit JayJayTeamDev approval and no reference-library substitution", async () => {
  const manifest = JSON.parse(await readFile(path.join(distRoot, "approved-visuals-manifest.json"), "utf8"));
  assert.equal(manifest.stage, "FINAL_APPROVED_VISUAL_MATERIALIZATION");
  assert.equal(manifest.approved_by, "JayJayTeamDev");
  assert.equal(manifest.source_policy, "APPROVED_GENERATED_ARTWORK_ONLY");
  assert.equal(manifest.reference_library_substitution, false);
  assert.deepEqual(manifest.visuals.map(({ key }) => key), specs);
  for (const visual of manifest.visuals) {
    assert.equal(visual.format, "avif");
    assert.match(visual.sha256, /^[a-f0-9]{64}$/);
    assert.ok(visual.bytes > 2_000);
  }
});
