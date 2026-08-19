#!/usr/bin/env bash
set -Eeuo pipefail

: "${PROTECTED_DOMAIN:?}"
: "${PROTECTED_NODE_ROOT:?}"
: "${FTP_HOST:?}"
: "${FTP_USERNAME:?}"
: "${FTP_PASSWORD:?}"
: "${FTP_PORT:?}"
: "${HOSTINGER_API_TOKEN:?}"

for value in "$FTP_HOST" "$FTP_USERNAME" "$FTP_PASSWORD" "$HOSTINGER_API_TOKEN"; do [ -n "$value" ] && echo "::add-mask::$value"; done

npm ci
node --test test/oneworldz-gpt.test.js test/hub-central-live-v1.test.js
node --check index.js
node --check src/full-runtime-entry.js
node --check src/http.js
node --check src/user-experience.js
node --check src/zed-guide.js
echo 'ZED_LOCAL_RUNTIME_VALIDATION=PASS'

sudo apt-get update -qq
sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq lftp

raw_host="$(printf '%s' "$FTP_HOST" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's#^ftp://##' -e 's#^ftps://##' -e 's#/.*$##')"
if [[ "$raw_host" != *:*:* && "$raw_host" == *:* ]]; then raw_host="${raw_host%%:*}"; fi

cat > "$RUNNER_TEMP/zed-upload.lftp" <<EOF
set cmd:fail-exit true
set net:max-retries 2
set net:timeout 30
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate true
set ssl:check-hostname false
cd "$PROTECTED_NODE_ROOT"
lcd "$GITHUB_WORKSPACE"
put index.js -o index.js
put package.json -o package.json
put package-lock.json -o package-lock.json
mirror -R --verbose=1 --only-newer --exclude-glob .env --exclude-glob '*.log' src src
mirror -R --verbose=1 --only-newer public public
mirror -R --verbose=1 --only-newer .well-known .well-known
bye
EOF

timeout 900 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $RUNNER_TEMP/zed-upload.lftp" "$raw_host"
echo 'ZED_FULL_RUNTIME_FTPS_UPLOAD=PASS'

proof="$RUNNER_TEMP/zed-ftps-proof"; rm -rf "$proof"; mkdir -p "$proof/src" "$proof/public/miniapp"
cat > "$RUNNER_TEMP/zed-proof.lftp" <<EOF
set cmd:fail-exit true
set net:max-retries 2
set net:timeout 30
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate true
set ssl:check-hostname false
cd "$PROTECTED_NODE_ROOT"
get index.js -o "$proof/index.js"
get src/full-runtime-entry.js -o "$proof/src/full-runtime-entry.js"
get src/http.js -o "$proof/src/http.js"
get src/user-experience.js -o "$proof/src/user-experience.js"
get src/zed-guide.js -o "$proof/src/zed-guide.js"
get public/miniapp/index.html -o "$proof/public/miniapp/index.html"
get public/miniapp/experience.js -o "$proof/public/miniapp/experience.js"
bye
EOF

timeout 300 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $RUNNER_TEMP/zed-proof.lftp" "$raw_host"
cmp -s index.js "$proof/index.js"
cmp -s src/full-runtime-entry.js "$proof/src/full-runtime-entry.js"
cmp -s src/http.js "$proof/src/http.js"
cmp -s src/user-experience.js "$proof/src/user-experience.js"
cmp -s src/zed-guide.js "$proof/src/zed-guide.js"
cmp -s public/miniapp/index.html "$proof/public/miniapp/index.html"
cmp -s public/miniapp/experience.js "$proof/public/miniapp/experience.js"
echo 'ZED_FULL_RUNTIME_REMOTE_BYTES=PASS'

domain_enc="$(node -p 'encodeURIComponent(process.env.PROTECTED_DOMAIN)')"
curl --fail --silent --show-error --location -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' "https://developers.hostinger.com/api/hosting/v1/websites?domain=${domain_enc}&per_page=25" -o "$RUNNER_TEMP/websites.json"
username="$(node - <<'NODE'
const p=require(process.env.RUNNER_TEMP+'/websites.json'); const d=process.env.PROTECTED_DOMAIN.toLowerCase(); const r=(p.data||[]).find(x=>String(x.domain||'').toLowerCase()===d); if(!r?.username)process.exit(2); process.stdout.write(String(r.username));
NODE
)"
echo "::add-mask::$username"
user_enc="$(HOSTINGER_USERNAME="$username" node -p 'encodeURIComponent(process.env.HOSTINGER_USERNAME)')"
base="https://developers.hostinger.com/api/hosting/v1/accounts/${user_enc}/websites/${domain_enc}/nodejs"
code="$(curl --silent --show-error --location --connect-timeout 15 --max-time 45 --request POST -o "$RUNNER_TEMP/restart.json" -w '%{http_code}' -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' "$base/server/restart")"
case "$code" in 200|201|202|204) echo "HOSTINGER_MANAGED_RESTART=PASS HTTP=$code";; *) cat "$RUNNER_TEMP/restart.json" 2>/dev/null || true; echo "::error::Managed restart rejected HTTP=$code"; exit 1;; esac

probe(){ local url="$1" out="$2"; curl --silent --show-error --location --connect-timeout 8 --max-time 12 -o "$out" -w '%{http_code}' "$url" || true; }
for i in $(seq 1 48); do
  sleep 5
  root="$(probe "https://$PROTECTED_DOMAIN/?proof=$GITHUB_RUN_ID-$i" "$RUNNER_TEMP/root.json")"
  health="$(probe "https://$PROTECTED_DOMAIN/health?proof=$GITHUB_RUN_ID-$i" "$RUNNER_TEMP/health.json")"
  mini="$(probe "https://$PROTECTED_DOMAIN/miniapp/?proof=$GITHUB_RUN_ID-$i" "$RUNNER_TEMP/mini.html")"
  gpt="$(probe "https://$PROTECTED_DOMAIN/api/oneworldz-gpt/status?proof=$GITHUB_RUN_ID-$i" "$RUNNER_TEMP/gpt.json")"
  if [ "$root" = 200 ] && [ "$health" = 200 ] && [ "$mini" = 200 ] && [ "$gpt" = 200 ] \
    && grep -Fq '"service":"CryptoWorldz Zed Bot"' "$RUNNER_TEMP/root.json" \
    && grep -Fq '"ok":true' "$RUNNER_TEMP/health.json" \
    && grep -Fq 'id="splashback"' "$RUNNER_TEMP/mini.html" \
    && grep -Fq 'id="zed-guide"' "$RUNNER_TEMP/mini.html" \
    && grep -Fq 'id="create"' "$RUNNER_TEMP/mini.html" \
    && grep -Fq 'id="heroes"' "$RUNNER_TEMP/mini.html"; then
      echo 'ZED_AUTO_GRACE_COMMAND_CENTRE_LIVE=PASS'
      bash .github/publish-progress.sh ZED_MINIAPP PASS
      exit 0
  fi
  echo "ZED_CONVERGENCE attempt=$i root=$root health=$health mini=$mini gpt=$gpt"
done

echo '::error::ZED/AUTO/GRACE Command Centre did not converge after verified FTPS runtime upload and managed restart.'
exit 1
