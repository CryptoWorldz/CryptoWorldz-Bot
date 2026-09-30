const test = require("node:test");
const assert = require("node:assert/strict");
const { parseShillProof, platformFromUrl, normalizeSymbol } = require("../src/shill-rewards");

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
  const good = parseShillProof("$recap | https://x.com/me/status/123");
  assert.equal(good.ok, true);
  assert.equal(good.symbol, "RECAP");
  assert.equal(good.platform, "X");
  assert.equal(normalizeSymbol("$pnex"), "PNEX");

  assert.equal(parseShillProof("RECAP | http://x.com/me/status/123").ok, false);
  assert.equal(parseShillProof("RECAP").ok, false);
});
