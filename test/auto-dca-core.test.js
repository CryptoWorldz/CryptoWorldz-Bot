const test = require("node:test");
const assert = require("node:assert/strict");
const {
  decimalToBaseUnits,
  validateDcaSchedule,
  SOL_MINT
} = require("../src/auto/dca-core");

const TOKEN = "2DqyvXv7Bf2GdJjZ7QiY3Gm6hjx8Hf5tABcDEFaTpbn";
const WALLET = "11111111111111111111111111111111";

function settings(overrides = {}) {
  return {
    max_order_amount: 0.1,
    max_daily_amount: 0.3,
    max_weekly_amount: 1,
    max_monthly_amount: 4,
    min_interval_minutes: 240,
    max_slippage_bps: 200,
    max_price_impact_bps: 300,
    allowed_input_currency: "SOL",
    max_buys_per_day: 6,
    amount_presets: [0.005, 0.01, 0.02, 0.05, 0.1],
    weekly_budget_aud_cents: 0,
    buy_only: true,
    multiwallet_enabled: true,
    randomized_execution: false,
    auto_enroll_worldz_tokens: true,
    ...overrides
  };
}

test("decimalToBaseUnits handles SOL amounts without floating-point conversion", () => {
  assert.equal(decimalToBaseUnits("0.01", 9), "10000000");
  assert.equal(decimalToBaseUnits("0.005", 9), "5000000");
  assert.equal(decimalToBaseUnits("0.0000000001", 9), null);
});

test("validates an owner-funded SOL buy-only schedule for an approved wallet", () => {
  const result = validateDcaSchedule({
    token_mint: TOKEN,
    wallet_address: WALLET,
    currency: "SOL",
    amount_per_buy: "0.01",
    order_count: 6,
    interval_minutes: 240,
    slippage_bps: 150,
    max_price_impact_bps: 250
  }, {
    settings: settings(),
    allowlistedTokens: new Set([TOKEN]),
    allowlistedWallets: new Set([WALLET])
  });

  assert.equal(result.ok, true);
  assert.equal(result.proposal.input_mint, SOL_MINT);
  assert.equal(result.proposal.wallet_address, WALLET);
  assert.equal(result.proposal.amount_base_units, "10000000");
  assert.equal(result.proposal.total_budget, 0.06);
});

test("rejects wrong funding currency, non-preset batch, unknown wallet and randomized policy", () => {
  const result = validateDcaSchedule({
    token_mint: TOKEN,
    wallet_address: WALLET,
    currency: "USDC",
    amount_per_buy: "0.03",
    order_count: 4,
    interval_minutes: 60,
    slippage_bps: 900,
    max_price_impact_bps: 900
  }, {
    settings: settings({ randomized_execution: true }),
    allowlistedTokens: new Set(),
    allowlistedWallets: new Set()
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("investment_currency_not_allowed"));
  assert.ok(result.errors.includes("amount_not_approved_preset"));
  assert.ok(result.errors.includes("investment_policy_locked"));
  assert.ok(result.errors.includes("token_not_allowlisted"));
  assert.ok(result.errors.includes("wallet_not_allowlisted"));
  assert.ok(result.errors.includes("interval_below_minimum"));
  assert.ok(result.errors.includes("slippage_limit_exceeded"));
  assert.ok(result.errors.includes("price_impact_limit_exceeded"));
});
