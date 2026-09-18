const test = require("node:test");
const assert = require("node:assert/strict");
const {
  SAFE_MODE,
  loadSafetyLimits,
  publicStatus,
  validateSimulationRequest
} = require("../src/auto/core");
const { loadAutoConfig } = require("../src/auto/config");

const MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SAFE_SETTINGS = {
  max_order_amount: 1,
  max_daily_amount: 4,
  max_weekly_amount: 10,
  max_monthly_amount: 20,
  min_interval_minutes: 60,
  max_slippage_bps: 100,
  max_price_impact_bps: 100,
  min_liquidity_usd: 10000,
  paused: false,
  emergency_stop: false
};

function validRequest(overrides = {}) {
  return {
    network: "solana",
    token_mint: MINT,
    currency: "USDC",
    amount: 0.5,
    order_count: 4,
    interval_minutes: 120,
    slippage_bps: 50,
    price_impact_bps: 50,
    liquidity_usd: 25000,
    ...overrides
  };
}

test("Auto safety limits always force SAFE LOCKED MODE", () => {
  const limits = loadSafetyLimits({ execution_enabled: true, max_order_amount: 2 });
  assert.equal(limits.mode, SAFE_MODE);
  assert.equal(limits.executionEnabled, false);
  assert.equal(limits.manualConfirmationRequired, true);
});

test("valid allowlisted plan can be simulated but never executed", () => {
  const result = validateSimulationRequest(validRequest(), {
    settings: SAFE_SETTINGS,
    allowlistedTokens: new Set([MINT])
  });
  assert.equal(result.ok, true);
  assert.equal(result.mode, "safe_locked");
  assert.equal(result.execution_enabled, false);
  assert.equal(result.manual_confirmation_required, true);
  assert.equal(result.proposal.total_amount, 2);
  assert.match(result.disclaimer, /No transaction/i);
});

test("zero production caps reject every proposed purchase simulation", () => {
  const result = validateSimulationRequest(validRequest(), {
    settings: {},
    allowlistedTokens: new Set([MINT])
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("order_cap_exceeded"));
  assert.ok(result.errors.includes("daily_cap_exceeded"));
  assert.ok(result.errors.includes("weekly_cap_exceeded"));
  assert.ok(result.errors.includes("monthly_cap_exceeded"));
});

test("non-allowlisted tokens are rejected", () => {
  const result = validateSimulationRequest(validRequest(), {
    settings: SAFE_SETTINGS,
    allowlistedTokens: new Set()
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("token_not_allowlisted"));
});

test("unsafe interval, slippage, price impact and liquidity are rejected", () => {
  const result = validateSimulationRequest(validRequest({
    interval_minutes: 5,
    slippage_bps: 500,
    price_impact_bps: 500,
    liquidity_usd: 50
  }), {
    settings: SAFE_SETTINGS,
    allowlistedTokens: new Set([MINT])
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("interval_below_minimum"));
  assert.ok(result.errors.includes("slippage_limit_exceeded"));
  assert.ok(result.errors.includes("price_impact_limit_exceeded"));
  assert.ok(result.errors.includes("liquidity_below_minimum"));
});

test("unsupported networks and malformed token mints are rejected", () => {
  const result = validateSimulationRequest(validRequest({
    network: "ethereum",
    token_mint: "not-a-mint"
  }), {
    settings: SAFE_SETTINGS,
    allowlistedTokens: new Set(["not-a-mint"])
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("network_not_allowed"));
  assert.ok(result.errors.includes("invalid_token_mint"));
});

test("public status never reports live execution or signing", () => {
  const status = publicStatus({
    execution_enabled: true,
    signing_enabled: true,
    paused: false,
    emergency_stop: false
  }, { allowlistedTokens: 3 });
  assert.equal(status.execution_enabled, false);
  assert.equal(status.signing_enabled, false);
  assert.equal(status.active_schedules, 0);
  assert.equal(status.pending_live_orders, 0);
  assert.equal(status.allowlisted_tokens, 3);
});

test("service configuration refuses any live mode or signing secret", () => {
  const base = {
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "server-only-test-value",
    OWNER_TELEGRAM_ID: "123",
    AUTO_INTERNAL_TOKEN: "internal-test-value"
  };
  assert.throws(() => loadAutoConfig({ ...base, AUTO_MODE: "live" }), /safe_locked/);
  assert.throws(() => loadAutoConfig({ ...base, AUTO_EXECUTION_ENABLED: "true" }), /must remain false/);
  assert.throws(() => loadAutoConfig({ ...base, AUTO_WALLET_PRIVATE_KEY: "forbidden" }), /forbidden/);
  const config = loadAutoConfig(base);
  assert.equal(config.mode, "safe_locked");
  assert.equal(config.executionEnabled, false);
});
