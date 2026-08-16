import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const one = path.join(root, "dist", "ecosystem", "oneworldz");

test("OneWorldz contains a dedicated Community Support page linked from home", async () => {
  const home = await readFile(path.join(one, "index.html"), "utf8");
  const page = await readFile(path.join(one, "community-support", "index.html"), "utf8");
  assert.match(home, /href="\/community-support\/"/);
  assert.match(page, /35 verified support links/i);
  assert.match(page, /public\.oneworldz_support_profiles/);
  assert.doesNotMatch(page, /Facebook Support Profile\s*0?\d+/i);
});

test("Community Support renderer requires all 35 ordered registry entries and never invents replacements", async () => {
  const js = await readFile(path.join(one, "assets", "js", "community-support.js"), "utf8");
  assert.match(js, /api\/oneworldz-community-support/);
  assert.match(js, /payload\.count !== 35/);
  assert.match(js, /new Set\(profiles\.map/);
  assert.match(js, /will not invent missing profiles, names or links/i);
  assert.doesNotMatch(js, /Facebook Support Profile\s*0?\d+/i);
});

test("OneWorldz final identity is blue and white with the Little Legend future-scholar visual", async () => {
  const home = await readFile(path.join(one, "index.html"), "utf8");
  assert.match(home, /oneworldz-blue-white/);
  assert.match(home, /--accent:#4da3ff;--accent-2:#ffffff/);
  assert.match(home, /little-legend\.webp/);
});
