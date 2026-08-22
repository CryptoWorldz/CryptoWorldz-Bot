const path = require("node:path");
const dotenv = require("dotenv");

const protectedEnvPath = path.join(__dirname, "..", "..", ".env");
const protectedEnv = dotenv.config({ path: protectedEnvPath }).parsed || {};
if (!String(process.env.OPENAI_API_KEY || "").trim()) {
  const protectedOpenAI = String(protectedEnv.OPENAI_API_KEY || "").trim();
  if (protectedOpenAI) process.env.OPENAI_API_KEY = protectedOpenAI;
}

const COMMAND_CENTRE_MINIAPP_URL = "https://cryptobotz.cryptoworldz.xyz/miniapp/";

async function configureTelegramMenuButton() {
  const botToken = String(process.env.BOT_TOKEN || protectedEnv.BOT_TOKEN || "").trim();
  if (!botToken) return;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        menu_button: {
          type: "web_app",
          text: "🌐 OPEN COMMAND CENTRE",
          web_app: { url: COMMAND_CENTRE_MINIAPP_URL }
        }
      }),
      signal: AbortSignal.timeout(15000)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok !== true) {
      console.warn("Telegram Command Centre menu button registration failed.");
    } else {
      console.info("Telegram Command Centre menu button registered.");
    }
  } catch {
    console.warn("Telegram Command Centre menu button registration failed.");
  }
}

configureTelegramMenuButton();

const httpModule = require("../http");
const { registerHubCentralRoutes } = require("./http");
const { registerOneWorldzGptRoutes } = require("../oneworldz-gpt/http");

if (!String(process.env.HUB_API_SECRET || "").trim() && String(process.env.ADMIN_API_TOKEN || "").trim()) {
  process.env.HUB_API_SECRET = process.env.ADMIN_API_TOKEN;
}

const originalCreateHttpApp = httpModule.createHttpApp;

if (typeof originalCreateHttpApp !== "function") throw new Error("hub_central_http_hook_unavailable");

httpModule.createHttpApp = function createHttpAppWithOneWorldzAI(args) {
  const app = originalCreateHttpApp(args);
  registerHubCentralRoutes({ app, config: args.config });
  registerOneWorldzGptRoutes({ app });
  return app;
};
