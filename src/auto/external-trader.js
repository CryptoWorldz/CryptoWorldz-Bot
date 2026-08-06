const { isValidSolanaAddress } = require('./dca-core');

function createExternalDcaTrader(config = {}) {
  const executorUrl = String(config.dcaExecutorUrl || '').replace(/\/$/, '');
  const executorToken = String(config.dcaExecutorToken || '').trim();
  const configuredWallet = String(config.dcaWalletAddress || '').trim();

  function runtimeStatus(databaseWallet = '') {
    const wallet = String(databaseWallet || '').trim();
    return {
      apiReady: Boolean(executorUrl && executorToken),
      signerReady: Boolean(executorUrl && executorToken),
      executorReady: Boolean(executorUrl && executorToken),
      derivedWallet: configuredWallet || null,
      walletMatches: Boolean(
        isValidSolanaAddress(wallet) &&
        isValidSolanaAddress(configuredWallet) &&
        wallet === configuredWallet
      )
    };
  }

  function configured(databaseWallet = '') {
    const status = runtimeStatus(databaseWallet);
    return status.executorReady && status.walletMatches;
  }

  async function executeBuy(schedule, settings = {}) {
    if (!configured(settings.wallet_address)) {
      const error = new Error('Auto DCA executor or dedicated wallet verification is incomplete.');
      error.code = 'dca_runtime_not_ready';
      throw error;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(`${executorUrl}/execute-buy`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${executorToken}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          schedule_id: schedule.id,
          owner_telegram_id: schedule.owner_telegram_id,
          wallet_address: settings.wallet_address,
          input_mint: schedule.input_mint,
          output_mint: schedule.token_mint,
          amount_base_units: schedule.amount_base_units,
          slippage_bps: schedule.slippage_bps,
          max_price_impact_bps: schedule.max_price_impact_bps
        }),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.signature) {
        const error = new Error(payload.error || `Auto DCA executor returned ${response.status}.`);
        error.code = payload.error || 'dca_executor_failed';
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
    walletAddress: () => configuredWallet || null
  };
}

module.exports = { createExternalDcaTrader };
