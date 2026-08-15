const assert = require("node:assert/strict");
const test = require("node:test");
const {
  OWNED_DOMAINS,
  hubHtml,
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

test("live compatibility UI contains the locked OneWorldz Full Support identity", () => {
  const html = hubHtml();
  assert.match(html, /OneWorldz Hub Central \| Full Support/);
  assert.match(html, /ONEWORLDZ 🌐 FULL SUPPORT™/);
  assert.match(html, /HOSTINGER WRITES/);
  assert.match(html, /SECURE AUTH PENDING/);
});

test("live compatibility module registers only additive GET routes", () => {
  const routes = [];
  const app = { get(path, handler) { routes.push([path, handler]); } };
  registerHubCentralLive(app);
  assert.deepEqual(routes.map(([path]) => path), [
    "/hub-central",
    "/api/hub-central/status",
    "/api/hub-central/public-dns"
  ]);
  assert.equal(routes.every(([, handler]) => typeof handler === "function"), true);
});
