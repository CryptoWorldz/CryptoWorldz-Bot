const GRACE_X_OAUTH_COMMANDS = [
  { command: "connectx", description: "Connect an approved X account to Grace" },
  { command: "connectallx", description: "Show every X account still waiting for Grace" },
  { command: "gracex", description: "Alias for the Grace X connection" },
  { command: "gracestatus", description: "Owner: check the live Grace X runtime" }
];

// This build marker is intentionally visible through /gracestatus for live deployment verification.
const GRACE_X_RUNTIME_BUILD = "Grace X Multi-Account Connector 2026-09-24.1";

function registerGraceXOAuthTelegramHandlers({ bot, graceOAuth, config }) {
  const send = (msg, text, options) => bot.sendMessage(msg.chat.id, text, options);
  const ownerAllowed = (msg) => String(msg.from?.id || "") === String(config.ownerTelegramId || "");

  bot.onText(/^\/gracestatus(?:@\w+)?$/, async (msg) => {
    if (!ownerAllowed(msg)) return send(msg, "⛔ Grace X diagnostics are restricted to the primary owner.");
    return send(msg, [
      "✅ Grace X Runtime Check",
      "",
      `Build: ${GRACE_X_RUNTIME_BUILD}`,
      "Client type: Confidential Web App / Automated App / Bot",
      `OAuth credentials detected: ${graceOAuth.configured() ? "YES" : "NO"}`,
      "Token authentication: HTTP Basic (OAuth 2.0 Client ID + Client Secret)",
      "Redirect: /grace/oauth/x/callback",
      "Connection command: /connectx 1",
      "Alias: /gracex 1",
      "",
      "Posting remains approval-controlled and disabled until the owner enables Grace."
    ].join("\n"));
  });

  bot.onText(/^\/connectallx(?:@\w+)?$/, async (msg) => {
    if (!ownerAllowed(msg)) return send(msg, "⛔ X account connection is restricted to the primary owner.");
    if (!graceOAuth.configured()) {
      return send(msg, "⚠️ Grace X OAuth configuration is incomplete.");
    }
    try {
      const accounts = await graceOAuth.listAccounts();
      const pending = accounts.filter((account) => account.status !== "active" && account.status !== "disabled");
      if (!pending.length) return send(msg, "✅ Every registered X account is already active in Grace.");
      const rows = pending.map((account) => [{
        text: `Connect @${String(account.handle || account.display_name || account.id).replace(/^@/, "")}`,
        callback_data: `grace:connectx:${account.id}`
      }]);
      return send(msg, [
        "🔗 GRACE X — CONNECT ALL ACCOUNTS",
        "",
        `${pending.length} registered X account(s) still need authorization.`,
        "Tap one account at a time. Grace creates a fresh 10-minute X authorization link only when you tap it.",
        "",
        "No password, API secret or login code is sent through Telegram."
      ].join("\n"), { reply_markup: { inline_keyboard: rows } });
    } catch (error) {
      console.error("Grace X account inventory failed", { code: error?.code || "UNKNOWN" });
      return send(msg, "❌ Grace could not load the X account list.");
    }
  });

  bot.onText(/^\/(?:connectx|gracex)(?:@\w+)?(?:\s+(\d+))?$/, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg, "⛔ X account connection is restricted to the primary owner.");
    const accountId = Number(match?.[1] || 1);
    if (!Number.isSafeInteger(accountId) || accountId < 1) {
      return send(msg, "❌ Use: /connectx account_id\nExample: /connectx 1");
    }
    if (!graceOAuth.configured()) {
      return send(msg, [
        "⚠️ Grace X OAuth is live, but its Hostinger configuration is incomplete.",
        "",
        "Check these existing environment variables:",
        "GRACE_X_CLIENT_ID",
        "GRACE_X_CLIENT_SECRET",
        "GRACE_X_REDIRECT_URI",
        "",
        "Use the OAuth 2.0 Client ID and OAuth 2.0 Client Secret from the same X App.",
        "Do not use the OAuth 1.0 API Key Secret.",
        "Do not send passwords, login codes or API secrets through Telegram."
      ].join("\n"));
    }

    try {
      const connection = await graceOAuth.beginConnection(accountId, msg.from.id);
      const handle = String(connection.account.handle || "").replace(/^@/, "");
      return send(msg, [
        "🔗 Grace X Connection Ready",
        "",
        `Account: @${handle}`,
        `Grace ID: #${connection.account.id}`,
        "",
        "Press the button below and approve access inside X.",
        "Grace will reject the connection if a different X account is selected.",
        "",
        "This link expires in 10 minutes."
      ].join("\n"), {
        reply_markup: {
          inline_keyboard: [[{ text: `Connect @${handle}`, url: connection.authorizationUrl }]]
        }
      });
    } catch (error) {
      console.error("Grace X OAuth start failed", { code: error?.code || "UNKNOWN" });
      return send(msg, `❌ ${error?.message || "Grace could not start the X connection."}`);
    }
  });

  bot.on("callback_query", async (query) => {
    const match = String(query.data || "").match(/^grace:connectx:(\d+)$/);
    if (!match || !query.message || !query.from) return;
    const actor = { chat: query.message.chat, from: query.from };
    if (!ownerAllowed(actor)) {
      await bot.answerCallbackQuery(query.id, { text: "Owner access required.", show_alert: true }).catch(() => {});
      return;
    }
    try {
      const connection = await graceOAuth.beginConnection(Number(match[1]), query.from.id);
      const handle = String(connection.account.handle || "").replace(/^@/, "");
      await bot.answerCallbackQuery(query.id, { text: `Ready: @${handle}` }).catch(() => {});
      await send(query.message, [
        "🔗 Grace X Connection Ready",
        "",
        `Account: @${handle}`,
        `Grace ID: #${connection.account.id}`,
        "",
        "Approve access inside X. Grace will reject the connection if a different X account is selected.",
        "",
        "This link expires in 10 minutes."
      ].join("\n"), {
        reply_markup: { inline_keyboard: [[{ text: `Connect @${handle}`, url: connection.authorizationUrl }]] }
      });
    } catch (error) {
      console.error("Grace X callback start failed", { code: error?.code || "UNKNOWN" });
      await bot.answerCallbackQuery(query.id, { text: "Could not start that X connection.", show_alert: true }).catch(() => {});
    }
  });
}

module.exports = { GRACE_X_OAUTH_COMMANDS, GRACE_X_RUNTIME_BUILD, registerGraceXOAuthTelegramHandlers };
