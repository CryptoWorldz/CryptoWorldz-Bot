const GRACE_FACEBOOK_OAUTH_COMMANDS = [
  { command: "connectfacebook", description: "Connect the approved CryptoWorldz Facebook Page" },
  { command: "gracefacebook", description: "Alias for Grace Facebook connection" },
  { command: "metacheck", description: "Owner: check Meta OAuth configuration" }
];

function registerGraceFacebookOAuthTelegramHandlers({ bot, facebookOAuth, config }) {
  const send = (msg, text, options) => bot.sendMessage(msg.chat.id, text, options);
  const ownerAllowed = (msg) => String(msg.from?.id || "") === String(config.ownerTelegramId || "");

  bot.onText(/^\/metacheck(?:@\w+)?$/, async (msg) => {
    if (!ownerAllowed(msg)) return send(msg, "⛔ Meta diagnostics are restricted to the primary owner.");
    const status = facebookOAuth.configurationStatus();
    return send(msg, [
      "🔎 Grace Meta Configuration Check",
      "",
      `GRACE_META_APP_ID: ${status.appId ? "YES ✅" : "NO ❌"}`,
      `GRACE_META_APP_SECRET: ${status.appSecret ? "YES ✅" : "NO ❌"}`,
      `GRACE_META_REDIRECT_URI: ${status.redirectUri ? "YES ✅" : "NO ❌"}`,
      `Grace token encryption (32+ chars): ${status.encryptionSecret ? "YES ✅" : "NO ❌"}`,
      "",
      `Facebook OAuth ready: ${status.configured ? "YES ✅" : "NO ❌"}`,
      "",
      "No secret values are displayed by this diagnostic."
    ].join("\n"));
  });

  bot.onText(/^\/(?:connectfacebook|gracefacebook)(?:@\w+)?(?:\s+(\d+))?$/, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg, "⛔ Facebook Page connection is restricted to the primary owner.");
    const accountId = Number(match?.[1] || 11);
    if (!Number.isSafeInteger(accountId) || accountId < 1) {
      return send(msg, "❌ Use: /connectfacebook account_id\nExample: /connectfacebook 11");
    }
    if (!facebookOAuth.configured()) {
      const status = facebookOAuth.configurationStatus();
      return send(msg, [
        "⚠️ Grace Facebook OAuth route is live, but configuration is incomplete.",
        "",
        `GRACE_META_APP_ID: ${status.appId ? "YES ✅" : "NO ❌"}`,
        `GRACE_META_APP_SECRET: ${status.appSecret ? "YES ✅" : "NO ❌"}`,
        `GRACE_META_REDIRECT_URI: ${status.redirectUri ? "YES ✅" : "NO ❌"}`,
        `Grace token encryption (32+ chars): ${status.encryptionSecret ? "YES ✅" : "NO ❌"}`,
        "",
        "Run /metacheck any time for this safe diagnostic.",
        "Never send secret values through Telegram or commit them to GitHub."
      ].join("\n"));
    }

    try {
      const connection = await facebookOAuth.beginConnection(accountId, msg.from.id);
      return send(msg, [
        "🔗 Grace Facebook Connection Ready",
        "",
        `Page: ${connection.account.display_name}`,
        `Grace ID: #${connection.account.id}`,
        "",
        "Press the button below and approve the CryptoWorldz Facebook Page inside Meta.",
        "Grace will only activate the Page after Meta returns it in the authorised Page list.",
        "",
        "This link expires in 10 minutes."
      ].join("\n"), {
        reply_markup: {
          inline_keyboard: [[{ text: "Connect CryptoWorldz Facebook", url: connection.authorizationUrl }]]
        }
      });
    } catch (error) {
      console.error("Grace Facebook OAuth start failed", { code: error?.code || "UNKNOWN" });
      return send(msg, `❌ ${error?.message || "Grace could not start the Facebook connection."}`);
    }
  });
}

module.exports = {
  GRACE_FACEBOOK_OAUTH_COMMANDS,
  registerGraceFacebookOAuthTelegramHandlers
};
