#!/usr/bin/env bash
set -euo pipefail

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

npm ci
node --test test/oneworldz-gpt.test.js test/hub-central-live-v1.test.js
node --check index.js
node --check src/full-runtime-entry.js
node --check src/http.js
node --check src/user-experience.js
node --check src/zed-guide.js
grep -Fq 'startProtectedPublicFallback' index.js
grep -Fq 'require("./src/full-runtime-entry")' index.js
grep -Fq 'oneworldz-public-low-cost-v1' src/oneworldz-gpt/http.js
grep -Fq 'app.use("/miniapp"' src/http.js
grep -Fq 'service: "CryptoWorldz Zed Bot"' src/http.js
echo 'PROTECTED_FULL_RUNTIME_SOURCE=PASS'

probe_one(){ local u="$1" o="$2" c="$3"; local x; x="$(curl --silent --show-error --location --connect-timeout 8 --max-time 12 -o "$o" -w '%{http_code}' "$u" || true)"; printf '%s' "$x" > "$c"; }
probe_live(){
  local tag="$1"
  probe_one "https://$PROTECTED_DOMAIN/?$tag" "$RUNNER_TEMP/root.json" "$RUNNER_TEMP/root.code" & p1=$!
  probe_one "https://$PROTECTED_DOMAIN/health?$tag" "$RUNNER_TEMP/health.json" "$RUNNER_TEMP/health.code" & p2=$!
  probe_one "https://$PROTECTED_DOMAIN/miniapp/?$tag" "$RUNNER_TEMP/miniapp.html" "$RUNNER_TEMP/miniapp.code" & p3=$!
  probe_one "https://$PROTECTED_DOMAIN/api/oneworldz-gpt/status?$tag" "$RUNNER_TEMP/status.json" "$RUNNER_TEMP/status.code" & p4=$!
  wait "$p1" "$p2" "$p3" "$p4" || true
  ROOT_CODE="$(cat "$RUNNER_TEMP/root.code" 2>/dev/null || echo 000)"
  HEALTH_CODE="$(cat "$RUNNER_TEMP/health.code" 2>/dev/null || echo 000)"
  MINI_CODE="$(cat "$RUNNER_TEMP/miniapp.code" 2>/dev/null || echo 000)"
  STATUS_CODE="$(cat "$RUNNER_TEMP/status.code" 2>/dev/null || echo 000)"
}
live_full_pass(){
  [ "$ROOT_CODE" = 200 ] && [ "$HEALTH_CODE" = 200 ] && [ "$MINI_CODE" = 200 ] && [ "$STATUS_CODE" = 200 ] \
  && grep -Fq '"service":"CryptoWorldz Zed Bot"' "$RUNNER_TEMP/root.json" \
  && grep -Fq '"ok":true' "$RUNNER_TEMP/health.json" \
  && grep -Fq 'id="splashback"' "$RUNNER_TEMP/miniapp.html" \
  && grep -Fq 'id="zed-guide"' "$RUNNER_TEMP/miniapp.html" \
  && grep -Fq 'id="create"' "$RUNNER_TEMP/miniapp.html" \
  && grep -Fq 'id="heroes"' "$RUNNER_TEMP/miniapp.html" \
  && STATUS="$RUNNER_TEMP/status.json" node - <<'NODE'
const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.env.STATUS,'utf8'));
if(p.ok!==true||p.openai_api_configured!==true)process.exit(1);
if(p.guard_profile!=="oneworldz-public-low-cost-v1"||p.guard_enforced!==true)process.exit(1);
if(p.model!=="gpt-4o-mini"||p.max_output_tokens!==320)process.exit(1);
if(p.per_ip_limit_10m!==8||p.daily_request_limit!==1000)process.exit(1);
if(p.payments_in_chat!==false||p.secrets_in_browser!==false)process.exit(1);
NODE
}

probe_live "managed_env_probe=${GITHUB_RUN_ID}"
current_full=0; if live_full_pass; then current_full=1; fi
if [ "$current_full" = 1 ]; then echo 'CURRENT_HOSTINGER_MANAGED_ZED_RUNTIME=PASS'; else echo "CURRENT_HOSTINGER_MANAGED_ZED_RUNTIME=DEGRADED root=$ROOT_CODE health=$HEALTH_CODE mini=$MINI_CODE gpt=$STATUS_CODE"; fi

domain_enc="$(node -p 'encodeURIComponent(process.env.PROTECTED_DOMAIN)')"
curl --fail --silent --show-error --location -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' "https://developers.hostinger.com/api/hosting/v1/websites?domain=${domain_enc}&per_page=25" -o "$RUNNER_TEMP/websites.json"
username="$(node - <<'NODE'
const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.env.RUNNER_TEMP+'/websites.json','utf8'));const d=process.env.PROTECTED_DOMAIN.toLowerCase();const r=(p.data||[]).find(x=>String(x.domain||'').toLowerCase()===d);if(!r?.username)process.exit(2);process.stdout.write(String(r.username));
NODE
)"
test -n "$username"; echo "::add-mask::$username"
user_enc="$(HOSTINGER_USERNAME="$username" node -p 'encodeURIComponent(process.env.HOSTINGER_USERNAME)')"
base="https://developers.hostinger.com/api/hosting/v1/accounts/${user_enc}/websites/${domain_enc}/nodejs"
echo 'HOSTINGER_MANAGED_APP_RESOLVED=PASS'

curl --fail --silent --show-error --location -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' "$base/builds?per_page=25" -o "$RUNNER_TEMP/builds.json"
active="$(node -e "const p=require(process.env.RUNNER_TEMP+'/builds.json');process.stdout.write(String((p.data||[]).filter(x=>!['completed','failed'].includes(String(x.state||'').toLowerCase())).length))")"
for attempt in $(seq 1 90); do [ "$active" = 0 ] && break; sleep 5; curl --fail --silent --show-error --location -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' "$base/builds?per_page=25" -o "$RUNNER_TEMP/builds.json"; active="$(node -e "const p=require(process.env.RUNNER_TEMP+'/builds.json');process.stdout.write(String((p.data||[]).filter(x=>!['completed','failed'].includes(String(x.state||'').toLowerCase())).length))")"; done
[ "$active" = 0 ]
pre_build_uuid="$(node -e "const p=require(process.env.RUNNER_TEMP+'/builds.json');process.stdout.write(String((p.data||[])[0]?.uuid||''))")"
archive_sha='EXISTING_LIVE_RUNTIME'; new_build_uuid="$pre_build_uuid"

if [ "$current_full" != 1 ]; then
  stage="$RUNNER_TEMP/zed-hostinger-source"; archive="$RUNNER_TEMP/cryptoworldz-zed-${GITHUB_RUN_ID}.tar.gz"; list="$RUNNER_TEMP/archive.list"
  rm -rf "$stage" "$archive" "$list"; mkdir -p "$stage/.github"
  find . -maxdepth 1 -type f -name '*.js' -exec cp '{}' "$stage/" \;
  cp package.json package-lock.json "$stage/"; cp -R src public .well-known "$stage/"; cp .github/install-ci-apt-wrapper.cjs "$stage/.github/"
  tar -czf "$archive" -C "$stage" .; test -s "$archive"; test "$(stat -c%s "$archive")" -lt 52428800
  tar -tzf "$archive" > "$list"; grep -Eq '^\./package\.json$|^package\.json$' "$list"; ! grep -Eq '(^|/)\.env($|\.)|(^|/)node_modules(/|$)|(^|/)dist(/|$)|(^|/)build(/|$)' "$list"
  archive_sha="$(sha256sum "$archive"|awk '{print $1}')"; echo "HOSTINGER_NODE_SOURCE_ARCHIVE=PASS sha256=$archive_sha"

  deploy_code="$(curl --silent --show-error --location --connect-timeout 20 --max-time 180 --request POST -o "$RUNNER_TEMP/node-build-response.json" -w '%{http_code}' \
    -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
    -F "archive=@${archive};type=application/gzip" \
    -F 'node_version=22' -F 'app_type=express' -F 'entry_file=index.js' -F 'package_manager=npm' \
    "$base/builds/from-archive")"
  case "$deploy_code" in 200|201|202) ;; *) cat "$RUNNER_TEMP/node-build-response.json" 2>/dev/null || true; echo "::error::Hostinger multipart archive deployment rejected HTTP=$deploy_code"; exit 1;; esac
  new_build_uuid="$(node -e "const p=require(process.env.RUNNER_TEMP+'/node-build-response.json');process.stdout.write(String(p.uuid||p.data?.uuid||''))")"; test -n "$new_build_uuid"
  echo "HOSTINGER_NODE_ARCHIVE_API=ACCEPTED HTTP=$deploy_code uuid=$new_build_uuid"

  ok=0
  for attempt in $(seq 1 120); do
    sleep 5
    curl --fail --silent --show-error --location -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' "$base/builds?per_page=25" -o "$RUNNER_TEMP/builds-after.json"
    state="$(BUILD_UUID="$new_build_uuid" node - <<'NODE'
const p=require(process.env.RUNNER_TEMP+'/builds-after.json');const r=(p.data||[]).find(x=>String(x.uuid||'')===process.env.BUILD_UUID);process.stdout.write(String(r?.state||''));
NODE
)"
    echo "HOSTINGER_NEW_BUILD attempt=$attempt uuid=$new_build_uuid state=$state"
    case "${state,,}" in completed) ok=1; break;; failed) curl --silent --show-error --location -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' "$base/builds/$new_build_uuid/logs" -o "$RUNNER_TEMP/failed-build.json" || true; cat "$RUNNER_TEMP/failed-build.json" 2>/dev/null || true; exit 1;; esac
  done
  test "$ok" = 1; echo "HOSTINGER_NODE_DEPLOY_BUILD=PASS uuid=$new_build_uuid archive_sha256=$archive_sha"
fi

ftps_proof='UNAVAILABLE'
if command -v lftp >/dev/null 2>&1; then
  raw_host="$(printf '%s' "$FTP_HOST"|sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's#^ftp://##' -e 's#^ftps://##' -e 's#/.*$##')"; if [[ "$raw_host" != *:*:* && "$raw_host" == *:* ]]; then raw_host="${raw_host%%:*}"; fi
  proof="$RUNNER_TEMP/hostinger-ftps-proof"; rm -rf "$proof"; mkdir -p "$proof"
  cat > "$RUNNER_TEMP/get-proof.lftp" <<EOF
set cmd:fail-exit true
set net:max-retries 1
set net:timeout 15
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate true
set ssl:check-hostname false
get $PROTECTED_NODE_ROOT/index.js -o $proof/index.js
get $PROTECTED_NODE_ROOT/src/user-experience.js -o $proof/user-experience.js
get $PROTECTED_NODE_ROOT/public/miniapp/index.html -o $proof/miniapp-index.html
bye
EOF
  if timeout 75 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $RUNNER_TEMP/get-proof.lftp" "$raw_host"; then cmp -s index.js "$proof/index.js"; cmp -s src/user-experience.js "$proof/user-experience.js"; cmp -s public/miniapp/index.html "$proof/miniapp-index.html"; ftps_proof='PASS'; fi
fi
echo "PROTECTED_RUNTIME_FTPS_PROOF=$ftps_proof"

code="$(curl --silent --show-error --location --connect-timeout 15 --max-time 45 --request POST -o "$RUNNER_TEMP/restart.json" -w '%{http_code}' -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' "$base/server/restart")"
case "$code" in 200|201|202|204) echo "HOSTINGER_MANAGED_RESTART=PASS HTTP=$code";; *) cat "$RUNNER_TEMP/restart.json" 2>/dev/null || true; exit 1;; esac

for i in $(seq 1 40); do sleep 5; probe_live "proof=${GITHUB_SHA}-${GITHUB_RUN_ID}-${i}"; if live_full_pass; then echo "PROTECTED_FULL_ZED_MINIAPP_GPT_PRODUCTION=PASS build_uuid=$new_build_uuid archive_sha256=$archive_sha ftps=$ftps_proof"; bash .github/publish-progress.sh ZED_MINIAPP PASS; exit 0; fi; echo "ZED_CONVERGENCE $i/40 root=$ROOT_CODE health=$HEALTH_CODE mini=$MINI_CODE gpt=$STATUS_CODE"; done

echo '::error::ZED/MiniApp/GPT did not converge after authenticated Hostinger Node deployment/restart.'
exit 1
