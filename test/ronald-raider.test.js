const test = require("node:test");
const assert = require("node:assert/strict");
const { parseRaidPayload, progressLine, detectPlatform } = require("../src/ronald-raider");

test("Ronald Raider short form loads safe defaults", () => {
  const result = parseRaidPayload("https://x.com/example/status/123");
  assert.equal(result.ok, true);
  assert.equal(result.target.platform, "X");
  assert.deepEqual(result.goals, { likes: 10, reposts: 5, replies: 3, views: 8 });
  assert.equal(result.reward, 20);
  assert.equal(result.durationHours, 24);
});

test("Ronald Raider accepts explicit X goals, reward and duration", () => {
  const result = parseRaidPayload("https://x.com/example/status/123 | 25 | 15 | 10 | 100 | 30 | 2d");
  assert.equal(result.ok, true);
  assert.deepEqual(result.goals, { likes: 25, reposts: 15, replies: 10, views: 100 });
  assert.equal(result.reward, 30);
  assert.equal(result.durationHours, 48);
});

test("Ronald Raider detects supported social platforms and rejects unsafe URLs", () => {
  assert.equal(detectPlatform("https://youtube.com/watch?v=abc").platform, "YouTube");
  assert.equal(detectPlatform("https://tiktok.com/@worldz/video/1").platform, "TikTok");
  assert.equal(detectPlatform("http://x.com/example/status/123"), null);
});

test("Ronald Raider progress is capped for display", () => {
  assert.match(progressLine("Likes", 5, 10), /50%/);
  assert.match(progressLine("Likes", 20, 10), /100%/);
});
