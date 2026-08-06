const test = require('node:test');
const assert = require('node:assert/strict');
const {
  decimalToBaseUnits,
  validateDcaSchedule,
  SOL_MINT
} = require('../src/auto/dca-core');

const TOKEN = '2DqyvXv7Bf2GdJjZ7QiY3Gm6hjx8Hf5tABcDEFaTpbn';

function settings(overrides = {}) {
  return {
    max_order_amount: 0.05,
    max_daily_amount: 0.20,
    max_weekly_amount: 1.0,
    max_monthly_amount: 4.0,
    min_interval_minutes: 15,
    max_slippage_bps: 300,
    max_price_impact_bps: 500,
    ...overrides
  };
}

test('decimalToBaseUnits handles small SOL amounts without floating-point conversion', () => {
  assert.equal(decimalToBaseUnits('0.005', 9), '5000000');
  assert.equal(decimalToBaseUnits('0.000000001', 9), '1');
  assert.equal(decimalToBaseUnits('0.0000000001', 9), null);
});

test('validates a small owner DCA schedule', () => {
  const result = validateDcaSchedule({
    token_mint: TOKEN,
    currency: 'SOL',
    amount_per_buy: '0.005',
    order_count: 20,
    interval_minutes: 120,
    slippage_bps: 150,
    max_price_impact_bps: 300
  }, {
    settings: settings(),
    allowlistedTokens: new Set([TOKEN])
  });

  assert.equal(result.ok, true);
  assert.equal(result.proposal.input_mint, SOL_MINT);
  assert.equal(result.proposal.amount_base_units, '5000000');
  assert.equal(result.proposal.total_budget, 0.1);
});

test('rejects unallowlisted tokens and unsafe limits', () => {
  const result = validateDcaSchedule({
    token_mint: TOKEN,
    currency: 'SOL',
    amount_per_buy: '0.1',
    order_count: 4,
    interval_minutes: 5,
    slippage_bps: 900,
    max_price_impact_bps: 900
  }, {
    settings: settings(),
    allowlistedTokens: new Set()
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('token_not_allowlisted'));
  assert.ok(result.errors.includes('order_cap_exceeded'));
  assert.ok(result.errors.includes('interval_below_minimum'));
  assert.ok(result.errors.includes('slippage_limit_exceeded'));
  assert.ok(result.errors.includes('price_impact_limit_exceeded'));
});
