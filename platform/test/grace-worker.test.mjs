import assert from "node:assert/strict";
import test from "node:test";
import { createGraceWorker, estimatePostCost } from "../src/grace-worker.mjs";

function settings(values = {}) {
  return {
    paused: false,
    emergency_stop: false,
    posting_enabled: true,
    cost_model: { x: { text: 0.015, link: 0.2 } },
    ...values,
  };
}

test("Grace worker does nothing while any owner publishing lock is active", async () => {
  for (const locked of [
    { posting_enabled: false },
    { paused: true },
    { emergency_stop: true },
  ]) {
    let claimed = false;
    const repository = {
      getSettings: async () => settings(locked),
      claimDueTargets: async () => {
        claimed = true;
        return [];
      },
    };
    const worker = createGraceWorker({ repository, graceX: {} });
    assert.deepEqual(await worker.runOnce(), { skipped: "posting_locked" });
    assert.equal(claimed, false);
  }
});

test("Grace worker publishes one database-claimed approved X target and records it", async () => {
  const calls = [];
  const target = {
    target_id: 44,
    account_id: 1,
    platform: "x",
    caption: "OneWorldz 🌏 One Vision",
    link_url: "",
    monthly_budget_usd: 25,
  };
  const repository = {
    getSettings: async () => settings(),
    claimDueTargets: async () => [target],
    authorizeSpend: async () => ({ ok: true, spent: 0, limit: 25 }),
    setEstimatedCost: async (...args) => calls.push(["estimated", ...args]),
    markTargetPublished: async (...args) => calls.push(["published", ...args]),
    markTargetFailed: async (...args) => calls.push(["failed", ...args]),
    recordAudit: async (...args) => calls.push(["audit", ...args]),
  };
  const graceX = {
    publishText: async (...args) => {
      calls.push(["x", ...args]);
      return { externalPostId: "x-post-id" };
    },
  };
  const worker = createGraceWorker({ repository, graceX });
  assert.deepEqual(await worker.runOnce(), {
    claimed: 1,
    published: 1,
    failed: 0,
    blocked: 0,
  });
  assert.deepEqual(calls.find((call) => call[0] === "x"), [
    "x",
    1,
    "OneWorldz 🌏 One Vision",
    "",
  ]);
  assert.ok(calls.some((call) => call[0] === "published" && call[2] === "x-post-id"));
  assert.ok(!calls.some((call) => call[0] === "failed"));
});

test("Grace worker blocks unapproved platforms and budget breaches", async () => {
  const failed = [];
  const audits = [];
  const targets = [
    {
      target_id: 1,
      account_id: 2,
      platform: "facebook",
      caption: "test",
      link_url: "",
      monthly_budget_usd: 0,
    },
    {
      target_id: 2,
      account_id: 1,
      platform: "x",
      caption: "test",
      link_url: "https://example.com",
      monthly_budget_usd: 0,
    },
  ];
  const repository = {
    getSettings: async () => settings(),
    claimDueTargets: async () => targets,
    authorizeSpend: async (target) =>
      target.target_id === 2
        ? { ok: false, reason: "workspace_budget_exceeded", spent: 25, limit: 25 }
        : { ok: true },
    setEstimatedCost: async () => {},
    markTargetPublished: async () => {},
    markTargetFailed: async (...args) => failed.push(args),
    recordAudit: async (...args) => audits.push(args),
  };
  const worker = createGraceWorker({
    repository,
    graceX: { publishText: async () => assert.fail("X publisher must not run") },
    logger: { error: () => {} },
  });
  const result = await worker.runOnce();
  assert.deepEqual(result, { claimed: 2, published: 0, failed: 1, blocked: 1 });
  assert.equal(failed.length, 2);
  assert.ok(failed.every((entry) => entry[2].permanent));
  assert.ok(audits.some((entry) => entry[0] === "grace_post_budget_blocked"));
});

test("Grace cost model distinguishes text and link posts", () => {
  const model = { x: { text: 0.015, link: 0.2 } };
  assert.equal(estimatePostCost("x", false, model), 0.015);
  assert.equal(estimatePostCost("x", true, model), 0.2);
  assert.equal(estimatePostCost("unknown", true, model), 0);
});
