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

npm ci
node --test test/oneworldz-gpt.test.js test/hub-central-live-v1.test.js
node --check index.js
node --check src/full-runtime-entry.js
node --check src/http.js
node --check src/oneworldz-gpt/http.js
node --check src/user-experience.js
node --check src/zed-guide.js
grep -Fq 'registerProjectWalletSystem({ app, bot, config, supabase });' src/full-runtime-entry.js
for marker in 'id="splashback"' 'id="zed-guide"' 'id="create"' 'id="heroes"'; do
  grep -Fq "$marker" public/miniapp/index.html
done
echo 'ZED_FULL_RUNTIME_LOCAL_VALIDATION=PASS'

if ! command -v lftp >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq lftp
fi
command -v lftp >/dev/null

host="$(printf '%s' "$FTP_HOST" | sed -e 's#^ftp[s]*://##' -e 's#/.*$##')"
if [[ "$host" != *:*:* && "$host" == *:* ]]; then host="${host%%:*}"; fi

runtime_files="$RUNNER_TEMP/zed-runtime-files.txt"
runtime_dirs="$RUNNER_TEMP/zed-runtime-dirs.txt"
proofdir="$RUNNER_TEMP/zed-runtime-byte-proof"
mkdir -p "$proofdir"
{
  printf '%s\n' index.js package.json package-lock.json
  find src public .well-known -type f ! -name '.env' ! -name '*.log' -printf '%p\n' | sort
} > "$runtime_files"
test -s "$runtime_files"
while IFS= read -r rel; do
  d="$(dirname "$rel")"
  [ "$d" = '.' ] || printf '%s\n' "$d"
done < "$runtime_files" | sort -u > "$runtime_dirs"

critical=(
  index.js
  package.json
  package-lock.json
  src/full-runtime-entry.js
  src/http.js
  src/oneworldz-gpt/http.js
  src/user-experience.js
  src/zed-guide.js
  public/miniapp/index.html
  public/miniapp/app.js
  public/miniapp/experience.js
  .well-known/openapi.yaml
)
for rel in "${critical[@]}"; do
  test -s "$rel"
  mkdir -p "$proofdir/$(dirname "$rel")"
done

{
  echo 'set cmd:fail-exit true'
  echo 'set net:max-retries 3'
  echo 'set net:timeout 30'
  echo 'set net:reconnect-interval-base 5'
  echo 'set net:reconnect-interval-max 20'
  echo 'set ftp:ssl-force true'
  echo 'set ftp:ssl-protect-data true'
  echo 'set ssl:verify-certificate true'
  echo 'set ssl:check-hostname false'
  echo 'set ftp:passive-mode true'
  printf 'cd "%s"\n' "$PROTECTED_NODE_ROOT"
  printf 'lcd "%s"\n' "$GITHUB_WORKSPACE"
  while IFS= read -r dir; do
    [ -n "$dir" ] && printf 'mkdir -p "%s"\n' "$dir"
  done < "$runtime_dirs"
  while IFS= read -r rel; do
    printf 'put "%s" -o "%s"\n' "$rel" "$rel"
  done < "$runtime_files"
  for rel in "${critical[@]}"; do
    printf 'get "%s" -o "%s/%s"\n' "$rel" "$proofdir" "$rel"
  done
  echo 'bye'
} > "$RUNNER_TEMP/zed-runtime-sync.lftp"

transport_pass=0
for attempt in $(seq 1 4); do
  echo "ZED_FTPS_TRANSPORT attempt=$attempt/4"
  if timeout 1200 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" \
      -e "source $RUNNER_TEMP/zed-runtime-sync.lftp" "$host"; then
    transport_pass=1
    break
  fi
  echo "::warning::ZED FTPS transport attempt $attempt failed; retrying the same full protected runtime without deleting remote secrets."
  sleep $((attempt * 10))
done
test "$transport_pass" = '1'

for rel in "${critical[@]}"; do
  cmp -s "$rel" "$proofdir/$rel" || {
    echo "::error::REMOTE_BYTE_MISMATCH:$rel"
    exit 1
  }
done
file_count="$(wc -l < "$runtime_files" | tr -d ' ')"
byte_total="$(while IFS= read -r rel; do stat -c '%s' "$rel"; done < "$runtime_files" | awk '{s+=$1} END{print s+0}')"
echo "ZED_FULL_RUNTIME_FTPS_SYNC=PASS files=$file_count bytes=$byte_total"
echo "ZED_CRITICAL_REMOTE_BYTES=PASS files=${#critical[@]}"

domain_enc="$(node -p 'encodeURIComponent(process.env.PROTECTED_DOMAIN)')"
curl --fail --silent --show-error --location \
  -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
  "https://developers.hostinger.com/api/hosting/v1/websites?domain=${domain_enc}&per_page=25" \
  -o "$RUNNER_TEMP/websites.json"
username="$(node - <<'NODE'
const p=require(process.env.RUNNER_TEMP+'/websites.json');
const d=process.env.PROTECTED_DOMAIN.toLowerCase();
const r=(p.data||[]).find(x=>String(x.domain||'').toLowerCase()===d);
if(!r?.username) process.exit(2);
process.stdout.write(String(r.username));
NODE
)"
echo "::add-mask::$username"
user_enc="$(HOSTINGER_USERNAME="$username" node -p 'encodeURIComponent(process.env.HOSTINGER_USERNAME)')"
base="https://developers.hostinger.com/api/hosting/v1/accounts/${user_enc}/websites/${domain_enc}/nodejs"
code="$(curl --silent --show-error --location --connect-timeout 15 --max-time 45 --request POST \
  -o "$RUNNER_TEMP/restart.json" -w '%{http_code}' \
  -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
  "$base/server/restart" || true)"
case "$code" in
  200|201|202|204) echo "HOSTINGER_MANAGED_RESTART=PASS HTTP=$code";;
  *) cat "$RUNNER_TEMP/restart.json" 2>/dev/null || true; echo "::error::Managed restart rejected HTTP=$code"; exit 1;;
esac

probe_one(){
  local url="$1" out="$2" codefile="$3" code
  code="$(curl --silent --show-error --location --connect-timeout 5 --max-time 12 -o "$out" -w '%{http_code}' "$url" || true)"
  printf '%s' "$code" > "$codefile"
}

bool_grep(){ grep -Fq "$1" "$2" 2>/dev/null && printf 1 || printf 0; }
gpt_contract(){
  STATUS="$RUNNER_TEMP/gpt.json" node - <<'NODE'
const fs=require('fs');
let p; try { p=JSON.parse(fs.readFileSync(process.env.STATUS,'utf8')); } catch { process.exit(1); }
if(p.ok!==true||p.openai_api_configured!==true) process.exit(1);
if(p.guard_profile!=="oneworldz-public-low-cost-v1"||p.guard_enforced!==true) process.exit(1);
if(p.model!=="gpt-4o-mini"||p.max_output_tokens!==320) process.exit(1);
if(p.per_ip_limit_10m!==8||p.daily_request_limit!==1000) process.exit(1);
if(p.payments_in_chat!==false||p.secrets_in_browser!==false) process.exit(1);
NODE
}

for i in $(seq 1 30); do
  sleep 4
  tag="full_runtime=${GITHUB_SHA}-${GITHUB_RUN_ID}-${i}"
  probe_one "https://$PROTECTED_DOMAIN/?$tag" "$RUNNER_TEMP/root.json" "$RUNNER_TEMP/root.code" & p1=$!
  probe_one "https://$PROTECTED_DOMAIN/health?$tag" "$RUNNER_TEMP/health.json" "$RUNNER_TEMP/health.code" & p2=$!
  probe_one "https://$PROTECTED_DOMAIN/miniapp/?$tag" "$RUNNER_TEMP/mini.html" "$RUNNER_TEMP/mini.code" & p3=$!
  probe_one "https://$PROTECTED_DOMAIN/api/oneworldz-gpt/status?$tag" "$RUNNER_TEMP/gpt.json" "$RUNNER_TEMP/gpt.code" & p4=$!
  wait "$p1" "$p2" "$p3" "$p4" || true

  root_code="$(cat "$RUNNER_TEMP/root.code")"
  health_code="$(cat "$RUNNER_TEMP/health.code")"
  mini_code="$(cat "$RUNNER_TEMP/mini.code")"
  gpt_code="$(cat "$RUNNER_TEMP/gpt.code")"
  root_service="$(bool_grep '"service":"CryptoWorldz Zed Bot"' "$RUNNER_TEMP/root.json")"
  health_ok="$(bool_grep '"ok":true' "$RUNNER_TEMP/health.json")"
  mini_splash="$(bool_grep 'id="splashback"' "$RUNNER_TEMP/mini.html")"
  mini_guide="$(bool_grep 'id="zed-guide"' "$RUNNER_TEMP/mini.html")"
  mini_create="$(bool_grep 'id="create"' "$RUNNER_TEMP/mini.html")"
  mini_heroes="$(bool_grep 'id="heroes"' "$RUNNER_TEMP/mini.html")"
  if gpt_contract; then gpt_ok=1; else gpt_ok=0; fi

  echo "ZED_CONVERGENCE attempt=$i root=$root_code health=$health_code mini=$mini_code gpt=$gpt_code root_service=$root_service health_ok=$health_ok splashback=$mini_splash zed_guide=$mini_guide create=$mini_create heroes=$mini_heroes gpt_contract=$gpt_ok"

  if [ "$root_code" = 200 ] && [ "$health_code" = 200 ] && [ "$mini_code" = 200 ] && [ "$gpt_code" = 200 ] \
    && [ "$root_service" = 1 ] && [ "$health_ok" = 1 ] \
    && [ "$mini_splash" = 1 ] && [ "$mini_guide" = 1 ] && [ "$mini_create" = 1 ] && [ "$mini_heroes" = 1 ] \
    && [ "$gpt_ok" = 1 ]; then
      echo 'ZED_AUTO_GRACE_COMMAND_CENTRE_LIVE=PASS'
      bash .github/publish-progress.sh ZED_MINIAPP PASS
      exit 0
  fi

  if grep -Fq 'startup_failure_probe_v1' "$RUNNER_TEMP/root.json" 2>/dev/null; then
    echo 'ZED_STARTUP_FAILURE_PROBE=CAPTURED'
    cat "$RUNNER_TEMP/root.json"; echo
    echo '::error::ZED full runtime reached the startup failure probe; repair the reported stage.'
    exit 1
  fi
done

echo '::error::ZED/AUTO/GRACE full runtime did not satisfy the complete live identity contract after full runtime and MiniApp sync.'
exit 1
