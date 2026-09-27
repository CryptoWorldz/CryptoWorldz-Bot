function registerAutoTelegramHandlers({ bot, config, autoClient, supabase }) {
  const isOwner = (msg) => String(msg.from?.id || "") === String(config.ownerTelegramId || "");
  const send = (msg, text) => bot.sendMessage(msg.chat.id, text);

  async function isAutoExecutive(msg) {
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
    return send(msg, "⛔ Permanent Owner or Executive Leader access required.");
  }

  function formatStatus(payload) {
    const status = payload.status || {};
    const limits = status.limits || {};
    const dca = payload.dca || {};
    const policy = dca.policy || {};
    return [
      "💎 Worldz AUTO Buy-Only™",
      "",
      `AUTO mode: ${String(dca.mode || status.mode || "owner_dca").toUpperCase()}`,
      `DCA execution: ${dca.execution_enabled ? "ENABLED" : "READY WHEN OWNER ENABLES"}`,
      `Paused: ${status.paused ? "YES" : "NO"}`,
      `Emergency stop: ${status.emergency_stop ? "ACTIVE" : "CLEAR"}`,
      `Allowlisted tokens: ${status.allowlisted_tokens || 0}`,
      `Worldz buy universe: ${(payload.buy_universe || []).length}`,
      `Approved owner/dev wallets: ${dca.approved_wallets || 0} • executor matched: ${dca.matched_wallets || 0}`,
      "",
      "🤖 Owner Investment DCA",
      `Prepared: ${dca.prepared ? "YES" : "NO"}`,
      `Execution: ${dca.execution_enabled ? "ENABLED" : "ACTIVATION PENDING"}`,
      `Dedicated wallet: ${dca.wallet_address || "Not attached"}`,
      `Executor ready: ${dca.signer_ready ? "YES" : "NO"}`,
      `Executor API ready: ${dca.api_ready ? "YES" : "NO"}`,
      `Active schedules: ${dca.active_schedules || 0}`,
      "",
      `Funding asset: ${policy.allowed_input_currency || "SOL"}`,
      `Approved small batches: ${(policy.amount_presets || [0.005, 0.01, 0.02, 0.05, 0.1]).join(", ")} ${policy.allowed_input_currency || "SOL"}`,
      `Maximum order: ${limits.maxOrderAmount || 0} USDC`,
      `Daily spending cap: ${limits.maxDailyAmount || 0} USDC`,
      `Maximum completed buys: ${policy.max_buys_per_day || 6} per day`,
      `Minimum interval: ${limits.minIntervalMinutes || 0} minutes`,
      "Buy only: YES • Sell automation: NO • Owner/dev wallets only • Randomisation: OFF",
      "",
      "Executive Leaders may view status, pause and trigger the emergency stop.",
      "Schedule creation, activation and wallet controls are permanent-owner only."
    ].join("\n");
  }

  function formatDca(payload) {
    const dca = payload.dca || {};
    const policy = dca.policy || {};
    const schedules = payload.schedules || payload.dca_schedules || [];
    const rows = schedules.slice(0, 10).map((schedule) =>
      `• ${schedule.id}\n  ${schedule.amount_per_buy} ${schedule.input_currency} × ${schedule.order_count} • ${schedule.interval_minutes}m\n  ${String(schedule.status).toUpperCase()} • ${schedule.completed_buys || 0}/${schedule.order_count}`
    );
    return [
      "🤖 Owner Investment DCA Command Centre",
      "",
      `Execution: ${dca.execution_enabled ? "ENABLED" : "ACTIVATION PENDING"}`,
      `Dedicated wallet: ${dca.wallet_address || "Not attached"}`,
      `Executor: ${dca.signer_ready ? "READY" : "NOT CONFIGURED"}`,
      `Executor API: ${dca.api_ready ? "READY" : "NOT CONFIGURED"}`,
      `Emergency stop: ${dca.emergency_stop ? "ACTIVE" : "CLEAR"}`,
      "",
      `Policy: BUY ONLY • SOL • verified owner/dev wallets • no randomisation`,
      `Presets: ${(policy.amount_presets || [0.005, 0.01, 0.02, 0.05, 0.1]).join(", ")} SOL`,
      `Limit: ${policy.max_buys_per_day || 6} completed buys per day • minimum 240 minutes`,
      "",
      rows.length ? rows.join("\n\n") : "No DCA schedules yet.",
      "",
      "Create: /autodcanew MINT 0.01 SOL 6 240 150 250 [WALLET]",
      "Actions: /autodcastart UUID • /autodcapause UUID • /autodcaresume UUID • /autodcacancel UUID"
    ].join("\n");
  }

  bot.onText(/^\/auto(?:@\w+)?$/, async (msg) => {
    try {
      if (!(await isAutoExecutive(msg))) return executiveRequired(msg);
      return send(msg, formatStatus(await autoClient.status()));
    } catch (error) {
      if (error.code === "AUTO_NOT_CONFIGURED") return send(msg, "💎 Auto is prepared but not connected to its separate service yet.");
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
        "/autosimulate MINT 5 USDC 6 240 150 250 25000",
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
      return send(msg, `✅ Auto Simulation Accepted\n\nToken: ${proposal.token_mint}\nOrders: ${proposal.order_count}\nAmount: ${proposal.amount_per_order} ${proposal.currency}\nTotal: ${proposal.total_amount} ${proposal.currency}\nInterval: ${proposal.interval_minutes} minutes\n\nNo transaction was attempted.`);
    } catch (error) {
      const errors = error.payload?.result?.errors;
      return send(msg, `⚠️ Auto Simulation Rejected\n\n${Array.isArray(errors) && errors.length ? errors.join("\n") : "The proposed settings did not pass the AUTO rules."}\n\nNo transaction was attempted.`);
    }
  });

  bot.onText(/^\/autodca(?:@\w+)?$/, async (msg) => {
    if (!isOwner(msg)) return ownerRequired(msg);
    try { return send(msg, formatDca(await autoClient.dcaStatus())); }
    catch (error) { return send(msg, `❌ Auto DCA status failed: ${error.code || "service_unavailable"}`); }
  });

  bot.onText(/^\/autodcanew(?:@\w+)?(?:\s+([\s\S]+))?$/, async (msg, match) => {
    if (!isOwner(msg)) return ownerRequired(msg);
    const values = String(match?.[1] || "").trim().split(/\s+/);
    if (![7, 8].includes(values.length)) {
      return send(msg, "❌ Use: /autodcanew MINT preset_amount SOL buys interval_minutes slippage_bps max_price_impact_bps [WALLET]\nExample: /autodcanew MINT 0.01 SOL 6 240 150 250 DEV_WALLET\n\nSmall-batch amounts are controlled by the current AUTO settings.");
    }
    const [tokenMint, amount, currency, orderCount, intervalMinutes, slippageBps, maxPriceImpactBps, walletAddress] = values;
    try {
      const payload = await autoClient.dcaCreate({
        token_mint: tokenMint,
        amount_per_buy: amount,
        currency,
        order_count: orderCount,
        interval_minutes: intervalMinutes,
        slippage_bps: slippageBps,
        max_price_impact_bps: maxPriceImpactBps,
        wallet_address: walletAddress || undefined
      });
      return send(msg, `✅ Worldz AUTO Buy-Only Draft Created\n\nID: ${payload.schedule.id}\nWallet: ${payload.schedule.wallet_address || "Primary owner wallet"}\nBuy: ${payload.schedule.amount_per_buy} ${payload.schedule.input_currency}\nOrders: ${payload.schedule.order_count}\nInterval: ${payload.schedule.interval_minutes} minutes\n\nThe schedule remains a draft until the wallet/executor and spending gates are verified and you use /autodcastart.`);
    } catch (error) {
      const errors = error.payload?.errors;
      return send(msg, `⚠️ DCA draft rejected.\n\n${Array.isArray(errors) ? errors.join("\n") : error.code || "validation_failed"}`);
    }
  });

  for (const [command, action, label] of [
    ["autodcastart", "start", "started"],
    ["autodcapause", "pause", "paused"],
    ["autodcaresume", "resume", "resumed"],
    ["autodcacancel", "cancel", "cancelled"]
  ]) {
    bot.onText(new RegExp(`^\\/${command}(?:@\\w+)?(?:\\s+([0-9a-f-]{36}))?$`, "i"), async (msg, match) => {
      if (!isOwner(msg)) return ownerRequired(msg);
      const id = match?.[1];
      if (!id) return send(msg, `❌ Use: /${command} schedule_uuid`);
      try {
        await autoClient.dcaAction(id, action);
        return send(msg, `✅ Auto DCA schedule ${label}.\n\n${id}`);
      } catch (error) {
        return send(msg, `❌ Auto DCA could not be ${label}: ${error.code || "action_failed"}`);
      }
    });
  }

  bot.onText(/^\/autodcawallet(?:@\w+)?(?:\s+([1-9A-HJ-NP-Za-km-z]{32,44}))?$/, async (msg, match) => {
    if (!isOwner(msg)) return ownerRequired(msg);
    if (!match?.[1]) return send(msg, "❌ Use: /autodcawallet PUBLIC_SOLANA_ADDRESS\nNever send a seed phrase or private key.");
    try {
      await autoClient.dcaSetWallet(match[1]);
      return send(msg, "✅ Dedicated Owner Investment Wallet recorded. Execution remains disabled until the separate secure executor and matching wallet are verified.");
    } catch (error) {
      return send(msg, `❌ Auto DCA wallet could not be recorded: ${error.code || "wallet_update_failed"}`);
    }
  });

  bot.onText(/^\/autodcawalletadd(?:@\w+)?(?:\s+([1-9A-HJ-NP-Za-km-z]{32,44}))?(?:\s+(owner|dev))?(?:\s+([\s\S]+))?$/i, async (msg, match) => {
    if (!isOwner(msg)) return ownerRequired(msg);
    const walletAddress = match?.[1];
    const walletRole = String(match?.[2] || "dev").toLowerCase();
    const label = String(match?.[3] || (walletRole === "owner" ? "Owner AUTO Wallet" : "Dev AUTO Wallet")).trim();
    if (!walletAddress) return send(msg, "❌ Use: /autodcawalletadd PUBLIC_SOLANA_ADDRESS owner|dev LABEL\nNever send a seed phrase or private key.");
    try {
      const payload = await autoClient.dcaAddWallet(walletAddress, walletRole, label);
      return send(msg, [
        "✅ AUTO wallet registered.",
        `Role: ${walletRole.toUpperCase()}`,
        `Address: ${walletAddress}`,
        `Executor verified: ${payload.executor_verified ? "YES" : "NO — registration only"}`,
        "",
        "No spending authority is granted until the secure executor verifies this public wallet."
      ].join("\n"));
    } catch (error) {
      return send(msg, `❌ AUTO wallet could not be registered: ${error.code || "wallet_update_failed"}`);
    }
  });

  bot.onText(/^\/autobuyuniverse(?:@\w+)?$/, async (msg) => {
    if (!isOwner(msg)) return ownerRequired(msg);
    try {
      const payload = await autoClient.dcaStatus();
      const assets = payload.buy_universe || [];
      const grouped = {
        legacy: assets.filter((asset) => asset.source_kind === "legacy"),
        canonical: assets.filter((asset) => asset.source_kind === "canonical"),
        worldzlaunchpad: assets.filter((asset) => asset.source_kind === "worldzlaunchpad")
      };
      const rows = assets.slice(0, 60).map((asset) =>
        `• ${asset.symbol} • ${String(asset.chain_key || "").toUpperCase()} • ${asset.execution_state} • BUY ONLY`
      );
      return send(msg, [
        "🌐 WORLDZ AUTO BUY-ONLY UNIVERSE",
        `Legacy: ${grouped.legacy.length}`,
        `Canonical: ${grouped.canonical.length}`,
        `WorldzLaunchPad inherited: ${grouped.worldzlaunchpad.length}`,
        "",
        ...(rows.length ? rows : ["No migrated buy-universe rows are active on this runtime yet."]),
        "",
        "Registration does not itself enable spending."
      ].join("\n"));
    } catch (error) {
      return send(msg, `❌ AUTO buy universe could not be loaded: ${error.code || "service_unavailable"}`);
    }
  });

  bot.onText(/^\/autobuypolicy(?:@\w+)?$/, (msg) => send(msg, [
    "💎 WORLDZ AUTO BUY-ONLY™",
    "Owner-funded SOL • small batches • verified owner/dev wallets",
    "10 legacy tokens + WLDZ/RVIV + PNEX/MRCL when real mints exist + every future WorldzLaunchPad token",
    "No automated sells • no randomized volume pattern • no automatic spending merely from registration"
  ].join("\n")));

  bot.onText(/^\/autodcaenable(?:@\w+)?$/, async (msg) => {
    if (!isOwner(msg)) return ownerRequired(msg);
    try { await autoClient.dcaEnable(); return send(msg, "✅ Worldz AUTO Buy-Only enabled. Only owner-created, inherited/allowlisted, SOL-funded, capped schedules on verified owner/dev wallets can run."); }
    catch (error) { return send(msg, `⚠️ Auto DCA activation is incomplete: ${error.code || "runtime_not_ready"}`); }
  });

  bot.onText(/^\/autodcadisable(?:@\w+)?$/, async (msg) => {
    if (!isOwner(msg)) return ownerRequired(msg);
    try { await autoClient.dcaDisable(); return send(msg, "🔒 Owner Investment DCA disabled and paused."); }
    catch { return send(msg, "❌ Auto DCA could not confirm the disable request. Use /autoemergency."); }
  });

  bot.onText(/^\/autopause(?:@\w+)?$/, async (msg) => {
    try {
      if (!(await isAutoExecutive(msg))) return executiveRequired(msg);
      await autoClient.pause();
      return send(msg, "⏸ Auto paused. DCA execution is disabled until the owner re-enables it.");
    } catch {
      return send(msg, "❌ Auto could not be paused.");
    }
  });

  bot.onText(/^\/autoresume(?:@\w+)?$/, async (msg) => {
    if (!isOwner(msg)) return ownerRequired(msg);
    try {
      await autoClient.resumeSimulation();
      return send(msg, "▶️ Auto simulation mode resumed. DCA remains separately controlled.");
    } catch {
      return send(msg, "❌ Auto simulation mode could not be resumed.");
    }
  });

  bot.onText(/^\/autoemergency(?:@\w+)?$/, async (msg) => {
    try {
      if (!(await isAutoExecutive(msg))) return executiveRequired(msg);
      await autoClient.emergencyStop();
      return send(msg, "🛑 Auto emergency stop confirmed. Simulations and DCA execution are paused.");
    } catch {
      return send(msg, "🛑 Auto service was unreachable. Disable the separate Auto service immediately if required.");
    }
  });
}

module.exports = { registerAutoTelegramHandlers };
