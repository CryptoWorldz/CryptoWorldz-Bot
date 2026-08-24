#!/usr/bin/env bash
set -Eeuo pipefail

: "${FTP_HOST:?}"
: "${FTP_USERNAME:?}"
: "${FTP_PASSWORD:?}"
: "${FTP_PORT:?}"
: "${GITHUB_WORKSPACE:?}"
: "${GITHUB_RUN_ID:?}"
: "${GITHUB_SHA:?}"

for value in "$FTP_HOST" "$FTP_USERNAME" "$FTP_PASSWORD"; do echo "::add-mask::$value"; done

IFS=$'\t' read -r key domain transport guard title < <(
  node --input-type=module <<'NODE'
import { productionTargets } from './apps/oneworldz-ecosystem-release/production-targets.mjs';
const target = productionTargets.find((item) => item.key === 'cryptoworldz');
if (!target) throw new Error('CryptoWorldz production target missing');
console.log([target.key, target.domain, target.hostingerTransportDir, target.guard, target.expectedTitle].join('\t'));
NODE
)

test "$key" = 'cryptoworldz'
test "$domain" = 'cryptoworldz.xyz'
test "$transport" = 'domains/cryptoworldz.xyz/public_html'

release_root="$GITHUB_WORKSPACE/apps/oneworldz-ecosystem-release/dist/ecosystem/cryptoworldz"
test -s "$release_root/index.html"
test -s "$release_root/release-manifest.json"

host="$(printf '%s' "$FTP_HOST" | sed -e 's#^ftp[s]*://##' -e 's#/.*$##')"
if [[ "$host" != *:*:* && "$host" == *:* ]]; then host="${host%%:*}"; fi

proof_root="$RUNNER_TEMP/cryptoworldz-only"
backup="$proof_root/backup"
postwrite="$proof_root/postwrite"
mkdir -p "$backup" "$postwrite" deployment-proof

files="$proof_root/files.txt"
nonindex="$proof_root/nonindex.txt"
dirs="$proof_root/dirs.txt"
existing="$proof_root/existing.txt"
(cd "$release_root" && find . -type f -printf '%P\n' | sort) > "$files"
test -s "$files"
grep -Fxq 'index.html' "$files"
grep -v '^index\.html$' "$files" > "$nonindex" || true
while IFS= read -r rel; do d="$(dirname "$rel")"; [ "$d" = '.' ] || echo "$d"; done < "$files" | sort -u > "$dirs"

remote_before="$proof_root/remote-before-index.html"
public_before="$proof_root/public-before-index.html"
cat > "$proof_root/prewrite.lftp" <<EOF
set cmd:fail-exit true
set net:max-retries 2
set net:timeout 30
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate true
set ssl:check-hostname false
cd "$transport"
pwd
cls -la
get "index.html" -o "$remote_before"
bye
EOF

timeout 300 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $proof_root/prewrite.lftp" "$host"
curl --fail --silent --show-error --location --connect-timeout 15 --max-time 45 \
  -H 'Cache-Control: no-cache, no-store, max-age=0' -H 'Pragma: no-cache' \
  "https://$domain/?cryptoworldz_prewrite=$GITHUB_RUN_ID" -o "$public_before"
cmp -s "$remote_before" "$public_before"
echo "CRYPTOWORLDZ_DESTINATION_PROVED $domain -> $transport"

while IFS= read -r rel; do mkdir -p "$backup/$(dirname "$rel")"; done < "$files"
{
  echo 'set cmd:fail-exit false'
  echo 'set net:max-retries 2'
  echo 'set net:timeout 30'
  echo 'set ftp:ssl-force true'
  echo 'set ftp:ssl-protect-data true'
  echo 'set ssl:verify-certificate true'
  echo 'set ssl:check-hostname false'
  printf 'cd "%s"\n' "$transport"
  while IFS= read -r rel; do printf 'get "%s" -o "%s"\n' "$rel" "$backup/$rel"; done < "$files"
  echo 'bye'
} > "$proof_root/backup.lftp"
timeout 600 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $proof_root/backup.lftp" "$host"
(cd "$backup" && find . -type f -printf '%P\n' | sort) > "$existing"

rollback() {
  echo "::warning::Rolling back CryptoWorldz only. No other Hostinger destination is touched."
  {
    echo 'set cmd:fail-exit false'
    echo 'set net:max-retries 2'
    echo 'set net:timeout 30'
    echo 'set ftp:ssl-force true'
    echo 'set ftp:ssl-protect-data true'
    echo 'set ssl:verify-certificate true'
    echo 'set ssl:check-hostname false'
    printf 'cd "%s"\n' "$transport"
    while IFS= read -r rel; do printf 'rm -f "%s"\n' "$rel"; done < "$files"
    while IFS= read -r dir; do [ -n "$dir" ] && printf 'mkdir -p "%s"\n' "$dir"; done < "$dirs"
    printf 'lcd "%s"\n' "$backup"
    while IFS= read -r rel; do [ "$rel" = 'index.html' ] || printf 'put "%s" -o "%s"\n' "$rel" "$rel"; done < "$existing"
    if grep -Fxq 'index.html' "$existing"; then echo 'put "index.html" -o "index.html"'; fi
    echo 'bye'
  } > "$proof_root/rollback.lftp"
  timeout 900 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $proof_root/rollback.lftp" "$host" || true
}
trap 'status=$?; if [ "$status" -ne 0 ]; then rollback; fi; exit "$status"' EXIT

{
  echo 'set cmd:fail-exit true'
  echo 'set net:max-retries 2'
  echo 'set net:timeout 30'
  echo 'set ftp:ssl-force true'
  echo 'set ftp:ssl-protect-data true'
  echo 'set ssl:verify-certificate true'
  echo 'set ssl:check-hostname false'
  printf 'cd "%s"\n' "$transport"
  while IFS= read -r dir; do [ -n "$dir" ] && printf 'mkdir -p "%s"\n' "$dir"; done < "$dirs"
  printf 'lcd "%s"\n' "$release_root"
  while IFS= read -r rel; do printf 'put "%s" -o "%s"\n' "$rel" "$rel"; done < "$nonindex"
  echo 'put "index.html" -o "index.html"'
  echo 'bye'
} > "$proof_root/upload.lftp"
timeout 900 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $proof_root/upload.lftp" "$host"

while IFS= read -r rel; do mkdir -p "$postwrite/$(dirname "$rel")"; done < "$files"
{
  echo 'set cmd:fail-exit true'
  echo 'set net:max-retries 2'
  echo 'set net:timeout 30'
  echo 'set ftp:ssl-force true'
  echo 'set ftp:ssl-protect-data true'
  echo 'set ssl:verify-certificate true'
  echo 'set ssl:check-hostname false'
  printf 'cd "%s"\n' "$transport"
  while IFS= read -r rel; do printf 'get "%s" -o "%s"\n' "$rel" "$postwrite/$rel"; done < "$files"
  echo 'bye'
} > "$proof_root/readback.lftp"
timeout 900 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $proof_root/readback.lftp" "$host"
while IFS= read -r rel; do cmp -s "$release_root/$rel" "$postwrite/$rel"; done < "$files"

public_index="$proof_root/public-index.html"
public_manifest="$proof_root/public-release-manifest.json"
proved=0
for attempt in $(seq 1 12); do
  rm -f "$public_index" "$public_manifest"
  if curl --fail --silent --show-error --location --connect-timeout 15 --max-time 45 \
      -H 'Cache-Control: no-cache, no-store, max-age=0' -H 'Pragma: no-cache' \
      "https://$domain/?cryptoworldz_release=$GITHUB_RUN_ID-$attempt" -o "$public_index" \
    && curl --fail --silent --show-error --location --connect-timeout 15 --max-time 45 \
      -H 'Cache-Control: no-cache, no-store, max-age=0' -H 'Pragma: no-cache' \
      "https://$domain/release-manifest.json?cryptoworldz_release=$GITHUB_RUN_ID-$attempt" -o "$public_manifest" \
    && cmp -s "$release_root/index.html" "$public_index" \
    && cmp -s "$release_root/release-manifest.json" "$public_manifest"; then
    proved=1
    break
  fi
  sleep 4
done
test "$proved" = '1'

printf 'target\tdomain\tstatus\n%s\t%s\t%s\n' "$key" "$domain" 'DEPLOYED_AND_BYTE_PROVED' > deployment-proof/cryptoworldz-only-status.tsv
cp "$files" deployment-proof/cryptoworldz-only-files.txt
printf 'run_id=%s\ncommit=%s\ndomain=%s\ntransport=%s\nexpected_title=%s\n' "$GITHUB_RUN_ID" "$GITHUB_SHA" "$domain" "$transport" "$title" > deployment-proof/cryptoworldz-only-proof.txt

echo "CRYPTOWORLDZ_ONLY_HOSTINGER_DEPLOYMENT=PASS domain=$domain files=$(wc -l < "$files" | tr -d ' ')"
trap - EXIT
