import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUSTRALIAN_LAUNCH_GATES,
  BASED_BID_PLATFORM_PROFILE,
  ULTIMATE_FIRST_TOKEN_DRAFT,
  basedBidFeeStage,
  buildBasedBidLaunchPacket,
  launchReadiness,
} from '../src/based-bid-launch-policy.mjs';

test('Based.bid policy uses the verified conservative Solana LBP profile', () => {
  assert.equal(BASED_BID_PLATFORM_PROFILE.chain, 'SOL');
  assert.equal(BASED_BID_PLATFORM_PROFILE.launchModel, 'pool_lbp');
  assert.equal(BASED_BID_PLATFORM_PROFILE.dex, 'Meteora v5');
  assert.equal(BASED_BID_PLATFORM_PROFILE.dexFeeBps, 100);
  assert.equal(BASED_BID_PLATFORM_PROFILE.startingMarketCapUsd, 9000);
  assert.equal(BASED_BID_PLATFORM_PROFILE.launchPlan, 'based');
  assert.equal(BASED_BID_PLATFORM_PROFILE.launchPlanCostSol, 0);
  assert.equal(BASED_BID_PLATFORM_PROFILE.programmaticLaunchApiVerified, false);
});

test('KIND remains a legal-review draft with no return or listing promise', () => {
  assert.equal(ULTIMATE_FIRST_TOKEN_DRAFT.name, 'OneWorldz Kindness');
  assert.equal(ULTIMATE_FIRST_TOKEN_DRAFT.displaySymbol, '$KIND');
  assert.equal(ULTIMATE_FIRST_TOKEN_DRAFT.status, 'legal_review');
  assert.equal(ULTIMATE_FIRST_TOKEN_DRAFT.profitPromise, false);
  assert.equal(ULTIMATE_FIRST_TOKEN_DRAFT.guaranteedReturn, false);
  assert.equal(ULTIMATE_FIRST_TOKEN_DRAFT.guaranteedListing, false);
});

test('creator fee falls from 1% to 0.75% to 0.5% only with trade history and healthy liquidity', () => {
  assert.deepEqual(basedBidFeeStage({ completedTrades: 5, liquidityHealthy: true }), {
    stage: 'initial', completedTrades: 5, liquidityHealthy: true, creatorFeeBps: 100,
    adjustmentTrigger: 'completed_trade_count_and_liquidity_health_only', priceTriggered: false, volumeTriggered: false,
  });
  assert.equal(basedBidFeeStage({ completedTrades: 100, liquidityHealthy: true }).creatorFeeBps, 75);
  assert.equal(basedBidFeeStage({ completedTrades: 500, liquidityHealthy: true }).creatorFeeBps, 50);
  assert.equal(basedBidFeeStage({ completedTrades: 500, liquidityHealthy: false }).creatorFeeBps, 100);
});

test('launch readiness is blocked until legal, AUSTRAC, disclosure, multisig, wallet and marketing gates pass', () => {
  const blocked = launchReadiness({});
  assert.equal(blocked.ready, false);
  assert.ok(blocked.blockers.includes('writtenLegalReview'));
  assert.ok(blocked.blockers.includes('austracServiceAssessment'));

  const ready = launchReadiness({
    legalReviewStatus: 'approved',
    financialProductAssessment: 'not_financial_product_confirmed',
    austracStatus: 'not_required_confirmed',
    publicFeeDisclosureApproved: true,
    multisigStatus: 'approved',
    fourWalletsReady: true,
    tokenIdentityApproved: true,
    marketingClaimsApproved: true,
  });
  assert.equal(ready.ready, true);
  assert.deepEqual(ready.blockers, []);
});

test('launch packet remains non-executable even when every readiness gate passes', () => {
  const packet = buildBasedBidLaunchPacket({
    completedTrades: 125,
    liquidityHealthy: true,
    legalReviewStatus: 'approved',
    financialProductAssessment: 'not_financial_product_confirmed',
    austracStatus: 'not_required_confirmed',
    publicFeeDisclosureApproved: true,
    multisigStatus: 'approved',
    fourWalletsReady: true,
    tokenIdentityApproved: true,
    marketingClaimsApproved: true,
  });
  assert.equal(packet.compliance.readiness.ready, true);
  assert.equal(packet.feeBuilder.creatorFeeBps, 75);
  assert.equal(packet.execution.enabled, false);
  assert.equal(packet.execution.apiVerified, false);
  assert.equal(packet.execution.requiresExternalWalletSignature, true);
  assert.equal(packet.feeBuilder.buybackBurnReserve.automaticExecution, false);
  assert.equal(packet.feeBuilder.buybackBurnReserve.priceTriggered, false);
  assert.equal(packet.feeBuilder.buybackBurnReserve.volumeTriggered, false);
});

test('launch packet rejects silent execution and marketing promises', () => {
  assert.throws(() => buildBasedBidLaunchPacket({ autoLaunch: true }), /cannot be silently enabled/i);
  assert.throws(() => buildBasedBidLaunchPacket({ promisesProfit: true }), /cannot promise profit/i);
});

test('Australian launch gate policy requires external written assessment', () => {
  assert.equal(AUSTRALIAN_LAUNCH_GATES.legalClassification, 'external_written_review_required');
  assert.equal(AUSTRALIAN_LAUNCH_GATES.austracServiceAssessment, 'must_be_completed_before_launch');
  assert.equal(AUSTRALIAN_LAUNCH_GATES.multisigApproval, 'owner_plus_one_required');
});
