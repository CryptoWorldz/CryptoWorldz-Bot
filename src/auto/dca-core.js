const SOL_MINT = "So11111111111111111111111111111111111111112";
const DEFAULT_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SUPPORTED_INPUTS = Object.freeze({ SOL: 9, USDC: 6 });
const DCA_STATUSES = Object.freeze(["draft", "active", "paused", "cancelled", "completed", "error"]);

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveNumber(value) {
  const number = finiteNumber(value);
  return number !== null && number > 0 ? number : null;
}

function nonNegativeNumber(value) {
  const number = finiteNumber(value);
  return number !== null && number >= 0 ? number : null;
}

function normalizeCurrency(value) {
  return String(value || "SOL").trim().toUpperCase();
}

function isValidSolanaAddress(value) {
  return typeof value === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim());
}

function decimalToBaseUnits(value, decimals) {
  const text = String(value ?? "").trim();
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  if (fraction.length > decimals) return null;
  const units = `${whole}${fraction.padEnd(decimals, "0")}`.replace(/^0+(?=\d)/, "");
  try {
    const amount = BigInt(units || "0");
    return amount > 0n ? amount.toString() : null;
  } catch {
    return null;
  }
}

function loadDcaLimits(settings = {}) {
  return {
    enabled: settings.enabled === true,
    paused: settings.paused !== false,
    emergencyStop: settings.emergency_stop !== false,
    executionEnabled: settings.execution_enabled === true,
    walletAddress: String(settings.wallet_address || "").trim(),
    maxOrderAmount: nonNegativeNumber(settings.max_order_amount) ?? 0,
    maxDailyAmount: nonNegativeNumber(settings.max_daily_amount) ?? 0,
    maxWeeklyAmount: nonNegativeNumber(settings.max_weekly_amount) ?? 0,
    maxMonthlyAmount: nonNegativeNumber(settings.max_monthly_amount) ?? 0,
    minIntervalMinutes: Math.max(15, Math.floor(nonNegativeNumber(settings.min_interval_minutes) ?? 60)),
    maxSlippageBps: Math.max(1, Math.floor(nonNegativeNumber(settings.max_slippage_bps) ?? 300)),
    maxPriceImpactBps: Math.max(1, Math.floor(nonNegativeNumber(settings.max_price_impact_bps) ?? 500))
  };
}

function validateDcaSchedule(input = {}, context = {}) {
  const tokenMint = String(input.token_mint || input.tokenMint || "").trim();
  const currency = normalizeCurrency(input.currency || input.input_currency);
  const amountText = String(input.amount_per_buy ?? input.amount ?? "").trim();
  const amount = positiveNumber(amountText);
  const orderCount = Math.floor(positiveNumber(input.order_count) || 0);
  const intervalMinutes = Math.floor(positiveNumber(input.interval_minutes) || 0);
  const slippageBps = Math.floor(nonNegativeNumber(input.slippage_bps) ?? -1);
  const maxPriceImpactBps = Math.floor(nonNegativeNumber(input.max_price_impact_bps ?? input.price_impact_bps) ?? -1);
  const startAt = input.start_at ? new Date(input.start_at) : new Date();
  const limits = loadDcaLimits(context.settings);
  const errors = [];

  if (!isValidSolanaAddress(tokenMint)) errors.push("invalid_token_mint");
  if (!Object.prototype.hasOwnProperty.call(SUPPORTED_INPUTS, currency)) errors.push("currency_not_allowed");
  if (amount === null) errors.push("invalid_amount");
  if (!Number.isSafeInteger(orderCount) || orderCount < 1 || orderCount > 10000) errors.push("invalid_order_count");
  if (!Number.isSafeInteger(intervalMinutes) || intervalMinutes < limits.minIntervalMinutes) errors.push("interval_below_minimum");
  if (!Number.isSafeInteger(slippageBps) || slippageBps < 1 || slippageBps > limits.maxSlippageBps) errors.push("slippage_limit_exceeded");
  if (!Number.isSafeInteger(maxPriceImpactBps) || maxPriceImpactBps < 1 || maxPriceImpactBps > limits.maxPriceImpactBps) errors.push("price_impact_limit_exceeded");
  if (Number.isNaN(startAt.getTime())) errors.push("invalid_start_time");

  const allowlistedTokens = context.allowlistedTokens instanceof Set
    ? context.allowlistedTokens
    : new Set(Array.isArray(context.allowlistedTokens) ? context.allowlistedTokens : []);
  if (!allowlistedTokens.has(tokenMint)) errors.push("token_not_allowlisted");

  const decimals = SUPPORTED_INPUTS[currency];
  const amountBaseUnits = decimals === undefined ? null : decimalToBaseUnits(amountText, decimals);
  if (!amountBaseUnits) errors.push("amount_precision_invalid");

  const totalAmount = amount === null || !Number.isSafeInteger(orderCount) ? null : amount * orderCount;
  const projectedDaily = amount === null || intervalMinutes < 1 ? null : amount * Math.min(orderCount, Math.ceil(1440 / intervalMinutes));
  const projectedWeekly = amount === null || intervalMinutes < 1 ? null : amount * Math.min(orderCount, Math.ceil(10080 / intervalMinutes));
  const projectedMonthly = amount === null || intervalMinutes < 1 ? null : amount * Math.min(orderCount, Math.ceil(43200 / intervalMinutes));
  if (amount !== null) {
    if (limits.maxOrderAmount <= 0 || amount > limits.maxOrderAmount) errors.push("order_cap_exceeded");
    if (projectedDaily !== null && (limits.maxDailyAmount <= 0 || projectedDaily > limits.maxDailyAmount)) errors.push("daily_cap_exceeded");
    if (projectedWeekly !== null && (limits.maxWeeklyAmount <= 0 || projectedWeekly > limits.maxWeeklyAmount)) errors.push("weekly_cap_exceeded");
    if (projectedMonthly !== null && (limits.maxMonthlyAmount <= 0 || projectedMonthly > limits.maxMonthlyAmount)) errors.push("monthly_cap_exceeded");
  }

  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
    proposal: {
      token_mint: tokenMint,
      input_currency: currency,
      input_mint: currency === "SOL" ? SOL_MINT : String(context.usdcMint || DEFAULT_USDC_MINT),
      input_decimals: decimals,
      amount_per_buy: amount,
      amount_base_units: amountBaseUnits,
      order_count: orderCount,
      total_budget: totalAmount,
      projected_daily_amount: projectedDaily,
      projected_weekly_amount: projectedWeekly,
      projected_monthly_amount: projectedMonthly,
      interval_minutes: intervalMinutes,
      slippage_bps: slippageBps,
      max_price_impact_bps: maxPriceImpactBps,
      start_at: Number.isNaN(startAt.getTime()) ? null : startAt.toISOString()
    }
  };
}

function dcaPublicStatus(settings = {}, counts = {}, runtime = {}) {
  const limits = loadDcaLimits(settings);
  const signerReady = runtime.signerReady === true;
  const apiReady = runtime.apiReady === true;
  const walletMatches = runtime.walletMatches === true;
  return {
    mode: "owner_dca",
    prepared: true,
    enabled: limits.enabled,
    paused: limits.paused,
    emergency_stop: limits.emergencyStop,
    execution_enabled: limits.executionEnabled && signerReady && apiReady && walletMatches,
    signer_ready: signerReady,
    api_ready: apiReady,
    wallet_address: limits.walletAddress || null,
    wallet_matches_signer: walletMatches,
    active_schedules: Number(counts.active) || 0,
    draft_schedules: Number(counts.draft) || 0,
    completed_schedules: Number(counts.completed) || 0,
    total_executions: Number(counts.executions) || 0,
    limits
  };
}

module.exports = {
  DCA_STATUSES,
  DEFAULT_USDC_MINT,
  SOL_MINT,
  SUPPORTED_INPUTS,
  dcaPublicStatus,
  decimalToBaseUnits,
  isValidSolanaAddress,
  loadDcaLimits,
  normalizeCurrency,
  validateDcaSchedule
};
