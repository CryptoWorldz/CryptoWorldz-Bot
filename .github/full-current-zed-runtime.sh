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

python3 - <<'PY'
import ftplib, io, os, pathlib, posixpath, ssl, urllib.parse

raw=os.environ['FTP_HOST'].strip()
if '://' not in raw:
    raw='ftps://'+raw
u=urllib.parse.urlparse(raw)
host=u.hostname or os.environ['FTP_HOST'].strip().split('/')[0].split(':')[0]
port=int(os.environ.get('FTP_PORT') or u.port or 21)
root=os.environ['PROTECTED_NODE_ROOT'].rstrip('/')
ctx=ssl.create_default_context()
ctx.check_hostname=False
ftp=ftplib.FTP_TLS(context=ctx, timeout=60)
ftp.connect(host,port)
ftp.login(os.environ['FTP_USERNAME'],os.environ['FTP_PASSWORD'])
ftp.prot_p()

repo=pathlib.Path('.')
files=[]
for rel in ['index.js','package.json','package-lock.json']:
    p=repo/rel
    if p.is_file(): files.append((rel,p))
for base in ['src','public','.well-known']:
    base_path=repo/base
    if not base_path.exists(): continue
    for p in sorted(base_path.rglob('*')):
        if not p.is_file(): continue
        rel=p.relative_to(repo).as_posix()
        if rel.endswith('/.env') or rel == '.env' or rel.endswith('.log'):
            continue
        files.append((rel,p))

def cwd_root():
    ftp.cwd(root)

def ensure_dir(parent):
    cwd_root()
    if not parent or parent == '.':
        return
    for part in pathlib.PurePosixPath(parent).parts:
        if part in ('','.'):
            continue
        try:
            ftp.cwd(part)
        except ftplib.all_errors:
            ftp.mkd(part)
            ftp.cwd(part)

def upload(rel,path):
    parent=posixpath.dirname(rel)
    name=posixpath.basename(rel)
    ensure_dir(parent)
    tmp=name+'.oneworldz-new'
    try: ftp.delete(tmp)
    except ftplib.all_errors: pass
    data=path.read_bytes()
    ftp.storbinary('STOR '+tmp, io.BytesIO(data), blocksize=262144)
    try: ftp.delete(name)
    except ftplib.all_errors: pass
    ftp.rename(tmp,name)
    return len(data)

byte_total=0
for rel,p in files:
    byte_total += upload(rel,p)
print(f'ZED_FULL_RUNTIME_FTPS_SYNC=PASS files={len(files)} bytes={byte_total}')

critical=[
    'index.js',
    'package.json',
    'package-lock.json',
    'src/full-runtime-entry.js',
    'src/http.js',
    'src/oneworldz-gpt/http.js',
    'src/user-experience.js',
    'src/zed-guide.js',
    'public/miniapp/index.html',
    'public/miniapp/app.js',
    'public/miniapp/experience.js',
    '.well-known/openapi.yaml'
]
for rel in critical:
    local=(repo/rel)
    if not local.is_file():
        raise SystemExit('LOCAL_CRITICAL_FILE_MISSING:'+rel)
    parent=posixpath.dirname(rel)
    name=posixpath.basename(rel)
    ensure_dir(parent)
    buf=io.BytesIO()
    ftp.retrbinary('RETR '+name,buf.write,blocksize=262144)
    if buf.getvalue()!=local.read_bytes():
        raise SystemExit('REMOTE_BYTE_MISMATCH:'+rel)
print(f'ZED_CRITICAL_REMOTE_BYTES=PASS files={len(critical)}')
ftp.quit()
PY

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
