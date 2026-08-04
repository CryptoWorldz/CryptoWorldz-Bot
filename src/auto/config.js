const { parseBoolean } = require("./core");

function required(name, env) {
  const value = String(env[name] || "").trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function loadAutoConfig(env = process.env) {
  const mode = String(env.AUTO_MODE || "safe_locked").trim().toLowerCase();
  if (mode !== "safe_locked") {
    throw new Error("AUTO_MODE must remain safe_locked in this release.");
  }
  if (parseBoolean(env.AUTO_EXECUTION_ENABLED, false)) {
    throw new Error("AUTO_EXECUTION_ENABLED must remain false in this release.");
  }
  if (env.AUTO_WALLET_PRIVATE_KEY || env.AUTO_WALLET_SEED || env.AUTO_SIGNER_SECRET) {
    throw new Error("Wallet signing secrets are forbidden in Auto SAFE LOCKED MODE.");
  }

  return {
    mode: "safe_locked",
    executionEnabled: false,
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
