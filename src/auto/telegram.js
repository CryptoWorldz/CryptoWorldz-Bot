function registerAutoTelegramHandlers({ bot, config, autoClient }) {
  const isOwner = (msg) => String(msg.from?.id || "") === String(config.ownerTelegramId || "");
  const send = (msg, text) => bot.sendMessage(msg.chat.id, text);

  function ownerRequired(msg) {
    return send(msg, "⛔ Auto controls are restricted to the primary owner.");
  }

  function formatStatus(payload) {
    const status = payload.status || {};
    const limits = status.limits || {};
    return [
      "💎 Diamond Buy™ Auto",
      "",
      `Mode: ${String(status.mode || "unknown").toUpperCase()}`,
      `Execution: ${status.execution_enabled ? "ENABLED" : "LOCKED"}`,
      `Signing: ${status.signing_enabled ? "ENABLED" : "DISABLED"}`,
      `Paused: ${status.paused ? "YES" : "NO"}`,
      `Emergency stop: ${status.emergency_stop ? "ACTIVE" : "CLEAR"}`,
      `Allowlisted tokens: ${status.allowlisted_tokens || 0}`,
      `Active live schedules: ${status.active_schedules || 0}`,
      `Pending live orders: ${status.pending_live_orders || 0}`,
      "",
      `Maximum order: ${limits.maxOrderAmount || 0}`,
      `Daily cap: ${limits.maxDailyAmount || 0}`,
      `Weekly cap: ${limits.maxWeeklyAmount || 0}`,
      `Monthly cap: ${limits.maxMonthlyAmount || 0}`,
      `Minimum interval: ${limits.minIntervalMinutes || 0} minutes`,
      "",
      "SAFE LOCKED MODE can simulate approved plans but cannot build, sign or submit transactions."
    ].join("\n");
  }

  bot.onText(/^\/auto(?:@\w+)?$/, async (msg) => {
    if (!isOwner(msg)) return ownerRequired(msg);
    try {
      const payload = await autoClient.status();
      return send(msg, formatStatus(payload));
    } catch (error) {
      if (error.code === "AUTO_NOT_CONFIGURED") {
        return send(msg, "💎 Auto is prepared but not connected to its separate SAFE LOCKED service yet.");
      }
      return send(msg, "❌ Auto status could not be loaded. No trading action was attempted.");
    }
  });

  bot.onText(/^\/autosimulate(?:@\w+)?(?:\s+([\s\S]+))?$/, async (msg, match) => {
    if (!isOwner(msg)) return ownerRequired(msg);
    const values = String(match?.[1] || "").trim().split(/\s+/);
    if (values.length !== 8) {
      return send(msg, [
        "💎 Auto Simulation",
        "",
        "Use:",
        "/autosimulate token_mint amount SOL|USDC orders interval_minutes slippage_bps price_impact_bps liquidity_usd",
        "",
        "Example:",
        "/autosimulate MINT 0.01 SOL 4 120 50 50 25000",
        "",
        "This creates a simulation record only."
      ].join("\n"));
    }

    const [tokenMint, amount, currency, orderCount, intervalMinutes, slippageBps, priceImpactBps, liquidityUsd] = values;
    try {
      const payload = await autoClient.simulate({
        network: "solana",
        token_mint: tokenMint,
        amount,
        currency,
        order_count: orderCount,
        interval_minutes: intervalMinutes,
        slippage_bps: slippageBps,
        price_impact_bps: priceImpactBps,
        liquidity_usd: liquidityUsd
      });
      const proposal = payload.result?.proposal || {};
      return send(msg, [
        "✅ Auto Simulation Accepted",
        "",
        `Token: ${proposal.token_mint}`,
        `Orders: ${proposal.order_count}`,
        `Amount per order: ${proposal.amount_per_order} ${proposal.currency}`,
        `Total simulated: ${proposal.total_amount} ${proposal.currency}`,
        `Interval: ${proposal.interval_minutes} minutes`,
        "",
        "No transaction was built, signed, scheduled or submitted."
      ].join("\n"));
    } catch (error) {
      const errors = error.payload?.result?.errors;
      return send(msg, [
        "⚠️ Auto Simulation Rejected",
        "",
        Array.isArray(errors) && errors.length ? errors.join("\n") : "The proposed settings did not pass the safety rules.",
        "",
        "No transaction was attempted."
      ].join("\n"));
    }
  });

  bot.onText(/^\/autopause(?:@\w+)?$/, async (msg) => {
    if (!isOwner(msg)) return ownerRequired(msg);
    try {
      await autoClient.pause();
      return send(msg, "⏸ Auto simulations paused. Execution remains locked.");
    } catch {
      return send(msg, "❌ Auto could not be paused. Execution remains locked by design.");
    }
  });

  bot.onText(/^\/autoresume(?:@\w+)?$/, async (msg) => {
    if (!isOwner(msg)) return ownerRequired(msg);
    try {
      await autoClient.resumeSimulation();
      return send(msg, "▶️ Auto simulation mode resumed. Live execution remains disabled.");
    } catch {
      return send(msg, "❌ Auto simulation mode could not be resumed. Live execution remains disabled.");
    }
  });

  bot.onText(/^\/autoemergency(?:@\w+)?$/, async (msg) => {
    if (!isOwner(msg)) return ownerRequired(msg);
    try {
      await autoClient.emergencyStop();
      return send(msg, "🛑 Auto emergency stop confirmed. Simulations are paused and execution is locked.");
    } catch {
      return send(msg, "🛑 Auto service was unreachable. This release still contains no transaction execution capability.");
    }
  });
}

module.exports = { registerAutoTelegramHandlers };
