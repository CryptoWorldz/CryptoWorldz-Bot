import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { perfectPlan } from "../perfect-plan.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

for (const key of ["oneworldz", "donateworldz"]) {
  test(`${key} includes OneWorldz GPT browser assets and approved reference artwork`, async () => {
    const packageRoot = path.join(root, "dist", "ecosystem", key);
    const html = await readFile(path.join(packageRoot, "index.html"), "utf8");
    const js = await readFile(path.join(packageRoot, "assets", "js", "oneworldz-gpt.js"), "utf8");
    assert.match(html, /\/assets\/css\/oneworldz-gpt\.css/);
    assert.match(html, /\/assets\/js\/oneworldz-gpt\.js/);
    assert.match(js, /\/assets\/oneworldz-gpt\/oneworldz-gpt\.png/);
    const artwork = await stat(path.join(packageRoot, "assets", "oneworldz-gpt", "oneworldz-gpt.png"));
    assert.ok(artwork.size > 100000, `${key}: OneWorldz GPT reference artwork must be present and non-trivial`);
  });
}

test("public bundle never contains the OpenAI API key variable", async () => {
  const js = await readFile(path.join(root, "dist", "ecosystem", "oneworldz", "assets", "js", "oneworldz-gpt.js"), "utf8");
  assert.doesNotMatch(js, /OPENAI_API_KEY|sk-proj-|Bearer\s+sk-/i);
});

test("perfect plan locks the two public AI surfaces and protected endpoint", () => {
  assert.deepEqual(perfectPlan.openAI.publicGuideSurfaces, ["https://oneworldz.com", "https://donateworldz.com"]);
  assert.equal(perfectPlan.openAI.publicApi, "https://cryptobotz.cryptoworldz.xyz/api/oneworldz-gpt/chat");
});
