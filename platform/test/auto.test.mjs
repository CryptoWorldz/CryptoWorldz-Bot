import assert from "node:assert/strict";
import test from "node:test";
import { createAutoController, validateBuyProposal } from "../src/auto.mjs";

const safeProposal = {
  side: "buy",
  network: "solana",
  tokenMint: "So11111111111111111111111111111111111111112",
  walletAddress: "9xQeWvG816bUx9EPfEZmBUyXrZd2jGqG8qvKX8Q7xQp",
  inputCurrency: "USDC",
  amountPerBuy: 10,
  orderCount: 5,
  intervalMinutes: 120,
  slippageBps: 100,
  priceImpactBps: 150,
  liquidityUsd: 100000,
};

const settings = {
  enabled: false,
  execution_enabled: false,
  paused: true,
  emergency_stop: true,
  wallet_connected: true,
  max_order_amount: 25,
  max_monthly_amount: 100,
  min_interval_minutes: 60,
  max_slippage_bps: 300,
  max_price_impact_bps: 500,
  min_liquidity_usd: 50000,
};

test("Auto normalizes a legal owner-approved buy intent without enabling execution", () => {
  const intent = validateBuyProposal(safeProposal, settings);
  assert.equal(intent.side, "buy");
  assert.equal(intent.totalBudget, 50);
  assert.equal(intent.externalSignerRequired, true);
  assert.equal(intent.sellingEnabled, false);
  assert.equal(intent.artificialVolumeEnabled, false);
});

test("Auto refuses selling, secrets, multi-wallet behaviour and artificial volume", () => {
  const rejected = [
    [{ ...safeProposal, side: "sell" }, "AUTO_SELL_REJECTED"],
    [{ ...safeProposal, privateKey: "never" }, "AUTO_SECRET_REJECTED"],
    [{ ...safeProposal, nested: { seedPhrase: "never" } }, "AUTO_SECRET_REJECTED"],
    [{ ...safeProposal, multiWallet: true }, "AUTO_MANIPULATION_REJECTED"],
    [{ ...safeProposal, artificialVolume: true }, "AUTO_MANIPULATION_REJECTED"],
    [{ ...safeProposal, walletRotation: ["a", "b"] }, "AUTO_MANIPULATION_REJECTED"],
  ];
  for (const [proposal, code] of rejected) {
    assert.throws(() => validateBuyProposal(proposal, settings), (error) => error.code === code);
  }
});

test("Auto enforces owner caps, interval, slippage, impact and liquidity", () => {
  const rejected = [
    { ...safeProposal, amountPerBuy: 30 },
    { ...safeProposal, orderCount: 11 },
    { ...safeProposal, intervalMinutes: 30 },
    { ...safeProposal, slippageBps: 301 },
    { ...safeProposal, priceImpactBps: 501 },
    { ...safeProposal, liquidityUsd: 100 },
  ];
  for (const proposal of rejected) {
    assert.throws(() => validateBuyProposal(proposal, settings));
  }
});

test("Auto remains non-executable without every owner lock and an external signer", async () => {
  const repository = {
    getAutoStatus: async () => ({
      settings,
      counts: { active: 0, paused: 0, completed: 0, failed: 0 },
      buy_only: true,
    }),
  };
  const auto = createAutoController({ repository });
  const prepared = await auto.prepare(safeProposal);
  assert.equal(prepared.accepted, true);
  assert.equal(prepared.executionReady, false);
  assert.match(prepared.nextAction, /external signer/i);
});
