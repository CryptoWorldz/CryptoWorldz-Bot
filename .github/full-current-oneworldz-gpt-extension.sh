#!/usr/bin/env bash
set -Eeuo pipefail

: "${PROTECTED_DOMAIN:?}"

status_file="$RUNNER_TEMP/oneworldz-gpt-extension-status.json"
code_file="$RUNNER_TEMP/oneworldz-gpt-extension-status.code"

probe_status() {
  local tag code
  tag="oneworldz_gpt_extension=${GITHUB_SHA:-local}-${GITHUB_RUN_ID:-local}-$(date +%s%N)"
  code="$(curl --silent --show-error --location --connect-timeout 5 --max-time 15 \
    -o "$status_file" -w '%{http_code}' \
    "https://$PROTECTED_DOMAIN/api/oneworldz-gpt/status?$tag" || true)"
  printf '%s' "$code" > "$code_file"
}

print_safe_status() {
  STATUS="$status_file" node - <<'NODE'
const fs = require('fs');
let p = {};
try { p = JSON.parse(fs.readFileSync(process.env.STATUS, 'utf8')); } catch {}
const safe = {
  ok: p.ok,
  service: p.service,
  openai_api_configured: p.openai_api_configured,
  guard_profile: p.guard_profile,
  guard_enforced: p.guard_enforced,
  model: p.model,
  max_output_tokens: p.max_output_tokens,
  per_ip_limit_10m: p.per_ip_limit_10m,
  daily_request_limit: p.daily_request_limit,
  payments_in_chat: p.payments_in_chat,
  secrets_in_browser: p.secrets_in_browser,
  runtime: p.runtime
};
console.log(`ONEWORLDZ_GPT_EXTENSION_STATUS=${JSON.stringify(safe)}`);
NODE
}

contract_passes() {
  STATUS="$status_file" node - <<'NODE'
const fs = require('fs');
let p;
try { p = JSON.parse(fs.readFileSync(process.env.STATUS, 'utf8')); } catch { process.exit(1); }
const checks = {
  ok: p.ok === true,
  openai_api_configured: p.openai_api_configured === true,
  guard_profile: p.guard_profile === 'oneworldz-public-low-cost-v1',
  guard_enforced: p.guard_enforced === true,
  model: p.model === 'gpt-4o-mini',
  max_output_tokens: p.max_output_tokens === 320,
  per_ip_limit_10m: p.per_ip_limit_10m === 8,
  daily_request_limit: p.daily_request_limit === 1000,
  payments_in_chat: p.payments_in_chat === false,
  secrets_in_browser: p.secrets_in_browser === false
};
const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
console.log(`ONEWORLDZ_GPT_EXTENSION_PREDICATES=${JSON.stringify(checks)}`);
if (failed.length) {
  console.error(`ONEWORLDZ_GPT_EXTENSION_FAILED_FIELDS=${failed.join(',')}`);
  process.exit(1);
}
NODE
}

for attempt in $(seq 1 8); do
  probe_status
  code="$(cat "$code_file")"
  echo "ONEWORLDZ_GPT_EXTENSION_PROBE attempt=$attempt/8 http=$code"
  print_safe_status
  if [ "$code" = 200 ] && contract_passes; then
    echo 'ONEWORLDZ_GPT_EXTENSION_LIVE=PASS'
    exit 0
  fi
  sleep 4
done

echo '::error::OneWorldz GPT extension did not satisfy its independent live contract.'
exit 1

# Canonical direct trigger after the standalone ZED Core / extension split.
# Native merge trigger keeps the single production rail explicit and auditable.
