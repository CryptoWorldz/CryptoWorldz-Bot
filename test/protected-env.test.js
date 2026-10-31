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

test("recovers blank server credentials without overriding managed values or blank feature settings", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "zed-credentials-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, ".env");
  fs.writeFileSync(file, "SUPABASE_SERVICE_ROLE_KEY=file-server-key\nBOT_TOKEN=file-bot\nDIPSHIT_BOT_TOKEN=file-dipshit\nAUTO_INTERNAL_TOKEN=file-auto\n");
  const env = { ONEWORLDZ_ENV_FILE: file, SUPABASE_SERVICE_ROLE_KEY: "  ", BOT_TOKEN: "managed-bot", DIPSHIT_BOT_TOKEN: "", AUTO_INTERNAL_TOKEN: "" };
  loadProtectedEnvironment({ appRoot: root, env, home: root });
  assert.equal(env.SUPABASE_SERVICE_ROLE_KEY, "file-server-key");
  assert.equal(env.BOT_TOKEN, "managed-bot");
  assert.equal(env.DIPSHIT_BOT_TOKEN, "file-dipshit");
  assert.equal(env.AUTO_INTERNAL_TOKEN, "");
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


test("managed hbuilds release recovers permanent credentials without account HOME or USER", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "zed-hbuilds-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const domain = path.join(root, "domains", "cryptobotz.cryptoworldz.xyz");
  const protectedRoot = path.join(domain, "nodejs");
  const release = path.join(domain, "hbuilds", "current", "nodejs");
  fs.mkdirSync(protectedRoot, {recursive:true});
  fs.mkdirSync(release, {recursive:true});
  fs.writeFileSync(path.join(protectedRoot, ".env"), "SUPABASE_SERVICE_ROLE_KEY=server-fixture\nJUPITER_API_KEY=quote-fixture\n");
  fs.writeFileSync(path.join(release, ".env"), "SUPABASE_SERVICE_ROLE_KEY=\n");
  const env = {SUPABASE_SERVICE_ROLE_KEY: "", HOME:path.join(root,"runner"), USER:"runner"};
  loadProtectedEnvironment({appRoot:release, env, home:env.HOME});
  assert.equal(env.SUPABASE_SERVICE_ROLE_KEY, "server-fixture");
  assert.equal(env.JUPITER_API_KEY, "quote-fixture");
});
