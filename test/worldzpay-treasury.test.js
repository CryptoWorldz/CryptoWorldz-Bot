"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assertTargetTreasuryPolicy,
  buildTreasurySettlementProposal,
  getTreasuryPaymentStatus
} = require("../src/worldzpay-treasury");
const { createCheckoutSession } = require("../src/worldzpay-checkout");

function checkout(overrides = {}) {
  return createCheckoutSession({
    productId: "community_suite_own",
    method: "solana_wallet",
    fiatCurrency: "AUD",
    fiatAmountMinor: 20000,
    settlementAsset: "SOL",
    customerRef: "treasury:test",
    idempotencyKey: "treasury-test-1",
    quoteRef: "TREASURY-Q-1",
    ...overrides
  });
}

test("treasury targets stay locked to 5-of-10 operations and 6-of-9 reserve", () => {
  assert.equal(assertTargetTreasuryPolicy(), true);
  const status = getTreasuryPaymentStatus();
  assert.equal(status.operations.target, "5-of-10");
  assert.equal(status.reserve.target, "6-of-9");
  assert.equal(status.liveExecutionEnabled, false);
  assert.equal(status.signingEnabled, false);
  assert.equal(status.broadcastEnabled, false);
});

test("eligible SOL revenue creates an unsigned Legacy Core then Operations preview", () => {
  const proposal = buildTreasurySettlementProposal({
    checkout: checkout(),
    providerId: "solana_wallet",
    providerEvidence: {
      rpc_provider_verified: true,
      token_mints_verified: true,
      recipient_vault_verified: true,
      transaction_verification_passed: true,
      multisig_treasury_gate_passed: true
    },
    netWorldzControlledRaw: 10_000_000_000n
  });

  assert.match(proposal.proposalId, /^wzt_[a-f0-9]{28}$/);
  assert.equal(proposal.routingState, "sol_legacy_core_then_operations_preview");
  assert.equal(proposal.legacyCore.legacyCorePoolLamports, 1_500_000_000n);
  assert.equal(proposal.operationsTreasuryRaw, 8_500_000_000n);
  assert.equal(proposal.operationsApproval.targetDisplay, "5-of-10");
  assert.equal(proposal.operationsApproval.currentGovernanceVerified, false);
  assert.equal(proposal.operationsApproval.destinationVerified, false);
  assert.equal(proposal.reserveSweep.included, false);
  assert.equal(proposal.reserveSweep.requiresSeparateApproval, true);
  assert.equal(proposal.canSign, false);
  assert.equal(proposal.canBroadcast, false);
  assert.equal(proposal.historicalDistributionWalletFundingForbidden, true);
});

test("USDC revenue is held until an asset-specific Legacy Core policy exists", () => {
  const proposal = buildTreasurySettlementProposal({
    checkout: checkout({
      method: "usdc",
      settlementAsset: "USDC",
      idempotencyKey: "treasury-test-usdc",
      quoteRef: "TREASURY-Q-USDC"
    }),
    providerId: "solana_wallet",
    netWorldzControlledRaw: 50_000_000n
  });

  assert.equal(proposal.routingState, "hold_pending_asset_specific_policy");
  assert.equal(proposal.operationsTreasuryRaw, null);
  assert.equal(proposal.legacyCore, null);
  assert.equal(proposal.canBroadcast, false);
});

test("proposal id and unsigned payload hash are deterministic", () => {
  const args = {
    checkout: checkout(),
    providerId: "solana_wallet",
    netWorldzControlledRaw: 1_000_000_000n
  };
  const a = buildTreasurySettlementProposal(args);
  const b = buildTreasurySettlementProposal(args);
  assert.equal(a.proposalId, b.proposalId);
  assert.equal(a.unsignedPayloadHash, b.unsignedPayloadHash);
  assert.match(a.unsignedPayloadHash, /^[a-f0-9]{64}$/);
});
