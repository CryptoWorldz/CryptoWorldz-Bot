require("dotenv").config({ path: require("node:path").join(__dirname, "..", ".env") });
process.env.ONEWORLDZ_IMAGE_MODEL = process.env.ONEWORLDZ_IMAGE_MODEL || "gpt-image-2";
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
const { registerCurrentImpactHandlers } = require("./current-impact");
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
const { registerOneWorldzPublicCors } = require("./oneworldz-public-cors");
const { registerRoleProfileHandler } = require("./profile-role");
const { registerProjectWalletSystem } = require("./project-wallets");
const { registerReferralTelegramHandlers } = require("./referrals");
const { createRepository } = require("./repository");
const { registerRewardPolicyHandlers } = require("./reward-policy");
const { registerRewardSettlementHandlers } = require("./reward-settlement");
const { registerScopedBroadcastHandlers } = require("./scoped-broadcast");
const { registerTelegramHandlers } = require("./telegram");
const { registerUserExperienceSystem } = require("./user-experience");
const { registerWebsiteTelegramHandlers } = require("./websites-telegram");
const { registerWorkEvidenceHandlers } = require("./work-evidence");
const { registerWorldzCastSystem } = require("./worldzcast");
const { registerZedGuide } = require("./zed-guide");

const RUNTIME_BUILD = "2026-08-19-oneworldz-participant-experience";
let startupStage = "module_loaded";

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
  startupStage = "load_config";
  const config = loadConfig();
  startupStage = "create_supabase_client";
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  startupStage = "create_telegram_bot";
  const bot = new TelegramBot(config.botToken, { onlyFirstMatch: true });
  startupStage = "create_repository";
  const repository = createRepository(supabase);
  startupStage = "create_auto_client";
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
  startupStage = "create_grace_repository";
  const graceRepository = createGraceRepository(supabase, { workspaceSlug: graceWorkspaceSlug });
  startupStage = "create_grace_oauth_repository";
  const graceOAuthRepository = createGraceOAuthRepository(supabase, { workspaceSlug: graceWorkspaceSlug });
  startupStage = "create_grace_x_oauth";
  const graceOAuthBase = createXOAuthService({ repository: graceOAuthRepository, clientId: graceXClientId, clientSecret: graceXClientSecret, redirectUri: graceXRedirectUri, encryptionSecret });
  const graceOAuth = {
    ...graceOAuthBase,
    configured: () => Boolean(graceXClientSecret && graceOAuthBase.configured()),
    beginConnection: (...args) => { if (!graceXClientSecret) throw missingGraceXSecretError(); return graceOAuthBase.beginConnection(...args); },
    completeConnection: (...args) => { if (!graceXClientSecret) throw missingGraceXSecretError(); return graceOAuthBase.completeConnection(...args); },
    getAccessToken: (...args) => { if (!graceXClientSecret) throw missingGraceXSecretError(); return graceOAuthBase.getAccessToken(...args); }
  };
  startupStage = "create_grace_facebook_repository";
  const graceFacebookOAuthRepository = createGraceFacebookOAuthRepository(supabase, { workspaceSlug: graceWorkspaceSlug });
  startupStage = "create_grace_facebook_oauth";
  const graceFacebookOAuth = createFacebookOAuthService({ repository: graceFacebookOAuthRepository, appId: graceMetaAppId, appSecret: graceMetaAppSecret, redirectUri: graceMetaRedirectUri, encryptionSecret, graphVersion: graceMetaGraphVersion });
  startupStage = "create_grace_publisher";
  const gracePublisher = createGracePublisher({
    metaGraphVersion: graceMetaGraphVersion,
    tokenProvider: async (target) => {
      if (target.platform === "x") return graceOAuth.configured() ? graceOAuth.getAccessToken(target.account_id) : null;
      if (target.platform === "facebook") return graceFacebookOAuth.configured() ? graceFacebookOAuth.getAccessToken(target.account_id) : null;
      return null;
    }
  });
  startupStage = "create_grace_worker";
  const graceWorker = createGraceWorker({ repository: graceRepository, publisher: gracePublisher, intervalMs: Number(process.env.GRACE_WORKER_INTERVAL_MS) || 60000 });
  startupStage = "create_http_app";
  const app = createHttpApp({ bot, repository, config });

  startupStage = "register_oneworldz_cors";
  registerOneWorldzPublicCors(app);
  startupStage = "register_current_impact";
  registerCurrentImpactHandlers({ bot });
  startupStage = "register_user_experience";
  registerUserExperienceSystem({ app, bot, repository, config, supabase });
  startupStage = "register_zed_guide";
  registerZedGuide({ app, repository, config, supabase });
  startupStage = "register_command_centre";
  registerCommandCentreHandlers({ bot, repository, config });
  startupStage = "register_telegram";
  registerTelegramHandlers({ bot, repository, config });
  startupStage = "register_role_profile";
  registerRoleProfileHandler({ bot, repository, config, supabase });
  startupStage = "register_scoped_broadcast";
  registerScopedBroadcastHandlers({ bot, repository, config });
  startupStage = "register_auto_telegram";
  registerAutoTelegramHandlers({ bot, config, autoClient, supabase });
  startupStage = "register_causes";
  registerCauseTelegramHandlers({ bot, repository, supabase, config });
  startupStage = "register_referrals";
  registerReferralTelegramHandlers({ bot, repository, supabase, config });
  startupStage = "register_websites";
  registerWebsiteTelegramHandlers({ bot, config });
  startupStage = "register_work_evidence";
  registerWorkEvidenceHandlers({ bot, repository, config });
  startupStage = "register_reward_policy";
  registerRewardPolicyHandlers({ bot, config });
  startupStage = "register_reward_settlement";
  registerRewardSettlementHandlers({ bot, repository, config, supabase });
  startupStage = "register_project_wallets";
  registerProjectWalletSystem({ bot, repository, config, supabase });
  startupStage = "register_worldzcast";
  registerWorldzCastSystem({ bot, repository, config, supabase });
  startupStage = "register_legend_v8";
  registerLegendV8System({ bot, repository, config, supabase });
  startupStage = "register_executive_telegram";
  registerExecutiveTelegramHandlers({ bot, repository, config, supabase });
  startupStage = "register_grace_telegram";
  registerGraceTelegramHandlers({ bot, repository, graceRepository, config });
  startupStage = "register_grace_build2";
  registerGraceBuild2Handlers({ bot, repository, graceRepository, supabase, config });
  startupStage = "register_grace_x_telegram";
  registerGraceXOAuthTelegramHandlers({ bot, graceOAuth, config });
  startupStage = "register_grace_facebook_telegram";
  registerGraceFacebookOAuthTelegramHandlers({ bot, facebookOAuth: graceFacebookOAuth, config });
  startupStage = "register_auto_routes";
  registerAutoMiniRoutes({ app, config, autoClient, supabase });
  startupStage = "register_executive_routes";
  registerExecutiveRoutes({ app, repository, config, supabase });
  startupStage = "register_grace_routes";
  registerGraceRoutes({ app, graceRepository, graceOAuth, graceFacebookOAuth, apiSecret: process.env.GRACE_API_SECRET || "" });
  startupStage = "register_community_directory";
  registerCommunityDirectoryHandlers({ bot, supabase, config });
  startupStage = "app_listen";
  const port = Number(process.env.PORT || 3000);
  app.listen(port, "0.0.0.0", () => {
    console.log(`CryptoWorldz Bot listening on ${port} • ${RUNTIME_BUILD}`);
    for (const warning of configWarnings(config)) console.warn(`CONFIG WARNING: ${warning}`);
  });
  startupStage = "grace_worker_start";
  graceWorker.start();
  startupStage = "running";
}

function sanitizeStartupError(error) {
  const raw = String(error && error.message || error && error.code || "unknown_startup_error");
  return raw
    .replace(/https?:\/\/[^\s]+/gi, "[URL_REDACTED]")
    .replace(/(?:sk-|eyJ)[A-Za-z0-9._-]{12,}/g, "[SECRET_REDACTED]")
    .replace(/[A-Za-z0-9_-]{32,}/g, "[VALUE_REDACTED]")
    .slice(0, 300);
}

function startFailureProbe(error) {
  const http = require("node:http");
  const port = Number(process.env.PORT || 3000);
  const payload = JSON.stringify({
    ok: false,
    service: "CryptoWorldz Zed Bot",
    runtime: "startup_failure_probe_v1",
    error: sanitizeStartupError(error)
  });
  const server = http.createServer((req, res) => {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(payload);
  });
  server.listen(port, "0.0.0.0", () => {
    console.error(`ZED startup failure probe listening on ${port}: ${sanitizeStartupError(error)}`);
  });
}

start().catch((error) => {
  const stagedError = new Error(`${startupStage}: ${sanitizeStartupError(error)}`);
  console.error("Fatal startup error", sanitizeStartupError(stagedError));
  startFailureProbe(stagedError);
});
