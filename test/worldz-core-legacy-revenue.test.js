"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  POLICY,
  eligibleSource,
  buildLegacyCoreAllocation,
  assertSafeDestinations,
  assertLockedLegacyPolicy,
  LOCKED_LEGACY_TOKEN_KEYS
} = require("../src/worldz-core-legacy-revenue");

test("Community Suite revenue is eligible and protected sources are not", () => {
  assert.equal(eligibleSource("community_suite_own"), true);
  assert.equal(eligibleSource("token_distribution_wallet_balances"), false);
  assert.equal(eligibleSource("impact_or_charity_donations"), false);
});

test("10 SOL net revenue allocates one 15% Legacy bucket equally across 12 tokens", () => {
  const tenSol = 10_000_000_000n;
  const result = buildLegacyCoreAllocation({
    sourceId: "community_suite_own",
    netRevenueLamports: tenSol
  });

  assert.equal(result.legacyCorePoolLamports, 1_500_000_000n);
  assert.equal(result.worldzRetainedAfterLegacyCoreLamports, 8_500_000_000n);
  assert.equal(result.allocations.length, 12);
  assert.equal(result.poolRoundingLamports, 0n);

  for (const token of result.allocations) {
    assert.equal(token.tokenShareLamports, 125_000_000n);
    assert.equal(token.transparentMarketBuybackLamports, 125_000_000n);
    assert.equal(token.liquidityGrowthLamports, 0n);
    assert.equal(token.holderRewardsLamports, 0n);
    assert.equal(token.executionState, "accrue_only");
  }
});

test("Historical distribution wallets are never configured as revenue vaults", () => {
  assert.equal(assertSafeDestinations(), true);
  const historical = new Set([
    ...(POLICY.forbiddenHistoricalDistributionWallets || []),
    ...POLICY.beneficiaries.map((x) => x.historicalDistributionWallet).filter(Boolean)
  ]);
  for (const token of POLICY.beneficiaries) {
    assert.equal(historical.has(token.dedicatedRevenueVault), false);
  }
});

test("NBC remains gated until its token mint is verified", () => {
  const nbc = POLICY.beneficiaries.find((x) => x.symbol === "NBC");
  assert.equal(nbc.tokenMint, null);
  assert.match(nbc.tokenMintStatus, /VERIFY/);
  assert.equal(POLICY.buybackControls.executionEnabled, false);
});

test("HSSC is recorded with the Hope St commitment and equal 1.25% Legacy share", () => {
  const hssc = POLICY.beneficiaries.find((x) => x.symbol === "HSSC");
  assert.equal(hssc.tokenMint, "29xKqmkvhYvMgWMqHgUoimzfBxweLUvcASAJUHHSkJMW");
  assert.match(hssc.protectedCommitment, /50%/);
  assert.equal(POLICY.poolPercent, 15);
  assert.equal(POLICY.beneficiaryCount, 12);
  assert.equal(POLICY.equalPerTokenPercentOfEligibleRevenue, 1.25);
});

test("Legacy Core membership is permanently closed at exactly 12 tokens", () => {
  assert.equal(assertLockedLegacyPolicy(), true);
  assert.equal(POLICY.membershipLock.status, "FINAL_CLOSED_SET");
  assert.equal(POLICY.membershipLock.additionsAllowed, false);
  assert.equal(POLICY.membershipLock.removalsAllowed, false);
  assert.equal(POLICY.membershipLock.replacementsAllowed, false);
  assert.equal(POLICY.membershipLock.futureLegacyDesignationsAllowed, false);
  assert.equal(POLICY.beneficiaries.length, 12);
  assert.deepEqual(POLICY.beneficiaries.map((token) => token.tokenKey), [...LOCKED_LEGACY_TOKEN_KEYS]);
});

test("Legacy Core allocation is locked at 15% total and 1.25% per token", () => {
  assert.equal(POLICY.allocationLock.status, "FINAL_LOCKED");
  assert.equal(POLICY.poolBps, 1500);
  assert.equal(POLICY.poolPercent, 15);
  assert.equal(POLICY.equalPerTokenBpsOfEligibleRevenue, 125);
  assert.equal(POLICY.equalPerTokenPercentOfEligibleRevenue, 1.25);
  assert.equal(POLICY.allocationLock.variableWeightingAllowed, false);
  assert.equal(POLICY.allocationLock.extraLegacyBucketAllowed, false);
});

test("Worldz automation never funds historical distribution wallets", () => {
  assert.equal(POLICY.manualDistributionWalletPolicy.automatedWorldzRoutingToHistoricalDistributionWalletsAllowed, false);
  assert.equal(POLICY.manualDistributionWalletPolicy.ownerManualFundingOutsideWorldzRoutingAllowed, true);
  assert.equal(POLICY.manualDistributionWalletPolicy.accountingTreatment, "OUTSIDE_WORLDZ_LEGACY_CORE_AUTOMATION");
});
