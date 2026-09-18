#!/usr/bin/env bash
set -Eeuo pipefail

: "${PROTECTED_DOMAIN:?}"
: "${PROTECTED_NODE_ROOT:?}"
: "${FTP_HOST:?}"
: "${FTP_USERNAME:?}"
: "${FTP_PASSWORD:?}"
: "${FTP_PORT:?}"

for value in "$FTP_HOST" "$FTP_USERNAME" "$FTP_PASSWORD"; do [ -n "$value" ] && echo "::add-mask::$value"; done

proof="$RUNNER_TEMP/live-zed-preflight"
rm -rf "$proof"; mkdir -p "$proof"

probe() {
  local url="$1" out="$2" codefile="$3" code
  code="$(curl --silent --show-error --location --connect-timeout 5 --max-time 8 -o "$out" -w '%{http_code}' "$url" || true)"
  printf '%s' "$code" > "$codefile"
}

probe "https://$PROTECTED_DOMAIN/?preflight=$GITHUB_RUN_ID" "$proof/root.json" "$proof/root.code" & p1=$!
probe "https://$PROTECTED_DOMAIN/health?preflight=$GITHUB_RUN_ID" "$proof/health.json" "$proof/health.code" & p2=$!
probe "https://$PROTECTED_DOMAIN/miniapp/?preflight=$GITHUB_RUN_ID" "$proof/miniapp.html" "$proof/mini.code" & p3=$!
probe "https://$PROTECTED_DOMAIN/api/oneworldz-gpt/status?preflight=$GITHUB_RUN_ID" "$proof/status.json" "$proof/status.code" & p4=$!
wait "$p1" "$p2" "$p3" "$p4" || true
root_code="$(cat "$proof/root.code" 2>/dev/null || echo 000)"
health_code="$(cat "$proof/health.code" 2>/dev/null || echo 000)"
mini_code="$(cat "$proof/mini.code" 2>/dev/null || echo 000)"
status_code="$(cat "$proof/status.code" 2>/dev/null || echo 000)"

full_http=0
if [ "$root_code" = 200 ] && [ "$health_code" = 200 ] && [ "$mini_code" = 200 ] && [ "$status_code" = 200 ] \
  && grep -Fq '"service":"CryptoWorldz Zed Bot"' "$proof/root.json" \
  && grep -Fq '"ok":true' "$proof/health.json" \
  && grep -Fq 'id="splashback"' "$proof/miniapp.html" \
  && grep -Fq 'id="zed-guide"' "$proof/miniapp.html" \
  && grep -Fq 'id="create"' "$proof/miniapp.html" \
  && grep -Fq 'id="heroes"' "$proof/miniapp.html" \
  && STATUS="$proof/status.json" node - <<'NODE'
const fs=require('fs'); const p=JSON.parse(fs.readFileSync(process.env.STATUS,'utf8'));
if(p.ok!==true||p.openai_api_configured!==true) process.exit(1);
if(p.guard_profile!=="oneworldz-public-low-cost-v1"||p.guard_enforced!==true) process.exit(1);
if(p.model!=="gpt-4o-mini"||p.max_output_tokens!==320) process.exit(1);
if(p.per_ip_limit_10m!==8||p.daily_request_limit!==1000) process.exit(1);
if(p.payments_in_chat!==false||p.secrets_in_browser!==false) process.exit(1);
NODE
then
  full_http=1
fi

if [ "$full_http" != 1 ]; then
  echo "LIVE_ZED_PREFLIGHT=DEGRADED root=$root_code health=$health_code mini=$mini_code gpt=$status_code"
  exit 1
fi

echo 'LIVE_ZED_EXISTING_PROCESS_HTTP=PASS'

# A live process is accepted only when the protected runtime source also matches.
sudo apt-get update -qq
sudo apt-get install -y -qq lftp
raw_host="$(printf '%s' "$FTP_HOST" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's#^ftp://##' -e 's#^ftps://##' -e 's#/.*$##')"
if [[ "$raw_host" != *:*:* && "$raw_host" == *:* ]]; then raw_host="${raw_host%%:*}"; fi
cat > "$RUNNER_TEMP/live-zed-preflight.lftp" <<EOF
set cmd:fail-exit true
set net:max-retries 1
set net:timeout 15
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate true
set ssl:check-hostname false
get $PROTECTED_NODE_ROOT/index.js -o $proof/index.js
get $PROTECTED_NODE_ROOT/src/oneworldz-gpt/http.js -o $proof/gpt-http.js
get $PROTECTED_NODE_ROOT/src/full-runtime-entry.js -o $proof/full-runtime-entry.js
get $PROTECTED_NODE_ROOT/src/http.js -o $proof/http.js
get $PROTECTED_NODE_ROOT/src/user-experience.js -o $proof/user-experience.js
get $PROTECTED_NODE_ROOT/src/zed-guide.js -o $proof/zed-guide.js
get $PROTECTED_NODE_ROOT/public/miniapp/index.html -o $proof/miniapp-index.html
get $PROTECTED_NODE_ROOT/public/miniapp/experience.js -o $proof/miniapp-experience.js
bye
EOF
timeout 90 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $RUNNER_TEMP/live-zed-preflight.lftp" "$raw_host"
cmp -s index.js "$proof/index.js"
cmp -s src/oneworldz-gpt/http.js "$proof/gpt-http.js"
cmp -s src/full-runtime-entry.js "$proof/full-runtime-entry.js"
cmp -s src/http.js "$proof/http.js"
cmp -s src/user-experience.js "$proof/user-experience.js"
cmp -s src/zed-guide.js "$proof/zed-guide.js"
cmp -s public/miniapp/index.html "$proof/miniapp-index.html"
cmp -s public/miniapp/experience.js "$proof/miniapp-experience.js"
echo 'LIVE_ZED_REMOTE_SOURCE_FINGERPRINT=PASS'
echo 'LIVE_ZED_EXISTING_PROCESS_FULL_RUNTIME=PASS'
bash .github/publish-progress.sh ZED_MINIAPP PASS
