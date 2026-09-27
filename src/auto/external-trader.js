const { isValidSolanaAddress } = require("./dca-core");

function uniqueWallets(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(isValidSolanaAddress))];
}

function createExternalDcaTrader(config = {}) {
  const executorUrl = String(config.dcaExecutorUrl || "").replace(/\/$/, "");
  const executorToken = String(config.dcaExecutorToken || "").trim();
  const configuredWallets = uniqueWallets([
    ...(Array.isArray(config.dcaWalletAddresses) ? config.dcaWalletAddresses : []),
    config.dcaWalletAddress
  ]);
  const configuredWalletSet = new Set(configuredWallets);

  function normalizeDatabaseWallets(value) {
    if (Array.isArray(value)) {
      return uniqueWallets(value.map((item) => typeof item === "string" ? item : item?.wallet_address));
    }
    return uniqueWallets([value]);
  }

  function runtimeStatus(databaseWallets = []) {
    const approved = normalizeDatabaseWallets(databaseWallets);
    const matched = approved.filter((wallet) => configuredWalletSet.has(wallet));
    const executorReady = Boolean(executorUrl && executorToken);
    return {
      apiReady: executorReady,
      signerReady: executorReady && configuredWallets.length > 0,
      executorReady,
      derivedWallet: configuredWallets[0] || null,
      configuredWallets: configuredWallets.length,
      approvedWallets: approved.length,
      matchedWallets: matched.length,
      walletMatches: approved.length > 0 && matched.length === approved.length
    };
  }

  function configured(databaseWallet = "") {
    const wallet = String(databaseWallet || "").trim();
    return Boolean(executorUrl && executorToken && isValidSolanaAddress(wallet) && configuredWalletSet.has(wallet));
  }

  async function executeBuy(schedule, settings = {}) {
    const walletAddress = String(schedule.wallet_address || settings.wallet_address || "").trim();
    if (!configured(walletAddress)) {
      const error = new Error("Auto DCA executor or approved owner/dev wallet verification is incomplete.");
      error.code = "dca_runtime_not_ready";
      throw error;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(`${executorUrl}/execute-buy`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${executorToken}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          schedule_id: schedule.id,
          owner_telegram_id: schedule.owner_telegram_id,
          wallet_address: walletAddress,
          input_mint: schedule.input_mint,
          output_mint: schedule.token_mint,
          amount_base_units: schedule.amount_base_units,
          slippage_bps: schedule.slippage_bps,
          max_price_impact_bps: schedule.max_price_impact_bps,
          policy: "BUY_ONLY"
        }),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.signature) {
        const error = new Error(payload.error || `Auto DCA executor returned ${response.status}.`);
        error.code = payload.error || "dca_executor_failed";
        error.payload = payload;
        throw error;
      }
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    configured,
    executeBuy,
    runtimeStatus,
    walletAddress: () => configuredWallets[0] || null,
    walletAddresses: () => [...configuredWallets]
  };
}

module.exports = { createExternalDcaTrader, uniqueWallets };
