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
  const home = path.join(root, "home", "account");
  const protectedDir = path.join(home, "domains", "cryptobotz.cryptoworldz.xyz", "nodejs");
  const release = path.join(protectedDir, ".builds", "release", "source");
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

test("candidate order prefers explicit override, then permanent protected root, then immutable release", () => {
  const env = { ONEWORLDZ_ENV_FILE: "/explicit/.env", HOME: "/runtime/home", USER: "account", LOGNAME: "account" };
  assert.deepEqual(candidateEnvironmentFiles({ appRoot: "/home/account/domains/cryptobotz.cryptoworldz.xyz/nodejs/.builds/release/source", env, home: "/home/account" }), [
    "/explicit/.env",
    "/home/account/domains/cryptobotz.cryptoworldz.xyz/nodejs/.env",
    "/home/account/domains/cryptobotz.cryptoworldz.xyz/nodejs/.builds/release/source/.env",
    "/runtime/home/domains/cryptobotz.cryptoworldz.xyz/nodejs/.env"
  ]);
});

for (const managedValue of ["", "   "]) {
  test(`restores blank managed Supabase and bot credentials (${JSON.stringify(managedValue)})`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "worldz-env-"));
    try {
      fs.writeFileSync(path.join(root, ".env"), "SUPABASE_SERVICE_ROLE_KEY=server-test-key\nDIPSHIT_BOT_TOKEN=test-dipshit\n");
      const env = { SUPABASE_SERVICE_ROLE_KEY: managedValue, DIPSHIT_BOT_TOKEN: managedValue, BOT_TOKEN: "test-zed" };
      loadProtectedEnvironment({ appRoot: root, env, home: root });
      const config = require("../src/config").loadConfig(env);
      assert.equal(config.usingServiceRole, true);
      assert.equal(config.supabaseApiKey, "server-test-key");
      assert.equal(config.dipshitBotToken, "test-dipshit");
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
}

test("server credential aliases match deployment preflight and outrank public keys", () => {
  for (const alias of ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY", "SUPABASE_SECRET_KEY"]) {
    const config = require("../src/config").loadConfig({
      BOT_TOKEN: "test-bot", SUPABASE_SERVICE_ROLE_KEY: " ",
      SUPABASE_PUBLISHABLE_KEY: "public-test-key", [alias]: "server-test-key"
    });
    assert.equal(config.usingServiceRole, true);
    assert.equal(config.supabaseApiKey, "server-test-key");
  }
});
