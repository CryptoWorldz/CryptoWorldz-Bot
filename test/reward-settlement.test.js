const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildFundingPlan,
  normalizeRewardAsset,
  parseFundingRecord
} = require("../src/reward-settlement");

test("reward asset choices allow only USDC or SOL", () => {
  assert.equal(normalizeRewardAsset("usdc"), "USDC");
  assert.equal(normalizeRewardAsset("SOL"), "SOL");
  assert.equal(normalizeRewardAsset("btc"), null);
});

test("funding records require AUD value, USDC amount and Solana signature", () => {
  const signature = "5".repeat(64);
  assert.deepEqual(parseFundingRecord(`40 | 26.15 | ${signature}`), {
    ok: true,
    audCents: 4000,
    usdcAmount: 26.15,
    signature
  });
  assert.equal(parseFundingRecord(`200 | 125 | ${signature}`).ok, true);
  assert.equal(parseFundingRecord(`201 | 125 | ${signature}`).ok, false);
  assert.equal(parseFundingRecord("40 | 26.15 | invalid").ok, false);
});

test("funding plan explains target, hard cap, tranches and payout choices", () => {
  const text = buildFundingPlan({
    weekly_target_aud_cents: 10000,
    weekly_max_aud_cents: 20000,
    weekly_target_points: 5000,
    funding_asset: "USDC",
    recorded_aud_cents: 4000,
    remaining_aud_cents: 6000,
    max_remaining_aud_cents: 16000,
    funding_schedule: [
      { day_label: "Monday", planned_aud_cents: 4000 },
      { day_label: "Tuesday", planned_aud_cents: 3000 },
      { day_label: "Thursday", planned_aud_cents: 3000 }
    ]
  }, {
    public_address: "CFzJU62m9obkMKAMjSnQPVkwYrVmHJqQhySURj5MeSy"
  });

  assert.match(text, /Operating target: AUD \$100\.00/);
  assert.match(text, /Absolute wallet deposit-recording cap: AUD \$200\.00/);
  assert.match(text, /Monday: AUD \$40\.00/);
  assert.match(text, /Tuesday: AUD \$30\.00/);
  assert.match(text, /USDC or SOL/);
  assert.match(text, /emergency maximum, not a spending recommendation/);
  assert.match(text, /No automatic transfers/);
});
