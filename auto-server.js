require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { loadAutoConfig } = require("./src/auto/config");
const { createAutoHttpApp } = require("./src/auto/http");
const { createAutoRepository } = require("./src/auto/repository");

async function startAuto() {
  const config = loadAutoConfig();
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const repository = createAutoRepository(supabase);
  const settings = await repository.getSettings();

  if (settings.mode !== "safe_locked" || settings.execution_enabled) {
    throw new Error("Auto refused startup because the database is not in SAFE LOCKED MODE.");
  }

  const app = createAutoHttpApp({ config, repository });
  const server = app.listen(config.port, () => {
    console.log(`Diamond Buy Auto SAFE LOCKED service listening on port ${config.port}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received; closing Auto HTTP service.`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
  return { app, config, repository, server };
}

startAuto().catch((error) => {
  console.error("Diamond Buy Auto startup failed", {
    name: error?.name || "Error",
    message: error?.message || "Unknown startup error"
  });
  process.exit(1);
});

module.exports = { startAuto };
