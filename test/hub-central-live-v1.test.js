const assert = require("node:assert/strict");
const test = require("node:test");
const {
  OWNED_DOMAINS,
  ONEWORLDZ_PUBLIC_GPT_GUARD,
  hubHtml,
  normalizeGuideHistory,
  normalizeOwnedDomain,
  registerHubCentralLive
} = require("../src/hub-central/live-v1");

test("live compatibility register contains exactly 19 approved destinations", () => {
  assert.equal(OWNED_DOMAINS.length, 19);
  assert.equal(OWNED_DOMAINS.includes("impactbased.cryptoworldz.xyz"), true);
  assert.equal(OWNED_DOMAINS.includes("impactbased.oneworldz.com"), false);
  assert.equal(OWNED_DOMAINS.some((domain) => domain.includes("bitcoin")), false);
});

test("live compatibility diagnostics reject domains outside the OneWorldz register", () => {
  assert.equal(normalizeOwnedDomain("DonateWorldz.com."), "donateworldz.com");
  assert.throws(() => normalizeOwnedDomain("example.com"), /domain_not_in_oneworldz_register/);
});

test("legacy live public GPT is hard locked to the low-cost guard", () => {
  assert.deepEqual(ONEWORLDZ_PUBLIC_GPT_GUARD, {
    profile: "oneworldz-public-low-cost-v1",
    model: "gpt-5.6-luna",
    maxOutputTokens: 320,
    perIpLimit: 8,
    dailyLimit: 1000
  });
  const history = normalizeGuideHistory([
    { role: "user", content: "one" },
    { role: "assistant", content: "two" },
    { role: "user", content: "three" },
    { role: "assistant", content: "four" },
    { role: "user", content: "five" }
  ]);
  assert.equal(history.length, 4);
  assert.equal(history[0].content, "two");
});

test("live compatibility UI contains the locked OneWorldz Full Support and OneWorldz GPT identity", () => {
  const html = hubHtml();
  assert.match(html, /OneWorldz Hub Central \| Full Support/);
  assert.match(html, /ONEWORLDZ 🌐 FULL SUPPORT™/);
  assert.match(html, /ONEWORLDZ GPT/);
  assert.match(html, /server-side OpenAI key/i);
  assert.match(html, /low-cost guard/i);
});

test("live compatibility module registers additive Hub Central and OneWorldz GPT routes", () => {
  const registrations = [];
  const app = {
    get(path, handler) { registrations.push(["GET", path, handler]); },
    post(path, handler) { registrations.push(["POST", path, handler]); },
    options(path, handler) { registrations.push(["OPTIONS", path, handler]); },
    use(path, handler) { registrations.push(["USE", path, handler]); }
  };
  registerHubCentralLive(app);

  assert.deepEqual(registrations.map(([method, path]) => `${method} ${path}`), [
    "GET /hub-central",
    "GET /api/hub-central/status",
    "GET /api/hub-central/public-dns",
    "USE /api/oneworldz-gpt",
    "OPTIONS /api/oneworldz-gpt/*",
    "GET /api/oneworldz-gpt/status",
    "POST /api/oneworldz-gpt/chat"
  ]);
  assert.equal(registrations.every(([, , handler]) => typeof handler === "function"), true);
});
