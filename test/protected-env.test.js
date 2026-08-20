const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { candidateEnvironmentFiles, loadProtectedEnvironment, parseEnvironment } = require("../src/protected-env");

test("parses quoted and exported environment values", () => {
  assert.deepEqual(parseEnvironment("A=one\nexport B='two'\n# C=no\n"), { A: "one", B: "two" });
});

test("finds the permanent Hostinger protected environment after an immutable build", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "oneworldz-env-"));
  const release = path.join(root, "hbuilds", "release", "source");
  const home = path.join(root, "home", "account");
  const protectedDir = path.join(home, "domains", "cryptobotz.cryptoworldz.xyz", "nodejs");
  fs.mkdirSync(release, { recursive: true });
  fs.mkdirSync(protectedDir, { recursive: true });
  fs.writeFileSync(path.join(protectedDir, ".env"), "OPENAI_API_KEY=proof-key\nBOT_TOKEN=proof-bot\n");
  const env = { HOME: home, OPENAI_API_KEY: "" };
  const result = loadProtectedEnvironment({ appRoot: release, env, home });
  assert.equal(result.loaded, true);
  assert.equal(result.source, "protected");
  assert.equal(env.OPENAI_API_KEY, "proof-key");
  assert.equal(env.BOT_TOKEN, "proof-bot");
  fs.rmSync(root, { recursive: true, force: true });
});

test("does not overwrite a nonblank managed OpenAI key", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "oneworldz-env-"));
  const file = path.join(root, ".env");
  fs.writeFileSync(file, "OPENAI_API_KEY=file-key\n");
  const env = { ONEWORLDZ_ENV_FILE: file, OPENAI_API_KEY: "managed-key" };
  loadProtectedEnvironment({ appRoot: root, env, home: root });
  assert.equal(env.OPENAI_API_KEY, "managed-key");
  fs.rmSync(root, { recursive: true, force: true });
});

test("candidate order prefers an explicit file, then release, then protected home", () => {
  const env = { ONEWORLDZ_ENV_FILE: "/explicit/.env", HOME: "/home/account" };
  assert.deepEqual(candidateEnvironmentFiles({ appRoot: "/release", env, home: "/home/account" }), [
    "/explicit/.env",
    "/release/.env",
    "/home/account/domains/cryptobotz.cryptoworldz.xyz/nodejs/.env"
  ]);
});
