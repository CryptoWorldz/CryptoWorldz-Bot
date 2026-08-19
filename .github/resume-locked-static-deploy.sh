#!/usr/bin/env bash
set -euo pipefail

: "${FTP_HOST:?}"
: "${FTP_USERNAME:?}"
: "${FTP_PASSWORD:?}"
: "${FTP_PORT:?}"
: "${LOCKED_STATIC_TREE:?}"

for value in "$FTP_HOST" "$FTP_USERNAME" "$FTP_PASSWORD"; do echo "::add-mask::$value"; done

state='deployments/oneworldz-19-total.request'
grep -Fq 'hostinger_destination_pass=PASS_AUTHENTICATED_READ_ONLY_18_TARGET_REVALIDATION' "$state"
grep -Fq 'impactbased_exact_new_root_authentication=PASS_AUTHENTICATED_FTPS_CD_LIST_GET' "$state"
grep -Fq 'impactbased_public_https=PASS_HTTP_200' "$state"

node --input-type=module <<'NODE' > "$RUNNER_TEMP/targets.tsv"
import { productionTargets } from './apps/oneworldz-ecosystem-release/production-targets.mjs';
for (const target of productionTargets) {
  console.log([target.key,target.domain,target.hostingerTransportDir,target.guard,target.expectedTitle].join('\t'));
}
NODE
test "$(wc -l < "$RUNNER_TEMP/targets.tsv" | tr -d ' ')" = '18'
grep -F $'impactbased\timpactbased.oneworldz.com\tdomains/oneworldz.com/public_html/impactbased' "$RUNNER_TEMP/targets.tsv"
! grep -F 'domains/cryptoworldz.xyz/public_html/impactbased' "$RUNNER_TEMP/targets.tsv"

host="$(printf '%s' "$FTP_HOST" | sed -e 's#^ftp[s]*://##' -e 's#/.*$##')"
if [[ "$host" != *:*:* && "$host" == *:* ]]; then host="${host%%:*}"; fi
proofdir="$RUNNER_TEMP/destination-proof"
mkdir -p "$proofdir"

{
  echo 'set cmd:fail-exit true'
  echo 'set net:max-retries 2'
  echo 'set net:timeout 30'
  echo 'set ftp:ssl-force true'
  echo 'set ftp:ssl-protect-data true'
  echo 'set ssl:verify-certificate true'
  echo 'set ssl:check-hostname false'
  while IFS=$'\t' read -r key domain transport guard title; do
    printf 'cd "%s"\n' "$transport"
    echo 'pwd'
    echo 'cls -la'
    echo 'set cmd:fail-exit false'
    printf 'get "robots.txt" -o "%s/%s.remote.robots.txt"\n' "$proofdir" "$key"
    echo 'set cmd:fail-exit true'
    echo 'cd /'
  done < "$RUNNER_TEMP/targets.tsv"
  echo 'bye'
} > "$RUNNER_TEMP/prewrite.lftp"
timeout 900 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $RUNNER_TEMP/prewrite.lftp" "$host"

while IFS=$'\t' read -r key domain transport guard title; do
  remote="$proofdir/$key.remote.robots.txt"
  live="$proofdir/$key.live.robots.txt"
  if [ "$key" = 'impactbased' ] && [ ! -s "$remote" ]; then
    curl --fail --silent --show-error --location --connect-timeout 15 --max-time 45 \
      -H 'Cache-Control: no-cache, no-store' "https://$domain/?destination_proof=${GITHUB_RUN_ID}-${key}" \
      -o "$proofdir/$key.live.html"
    echo "DESTINATION_PROVED_COMPOSITE $domain -> $transport"
    continue
  fi
  test -s "$remote"
  proved=0
  for attempt in $(seq 1 8); do
    if curl --fail --silent --show-error --location --connect-timeout 15 --max-time 45 \
      -H 'Cache-Control: no-cache, no-store' -H 'Pragma: no-cache' \
      "https://$domain/robots.txt?destination_proof=${GITHUB_RUN_ID}-${key}-${attempt}" -o "$live"; then
      if cmp -s "$remote" "$live"; then proved=1; break; fi
    fi
    sleep 5
  done
  if [ "$proved" != '1' ]; then
    echo "::error::Destination proof failed for $domain -> $transport. No production write."
    exit 1
  fi
  echo "DESTINATION_PROVED $domain -> $transport"
done < "$RUNNER_TEMP/targets.tsv"

echo 'HOSTINGER_18_DESTINATION_PREWRITE_PROOF=PASS'

: > "$RUNNER_TEMP/touched.tsv"
failure=0
failed_key=''

while IFS=$'\t' read -r key domain transport guard title; do
  release_root="$GITHUB_WORKSPACE/apps/oneworldz-ecosystem-release/dist/ecosystem/$key"
  files="$RUNNER_TEMP/$key.files"
  nonindex="$RUNNER_TEMP/$key.nonindex"
  dirs="$RUNNER_TEMP/$key.dirs"
  existing="$RUNNER_TEMP/$key.existing"
  backup="$RUNNER_TEMP/backups/$key"
  postwrite="$RUNNER_TEMP/postwrite/$key"
  mkdir -p "$backup" "$postwrite"

  if ! (
    set -euo pipefail
    test -s "$release_root/index.html"
    test -s "$release_root/release-manifest.json"
    node -e 'const fs=require("fs"); const [manifestPath,guard]=process.argv.slice(1); const m=JSON.parse(fs.readFileSync(manifestPath,"utf8")); if(m.deploy_guard!==guard||m.ftp_root!=="/"||m.homepage!=="/index.html"||m.assets_root!=="/assets/") throw new Error("release destination contract mismatch"); if((m.protected_services_modified||[]).length) throw new Error("protected-service mutation declared");' "$release_root/release-manifest.json" "$guard"
    (cd "$release_root" && find . -type f -printf '%P\n' | sort) > "$files"
    test -s "$files"
    grep -Fxq 'index.html' "$files"
    ! grep -Eq '^/|(^|/)\.\.(/|$)' "$files"
    grep -v '^index\.html$' "$files" > "$nonindex" || true
    while IFS= read -r rel; do d="$(dirname "$rel")"; [ "$d" = '.' ] || echo "$d"; done < "$files" | sort -u > "$dirs"
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
    } > "$RUNNER_TEMP/$key.backup.lftp"
    timeout 600 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $RUNNER_TEMP/$key.backup.lftp" "$host"
    (cd "$backup" && find . -type f -printf '%P\n' | sort) > "$existing"

    printf '%s\t%s\t%s\t%s\n' "$key" "$domain" "$transport" "$title" >> "$RUNNER_TEMP/touched.tsv"

    {
      echo 'set cmd:fail-exit false'
      echo 'set net:max-retries 3'
      echo 'set net:timeout 30'
      echo 'set ftp:ssl-force true'
      echo 'set ftp:ssl-protect-data true'
      echo 'set ssl:verify-certificate true'
      echo 'set ssl:check-hostname false'
      printf 'cd "%s"\n' "$transport"
      while IFS= read -r rel; do printf 'rm -f "%s"\n' "$rel"; done < "$files"
      printf 'lcd "%s"\n' "$release_root"
      while IFS= read -r dir; do [ -n "$dir" ] && printf 'mkdir -p "%s"\n' "$dir"; done < "$dirs"
      echo 'set cmd:fail-exit true'
      while IFS= read -r rel; do printf 'put "%s" -o "%s"\n' "$rel" "$rel"; done < "$nonindex"
      echo 'put "index.html" -o "index.html"'
      echo 'bye'
    } > "$RUNNER_TEMP/$key.upload.lftp"
    timeout 900 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $RUNNER_TEMP/$key.upload.lftp" "$host"

    rm -f "$postwrite/index.html" "$postwrite/release-manifest.json"
    {
      echo 'set cmd:fail-exit true'
      echo 'set net:max-retries 2'
      echo 'set net:timeout 30'
      echo 'set ftp:ssl-force true'
      echo 'set ftp:ssl-protect-data true'
      echo 'set ssl:verify-certificate true'
      echo 'set ssl:check-hostname false'
      printf 'cd "%s"\n' "$transport"
      printf 'get "index.html" -o "%s/index.html"\n' "$postwrite"
      printf 'get "release-manifest.json" -o "%s/release-manifest.json"\n' "$postwrite"
      echo 'bye'
    } > "$RUNNER_TEMP/$key.postwrite.lftp"
    timeout 300 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $RUNNER_TEMP/$key.postwrite.lftp" "$host"
    cmp -s "$release_root/index.html" "$postwrite/index.html"
    cmp -s "$release_root/release-manifest.json" "$postwrite/release-manifest.json"

    public_index="$RUNNER_TEMP/$key.public.index.html"
    public_manifest="$RUNNER_TEMP/$key.public.release-manifest.json"
    proved=0
    for attempt in $(seq 1 18); do
      rm -f "$public_index" "$public_manifest"
      if curl --fail --silent --show-error --location --connect-timeout 15 --max-time 45 \
          -H 'Cache-Control: no-cache, no-store, max-age=0' -H 'Pragma: no-cache' \
          "https://$domain/?release=${GITHUB_SHA}-${GITHUB_RUN_ID}-${key}-${attempt}" -o "$public_index" \
        && curl --fail --silent --show-error --location --connect-timeout 15 --max-time 45 \
          -H 'Cache-Control: no-cache, no-store, max-age=0' -H 'Pragma: no-cache' \
          "https://$domain/release-manifest.json?release=${GITHUB_SHA}-${GITHUB_RUN_ID}-${key}-${attempt}" -o "$public_manifest"; then
        if cmp -s "$release_root/index.html" "$public_index" && cmp -s "$release_root/release-manifest.json" "$public_manifest"; then
          proved=1
          break
        fi
      fi
      sleep 10
    done
    test "$proved" = '1'
    grep -Fq 'Created with the Vision' "$public_index"
    grep -Fq "Why can't I?" "$public_index"
    ! grep -Eiq 'Created by JayJayTeamDev|Designed by JayJayTeamDev' "$public_index"
    echo "DEPLOYED_AND_EXACT_PUBLIC_BYTES_PROVED https://$domain/"
  ); then
    failure=1
    failed_key="$key"
    break
  fi
done < "$RUNNER_TEMP/targets.tsv"

if [ "$failure" = '1' ]; then
  echo "::error::Deployment failed at $failed_key. Rolling back every touched target."
  rollback_failed=0
  while IFS=$'\t' read -r key domain transport title; do
    files="$RUNNER_TEMP/$key.files"
    dirs="$RUNNER_TEMP/$key.dirs"
    existing="$RUNNER_TEMP/$key.existing"
    backup="$RUNNER_TEMP/backups/$key"
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
      echo 'set cmd:fail-exit true'
      printf 'lcd "%s"\n' "$backup"
      while IFS= read -r rel; do [ "$rel" = 'index.html' ] || printf 'put "%s" -o "%s"\n' "$rel" "$rel"; done < "$existing"
      if grep -Fxq 'index.html' "$existing"; then echo 'put "index.html" -o "index.html"'; fi
      echo 'bye'
    } > "$RUNNER_TEMP/$key.rollback.lftp"
    timeout 900 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $RUNNER_TEMP/$key.rollback.lftp" "$host" || rollback_failed=1
  done < <(tac "$RUNNER_TEMP/touched.tsv")
  [ "$rollback_failed" = '0' ] || echo '::error::At least one rollback command failed.'
  exit 1
fi

test "$(wc -l < "$RUNNER_TEMP/touched.tsv" | tr -d ' ')" = '18'
mkdir -p deployment-proof
cp "$RUNNER_TEMP/touched.tsv" deployment-proof/touched.tsv
printf 'run_id=%s\nstatic_tree=%s\nproof=EXACT_FTPS_AND_PUBLIC_INDEX_MANIFEST_BYTES\n' "$GITHUB_RUN_ID" "$LOCKED_STATIC_TREE" > deployment-proof/release.txt
bash .github/publish-progress.sh HOSTINGER PASS
echo 'HOSTINGER_18_SITE_DEPLOYMENT=PASS'
