import assert from "node:assert/strict";
import test from "node:test";
import {
  ULTIMATE_ALLOCATION_BPS,
  ULTIMATE_SIGNERS,
  ULTIMATE_TOKEN_FEE_POLICY,
  approvalState,
  nextFundingWindow,
  splitFundingAmount,
  tokenCreatorFeeForHistory,
  ultimatePublicBlueprint,
  validateAllocationBps,
  validateTokenFeePolicy,
  validateUltimateProposal,
} from "../src/ultimate.mjs";

test("Ultimate schedules the next weekday funding window at 18:30 Australia/Sydney", () => {
  const before = nextFundingWindow(new Date("2026-08-11T07:00:00.000Z"));
  assert.equal(before.scheduledAt, "2026-08-11T08:30:00.000Z");
  assert.equal(before.localHour, 18);
  assert.equal(before.localMinute, 30);

  const afterFriday = nextFundingWindow(new Date("2026-08-14T10:00:00.000Z"));
  assert.equal(afterFriday.scheduledAt, "2026-08-17T08:30:00.000Z");
});

test("Ultimate splits funding across the four locked operational purposes", () => {
  const split = splitFundingAmount(100, ULTIMATE_ALLOCATION_BPS);
  assert.deepEqual(split.splits, {
    treasury: 35,
    dev_grace_operations: 25,
    rewards: 20,
    owner_diamond_buy: 20,
  });
  assert.equal(Object.keys(split.splits).length, 4);
  assert.equal(Object.values(split.splits).reduce((sum, value) => sum + value, 0), 100);
});

test("Ultimate uses 2-of-3 approval and requires the owner for sensitive changes", () => {
  assert.equal(
    approvalState({ proposalType: "scheduled_allocation", approvals: [7615025841, 8604306923] }).status,
    "approved",
  );
  const sensitiveWithoutOwner = approvalState({
    proposalType: "wallet_change",
    approvals: [7615025841, 8604306923],
  });
  assert.equal(sensitiveWithoutOwner.status, "pending_approval");
  assert.equal(sensitiveWithoutOwner.ownerRequired, true);
  assert.equal(
    approvalState({ proposalType: "wallet_change", approvals: [8029135300, 7615025841] }).status,
    "approved",
  );
});

test("Ultimate refuses configurations without exactly three signers and an immutable owner", () => {
  assert.throws(
    () => approvalState({ proposalType: "scheduled_allocation", approvals: [1, 2], signers: ULTIMATE_SIGNERS.slice(1) }),
    (error) => error.code === "ULTIMATE_OWNER_REQUIRED",
  );
});

test("Ultimate never accepts banking, signing secrets or approval bypasses", () => {
  const rejected = [
    [{ type: "scheduled_allocation", bankPassword: "never" }, "ULTIMATE_SECRET_REJECTED"],
    [{ type: "scheduled_allocation", privateKey: "never" }, "ULTIMATE_SECRET_REJECTED"],
    [{ type: "scheduled_allocation", nested: { mnemonic: "never" } }, "ULTIMATE_SECRET_REJECTED"],
    [{ type: "scheduled_allocation", bypassApproval: true }, "ULTIMATE_APPROVAL_BYPASS_REJECTED"],
    [{ type: "scheduled_allocation", autoSign: true }, "ULTIMATE_APPROVAL_BYPASS_REJECTED"],
  ];
  for (const [proposal, code] of rejected) {
    assert.throws(() => validateUltimateProposal(proposal), (error) => error.code === code);
  }
});

test("Ultimate token creator fees fall as adoption grows and buybacks cannot be signal-triggered", () => {
  assert.equal(tokenCreatorFeeForHistory({ completedTrades: 0, liquidityHealthy: true }), 100);
  assert.equal(tokenCreatorFeeForHistory({ completedTrades: 100, liquidityHealthy: true }), 75);
  assert.equal(tokenCreatorFeeForHistory({ completedTrades: 500, liquidityHealthy: true }), 50);
  assert.equal(validateTokenFeePolicy(ULTIMATE_TOKEN_FEE_POLICY), true);
  assert.throws(
    () => validateTokenFeePolicy({
      ...ULTIMATE_TOKEN_FEE_POLICY,
      buybackPolicy: { ...ULTIMATE_TOKEN_FEE_POLICY.buybackPolicy, priceTriggered: true },
    }),
    (error) => error.code === "ULTIMATE_MARKET_SUPPORT_REJECTED",
  );
});

test("Ultimate blueprint stays non-executable until external rails and approvals are explicitly enabled", () => {
  validateAllocationBps(ULTIMATE_ALLOCATION_BPS);
  const blueprint = ultimatePublicBlueprint();
  assert.equal(blueprint.name, "Command Centre Ultimate™");
  assert.equal(blueprint.multisig.threshold, 2);
  assert.equal(blueprint.multisig.signers, 3);
  assert.equal(blueprint.multisig.immutableOwner, "JayJayTeamDev");
  assert.equal(blueprint.executionEnabled, false);
  assert.equal(blueprint.secretCustody, "external_only");
});
