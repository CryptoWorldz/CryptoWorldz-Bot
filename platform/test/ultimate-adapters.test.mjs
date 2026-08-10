import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ULTIMATE_PROVIDER_CAPABILITIES,
  buildJupiterUnsignedRequest,
  buildSquadsProposal,
  buildUltimateFundingCycle,
  graceOperatingEnvelope,
  validateCoinbaseTransferGate,
} from '../src/ultimate-adapters.mjs';

test('provider contracts never claim silent authorization or secret custody', () => {
  for (const provider of Object.values(ULTIMATE_PROVIDER_CAPABILITIES)) {
    assert.equal(provider.canHoldSecrets, false);
    if ('canAutoAuthorize' in provider) assert.equal(provider.canAutoAuthorize, false);
  }
  assert.equal(ULTIMATE_PROVIDER_CAPABILITIES.stripe.treasuryInvestmentRail, false);
});

test('funding cycle plans Westpac to Coinbase to Squads to Jupiter without enabling execution', () => {
  const plan = buildUltimateFundingCycle({
    amountAud: 100,
    now: new Date('2026-08-11T07:00:00.000Z'),
    walletAddresses: {
      treasury: 'TreasuryPublicAddress111111111111111111111111',
      dev_grace_operations: 'DevGracePublicAddress1111111111111111111111',
      rewards: 'RewardsPublicAddress1111111111111111111111111',
      owner_diamond_buy: 'OwnerDiamondPublicAddress111111111111111111111',
    },
  });
  assert.equal(plan.schedule.scheduledAt, '2026-08-11T08:30:00.000Z');
  assert.equal(plan.source.provider, 'westpac');
  assert.equal(plan.conversion.provider, 'coinbase');
  assert.equal(plan.custody.provider, 'squads');
  assert.equal(plan.execution.provider, 'jupiter');
  assert.equal(plan.proposal.executionEnabled, false);
  assert.equal(plan.allocation.splits.treasury, 35);
});

test('Jupiter adapter can only build unsigned externally-approved requests', () => {
  const request = buildJupiterUnsignedRequest({
    inputMint: 'USDCMint111111111111111111111111111111111111',
    outputMint: 'TokenMint11111111111111111111111111111111111',
    amountAtomic: 1_000_000,
    destinationPublicAddress: 'WalletPublicAddress1111111111111111111111111111',
    maxSlippageBps: 100,
  });
  assert.equal(request.signed, false);
  assert.equal(request.signature, null);
  assert.equal(request.privateKey, null);
  assert.equal(request.requiresMultisigApproval, true);
  assert.equal(request.requiresExternalSignature, true);
  assert.throws(() => buildJupiterUnsignedRequest({
    inputMint: 'a', outputMint: 'b', amountAtomic: 1,
    destinationPublicAddress: 'WalletPublicAddress1111111111111111111111111111',
    maxSlippageBps: 301,
  }), (error) => error.code === 'ULTIMATE_JUPITER_SLIPPAGE_INVALID');
});

test('Squads proposal uses 2-of-3 and sensitive operations require the immutable owner', () => {
  const ordinary = buildSquadsProposal({
    proposalType: 'scheduled_allocation',
    transactionSummary: 'Allocate approved USDC funding',
    approvals: [7615025841, 8604306923],
  });
  assert.equal(ordinary.state.status, 'approved');
  const sensitive = buildSquadsProposal({
    proposalType: 'wallet_change',
    transactionSummary: 'Change treasury public address',
    approvals: [7615025841, 8604306923],
  });
  assert.equal(sensitive.state.status, 'pending_approval');
  assert.equal(sensitive.externalSignaturesRequired, true);
  assert.equal(sensitive.autoSign, false);
});

test('Coinbase transfer gate stays closed until all external checks are complete', () => {
  const blocked = validateCoinbaseTransferGate({ selfCustodyVerified: true, travelRuleComplete: false, twoFactorComplete: true });
  assert.equal(blocked.ready, false);
  assert.deepEqual(blocked.missing, ['travel_rule_details']);
  const ready = validateCoinbaseTransferGate({ selfCustodyVerified: true, travelRuleComplete: true, twoFactorComplete: true });
  assert.equal(ready.ready, true);
  assert.equal(ready.externalAuthorizationRequired, true);
});

test('Grace cannot spend beyond its approved operating envelope', () => {
  const envelope = graceOperatingEnvelope({ approvedBudgetAud: 100, campaignBudgetAud: 25 });
  assert.equal(envelope.unrestrictedTreasuryAccess, false);
  assert.equal(envelope.stepperApprovalRequired, true);
  assert.throws(() => graceOperatingEnvelope({ approvedBudgetAud: 100, campaignBudgetAud: 101 }), (error) => error.code === 'ULTIMATE_GRACE_CAMPAIGN_BUDGET_INVALID');
});
