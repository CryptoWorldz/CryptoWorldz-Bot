const test = require("node:test");
const assert = require("node:assert/strict");
const {
  RAID_PULSE_MIN_GAP_SECONDS,
  RAID_PULSE_SCAN_INTERVAL_MS,
  campaignText,
  raidPulseText,
  parseRaidPayload,
  progressLine,
  detectPlatform
} = require("../src/ronald-raider");

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


test("Ronald Raider gives a simple three-step member flow and separates community targets", () => {
  const text = campaignText({
    id: 9,
    platform: "X",
    status: "active",
    likes_current: 0,
    likes_goal: 10,
    reposts_current: 0,
    reposts_goal: 5,
    replies_current: 0,
    replies_goal: 3,
    views_current: 0,
    views_goal: 8,
    reward_points: 20,
    participation_count: 3,
    source_url: "https://x.com/worldz/status/9"
  });
  assert.match(text, /RAID IN 3 EASY STEPS/);
  assert.match(text, /Tap OPEN POST/);
  assert.match(text, /I RAIDED ✅/);
  assert.match(text, /Legends joined: 3/);
  assert.match(text, /COMMUNITY POST TARGETS — not your personal checklist/);
  assert.match(text, /automatic safety checks/);
});

test("Ronald Raider pulse scans frequently but can only publish about once a minute", () => {
  assert.equal(RAID_PULSE_SCAN_INTERVAL_MS, 15_000);
  assert.equal(RAID_PULSE_MIN_GAP_SECONDS, 55);
});

test("Ronald Raider pulse card stays compact while telling a member exactly what to do", () => {
  const text = raidPulseText({
    id: 7,
    likes_current: 4,
    likes_goal: 10,
    reposts_current: 3,
    reposts_goal: 5,
    replies_current: 2,
    replies_goal: 3,
    views_current: 6,
    views_goal: 8,
    reward_points: 20,
    participation_count: 3
  });

  assert.match(text, /RONALD RAIDER • RAID #7 ACTIVE/);
  assert.match(text, /1️⃣ OPEN POST/);
  assert.match(text, /2️⃣ Like \+ Repost \+ Reply/);
  assert.match(text, /3️⃣ Come back → I RAIDED ✅/);
  assert.match(text, /Legends joined: 3/);
  assert.match(text, /❤️ 4\/10/);
  assert.match(text, /🔁 3\/5/);
  assert.match(text, /💬 2\/3/);
  assert.match(text, /👀 6\/8/);
  assert.match(text, /Community targets — NOT your personal checklist/);
  assert.match(text, /20 LP on verified completion/);
  assert.equal(text.includes("raidprogress"), false);
});
