"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { xPostId, verifyXEngagement } = require("../src/worldz-raidz-x-verification");

test("extracts canonical X post ID", () => {
  assert.equal(xPostId("https://x.com/PDCrew/status/2119296952714342521"), "2119296952714342521");
  assert.throws(() => xPostId("https://evil.example/status/2119296952714342521"));
});

test("only independently observed like and repost qualify", async () => {
  const fetchImpl = async (url) => ({
    ok: true,
    json: async () => ({ data: url.includes("liking_users") ? [{ id: "123" }] : [{ id: "123" }] })
  });
  const result = await verifyXEngagement({ postId: "456", xUserId: "123", bearerToken: "test", fetchImpl });
  assert.equal(result.eligibleForAutomaticAward, true);
});

test("API denial or missing evidence never awards", async () => {
  const fetchImpl = async () => ({ ok: false, status: 403 });
  const result = await verifyXEngagement({ postId: "456", xUserId: "123", bearerToken: "test", fetchImpl });
  assert.equal(result.eligibleForAutomaticAward, false);
  assert.equal(result.liked, "unknown");
  assert.equal(result.reposted, "unknown");
});

test("no bearer token cannot award", async () => {
  const result = await verifyXEngagement({ postId: "456", xUserId: "123", bearerToken: "" });
  assert.equal(result.eligibleForAutomaticAward, false);
});
