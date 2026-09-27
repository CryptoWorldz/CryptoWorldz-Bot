const test = require("node:test");
const assert = require("node:assert/strict");
const { validatePublicAutoInvestPlan, publicAutoInvestBlueprint } = require("../src/auto/public-autoinvest-core");

const WALLET = "Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u";
const TOKEN = "AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U";

test("public AutoInvest is buy-only and non-custodial", () => {
  const result = validatePublicAutoInvestPlan({
    wallet: WALLET,
    output_mint: TOKEN,
    input_asset: "USDC",
    amount_per_buy: 10,
    cadence: "weekly",
    occurrences: 12,
    max_total_spend: 120,
    side: "BUY"
  });
  assert.equal(result.ok, true);
  assert.equal(result.plan.side, "BUY");
  assert.equal(result.plan.auto_sell, false);
  assert.equal(result.plan.requires_external_wallet_signature, true);
  assert.equal(result.plan.server_signing, false);
});

test("public AutoInvest rejects sell and secret material", () => {
  const result = validatePublicAutoInvestPlan({
    wallet: WALLET,
    output_mint: TOKEN,
    input_asset: "SOL",
    amount_per_buy: 1,
    cadence: "daily",
    occurrences: 2,
    max_total_spend: 2,
    side: "SELL",
    seed_phrase: "never accept this"
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("buy_only"));
  assert.ok(result.errors.includes("secret_material_forbidden"));
});

test("public AutoInvest requires a hard total-spend envelope", () => {
  const result = validatePublicAutoInvestPlan({
    wallet: WALLET,
    output_mint: TOKEN,
    input_asset: "USDC",
    amount_per_buy: 25,
    cadence: "monthly",
    occurrences: 10,
    max_total_spend: 200
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("plan_exceeds_user_max_total_spend"));
});

test("blueprint keeps public execution off until adapter release", () => {
  const blueprint = publicAutoInvestBlueprint();
  assert.equal(blueprint.public_mainnet_execution, false);
  assert.equal(blueprint.auto_sell, false);
  assert.equal(blueprint.secret_custody, false);
});
