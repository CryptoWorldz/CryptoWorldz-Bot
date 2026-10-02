const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createConcernSubmissionLimiter,
  normalizeConcernSubmission,
  normalizeSourceBundle
} = require("../src/votes-centre/http");

test("valid worldwide concern is normalized for review without identity fields", () => {
  const result = normalizeConcernSubmission({
    topic: "food-and-hunger",
    location_scope: "country",
    country_or_territory_code: "ug",
    place_label: "Uganda",
    title: "Improve reliable access to food",
    summary: "Document community priorities for reliable food access and transparent resource allocation.",
    language_code: "en-UG",
    sources: ["https://example.org/report"],
    privacy_acknowledged: true,
    review_acknowledged: true
  });
  assert.deepEqual(result.invalid, []);
  assert.equal(result.value.country_or_territory_code, "UG");
  assert.equal(result.value.location_scope, "country");
  assert.deepEqual(result.value.source_bundle, [{ url: "https://example.org/report" }]);
  assert.equal("name" in result.value, false);
  assert.equal("email" in result.value, false);
});

test("structured private identity and demographic fields are rejected", () => {
  const result = normalizeConcernSubmission({
    topic: "clean-water-and-sanitation",
    place_label: "Local community",
    title: "Improve clean water access",
    summary: "A public concern about clean water infrastructure and transparent community priorities.",
    name: "Private Person",
    email: "private@example.com",
    race: "private demographic value",
    privacy_acknowledged: true,
    review_acknowledged: true
  });
  assert.ok(result.invalid.includes("private_identity_fields"));
});

test("privacy and human-review acknowledgements are mandatory", () => {
  const result = normalizeConcernSubmission({
    topic: "education-and-opportunity",
    place_label: "Worldwide",
    title: "Expand education opportunity",
    summary: "A public concern about fair access to education and opportunity around the world."
  });
  assert.ok(result.invalid.includes("privacy_acknowledged"));
  assert.ok(result.invalid.includes("review_acknowledged"));
});

test("source bundle accepts only up to five HTTP or HTTPS URLs", () => {
  assert.equal(normalizeSourceBundle(["ftp://example.org/file"]).invalid, true);
  assert.equal(normalizeSourceBundle(Array(6).fill("https://example.org")).invalid, true);
  assert.equal(normalizeSourceBundle(["https://example.org","http://example.net"]).invalid, false);
});

test("concern submission limiter blocks the fourth request within one window", () => {
  const limiter = createConcernSubmissionLimiter({ limit: 3, windowMs: 60000 });
  const req = { ip: "203.0.113.7" };
  const responses = [];
  const res = {
    status(code) { this.code = code; return this; },
    json(payload) { responses.push({ code: this.code, payload }); return this; }
  };
  let passed = 0;
  const next = () => { passed += 1; };
  limiter(req, res, next);
  limiter(req, res, next);
  limiter(req, res, next);
  limiter(req, res, next);
  assert.equal(passed, 3);
  assert.equal(responses[0].code, 429);
  assert.equal(responses[0].payload.error, "civic_concern_rate_limited");
});
