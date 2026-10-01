"use strict";

const POLICY = require("../worldzpad-mainnet/revenue/worldz-core-legacy-revenue.v1.json");

const BPS = 10000n;
const LOCKED_LEGACY_TOKEN_KEYS = Object.freeze([
  "PDC_ORIGINAL",
  "PDC1_FIRST",
  "PDC1_SECOND",
  "PDCMAGA",
  "PDCSHARE",
  "PURPLE_DC",
  "PURPLE_OG",
  "PCC1_LEGACY",
  "INVEST",
  "LMTD",
  "NBC",
  "HSSC"
]);


function asLamports(value) {
  const amount = typeof value === "bigint" ? value : BigInt(value);
  if (amount < 0n) throw new Error("Revenue cannot be negative.");
  return amount;
}

function percentOf(amount, bps) {
  return amount * BigInt(bps) / BPS;
}

function eligibleSource(sourceId, policy = POLICY) {
  const source = String(sourceId || "").trim();
  return policy.eligibleSources.includes(source) && !policy.excludedSources.includes(source);
}

function splitEqual(amount, count) {
  const n = BigInt(count);
  const each = amount / n;
  return {
    each,
    remainder: amount - (each * n)
  };
}

function buildLegacyCoreAllocation({ sourceId, netRevenueLamports, policy = POLICY } = {}) {
  if (!eligibleSource(sourceId, policy)) throw new Error("Revenue source is not eligible for Legacy Core routing.");
  const net = asLamports(netRevenueLamports);
  const pool = percentOf(net, policy.poolBps);
  const equal = splitEqual(pool, policy.beneficiaries.length);

  const allocations = policy.beneficiaries.map((token) => {
    const tokenShare = equal.each;
    const buyback = percentOf(tokenShare, policy.perTokenUseBps.transparentMarketBuyback);
    const liquidity = percentOf(tokenShare, policy.perTokenUseBps.liquidityGrowth);
    const holderRewards = percentOf(tokenShare, policy.perTokenUseBps.holderRewards);
    const rounding = tokenShare - buyback - liquidity - holderRewards;

    return Object.freeze({
      symbol: token.symbol,
      name: token.name,
      tokenMint: token.tokenMint,
      tokenShareLamports: tokenShare,
      transparentMarketBuybackLamports: buyback,
      liquidityGrowthLamports: liquidity,
      holderRewardsLamports: holderRewards,
      tokenRoundingLamports: rounding,
      dedicatedRevenueVault: token.dedicatedRevenueVault,
      historicalDistributionWallet: token.historicalDistributionWallet,
      executionState: "accrue_only"
    });
  });

  return Object.freeze({
    policyVersion: policy.version,
    sourceId: String(sourceId),
    netRevenueLamports: net,
    legacyCorePoolLamports: pool,
    worldzRetainedAfterLegacyCoreLamports: net - pool,
    allocations: Object.freeze(allocations),
    poolRoundingLamports: equal.remainder,
    liveTransfersEnabled: policy.treasuryControls.liveTransfersEnabled === true,
    historicalDistributionWalletFundingForbidden:
      policy.treasuryControls.historicalDistributionWalletFundingForbidden === true
  });
}

function assertLockedLegacyPolicy({ policy = POLICY } = {}) {
  const lock = policy.membershipLock || {};
  const allocation = policy.allocationLock || {};
  const actualKeys = policy.beneficiaries.map((token) => token.tokenKey);

  if (lock.status !== "FINAL_CLOSED_SET") throw new Error("Legacy Core membership must remain FINAL_CLOSED_SET.");
  if (lock.additionsAllowed !== false || lock.removalsAllowed !== false || lock.replacementsAllowed !== false) {
    throw new Error("Legacy Core membership mutation is forbidden.");
  }
  if (lock.futureLegacyDesignationsAllowed !== false) throw new Error("Future Legacy token designations are forbidden.");
  if (policy.beneficiaryCount !== 12 || policy.beneficiaries.length !== 12) {
    throw new Error("Legacy Core must contain exactly 12 tokens.");
  }
  if (JSON.stringify(actualKeys) !== JSON.stringify(LOCKED_LEGACY_TOKEN_KEYS)) {
    throw new Error("Legacy Core token membership or order drifted from the final locked set.");
  }
  if (policy.poolBps !== 1500 || policy.poolPercent !== 15) {
    throw new Error("Legacy Core allocation must remain exactly 15%.");
  }
  if (policy.equalPerTokenBpsOfEligibleRevenue !== 125 || policy.equalPerTokenPercentOfEligibleRevenue !== 1.25) {
    throw new Error("Each Legacy Core token must remain at exactly 1.25%.");
  }
  if (
    allocation.status !== "FINAL_LOCKED" ||
    allocation.totalLegacyBps !== 1500 ||
    allocation.equalPerTokenBps !== 125 ||
    allocation.beneficiaryCount !== 12 ||
    allocation.variableWeightingAllowed !== false ||
    allocation.extraLegacyBucketAllowed !== false
  ) {
    throw new Error("Legacy Core allocation lock drifted.");
  }
  return true;
}

function assertSafeDestinations({ policy = POLICY } = {}) {
  const historical = new Set([
    ...(policy.forbiddenHistoricalDistributionWallets || []),
    ...policy.beneficiaries.map((x) => x.historicalDistributionWallet).filter(Boolean)
  ]);
  for (const token of policy.beneficiaries) {
    if (token.dedicatedRevenueVault && historical.has(token.dedicatedRevenueVault)) {
      throw new Error(`Historical distribution wallet cannot be a revenue vault: ${token.symbol}`);
    }
  }
  return true;
}

assertLockedLegacyPolicy();
assertSafeDestinations();

module.exports = {
  POLICY,
  eligibleSource,
  buildLegacyCoreAllocation,
  assertSafeDestinations,
  assertLockedLegacyPolicy,
  LOCKED_LEGACY_TOKEN_KEYS
};
