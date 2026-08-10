require("dotenv").config();

const telegramLibrary = require("node-telegram-bot-api");
const TelegramBot = telegramLibrary.TelegramBot || telegramLibrary.default || telegramLibrary;
const { createClient } = require("@supabase/supabase-js");
const { createAutoClient } = require("./src/auto/client");
const { registerAutoMiniRoutes } = require("./src/auto/zed-router");
const { registerAutoTelegramHandlers } = require("./src/auto/telegram");
const { registerCauseTelegramHandlers } = require("./src/causes/telegram");
const { BOT_MENU_COMMANDS, registerCommandCentreHandlers } = require("./src/command-centre");
const { registerCommunityDirectoryHandlers } = require("./src/community-directory");
const { registerExecutiveRoutes } = require("./src/executive/http");
const { registerExecutiveTelegramHandlers } = require("./src/executive/telegram");
const { createGracePublisher } = require("./src/grace/adapters");
const { registerGraceBuild2Handlers } = require("./src/grace/build2");
const { createFacebookOAuthService } = require("./src/grace/facebook-oauth");
const { createGraceFacebookOAuthRepository } = require("./src/grace/facebook-oauth-repository");
const { registerGraceFacebookOAuthTelegramHandlers } = require("./src/grace/facebook-oauth-telegram");
const { registerGraceRoutes } = require("./src/grace/http");
const { createXOAuthService } = require("./src/grace/oauth");
const { createGraceOAuthRepository } = require("./src/grace/oauth-repository");
const { registerGraceXOAuthTelegramHandlers } = require("./src/grace/oauth-telegram");
const { createGraceRepository } = require("./src/grace/repository");
const { registerGraceTelegramHandlers } = require("./src/grace/telegram");
const { createGraceWorker } = require("./src/grace/worker");
const { configWarnings, loadConfig } = require("./src/config");
const { createHttpApp } = require("./src/http");
const { registerLegendV8System } = require("./src/legend-v8");
const { registerRoleProfileHandler } = require("./src/profile-role");
const { registerProjectWalletSystem } = require("./src/project-wallets");
const { registerReferralTelegramHandlers } = require("./src/referrals");
const { createRepository } = require("./src/repository");
const { registerRewardPolicyHandlers } = require("./src/reward-policy");
const { registerRewardSettlementHandlers } = require("./src/reward-settlement");
const { registerScopedBroadcastHandlers } = require("./src/scoped-broadcast");
const { registerTelegramHandlers } = require("./src/telegram");
const { registerWebsiteTelegramHandlers } = require("./src/websites-telegram");
const { registerWorkEvidenceHandlers } = require("./src/work-evidence");
const { registerWorldzCastSystem } = require("./src/worldzcast");

const RUNTIME_BUILD = "2026-08-10-grace-build2-meta-facebook-oauth";

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
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
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
  const graceOAuthBase = createXOAuthService({
    repository: graceOAuthRepository,
    clientId: graceXClientId,
    clientSecret: graceXClientSecret,
    redirectUri: graceXRedirectUri,
    encryptionSecret
  });
  const graceOAuth = {
    ...graceOAuthBase,
    configured: () => Boolean(graceXClientSecret && graceOAuthBase.configured()),
    beginConnection: (...args) => {
      if (!graceXClientSecret) throw missingGraceXSecretError();
      return graceOAuthBase.beginConnection(...args);
    },
    completeConnection: (...args) => {
      if (!graceXClientSecret) throw missingGraceXSecretError();
      return graceOAuthBase.completeConnection(...args);
    },
    getAccessToken: (...args) => {
      if (!graceXClientSecret) throw missingGraceXSecretError();
      return graceOAuthBase.getAccessToken(...args);
    }
  };

  const graceFacebookOAuthRepository = createGraceFacebookOAuthRepository(supabase, { workspaceSlug: graceWorkspaceSlug });
  const graceFacebookOAuth = createFacebookOAuthService({
    repository: graceFacebookOAuthRepository,
    appId: graceMetaAppId,
    appSecret: graceMetaAppSecret,
    redirectUri: graceMetaRedirectUri,
    encryptionSecret,
    graphVersion: graceMetaGraphVersion
  });

  const gracePublisher = createGracePublisher({
    metaGraphVersion: graceMetaGraphVersion,
    tokenProvider: async (target) => {
      if (target.platform === "x") {
        if (!graceOAuth.configured()) return null;
        return graceOAuth.getAccessToken(target.account_id);
      }
      if (target.platform === "facebook") {
        if (!graceFacebookOAuth.configured()) return null;
        return graceFacebookOAuth.getAccessToken(target.account_id);
      }
      return null;
    }
  });
  const graceWorker = createGraceWorker({
    repository: graceRepository,
    publisher: gracePublisher,
    intervalMs: Number(process.env.GRACE_WORKER_INTERVAL_MS) || 60000
  });

  registerCommandCentreHandlers({ bot, repository, config });
  registerTelegramHandlers({ bot, repository, config });
  registerRoleProfileHandler({ bot, repository, config, supabase });
  registerScopedBroadcastHandlers({ bot, repository, config });
  registerAutoTelegramHandlers({ bot, config, autoClient, supabase });
  registerCauseTelegramHandlers({ bot, repository, supabase, config });
  registerExecutiveTelegramHandlers({ bot, repository, supabase, config });
  registerGraceTelegramHandlers({ bot, repository, graceRepository, config });
  registerGraceBuild2Handlers({ bot, repository, graceRepository, supabase, config });
  registerGraceXOAuthTelegramHandlers({ bot, graceOAuth, config });
  registerGraceFacebookOAuthTelegramHandlers({ bot, facebookOAuth: graceFacebookOAuth, config });
  registerWebsiteTelegramHandlers({ bot, config });
  registerCommunityDirectoryHandlers({ bot, supabase, config });
  const referralController = registerReferralTelegramHandlers({ bot, repository, supabase, config });
  registerRewardPolicyHandlers({ bot, repository, supabase, config });
  registerRewardSettlementHandlers({ bot, repository, supabase, config });
  registerWorkEvidenceHandlers({ bot, config, supabase });

  const app = createHttpApp({ bot, config, repository });
  registerProjectWalletSystem({ app, bot, config, supabase });
  registerLegendV8System({ app, bot, config, repository, supabase });
  registerWorldzCastSystem({ app, bot, config, repository, supabase });
  app.get("/api/public/runtime", (req, res) => res.json({
    ok: true,
    build: RUNTIME_BUILD,
    grace_x_oauth_configured: graceOAuth.configured(),
    grace_meta_facebook_oauth_configured: graceFacebookOAuth.configured(),
    grace_meta_app_id_configured: Boolean(graceMetaAppId),
    grace_meta_app_secret_configured: Boolean(graceMetaAppSecret),
    grace_meta_redirect_uri: "/grace/oauth/facebook/callback",
    grace_meta_graph_version: graceFacebookOAuth.graphVersion,
    grace_build2_multisocial: true,
    grace_autopost: true,
    grace_delegated_admin_management: true,
    grace_account1_shared_oauth: true,
    grace_multi_account_directory: true,
    facebook_page_publishing_ready: true,
    executive_controls: true,
    impact_cause_register: true,
    grace_manager_role: true,
    auto_dca_controls: true,
    website_directory_commands: true,
    community_directory_commands: true,
    referral_reward_controls: true,
    protected_reward_pools: true,
    usdc_reward_funding: true,
    reward_asset_choices: true,
    four_wallet_plan: true,
    profile_contribution_wallets: true,
    transparent_owner_investment_policy: true,
    worldzcast_enabled: true,
    worldzcast_member_dms: false,
    model_348_v8_rewards: true,
    shill_boosts: true,
    purchase_based_points: false,
    holding_recognition_points: false,
    owner_work_evidence: true,
    posting_enabled: false,
    simplified_command_centre: true
  }));
  registerAutoMiniRoutes({ app, config, autoClient, supabase });
  registerExecutiveRoutes({ app, repository, supabase, config });
  registerGraceRoutes({
    app,
    graceRepository,
    graceOAuth,
    graceFacebookOAuth,
    apiSecret: process.env.GRACE_API_SECRET || ""
  });

  for (const warning of configWarnings(config)) console.warn(warning);

  const server = app.listen(config.port, async () => {
    console.log(`CryptoWorldz Zed Bot listening on port ${config.port}`);
    console.log(`Runtime build ${RUNTIME_BUILD}`);
    graceWorker.start();
    console.log("Grace Social Engine worker started in approval-controlled mode");

    const webhookResult = await Promise.allSettled([
      bot.setWebHook(config.webhookUrl, {
        secret_token: config.webhookSecret,
        allowed_updates: ["message","edited_message","channel_post","edited_channel_post","callback_query","chat_member","my_chat_member","chat_join_request"]
      }),
      bot.setMyCommands(BOT_MENU_COMMANDS)
    ]);

    if (webhookResult[0].status === "fulfilled") console.log("Telegram webhook configured successfully");
    else console.error("Telegram webhook setup failed", { name: webhookResult[0].reason?.name || "Error" });
    if (webhookResult[1].status === "rejected") console.error("Telegram command menu setup failed", { name: webhookResult[1].reason?.name || "Error" });
  });

  const shutdown = (signal) => {
    console.log(`${signal} received; closing HTTP server.`);
    referralController.stop();
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
    graceFacebookOAuth,
    graceFacebookOAuthRepository,
    graceOAuth,
    graceOAuthRepository,
    gracePublisher,
    graceRepository,
    graceWorker,
    referralController,
    repository,
    server
  };
}

start().catch((error) => {
  console.error("Zed Bot startup failed", {
    name: error?.name || "Error",
    message: error?.message || "Unknown startup error"
  });
  process.exit(1);
});

module.exports = { RUNTIME_BUILD, defaultGraceMetaRedirectUri, defaultGraceRedirectUri, missingGraceXSecretError, start };
