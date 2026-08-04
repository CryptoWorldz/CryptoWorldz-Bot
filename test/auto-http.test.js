const crypto = require("crypto");
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { createAutoHttpApp, safeEqual } = require("../src/auto/http");
const { registerAutoMiniRoutes } = require("../src/auto/zed-router");

function signedInitData(user, botToken) {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: "test-query",
    user: JSON.stringify(user)
  });
  const check = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  params.set("hash", crypto.createHmac("sha256", secret).update(check).digest("hex"));
  return params.toString();
}

async function listen(app, t) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => server.close());
  return `http://127.0.0.1:${server.address().port}`;
}

test("Auto internal token comparison accepts exact values only", () => {
  assert.equal(safeEqual("same", "same"), true);
  assert.equal(safeEqual("wrong", "same"), false);
  assert.equal(safeEqual("short", "longer"), false);
  assert.equal(safeEqual(undefined, "same"), false);
});

test("Auto service rejects incorrect owner credentials and reports locked status", async (t) => {
  const repository = {
    getSettings: async () => ({ paused: true, emergency_stop: true }),
    listAllowlistedTokens: async () => [],
    recordSimulation: async () => ({ id: 1 }),
    setPaused: async ({ paused }) => ({ paused, emergency_stop: paused }),
    emergencyStop: async () => ({ paused: true, emergency_stop: true })
  };
  const app = createAutoHttpApp({
    config: { internalToken: "private-service-token", ownerTelegramId: "123" },
    repository
  });
  const base = await listen(app, t);

  const denied = await fetch(`${base}/internal/status`, {
    headers: { "x-auto-internal-token": "wrong", "x-owner-telegram-id": "123" }
  });
  assert.equal(denied.status, 403);

  const accepted = await fetch(`${base}/internal/status`, {
    headers: { "x-auto-internal-token": "private-service-token", "x-owner-telegram-id": "123" }
  });
  assert.equal(accepted.status, 200);
  const payload = await accepted.json();
  assert.equal(payload.status.mode, "safe_locked");
  assert.equal(payload.status.execution_enabled, false);
  assert.equal(payload.status.signing_enabled, false);
  assert.equal(payload.status.active_schedules, 0);
});

test("Zed Mini App Auto routes require signed primary-owner identity", async (t) => {
  const botToken = "123456:test-secret";
  const ownerId = 123;
  const app = express();
  app.use(express.json());
  const calls = [];
  const autoClient = {
    configured: () => true,
    status: async () => ({ ok: true, status: { mode: "safe_locked", execution_enabled: false } }),
    simulate: async (body) => { calls.push(body); return { ok: true, result: { execution_enabled: false } }; },
    pause: async () => ({ ok: true }),
    resumeSimulation: async () => ({ ok: true }),
    emergencyStop: async () => ({ ok: true })
  };
  registerAutoMiniRoutes({ app, config: { botToken, ownerTelegramId: String(ownerId) }, autoClient });
  const base = await listen(app, t);

  const unsigned = await fetch(`${base}/api/mini/auto/status`);
  assert.equal(unsigned.status, 401);

  const nonOwner = await fetch(`${base}/api/mini/auto/status`, {
    headers: { "x-telegram-init-data": signedInitData({ id: 999, first_name: "Admin" }, botToken) }
  });
  assert.equal(nonOwner.status, 403);

  const owner = await fetch(`${base}/api/mini/auto/status`, {
    headers: { "x-telegram-init-data": signedInitData({ id: ownerId, first_name: "Owner" }, botToken) }
  });
  assert.equal(owner.status, 200);
  assert.equal((await owner.json()).status.execution_enabled, false);

  const simulation = await fetch(`${base}/api/mini/auto/simulate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-init-data": signedInitData({ id: ownerId, first_name: "Owner" }, botToken)
    },
    body: JSON.stringify({ network: "solana", amount: 1 })
  });
  assert.equal(simulation.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].network, "solana");
});
