"use strict";

const POLICY = require("../worldzpad-mainnet/revenue/worldz-core-legacy-revenue.v1.json");

const BPS = 10000n;

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

function assertSafeDestinations({ policy = POLICY } = {}) {
  const historical = new Set([\n    ...(policy.forbiddenHistoricalDistributionWallets || []),\n    ...policy.beneficiaries.map((x) => x.historicalDistributionWallet).filter(Boolean)\n  ]);
  for (const token of policy.beneficiaries) {
    if (token.dedicatedRevenueVault && historical.has(token.dedicatedRevenueVault)) {
      throw new Error(`Historical distribution wallet cannot be a revenue vault: ${token.symbol}`);
    }
  }
  return true;
}

assertSafeDestinations();

module.exports = {
  POLICY,
  eligibleSource,
  buildLegacyCoreAllocation,
  assertSafeDestinations
};
