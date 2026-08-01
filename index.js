require("dotenv").config();

const telegramLibrary = require("node-telegram-bot-api");
const TelegramBot = telegramLibrary.TelegramBot || telegramLibrary.default || telegramLibrary;
const { createClient } = require("@supabase/supabase-js");
const { configWarnings, loadConfig } = require("./src/config");
const { createHttpApp } = require("./src/http");
const { createRepository } = require("./src/repository");
const { PUBLIC_COMMANDS, registerTelegramHandlers } = require("./src/telegram");

async function start() {
  const config = loadConfig();
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const bot = new TelegramBot(config.botToken);
  const repository = createRepository(supabase);

  registerTelegramHandlers({ bot, repository, config });
  const app = createHttpApp({ bot, config, repository });

  for (const warning of configWarnings(config)) console.warn(warning);

  const server = app.listen(config.port, async () => {
    console.log(`CryptoWorldz Zed Bot listening on port ${config.port}`);

    const webhookResult = await Promise.allSettled([
      bot.setWebHook(config.webhookUrl, { secret_token: config.webhookSecret }),
      bot.setMyCommands(PUBLIC_COMMANDS)
    ]);

    if (webhookResult[0].status === "fulfilled") {
      console.log("Telegram webhook configured successfully");
    } else {
      console.error("Telegram webhook setup failed", {
        name: webhookResult[0].reason && webhookResult[0].reason.name
          ? webhookResult[0].reason.name
          : "Error"
      });
    }

    if (webhookResult[1].status === "rejected") {
      console.error("Telegram command menu setup failed", {
        name: webhookResult[1].reason && webhookResult[1].reason.name
          ? webhookResult[1].reason.name
          : "Error"
      });
    }
  });

  const shutdown = (signal) => {
    console.log(`${signal} received; closing HTTP server.`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  return { app, bot, config, repository, server };
}

start().catch((error) => {
  console.error("Zed Bot startup failed", {
    name: error && error.name ? error.name : "Error",
    message: error && error.message ? error.message : "Unknown startup error"
  });
  process.exit(1);
});

module.exports = { start };
