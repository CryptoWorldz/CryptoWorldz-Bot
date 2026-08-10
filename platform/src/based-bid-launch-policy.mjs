import {
  ULTIMATE_TOKEN_FEE_POLICY,
  tokenCreatorFeeForHistory,
  validateTokenFeePolicy,
} from './ultimate.mjs';

export const BASED_BID_PLATFORM_PROFILE = Object.freeze({
  verifiedDate: '2026-08-11',
  chain: 'SOL',
  launchModel: 'pool_lbp',
  launchModelLabel: 'Launch a Pool',
  dex: 'Meteora v5',
  dexFeeBps: 100,
  startingMarketCapUsd: 9000,
  launchPlan: 'based',
  launchPlanCostSol: 0,
  feeBuilderPlatformCapBps: 1000,
  programmaticLaunchApiVerified: false,
  executionMode: 'manual_based_bid_ui',
});

export const ULTIMATE_FIRST_TOKEN_DRAFT = Object.freeze({
  name: 'OneWorldz Kindness',
  symbol: 'KIND',
  displaySymbol: '$KIND',
  chain: 'SOL',
  purpose: 'Community participation, transparent impact funding and verifiable OneWorldz ecosystem actions.',
  status: 'legal_review',
  profitPromise: false,
  guaranteedReturn: false,
  guaranteedListing: false,
  initialBuyDefault: 0,
  fairLaunchPreference: true,
});

export const AUSTRALIAN_LAUNCH_GATES = Object.freeze({
  legalClassification: 'external_written_review_required',
  financialProductAssessment: 'must_be_completed_before_launch',
  austracServiceAssessment: 'must_be_completed_before_launch',
  marketingReview: 'no_guaranteed_returns_or_listing_claims',
  multisigApproval: 'owner_plus_one_required',
  publicFeeDisclosure: true,
  execution: 'external_manual_only',
});

const SAFE_AUSTRAC_STATES = new Set(['not_required_confirmed', 'registration_active']);
const SAFE_FINANCIAL_PRODUCT_STATES = new Set(['not_financial_product_confirmed', 'licensed_or_authorised_confirmed']);

export class BasedBidLaunchPolicyError extends Error {
  constructor(message, code = 'BASED_BID_POLICY_REJECTED') {
    super(message);
    this.name = 'BasedBidLaunchPolicyError';
    this.code = code;
  }
}

function boolean(value) {
  return value === true;
}

function nonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.floor(number);
}

export function basedBidCreatorFeeForHistory({ completedTrades = 0, liquidityHealthy = false } = {}) {
  validateTokenFeePolicy(ULTIMATE_TOKEN_FEE_POLICY);
  const feeBps = tokenCreatorFeeForHistory({ completedTrades, liquidityHealthy });
  if (feeBps > ULTIMATE_TOKEN_FEE_POLICY.hardCreatorFeeCapBps) {
    throw new BasedBidLaunchPolicyError('Ultimate creator fee exceeded its internal hard cap.', 'BASED_BID_FEE_CAP_EXCEEDED');
  }
  if (feeBps > BASED_BID_PLATFORM_PROFILE.feeBuilderPlatformCapBps) {
    throw new BasedBidLaunchPolicyError('Creator fee exceeded the verified Based.bid Fee Builder platform cap.', 'BASED_BID_PLATFORM_FEE_CAP_EXCEEDED');
  }
  return feeBps;
}

export function basedBidFeeStage({ completedTrades = 0, liquidityHealthy = false } = {}) {
  const trades = nonNegativeInteger(completedTrades);
  const creatorFeeBps = basedBidCreatorFeeForHistory({ completedTrades: trades, liquidityHealthy });
  const stage = trades >= 500 && liquidityHealthy
    ? 'mature'
    : trades >= 100 && liquidityHealthy
      ? 'growth'
      : 'initial';
  return Object.freeze({
    stage,
    completedTrades: trades,
    liquidityHealthy: Boolean(liquidityHealthy),
    creatorFeeBps,
    adjustmentTrigger: 'completed_trade_count_and_liquidity_health_only',
    priceTriggered: false,
    volumeTriggered: false,
  });
}

export function launchReadiness(input = {}) {
  const checks = Object.freeze({
    writtenLegalReview: input.legalReviewStatus === 'approved',
    financialProductAssessment: SAFE_FINANCIAL_PRODUCT_STATES.has(String(input.financialProductAssessment || '')),
    austracServiceAssessment: SAFE_AUSTRAC_STATES.has(String(input.austracStatus || '')),
    publicFeeDisclosure: boolean(input.publicFeeDisclosureApproved),
    multisigApproval: input.multisigStatus === 'approved',
    fourWalletsReady: boolean(input.fourWalletsReady),
    tokenIdentityApproved: boolean(input.tokenIdentityApproved),
    marketingClaimsApproved: boolean(input.marketingClaimsApproved),
  });
  const blockers = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  return Object.freeze({
    ready: blockers.length === 0,
    checks,
    blockers: Object.freeze(blockers),
  });
}

export function buildBasedBidLaunchPacket(input = {}) {
  if (input.executionEnabled === true || input.autoLaunch === true || input.autoSign === true) {
    throw new BasedBidLaunchPolicyError(
      'Based.bid launch execution cannot be silently enabled or auto-signed by Ultimate.',
      'BASED_BID_EXECUTION_BYPASS_REJECTED',
    );
  }
  if (input.promisesProfit === true || input.guaranteesListing === true || input.guaranteesReturn === true) {
    throw new BasedBidLaunchPolicyError(
      'Launch marketing cannot promise profit, returns or exchange listings.',
      'BASED_BID_MARKETING_CLAIM_REJECTED',
    );
  }

  const completedTrades = nonNegativeInteger(input.completedTrades);
  const liquidityHealthy = boolean(input.liquidityHealthy);
  const feeStage = basedBidFeeStage({ completedTrades, liquidityHealthy });
  const readiness = launchReadiness(input);
  const initialBuySol = Math.max(0, Number(input.initialBuySol) || ULTIMATE_FIRST_TOKEN_DRAFT.initialBuyDefault);

  return Object.freeze({
    token: ULTIMATE_FIRST_TOKEN_DRAFT,
    platform: BASED_BID_PLATFORM_PROFILE,
    feeStage,
    feeBuilder: Object.freeze({
      creatorFeeBps: feeStage.creatorFeeBps,
      hardUltimateCapBps: ULTIMATE_TOKEN_FEE_POLICY.hardCreatorFeeCapBps,
      basedBidVerifiedCapBps: BASED_BID_PLATFORM_PROFILE.feeBuilderPlatformCapBps,
      proceedsAllocationBps: ULTIMATE_TOKEN_FEE_POLICY.proceedsAllocationBps,
      buybackBurnReserve: Object.freeze({
        allocationBps: ULTIMATE_TOKEN_FEE_POLICY.proceedsAllocationBps.buyback_burn_reserve,
        automaticExecution: false,
        priceTriggered: false,
        volumeTriggered: false,
        multisigApprovalRequired: true,
        publicDisclosureRequired: true,
      }),
    }),
    launchSettings: Object.freeze({
      chain: BASED_BID_PLATFORM_PROFILE.chain,
      model: BASED_BID_PLATFORM_PROFILE.launchModel,
      dex: BASED_BID_PLATFORM_PROFILE.dex,
      dexFeeBps: BASED_BID_PLATFORM_PROFILE.dexFeeBps,
      startingMarketCapUsd: BASED_BID_PLATFORM_PROFILE.startingMarketCapUsd,
      launchPlan: BASED_BID_PLATFORM_PROFILE.launchPlan,
      initialBuySol,
      initialBuyDisclosureRequired: initialBuySol > 0,
    }),
    compliance: Object.freeze({
      gates: AUSTRALIAN_LAUNCH_GATES,
      readiness,
    }),
    execution: Object.freeze({
      enabled: false,
      mode: BASED_BID_PLATFORM_PROFILE.executionMode,
      apiVerified: BASED_BID_PLATFORM_PROFILE.programmaticLaunchApiVerified,
      requiresExternalWalletSignature: true,
      requiresOwnerMultisigApproval: true,
    }),
  });
}
