require("dotenv").config();

const telegramLibrary = require("node-telegram-bot-api");
const TelegramBot = telegramLibrary.TelegramBot || telegramLibrary.default || telegramLibrary;
const { createClient } = require("@supabase/supabase-js");
const { createAutoClient } = require("./src/auto/client");
const { registerAutoMiniRoutes } = require("./src/auto/zed-router");
const { registerAutoTelegramHandlers } = require("./src/auto/telegram");
const { createGracePublisher } = require("./src/grace/adapters");
const { registerGraceRoutes } = require("./src/grace/http");
const { createXOAuthService } = require("./src/grace/oauth");
const { createGraceOAuthRepository } = require("./src/grace/oauth-repository");
const { GRACE_X_OAUTH_COMMANDS, registerGraceXOAuthTelegramHandlers } = require("./src/grace/oauth-telegram");
const { createGraceRepository } = require("./src/grace/repository");
const { GRACE_COMMANDS, registerGraceTelegramHandlers } = require("./src/grace/telegram");
const { createGraceWorker } = require("./src/grace/worker");
const { configWarnings, loadConfig } = require("./src/config");
const { createHttpApp } = require("./src/http");
const { createRepository } = require("./src/repository");
const { PUBLIC_COMMANDS, registerTelegramHandlers } = require("./src/telegram");

function defaultGraceRedirectUri(webhookUrl) {
  try {
    return new URL("/grace/oauth/x/callback", webhookUrl).toString();
  } catch {
    return "";
  }
}

async function start() {
  const config = loadConfig();
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const bot = new TelegramBot(config.botToken);
  const repository = createRepository(supabase);
  const autoClient = createAutoClient(config);
  const graceWorkspaceSlug = process.env.GRACE_WORKSPACE_SLUG || "cryptoworldz";
  const graceRepository = createGraceRepository(supabase, { workspaceSlug: graceWorkspaceSlug });
  const graceOAuthRepository = createGraceOAuthRepository(supabase, { workspaceSlug: graceWorkspaceSlug });
  const graceOAuth = createXOAuthService({
    repository: graceOAuthRepository,
    clientId: process.env.GRACE_X_CLIENT_ID || "",
    clientSecret: process.env.GRACE_X_CLIENT_SECRET || "",
    redirectUri: process.env.GRACE_X_REDIRECT_URI || defaultGraceRedirectUri(config.webhookUrl),
    encryptionSecret:
      process.env.GRACE_TOKEN_ENCRYPTION_KEY ||
      process.env.GRACE_API_SECRET ||
      config.webhookSecret
  });
  const gracePublisher = createGracePublisher({
    tokenProvider: async (target) => {
      if (!graceOAuth.configured()) return null;
      return graceOAuth.getAccessToken(target.account_id);
    }
  });
  const graceWorker = createGraceWorker({
    repository: graceRepository,
    publisher: gracePublisher,
    intervalMs: Number(process.env.GRACE_WORKER_INTERVAL_MS) || 60000
  });

  registerTelegramHandlers({ bot, repository, config });
  registerAutoTelegramHandlers({ bot, config, autoClient });
  registerGraceTelegramHandlers({ bot, repository, graceRepository, config });
  registerGraceXOAuthTelegramHandlers({ bot, graceOAuth, config });
  const app = createHttpApp({ bot, config, repository });
  registerAutoMiniRoutes({ app, config, autoClient });
  registerGraceRoutes({ app, graceRepository, graceOAuth, apiSecret: process.env.GRACE_API_SECRET || "" });

  for (const warning of configWarnings(config)) console.warn(warning);

  const server = app.listen(config.port, async () => {
    console.log(`CryptoWorldz Zed Bot listening on port ${config.port}`);
    graceWorker.start();
    console.log("Grace Social Engine worker started in approval-controlled mode");

    const webhookResult = await Promise.allSettled([
      bot.setWebHook(config.webhookUrl, { secret_token: config.webhookSecret }),
      bot.setMyCommands([...PUBLIC_COMMANDS, ...GRACE_COMMANDS, ...GRACE_X_OAUTH_COMMANDS])
    ]);

    if (webhookResult[0].status === "fulfilled") {
      console.log("Telegram webhook configured successfully");
    } else {
      console.error("Telegram webhook setup failed", {
        name: webhookResult[0].reason && webhookResult[0].reason.name ? webhookResult[0].reason.name : "Error"
      });
    }

    if (webhookResult[1].status === "rejected") {
      console.error("Telegram command menu setup failed", {
        name: webhookResult[1].reason && webhookResult[1].reason.name ? webhookResult[1].reason.name : "Error"
      });
    }
  });

  const shutdown = (signal) => {
    console.log(`${signal} received; closing HTTP server.`);
    graceWorker.stop();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  return {
    app,
    autoClient,
    bot,
    config,
    graceOAuth,
    graceOAuthRepository,
    gracePublisher,
    graceRepository,
    graceWorker,
    repository,
    server
  };
}

start().catch((error) => {
  console.error("Zed Bot startup failed", {
    name: error && error.name ? error.name : "Error",
    message: error && error.message ? error.message : "Unknown startup error"
  });
  process.exit(1);
});

module.exports = { defaultGraceRedirectUri, start };
