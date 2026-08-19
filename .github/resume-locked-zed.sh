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

proof="$RUNNER_TEMP/zed-runtime-diagnostic"
rm -rf "$proof"; mkdir -p "$proof"

echo 'ZED_RUNTIME_DIAGNOSTIC=STARTED'
node --check src/full-runtime-entry.js

domain_enc="$(node -p 'encodeURIComponent(process.env.PROTECTED_DOMAIN)')"
curl --fail --silent --show-error --location \
  -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
  "https://developers.hostinger.com/api/hosting/v1/websites?domain=${domain_enc}&per_page=25" \
  -o "$proof/websites.json"
username="$(PROOF="$proof/websites.json" node - <<'NODE'
const fs=require('fs'); const p=JSON.parse(fs.readFileSync(process.env.PROOF,'utf8'));
const d=process.env.PROTECTED_DOMAIN.toLowerCase(); const row=(p.data||[]).find(x=>String(x.domain||'').toLowerCase()===d);
if(row?.username) process.stdout.write(String(row.username));
NODE
)"
test -n "$username"
echo "::add-mask::$username"
user_enc="$(HOSTINGER_USERNAME="$username" node -p 'encodeURIComponent(process.env.HOSTINGER_USERNAME)')"
node_base="https://developers.hostinger.com/api/hosting/v1/accounts/${user_enc}/websites/${domain_enc}/nodejs"
file_base="https://developers.hostinger.com/api/hosting/v1/accounts/${user_enc}/domains/${domain_enc}/files"
echo 'HOSTINGER_MANAGED_APP_RESOLVED=PASS'

# Capture public 503 bodies; these can reveal gateway state without changing production.
for item in root health status; do
  case "$item" in
    root) url="https://$PROTECTED_DOMAIN/" ;;
    health) url="https://$PROTECTED_DOMAIN/health" ;;
    status) url="https://$PROTECTED_DOMAIN/api/oneworldz-gpt/status" ;;
  esac
  code="$(curl --silent --show-error --location --connect-timeout 6 --max-time 10 -o "$proof/$item.body" -w '%{http_code}' "$url" || true)"
  echo "LIVE_${item^^}_HTTP=$code"
  sed -E 's/((TOKEN|PASSWORD|SECRET|API[_-]?KEY|SERVICE[_-]?ROLE[_-]?KEY)[[:space:]]*[=:][[:space:]]*)[^[:space:]<]+/\1[REDACTED]/Ig' "$proof/$item.body" | head -c 1600 || true
  echo
done

# Managed build log (useful when Hostinger reports runtime/bootstrap failures around restart).
if curl --fail --silent --show-error --location \
  -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
  "$node_base/builds?per_page=25" -o "$proof/builds.json"; then
  build_uuid="$(BUILDS="$proof/builds.json" node - <<'NODE'
const p=require(process.env.BUILDS); process.stdout.write(String((p.data||[])[0]?.uuid||''));
NODE
)"
  echo "HOSTINGER_LATEST_BUILD_UUID=$build_uuid"
  if [ -n "$build_uuid" ]; then
    curl --silent --show-error --location \
      -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
      "$node_base/builds/$build_uuid/logs?from_line=0" -o "$proof/build-log.json" || true
    LOGFILE="$proof/build-log.json" node - <<'NODE'
const fs=require('fs'); if(!fs.existsSync(process.env.LOGFILE)) process.exit(0);
let p; try{p=JSON.parse(fs.readFileSync(process.env.LOGFILE,'utf8'))}catch{process.exit(0)}
const strings=[]; const walk=x=>{if(typeof x==='string')strings.push(x);else if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object')Object.values(x).forEach(walk)}; walk(p);
const redact=s=>s.replace(/((?:TOKEN|PASSWORD|SECRET|API[_-]?KEY|SERVICE[_-]?ROLE[_-]?KEY)\s*[=:]\s*)\S+/ig,'$1[REDACTED]').replace(/(Bearer\s+)\S+/ig,'$1[REDACTED]');
console.log('HOSTINGER_BUILD_LOG_BEGIN'); for(const line of strings.join('\n').split(/\r?\n/).filter(Boolean).slice(-180)) console.log(redact(line)); console.log('HOSTINGER_BUILD_LOG_END');
NODE
  fi
fi

# Ask Hostinger's file API for runtime/log candidates.
list_code="$(curl --silent --show-error --location --connect-timeout 10 --max-time 30 \
  -o "$proof/files.json" -w '%{http_code}' \
  -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
  "$file_base?directory=&max_depth=4" || true)"
echo "HOSTINGER_RUNTIME_FILE_LIST_HTTP=$list_code"
if [ "$list_code" = 200 ]; then
  FILES="$proof/files.json" node - <<'NODE'
const fs=require('fs'); let p; try{p=JSON.parse(fs.readFileSync(process.env.FILES,'utf8'))}catch{process.exit(0)}
const names=[]; function walk(x){if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object'){if(typeof x.path==='string')names.push(x.path);if(typeof x.name==='string')names.push(x.name);Object.values(x).forEach(walk)}} walk(p);
console.log('HOSTINGER_RUNTIME_FILE_CANDIDATES_BEGIN'); for(const n of [...new Set(names)].filter(x=>/stderr|stdout|error|log|nodejs/i.test(x)).slice(0,160)) console.log(n); console.log('HOSTINGER_RUNTIME_FILE_CANDIDATES_END');
NODE
fi

for file in stderr.log stdout.log nodejs/stderr.log nodejs/stdout.log nodejs/logs/stderr.log nodejs/logs/stdout.log logs/stderr.log logs/stdout.log; do
  path_enc="$(FILE_PATH="$file" node -p 'encodeURIComponent(process.env.FILE_PATH)')"
  code="$(curl --silent --show-error --location --connect-timeout 8 --max-time 20 \
    -o "$proof/runtime-file.json" -w '%{http_code}' \
    -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
    "$file_base/content?path=${path_enc}&from_line=0" || true)"
  echo "HOSTINGER_RUNTIME_LOG_CANDIDATE path=$file http=$code"
  [ "$code" = 200 ] || continue
  RUNTIME_FILE="$proof/runtime-file.json" node - <<'NODE'
const fs=require('fs'); let p; try{p=JSON.parse(fs.readFileSync(process.env.RUNTIME_FILE,'utf8'))}catch{process.exit(0)}
const strings=[]; const walk=x=>{if(typeof x==='string')strings.push(x);else if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object')Object.values(x).forEach(walk)}; walk(p);
const redact=s=>s.replace(/((?:TOKEN|PASSWORD|SECRET|API[_-]?KEY|SERVICE[_-]?ROLE[_-]?KEY)\s*[=:]\s*)\S+/ig,'$1[REDACTED]').replace(/(Bearer\s+)\S+/ig,'$1[REDACTED]');
console.log('HOSTINGER_RUNTIME_STDERR_BEGIN'); for(const line of strings.join('\n').split(/\r?\n/).filter(Boolean).slice(-220)) console.log(redact(line)); console.log('HOSTINGER_RUNTIME_STDERR_END');
NODE
  break
done

# FTP directory listing is read-only and often exposes Hostinger's actual log filename.
raw_host="$(printf '%s' "$FTP_HOST" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's#^ftp://##' -e 's#^ftps://##' -e 's#/.*$##')"
if [[ "$raw_host" != *:*:* && "$raw_host" == *:* ]]; then raw_host="${raw_host%%:*}"; fi
curl --silent --show-error --ssl-reqd --ftp-ssl-control --connect-timeout 10 --max-time 30 \
  --user "$FTP_USERNAME:$FTP_PASSWORD" \
  "ftp://$raw_host:$FTP_PORT$PROTECTED_NODE_ROOT/" -o "$proof/ftp-node-list.txt" || true
echo 'FTPS_NODE_ROOT_LIST_BEGIN'
sed -n '1,160p' "$proof/ftp-node-list.txt" 2>/dev/null || true
echo 'FTPS_NODE_ROOT_LIST_END'

echo '::error::ZED_RUNTIME_DIAGNOSTIC=COMPLETE_REPLAN_FROM_STARTUP_RECORD'
exit 1
