const test = require('node:test');
const assert = require('node:assert/strict');
const {
  decimalToBaseUnits,
  validateDcaSchedule,
  DEFAULT_USDC_MINT
} = require('../src/auto/dca-core');

const TOKEN = '2DqyvXv7Bf2GdJjZ7QiY3Gm6hjx8Hf5tABcDEFaTpbn';

function settings(overrides = {}) {
  return {
    max_order_amount: 15,
    max_daily_amount: 30,
    max_weekly_amount: 100,
    max_monthly_amount: 400,
    min_interval_minutes: 240,
    max_slippage_bps: 200,
    max_price_impact_bps: 300,
    allowed_input_currency: 'USDC',
    max_buys_per_day: 6,
    amount_presets: [2, 3, 5, 7, 10, 15],
    weekly_budget_aud_cents: 10000,
    buy_only: true,
    multiwallet_enabled: false,
    randomized_execution: false,
    ...overrides
  };
}

test('decimalToBaseUnits handles USDC amounts without floating-point conversion', () => {
  assert.equal(decimalToBaseUnits('5', 6), '5000000');
  assert.equal(decimalToBaseUnits('2.5', 6), '2500000');
  assert.equal(decimalToBaseUnits('0.0000001', 6), null);
});

test('validates a transparent owner USDC investment schedule', () => {
  const result = validateDcaSchedule({
    token_mint: TOKEN,
    currency: 'USDC',
    amount_per_buy: '5',
    order_count: 6,
    interval_minutes: 240,
    slippage_bps: 150,
    max_price_impact_bps: 250
  }, {
    settings: settings(),
    allowlistedTokens: new Set([TOKEN])
  });

  assert.equal(result.ok, true);
  assert.equal(result.proposal.input_mint, DEFAULT_USDC_MINT);
  assert.equal(result.proposal.amount_base_units, '5000000');
  assert.equal(result.proposal.total_budget, 30);
});

test('rejects SOL, non-preset amounts and unsafe multiwallet policy', () => {
  const result = validateDcaSchedule({
    token_mint: TOKEN,
    currency: 'SOL',
    amount_per_buy: '4',
    order_count: 4,
    interval_minutes: 60,
    slippage_bps: 900,
    max_price_impact_bps: 900
  }, {
    settings: settings({ multiwallet_enabled: true, randomized_execution: true }),
    allowlistedTokens: new Set()
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('investment_currency_must_be_usdc'));
  assert.ok(result.errors.includes('amount_not_approved_preset'));
  assert.ok(result.errors.includes('investment_policy_locked'));
  assert.ok(result.errors.includes('token_not_allowlisted'));
  assert.ok(result.errors.includes('interval_below_minimum'));
  assert.ok(result.errors.includes('slippage_limit_exceeded'));
  assert.ok(result.errors.includes('price_impact_limit_exceeded'));
});
