import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config.mjs";
import { createTelegramController } from "../src/telegram.mjs";

function makeController(overrides = {}) {
  const sent = [];
  const calls = [];
  const config = loadConfig({
    TELEGRAM_BOT_TOKEN: "test-bot-token",
    TELEGRAM_WEBHOOK_SECRET: "webhook-secret",
    OWNER_TELEGRAM_ID: "123",
    GRACE_X_CLIENT_ID: "client",
    GRACE_X_CLIENT_SECRET: "secret",
    GRACE_TOKEN_ENCRYPTION_KEY: "test-only-encryption-key-that-is-at-least-32-chars",
  });
  const repository = {
    getStatus: async () => ({
      settings: {
        posting_enabled: false,
        paused: false,
        emergency_stop: false,
        approval_required: true,
      },
      counts: { pending: 0, scheduled: 0, failed: 0 },
    }),
    getXAccount: async () => ({ id: 1, handle: "CryptoWorldzX" }),
    getConnection: async () => null,
    setPostingEnabled: async (...args) => calls.push(["posting", ...args]),
    pauseAll: async (...args) => calls.push(["pause", ...args]),
    resumeAll: async (...args) => calls.push(["resume", ...args]),
    queueApproval: async ({ accountId, body }) => ({
      post: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", body },
      account: { id: accountId, handle: "CryptoWorldzX" },
    }),
    approvePost: async (id) => ({ id }),
    ...overrides.repository,
  };
  const graceX = {
    beginConnection: async (accountId) => ({
      account: { id: accountId, handle: "@CryptoWorldzX" },
      authorizationUrl: "https://x.com/i/oauth2/authorize?state=one-use",
    }),
    ...overrides.graceX,
  };
  const auto = {
    status: async () => ({
      settings: {
        enabled: false,
        execution_enabled: false,
        paused: true,
        emergency_stop: true,
        wallet_connected: false,
      },
      counts: { active: 0 },
    }),
    ...overrides.auto,
  };
  const fetchImpl = async (url, options) => {
    const body = JSON.parse(options.body);
    sent.push({ url: String(url), body });
    return new Response(JSON.stringify({ ok: true, result: { message_id: sent.length } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const controller = createTelegramController({
    config,
    repository,
    graceX,
    auto,
    fetchImpl,
    logger: { error: () => {} },
  });
  return { calls, config, controller, sent };
}

function update(text, from = 123) {
  return { message: { text, from: { id: from }, chat: { id: 999 } } };
}

test("Zed introduces the complete identity and correct Raaiiidd spelling", async () => {
  const { controller, sent } = makeController();
  await controller.handleUpdate(update("/start", 456));
  assert.match(sent[0].body.text, /^ZED/m);
  assert.match(sent[0].body.text, /OneWorldz 🌏 One Vision/);
  assert.match(sent[0].body.text, /CryptoWorldz 🌏 One Mission/);
  assert.match(sent[0].body.text, /Raaiiidd/);
});

test("Zed blocks every owner control for a different Telegram user", async () => {
  const { calls, controller, sent } = makeController();
  await controller.handleUpdate(update("/gracepause", 456));
  assert.deepEqual(calls, []);
  assert.match(sent.at(-1).body.text, /restricted to JayJayTeamDev/);
});

test("Zed creates one fresh X button for the exact approved handle", async () => {
  const { controller, sent } = makeController();
  await controller.handleUpdate(update("/connectx 1"));
  const message = sent.at(-1).body;
  assert.match(message.text, /Expected account: @CryptoWorldzX/);
  assert.match(message.text, /expires in 10 minutes/);
  assert.equal(
    message.reply_markup.inline_keyboard[0][0].url,
    "https://x.com/i/oauth2/authorize?state=one-use",
  );
});

test("Zed keeps a queued X post pending until a separate approval command", async () => {
  const { controller, sent } = makeController();
  await controller.handleUpdate(update("/gracequeue 1 | OneWorldz 🌏 One Vision"));
  assert.match(sent.at(-1).body.text, /PENDING APPROVAL — nothing has published/);
  assert.match(sent.at(-1).body.text, /graceapprove aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/);
  await controller.handleUpdate(
    update("/graceapprove aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
  );
  assert.match(sent.at(-1).body.text, /GRACE APPROVAL RECORDED/);
});

test("Zed's Auto status promises no selling, secrets or artificial volume", async () => {
  const { controller, sent } = makeController();
  await controller.handleUpdate(update("/autostatus"));
  const text = sent.at(-1).body.text;
  assert.match(text, /Mode: BUY ONLY/);
  assert.match(text, /Selling: NO/);
  assert.match(text, /Private keys accepted here: NO/);
  assert.match(text, /Multi-wallet\/artificial volume: NO/);
});

test("Zed publishes the current OneWorldz and Action Spread Smiles routes", async () => {
  const { config, controller, sent } = makeController();
  await controller.handleUpdate(update("/websites", 456));
  const text = sent.at(-1).body.text;
  assert.match(text, /Action Spread Smiles Organisation/);
  assert.match(text, /reagan-kauja/);
  assert.match(text, /\/donate/);
  assert.ok(text.includes(config.oneWorldzSiteUrl));
});
