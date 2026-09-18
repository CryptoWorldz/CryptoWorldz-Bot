const crypto = require("crypto");

function validateTelegramInitData(initData, botToken, options = {}) {
  if (typeof initData !== "string" || !initData || initData.length > 8192) {
    return { ok: false, error: "invalid_init_data" };
  }
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash") || "";
  params.delete("hash");
  if (!/^[a-f0-9]{64}$/i.test(receivedHash)) return { ok: false, error: "invalid_signature" };

  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest();
  const receivedBuffer = Buffer.from(receivedHash, "hex");
  if (receivedBuffer.length !== expectedHash.length || !crypto.timingSafeEqual(receivedBuffer, expectedHash)) {
    return { ok: false, error: "invalid_signature" };
  }

  const nowSeconds = Math.floor((options.nowMs || Date.now()) / 1000);
  const maxAgeSeconds = options.maxAgeSeconds || 3600;
  const authDate = Number(params.get("auth_date"));
  if (!Number.isSafeInteger(authDate) || authDate > nowSeconds + 30 || nowSeconds - authDate > maxAgeSeconds) {
    return { ok: false, error: "expired_init_data" };
  }

  let user;
  try {
    user = JSON.parse(params.get("user") || "null");
  } catch {
    return { ok: false, error: "invalid_user" };
  }
  if (!user || !Number.isSafeInteger(Number(user.id)) || Number(user.id) <= 0) {
    return { ok: false, error: "invalid_user" };
  }
  return { ok: true, user: { ...user, id: Number(user.id) }, authDate };
}

function createRequestLimiter({ maxEvents = 60, intervalMs = 60000 } = {}) {
  const buckets = new Map();
  return (key, now = Date.now()) => {
    const current = (buckets.get(key) || []).filter((timestamp) => now - timestamp < intervalMs);
    if (current.length >= maxEvents) return false;
    current.push(now);
    buckets.set(key, current);
    if (buckets.size > 10000) buckets.clear();
    return true;
  };
}

module.exports = { createRequestLimiter, validateTelegramInitData };
