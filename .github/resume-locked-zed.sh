#!/usr/bin/env bash
set -Eeuo pipefail

: "${PROTECTED_DOMAIN:?}"
: "${PROTECTED_NODE_ROOT:?}"
: "${FTP_HOST:?}"
: "${FTP_USERNAME:?}"
: "${FTP_PASSWORD:?}"
: "${FTP_PORT:?}"
: "${HOSTINGER_API_TOKEN:?}"

for value in "$FTP_HOST" "$FTP_USERNAME" "$FTP_PASSWORD" "$HOSTINGER_API_TOKEN"; do
  [ -n "$value" ] && echo "::add-mask::$value"
done

stage="LOCAL_SOURCE_PROOF"
fail() { echo "::error::ZED_RUNTIME_FAILURE_STAGE=$stage $*"; exit 1; }

node --check src/full-runtime-entry.js
grep -Fq 'registerGraceTelegramHandlers({ bot, repository, graceRepository, config });' src/full-runtime-entry.js
grep -Fq 'registerGraceBuild2Handlers({ bot, repository, graceRepository, supabase, config });' src/full-runtime-entry.js
grep -Fq 'registerGraceXOAuthTelegramHandlers({ bot, graceOAuth, config });' src/full-runtime-entry.js
grep -Fq 'registerGraceFacebookOAuthTelegramHandlers({ bot, facebookOAuth: graceFacebookOAuth, config });' src/full-runtime-entry.js
grep -Fq 'registerAutoMiniRoutes({ app, config, autoClient, supabase });' src/full-runtime-entry.js
grep -Fq 'registerGraceRoutes({ app, graceRepository, graceOAuth, graceFacebookOAuth' src/full-runtime-entry.js
grep -Fq 'registerCommunityDirectoryHandlers({ bot, supabase, config });' src/full-runtime-entry.js
echo 'ZED_RUNTIME_WIRING_SOURCE=PASS'

stage="INSTALL_FTPS_CLIENT"
sudo apt-get update -qq
sudo apt-get install -y -qq lftp
command -v lftp >/dev/null || fail 'lftp unavailable'

raw_host="$(printf '%s' "$FTP_HOST" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's#^ftp://##' -e 's#^ftps://##' -e 's#/.*$##')"
if [[ "$raw_host" != *:*:* && "$raw_host" == *:* ]]; then raw_host="${raw_host%%:*}"; fi
proof="$RUNNER_TEMP/zed-ftps-repair"
rm -rf "$proof"; mkdir -p "$proof"

stage="FTPS_EXACT_RUNTIME_WRITE"
cat > "$RUNNER_TEMP/zed-runtime-write.lftp" <<EOF
set cmd:fail-exit true
set net:max-retries 2
set net:timeout 30
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate true
set ssl:check-hostname false
cd "$PROTECTED_NODE_ROOT/src"
get "full-runtime-entry.js" -o "$proof/full-runtime-entry.before.js"
lcd "$GITHUB_WORKSPACE/src"
put "full-runtime-entry.js" -o "full-runtime-entry.js.oneworldz-new"
mv "full-runtime-entry.js.oneworldz-new" "full-runtime-entry.js"
get "full-runtime-entry.js" -o "$proof/full-runtime-entry.after.js"
bye
EOF
timeout 180 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $RUNNER_TEMP/zed-runtime-write.lftp" "$raw_host" || fail 'authenticated FTPS write failed'
cmp -s src/full-runtime-entry.js "$proof/full-runtime-entry.after.js" || fail 'remote runtime bytes do not match repaired source'
echo 'ZED_RUNTIME_FTPS_EXACT_BYTES=PASS'

stage="HOSTINGER_IDENTITY"
domain_enc="$(node -p 'encodeURIComponent(process.env.PROTECTED_DOMAIN)')"
curl --fail --silent --show-error --location \
  -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
  "https://developers.hostinger.com/api/hosting/v1/websites?domain=${domain_enc}&per_page=25" \
  -o "$proof/websites.json" || fail 'Hostinger website identity lookup failed'
username="$(PROOF="$proof/websites.json" node - <<'NODE'
const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.env.PROOF,'utf8'));
const d=process.env.PROTECTED_DOMAIN.toLowerCase();
const row=(p.data||[]).find(x=>String(x.domain||'').toLowerCase()===d);
if(row?.username) process.stdout.write(String(row.username));
NODE
)"
[ -n "$username" ] || fail 'Hostinger managed username not resolved'
echo "::add-mask::$username"
user_enc="$(HOSTINGER_USERNAME="$username" node -p 'encodeURIComponent(process.env.HOSTINGER_USERNAME)')"
base="https://developers.hostinger.com/api/hosting/v1/accounts/${user_enc}/websites/${domain_enc}/nodejs"
echo 'HOSTINGER_MANAGED_APP_RESOLVED=PASS'

stage="MANAGED_RESTART"
restart_code="$(curl --silent --show-error --location --connect-timeout 15 --max-time 60 --request POST \
  -o "$proof/restart.json" -w '%{http_code}' \
  -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
  "$base/server/restart" || true)"
case "$restart_code" in
  200|201|202|204) echo "HOSTINGER_MANAGED_RESTART=PASS HTTP=$restart_code" ;;
  *) cat "$proof/restart.json" 2>/dev/null || true; fail "Hostinger managed restart rejected HTTP=$restart_code" ;;
esac

probe_one() {
  local url="$1" out="$2" codefile="$3" code
  code="$(curl --silent --show-error --location --connect-timeout 8 --max-time 12 -o "$out" -w '%{http_code}' "$url" || true)"
  printf '%s' "$code" > "$codefile"
}
full_pass() {
  local root_code health_code mini_code status_code
  root_code="$(cat "$proof/root.code" 2>/dev/null || echo 000)"
  health_code="$(cat "$proof/health.code" 2>/dev/null || echo 000)"
  mini_code="$(cat "$proof/mini.code" 2>/dev/null || echo 000)"
  status_code="$(cat "$proof/status.code" 2>/dev/null || echo 000)"
  [ "$root_code" = 200 ] && [ "$health_code" = 200 ] && [ "$mini_code" = 200 ] && [ "$status_code" = 200 ] \
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
}

stage="LIVE_CONVERGENCE"
for attempt in $(seq 1 50); do
  tag="ftps_repair=${GITHUB_SHA}-${GITHUB_RUN_ID}-${attempt}"
  probe_one "https://$PROTECTED_DOMAIN/?$tag" "$proof/root.json" "$proof/root.code" & p1=$!
  probe_one "https://$PROTECTED_DOMAIN/health?$tag" "$proof/health.json" "$proof/health.code" & p2=$!
  probe_one "https://$PROTECTED_DOMAIN/miniapp/?$tag" "$proof/miniapp.html" "$proof/mini.code" & p3=$!
  probe_one "https://$PROTECTED_DOMAIN/api/oneworldz-gpt/status?$tag" "$proof/status.json" "$proof/status.code" & p4=$!
  wait "$p1" "$p2" "$p3" "$p4" || true
  if full_pass; then
    echo "PROTECTED_FULL_ZED_MINIAPP_GPT_PRODUCTION=PASS ftps_exact_runtime=YES"
    bash .github/publish-progress.sh ZED_MINIAPP PASS
    exit 0
  fi
  echo "ZED_CONVERGENCE attempt=$attempt root=$(cat "$proof/root.code") health=$(cat "$proof/health.code") mini=$(cat "$proof/mini.code") gpt=$(cat "$proof/status.code")"
  sleep 4
done

fail 'ZED/MiniApp/GPT did not converge after exact FTPS runtime repair and managed restart'
