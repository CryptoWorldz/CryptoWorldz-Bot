const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { createRequestLimiter, validateTelegramInitData } = require("../src/miniapp-auth");

function signedInitData(botToken, values) {
  const params = new URLSearchParams(values);
  const check = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  params.set("hash", crypto.createHmac("sha256", secret).update(check).digest("hex"));
  return params.toString();
}

test("Mini App validation accepts signed current Telegram initData", () => {
  const token = "123456:secret";
  const nowMs = Date.parse("2026-08-01T09:00:00Z");
  const initData = signedInitData(token, {
    auth_date: String(Math.floor(nowMs / 1000) - 30),
    query_id: "secure-session",
    user: JSON.stringify({ id: 8029135300, first_name: "JayJay", username: "JayJayTeamDev" })
  });
  const result = validateTelegramInitData(initData, token, { nowMs });
  assert.equal(result.ok, true);
  assert.equal(result.user.id, 8029135300);
  assert.equal(result.user.username, "JayJayTeamDev");
});

test("Mini App validation rejects altered, expired and browser-supplied identities", () => {
  const token = "123456:secret";
  const nowMs = Date.parse("2026-08-01T09:00:00Z");
  const current = signedInitData(token, {
    auth_date: String(Math.floor(nowMs / 1000)),
    user: JSON.stringify({ id: 123, first_name: "Legend" })
  });
  assert.equal(validateTelegramInitData(current.replace("Legend", "Admin"), token, { nowMs }).ok, false);
  const expired = signedInitData(token, {
    auth_date: String(Math.floor(nowMs / 1000) - 7200),
    user: JSON.stringify({ id: 123, first_name: "Legend" })
  });
  assert.deepEqual(validateTelegramInitData(expired, token, { nowMs }), { ok: false, error: "expired_init_data" });
  assert.equal(validateTelegramInitData("user=%7B%22id%22%3A8029135300%7D", token, { nowMs }).ok, false);
});

test("Mini App request limiter isolates users and enforces its limit", () => {
  const allow = createRequestLimiter({ maxEvents: 2, intervalMs: 1000 });
  assert.equal(allow("legend-1", 0), true);
  assert.equal(allow("legend-1", 1), true);
  assert.equal(allow("legend-1", 2), false);
  assert.equal(allow("legend-2", 2), true);
  assert.equal(allow("legend-1", 1001), true);
});
