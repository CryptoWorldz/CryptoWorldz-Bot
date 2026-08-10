const GRACE_FACEBOOK_OAUTH_COMMANDS = [
  { command: "connectfacebook", description: "Connect the approved CryptoWorldz Facebook Page" },
  { command: "gracefacebook", description: "Alias for Grace Facebook connection" }
];

function registerGraceFacebookOAuthTelegramHandlers({ bot, facebookOAuth, config }) {
  const send = (msg, text, options) => bot.sendMessage(msg.chat.id, text, options);
  const ownerAllowed = (msg) => String(msg.from?.id || "") === String(config.ownerTelegramId || "");

  bot.onText(/^\/(?:connectfacebook|gracefacebook)(?:@\w+)?(?:\s+(\d+))?$/, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg, "⛔ Facebook Page connection is restricted to the primary owner.");
    const accountId = Number(match?.[1] || 11);
    if (!Number.isSafeInteger(accountId) || accountId < 1) {
      return send(msg, "❌ Use: /connectfacebook account_id\nExample: /connectfacebook 11");
    }
    if (!facebookOAuth.configured()) {
      return send(msg, [
        "⚠️ Grace Facebook OAuth route is live, but Meta credentials are not configured in Hostinger yet.",
        "",
        "Required environment variables:",
        "GRACE_META_APP_ID",
        "GRACE_META_APP_SECRET",
        "GRACE_META_REDIRECT_URI",
        "",
        "Redirect URI:",
        "https://cryptobotz.cryptoworldz.xyz/grace/oauth/facebook/callback",
        "",
        "Never send the Meta App Secret through Telegram or commit it to GitHub."
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
