import assert from "node:assert/strict";
import test from "node:test";
import { COMMAND_CENTRE_BUILD, loadConfig, runtimeReadiness } from "../src/config.mjs";

test("Grace health exposes the exact production build fingerprint", () => {
  const readiness = runtimeReadiness(loadConfig({}));
  assert.equal(COMMAND_CENTRE_BUILD, "grace-build1-2026-08-10");
  assert.equal(readiness.build, COMMAND_CENTRE_BUILD);
  assert.equal(readiness.version, "4.1.0");
  assert.equal(readiness.zed.simplified_gateway_commands, true);
  assert.equal(readiness.grace.account_permissions, true);
  assert.equal(readiness.grace.publish_results_required, true);
});
