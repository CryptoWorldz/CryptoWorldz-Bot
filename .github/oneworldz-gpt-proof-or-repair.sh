#!/usr/bin/env bash
set -Eeuo pipefail

: "${PROTECTED_DOMAIN:?}"

status_file="$RUNNER_TEMP/oneworldz-gpt-preflight-status.json"
chat_file="$RUNNER_TEMP/oneworldz-gpt-preflight-chat.json"

live_contract() {
  local tag status_code chat_code
  tag="oneworldz_perfect=${GITHUB_SHA:-local}-${GITHUB_RUN_ID:-local}-$(date +%s%N)"
  status_code="$(curl --silent --show-error --location --connect-timeout 5 --max-time 15 \
    -o "$status_file" -w '%{http_code}' \
    "https://$PROTECTED_DOMAIN/api/oneworldz-gpt/status?$tag" || true)"
  [ "$status_code" = 200 ] || return 1
  STATUS="$status_file" node - <<'NODE'
const fs = require('fs');
let p;
try { p = JSON.parse(fs.readFileSync(process.env.STATUS, 'utf8')); } catch { process.exit(1); }
const ok = p.ok === true && p.service === 'OneWorldz GPT' && p.openai_api_configured === true &&
  p.guard_profile === 'oneworldz-public-low-cost-v1' && p.guard_enforced === true &&
  p.payments_in_chat === false && p.secrets_in_browser === false;
if (!ok) process.exit(1);
NODE
  chat_code="$(curl --silent --show-error --location --connect-timeout 5 --max-time 45 \
    --request POST -o "$chat_file" -w '%{http_code}' \
    -H 'Content-Type: application/json' \
    --data '{"message":"Reply with READY.","history":[],"page":"oneworldz-perfect-preflight"}' \
    "https://$PROTECTED_DOMAIN/api/oneworldz-gpt/chat" || true)"
  [ "$chat_code" = 200 ] || return 1
  CHAT="$chat_file" node - <<'NODE'
const fs = require('fs');
let p;
try { p = JSON.parse(fs.readFileSync(process.env.CHAT, 'utf8')); } catch { process.exit(1); }
if (p.ok !== true || p.service !== 'OneWorldz GPT' || p.powered_by !== 'OpenAI' || !String(p.text || '').trim()) process.exit(1);
NODE
}

if live_contract; then
  echo 'ONEWORLDZ_GPT_ALREADY_LIVE=PASS — protected Command Centre runtime left untouched.'
  exit 0
fi

echo 'ONEWORLDZ_GPT_PRECHECK=FAIL — repairing the existing protected GPT extension through the authenticated Hostinger rail.'
: "${PROTECTED_NODE_ROOT:?}"
: "${FTP_HOST:?}"
: "${FTP_USERNAME:?}"
: "${FTP_PASSWORD:?}"
: "${FTP_PORT:?}"
: "${HOSTINGER_API_TOKEN:?}"
: "${OPENAI_API_KEY:?}"

bash .github/full-current-oneworldz-gpt-extension.sh

if ! live_contract; then
  echo '::error::ONEWORLDZ_GPT_FINAL_CONTRACT=FAIL'
  exit 1
fi

echo 'ONEWORLDZ_GPT_FINAL_CONTRACT=PASS'
