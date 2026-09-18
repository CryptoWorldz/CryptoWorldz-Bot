const test = require("node:test");
const assert = require("node:assert/strict");
const { createHttpApp, safeTokenMatch } = require("../src/http");

test("constant-time token helper accepts only exact values", () => {
  assert.equal(safeTokenMatch("same-token", "same-token"), true);
  assert.equal(safeTokenMatch("wrong-token", "same-token"), false);
  assert.equal(safeTokenMatch("short", "longer-token"), false);
  assert.equal(safeTokenMatch(undefined, "token"), false);
});

test("Mini App page is served while protected data rejects unsigned browser IDs", async (t) => {
  const app = createHttpApp({
    bot: { sendMessage: async () => {}, processUpdate: async () => {} },
    repository: {},
    config: {
      botToken: "123456:secret",
      adminApiToken: "",
      allowedChatIds: new Set(),
      adminTelegramIds: new Set(),
      ownerTelegramId: "",
      webhookSecret: "webhook-secret",
      communityTelegramUrl: "",
      communityXUrl: "",
      communityAnnouncementsUrl: "",
      communitySupportUrl: "",
      communityWebsiteUrl: "https://CryptoWorldz.xyz",
      websiteUrl: "https://CryptoWorldz.xyz"
    }
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => server.close());
  const { port } = server.address();

  const page = await fetch(`http://127.0.0.1:${port}/miniapp/`);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get("cache-control"), "no-store, max-age=0");
  const miniAppPage = await page.text();
  assert.match(miniAppPage, /CryptoWorldz Command Centre/);
  assert.match(miniAppPage, /Real-World Impact/);
  assert.match(miniAppPage, /home-impact/);
  assert.match(miniAppPage, /\.payment-qr\[hidden\]\{display:none\}/);

  const miniAppScript = await fetch(`http://127.0.0.1:${port}/miniapp/app.js`);
  assert.equal(miniAppScript.status, 200);
  const miniAppSource = await miniAppScript.text();
  assert.match(miniAppSource, /Copy.*Address/);
  assert.match(miniAppSource, /Copy Payment Request/);
  assert.match(miniAppSource, /navigator\.clipboard\.writeText/);
  assert.match(miniAppSource, /governance-vote/);
  assert.match(miniAppSource, /\/api\/mini\/governance\/\$\{vote\.dataset\.proposalId\}\/vote/);
  assert.match(miniAppSource, /selected_option/);
  assert.match(miniAppSource, /Help Reagan & Children in Uganda/);
  assert.match(miniAppSource, /https:\/\/donateworldz\.com\/reagan-children\//);
  assert.doesNotMatch(miniAppSource, /gofund(?:me)?\.com|gofund\.me/i);
  assert.match(miniAppSource, /does not award Legend Points based on donation amounts/);
  assert.doesNotMatch(miniAppSource, /wallet\.href/);

  const protectedResponse = await fetch(`http://127.0.0.1:${port}/api/mini/bootstrap`, {
    headers: { "X-Telegram-Init-Data": "user=%7B%22id%22%3A8029135300%7D" }
  });
  assert.equal(protectedResponse.status, 401);
  assert.equal((await protectedResponse.json()).error, "invalid_signature");
});