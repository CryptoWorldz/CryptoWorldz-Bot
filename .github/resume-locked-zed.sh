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
node --check src/full-runtime-entry.js
grep -Fq 'registerProjectWalletSystem({ app, bot, config, supabase });' src/full-runtime-entry.js
echo 'ZED_PROJECT_WALLET_RUNTIME_FIX=LOCAL_PASS'

python3 - <<'PY'
import ftplib, io, os, pathlib, ssl, urllib.parse
raw=os.environ['FTP_HOST'].strip()
if '://' not in raw: raw='ftps://'+raw
u=urllib.parse.urlparse(raw)
host=u.hostname or os.environ['FTP_HOST'].strip().split('/')[0].split(':')[0]
port=int(os.environ.get('FTP_PORT') or u.port or 21)
root=os.environ['PROTECTED_NODE_ROOT']
ctx=ssl.create_default_context(); ctx.check_hostname=False
ftp=ftplib.FTP_TLS(context=ctx, timeout=45)
ftp.connect(host,port); ftp.login(os.environ['FTP_USERNAME'],os.environ['FTP_PASSWORD']); ftp.prot_p()
ftp.cwd(root+'/src')
local=pathlib.Path('src/full-runtime-entry.js').read_bytes()
tmp='full-runtime-entry.js.oneworldz-new'
try: ftp.delete(tmp)
except ftplib.all_errors: pass
ftp.storbinary('STOR '+tmp, io.BytesIO(local), blocksize=262144)
try: ftp.delete('full-runtime-entry.js')
except ftplib.all_errors: pass
ftp.rename(tmp,'full-runtime-entry.js')
buf=io.BytesIO(); ftp.retrbinary('RETR full-runtime-entry.js',buf.write,blocksize=262144)
if buf.getvalue()!=local: raise SystemExit('REMOTE_BYTE_MISMATCH:src/full-runtime-entry.js')
print('ZED_PROJECT_WALLET_RUNTIME_FIX=REMOTE_BYTES_PASS')
ftp.quit()
PY

domain_enc="$(node -p 'encodeURIComponent(process.env.PROTECTED_DOMAIN)')"
curl --fail --silent --show-error --location -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' "https://developers.hostinger.com/api/hosting/v1/websites?domain=${domain_enc}&per_page=25" -o "$RUNNER_TEMP/websites.json"
username="$(node - <<'NODE'
const p=require(process.env.RUNNER_TEMP+'/websites.json'); const d=process.env.PROTECTED_DOMAIN.toLowerCase(); const r=(p.data||[]).find(x=>String(x.domain||'').toLowerCase()===d); if(!r?.username)process.exit(2); process.stdout.write(String(r.username));
NODE
)"
echo "::add-mask::$username"
user_enc="$(HOSTINGER_USERNAME="$username" node -p 'encodeURIComponent(process.env.HOSTINGER_USERNAME)')"
base="https://developers.hostinger.com/api/hosting/v1/accounts/${user_enc}/websites/${domain_enc}/nodejs"
code="$(curl --silent --show-error --location --connect-timeout 15 --max-time 45 --request POST -o "$RUNNER_TEMP/restart.json" -w '%{http_code}' -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H 'Accept: application/json' "$base/server/restart" || true)"
case "$code" in 200|201|202|204) echo "HOSTINGER_MANAGED_RESTART=PASS HTTP=$code";; *) cat "$RUNNER_TEMP/restart.json" 2>/dev/null || true; echo "::error::Managed restart rejected HTTP=$code"; exit 1;; esac

probe_one(){ local url="$1" out="$2" codefile="$3" code; code="$(curl --silent --show-error --location --connect-timeout 5 --max-time 9 -o "$out" -w '%{http_code}' "$url" || true)"; printf '%s' "$code" > "$codefile"; }
full_pass(){
  [ "$(cat "$RUNNER_TEMP/root.code")" = 200 ] && [ "$(cat "$RUNNER_TEMP/health.code")" = 200 ] && [ "$(cat "$RUNNER_TEMP/mini.code")" = 200 ] && [ "$(cat "$RUNNER_TEMP/gpt.code")" = 200 ] \
    && grep -Fq '"service":"CryptoWorldz Zed Bot"' "$RUNNER_TEMP/root.json" \
    && grep -Fq '"ok":true' "$RUNNER_TEMP/health.json" \
    && grep -Fq 'id="splashback"' "$RUNNER_TEMP/mini.html" \
    && grep -Fq 'id="zed-guide"' "$RUNNER_TEMP/mini.html" \
    && grep -Fq 'id="create"' "$RUNNER_TEMP/mini.html" \
    && grep -Fq 'id="heroes"' "$RUNNER_TEMP/mini.html" \
    && STATUS="$RUNNER_TEMP/gpt.json" node - <<'NODE'
const fs=require('fs'); const p=JSON.parse(fs.readFileSync(process.env.STATUS,'utf8'));
if(p.ok!==true||p.openai_api_configured!==true) process.exit(1);
if(p.guard_profile!=="oneworldz-public-low-cost-v1"||p.guard_enforced!==true) process.exit(1);
if(p.model!=="gpt-4o-mini"||p.max_output_tokens!==320) process.exit(1);
if(p.per_ip_limit_10m!==8||p.daily_request_limit!==1000) process.exit(1);
if(p.payments_in_chat!==false||p.secrets_in_browser!==false) process.exit(1);
NODE
}

for i in $(seq 1 15); do
  sleep 3
  tag="wallet_fix=${GITHUB_SHA}-${GITHUB_RUN_ID}-${i}"
  probe_one "https://$PROTECTED_DOMAIN/?$tag" "$RUNNER_TEMP/root.json" "$RUNNER_TEMP/root.code" & p1=$!
  probe_one "https://$PROTECTED_DOMAIN/health?$tag" "$RUNNER_TEMP/health.json" "$RUNNER_TEMP/health.code" & p2=$!
  probe_one "https://$PROTECTED_DOMAIN/miniapp/?$tag" "$RUNNER_TEMP/mini.html" "$RUNNER_TEMP/mini.code" & p3=$!
  probe_one "https://$PROTECTED_DOMAIN/api/oneworldz-gpt/status?$tag" "$RUNNER_TEMP/gpt.json" "$RUNNER_TEMP/gpt.code" & p4=$!
  wait "$p1" "$p2" "$p3" "$p4" || true
  if full_pass; then
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
  echo "ZED_CONVERGENCE attempt=$i root=$(cat "$RUNNER_TEMP/root.code") health=$(cat "$RUNNER_TEMP/health.code") mini=$(cat "$RUNNER_TEMP/mini.code") gpt=$(cat "$RUNNER_TEMP/gpt.code")"
done

echo '::error::ZED did not converge after targeted runtime repair and managed restart.'
exit 1
