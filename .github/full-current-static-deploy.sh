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
if (productionTargets.length !== 18) throw new Error(`Expected 18 static targets, got ${productionTargets.length}`);
for (const target of productionTargets) {
  if (/cryptobotz|\/nodejs/.test(target.hostingerTransportDir)) throw new Error(`Protected ZED path leaked into static targets: ${target.key}`);
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
  test -s "$release_root/exact-visual-map.json"

  files="$RUNNER_TEMP/$key.files"
  dirs="$RUNNER_TEMP/$key.dirs"
  (cd "$release_root" && find . -type f -printf '%P\n' | sort) > "$files"
  grep -Fxq 'index.html' "$files"
  while IFS= read -r rel; do
    dir="$(dirname "$rel")"
    [ "$dir" = '.' ] || echo "$dir"
  done < "$files" | sort -u > "$dirs"

  purge_line='purge-contents'
  # OneWorldz owns the root site, while these sibling subdomain directories are
  # independent static targets (or a separately managed sibling). Never delete
  # them as collateral damage during the root cleanup.
  if [ "$key" = 'oneworldz' ]; then
    purge_line='purge-contents impactbased law learn nextbigcoin'
  fi

  {
    echo 'set cmd:fail-exit true'
    echo 'set net:max-retries 2'
    echo 'set net:timeout 30'
    echo 'set ftp:ssl-force true'
    echo 'set ftp:ssl-protect-data true'
    echo 'set ssl:verify-certificate true'
    echo 'set ssl:check-hostname false'
    printf 'cd "%s"\n' "$transport"
    echo 'pwd'
    echo "$purge_line"
    printf 'lcd "%s"\n' "$release_root"
    while IFS= read -r dir; do [ -n "$dir" ] && printf 'mkdir -p "%s"\n' "$dir"; done < "$dirs"
    while IFS= read -r rel; do
      [ "$rel" = 'index.html' ] || printf 'put "%s" -o "%s"\n' "$rel" "$rel"
    done < "$files"
    # index.html goes last so a partially uploaded tree is never advertised as complete.
    echo 'put "index.html" -o "index.html"'
    echo 'bye'
  } > "$RUNNER_TEMP/$key.deploy.lftp"

  timeout 900 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $RUNNER_TEMP/$key.deploy.lftp" "$host"

  curl --fail --silent --show-error --location --connect-timeout 15 --max-time 45 \
    -H 'Cache-Control: no-cache, no-store, max-age=0' \
    "https://$domain/?release=${GITHUB_SHA}-${GITHUB_RUN_ID}-${key}" \
    -o "$RUNNER_TEMP/$key.live.html"

  local_sha="$(sha256sum "$release_root/index.html" | awk '{print $1}')"
  live_sha="$(sha256sum "$RUNNER_TEMP/$key.live.html" | awk '{print $1}')"
  if [ "$local_sha" != "$live_sha" ]; then
    echo "LIVE_INDEX_SHA_MISMATCH $key expected=$local_sha actual=$live_sha" >&2
    exit 1
  fi
  echo "DEPLOYED_AND_BYTE_PROVED https://$domain/"
done < "$RUNNER_TEMP/targets.tsv"

echo 'HOSTINGER_STATIC_CLEAN_DEPLOYMENT=PASS'
