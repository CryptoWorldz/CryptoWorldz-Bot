const test = require("node:test");
const assert = require("node:assert/strict");
const { createGraceWorker } = require("../src/grace/worker");

test("Grace worker stays locked by default", async () => {
  let claimed = false;
  const repository = {
    getSettings: async () => ({ paused: false, emergency_stop: false, posting_enabled: false }),
    claimDueTargets: async () => { claimed = true; return []; }
  };
  const worker = createGraceWorker({ repository, publisher: { publish: async () => ({}) } });
  const result = await worker.runOnce();
  assert.equal(result.skipped, "posting_locked");
  assert.equal(claimed, false);
});

test("Grace worker publishes approved due targets within Auto budget", async () => {
  const calls = [];
  const repository = {
    getSettings: async () => ({
      paused: false,
      emergency_stop: false,
      posting_enabled: true,
      cost_model: { x: { text: 0.015, link: 0.2 } }
    }),
    claimDueTargets: async () => [{
      target_id: 1,
      account_id: 2,
      platform: "x",
      link_url: "",
      caption: "Hello"
    }],
    authorizeSpend: async () => ({ ok: true, spent: 0, limit: 25 }),
    setEstimatedCost: async (...args) => calls.push(["estimate", ...args]),
    markTargetPublished: async (...args) => calls.push(["published", ...args]),
    markTargetFailed: async (...args) => calls.push(["failed", ...args]),
    recordAudit: async (...args) => calls.push(["audit", ...args])
  };
  const publisher = { publish: async () => ({ externalPostId: "post-123" }) };
  const worker = createGraceWorker({ repository, publisher, logger: { error() {} } });
  const result = await worker.runOnce();
  assert.equal(result.published, 1);
  assert.deepEqual(calls[0], ["estimate", 1, 0.015]);
  assert.deepEqual(calls[1], ["published", 1, "post-123", 0.015]);
});

test("Auto budget blocks a Grace target before platform publishing", async () => {
  let published = false;
  let blocked = false;
  const repository = {
    getSettings: async () => ({
      paused: false,
      emergency_stop: false,
      posting_enabled: true,
      cost_model: { x: { text: 0.015, link: 0.2 } }
    }),
    claimDueTargets: async () => [{ target_id: 1, account_id: 2, platform: "x", link_url: "https://example.com" }],
    authorizeSpend: async () => ({ ok: false, reason: "workspace_budget_exceeded", spent: 25, limit: 25 }),
    markTargetFailed: async (id, message, options) => { blocked = id === 1 && options.permanent && /budget/.test(message); },
    recordAudit: async () => {}
  };
  const publisher = { publish: async () => { published = true; } };
  const worker = createGraceWorker({ repository, publisher, logger: { error() {} } });
  const result = await worker.runOnce();
  assert.equal(result.blocked, 1);
  assert.equal(blocked, true);
  assert.equal(published, false);
});
