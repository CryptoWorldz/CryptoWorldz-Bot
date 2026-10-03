const test = require("node:test");
const assert = require("node:assert/strict");
const {
  SOURCE_POLICIES,
  classifyRisk,
  combineRiskContributions,
  createRexThreatIntel,
  jaccardSimilarity,
  normalizeText,
  riskContribution,
  safeTelegramId,
  textFingerprint
} = require("../src/rex-threat-intel");

test("REX threat intel normalizes scam patterns without preserving unique URLs or handles", () => {
  const value = normalizeText("BUY NOW https://evil.example/x @FakeSupport 12345678");
  assert.equal(value, "buy now <url> <handle> <number>");
  assert.equal(textFingerprint(value).length, 64);
  assert.equal(safeTelegramId("12345"), 12345);
  assert.equal(safeTelegramId("-1"), null);
});

test("REX Pattern Guard similarity catches materially similar spam", () => {
  const left = "urgent support connect wallet now claim bonus";
  const right = "urgent support connect wallet now claim bonus today";
  assert.ok(jaccardSimilarity(left, right) >= 0.82);
  assert.ok(jaccardSimilarity(left, "good morning everyone") < 0.3);
});

test("REX confidence scoring is explainable and bounded", () => {
  const cas = riskContribution({
    baseWeight: SOURCE_POLICIES.cas.baseWeight,
    severity: 90,
    sourceConfidence: 95
  });
  const admin = riskContribution({
    baseWeight: SOURCE_POLICIES.worldz_admin_report.baseWeight,
    severity: 60,
    sourceConfidence: 80
  });
  assert.ok(cas >= 70 && cas <= 80);
  assert.ok(admin >= 30 && admin <= 40);
  const combined = combineRiskContributions([cas, admin]);
  assert.ok(combined > cas && combined <= 100);
});

test("CAS positive record produces quarantine, not an automatic permanent block", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      result: { offenses: 2, reason: "spam", time_added: 1700000000 }
    })
  });
  const intel = createRexThreatIntel({ fetchImpl, supabase: null, cacheTtlMs: 1000 });
  const assessment = await intel.assessUser(821871410, { casEnabled: true });
  assert.equal(assessment.blocked, false);
  assert.equal(assessment.recommendedAction, "quarantine");
  assert.equal(assessment.riskBand, "quarantine");
  assert.ok(assessment.riskScore >= 55 && assessment.riskScore < 80);
  assert.ok(assessment.sources.some((row) => row.source === "cas" && row.blocked));
});

test("high score needs corroboration for a local block", () => {
  const oneSource = classifyRisk({ score: 88, independentSourceCount: 1 });
  assert.equal(oneSource.recommendedAction, "quarantine");
  assert.equal(oneSource.blocked, false);

  const corroborated = classifyRisk({ score: 88, independentSourceCount: 2 });
  assert.equal(corroborated.recommendedAction, "local_block");
  assert.equal(corroborated.blocked, true);
});

test("permanent network block requires owner adjudication and no active appeal", () => {
  const adjudicated = classifyRisk({
    score: 100,
    independentSourceCount: 1,
    ownerBlocked: true,
    activeAppeal: false
  });
  assert.equal(adjudicated.recommendedAction, "network_block");
  assert.equal(adjudicated.blocked, true);

  const appealed = classifyRisk({
    score: 100,
    independentSourceCount: 1,
    ownerBlocked: true,
    activeAppeal: true
  });
  assert.equal(appealed.recommendedAction, "quarantine");
  assert.equal(appealed.blocked, false);
  assert.equal(appealed.escalationFrozen, true);
});

test("CAS no-record response stays clear and provider failures fail open", async () => {
  const clearIntel = createRexThreatIntel({
    fetchImpl: async () => ({ ok: true, json: async () => ({ ok: false, description: "Record not found" }) }),
    supabase: null
  });
  const clear = await clearIntel.assessUser(777000);
  assert.equal(clear.blocked, false);
  assert.equal(clear.recommendedAction, "allow");

  const degradedIntel = createRexThreatIntel({
    fetchImpl: async () => { throw new Error("offline"); },
    supabase: null
  });
  const assessment = await degradedIntel.assessUser(777001);
  assert.equal(assessment.blocked, false);
  assert.equal(assessment.recommendedAction, "allow");
  assert.equal(assessment.sources.find((row) => row.source === "cas").available, false);
});
