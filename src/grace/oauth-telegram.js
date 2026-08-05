const GRACE_X_OAUTH_COMMANDS = [
  { command: "connectx", description: "Connect an approved X account to Grace" }
];

function registerGraceXOAuthTelegramHandlers({ bot, graceOAuth, config }) {
  const send = (msg, text, options) => bot.sendMessage(msg.chat.id, text, options);
  const ownerAllowed = (msg) => String(msg.from?.id || "") === String(config.ownerTelegramId || "");

  bot.onText(/^\/connectx(?:@\w+)?(?:\s+(\d+))?$/, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg, "⛔ X account connection is restricted to the primary owner.");
    const accountId = Number(match?.[1] || 1);
    if (!Number.isSafeInteger(accountId) || accountId < 1) {
      return send(msg, "❌ Use: /connectx account_id\nExample: /connectx 1");
    }
    if (!graceOAuth.configured()) {
      return send(msg, [
        "⚠️ Grace X OAuth is built but the X Developer App Client ID is not configured yet.",
        "",
        "Required Hostinger settings:",
        "GRACE_X_CLIENT_ID",
        "GRACE_X_REDIRECT_URI",
        "GRACE_TOKEN_ENCRYPTION_KEY",
        "",
        "Do not send passwords, phone login codes or API secrets through Telegram."
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
}

module.exports = { GRACE_X_OAUTH_COMMANDS, registerGraceXOAuthTelegramHandlers };
