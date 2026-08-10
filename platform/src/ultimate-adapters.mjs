import {
  ULTIMATE_SIGNERS,
  approvalState,
  nextFundingWindow,
  splitFundingAmount,
  validateUltimateProposal,
} from './ultimate.mjs';

export const ULTIMATE_PROVIDER_CAPABILITIES = Object.freeze({
  westpac: Object.freeze({
    role: 'fiat_source',
    mode: 'external_schedule_and_reconciliation',
    canHoldSecrets: false,
    canAutoAuthorize: false,
  }),
  coinbase: Object.freeze({
    role: 'fiat_crypto_bridge',
    mode: 'approved_trade_and_send_adapter',
    canHoldSecrets: false,
    canAutoAuthorize: false,
    travelRuleGate: true,
  }),
  squads: Object.freeze({
    role: 'multisig_signer',
    mode: 'proposal_and_external_signature',
    canHoldSecrets: false,
    canAutoAuthorize: false,
    threshold: 2,
    signerCount: 3,
  }),
  jupiter: Object.freeze({
    role: 'solana_execution',
    mode: 'unsigned_transaction_builder',
    canHoldSecrets: false,
    canAutoAuthorize: false,
  }),
  stripe: Object.freeze({
    role: 'business_and_grace_operations',
    mode: 'approved_business_operations',
    canHoldSecrets: false,
    treasuryInvestmentRail: false,
  }),
});

export class UltimateAdapterError extends Error {
  constructor(message, code = 'ULTIMATE_ADAPTER_REJECTED') {
    super(message);
    this.name = 'UltimateAdapterError';
    this.code = code;
  }
}

function publicAddress(value, label) {
  const address = String(value || '').trim();
  if (!address) throw new UltimateAdapterError(`${label} public address is required.`, 'ULTIMATE_PUBLIC_ADDRESS_REQUIRED');
  if (address.length < 20 || address.length > 80 || /\s/.test(address)) {
    throw new UltimateAdapterError(`${label} public address is invalid.`, 'ULTIMATE_PUBLIC_ADDRESS_INVALID');
  }
  return address;
}

export function buildUltimateFundingCycle({ amountAud, now = new Date(), walletAddresses = {} } = {}) {
  const schedule = nextFundingWindow(now);
  const allocation = splitFundingAmount(amountAud);
  const destinations = Object.fromEntries(
    Object.keys(allocation.splits).map((slot) => [slot, publicAddress(walletAddresses[slot], slot)]),
  );
  const proposal = validateUltimateProposal({
    type: 'scheduled_allocation',
    executionEnabled: false,
    bypassApproval: false,
  });
  return Object.freeze({
    kind: 'ultimate_funding_cycle',
    schedule,
    source: Object.freeze({ provider: 'westpac', authorization: 'external_required' }),
    conversion: Object.freeze({ provider: 'coinbase', targetAsset: 'USDC', authorization: 'external_required' }),
    custody: Object.freeze({ provider: 'squads', threshold: 2, signerCount: 3, authorization: 'external_signatures_required' }),
    execution: Object.freeze({ provider: 'jupiter', mode: 'unsigned_transaction_only' }),
    allocation,
    destinations: Object.freeze(destinations),
    proposal,
  });
}

export function validateMultisigDecision({ proposalType, approvals = [], rejections = [] } = {}) {
  return approvalState({ proposalType, approvals, rejections, signers: ULTIMATE_SIGNERS });
}

export function buildJupiterUnsignedRequest({ inputMint, outputMint, amountAtomic, destinationPublicAddress, maxSlippageBps = 100 } = {}) {
  const amount = Number(amountAtomic);
  const slippage = Number(maxSlippageBps);
  if (!String(inputMint || '').trim() || !String(outputMint || '').trim()) {
    throw new UltimateAdapterError('Jupiter input and output mints are required.', 'ULTIMATE_JUPITER_MINT_REQUIRED');
  }
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new UltimateAdapterError('Jupiter amount must be a positive atomic-unit integer.', 'ULTIMATE_JUPITER_AMOUNT_INVALID');
  }
  if (!Number.isSafeInteger(slippage) || slippage < 1 || slippage > 300) {
    throw new UltimateAdapterError('Jupiter slippage must stay between 1 and 300 basis points.', 'ULTIMATE_JUPITER_SLIPPAGE_INVALID');
  }
  return Object.freeze({
    provider: 'jupiter',
    inputMint: String(inputMint),
    outputMint: String(outputMint),
    amountAtomic: amount,
    destinationPublicAddress: publicAddress(destinationPublicAddress, 'Jupiter destination'),
    maxSlippageBps: slippage,
    signed: false,
    signature: null,
    privateKey: null,
    requiresSimulation: true,
    requiresMultisigApproval: true,
    requiresExternalSignature: true,
  });
}

export function buildSquadsProposal({ proposalType, transactionSummary, approvals = [] } = {}) {
  const summary = String(transactionSummary || '').trim();
  if (!summary) throw new UltimateAdapterError('Transaction summary is required.', 'ULTIMATE_MULTISIG_SUMMARY_REQUIRED');
  const state = validateMultisigDecision({ proposalType, approvals });
  return Object.freeze({
    provider: 'squads',
    proposalType: String(proposalType || ''),
    transactionSummary: summary,
    threshold: 2,
    signerCount: 3,
    immutableOwner: 8029135300,
    state,
    externalSignaturesRequired: true,
    autoSign: false,
  });
}

export function validateCoinbaseTransferGate({ selfCustodyVerified = false, travelRuleComplete = false, twoFactorComplete = false } = {}) {
  const missing = [];
  if (!selfCustodyVerified) missing.push('self_custody_verification');
  if (!travelRuleComplete) missing.push('travel_rule_details');
  if (!twoFactorComplete) missing.push('two_factor_authorization');
  return Object.freeze({
    provider: 'coinbase',
    ready: missing.length === 0,
    missing: Object.freeze(missing),
    externalAuthorizationRequired: true,
  });
}

export function graceOperatingEnvelope({ approvedBudgetAud, campaignBudgetAud = 0 } = {}) {
  const budget = Number(approvedBudgetAud);
  const campaign = Number(campaignBudgetAud);
  if (!Number.isFinite(budget) || budget <= 0) throw new UltimateAdapterError('Grace operating budget must be positive.', 'ULTIMATE_GRACE_BUDGET_INVALID');
  if (!Number.isFinite(campaign) || campaign < 0 || campaign > budget) throw new UltimateAdapterError('Grace campaign budget cannot exceed its approved envelope.', 'ULTIMATE_GRACE_CAMPAIGN_BUDGET_INVALID');
  return Object.freeze({
    currency: 'AUD',
    approvedBudget: budget,
    campaignBudget: campaign,
    unrestrictedTreasuryAccess: false,
    stepperApprovalRequired: true,
    ownerEmergencyStop: true,
  });
}
