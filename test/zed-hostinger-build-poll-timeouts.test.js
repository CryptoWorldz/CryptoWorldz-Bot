const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("Hostinger build polling is bounded and reports timeout failures", () => {
  const script = fs.readFileSync(
    path.resolve(__dirname, "..", ".github", "full-current-zed-runtime.sh"),
    "utf8"
  );

  const pollStart = script.indexOf('build_last_poll_error="none"');
  const pollEnd = script.indexOf("HOSTINGER_MANAGED_BUILD=PASS");
  assert.ok(pollStart >= 0, "build polling must track the latest poll error");
  assert.ok(pollEnd > pollStart, "build polling block must be present");

  const poll = script.slice(pollStart, pollEnd);
  assert.match(poll, /--connect-timeout 15/);
  assert.match(poll, /--max-time 60/);
  assert.match(poll, /--retry 2/);
  assert.match(poll, /HOSTINGER_MANAGED_BUILD_POLL_FAILED/);
  assert.match(poll, /Managed Hostinger build did not complete within 90 bounded polls/);
});
