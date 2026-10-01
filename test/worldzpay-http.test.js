"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { registerWorldzPayRoutes } = require("../src/worldzpay-http");

function harness() {
  const routes = { get: new Map(), post: new Map() };
  const app = {
    get(path, handler) { routes.get.set(path, handler); },
    post(path, handler) { routes.post.set(path, handler); }
  };
  function response() {
    return {
      statusCode: 200,
      payload: null,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.payload = payload; return this; }
    };
  }
  registerWorldzPayRoutes({ app });
  return { routes, response };
}

test("status route exposes simulation-only WorldzPay state", () => {
  const { routes, response } = harness();
  const res = response();
  routes.get.get("/api/worldzpay/status")({}, res);
  assert.equal(res.payload.ok, true);
  assert.equal(res.payload.worldzpay.liveFundsEnabled, false);
  assert.equal(res.payload.worldzpay.xMoney.liveEnabled, false);
});

test("intent preview serializes bigint fields safely and never enables live funds", () => {
  const { routes, response } = harness();
  const res = response();
  routes.post.get("/api/worldzpay/intent-preview")({ body: {
    sourceId: "community_suite_own",
    method: "x_money",
    fiatCurrency: "AUD",
    fiatAmountMinor: 20000,
    settlementAsset: "SOL",
    customerRef: "api-test",
    idempotencyKey: "api-test-1"
  } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.intent.fiatAmountMinor, "20000");
  assert.equal(res.payload.intent.liveFundsEnabled, false);
});

test("settlement preview returns protected accrue-only ledger", () => {
  const { routes, response } = harness();
  const res = response();
  routes.post.get("/api/worldzpay/settlement-preview")({ body: {
    sourceId: "community_suite_own",
    settlementAsset: "SOL",
    netRevenueRaw: "10000000000"
  } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.preview.legacyCoreRouting, "accrue_only");
  assert.equal(res.payload.preview.legacyCore.legacyCorePoolLamports, "1500000000");
  assert.equal(res.payload.preview.liveTransfersEnabled, false);
});
