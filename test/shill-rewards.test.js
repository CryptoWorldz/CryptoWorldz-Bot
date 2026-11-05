const test = require("node:test");
const assert = require("node:assert/strict");
const { CURRENT_SHILL_CAMPAIGN, buildShillPackText, parseShillProof, platformFromUrl, normalizeSymbol } = require("../src/shill-rewards");

test("token shill proof supports requested social platforms", () => {
  const cases = [
    ["https://x.com/me/status/1", "X"],
    ["https://facebook.com/posts/1", "Facebook"],
    ["https://youtube.com/watch?v=1", "YouTube"],
    ["https://tiktok.com/@me/video/1", "TikTok"],
    ["https://instagram.com/p/abc", "Instagram"]
  ];
  for (const [url, platform] of cases) assert.equal(platformFromUrl(url).platform, platform);
});

test("shill proof normalizes tickers and requires HTTPS proof", () => {
  const good = parseShillProof("$wldz | https://x.com/me/status/123");
  assert.equal(good.ok, true);
  assert.equal(good.symbol, "WLDZ");
  assert.equal(good.platform, "X");
  assert.equal(normalizeSymbol("$pnex"), "PNEX");

  assert.equal(parseShillProof("WLDZ | http://x.com/me/status/123").ok, false);
  assert.equal(parseShillProof("WLDZ").ok, false);
});


test("current Worldz Shill Pack points to the central Worldz hub and launchpad", () => {
  const text = buildShillPackText();
  assert.equal(CURRENT_SHILL_CAMPAIGN.id, "WORLDZ_LAUNCH_COMMUNITY_2026_11_05");
  assert.equal(CURRENT_SHILL_CAMPAIGN.url, "https://worldzlaunch.com");
  assert.equal(CURRENT_SHILL_CAMPAIGN.communityUrl, "https://t.me/WorldzHq");
  assert.match(text, /CREATE YOUR OWN CRYPTO TOKEN/);
  assert.match(text, /Your Idea\. Your Token\. Your Community\./);
  assert.match(text, /Worldz Raidz/);
  assert.match(text, /SPARKY/);
  assert.ok(text.includes("https://worldzhq.com"));
  assert.ok(text.includes("https://t.me/WorldzHq"));
  assert.match(text, /does not guarantee it has value, liquidity or legal-tender status/);
  assert.doesNotMatch(text, /CREATE YOUR OWN MONEY/);
  assert.doesNotMatch(text, /launchpad\.cryptoworldz\.xyz/);
});
