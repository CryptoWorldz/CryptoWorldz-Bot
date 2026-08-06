const crypto = require("crypto");

function createAutoDcaWorker({ repository, trader, intervalMs = 60000 }) {
  const workerId = `auto-dca-${crypto.randomUUID()}`;
  let timer = null;
  let running = false;

  async function tick() {
    if (running) return;
    running = true;
    let schedule = null;
    let execution = null;
    try {
      const settings = await repository.getSettings();
      if (!settings.enabled || settings.paused || settings.emergency_stop || !settings.execution_enabled) return;
      if (!trader.configured(settings.wallet_address)) return;

      schedule = await repository.claimDueSchedule(workerId);
      if (!schedule) return;
      execution = await repository.startExecution(schedule, workerId);
      const result = await trader.executeBuy(schedule, settings);
      await repository.completeExecution({ schedule, execution, result });
    } catch (error) {
      console.error("Auto DCA worker tick failed", {
        code: error?.code || "DCA_WORKER_FAILED",
        name: error?.name || "Error"
      });
      if (schedule && execution) {
        await repository.failExecution({
          schedule,
          execution,
          errorCode: error?.code || error?.message || "dca_execution_failed",
          details: error?.payload || {}
        }).catch(() => undefined);
      }
    } finally {
      running = false;
    }
  }

  function start() {
    if (timer) return;
    timer = setInterval(() => tick().catch(() => undefined), Math.max(15000, Number(intervalMs) || 60000));
    timer.unref?.();
    tick().catch(() => undefined);
  }

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  return { start, stop, tick, workerId };
}

module.exports = { createAutoDcaWorker };
