function registerAutoTelegramHandlers({ bot, config, autoClient, supabase }) {
  const isOwner = (msg) => String(msg.from?.id || "") === String(config.ownerTelegramId || "");
  const send = (msg, text) => bot.sendMessage(msg.chat.id, text);

  async function isSafetyExecutive(msg) {
    if (isOwner(msg)) return true;
    if (!supabase || !msg.from?.id) return false;
    const { data, error } = await supabase
      .from("executive_admins")
      .select("status")
      .eq("telegram_id", msg.from.id)
      .maybeSingle();
    if (error && error.code !== "42P01") throw error;
    return Boolean(data && data.status === "active");
  }

  function ownerRequired(msg) {
    return send(msg, "⛔ This Auto control is restricted to the permanent owner.");
  }

  function executiveRequired(msg) {
    return send(msg, "⛔ Permanent Owner or Executive Leader safety access required.");
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
      "Executive Leaders may view status, pause and trigger the emergency stop.",
      "Only the permanent owner may simulate or resume Auto."
    ].join("\n");
  }

  bot.onText(/^\/auto(?:@\w+)?$/, async (msg) => {
    try {
      if (!(await isSafetyExecutive(msg))) return executiveRequired(msg);
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
    try {
      if (!(await isSafetyExecutive(msg))) return executiveRequired(msg);
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
    try {
      if (!(await isSafetyExecutive(msg))) return executiveRequired(msg);
      await autoClient.emergencyStop();
      return send(msg, "🛑 Auto emergency stop confirmed. Simulations are paused and execution is locked.");
    } catch {
      return send(msg, "🛑 Auto service was unreachable. This release still contains no transaction execution capability.");
    }
  });
}

module.exports = { registerAutoTelegramHandlers };