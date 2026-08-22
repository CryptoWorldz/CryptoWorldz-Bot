#!/usr/bin/env bash
set -euo pipefail

: "${FTP_HOST:?}"
: "${FTP_USERNAME:?}"
: "${FTP_PASSWORD:?}"
: "${FTP_PORT:?}"

for value in "$FTP_HOST" "$FTP_USERNAME" "$FTP_PASSWORD"; do echo "::add-mask::$value"; done

root="$GITHUB_WORKSPACE/apps/oneworldz-ecosystem-release/dist/ecosystem"
test -d "$root"

node --input-type=module <<'NODE' > "$RUNNER_TEMP/targets.tsv"
import { productionTargets } from './apps/oneworldz-ecosystem-release/production-targets.mjs';
for (const target of productionTargets) {
  console.log([target.key, target.domain, target.hostingerTransportDir].join('\t'));
}
NODE

test -s "$RUNNER_TEMP/targets.tsv"

host="$(printf '%s' "$FTP_HOST" | sed -e 's#^ftp[s]*://##' -e 's#/.*$##')"
if [[ "$host" != *:*:* && "$host" == *:* ]]; then host="${host%%:*}"; fi

while IFS=$'\t' read -r key domain transport; do
  release_root="$root/$key"
  test -s "$release_root/index.html"
  test -s "$release_root/release-manifest.json"

  files="$RUNNER_TEMP/$key.files"
  dirs="$RUNNER_TEMP/$key.dirs"
  (cd "$release_root" && find . -type f -printf '%P\n' | sort) > "$files"
  grep -Fxq 'index.html' "$files"
  while IFS= read -r rel; do
    dir="$(dirname "$rel")"
    [ "$dir" = '.' ] || echo "$dir"
  done < "$files" | sort -u > "$dirs"

  {
    echo 'set cmd:fail-exit true'
    echo 'set net:max-retries 2'
    echo 'set net:timeout 30'
    echo 'set ftp:ssl-force true'
    echo 'set ftp:ssl-protect-data true'
    echo 'set ssl:verify-certificate true'
    echo 'set ssl:check-hostname false'
    printf 'cd "%s"\n' "$transport"
    printf 'lcd "%s"\n' "$release_root"
    while IFS= read -r dir; do [ -n "$dir" ] && printf 'mkdir -p "%s"\n' "$dir"; done < "$dirs"
    while IFS= read -r rel; do
      [ "$rel" = 'index.html' ] || printf 'put "%s" -o "%s"\n' "$rel" "$rel"
    done < "$files"
    echo 'put "index.html" -o "index.html"'
    echo 'bye'
  } > "$RUNNER_TEMP/$key.deploy.lftp"

  timeout 900 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $RUNNER_TEMP/$key.deploy.lftp" "$host"

  curl --fail --silent --show-error --location --connect-timeout 15 --max-time 45 \
    -H 'Cache-Control: no-cache, no-store, max-age=0' \
    "https://$domain/?release=${GITHUB_SHA}-${GITHUB_RUN_ID}-${key}" \
    -o "$RUNNER_TEMP/$key.live.html"

  echo "DEPLOYED https://$domain/"
done < "$RUNNER_TEMP/targets.tsv"

echo 'HOSTINGER_STATIC_DEPLOYMENT=PASS'
