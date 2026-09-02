#!/usr/bin/env bash
set -euo pipefail

: "${PROTECTED_DOMAIN:?}"
status_file="${RUNNER_TEMP:-/tmp}/oneworldz-gpt-predeploy-status.json"
chat_file="${RUNNER_TEMP:-/tmp}/oneworldz-gpt-predeploy-chat.json"

curl --fail --silent --show-error --location --connect-timeout 5 --max-time 20 \
  "https://${PROTECTED_DOMAIN}/api/oneworldz-gpt/status?predeploy=${GITHUB_RUN_ID:-local}" \
  -o "$status_file"

STATUS_FILE="$status_file" node - <<'NODE'
const status = JSON.parse(require('fs').readFileSync(process.env.STATUS_FILE, 'utf8'));
const required = {
  ok: status.ok === true,
  configured: status.openai_api_configured === true,
  model: status.model === 'gpt-5.6-luna',
  guards: status.guard_enforced === true && status.payments_in_chat === false && status.secrets_in_browser === false
};
const failed = Object.entries(required).filter(([, pass]) => !pass).map(([name]) => name);
if (failed.length) throw new Error(`OneWorldz GPT predeploy health failed: ${failed.join(',')}`);
NODE

code="$(curl --silent --show-error --location --connect-timeout 5 --max-time 45 --request POST \
  -H 'Content-Type: application/json' --data '{"message":"Reply with READY.","history":[],"page":"static-predeploy-health"}' \
  -o "$chat_file" -w '%{http_code}' "https://${PROTECTED_DOMAIN}/api/oneworldz-gpt/chat")"
test "$code" = "200"
CHAT_FILE="$chat_file" node - <<'NODE'
const chat = JSON.parse(require('fs').readFileSync(process.env.CHAT_FILE, 'utf8'));
if (chat.ok !== true || chat.service !== 'OneWorldz GPT' || !String(chat.text || '').trim()) throw new Error('OneWorldz GPT chat predeploy health failed');
NODE
echo 'ONEWORLDZ_GPT_PREDEPLOY_HEALTH=PASS'

# Static release retrigger after protected runtime repair.
