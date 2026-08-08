import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config.mjs";
import { createApp, secretMatches } from "../src/server.mjs";

function fixture() {
  const handledUpdates = [];
  const config = loadConfig({
    TELEGRAM_BOT_TOKEN: "telegram-token-sensitive",
    TELEGRAM_WEBHOOK_SECRET: "webhook-secret-sensitive",
    OWNER_TELEGRAM_ID: "123",
    OWNER_API_SECRET: "owner-api-secret-sensitive",
    GRACE_X_CLIENT_ID: "x-client-sensitive",
    GRACE_X_CLIENT_SECRET: "x-secret-sensitive",
    GRACE_TOKEN_ENCRYPTION_KEY: "test-only-encryption-key-that-is-at-least-32-chars",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-sensitive",
  });
  const repository = {
    getStatus: async () => ({
      workspace: { slug: "cryptoworldz" },
      settings: {
        posting_enabled: false,
        paused: false,
        emergency_stop: false,
        approval_required: true,
      },
      counts: { pending: 1, scheduled: 0, failed: 0 },
    }),
  };
  const graceX = {
    completeConnection: async ({ state, code }) => {
      if (state !== "valid" || code !== "code") {
        const error = new Error("This X connection link is invalid, expired or already used.");
        error.code = "X_OAUTH_STATE_INVALID";
        throw error;
      }
      return { user: { username: "CryptoWorldzX" } };
    },
  };
  const telegram = {
    handleUpdate: async (update) => handledUpdates.push(update),
  };
  const auto = {
    status: async () => ({
      settings: { enabled: false, wallet_connected: false },
      counts: { active: 0 },
      buy_only: true,
      selling_enabled: false,
    }),
  };
  const app = createApp({
    config,
    repository,
    graceX,
    telegram,
    auto,
    logger: { warn: () => {}, error: () => {} },
  });
  return { app, config, handledUpdates };
}

async function serve(app) {
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("constant-time secret comparison rejects empty and incorrect values", () => {
  assert.equal(secretMatches("same", "same"), true);
  assert.equal(secretMatches("wrong", "same"), false);
  assert.equal(secretMatches("", "same"), false);
  assert.equal(secretMatches("same", ""), false);
});

test("public health reports exact callback and readiness without any secret", async (t) => {
  const { app, config } = fixture();
  const runtime = await serve(app);
  t.after(runtime.close);
  const response = await fetch(`${runtime.baseUrl}/grace/health`);
  assert.equal(response.status, 200);
  const text = await response.text();
  const payload = JSON.parse(text);
  assert.equal(
    payload.grace.exact_redirect_uri,
    "https://cryptobotz.cryptoworldz.xyz/grace/oauth/x/callback",
  );
  assert.equal(payload.auto.selling_enabled, false);
  for (const secret of [
    config.telegramBotToken,
    config.telegramWebhookSecret,
    config.ownerApiSecret,
    config.graceXClientId,
    config.graceXClientSecret,
    config.graceTokenEncryptionKey,
    config.supabaseServiceRoleKey,
  ]) {
    assert.ok(!text.includes(secret));
  }
});

test("only the exact X callback route completes Grace connection", async (t) => {
  const { app } = fixture();
  const runtime = await serve(app);
  t.after(runtime.close);
  const success = await fetch(
    `${runtime.baseUrl}/grace/oauth/x/callback?state=valid&code=code`,
  );
  assert.equal(success.status, 200);
  assert.match(await success.text(), /Grace is connected/);

  const wrongRoute = await fetch(`${runtime.baseUrl}/grace/?state=valid&code=code`);
  assert.equal(wrongRoute.status, 404);

  const reused = await fetch(
    `${runtime.baseUrl}/grace/oauth/x/callback?state=expired&code=code`,
  );
  assert.equal(reused.status, 400);
  assert.match(await reused.text(), /invalid, expired or already used/);
});

test("Telegram webhook requires its secret header before processing", async (t) => {
  const { app, config, handledUpdates } = fixture();
  const runtime = await serve(app);
  t.after(runtime.close);
  const update = { update_id: 1, message: { text: "/start" } };
  const denied = await fetch(`${runtime.baseUrl}/telegram-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  assert.equal(denied.status, 401);
  assert.equal(handledUpdates.length, 0);

  const accepted = await fetch(`${runtime.baseUrl}/telegram-webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": config.telegramWebhookSecret,
    },
    body: JSON.stringify(update),
  });
  assert.equal(accepted.status, 200);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(handledUpdates, [update]);
});

test("owner status is private and sanitized", async (t) => {
  const { app, config } = fixture();
  const runtime = await serve(app);
  t.after(runtime.close);
  const denied = await fetch(`${runtime.baseUrl}/api/owner/status`);
  assert.equal(denied.status, 401);
  const allowed = await fetch(`${runtime.baseUrl}/api/owner/status`, {
    headers: { Authorization: `Bearer ${config.ownerApiSecret}` },
  });
  assert.equal(allowed.status, 200);
  const text = await allowed.text();
  const payload = JSON.parse(text);
  assert.equal(payload.grace.approval_required, true);
  assert.equal(payload.auto.buy_only, true);
  assert.ok(!text.includes(config.ownerApiSecret));
});
