#!/usr/bin/env bash
set -euo pipefail

: "${PROTECTED_DOMAIN:?}"
: "${PROTECTED_NODE_ROOT:?}"
: "${FTP_HOST:?}"
: "${FTP_USERNAME:?}"
: "${FTP_PASSWORD:?}"
: "${FTP_PORT:?}"
: "${HOSTINGER_API_TOKEN:?}"

for value in "$FTP_HOST" "$FTP_USERNAME" "$FTP_PASSWORD" "$HOSTINGER_API_TOKEN"; do [ -n "$value" ] && echo "::add-mask::$value"; done

proof="$RUNNER_TEMP/live-zed-preflight"
rm -rf "$proof"; mkdir -p "$proof"

probe() {
  local url="$1" out="$2" codefile="$3"
  local code
  code="$(curl --silent --show-error --location --connect-timeout 8 --max-time 12 -o "$out" -w '%{http_code}' "$url" || true)"
  printf '%s' "$code" > "$codefile"
}

resolve_hostinger_identity() {
  local domain_enc username user_enc
  domain_enc="$(node -p 'encodeURIComponent(process.env.PROTECTED_DOMAIN)')"
  if ! curl --fail --silent --show-error --location \
      -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
      "https://developers.hostinger.com/api/hosting/v1/websites?domain=${domain_enc}&per_page=25" \
      -o "$proof/websites.json"; then
    return 1
  fi
  username="$(node - <<'NODE'
const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.env.RUNNER_TEMP+'/live-zed-preflight/websites.json','utf8'));
const d=process.env.PROTECTED_DOMAIN.toLowerCase();
const row=(p.data||[]).find(x=>String(x.domain||'').toLowerCase()===d);
if(row?.username) process.stdout.write(String(row.username));
NODE
)"
  [ -n "$username" ] || return 1
  echo "::add-mask::$username"
  user_enc="$(HOSTINGER_USERNAME="$username" node -p 'encodeURIComponent(process.env.HOSTINGER_USERNAME)')"
  printf '%s' "$username" > "$proof/username"
  printf '%s' "$user_enc" > "$proof/user-enc"
  printf '%s' "$domain_enc" > "$proof/domain-enc"
}

publish_latest_hostinger_build_log() {
  local user_enc domain_enc build_uuid logs_url
  if ! resolve_hostinger_identity; then echo 'HOSTINGER_BUILD_LOG_PROBE=IDENTITY_FAILED'; return 0; fi
  user_enc="$(cat "$proof/user-enc")"; domain_enc="$(cat "$proof/domain-enc")"
  if ! curl --fail --silent --show-error --location \
      -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
      "https://developers.hostinger.com/api/hosting/v1/accounts/${user_enc}/websites/${domain_enc}/nodejs/builds?per_page=25" \
      -o "$proof/builds.json"; then
    echo 'HOSTINGER_BUILD_LOG_PROBE=BUILD_LIST_FAILED'; return 0
  fi
  build_uuid="$(node -e "const p=require(process.env.RUNNER_TEMP+'/live-zed-preflight/builds.json');process.stdout.write(String((p.data||[])[0]?.uuid||''))")"
  if [ -z "$build_uuid" ]; then echo 'HOSTINGER_BUILD_LOG_PROBE=NO_BUILD'; return 0; fi
  echo "HOSTINGER_BUILD_LOG_PROBE uuid=$build_uuid"
  logs_url="https://developers.hostinger.com/api/hosting/v1/accounts/${user_enc}/websites/${domain_enc}/nodejs/builds/${build_uuid}/logs?from_line=0"
  if ! curl --fail --silent --show-error --location \
      -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
      "$logs_url" -o "$proof/build-logs.json"; then
    echo 'HOSTINGER_BUILD_LOG_PROBE=LOG_FETCH_FAILED'; return 0
  fi
  LOGFILE="$proof/build-logs.json" node - <<'NODE'
const fs=require('fs');
let p;
try { p=JSON.parse(fs.readFileSync(process.env.LOGFILE,'utf8')); } catch { console.log('HOSTINGER_BUILD_LOG_PROBE=UNPARSEABLE'); process.exit(0); }
const strings=[]; const walk=x=>{ if(typeof x==='string') strings.push(x); else if(Array.isArray(x)) x.forEach(walk); else if(x&&typeof x==='object') Object.values(x).forEach(walk); }; walk(p);
const redact=s=>s.replace(/((?:TOKEN|PASSWORD|SECRET|API[_-]?KEY|SERVICE[_-]?ROLE[_-]?KEY)\s*[=:]\s*)\S+/ig,'$1[REDACTED]').replace(/(Bearer\s+)\S+/ig,'$1[REDACTED]');
console.log('HOSTINGER_BUILD_LOG_BEGIN'); for(const line of strings.join('\n').split(/\r?\n/).filter(Boolean).slice(-140)) console.log(redact(line)); console.log('HOSTINGER_BUILD_LOG_END');
NODE
}

publish_hostinger_runtime_stderr() {
  local user_enc domain_enc base path_enc code file
  if ! resolve_hostinger_identity; then echo 'HOSTINGER_RUNTIME_LOG_PROBE=IDENTITY_FAILED'; return 0; fi
  user_enc="$(cat "$proof/user-enc")"; domain_enc="$(cat "$proof/domain-enc")"
  base="https://developers.hostinger.com/api/hosting/v1/accounts/${user_enc}/domains/${domain_enc}/files"
  code="$(curl --silent --show-error --location --connect-timeout 10 --max-time 30 -o "$proof/files.json" -w '%{http_code}' -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' "$base?directory=&max_depth=2" || true)"
  echo "HOSTINGER_RUNTIME_FILE_LIST_HTTP=$code"
  if [ "$code" = 200 ]; then
    FILES="$proof/files.json" node - <<'NODE'
const fs=require('fs'); let p; try{p=JSON.parse(fs.readFileSync(process.env.FILES,'utf8'))}catch{process.exit(0)}
const names=[]; function walk(x){if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object'){if(typeof x.path==='string')names.push(x.path);else if(typeof x.name==='string')names.push(x.name);Object.values(x).forEach(walk)}} walk(p);
console.log('HOSTINGER_RUNTIME_FILE_NAMES='+[...new Set(names)].filter(x=>/stderr|stdout|log|nodejs|index\.js/i.test(x)).slice(0,80).join(','));
NODE
  fi
  for file in stderr.log nodejs/stderr.log logs/stderr.log; do
    path_enc="$(FILE_PATH="$file" node -p 'encodeURIComponent(process.env.FILE_PATH)')"
    code="$(curl --silent --show-error --location --connect-timeout 10 --max-time 30 -o "$proof/runtime-file.json" -w '%{http_code}' -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' "$base/content?path=${path_enc}&from_line=0" || true)"
    echo "HOSTINGER_RUNTIME_LOG_CANDIDATE path=$file http=$code"
    [ "$code" = 200 ] || continue
    RUNTIME_FILE="$proof/runtime-file.json" node - <<'NODE'
const fs=require('fs'); let p; try{p=JSON.parse(fs.readFileSync(process.env.RUNTIME_FILE,'utf8'))}catch{process.exit(0)}
const strings=[]; const walk=x=>{if(typeof x==='string')strings.push(x);else if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object')Object.values(x).forEach(walk)}; walk(p);
const redact=s=>s.replace(/((?:TOKEN|PASSWORD|SECRET|API[_-]?KEY|SERVICE[_-]?ROLE[_-]?KEY)\s*[=:]\s*)\S+/ig,'$1[REDACTED]').replace(/(Bearer\s+)\S+/ig,'$1[REDACTED]');
console.log('HOSTINGER_RUNTIME_STDERR_BEGIN'); for(const line of strings.join('\n').split(/\r?\n/).filter(Boolean).slice(-180)) console.log(redact(line)); console.log('HOSTINGER_RUNTIME_STDERR_END');
NODE
    return 0
  done
  echo 'HOSTINGER_RUNTIME_STDERR=NOT_FOUND_VIA_FILE_API'
}

local_fallback_smoke() {
  echo 'LOCAL_ZED_FALLBACK_SMOKE=STARTED'
  npm ci --ignore-scripts >/dev/null
  local log="$proof/local-zed.log" pid='' ok=0
  PORT=3999 BOT_TOKEN='' TELEGRAM_TOKEN='' SUPABASE_URL='' SUPABASE_SERVICE_ROLE_KEY='' SUPABASE_ANON_KEY='' npm start >"$log" 2>&1 & pid=$!
  for i in $(seq 1 20); do
    if ! kill -0 "$pid" >/dev/null 2>&1; then break; fi
    code="$(curl --silent --show-error --connect-timeout 2 --max-time 3 -o "$proof/local-root.json" -w '%{http_code}' 'http://127.0.0.1:3999/' || true)"
    if [ "$code" = 200 ] && grep -Fq '"service":"CryptoWorldz Protected Public Gateway"' "$proof/local-root.json"; then ok=1; break; fi
    sleep 0.5
  done
  echo 'LOCAL_ZED_FALLBACK_LOG_BEGIN'; sed -E 's/((TOKEN|PASSWORD|SECRET|API[_-]?KEY|SERVICE[_-]?ROLE[_-]?KEY)[[:space:]]*[=:][[:space:]]*)[^[:space:]]+/\1[REDACTED]/Ig' "$log" | tail -120; echo 'LOCAL_ZED_FALLBACK_LOG_END'
  if [ "$ok" = 1 ]; then echo 'LOCAL_ZED_FALLBACK_SMOKE=PASS'; else echo 'LOCAL_ZED_FALLBACK_SMOKE=FAIL'; fi
  kill "$pid" >/dev/null 2>&1 || true; wait "$pid" >/dev/null 2>&1 || true
}

probe "https://$PROTECTED_DOMAIN/?preflight=$GITHUB_RUN_ID" "$proof/root.json" "$proof/root.code" & p1=$!
probe "https://$PROTECTED_DOMAIN/health?preflight=$GITHUB_RUN_ID" "$proof/health.json" "$proof/health.code" & p2=$!
probe "https://$PROTECTED_DOMAIN/miniapp/?preflight=$GITHUB_RUN_ID" "$proof/miniapp.html" "$proof/mini.code" & p3=$!
probe "https://$PROTECTED_DOMAIN/api/oneworldz-gpt/status?preflight=$GITHUB_RUN_ID" "$proof/status.json" "$proof/status.code" & p4=$!
wait "$p1" "$p2" "$p3" "$p4" || true
root_code="$(cat "$proof/root.code" 2>/dev/null || echo 000)"; health_code="$(cat "$proof/health.code" 2>/dev/null || echo 000)"; mini_code="$(cat "$proof/mini.code" 2>/dev/null || echo 000)"; status_code="$(cat "$proof/status.code" 2>/dev/null || echo 000)"

if ! (
  [ "$root_code" = 200 ] && [ "$health_code" = 200 ] && [ "$mini_code" = 200 ] && [ "$status_code" = 200 ] \
  && grep -Fq '"service":"CryptoWorldz Zed Bot"' "$proof/root.json" \
  && grep -Fq '"ok":true' "$proof/health.json" \
  && grep -Fq 'id="splashback"' "$proof/miniapp.html" \
  && grep -Fq 'id="zed-guide"' "$proof/miniapp.html" \
  && grep -Fq 'id="create"' "$proof/miniapp.html" \
  && grep -Fq 'id="heroes"' "$proof/miniapp.html" \
  && STATUS="$proof/status.json" node - <<'NODE'
const fs=require('fs'); const p=JSON.parse(fs.readFileSync(process.env.STATUS,'utf8'));
if(p.ok!==true||p.openai_api_configured!==true) process.exit(1); if(p.guard_profile!=="oneworldz-public-low-cost-v1"||p.guard_enforced!==true) process.exit(1); if(p.model!=="gpt-4o-mini"||p.max_output_tokens!==320) process.exit(1); if(p.per_ip_limit_10m!==8||p.daily_request_limit!==1000) process.exit(1); if(p.payments_in_chat!==false||p.secrets_in_browser!==false) process.exit(1);
NODE
); then
  echo "LIVE_ZED_PREFLIGHT=DEGRADED root=$root_code health=$health_code mini=$mini_code gpt=$status_code"
  publish_latest_hostinger_build_log
  publish_hostinger_runtime_stderr
  local_fallback_smoke
  exit 1
fi

echo 'LIVE_ZED_EXISTING_PROCESS_HTTP=PASS'

sudo apt-get update -qq
sudo apt-get install -y -qq lftp
raw_host="$(printf '%s' "$FTP_HOST" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's#^ftp://##' -e 's#^ftps://##' -e 's#/.*$##')"; if [[ "$raw_host" != *:*:* && "$raw_host" == *:* ]]; then raw_host="${raw_host%%:*}"; fi
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
cmp -s index.js "$proof/index.js"; cmp -s src/oneworldz-gpt/http.js "$proof/gpt-http.js"; cmp -s src/full-runtime-entry.js "$proof/full-runtime-entry.js"; cmp -s src/http.js "$proof/http.js"; cmp -s src/user-experience.js "$proof/user-experience.js"; cmp -s src/zed-guide.js "$proof/zed-guide.js"; cmp -s public/miniapp/index.html "$proof/miniapp-index.html"; cmp -s public/miniapp/experience.js "$proof/miniapp-experience.js"
echo 'LIVE_ZED_REMOTE_SOURCE_FINGERPRINT=PASS'; echo 'LIVE_ZED_EXISTING_PROCESS_FULL_RUNTIME=PASS'; bash .github/publish-progress.sh ZED_MINIAPP PASS
