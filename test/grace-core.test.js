const test = require("node:test");
const assert = require("node:assert/strict");

const {
  estimatePostCost,
  parseAccountPayload,
  parseBudgetPayload,
  parseDraftPayload,
  parsePostActionPayload,
  parseSchedulePayload,
  secretReferenceFor
} = require("../src/grace/core");
const { composeCaption, createGracePublisher, readCredential } = require("../src/grace/adapters");
const { safeEqual } = require("../src/grace/http");

test("Grace parses mobile-friendly drafts", () => {
  assert.deepEqual(parseDraftPayload("Launch | One World • One Mission"), {
    ok: true,
    value: { title: "Launch", body: "One World • One Mission" }
  });
  assert.equal(parseDraftPayload("").ok, false);
});

test("Grace validates account registration and creates safe secret references", () => {
  const parsed = parseAccountPayload("add x | SolWorldX | SolWorld | @Solworldx");
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.accountKey, "solworldx");
  assert.equal(parsed.value.handle, "Solworldx");
  assert.equal(secretReferenceFor("x", parsed.value.accountKey), "GRACE_X_TOKEN_SOLWORLDX");
  assert.equal(parseAccountPayload("add unknown | key | Name").ok, false);
});

test("Grace validates scheduling, approval and budgets", () => {
  const scheduled = parseSchedulePayload("3a9f1c9a-a928-4ad8-8c39-4ec61e23df55 | 2026-08-06T09:00+10:00 | 1, 2,2");
  assert.equal(scheduled.ok, true);
  assert.deepEqual(scheduled.value.accountIds, [1, 2]);
  assert.equal(parsePostActionPayload("bad").ok, false);
  assert.equal(parseBudgetPayload("25").value, 25);
});

test("Auto cost model distinguishes X text and link writes", () => {
  const model = { x: { text: 0.015, link: 0.2 } };
  assert.equal(estimatePostCost("x", false, model), 0.015);
  assert.equal(estimatePostCost("x", true, model), 0.2);
  assert.equal(estimatePostCost("facebook", true, model), 0);
});

test("Grace keeps credentials in environment references", () => {
  assert.equal(readCredential({ GRACE_X_TOKEN_TEST: "secret" }, "GRACE_X_TOKEN_TEST"), "secret");
  assert.throws(() => readCredential({}, "GRACE_X_TOKEN_TEST"), /has not been configured/);
  assert.throws(() => readCredential({ BAD: "secret" }, "bad-key"), /invalid/);
});

test("Grace composes links once and publishes with the official X endpoint", async () => {
  assert.equal(composeCaption({ caption: "Hello", link_url: "https://example.com" }), "Hello\n\nhttps://example.com");
  const calls = [];
  const publisher = createGracePublisher({
    env: { GRACE_X_TOKEN_TEST: "token" },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 201, json: async () => ({ data: { id: "123", text: "Hello" } }) };
    }
  });
  const result = await publisher.publish({
    platform: "x",
    credential_secret_ref: "GRACE_X_TOKEN_TEST",
    caption: "Hello",
    link_url: "",
    media: {}
  });
  assert.equal(result.externalPostId, "123");
  assert.equal(calls[0].url, "https://api.x.com/2/tweets");
  assert.match(calls[0].options.headers.Authorization, /^Bearer /);
});

test("Grace API secret comparison is timing-safe and rejects blanks", () => {
  assert.equal(safeEqual("same", "same"), true);
  assert.equal(safeEqual("same", "different"), false);
  assert.equal(safeEqual("", ""), false);
});
