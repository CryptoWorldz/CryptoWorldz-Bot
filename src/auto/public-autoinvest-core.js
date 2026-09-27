const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const INPUTS = Object.freeze({ SOL: { mint: SOL_MINT, decimals: 9 }, USDC: { mint: USDC_MINT, decimals: 6 } });
const CADENCE_MINUTES = Object.freeze({ daily: 1440, weekly: 10080, fortnightly: 20160, monthly: 43200 });

function finitePositive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function wholePositive(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
function isValidSolanaAddress(value) {
  return typeof value === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim());
}
function normalizeInput(value) {
  return String(value || "USDC").trim().toUpperCase();
}
function normalizeCadence(value) {
  return String(value || "").trim().toLowerCase();
}

function validatePublicAutoInvestPlan(input = {}, policy = {}) {
  const errors = [];
  const wallet = String(input.wallet || "").trim();
  const outputMint = String(input.output_mint || input.outputMint || "").trim();
  const inputAsset = normalizeInput(input.input_asset || input.inputAsset);
  const amountPerBuy = finitePositive(input.amount_per_buy ?? input.amountPerBuy);
  const occurrences = wholePositive(input.occurrences);
  const cadence = normalizeCadence(input.cadence);
  const userMaxTotalSpend = finitePositive(input.max_total_spend ?? input.maxTotalSpend);
  const provider = String(input.provider || "JUPITER_RECURRING_ORDER").trim().toUpperCase();
  const side = String(input.side || "BUY").trim().toUpperCase();

  if (!isValidSolanaAddress(wallet)) errors.push("invalid_wallet");
  if (!isValidSolanaAddress(outputMint)) errors.push("invalid_output_mint");
  if (!INPUTS[inputAsset]) errors.push("unsupported_input_asset");
  if (INPUTS[inputAsset]?.mint === outputMint) errors.push("input_and_output_must_differ");
  if (side !== "BUY") errors.push("buy_only");
  if (!amountPerBuy) errors.push("invalid_amount_per_buy");
  if (!occurrences || occurrences > (Number(policy.maxOccurrences) || 3650)) errors.push("invalid_occurrences");
  if (!CADENCE_MINUTES[cadence]) errors.push("unsupported_cadence");
  if (!userMaxTotalSpend) errors.push("max_total_spend_required");

  const calculatedTotal = amountPerBuy && occurrences ? amountPerBuy * occurrences : null;
  if (calculatedTotal !== null && userMaxTotalSpend !== null && calculatedTotal > userMaxTotalSpend + 1e-9) {
    errors.push("plan_exceeds_user_max_total_spend");
  }
  const platformMaxOrder = finitePositive(policy.maxOrderAmount);
  if (platformMaxOrder && amountPerBuy && amountPerBuy > platformMaxOrder) errors.push("platform_order_cap_exceeded");
  const platformMaxTotal = finitePositive(policy.maxTotalSpend);
  if (platformMaxTotal && calculatedTotal && calculatedTotal > platformMaxTotal) errors.push("platform_total_cap_exceeded");
  if (input.randomized_execution === true || input.multiwallet === true) errors.push("market_integrity_policy_locked");
  if (input.private_key || input.seed_phrase || input.recovery_phrase) errors.push("secret_material_forbidden");

  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
    plan: {
      side: "BUY",
      chain: "solana",
      wallet: wallet || null,
      output_mint: outputMint || null,
      input_asset: INPUTS[inputAsset] ? inputAsset : null,
      input_mint: INPUTS[inputAsset]?.mint || null,
      amount_per_buy: amountPerBuy,
      cadence,
      interval_minutes: CADENCE_MINUTES[cadence] || null,
      occurrences,
      calculated_total_spend: calculatedTotal,
      user_max_total_spend: userMaxTotalSpend,
      provider,
      state: "PLAN_ONLY",
      requires_external_wallet_signature: true,
      server_signing: false,
      auto_sell: false
    }
  };
}

function publicAutoInvestBlueprint() {
  return {
    brand: "WorldzAutoInvest™",
    ui_brand: "WealthBuild™",
    mode: "self_directed_buy_only",
    custody: "external_wallet",
    initial_chain: "solana",
    provider_target: "JUPITER_RECURRING_ORDER",
    supported_input_assets: Object.keys(INPUTS),
    supported_cadences: Object.keys(CADENCE_MINUTES),
    auto_sell: false,
    secret_custody: false,
    public_mainnet_execution: false
  };
}

module.exports = {
  CADENCE_MINUTES,
  INPUTS,
  SOL_MINT,
  USDC_MINT,
  isValidSolanaAddress,
  publicAutoInvestBlueprint,
  validatePublicAutoInvestPlan
};
