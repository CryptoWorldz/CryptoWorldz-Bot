const { parseBoolean } = require("./core");

function required(name, env) {
  const value = String(env[name] || "").trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function loadAutoConfig(env = process.env) {
  const mode = String(env.AUTO_MODE || "safe_locked").trim().toLowerCase();
  if (!new Set(["safe_locked", "owner_dca"]).has(mode)) {
    throw new Error("AUTO_MODE must be safe_locked or owner_dca.");
  }
  if (parseBoolean(env.AUTO_EXECUTION_ENABLED, false)) {
    throw new Error("AUTO_EXECUTION_ENABLED must remain false. Use the separate Auto DCA gate.");
  }
  if (env.AUTO_WALLET_PRIVATE_KEY || env.AUTO_WALLET_SEED || env.AUTO_SIGNER_SECRET) {
    throw new Error("Wallet signing secrets are forbidden in the Auto control service. The separate executor owns signing.");
  }

  const dcaEnabled = parseBoolean(env.AUTO_DCA_ENABLED, false);
  const dcaWalletAddress = String(env.AUTO_DCA_WALLET_ADDRESS || "").trim();
  const dcaExecutorUrl = String(env.AUTO_DCA_EXECUTOR_URL || "").trim();
  const dcaExecutorToken = String(env.AUTO_DCA_EXECUTOR_TOKEN || "").trim();

  return {
    mode,
    executionEnabled: false,
    dcaEnabled,
    dcaWalletAddress,
    dcaExecutorUrl,
    dcaExecutorToken,
    dcaWorkerIntervalMs: Math.max(15000, Number(env.AUTO_DCA_WORKER_INTERVAL_MS) || 60000),
    supabaseUrl: required("SUPABASE_URL", env),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY", env),
    ownerTelegramId: required("OWNER_TELEGRAM_ID", env),
    internalToken: required("AUTO_INTERNAL_TOKEN", env),
    port: Number(env.AUTO_PORT || env.PORT) || 3100,
    serviceName: "Diamond Buy Auto",
    serviceUrl: String(env.AUTO_SERVICE_URL || "").trim()
  };
}

module.exports = { loadAutoConfig };
