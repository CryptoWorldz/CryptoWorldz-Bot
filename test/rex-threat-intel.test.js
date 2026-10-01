const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createRexThreatIntel,
  jaccardSimilarity,
  normalizeText,
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

test("CAS positive record produces a high-confidence block decision", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      result: { offenses: 2, reason: "spam", time_added: 1700000000 }
    })
  });
  const intel = createRexThreatIntel({ fetchImpl, supabase: null, cacheTtlMs: 1000 });
  const assessment = await intel.assessUser(821871410, { casEnabled: true });
  assert.equal(assessment.blocked, true);
  assert.equal(assessment.confidence, 100);
  assert.ok(assessment.sources.some((row) => row.source === "cas" && row.blocked));
});

test("CAS no-record response stays clear and provider failures fail open", async () => {
  const clearIntel = createRexThreatIntel({
    fetchImpl: async () => ({ ok: true, json: async () => ({ ok: false, description: "Record not found" }) }),
    supabase: null
  });
  assert.equal((await clearIntel.assessUser(777000)).blocked, false);

  const degradedIntel = createRexThreatIntel({
    fetchImpl: async () => { throw new Error("offline"); },
    supabase: null
  });
  const assessment = await degradedIntel.assessUser(777001);
  assert.equal(assessment.blocked, false);
  assert.equal(assessment.sources.find((row) => row.source === "cas").available, false);
});
