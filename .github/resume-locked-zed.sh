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
  echo "::add-mask::$value"
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
grep -Fq 'require("./src/hub-central/preload")' index.js
grep -Fq 'oneworldz-public-low-cost-v1' src/oneworldz-gpt/http.js
grep -Fq 'app.use("/miniapp"' src/http.js
grep -Fq 'service: "CryptoWorldz Zed Bot"' src/http.js
grep -Fq 'model: "gpt-4o-mini"' src/hub-central/live-v1.js
grep -Fq '/api/mini/zed/chat' src/zed-guide.js
grep -Fq '/api/mini/creator/submit' src/user-experience.js
grep -Fq '/api/mini/heroes/apply' src/user-experience.js
echo 'PROTECTED_FULL_RUNTIME_SOURCE=PASS'

# Prefer a no-write proof when the current service is already healthy. If the
# current service is degraded, continue into exact source + Hostinger build
# recovery. Never upload or rewrite .env; Hostinger-managed process environment
# remains authoritative and the final live proof is mandatory before PASS.
current_full=0
for attempt in $(seq 1 6); do
  root_code="$(curl --silent --show-error --location --connect-timeout 12 --max-time 20 -o "$RUNNER_TEMP/current-root.json" -w '%{http_code}' "https://$PROTECTED_DOMAIN/?managed_env_probe=${GITHUB_RUN_ID}-${attempt}" || true)"
  health_code="$(curl --silent --show-error --location --connect-timeout 12 --max-time 20 -o "$RUNNER_TEMP/current-health.json" -w '%{http_code}' "https://$PROTECTED_DOMAIN/health?managed_env_probe=${GITHUB_RUN_ID}-${attempt}" || true)"
  mini_code="$(curl --silent --show-error --location --connect-timeout 12 --max-time 20 -o "$RUNNER_TEMP/current-miniapp.html" -w '%{http_code}' "https://$PROTECTED_DOMAIN/miniapp/?managed_env_probe=${GITHUB_RUN_ID}-${attempt}" || true)"
  status_code="$(curl --silent --show-error --location --connect-timeout 12 --max-time 20 -o "$RUNNER_TEMP/current-status.json" -w '%{http_code}' "https://$PROTECTED_DOMAIN/api/oneworldz-gpt/status?managed_env_probe=${GITHUB_RUN_ID}-${attempt}" || true)"
  if [ "$root_code" = 200 ] && [ "$health_code" = 200 ] && [ "$mini_code" = 200 ] && [ "$status_code" = 200 ] \
    && grep -Fq '"service":"CryptoWorldz Zed Bot"' "$RUNNER_TEMP/current-root.json" \
    && grep -Fq '"ok":true' "$RUNNER_TEMP/current-health.json" \
    && grep -Fq 'id="splashback"' "$RUNNER_TEMP/current-miniapp.html" \
    && grep -Fq '"ok":true' "$RUNNER_TEMP/current-status.json"; then
    current_full=1
    break
  fi
  echo "CURRENT_ZED_PROBE attempt=$attempt root=$root_code health=$health_code mini=$mini_code gpt=$status_code"
  sleep 5
done
if [ "$current_full" = 1 ]; then
  echo 'CURRENT_HOSTINGER_MANAGED_ZED_RUNTIME=PASS'
else
  echo 'CURRENT_HOSTINGER_MANAGED_ZED_RUNTIME=DEGRADED_BUILD_RECOVERY_REQUIRED'
fi

sudo apt-get update -qq
sudo apt-get install -y -qq lftp

domain_enc="$(node -p 'encodeURIComponent(process.env.PROTECTED_DOMAIN)')"
curl --fail --silent --show-error --location \
  -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
  "https://developers.hostinger.com/api/hosting/v1/websites?domain=${domain_enc}&per_page=25" \
  -o "$RUNNER_TEMP/websites.json"
username="$(node - <<'NODE'
const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.env.RUNNER_TEMP+'/websites.json','utf8'));
const d=process.env.PROTECTED_DOMAIN.toLowerCase();
const row=(p.data||[]).find(x=>String(x.domain||'').toLowerCase()===d);
if(!row?.username) process.exit(2);
process.stdout.write(String(row.username));
NODE
)"
test -n "$username"
echo "::add-mask::$username"
printf '%s' "$username" > "$RUNNER_TEMP/hostinger-username"
raw_host="$(printf '%s' "$FTP_HOST" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's#^ftp://##' -e 's#^ftps://##' -e 's#/.*$##')"
if [[ "$raw_host" != *:*:* && "$raw_host" == *:* ]]; then raw_host="${raw_host%%:*}"; fi
printf '%s' "$raw_host" > "$RUNNER_TEMP/raw-host"
echo 'HOSTINGER_MANAGED_APP_RESOLVED=PASS'

user_enc="$(HOSTINGER_USERNAME="$username" node -p 'encodeURIComponent(process.env.HOSTINGER_USERNAME)')"
base="https://developers.hostinger.com/api/hosting/v1/accounts/${user_enc}/websites/${domain_enc}/nodejs"
active=1
for attempt in $(seq 1 90); do
  curl --fail --silent --show-error --location \
    -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
    "$base/builds?per_page=25" -o "$RUNNER_TEMP/builds.json"
  active="$(node -e "const p=require(process.env.RUNNER_TEMP+'/builds.json');process.stdout.write(String((p.data||[]).filter(x=>!['completed','failed'].includes(String(x.state||'').toLowerCase())).length))")"
  latest="$(node -e "const p=require(process.env.RUNNER_TEMP+'/builds.json');const x=(p.data||[])[0]||{};process.stdout.write((x.uuid||'')+':'+(x.state||''))")"
  echo "HOSTINGER_BUILD_ACTIVITY attempt=$attempt active=$active latest=$latest"
  [ "$active" = 0 ] && break
  sleep 5
done
[ "$active" = 0 ]
pre_build_uuid="$(node -e "const p=require(process.env.RUNNER_TEMP+'/builds.json');process.stdout.write(String((p.data||[])[0]?.uuid||''))")"

# Restore the exact protected source over FTPS first. This does not mutate .env.
cat > "$RUNNER_TEMP/sync-runtime.lftp" <<EOF
set cmd:fail-exit false
set net:max-retries 2
set net:timeout 30
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate true
set ssl:check-hostname false
mkdir -p $PROTECTED_NODE_ROOT/src
mkdir -p $PROTECTED_NODE_ROOT/public
mkdir -p $PROTECTED_NODE_ROOT/.well-known
set cmd:fail-exit true
put index.js -o $PROTECTED_NODE_ROOT/index.js
put package.json -o $PROTECTED_NODE_ROOT/package.json
put package-lock.json -o $PROTECTED_NODE_ROOT/package-lock.json
mirror -R --verbose --delete --no-perms --exclude-glob .DS_Store src $PROTECTED_NODE_ROOT/src
mirror -R --verbose --delete --no-perms --exclude-glob .DS_Store public $PROTECTED_NODE_ROOT/public
mirror -R --verbose --delete --no-perms --exclude-glob .DS_Store .well-known $PROTECTED_NODE_ROOT/.well-known
bye
EOF
timeout 480 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $RUNNER_TEMP/sync-runtime.lftp" "$raw_host"

# A Hostinger restart alone restarts the last build artifact. When the live app
# is degraded, create a real Node deployment from the exact source archive so
# Hostinger performs dependency install/build and activates a new artifact.
if [ "$current_full" != 1 ]; then
  stage="$RUNNER_TEMP/zed-hostinger-source"
  archive="$RUNNER_TEMP/cryptoworldz-zed-${GITHUB_RUN_ID}.tar.gz"
  rm -rf "$stage" "$archive"
  mkdir -p "$stage/.github"
  find . -maxdepth 1 -type f -name '*.js' -exec cp '{}' "$stage/" \;
  cp package.json package-lock.json "$stage/"
  cp -R src public .well-known "$stage/"
  cp .github/install-ci-apt-wrapper.cjs "$stage/.github/"
  tar -czf "$archive" -C "$stage" .
  test -s "$archive"
  tar -tzf "$archive" | grep -Eq '^\./package\.json$|^package\.json$'
  tar -tzf "$archive" | grep -Eq '^\./src/user-experience\.js$|^src/user-experience\.js$'
  ! tar -tzf "$archive" | grep -Eq '(^|/)\.env($|\.)|(^|/)node_modules(/|$)'
  echo 'HOSTINGER_NODE_SOURCE_ARCHIVE=PASS'

  npm install --no-save --package-lock=false --ignore-scripts hostinger-api-mcp@1.42.0 @modelcontextprotocol/sdk@1.10.0
  HOSTINGER_DEPLOY_ARCHIVE="$archive" node --input-type=module <<'NODE'
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const env = Object.fromEntries(Object.entries(process.env).filter(([,v]) => typeof v === 'string'));
const transport = new StdioClientTransport({
  command: 'npx',
  args: ['--no-install', 'hostinger-hosting-mcp'],
  env
});
const client = new Client({ name: 'oneworldz-zed-recovery', version: '1.0.0' }, { capabilities: {} });
let result;
try {
  await client.connect(transport);
  result = await client.callTool({
    name: 'hosting_deployJsApplication',
    arguments: {
      domain: process.env.PROTECTED_DOMAIN,
      archivePath: process.env.HOSTINGER_DEPLOY_ARCHIVE,
      removeArchive: false
    }
  });
} finally {
  try { await client.close(); } catch {}
}
if (!result || result.isError) {
  console.error('HOSTINGER_NODE_DEPLOY_TOOL=ERROR');
  process.exit(2);
}
let payload = result.structuredContent || null;
if (!payload) {
  for (const item of result.content || []) {
    if (item?.type !== 'text' || !item.text) continue;
    try { payload = JSON.parse(item.text); break; } catch {}
  }
}
const upload = payload?.upload?.status || 'accepted';
const settings = payload?.resolveSettings?.status || 'accepted';
const build = payload?.build?.status || 'accepted';
console.log(`HOSTINGER_NODE_DEPLOY_TOOL upload=${upload} settings=${settings} build=${build}`);
if ([upload, settings, build].includes('error')) process.exit(3);
NODE

  new_build_ok=0
  new_build_seen=0
  for attempt in $(seq 1 120); do
    sleep 5
    curl --fail --silent --show-error --location \
      -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
      "$base/builds?per_page=25" -o "$RUNNER_TEMP/builds-after-deploy.json"
    latest_uuid="$(node -e "const p=require(process.env.RUNNER_TEMP+'/builds-after-deploy.json');process.stdout.write(String((p.data||[])[0]?.uuid||''))")"
    latest_state="$(node -e "const p=require(process.env.RUNNER_TEMP+'/builds-after-deploy.json');process.stdout.write(String((p.data||[])[0]?.state||''))")"
    echo "HOSTINGER_NEW_BUILD attempt=$attempt uuid=$latest_uuid state=$latest_state"
    if [ -n "$latest_uuid" ] && [ "$latest_uuid" != "$pre_build_uuid" ]; then
      new_build_seen=1
      case "${latest_state,,}" in
        completed) new_build_ok=1; break ;;
        failed) echo "::error::Hostinger Node deployment build failed uuid=$latest_uuid"; exit 1 ;;
      esac
    fi
  done
  test "$new_build_seen" = 1
  test "$new_build_ok" = 1
  echo 'HOSTINGER_NODE_DEPLOY_BUILD=PASS'
fi

# Prove the source on Hostinger exactly matches the approved repository files.
rm -f "$RUNNER_TEMP"/remote-*.js "$RUNNER_TEMP"/remote-miniapp-*.html
cat > "$RUNNER_TEMP/get-proof.lftp" <<EOF
set cmd:fail-exit true
set net:max-retries 2
set net:timeout 25
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate true
set ssl:check-hostname false
get $PROTECTED_NODE_ROOT/index.js -o $RUNNER_TEMP/remote-index.js
get $PROTECTED_NODE_ROOT/src/oneworldz-gpt/http.js -o $RUNNER_TEMP/remote-gpt-http.js
get $PROTECTED_NODE_ROOT/src/full-runtime-entry.js -o $RUNNER_TEMP/remote-full-runtime-entry.js
get $PROTECTED_NODE_ROOT/src/http.js -o $RUNNER_TEMP/remote-http.js
get $PROTECTED_NODE_ROOT/src/user-experience.js -o $RUNNER_TEMP/remote-user-experience.js
get $PROTECTED_NODE_ROOT/src/zed-guide.js -o $RUNNER_TEMP/remote-zed-guide.js
get $PROTECTED_NODE_ROOT/public/miniapp/index.html -o $RUNNER_TEMP/remote-miniapp-index.html
get $PROTECTED_NODE_ROOT/public/miniapp/experience.js -o $RUNNER_TEMP/remote-miniapp-experience.js
bye
EOF
timeout 180 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $RUNNER_TEMP/get-proof.lftp" "$raw_host"
cmp -s index.js "$RUNNER_TEMP/remote-index.js"
cmp -s src/oneworldz-gpt/http.js "$RUNNER_TEMP/remote-gpt-http.js"
cmp -s src/full-runtime-entry.js "$RUNNER_TEMP/remote-full-runtime-entry.js"
cmp -s src/http.js "$RUNNER_TEMP/remote-http.js"
cmp -s src/user-experience.js "$RUNNER_TEMP/remote-user-experience.js"
cmp -s src/zed-guide.js "$RUNNER_TEMP/remote-zed-guide.js"
cmp -s public/miniapp/index.html "$RUNNER_TEMP/remote-miniapp-index.html"
cmp -s public/miniapp/experience.js "$RUNNER_TEMP/remote-miniapp-experience.js"
echo 'PROTECTED_RUNTIME_REMOTE_FINGERPRINTS=PASS'

url="https://developers.hostinger.com/api/hosting/v1/accounts/${user_enc}/websites/${domain_enc}/nodejs/server/restart"
code="$(curl --silent --show-error --location --connect-timeout 15 --max-time 45 --request POST \
  -o "$RUNNER_TEMP/restart.json" -w '%{http_code}' \
  -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' "$url")"
case "$code" in
  200|201|202|204) echo "HOSTINGER_MANAGED_RESTART=PASS HTTP=$code" ;;
  *) cat "$RUNNER_TEMP/restart.json"; exit 1 ;;
esac

for i in $(seq 1 60); do
  sleep 5
  root_code="$(curl --silent --show-error --location --connect-timeout 12 --max-time 20 -o "$RUNNER_TEMP/root.json" -w '%{http_code}' "https://$PROTECTED_DOMAIN/?proof=${GITHUB_SHA}-${GITHUB_RUN_ID}-${i}" || true)"
  health_code="$(curl --silent --show-error --location --connect-timeout 12 --max-time 20 -o "$RUNNER_TEMP/health.json" -w '%{http_code}' "https://$PROTECTED_DOMAIN/health?proof=${GITHUB_SHA}-${GITHUB_RUN_ID}-${i}" || true)"
  mini_code="$(curl --silent --show-error --location --connect-timeout 12 --max-time 20 -o "$RUNNER_TEMP/miniapp.html" -w '%{http_code}' "https://$PROTECTED_DOMAIN/miniapp/?proof=${GITHUB_SHA}-${GITHUB_RUN_ID}-${i}" || true)"
  status_code="$(curl --silent --show-error --location --connect-timeout 12 --max-time 20 -o "$RUNNER_TEMP/status.json" -w '%{http_code}' "https://$PROTECTED_DOMAIN/api/oneworldz-gpt/status?proof=${GITHUB_SHA}-${GITHUB_RUN_ID}-${i}" || true)"
  if [ "$root_code" = 200 ] && [ "$health_code" = 200 ] && [ "$mini_code" = 200 ] && [ "$status_code" = 200 ] \
    && grep -Fq '"service":"CryptoWorldz Zed Bot"' "$RUNNER_TEMP/root.json" \
    && grep -Fq '"ok":true' "$RUNNER_TEMP/health.json" \
    && grep -Fq 'id="splashback"' "$RUNNER_TEMP/miniapp.html" \
    && grep -Fq 'id="zed-guide"' "$RUNNER_TEMP/miniapp.html" \
    && grep -Fq 'id="create"' "$RUNNER_TEMP/miniapp.html" \
    && grep -Fq 'id="heroes"' "$RUNNER_TEMP/miniapp.html" \
    && STATUS="$RUNNER_TEMP/status.json" node - <<'NODE'
const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.env.STATUS,'utf8'));
if(p.ok!==true||p.openai_api_configured!==true) process.exit(1);
if(p.guard_profile!=="oneworldz-public-low-cost-v1"||p.guard_enforced!==true) process.exit(1);
if(p.model!=="gpt-4o-mini"||p.max_output_tokens!==320) process.exit(1);
if(p.per_ip_limit_10m!==8||p.daily_request_limit!==1000) process.exit(1);
if(p.payments_in_chat!==false||p.secrets_in_browser!==false) process.exit(1);
NODE
  then
    echo 'PROTECTED_FULL_ZED_MINIAPP_GPT_PRODUCTION=PASS'
    bash .github/publish-progress.sh ZED_MINIAPP PASS
    exit 0
  fi
  echo "ZED_CONVERGENCE $i/60 root=$root_code health=$health_code mini=$mini_code gpt=$status_code"
done

echo '::error::ZED/MiniApp/GPT did not converge after Hostinger deployment/restart.'
exit 1
