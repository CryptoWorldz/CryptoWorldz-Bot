const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "full-runtime-entry.js"), "utf8");

test("ZED restart reuses an already-authorized Supabase runtime bridge before Telegram bootstrap", () => {
  const authIndex = source.indexOf("await supabaseRuntimeAuthorized(config)");
  const bootstrapIndex = source.indexOf('/rest/v1/rpc/zed_runtime_bootstrap');
  assert.ok(authIndex >= 0, "authorization preflight missing");
  assert.ok(bootstrapIndex > authIndex, "bootstrap must happen only after authorization preflight");
  assert.match(source, /x-zed-runtime-key[^\n]+zedRuntimeKey\(config\.botToken\)/s);
});

test("ZED verifies bridge authorization after fallback bootstrap", () => {
  assert.match(source, /if \(!\(await supabaseRuntimeAuthorized\(config\)\)\)[\s\S]*authorization failed after bootstrap/);
});

test("Supabase client uses the same derived runtime key", () => {
  assert.match(source, /supabaseOptions\.global[\s\S]*"x-zed-runtime-key": zedRuntimeKey\(config\.botToken\)/);
});
