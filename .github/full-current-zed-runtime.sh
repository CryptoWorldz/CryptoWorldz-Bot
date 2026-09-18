#!/usr/bin/env bash
set -Eeuo pipefail

: "${PROTECTED_DOMAIN:?}"
: "${PROTECTED_NODE_ROOT:?}"
: "${FTP_HOST:?}"
: "${FTP_USERNAME:?}"
: "${FTP_PASSWORD:?}"
: "${FTP_PORT:?}"
: "${HOSTINGER_API_TOKEN:?}"
: "${OPENAI_API_KEY:?}"

for value in "$FTP_HOST" "$FTP_USERNAME" "$FTP_PASSWORD" "$HOSTINGER_API_TOKEN" "$OPENAI_API_KEY"; do
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

# Preserve the existing protected runtime environment and merge only the
# server-side OpenAI key supplied by the protected GitHub environment.
# The local destination MUST NOT exist before lftp get; this specifically
# prevents the former empty protected.env capture failure.
protected_env="$RUNNER_TEMP/zed-protected.env"
rm -f "$protected_env"
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
  printf 'get ".env" -o "%s"\n' "$protected_env"
  echo 'bye'
} > "$RUNNER_TEMP/zed-env-fetch.lftp"

env_fetch_pass=0
for attempt in $(seq 1 4); do
  echo "ZED_PROTECTED_ENV_FETCH attempt=$attempt/4"
  rm -f "$protected_env"
  if timeout 180 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" \
      -e "source $RUNNER_TEMP/zed-env-fetch.lftp" "$host"; then
    env_fetch_pass=1
    break
  fi
  echo "::warning::Protected .env fetch attempt $attempt failed; retrying without changing remote runtime state."
  sleep $((attempt * 5))
done
test "$env_fetch_pass" = '1'
test -s "$protected_env"

PROTECTED_ENV="$protected_env" python3 - <<'PY'
import os
import pathlib
import re

path = pathlib.Path(os.environ["PROTECTED_ENV"])
key = os.environ.get("OPENAI_API_KEY", "").strip()
if not key or "\n" in key or "\r" in key:
    raise SystemExit("OPENAI_API_KEY_INVALID_FOR_PROTECTED_ENV")

lines = path.read_text(encoding="utf-8").splitlines()
pattern = re.compile(r"^\s*(?:export\s+)?OPENAI_API_KEY\s*=")
replacement = f"OPENAI_API_KEY={key}"
out = []
replaced = False
for line in lines:
    if pattern.match(line):
        if not replaced:
            out.append(replacement)
            replaced = True
        continue
    out.append(line)
if not replaced:
    out.append(replacement)
path.write_text("\n".join(out).rstrip("\n") + "\n", encoding="utf-8")
PY
chmod 600 "$protected_env"
PROTECTED_ENV="$protected_env" python3 - <<'PY'
import os
import pathlib
import re

text = pathlib.Path(os.environ["PROTECTED_ENV"]).read_text(encoding="utf-8")
matches = [line for line in text.splitlines() if re.match(r"^\s*(?:export\s+)?OPENAI_API_KEY\s*=", line)]
if len(matches) != 1 or not matches[0].split("=", 1)[1].strip():
    raise SystemExit("OPENAI_API_KEY_MERGE_PROOF_FAILED")
PY
echo 'ZED_PROTECTED_ENV_OPENAI_MERGE=READY'

runtime_files="$RUNNER_TEMP/zed-runtime-files.txt"
runtime_dirs="$RUNNER_TEMP/zed-runtime-dirs.txt"
proofdir="$RUNNER_TEMP/zed-runtime-byte-proof"
mkdir -p "$proofdir"
{
  printf '%s\n' index.js package.json package-lock.json .github/install-ci-apt-wrapper.cjs
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
  .github/install-ci-apt-wrapper.cjs
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
  printf 'put "%s" -o ".env"\n' "$protected_env"
  for rel in "${critical[@]}"; do
    printf 'get "%s" -o "%s/%s"\n' "$rel" "$proofdir" "$rel"
  done
  printf 'get ".env" -o "%s/protected.env"\n' "$proofdir"
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

cmp -s "$protected_env" "$proofdir/protected.env" || {
  echo '::error::REMOTE_PROTECTED_ENV_BYTE_MISMATCH'
  exit 1
}
echo 'ZED_PROTECTED_ENV_REMOTE_BYTES=PASS'

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
# A process restart alone can leave Hostinger's previous immutable Node release
# running even though newer files are present in /nodejs. Build a complete,
# secret-free release through Hostinger's official archive endpoint first.
runtime_archive="$RUNNER_TEMP/zed-runtime.tgz"
tar -czf "$runtime_archive" -T "$runtime_files"
test -s "$runtime_archive"
archive_name=".zed-runtime-${GITHUB_RUN_ID}-${GITHUB_SHA:0:12}.tgz"

# Upload the secret-free source archive through the proven FTPS transport.
# This avoids Cloudflare's challenge on large multipart API requests.
{
  echo 'set cmd:fail-exit true'
  echo 'set net:max-retries 3'
  echo 'set net:timeout 30'
  echo 'set ftp:ssl-force true'
  echo 'set ftp:ssl-protect-data true'
  echo 'set ssl:verify-certificate true'
  echo 'set ssl:check-hostname false'
  echo 'set ftp:passive-mode true'
  printf 'cd "%s/../public_html"\n' "$PROTECTED_NODE_ROOT"
  printf 'put "%s" -o "%s"\n' "$runtime_archive" "$archive_name"
  echo 'bye'
} > "$RUNNER_TEMP/zed-build-archive-upload.lftp"
timeout 300 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" \
  -e "source $RUNNER_TEMP/zed-build-archive-upload.lftp" "$host"
echo 'HOSTINGER_BUILD_ARCHIVE_FTPS=PASS'

build_request="$RUNNER_TEMP/zed-build-request.json"
ARCHIVE_NAME="$archive_name" BUILD_REQUEST="$build_request" node - <<'NODE'
const fs=require("fs");
fs.writeFileSync(process.env.BUILD_REQUEST, JSON.stringify({
  node_version: 22,
  app_type: "express",
  root_directory: ".",
  output_directory: ".",
  entry_file: "index.js",
  package_manager: "npm",
  source_type: "archive",
  source_options: { archive_path: process.env.ARCHIVE_NAME }
}));
NODE
build_code="$(curl --silent --show-error --location --connect-timeout 15 --max-time 60 \
  --request POST -o "$RUNNER_TEMP/build-create.json" -w '%{http_code}' \
  -H "Authorization: Bearer $HOSTINGER_API_TOKEN" \
  -H 'Accept: application/json' -H 'Content-Type: application/json' \
  --data-binary "@$build_request" "$base/builds" || true)"
case "$build_code" in
  200|201|202) ;;
  *) cat "$RUNNER_TEMP/build-create.json" 2>/dev/null || true; echo "::error::Managed full Node build rejected HTTP=$build_code"; exit 1;;
esac
build_uuid="$(BUILD_CREATE="$RUNNER_TEMP/build-create.json" node - <<'NODE'
const p=require(process.env.BUILD_CREATE);
const value=p.uuid||p.data?.uuid||p.id||p.data?.id;
if(!value) process.exit(2);
process.stdout.write(String(value));
NODE
)"
echo "HOSTINGER_MANAGED_BUILD=STARTED uuid=$build_uuid"

build_pass=0
for attempt in $(seq 1 90); do
  sleep 10
  curl --fail --silent --show-error --location \
    -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
    "$base/builds?per_page=25" -o "$RUNNER_TEMP/builds.json"
  build_state="$(BUILD_LIST="$RUNNER_TEMP/builds.json" BUILD_UUID="$build_uuid" node - <<'NODE'
const p=require(process.env.BUILD_LIST);
const rows=Array.isArray(p)?p:(Array.isArray(p.data)?p.data:(Array.isArray(p.items)?p.items:[]));
const row=rows.find(x=>String(x.uuid||x.id)===process.env.BUILD_UUID);
process.stdout.write(String(row?.state||row?.status||"pending").toLowerCase());
NODE
)"
  echo "HOSTINGER_MANAGED_BUILD attempt=$attempt/90 state=$build_state"
  case "$build_state" in
    completed|complete|success|succeeded|ready) build_pass=1; break;;
    failed|error|cancelled|canceled)
      curl --silent --show-error --location \
        -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
        "$base/builds/$build_uuid/logs" || true
      echo "::error::Managed full Node build failed state=$build_state"
      exit 1;;
  esac
done
test "$build_pass" = '1'
echo 'HOSTINGER_MANAGED_BUILD=PASS'

# The build archive deliberately contains no secrets. Restore the preserved
# protected environment only after the immutable release has been created.
{
  echo 'set cmd:fail-exit true'
  echo 'set net:max-retries 3'
  echo 'set net:timeout 30'
  echo 'set ftp:ssl-force true'
  echo 'set ftp:ssl-protect-data true'
  echo 'set ssl:verify-certificate true'
  echo 'set ssl:check-hostname false'
  echo 'set ftp:passive-mode true'
  printf 'cd "%s"\n' "$PROTECTED_NODE_ROOT"
  printf 'put "%s" -o ".env"\n' "$protected_env"
  echo 'bye'
} > "$RUNNER_TEMP/zed-post-build-env.lftp"
timeout 180 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" \
  -e "source $RUNNER_TEMP/zed-post-build-env.lftp" "$host"
echo 'ZED_PROTECTED_ENV_POST_BUILD=PASS'

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
