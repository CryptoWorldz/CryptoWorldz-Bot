const test = require("node:test");
const assert = require("node:assert/strict");
const {
  CONCERN_LOCATION_SCOPES,
  CONCERN_TOPICS,
  normalizeConcernListQuery
} = require("../src/votes-centre/http");

test("worldwide concern list defaults to a safe read-only page size", () => {
  const filters = normalizeConcernListQuery({});
  assert.deepEqual(filters.invalid, []);
  assert.equal(filters.limit, 25);
  assert.equal(filters.topic, null);
  assert.equal(filters.locationScope, null);
});

test("worldwide concern list accepts supported neutral discovery filters", () => {
  const filters = normalizeConcernListQuery({
    topic: "food-and-hunger",
    location_scope: "country",
    country_or_territory_code: "ug",
    language_code: "en-UG",
    limit: "40"
  });
  assert.deepEqual(filters.invalid, []);
  assert.equal(filters.topic, "food-and-hunger");
  assert.equal(filters.locationScope, "country");
  assert.equal(filters.countryOrTerritoryCode, "UG");
  assert.equal(filters.languageCode, "en-UG");
  assert.equal(filters.limit, 40);
});

test("worldwide concern list rejects unsupported discovery filters", () => {
  const filters = normalizeConcernListQuery({
    topic: "candidate-ranking",
    location_scope: "planet",
    country_or_territory_code: "@@@",
    language_code: "english!"
  });
  assert.deepEqual(filters.invalid, [
    "topic",
    "location_scope",
    "country_or_territory_code",
    "language_code"
  ]);
});

test("worldwide concern list clamps page size and exposes only approved taxonomies", () => {
  assert.equal(normalizeConcernListQuery({ limit: "999" }).limit, 100);
  assert.equal(normalizeConcernListQuery({ limit: "0" }).limit, 1);
  assert.ok(CONCERN_TOPICS.includes("public-money-and-resource-priorities"));
  assert.ok(CONCERN_TOPICS.includes("other-public-concern"));
  assert.deepEqual(CONCERN_LOCATION_SCOPES, ["global", "country", "territory", "region", "local"]);
});
