require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { loadAutoConfig } = require("./src/auto/config");
const { createAutoDcaRepository } = require("./src/auto/dca-repository");
const { createAutoDcaWorker } = require("./src/auto/dca-worker");
const { createAutoHttpApp } = require("./src/auto/http");
const { createExternalDcaTrader } = require("./src/auto/external-trader");
const { createAutoRepository } = require("./src/auto/repository");

async function startAuto() {
  const config = loadAutoConfig();
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const repository = createAutoRepository(supabase);
  const dcaRepository = createAutoDcaRepository(supabase);
  const trader = createExternalDcaTrader(config);
  const settings = await repository.getSettings();

  if (settings.mode !== "safe_locked" || settings.execution_enabled) {
    throw new Error("Auto refused startup because the legacy service is not in SAFE LOCKED MODE.");
  }

  const dcaWorker = createAutoDcaWorker({
    repository: dcaRepository,
    trader,
    intervalMs: config.dcaWorkerIntervalMs
  });
  const app = createAutoHttpApp({ config, repository, dcaRepository, trader, dcaWorker });
  const server = app.listen(config.port, () => {
    console.log(`Diamond Buy Auto service listening on port ${config.port}`);
    console.log(`Auto DCA runtime prepared: ${trader.runtimeStatus().signerReady ? "executor connected" : "executor activation pending"}`);
    dcaWorker.start();
  });

  const shutdown = (signal) => {
    console.log(`${signal} received; closing Auto HTTP service.`);
    dcaWorker.stop();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
  return { app, config, dcaRepository, dcaWorker, repository, server, trader };
}

startAuto().catch((error) => {
  console.error("Diamond Buy Auto startup failed", {
    name: error?.name || "Error",
    message: error?.message || "Unknown startup error"
  });
  process.exit(1);
});

module.exports = { startAuto };
