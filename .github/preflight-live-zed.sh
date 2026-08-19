#!/usr/bin/env bash
set -euo pipefail

: "${PROTECTED_DOMAIN:?}"
: "${PROTECTED_NODE_ROOT:?}"
: "${FTP_HOST:?}"
: "${FTP_USERNAME:?}"
: "${FTP_PASSWORD:?}"
: "${FTP_PORT:?}"

for value in "$FTP_HOST" "$FTP_USERNAME" "$FTP_PASSWORD"; do echo "::add-mask::$value"; done

sudo apt-get update -qq
sudo apt-get install -y -qq lftp

raw_host="$(printf '%s' "$FTP_HOST" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's#^ftp://##' -e 's#^ftps://##' -e 's#/.*$##')"
if [[ "$raw_host" != *:*:* && "$raw_host" == *:* ]]; then raw_host="${raw_host%%:*}"; fi

proof="$RUNNER_TEMP/live-zed-preflight"
rm -rf "$proof"
mkdir -p "$proof"
cat > "$RUNNER_TEMP/live-zed-preflight.lftp" <<EOF
set cmd:fail-exit true
set net:max-retries 2
set net:timeout 25
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
timeout 180 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $RUNNER_TEMP/live-zed-preflight.lftp" "$raw_host"

cmp -s index.js "$proof/index.js"
cmp -s src/oneworldz-gpt/http.js "$proof/gpt-http.js"
cmp -s src/full-runtime-entry.js "$proof/full-runtime-entry.js"
cmp -s src/http.js "$proof/http.js"
cmp -s src/user-experience.js "$proof/user-experience.js"
cmp -s src/zed-guide.js "$proof/zed-guide.js"
cmp -s public/miniapp/index.html "$proof/miniapp-index.html"
cmp -s public/miniapp/experience.js "$proof/miniapp-experience.js"
echo 'LIVE_ZED_REMOTE_SOURCE_FINGERPRINT=PASS'

passed=0
for i in $(seq 1 6); do
  root_code="$(curl --silent --show-error --location --connect-timeout 12 --max-time 20 -o "$proof/root.json" -w '%{http_code}' "https://$PROTECTED_DOMAIN/?preflight=${GITHUB_RUN_ID}-${i}" || true)"
  health_code="$(curl --silent --show-error --location --connect-timeout 12 --max-time 20 -o "$proof/health.json" -w '%{http_code}' "https://$PROTECTED_DOMAIN/health?preflight=${GITHUB_RUN_ID}-${i}" || true)"
  mini_code="$(curl --silent --show-error --location --connect-timeout 12 --max-time 20 -o "$proof/miniapp.html" -w '%{http_code}' "https://$PROTECTED_DOMAIN/miniapp/?preflight=${GITHUB_RUN_ID}-${i}" || true)"
  status_code="$(curl --silent --show-error --location --connect-timeout 12 --max-time 20 -o "$proof/status.json" -w '%{http_code}' "https://$PROTECTED_DOMAIN/api/oneworldz-gpt/status?preflight=${GITHUB_RUN_ID}-${i}" || true)"
  if [ "$root_code" = 200 ] && [ "$health_code" = 200 ] && [ "$mini_code" = 200 ] && [ "$status_code" = 200 ] \
    && grep -Fq '"service":"CryptoWorldz Zed Bot"' "$proof/root.json" \
    && grep -Fq '"ok":true' "$proof/health.json" \
    && grep -Fq 'id="splashback"' "$proof/miniapp.html" \
    && grep -Fq 'id="zed-guide"' "$proof/miniapp.html" \
    && grep -Fq 'id="create"' "$proof/miniapp.html" \
    && grep -Fq 'id="heroes"' "$proof/miniapp.html" \
    && STATUS="$proof/status.json" node - <<'NODE'
const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.env.STATUS,'utf8'));
if(p.ok!==true||p.openai_api_configured!==true) process.exit(1);
if(p.guard_profile!=="oneworldz-public-low-cost-v1"||p.guard_enforced!==true) process.exit(1);
if(p.model!=="gpt-4o-mini"||p.max_output_tokens!==320) process.exit(1);
if(p.per_ip_limit_10m!==8||p.daily_request_limit!==1000) process.exit(1);
if(p.payments_in_chat!==false||p.secrets_in_browser!==false) process.exit(1);
NODE
  then
    passed=1
    break
  fi
  echo "LIVE_ZED_PREFLIGHT attempt=$i root=$root_code health=$health_code mini=$mini_code gpt=$status_code"
  sleep 3
done

test "$passed" = '1'
echo 'LIVE_ZED_EXISTING_PROCESS_FULL_RUNTIME=PASS'
bash .github/publish-progress.sh ZED_MINIAPP PASS
