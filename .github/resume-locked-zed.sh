#!/usr/bin/env bash
set -euo pipefail

: "${PROTECTED_DOMAIN:?}"
: "${PROTECTED_NODE_ROOT:?}"
: "${FTP_HOST:?}"
: "${FTP_USERNAME:?}"
: "${FTP_PASSWORD:?}"
: "${FTP_PORT:?}"
: "${OPENAI_API_KEY:?}"
: "${HOSTINGER_API_TOKEN:?}"

for value in "$FTP_HOST" "$FTP_USERNAME" "$FTP_PASSWORD" "$OPENAI_API_KEY" "$HOSTINGER_API_TOKEN"; do
  echo "::add-mask::$value"
done
for value in "${BOT_TOKEN_SECRET:-}" "${SUPABASE_URL_SECRET:-}" "${SUPABASE_SERVICE_ROLE_KEY_SECRET:-}"; do
  [ -z "$value" ] || echo "::add-mask::$value"
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

rm -f "$RUNNER_TEMP/protected.env"
cat > "$RUNNER_TEMP/get-env.lftp" <<EOF
set cmd:fail-exit false
set net:max-retries 2
set net:timeout 25
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate true
set ssl:check-hostname false
get $PROTECTED_NODE_ROOT/.env -o $RUNNER_TEMP/protected.env
bye
EOF
timeout 180 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $RUNNER_TEMP/get-env.lftp" "$raw_host" || true
if [ -s "$RUNNER_TEMP/protected.env" ]; then
  echo 'PROTECTED_REMOTE_ENV_FETCH=PASS'
else
  echo 'PROTECTED_REMOTE_ENV_FETCH=EMPTY_OR_ABSENT'
fi

# Key-name-only diagnostic. Values are never printed.
node - <<'NODE'
const fs=require('fs');
const p=process.env.RUNNER_TEMP+'/protected.env';
let text=''; try{text=fs.readFileSync(p,'utf8')}catch{}
const names=[];
for(const raw of text.split(/\r?\n/)){
  const line=raw.trim();
  if(!line||line.startsWith('#')) continue;
  const at=line.indexOf('=');
  if(at<1) continue;
  const key=line.slice(0,at).trim();
  if(/BOT|TELEGRAM|SUPABASE/i.test(key)) names.push(key);
}
console.log('REMOTE_ENV_RELEVANT_KEYS='+(names.length?names.sort().join(','):'NONE'));
NODE

node - <<'NODE'
const fs=require('fs');
const p=process.env.RUNNER_TEMP+'/protected.env';
let rows=[];
try { rows=fs.readFileSync(p,'utf8').split(/\r?\n/).filter(Boolean); } catch {}
const candidates={
  OPENAI_API_KEY:process.env.OPENAI_API_KEY,
  ONEWORLDZ_OPENAI_MODEL:'gpt-4o-mini',
  ONEWORLDZ_IMAGE_MODEL:'gpt-image-2',
  BOT_TOKEN:process.env.BOT_TOKEN_SECRET,
  SUPABASE_URL:process.env.SUPABASE_URL_SECRET,
  SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY_SECRET
};
const overrides=Object.fromEntries(Object.entries(candidates).filter(([,v])=>String(v||'').trim()));
rows=rows.filter(row=>!Object.keys(overrides).some(k=>row.startsWith(k+'=')));
for(const [k,v] of Object.entries(overrides)) rows.push(`${k}=${String(v).trim()}`);
fs.writeFileSync(p,rows.join('\n')+'\n');
NODE

for key in BOT_TOKEN SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY OPENAI_API_KEY; do
  grep -Eq "^${key}=.+$" "$RUNNER_TEMP/protected.env" || {
    echo "::error::Required protected runtime value ${key} is absent after remote-env merge."
    exit 1
  }
done
grep -Eq '^ONEWORLDZ_OPENAI_MODEL=gpt-4o-mini$' "$RUNNER_TEMP/protected.env"
grep -Eq '^ONEWORLDZ_IMAGE_MODEL=gpt-image-2$' "$RUNNER_TEMP/protected.env"
echo 'PROTECTED_RUNTIME_ENV_COMPLETE=PASS'

cat > "$RUNNER_TEMP/put-env.lftp" <<EOF
set cmd:fail-exit true
set net:max-retries 2
set net:timeout 25
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate true
set ssl:check-hostname false
put $RUNNER_TEMP/protected.env -o $PROTECTED_NODE_ROOT/.env
bye
EOF
timeout 180 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $RUNNER_TEMP/put-env.lftp" "$raw_host"

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

echo '::error::ZED/MiniApp/GPT did not converge after managed restart.'
exit 1
