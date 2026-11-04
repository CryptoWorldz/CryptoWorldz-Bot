const crypto = require("crypto");
const { parseBoolean, parseIdSet } = require("./core");

function required(name, env) {
  const value = String(env[name] || "").trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function loadConfig(env = process.env) {
  const botToken = String(
    env.BOT_TOKEN ||
    env.TELEGRAM_BOT_TOKEN ||
    env.TELEGRAM_TOKEN ||
    env.ZED_BOT_TOKEN ||
    env.CRYPTOWORLDZ_BOT_TOKEN ||
    ""
  ).trim();
  if (!botToken) throw new Error("BOT_TOKEN is required.");
  const supabaseUrl = String(
    env.SUPABASE_URL || "https://hknymhhyqldtzmplzuzh.supabase.co"
  ).trim().replace(/\/$/, "");
  const serviceRoleKey = [env.SUPABASE_SERVICE_ROLE_KEY, env.SUPABASE_SERVICE_KEY, env.SUPABASE_SECRET_KEY]
    .map(value => String(value || "").trim()).find(Boolean) || "";
  const supabaseApiKey = String(
    serviceRoleKey ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    "sb_publishable_3ognbqSCTAcAnLHOeKZp8A_IgriwUJV"
  ).trim();
  if (!supabaseApiKey) throw new Error("A Supabase server or publishable API key is required.");
  const usingServiceRole = Boolean(serviceRoleKey);
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

  const sparkyBotToken = String(env.SPARKY_BOT_TOKEN || env.DIPSHIT_BOT_TOKEN || "").trim();
  const dipshitBotToken = sparkyBotToken;
  const sparkyWebhookUrl = String(
    env.SPARKY_WEBHOOK_URL || env.DIPSHIT_WEBHOOK_URL || "https://cryptobotz.cryptoworldz.xyz/sparky-telegram-webhook"
  ).trim();
  const dipshitWebhookUrl = sparkyWebhookUrl;
  if (sparkyBotToken) {
    try {
      const parsedDipshitWebhookUrl = new URL(sparkyWebhookUrl);
      if (parsedDipshitWebhookUrl.protocol !== "https:") throw new Error();
    } catch {
      throw new Error("SPARKY_WEBHOOK_URL must be a valid HTTPS URL.");
    }
  }
  const sparkyStarsMonthlyPriceRaw = Number(env.SPARKY_STARS_MONTHLY_PRICE || env.DIPSHIT_STARS_MONTHLY_PRICE || 0);
  const dipshitStarsMonthlyPriceRaw = sparkyStarsMonthlyPriceRaw;
  const sparkyStarsMonthlyPrice =
    Number.isInteger(sparkyStarsMonthlyPriceRaw) &&
    sparkyStarsMonthlyPriceRaw >= 0 &&
    sparkyStarsMonthlyPriceRaw <= 10000
      ? sparkyStarsMonthlyPriceRaw
      : 0;
  const dipshitStarsMonthlyPrice = sparkyStarsMonthlyPrice;
  const sparkySolMonthlyAmountRaw = Number(env.SPARKY_SOL_MONTHLY_AMOUNT || env.DIPSHIT_SOL_MONTHLY_AMOUNT || 0);
  const sparkySolMonthlyAmount =
    Number.isFinite(sparkySolMonthlyAmountRaw) && sparkySolMonthlyAmountRaw >= 0
      ? sparkySolMonthlyAmountRaw
      : 0;
  const dipshitSolMonthlyAmount = sparkySolMonthlyAmount;

  const autoServiceUrl = String(
    env.AUTO_SERVICE_URL || `${supabaseUrl}/functions/v1/diamond-buy-auto`
  ).trim().replace(/\/$/, "");
  try {
    if (new URL(autoServiceUrl).protocol !== "https:") throw new Error();
  } catch {
    throw new Error("AUTO_SERVICE_URL must be a valid HTTPS URL.");
  }

  const autoInternalToken = String(env.AUTO_INTERNAL_TOKEN || "").trim();
  const autoAuthToken = autoInternalToken || (usingServiceRole ? supabaseApiKey : "");

  return {
    botToken,
    supabaseUrl,
    supabaseApiKey,
    usingServiceRole,
    adminApiToken: String(env.ADMIN_API_TOKEN || ""),
    allowedChatIds: parseIdSet(env.ALLOWED_CHAT_IDS),
    adminTelegramIds: parseIdSet(env.ADMIN_TELEGRAM_IDS),
    ownerTelegramId: String(env.OWNER_TELEGRAM_ID || "").trim(),
    sparkyBotToken,
    sparkyWebhookUrl,
    sparkyWebhookSecret: sparkyBotToken ? crypto.createHash("sha256").update(sparkyBotToken).digest("hex") : "",
    dipshitBotToken,
    dipshitWebhookUrl,
    dipshitWebhookSecret: dipshitBotToken
      ? crypto.createHash("sha256").update(dipshitBotToken).digest("hex")
      : "",
    sparkyStarsMonthlyPrice,
    sparkySolMonthlyAmount,
    sparkySolRecipient: String(env.SPARKY_SOL_RECIPIENT || env.DIPSHIT_SOL_RECIPIENT || "").trim(),
    dipshitStarsMonthlyPrice,
    dipshitSolMonthlyAmount,
    dipshitSolRecipient: String(env.SPARKY_SOL_RECIPIENT || env.DIPSHIT_SOL_RECIPIENT || "").trim(),
    autoApproveMissionClaims: parseBoolean(env.AUTO_APPROVE_MISSION_CLAIMS, false),
    autoServiceUrl,
    autoAuthToken,
    autoInternalToken,
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
  if (!config.autoServiceUrl || !config.autoAuthToken) warnings.push("Auto SAFE LOCKED service is not connected; owner Auto commands will remain unavailable.");
  if (config.sparkyBotToken && config.sparkyBotToken === config.botToken) warnings.push("SPARKY_BOT_TOKEN matches BOT_TOKEN; separate Sparky runtime is disabled.");
  if (config.sparkyBotToken && !config.sparkyStarsMonthlyPrice) warnings.push("Sparky Stars billing is built but SPARKY_STARS_MONTHLY_PRICE is not set.");
  if (config.sparkySolMonthlyAmount && !config.sparkySolRecipient) warnings.push("Sparky SOL amount is set without SPARKY_SOL_RECIPIENT; SOL membership remains disabled.");
  return warnings;
}

module.exports = { configWarnings, loadConfig };
