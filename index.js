require("dotenv").config();

const telegramLibrary = require("node-telegram-bot-api");
const TelegramBot = telegramLibrary.TelegramBot || telegramLibrary.default || telegramLibrary;
const { createClient } = require("@supabase/supabase-js");
const { createAutoClient } = require("./src/auto/client");
const { registerAutoMiniRoutes } = require("./src/auto/zed-router");
const { registerAutoTelegramHandlers } = require("./src/auto/telegram");
const { CAUSE_COMMANDS, registerCauseTelegramHandlers } = require("./src/causes/telegram");
const { DIRECTORY_COMMANDS, registerCommunityDirectoryHandlers } = require("./src/community-directory");
const { registerExecutiveRoutes } = require("./src/executive/http");
const { EXECUTIVE_COMMANDS, registerExecutiveTelegramHandlers } = require("./src/executive/telegram");
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
const { LEGEND_V8_COMMANDS, registerLegendV8System } = require("./src/legend-v8");
const { registerRoleProfileHandler } = require("./src/profile-role");
const { PROJECT_WALLET_COMMANDS, registerProjectWalletSystem } = require("./src/project-wallets");
const { REFERRAL_COMMANDS, registerReferralTelegramHandlers } = require("./src/referrals");
const { createRepository } = require("./src/repository");
const { registerRewardPolicyHandlers } = require("./src/reward-policy");
const { REWARD_SETTLEMENT_COMMANDS, registerRewardSettlementHandlers } = require("./src/reward-settlement");
const { registerScopedBroadcastHandlers } = require("./src/scoped-broadcast");
const { PUBLIC_COMMANDS, registerTelegramHandlers } = require("./src/telegram");
const { WEBSITE_COMMANDS, registerWebsiteTelegramHandlers } = require("./src/websites-telegram");
const { WORK_EVIDENCE_COMMANDS, registerWorkEvidenceHandlers } = require("./src/work-evidence");
const { WORLDZCAST_COMMANDS, registerWorldzCastSystem } = require("./src/worldzcast");

const RUNTIME_BUILD = "2026-08-07-model-348-v8-rewards";

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
  registerRoleProfileHandler({ bot, repository, config, supabase });
  registerScopedBroadcastHandlers({ bot, repository, config });
  registerAutoTelegramHandlers({ bot, config, autoClient, supabase });
  registerCauseTelegramHandlers({ bot, repository, supabase, config });
  registerExecutiveTelegramHandlers({ bot, repository, supabase, config });
  registerGraceTelegramHandlers({ bot, repository, graceRepository, config });
  registerGraceXOAuthTelegramHandlers({ bot, graceOAuth, config });
  registerWebsiteTelegramHandlers({ bot, config });
  registerCommunityDirectoryHandlers({ bot, supabase, config });
  const referralController = registerReferralTelegramHandlers({
    bot,
    repository,
    supabase,
    config
  });
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
    posting_enabled: false
  }));
  registerAutoMiniRoutes({ app, config, autoClient, supabase });
  registerExecutiveRoutes({ app, repository, supabase, config });
  registerGraceRoutes({ app, graceRepository, graceOAuth, apiSecret: process.env.GRACE_API_SECRET || "" });

  for (const warning of configWarnings(config)) console.warn(warning);

  const server = app.listen(config.port, async () => {
    console.log(`CryptoWorldz Zed Bot listening on port ${config.port}`);
    console.log(`Runtime build ${RUNTIME_BUILD}`);
    graceWorker.start();
    console.log("Grace Social Engine worker started in approval-controlled mode");

    const webhookResult = await Promise.allSettled([
      bot.setWebHook(config.webhookUrl, {
        secret_token: config.webhookSecret,
        allowed_updates: [
          "message",
          "edited_message",
          "channel_post",
          "edited_channel_post",
          "callback_query",
          "chat_member",
          "my_chat_member",
          "chat_join_request"
        ]
      }),
      bot.setMyCommands([
        ...PUBLIC_COMMANDS,
        ...WEBSITE_COMMANDS,
        ...DIRECTORY_COMMANDS,
        ...REFERRAL_COMMANDS,
        ...REWARD_SETTLEMENT_COMMANDS,
        ...PROJECT_WALLET_COMMANDS,
        ...LEGEND_V8_COMMANDS,
        ...WORK_EVIDENCE_COMMANDS,
        ...WORLDZCAST_COMMANDS,
        ...CAUSE_COMMANDS,
        ...EXECUTIVE_COMMANDS,
        ...GRACE_COMMANDS,
        ...GRACE_X_OAUTH_COMMANDS
      ])
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
    name: error && error.name ? error.name : "Error",
    message: error && error.message ? error.message : "Unknown startup error"
  });
  process.exit(1);
});

module.exports = { RUNTIME_BUILD, defaultGraceRedirectUri, start };
