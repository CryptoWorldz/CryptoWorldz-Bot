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
node --test test/protected-env.test.js test/oneworldz-gpt.test.js
node --check index.js
node --check src/protected-env.js
node --check src/full-runtime-entry.js
echo 'OPERATION_ONEWORLDZ_GPT_LOCAL=PASS'
echo 'OPERATION_ONEWORLDZ_GPT_IMMUTABLE_ENV_PATH=PASS'

host="$(printf '%s' "$FTP_HOST" | sed -e 's#^ftp[s]*://##' -e 's#/.*$##')"
if [[ "$host" != *:*:* && "$host" == *:* ]]; then host="${host%%:*}"; fi

protected_env="$RUNNER_TEMP/oneworldz-gpt.env"
fetch_script="$RUNNER_TEMP/oneworldz-gpt-fetch.lftp"
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
  printf 'get ".env" -o "%s"\n' "$protected_env"
  echo 'bye'
} > "$fetch_script"
timeout 180 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $fetch_script" "$host"
test -s "$protected_env"

PROTECTED_ENV="$protected_env" python3 - <<'PY'
import os
import pathlib
import re

path = pathlib.Path(os.environ["PROTECTED_ENV"])
key = os.environ.get("OPENAI_API_KEY", "").strip()
if not key or "\n" in key or "\r" in key:
    raise SystemExit("OPENAI_API_KEY_INVALID")

pattern = re.compile(r"^\s*(?:export\s+)?OPENAI_API_KEY\s*=")
lines = path.read_text(encoding="utf-8").splitlines()
out = []
written = False
for line in lines:
    if pattern.match(line):
        if not written:
            out.append(f"OPENAI_API_KEY={key}")
            written = True
        continue
    out.append(line)
if not written:
    out.append(f"OPENAI_API_KEY={key}")
path.write_text("\n".join(out).rstrip("\n") + "\n", encoding="utf-8")
PY
chmod 600 "$protected_env"
PROTECTED_ENV="$protected_env" python3 - <<'PY'
import os
import pathlib
import re

text = pathlib.Path(os.environ["PROTECTED_ENV"]).read_text(encoding="utf-8")
matches = [line for line in text.splitlines() if re.match(r"^\s*(?:export\s+)?OPENAI_API_KEY\s*=\S+", line)]
if len(matches) != 1:
    raise SystemExit("OPENAI_API_KEY_MERGE_PROOF_FAILED")
PY
echo 'OPERATION_ONEWORLDZ_GPT_KEY_MERGE=PASS'

runtime_files="$RUNNER_TEMP/oneworldz-gpt-runtime-files.txt"
{
  printf '%s\n' index.js package.json package-lock.json .github/install-ci-apt-wrapper.cjs
  find src public .well-known -type f ! -name '.env' ! -name '*.log' -printf '%p\n' | sort
} > "$runtime_files"
test -s "$runtime_files"

release_dir="$RUNNER_TEMP/oneworldz-gpt-release"
mkdir -p "$release_dir"
while IFS= read -r rel; do
  mkdir -p "$release_dir/$(dirname "$rel")"
  cp "$rel" "$release_dir/$rel"
done < "$runtime_files"
archive="$RUNNER_TEMP/oneworldz-gpt-runtime.tgz"
tar -C "$release_dir" -czf "$archive" .
test -s "$archive"
archive_manifest="$RUNNER_TEMP/oneworldz-gpt-archive-manifest.txt"
tar -tzf "$archive" > "$archive_manifest"
if grep -Fxq './.env' "$archive_manifest"; then
  echo '::error::PROTECTED_ENV_MUST_NOT_ENTER_HOSTINGER_BUILD_ARCHIVE'
  exit 1
fi
archive_name=".oneworldz-gpt-${GITHUB_RUN_ID}-$(openssl rand -hex 16).tgz"

cleanup_archive() {
  local cleanup_script="$RUNNER_TEMP/oneworldz-gpt-cleanup.lftp"
  {
    echo 'set cmd:fail-exit true'
    echo 'set net:max-retries 2'
    echo 'set net:timeout 30'
    echo 'set ftp:ssl-force true'
    echo 'set ftp:ssl-protect-data true'
    echo 'set ssl:verify-certificate true'
    echo 'set ssl:check-hostname false'
    echo 'set ftp:passive-mode true'
    printf 'cd "%s/../public_html"\n' "$PROTECTED_NODE_ROOT"
    printf 'rm -f "%s"\n' "$archive_name"
    echo 'bye'
  } > "$cleanup_script"
  timeout 180 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $cleanup_script" "$host" >/dev/null 2>&1 || true
}
trap cleanup_archive EXIT

upload_script="$RUNNER_TEMP/oneworldz-gpt-upload.lftp"
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
  printf 'put "%s" -o "%s"\n' "$archive" "$archive_name"
  echo 'bye'
} > "$upload_script"
timeout 300 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $upload_script" "$host"
echo 'OPERATION_ONEWORLDZ_GPT_PROTECTED_ARCHIVE=UPLOADED'

domain_enc="$(node -p 'encodeURIComponent(process.env.PROTECTED_DOMAIN)')"
curl --fail --silent --show-error --location \
  -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
  "https://developers.hostinger.com/api/hosting/v1/websites?domain=${domain_enc}&per_page=25" \
  -o "$RUNNER_TEMP/websites.json"
username="$(node - <<'NODE'
const p = require(process.env.RUNNER_TEMP + '/websites.json');
const domain = process.env.PROTECTED_DOMAIN.toLowerCase();
const website = (p.data || []).find((row) => String(row.domain || '').toLowerCase() === domain);
if (!website?.username) process.exit(2);
process.stdout.write(String(website.username));
NODE
)"
echo "::add-mask::$username"
user_enc="$(HOSTINGER_USERNAME="$username" node -p 'encodeURIComponent(process.env.HOSTINGER_USERNAME)')"
base="https://developers.hostinger.com/api/hosting/v1/accounts/${user_enc}/websites/${domain_enc}/nodejs"

build_request="$RUNNER_TEMP/oneworldz-gpt-build.json"
ARCHIVE_NAME="$archive_name" BUILD_REQUEST="$build_request" node - <<'NODE'
const fs = require('fs');
fs.writeFileSync(process.env.BUILD_REQUEST, JSON.stringify({
  node_version: 22,
  app_type: 'express',
  root_directory: '.',
  output_directory: '.',
  entry_file: 'index.js',
  package_manager: 'npm',
  source_type: 'archive',
  source_options: { archive_path: process.env.ARCHIVE_NAME }
}));
NODE
build_code="$(curl --silent --show-error --location --connect-timeout 15 --max-time 60 \
  --request POST -o "$RUNNER_TEMP/oneworldz-gpt-build-create.json" -w '%{http_code}' \
  -H "Authorization: Bearer $HOSTINGER_API_TOKEN" \
  -H 'Accept: application/json' -H 'Content-Type: application/json' \
  --data-binary "@$build_request" "$base/builds" || true)"
case "$build_code" in
  200|201|202) ;;
  *) echo "::error::OPERATION_ONEWORLDZ_GPT_BUILD_REJECTED HTTP=$build_code"; exit 1;;
esac
build_uuid="$(BUILD_CREATE="$RUNNER_TEMP/oneworldz-gpt-build-create.json" node - <<'NODE'
const p = require(process.env.BUILD_CREATE);
const value = p.uuid || p.data?.uuid || p.id || p.data?.id;
if (!value) process.exit(2);
process.stdout.write(String(value));
NODE
)"
echo 'OPERATION_ONEWORLDZ_GPT_HOSTINGER_BUILD=STARTED'

print_build_logs() {
  local logs_file="$RUNNER_TEMP/oneworldz-gpt-build-logs.json"
  curl --silent --show-error --location \
    -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
    "$base/builds/$build_uuid/logs" -o "$logs_file" || return 0
  BUILD_LOGS="$logs_file" node - <<'NODE'
const fs = require('fs');
let p;
try { p = JSON.parse(fs.readFileSync(process.env.BUILD_LOGS, 'utf8')); } catch { process.exit(0); }
const logs = String(p.logs ?? p.data?.logs ?? (typeof p.data === 'string' ? p.data : '')).replace(/\u001b\[[0-9;]*m/g, '');
if (logs) process.stdout.write(`${logs}\n`);
NODE
}

build_pass=0
for attempt in $(seq 1 90); do
  sleep 10
  curl --fail --silent --show-error --location \
    -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
    "$base/builds?per_page=25" -o "$RUNNER_TEMP/oneworldz-gpt-builds.json"
  build_state="$(BUILD_LIST="$RUNNER_TEMP/oneworldz-gpt-builds.json" BUILD_UUID="$build_uuid" node - <<'NODE'
const p = require(process.env.BUILD_LIST);
const rows = Array.isArray(p) ? p : (Array.isArray(p.data) ? p.data : (Array.isArray(p.items) ? p.items : []));
const row = rows.find((item) => String(item.uuid || item.id) === process.env.BUILD_UUID);
process.stdout.write(String(row?.state || row?.status || 'pending').toLowerCase());
NODE
)"
  echo "OPERATION_ONEWORLDZ_GPT_BUILD attempt=$attempt/90 state=$build_state"
  case "$build_state" in
    completed|complete|success|succeeded|ready) build_pass=1; break;;
    failed|error|cancelled|canceled) print_build_logs; echo "::error::OPERATION_ONEWORLDZ_GPT_BUILD_FAILED state=$build_state"; exit 1;;
  esac
done
test "$build_pass" = 1
cleanup_archive
trap - EXIT
echo 'OPERATION_ONEWORLDZ_GPT_HOSTINGER_BUILD=PASS'

release_listing="$RUNNER_TEMP/oneworldz-gpt-release-listing.lftp"
{
  echo 'set cmd:fail-exit true'
  echo 'set ftp:ssl-force true'
  echo 'set ftp:ssl-protect-data true'
  echo 'set ssl:verify-certificate true'
  echo 'set ssl:check-hostname false'
  printf 'cd "%s"\n' "$PROTECTED_NODE_ROOT"
  echo 'pwd'
  echo 'cls -la'
  echo 'bye'
} > "$release_listing"
echo 'OPERATION_ONEWORLDZ_GPT_NODE_ROOT_BEGIN'
timeout 180 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $release_listing" "$host"
echo 'OPERATION_ONEWORLDZ_GPT_NODE_ROOT_END'

post_build_env="$RUNNER_TEMP/oneworldz-gpt-post-build-env.lftp"
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
} > "$post_build_env"
timeout 180 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $post_build_env" "$host"
echo 'OPERATION_ONEWORLDZ_GPT_PROTECTED_ENV=PASS'

restart_code="$(curl --silent --show-error --location --connect-timeout 15 --max-time 45 \
  --request POST -o "$RUNNER_TEMP/oneworldz-gpt-restart.json" -w '%{http_code}' \
  -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' \
  "$base/server/restart" || true)"
case "$restart_code" in
  200|201|202|204) ;;
  *) echo "::error::OPERATION_ONEWORLDZ_GPT_RESTART_REJECTED HTTP=$restart_code"; exit 1;;
esac
echo 'OPERATION_ONEWORLDZ_GPT_RESTART=PASS'

for attempt in $(seq 1 30); do
  sleep 4
  status_file="$RUNNER_TEMP/oneworldz-gpt-status.json"
  status_code="$(curl --silent --show-error --location --connect-timeout 5 --max-time 15 \
    -o "$status_file" -w '%{http_code}' \
    "https://$PROTECTED_DOMAIN/api/oneworldz-gpt/status?operation=${GITHUB_RUN_ID}-${attempt}" || true)"
  if [ "$status_code" = 200 ] && STATUS="$status_file" node - <<'NODE'
const fs = require('fs');
let p;
try { p = JSON.parse(fs.readFileSync(process.env.STATUS, 'utf8')); } catch { process.exit(1); }
if (p.ok !== true || p.service !== 'OneWorldz GPT' || p.openai_api_configured !== true) process.exit(1);
if (p.guard_profile !== 'oneworldz-public-low-cost-v1' || p.guard_enforced !== true) process.exit(1);
if (p.payments_in_chat !== false || p.secrets_in_browser !== false) process.exit(1);
NODE
  then
    chat_file="$RUNNER_TEMP/oneworldz-gpt-chat.json"
    chat_code="$(curl --silent --show-error --location --connect-timeout 5 --max-time 45 \
      --request POST -o "$chat_file" -w '%{http_code}' \
      -H 'Content-Type: application/json' \
      --data '{"message":"Reply with READY.","history":[],"page":"operation-oneworldz-gpt"}' \
      "https://$PROTECTED_DOMAIN/api/oneworldz-gpt/chat" || true)"
    if [ "$chat_code" = 200 ] && CHAT="$chat_file" node - <<'NODE'
const fs = require('fs');
let p;
try { p = JSON.parse(fs.readFileSync(process.env.CHAT, 'utf8')); } catch { process.exit(1); }
if (p.ok !== true || p.service !== 'OneWorldz GPT' || p.powered_by !== 'OpenAI' || !String(p.text || '').trim()) process.exit(1);
NODE
    then
      echo 'OPERATION_ONEWORLDZ_GPT_LIVE=PASS'
      exit 0
    fi
  fi
  echo "OPERATION_ONEWORLDZ_GPT_PROBE attempt=$attempt/30 status_http=$status_code"
done

echo '::error::OPERATION_ONEWORLDZ_GPT_LIVE=FAIL'
exit 1
