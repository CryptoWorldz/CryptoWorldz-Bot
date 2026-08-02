const test = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateAdjustedPoints,
  createRateLimiter,
  formatCommunity,
  formatMission,
  formatMissionList,
  formatWebsite,
  getRank,
  isAdmin,
  isDoneClaim,
  isDuplicateError,
  isValidSolanaAddress,
  normalizeGovernanceOption,
  parseBoolean,
  parseEditMissionPayload,
  parseIdSet,
  parseNewMissionPayload,
  parseSimpleRaid,
  parsePointsAdjustment,
  permissionsForRole,
  shortenWallet,
  splitTelegramMessage
} = require("../src/core");

test("rank calculation covers every Legend tier", () => {
  assert.equal(getRank(0), "New Legend");
  assert.equal(getRank(50), "Raaiiidd Legend");
  assert.equal(getRank(150), "CryptoWorldz Warrior");
  assert.equal(getRank(350), "Worldz Champion");
  assert.equal(getRank(750), "Purple Diamond Legend");
  assert.equal(getRank(1500), "CryptoWorldz Commander");
});

test("wallet validation accepts a 32-byte Solana address", () => {
  assert.equal(isValidSolanaAddress("11111111111111111111111111111111"), true);
  assert.equal(isValidSolanaAddress("not-a-wallet"), false);
  assert.equal(isValidSolanaAddress("0OIl"), false);
});

test("wallet shortening does not expose the whole address", () => {
  assert.equal(shortenWallet("123456789ABCDEFGHJKLMNPQRSTUVWXYZ"), "123456...UVWXYZ");
});

test("admin roles receive least-privilege defaults", () => {
  assert.equal(permissionsForRole("admin").has("submission.approve"), true);
  assert.equal(permissionsForRole("moderator").has("submission.approve"), false);
  assert.equal(permissionsForRole("recap_manager").has("recap.publish"), true);
  assert.equal(permissionsForRole("partner_manager").has("mission.create"), true);
  assert.equal(permissionsForRole("treasury_manager").has("treasury.reconcile"), true);
  assert.equal(permissionsForRole("unknown").size, 0);
});

test("Governance choices accept only numbered proposal options", () => {
  assert.equal(normalizeGovernanceOption("1", 3), "1");
  assert.equal(normalizeGovernanceOption(3, 3), "3");
  assert.equal(normalizeGovernanceOption("0", 3), null);
  assert.equal(normalizeGovernanceOption("4", 3), null);
  assert.equal(normalizeGovernanceOption("Shared", 3), null);
});

test("admin ID parsing rejects non-numeric entries", () => {
  const ids = parseIdSet("123, 456, nope, -10099");
  assert.deepEqual([...ids], ["123", "456", "-10099"]);
  assert.equal(isAdmin(456, ids), true);
  assert.equal(isAdmin(789, ids), false);
});

test("unauthorized users fail the admin check", () => {
  assert.equal(isAdmin(222, new Set(["111"])), false);
});

test("mission formatting includes ID, reward, link and DONE instruction", () => {
  const formatted = formatMission({
    id: 12,
    title: "Support CryptoWorldz",
    platform: "X",
    reward_points: 30,
    link: "https://x.com/CryptoWorldzX",
    instructions: "Like and repost"
  });
  assert.match(formatted, /Mission #12/);
  assert.match(formatted, /30 Legend Points/);
  assert.match(formatted, /https:\/\/x\.com\/CryptoWorldzX/);
  assert.match(formatted, /✅ DONE/);
});

test("mission list preserves newest-first input order", () => {
  const formatted = formatMissionList([
    { id: 2, title: "Newest", reward_points: 5 },
    { id: 1, title: "Older", reward_points: 3 }
  ]);
  assert.ok(formatted.indexOf("Newest") < formatted.indexOf("Older"));
});

test("DONE claim parsing accepts required variants", () => {
  assert.equal(isDoneClaim("DONE"), true);
  assert.equal(isDoneClaim("✅ DONE"), true);
  assert.equal(isDoneClaim("done proof attached"), true);
  assert.equal(isDoneClaim("not done"), false);
});

test("duplicate claim handling recognizes Postgres unique violations", () => {
  assert.equal(isDuplicateError({ code: "23505" }), true);
  assert.equal(isDuplicateError({ message: "duplicate key value" }), true);
  assert.equal(isDuplicateError({ code: "42501" }), false);
});

test("reward calculation prevents negative totals and excessive adjustments", () => {
  assert.deepEqual(calculateAdjustedPoints(40, 10), { ok: true, points: 50, adjustment: 10 });
  assert.equal(calculateAdjustedPoints(5, -10).error, "points_below_zero");
  assert.equal(calculateAdjustedPoints(0, 10001).error, "adjustment_too_large");
});

test("new mission command parser validates fields and reward", () => {
  const parsed = parseNewMissionPayload(
    "Support CryptoWorldz | X | 30 | https://x.com/CryptoWorldzX | Join in | Like and repost"
  );
  assert.equal(parsed.ok, true);
  assert.equal(parsed.mission.reward_points, 30);
  assert.equal(parsed.mission.status, "open");
  assert.equal(parseNewMissionPayload("bad").ok, false);
});

test("edit mission command parser allows only approved columns", () => {
  const parsed = parseEditMissionPayload("12 reward_points | 30");
  assert.deepEqual(parsed, {
    ok: true,
    missionId: 12,
    field: "reward_points",
    newValue: 30
  });
  assert.equal(parseEditMissionPayload("12 private_key | secret").ok, false);
});

test("admin points command parser accepts positive and negative changes", () => {
  assert.deepEqual(parsePointsAdjustment("123456789 50"), {
    ok: true,
    telegramId: 123456789,
    amount: 50
  });
  assert.equal(parsePointsAdjustment("123456789 -10").ok, true);
  assert.equal(parsePointsAdjustment("123456789 10001").ok, false);
});

test("rate limiter blocks events above its configured limit", () => {
  let timestamp = 1000;
  const allow = createRateLimiter({ maxEvents: 2, intervalMs: 100, now: () => timestamp });
  assert.equal(allow("admin"), true);
  assert.equal(allow("admin"), true);
  assert.equal(allow("admin"), false);
  timestamp = 1101;
  assert.equal(allow("admin"), true);
});

test("website command supports pre-launch and launched states", () => {
  assert.match(
    formatWebsite({ websiteUrl: "https://CryptoWorldz.xyz", websiteLaunched: false }),
    /Website launching soon/
  );
  assert.doesNotMatch(
    formatWebsite({ websiteUrl: "https://CryptoWorldz.xyz", websiteLaunched: true }),
    /launching soon/
  );
});

test("community command omits missing links", () => {
  const formatted = formatCommunity({ communityWebsiteUrl: "https://CryptoWorldz.xyz" });
  assert.doesNotMatch(formatted, /Coming soon/);
  assert.match(formatted, /https:\/\/CryptoWorldz\.xyz/);
});

for (const [platform, url] of Object.entries({
  X: "https://x.com/example/status/123", Telegram: "https://t.me/example/123",
  YouTube: "https://youtube.com/watch?v=123", TikTok: "https://tiktok.com/@example/video/123",
  Instagram: "https://instagram.com/p/123", Facebook: "https://facebook.com/example/posts/123",
  Reddit: "https://reddit.com/r/test/comments/123", Discord: "https://discord.gg/example",
  Website: "https://example.org/news"
})) test(`simple Raaiiidd detects ${platform}`, () => {
  const parsed = parseSimpleRaid(url);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.mission.platform, platform);
  assert.equal(parsed.mission.reward_points, 10);
});

test("simple Raaiiidd rejects unsafe schemes and parses duration", () => {
  assert.equal(parseSimpleRaid("javascript:alert(1)").ok, false);
  assert.equal(parseSimpleRaid("http://example.org").ok, false);
  const parsed = parseSimpleRaid("https://x.com/example/status/1 | 20 | 24h");
  assert.equal(parsed.mission.reward_points, 20);
  assert.ok(parsed.mission.expires_at);
});

test("boolean environment parsing uses safe defaults", () => {
  assert.equal(parseBoolean(undefined, false), false);
  assert.equal(parseBoolean("true", false), true);
  assert.equal(parseBoolean("off", true), false);
});

test("long Telegram messages are split within the platform limit", () => {
  const chunks = splitTelegramMessage(`${"A".repeat(2500)}\n\n${"B".repeat(2500)}`);
  assert.equal(chunks.length, 2);
  assert.ok(chunks.every((chunk) => chunk.length <= 4096));
  assert.match(chunks[1], /^B/);
});
