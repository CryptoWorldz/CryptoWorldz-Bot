export const EXACT_GRACE_X_REDIRECT_URI =
  "https://cryptobotz.cryptoworldz.xyz/grace/oauth/x/callback";
export const COMMAND_CENTRE_BUILD = "grace-build1-2026-08-10";

function text(value) {
  return String(value ?? "").trim();
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function truthy(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(text(value).toLowerCase());
}

export function loadConfig(env = process.env) {
  const config = {
    nodeEnv: text(env.NODE_ENV) || "production",
    port: positiveInteger(env.PORT, 3000),
    publicBaseUrl: text(env.PUBLIC_BASE_URL) || "https://cryptobotz.cryptoworldz.xyz",
    oneWorldzSiteUrl:
      text(env.ONEWORLDZ_SITE_URL) || "https://oneworldz-rebuild.oneworldz.chatgpt.site",
    runWorkers: truthy(env.RUN_WORKERS, true),
    supabaseUrl: text(env.SUPABASE_URL),
    supabaseServiceRoleKey: text(env.SUPABASE_SERVICE_ROLE_KEY),
    telegramBotToken: text(env.TELEGRAM_BOT_TOKEN),
    telegramWebhookSecret: text(env.TELEGRAM_WEBHOOK_SECRET),
    ownerTelegramId: text(env.OWNER_TELEGRAM_ID),
    ownerApiSecret: text(env.OWNER_API_SECRET),
    graceWorkspaceSlug: text(env.GRACE_WORKSPACE_SLUG) || "cryptoworldz",
    graceWorkerIntervalMs: Math.max(15000, positiveInteger(env.GRACE_WORKER_INTERVAL_MS, 60000)),
    graceXClientId: text(env.GRACE_X_CLIENT_ID),
    graceXClientSecret: text(env.GRACE_X_CLIENT_SECRET),
    graceXRedirectUri: text(env.GRACE_X_REDIRECT_URI) || EXACT_GRACE_X_REDIRECT_URI,
    graceTokenEncryptionKey: text(env.GRACE_TOKEN_ENCRYPTION_KEY),
  };

  if (config.graceXRedirectUri !== EXACT_GRACE_X_REDIRECT_URI) {
    throw new Error(
      `GRACE_X_REDIRECT_URI must exactly equal ${EXACT_GRACE_X_REDIRECT_URI}`,
    );
  }

  return config;
}

export function runtimeReadiness(config) {
  return {
    service: "oneworldz-command-centre",
    version: "4.1.0",
    build: COMMAND_CENTRE_BUILD,
    zed: {
      telegram_configured: Boolean(
        config.telegramBotToken &&
          config.telegramWebhookSecret &&
          config.ownerTelegramId,
      ),
      owner_controls: true,
      simplified_gateway_commands: true,
    },
    grace: {
      x_oauth_configured: Boolean(
        config.graceXClientId &&
          config.graceXClientSecret &&
          config.graceTokenEncryptionKey.length >= 32,
      ),
      exact_redirect_uri: EXACT_GRACE_X_REDIRECT_URI,
      approval_controlled: true,
      workers_enabled: config.runWorkers,
      account_permissions: true,
      publish_results_required: true,
    },
    auto: {
      mode: "owner_controlled_buy_only",
      selling_enabled: false,
      private_keys_accepted: false,
      artificial_volume_enabled: false,
      execution_requires_external_signer: true,
    },
    storage: {
      supabase_configured: Boolean(
        config.supabaseUrl && config.supabaseServiceRoleKey,
      ),
      existing_data_preserved: true,
    },
  };
}

export function assertProductionReady(config) {
  const readiness = runtimeReadiness(config);
  const missing = [];
  if (!readiness.zed.telegram_configured) missing.push("Zed Telegram variables");
  if (!readiness.grace.x_oauth_configured) missing.push("Grace X OAuth variables");
  if (!readiness.storage.supabase_configured) missing.push("Supabase server variables");
  if (!config.ownerApiSecret) missing.push("OWNER_API_SECRET");
  if (missing.length) throw new Error(`Runtime configuration incomplete: ${missing.join(", ")}.`);
  return readiness;
}
