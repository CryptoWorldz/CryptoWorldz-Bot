const SAFE_MODE = "safe_locked";
const SUPPORTED_NETWORKS = Object.freeze(["solana"]);
const SUPPORTED_CURRENCIES = Object.freeze(["SOL", "USDC"]);

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

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function normalizeNetwork(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeCurrency(value) {
  return String(value || "").trim().toUpperCase();
}

function isValidSolanaMint(value) {
  return typeof value === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim());
}

function loadSafetyLimits(settings = {}) {
  return {
    mode: SAFE_MODE,
    executionEnabled: false,
    maxOrderAmount: nonNegativeNumber(settings.max_order_amount) ?? 0,
    maxDailyAmount: nonNegativeNumber(settings.max_daily_amount) ?? 0,
    maxWeeklyAmount: nonNegativeNumber(settings.max_weekly_amount) ?? 0,
    maxMonthlyAmount: nonNegativeNumber(settings.max_monthly_amount) ?? 0,
    minIntervalMinutes: Math.max(1, Math.floor(nonNegativeNumber(settings.min_interval_minutes) ?? 60)),
    maxSlippageBps: Math.max(0, Math.floor(nonNegativeNumber(settings.max_slippage_bps) ?? 100)),
    maxPriceImpactBps: Math.max(0, Math.floor(nonNegativeNumber(settings.max_price_impact_bps) ?? 100)),
    minLiquidityUsd: nonNegativeNumber(settings.min_liquidity_usd) ?? 0,
    manualConfirmationRequired: true
  };
}

function validateSimulationRequest(input = {}, context = {}) {
  const network = normalizeNetwork(input.network);
  const tokenMint = String(input.token_mint || "").trim();
  const currency = normalizeCurrency(input.currency);
  const amount = positiveNumber(input.amount);
  const orderCount = Math.floor(positiveNumber(input.order_count) || 1);
  const intervalMinutes = Math.floor(positiveNumber(input.interval_minutes) || 0);
  const slippageBps = Math.floor(nonNegativeNumber(input.slippage_bps) ?? -1);
  const priceImpactBps = Math.floor(nonNegativeNumber(input.price_impact_bps) ?? -1);
  const liquidityUsd = nonNegativeNumber(input.liquidity_usd);
  const limits = loadSafetyLimits(context.settings);
  const errors = [];

  if (!SUPPORTED_NETWORKS.includes(network)) errors.push("network_not_allowed");
  if (!isValidSolanaMint(tokenMint)) errors.push("invalid_token_mint");
  if (!SUPPORTED_CURRENCIES.includes(currency)) errors.push("currency_not_allowed");
  if (amount === null) errors.push("invalid_amount");
  if (!Number.isSafeInteger(orderCount) || orderCount < 1 || orderCount > 365) errors.push("invalid_order_count");
  if (!Number.isSafeInteger(intervalMinutes) || intervalMinutes < limits.minIntervalMinutes) errors.push("interval_below_minimum");
  if (!Number.isSafeInteger(slippageBps) || slippageBps < 0 || slippageBps > limits.maxSlippageBps) errors.push("slippage_limit_exceeded");
  if (!Number.isSafeInteger(priceImpactBps) || priceImpactBps < 0 || priceImpactBps > limits.maxPriceImpactBps) errors.push("price_impact_limit_exceeded");
  if (liquidityUsd === null || liquidityUsd < limits.minLiquidityUsd) errors.push("liquidity_below_minimum");

  const allowlistedTokens = context.allowlistedTokens instanceof Set
    ? context.allowlistedTokens
    : new Set(Array.isArray(context.allowlistedTokens) ? context.allowlistedTokens : []);
  if (!allowlistedTokens.has(tokenMint)) errors.push("token_not_allowlisted");

  if (amount !== null) {
    const total = amount * orderCount;
    if (limits.maxOrderAmount <= 0 || amount > limits.maxOrderAmount) errors.push("order_cap_exceeded");
    if (limits.maxDailyAmount <= 0 || total > limits.maxDailyAmount) errors.push("daily_cap_exceeded");
    if (limits.maxWeeklyAmount <= 0 || total > limits.maxWeeklyAmount) errors.push("weekly_cap_exceeded");
    if (limits.maxMonthlyAmount <= 0 || total > limits.maxMonthlyAmount) errors.push("monthly_cap_exceeded");
  }

  return {
    ok: errors.length === 0,
    mode: SAFE_MODE,
    execution_enabled: false,
    manual_confirmation_required: true,
    errors: [...new Set(errors)],
    proposal: {
      network,
      token_mint: tokenMint,
      currency,
      amount_per_order: amount,
      order_count: orderCount,
      total_amount: amount === null ? null : amount * orderCount,
      interval_minutes: intervalMinutes,
      slippage_bps: slippageBps,
      price_impact_bps: priceImpactBps,
      liquidity_usd: liquidityUsd
    },
    disclaimer: "Simulation only. No transaction will be built, signed, submitted or scheduled for execution."
  };
}

function publicStatus(settings = {}, counts = {}) {
  const limits = loadSafetyLimits(settings);
  return {
    service: "Diamond Buy Auto",
    name: "Auto",
    mode: SAFE_MODE,
    execution_enabled: false,
    signing_enabled: false,
    owner_controlled: true,
    emergency_stop: settings.emergency_stop !== false,
    paused: settings.paused !== false,
    allowlisted_tokens: Number(counts.allowlistedTokens) || 0,
    active_schedules: 0,
    pending_live_orders: 0,
    limits
  };
}

module.exports = {
  SAFE_MODE,
  SUPPORTED_CURRENCIES,
  SUPPORTED_NETWORKS,
  isValidSolanaMint,
  loadSafetyLimits,
  normalizeCurrency,
  normalizeNetwork,
  parseBoolean,
  publicStatus,
  validateSimulationRequest
};
