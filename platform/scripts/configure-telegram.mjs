import dotenv from "dotenv";
import { loadConfig } from "../src/config.mjs";

dotenv.config();
const config = loadConfig(process.env);

if (!config.telegramBotToken || !config.telegramWebhookSecret) {
  throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET are required.");
}
if (!/^[A-Za-z0-9_-]{1,256}$/.test(config.telegramWebhookSecret)) {
  throw new Error("TELEGRAM_WEBHOOK_SECRET may contain only letters, numbers, underscore and hyphen.");
}
const base = new URL(config.publicBaseUrl);
if (base.protocol !== "https:") throw new Error("PUBLIC_BASE_URL must use HTTPS.");
const webhookUrl = new URL("/telegram-webhook", base).toString();

const response = await fetch(
  `https://api.telegram.org/bot${config.telegramBotToken}/setWebhook`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: config.telegramWebhookSecret,
      allowed_updates: ["message"],
      drop_pending_updates: false,
    }),
    signal: AbortSignal.timeout(15000),
  },
);
const payload = await response.json().catch(() => ({}));
if (!response.ok || payload.ok !== true) {
  throw new Error(`Telegram webhook configuration returned HTTP ${response.status}.`);
}
console.log(`Zed webhook configured on ${base.hostname}.`);
