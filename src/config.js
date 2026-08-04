const crypto = require("crypto");
const { parseBoolean, parseIdSet } = require("./core");

function required(name, env) {
  const value = String(env[name] || "").trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function loadConfig(env = process.env) {
  const botToken = required("BOT_TOKEN", env);
  const supabaseUrl = required("SUPABASE_URL", env);
  const supabaseServiceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY", env);
  const webhookUrl = String(
    env.TELEGRAM_WEBHOOK_URL ||
      "https://cryptobotz.cryptoworldz.xyz/telegram-webhook"
  ).trim();

  try {
    const parsedWebhookUrl = new URL(webhookUrl);
    if (parsedWebhookUrl.protocol !== "https:") throw new Error("Webhook must use HTTPS.");
  } catch {
    throw new Error("TELEGRAM_WEBHOOK_URL must be a valid HTTPS URL.");
  }

  const autoServiceUrl = String(env.AUTO_SERVICE_URL || "").trim();
  if (autoServiceUrl) {
    try {
      if (new URL(autoServiceUrl).protocol !== "https:") throw new Error();
    } catch {
      throw new Error("AUTO_SERVICE_URL must be a valid HTTPS URL.");
    }
  }

  return {
    botToken,
    supabaseUrl,
    supabaseServiceRoleKey,
    adminApiToken: String(env.ADMIN_API_TOKEN || ""),
    allowedChatIds: parseIdSet(env.ALLOWED_CHAT_IDS),
    adminTelegramIds: parseIdSet(env.ADMIN_TELEGRAM_IDS),
    ownerTelegramId: String(env.OWNER_TELEGRAM_ID || "").trim(),
    autoApproveMissionClaims: parseBoolean(env.AUTO_APPROVE_MISSION_CLAIMS, false),
    autoServiceUrl,
    autoInternalToken: String(env.AUTO_INTERNAL_TOKEN || "").trim(),
    communityTelegramUrl: String(env.COMMUNITY_TELEGRAM_URL || "").trim(),
    communityXUrl: String(env.COMMUNITY_X_URL || "").trim(),
    communityWebsiteUrl: String(
      env.COMMUNITY_WEBSITE_URL || "https://CryptoWorldz.xyz"
    ).trim(),
    communityAnnouncementsUrl: String(env.COMMUNITY_ANNOUNCEMENTS_URL || "").trim(),
    communitySupportUrl: String(env.COMMUNITY_SUPPORT_URL || "").trim(),
    websiteUrl: String(env.WEBSITE_URL || "https://CryptoWorldz.xyz").trim(),
    websiteLaunched: parseBoolean(env.WEBSITE_LAUNCHED, false),
    solanaRpcUrl: String(env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com").trim(),
    solanaUsdcMint: String(env.SOLANA_USDC_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v").trim(),
    webhookUrl,
    webhookSecret: crypto.createHash("sha256").update(botToken).digest("hex"),
    port: Number(env.PORT) || 3000
  };
}

function configWarnings(config) {
  const warnings = [];
  if (!config.adminApiToken) warnings.push("ADMIN_API_TOKEN is not configured; /api/command is disabled.");
  if (config.allowedChatIds.size === 0) warnings.push("ALLOWED_CHAT_IDS is empty; /api/command cannot send messages.");
  if (config.adminTelegramIds.size === 0) warnings.push("ADMIN_TELEGRAM_IDS is empty; Telegram admin commands are disabled.");
  if (!config.ownerTelegramId) warnings.push("OWNER_TELEGRAM_ID is empty; owner-only commands are disabled.");
  if (!config.autoServiceUrl || !config.autoInternalToken) warnings.push("Auto SAFE LOCKED service is not connected; owner Auto commands will remain unavailable.");
  return warnings;
}

module.exports = { configWarnings, loadConfig };
