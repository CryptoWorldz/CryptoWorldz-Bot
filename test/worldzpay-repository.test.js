"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createWorldzPayRepository, sha256 } = require("../src/worldzpay-repository");
const { createPaymentIntent } = require("../src/worldzpay");
const { createCheckoutSession } = require("../src/worldzpay-checkout");
const { buildTreasurySettlementProposal } = require("../src/worldzpay-treasury");

function fakeSupabase() {
  const writes = [];
  return {
    writes,
    from(table) {
      const chain = {
        table,
        row: null,
        mode: null,
        upsert(row) { this.row = row; this.mode = "upsert"; writes.push({ table, mode: this.mode, row }); return this; },
        insert(row) { this.row = row; this.mode = "insert"; writes.push({ table, mode: this.mode, row }); return this; },
        select() { return this; },
        async single() { return { data: { ...this.row }, error: null }; }
      };
      return chain;
    }
  };
}

test("repository hashes idempotency keys instead of storing them raw", async () => {
  const supabase = fakeSupabase();
  const repository = createWorldzPayRepository(supabase);
  const intent = createPaymentIntent({
    sourceId: "community_suite_own",
    method: "solana_wallet",
    fiatCurrency: "AUD",
    fiatAmountMinor: 20000,
    settlementAsset: "SOL",
    customerRef: "repo:test",
    idempotencyKey: "sensitive-business-idempotency-value"
  });

  await repository.savePaymentIntent({
    intent,
    checkoutId: "wzc_test",
    providerId: "solana_wallet",
    idempotencyKey: "sensitive-business-idempotency-value"
  });

  const write = supabase.writes.at(-1);
  assert.equal(write.table, "worldzpay_payment_intents");
  assert.equal(write.row.idempotency_key_hash, sha256("sensitive-business-idempotency-value"));
  assert.equal(JSON.stringify(write.row).includes("sensitive-business-idempotency-value"), false);
  assert.equal(write.row.live_funds_enabled, false);
});

test("treasury proposal persistence cannot silently enable signing or broadcast", async () => {
  const supabase = fakeSupabase();
  const repository = createWorldzPayRepository(supabase);
  const checkout = createCheckoutSession({
    productId: "community_suite_own",
    method: "solana_wallet",
    fiatCurrency: "AUD",
    fiatAmountMinor: 20000,
    settlementAsset: "SOL",
    customerRef: "repo:treasury",
    idempotencyKey: "repo-treasury-1",
    quoteRef: "REPO-TREASURY-Q"
  });
  const proposal = buildTreasurySettlementProposal({
    checkout,
    providerId: "solana_wallet",
    netWorldzControlledRaw: 1_000_000_000n
  });

  await repository.saveTreasuryProposal(proposal);

  const write = supabase.writes.at(-1);
  assert.equal(write.table, "worldzpay_treasury_proposals");
  assert.equal(write.row.execution_state, "prepared_only");
  assert.equal(write.row.can_sign, false);
  assert.equal(write.row.can_broadcast, false);
  assert.equal(write.row.required_threshold, 5);
  assert.equal(write.row.required_signers, 10);
});

test("provider event ledger stores only a payload hash", async () => {
  const supabase = fakeSupabase();
  const repository = createWorldzPayRepository(supabase);

  await repository.recordProviderEvent({
    providerId: "x_money",
    providerEventKey: "future-event-0001",
    eventType: "payment.updated",
    rawPayload: '{"example":"payload-data"}',
    signatureVerified: false
  });

  const write = supabase.writes.at(-1);
  assert.equal(write.table, "worldzpay_provider_events");
  assert.match(write.row.payload_sha256, /^[a-f0-9]{64}$/);
  assert.equal(Object.prototype.hasOwnProperty.call(write.row, "raw_payload"), false);
  assert.equal(write.row.processing_state, "received");
});
