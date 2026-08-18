require("dotenv").config({ path: require("node:path").join(__dirname, "..", ".env") });
require("./hub-central/preload");

const telegramLibrary = require("node-telegram-bot-api");
const TelegramBot = telegramLibrary.TelegramBot || telegramLibrary.default || telegramLibrary;
const { createClient } = require("@supabase/supabase-js");
const { createAutoClient } = require("./auto/client");
const { registerAutoMiniRoutes } = require("./auto/zed-router");
const { registerAutoTelegramHandlers } = require("./auto/telegram");
const { registerCauseTelegramHandlers } = require("./causes/telegram");
const { registerCommandCentreHandlers } = require("./command-centre");
const { registerCommunityDirectoryHandlers } = require("./community-directory");
const { registerExecutiveRoutes } = require("./executive/http");
const { registerExecutiveTelegramHandlers } = require("./executive/telegram");
const { createGracePublisher } = require("./grace/adapters");
const { registerGraceBuild2Handlers } = require("./grace/build2");
const { createFacebookOAuthService } = require("./grace/facebook-oauth");
const { createGraceFacebookOAuthRepository } = require("./grace/facebook-oauth-repository");
const { registerGraceFacebookOAuthTelegramHandlers } = require("./grace/facebook-oauth-telegram");
const { registerGraceRoutes } = require("./grace/http");
const { createXOAuthService } = require("./grace/oauth");
const { createGraceOAuthRepository } = require("./grace/oauth-repository");
const { registerGraceXOAuthTelegramHandlers } = require("./grace/oauth-telegram");
const { createGraceRepository } = require("./grace/repository");
const { registerGraceTelegramHandlers } = require("./grace/telegram");
const { createGraceWorker } = require("./grace/worker");
const { configWarnings, loadConfig } = require("./config");
const { createHttpApp } = require("./http");
const { registerLegendV8System } = require("./legend-v8");
const { registerRoleProfileHandler } = require("./profile-role");
const { registerProjectWalletSystem } = require("./project-wallets");
const { registerReferralTelegramHandlers } = require("./referrals");
const { createRepository } = require("./repository");
const { registerRewardPolicyHandlers } = require("./reward-policy");
const { registerRewardSettlementHandlers } = require("./reward-settlement");
const { registerScopedBroadcastHandlers } = require("./scoped-broadcast");
const { registerTelegramHandlers } = require("./telegram");
const { registerWebsiteTelegramHandlers } = require("./websites-telegram");
const { registerWorkEvidenceHandlers } = require("./work-evidence");
const { registerWorldzCastSystem } = require("./worldzcast");

const RUNTIME_BUILD = "2026-08-18-full-cryptoworldz-runtime";

function defaultGraceRedirectUri(webhookUrl) {
  try { return new URL("/grace/oauth/x/callback", webhookUrl).toString(); }
  catch { return ""; }
}
function defaultGraceMetaRedirectUri(webhookUrl) {
  try { return new URL("/grace/oauth/facebook/callback", webhookUrl).toString(); }
  catch { return ""; }
}
function missingGraceXSecretError() {
  const error = new Error("Grace X is configured as a confidential Web/Bot app, but its Client Secret is missing from the server. Add GRACE_X_CLIENT_SECRET in Hostinger using the value from X Developer Portal → Keys and Tokens.");
  error.code = "X_CLIENT_SECRET_MISSING";
  return error;
}

async function start() {
  const config = loadConfig();
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const bot = new TelegramBot(config.botToken, { onlyFirstMatch: true });
  const repository = createRepository(supabase);
  const autoClient = createAutoClient(config);
  const graceWorkspaceSlug = String(process.env.GRACE_WORKSPACE_SLUG || "cryptoworldz").trim().toLowerCase();
  const encryptionSecret = String(process.env.GRACE_TOKEN_ENCRYPTION_KEY || process.env.GRACE_API_SECRET || config.webhookSecret || "").trim();
  const graceXClientId = String(process.env.GRACE_X_CLIENT_ID || process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID || "").trim();
  const graceXClientSecret = String(process.env.GRACE_X_CLIENT_SECRET || process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET || "").trim();
  const graceXRedirectUri = String(process.env.GRACE_X_REDIRECT_URI || defaultGraceRedirectUri(config.webhookUrl)).trim();
  const graceMetaAppId = String(process.env.GRACE_META_APP_ID || process.env.META_APP_ID || "").trim();
  const graceMetaAppSecret = String(process.env.GRACE_META_APP_SECRET || process.env.META_APP_SECRET || "").trim();
  const graceMetaRedirectUri = String(process.env.GRACE_META_REDIRECT_URI || defaultGraceMetaRedirectUri(config.webhookUrl)).trim();
  const graceMetaGraphVersion = String(process.env.GRACE_META_GRAPH_VERSION || "v24.0").trim();
  const graceRepository = createGraceRepository(supabase, { workspaceSlug: graceWorkspaceSlug });
  const graceOAuthRepository = createGraceOAuthRepository(supabase, { workspaceSlug: graceWorkspaceSlug });
  const graceOAuthBase = createXOAuthService({ repository: graceOAuthRepository, clientId: graceXClientId, clientSecret: graceXClientSecret, redirectUri: graceXRedirectUri, encryptionSecret });
  const graceOAuth = {
    ...graceOAuthBase,
    configured: () => Boolean(graceXClientSecret && graceOAuthBase.configured()),
    beginConnection: (...args) => { if (!graceXClientSecret) throw missingGraceXSecretError(); return graceOAuthBase.beginConnection(...args); },
    completeConnection: (...args) => { if (!graceXClientSecret) throw missingGraceXSecretError(); return graceOAuthBase.completeConnection(...args); },
    getAccessToken: (...args) => { if (!graceXClientSecret) throw missingGraceXSecretError(); return graceOAuthBase.getAccessToken(...args); }
  };
  const graceFacebookOAuthRepository = createGraceFacebookOAuthRepository(supabase, { workspaceSlug: graceWorkspaceSlug });
  const graceFacebookOAuth = createFacebookOAuthService({ repository: graceFacebookOAuthRepository, appId: graceMetaAppId, appSecret: graceMetaAppSecret, redirectUri: graceMetaRedirectUri, encryptionSecret, graphVersion: graceMetaGraphVersion });
  const gracePublisher = createGracePublisher({
    metaGraphVersion: graceMetaGraphVersion,
    tokenProvider: async (target) => {
      if (target.platform === "x") return graceOAuth.configured() ? graceOAuth.getAccessToken(target.account_id) : null;
      if (target.platform === "facebook") return graceFacebookOAuth.configured() ? graceFacebookOAuth.getAccessToken(target.account_id) : null;
      return null;
    }
  });
  const graceWorker = createGraceWorker({ repository: graceRepository, publisher: gracePublisher, intervalMs: Number(process.env.GRACE_WORKER_INTERVAL_MS) || 60000 });
  registerCommandCentreHandlers({ bot, repository, config });
  registerTelegramHandlers({ bot, repository, config });
  registerRoleProfileHandler({ bot, repository, config, supabase });
  registerScopedBroadcastHandlers({ bot, repository, config });
  registerAutoTelegramHandlers({ bot, config, autoClient, supabase });
  registerCauseTelegramHandlers({ bot, repository, supabase, config });
  registerReferralTelegramHandlers({ bot, repository, supabase, config });
  registerWebsiteTelegramHandlers({ bot, config });
  registerWorkEvidenceHandlers({ bot, repository, config });
  registerRewardPolicyHandlers({ bot, config });
  registerRewardSettlementHandlers({ bot, repository, config, supabase });
  registerProjectWalletSystem({ bot, repository, config, supabase });
  registerWorldzCastSystem({ bot, repository, config, supabase });
  registerLegendV8System({ bot, repository, config, supabase });
  registerExecutiveTelegramHandlers({ bot, repository, config, supabase });
  registerGraceTelegramHandlers({ bot, repository: graceRepository, config });
  registerGraceBuild2Handlers({ bot, repository: graceRepository, config });
  registerGraceXOAuthTelegramHandlers({ bot, oauth: graceOAuth, config });
  registerGraceFacebookOAuthTelegramHandlers({ bot, oauth: graceFacebookOAuth, config });
  const app = createHttpApp({ bot, repository, config });
  registerAutoMiniRoutes({ app, config, autoClient });
  registerExecutiveRoutes({ app, repository, config, supabase });
  registerGraceRoutes({ app, repository: graceRepository, oauth: graceOAuth, facebookOAuth: graceFacebookOAuth, config });
  registerCommunityDirectoryHandlers({ bot, repository, config });
  const port = Number(process.env.PORT || 3000);
  app.listen(port, "0.0.0.0", () => {
    console.log(`CryptoWorldz Bot listening on ${port} • ${RUNTIME_BUILD}`);
    for (const warning of configWarnings(config)) console.warn(`CONFIG WARNING: ${warning}`);
  });
  graceWorker.start();
}

start().catch((error) => {
  console.error("Fatal startup error", error);
  process.exit(1);
});
