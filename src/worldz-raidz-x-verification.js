"use strict";

// WORLDZ RAIDZ read-only X verification. No points or balances are modified.
// Caller supplies an authorized bearer token and a verified Telegram-to-X ID mapping.
// A missing or inaccessible X API response must never be treated as participation.
const X_API = "https://api.x.com/2";

function numericId(value) {
  const id = String(value ?? "").trim();
  if (!/^\d{1,19}$/.test(id)) throw new TypeError("Invalid X numeric ID");
  return id;
}

function xPostId(url) {
  const parsed = new URL(String(url));
  if (!["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(parsed.hostname.toLowerCase())) {
    throw new TypeError("Expected an X post URL");
  }
  const match = parsed.pathname.match(/\/status\/(\d{1,19})(?:\/|$)/);
  if (!match) throw new TypeError("Missing X post ID");
  return match[1];
}

async function readXUsers({ postId, endpoint, bearerToken, fetchImpl = fetch }) {
  const id = numericId(postId);
  if (!["liking_users", "retweeted_by"].includes(endpoint)) throw new TypeError("Unsupported endpoint");
  if (!bearerToken) return { status: "unavailable", reason: "missing_token", users: [] };
  const response = await fetchImpl(`${X_API}/tweets/${id}/${endpoint}?max_results=100`, {
    headers: { Authorization: `Bearer ${bearerToken}` }
  });
  if (!response.ok) return { status: "unavailable", reason: `http_${response.status}`, users: [] };
  const payload = await response.json();
  // The liking-users endpoint may only expose a limited subset of users.
  // Never infer that an absent user did not participate.
  return {
    status: "partial",
    users: Array.isArray(payload.data) ? payload.data.map((u) => String(u.id)) : [],
    nextToken: payload.meta?.next_token || null
  };
}

async function verifyXEngagement({ postId, xUserId, bearerToken, fetchImpl = fetch }) {
  const userId = numericId(xUserId);
  const [likes, reposts] = await Promise.all([
    readXUsers({ postId, endpoint: "liking_users", bearerToken, fetchImpl }),
    readXUsers({ postId, endpoint: "retweeted_by", bearerToken, fetchImpl })
  ]);
  return {
    xUserId: userId,
    postId: numericId(postId),
    liked: likes.users.includes(userId) ? "verified" : "unknown",
    reposted: reposts.users.includes(userId) ? "verified" : "unknown",
    likesStatus: likes.status,
    repostsStatus: reposts.status,
    // Never award points from unknown/partial evidence.
    eligibleForAutomaticAward: likes.users.includes(userId) && reposts.users.includes(userId)
  };
}

module.exports = { numericId, xPostId, readXUsers, verifyXEngagement };
