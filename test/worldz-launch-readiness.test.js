"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { CHAIN_ORDER, MODE_FIELDS, chainReadiness, allChains, ownerTokenReadiness } = require("../src/worldz-launch-readiness");
test("eight canonical chains are covered in established rollout order", () => {
  assert.equal(CHAIN_ORDER.length, 8);
  assert.deepEqual(CHAIN_ORDER.slice(0, 2), ["solana", "xrpl"]);
  for (const mode of ["beginner", "intermediate", "advanced"]) {
    const rows = allChains(mode);
    assert.equal(rows.length, 8);
    for (const row of rows) {
      assert.equal(row.mainnetExecutionEnabled, false);
      assert.equal(row.publicMarketLaunchableNow, false);
      assert.equal(row.tokenMintableNow, false);
      assert.equal(row.externalAuditRequired, true);
      assert.ok(row.blockers.length);
    }
  }
});
test("complexity modes change controls only, never signing permission", () => {
  assert.ok(MODE_FIELDS.beginner.length < MODE_FIELDS.intermediate.length);
  assert.ok(MODE_FIELDS.intermediate.length < MODE_FIELDS.advanced.length);
  assert.equal(chainReadiness("xrpl","advanced").mainnetExecutionEnabled, false);
  assert.throws(() => chainReadiness("xrpl","expert"),/Unsupported/);
  assert.throws(() => chainReadiness("bitcoin"),/not registered/);
});
test("WORLDZ and SPARKY preparation never claims a mint happened", () => {
  for (const symbol of ["WORLDZ", "SPARKY"]) {
    let r = ownerTokenReadiness(symbol);
    assert.equal(r.state, "PREPARATION_ONLY");
    assert.equal(r.mintSubmitted, false);
    r = ownerTokenReadiness(symbol,{canonicalMint:"not-an-onchain-proof",allocationApproved:true,signingProof:true,reconciledPolicies:true});
    assert.equal(r.mintSubmitted, false);
    assert.equal(r.tokenCreated, false);
  }
  assert.throws(()=>ownerTokenReadiness("WLDZ"),/Only WORLDZ/);
});
