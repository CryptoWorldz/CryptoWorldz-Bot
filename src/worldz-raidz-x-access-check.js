"use strict";

// Explicit, read-only diagnostics. No calls occur unless the owner invokes this
// function with an existing bearer token. Never logs or returns credentials.
const { xPostId } = require("./worldz-raidz-x-verification");

async function inspectRaidReadAccess({ postUrl, bearerToken, fetchImpl = fetch }) {
  const postId = xPostId(postUrl);
  if (!bearerToken) return { ready: false, reason: "credentials_unavailable", postId };
  const checks = {};
  for (const [name, suffix] of [
    ["post", `/tweets/${postId}?tweet.fields=public_metrics`],
    ["likes", `/tweets/${postId}/liking_users?max_results=1`],
    ["reposts", `/tweets/${postId}/retweeted_by?max_results=1`]
  ]) {
    try {
      const response = await fetchImpl(`https://api.x.com/2${suffix}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${bearerToken}` }
      });
      checks[name] = { accessible: response.ok, status: response.status };
    } catch {
      checks[name] = { accessible: false, status: "network_error" };
    }
  }
  return {
    postId,
    ready: Object.values(checks).every((check) => check.accessible),
    checks,
    note: "Read access alone does not establish participant identity mapping or full coverage; no rewards are awarded."
  };
}

module.exports = { inspectRaidReadAccess };
