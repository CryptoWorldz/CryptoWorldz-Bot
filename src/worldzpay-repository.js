"use strict";

const crypto = require("node:crypto");

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function asStringAmount(value) {
  if (value === null || value === undefined) return null;
  return typeof value === "bigint" ? value.toString() : String(value);
}

function createWorldzPayRepository(supabase) {
  if (!supabase || typeof supabase.from !== "function") {
    throw new Error("Supabase client required.");
  }

  async function savePaymentIntent({ intent, checkoutId = null, providerId, idempotencyKey }) {
    if (!intent || intent.schema !== "WORLDZPAY-INTENT-V1") {
      throw new Error("Valid WorldzPay intent required.");
    }

    const row = {
      intent_id: intent.intentId,
      checkout_id: checkoutId,
      source_id: intent.sourceId,
      provider_id: String(providerId || "").trim(),
      payment_method: intent.requestedMethod,
      fiat_currency: intent.fiatCurrency,
      fiat_amount_minor: asStringAmount(intent.fiatAmountMinor),
      settlement_asset: intent.settlementAsset,
      customer_ref: intent.customerRef,
      idempotency_key_hash: sha256(idempotencyKey),
      state: "quoted",
      execution_mode: intent.executionMode,
      live_funds_enabled: intent.liveFundsEnabled === true,
      updated_at: new Date().toISOString()
    };

    if (!row.provider_id) throw new Error("Provider id required.");
    const { data, error } = await supabase
      .from("worldzpay_payment_intents")
      .upsert(row, { onConflict: "intent_id" })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async function recordProviderEvent({
    providerId,
    providerEventKey,
    eventType,
    rawPayload,
    signatureVerified = false,
    paymentIntentId = null
  }) {
    const row = {
      provider_id: String(providerId || "").trim(),
      provider_event_key: String(providerEventKey || "").trim(),
      event_type: String(eventType || "").trim(),
      payload_sha256: sha256(rawPayload),
      signature_verified: signatureVerified === true,
      processing_state: signatureVerified === true ? "verified" : "received",
      payment_intent_id: paymentIntentId || null
    };
    if (!row.provider_id || !row.provider_event_key || !row.event_type) {
      throw new Error("Provider event identity is incomplete.");
    }

    const { data, error } = await supabase
      .from("worldzpay_provider_events")
      .insert(row)
      .select("*")
      .single();

    if (error && error.code === "23505") {
      return { duplicate: true, provider_event_key: row.provider_event_key };
    }
    if (error) throw error;
    return data;
  }

  async function saveTreasuryProposal(proposal) {
    if (!proposal || proposal.schema !== "WORLDZPAY-TREASURY-PROPOSAL-V1") {
      throw new Error("Valid WorldzPay treasury proposal required.");
    }

    const row = {
      proposal_id: proposal.proposalId,
      checkout_id: proposal.checkoutId,
      payment_intent_id: proposal.paymentIntentId,
      source_id: proposal.sourceId,
      settlement_asset: proposal.settlementAsset,
      net_worldz_controlled_raw: asStringAmount(proposal.netWorldzControlledRaw),
      routing_state: proposal.routingState,
      unsigned_payload_hash: proposal.unsignedPayloadHash,
      provider_id: proposal.provider.providerId,
      provider_settlement_reference: proposal.provider.providerSettlementReference,
      operations_profile_id: proposal.operationsApproval.profileId,
      required_threshold: proposal.operationsApproval.targetThreshold,
      required_signers: proposal.operationsApproval.targetSigners,
      current_governance_verified: proposal.operationsApproval.currentGovernanceVerified === true,
      destination_verified: proposal.operationsApproval.destinationVerified === true,
      execution_state: proposal.executionState,
      can_sign: proposal.canSign === true,
      can_broadcast: proposal.canBroadcast === true,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("worldzpay_treasury_proposals")
      .upsert(row, { onConflict: "proposal_id" })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async function recordReconciliation({
    paymentIntentId,
    providerId,
    settlementAsset,
    grossRaw,
    externalFeesRaw = 0,
    protectedEarmarksRaw = 0,
    netWorldzControlledRaw,
    evidenceReference = null
  }) {
    const row = {
      payment_intent_id: String(paymentIntentId || "").trim(),
      provider_id: String(providerId || "").trim(),
      settlement_asset: String(settlementAsset || "").trim().toUpperCase(),
      gross_raw: asStringAmount(grossRaw),
      external_fees_raw: asStringAmount(externalFeesRaw),
      protected_earmarks_raw: asStringAmount(protectedEarmarksRaw),
      net_worldz_controlled_raw: asStringAmount(netWorldzControlledRaw),
      reconciliation_state: "pending",
      evidence_reference: evidenceReference ? String(evidenceReference).trim() : null
    };
    if (!row.payment_intent_id || !row.provider_id) {
      throw new Error("Reconciliation identity is incomplete.");
    }

    const { data, error } = await supabase
      .from("worldzpay_reconciliation_entries")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  return Object.freeze({
    savePaymentIntent,
    recordProviderEvent,
    saveTreasuryProposal,
    recordReconciliation
  });
}

module.exports = {
  asStringAmount,
  createWorldzPayRepository,
  sha256
};
