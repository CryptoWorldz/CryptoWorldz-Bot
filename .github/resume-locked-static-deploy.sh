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
    printf 'get "index.html" -o "%s/%s.remote.index.html"\n' "$proofdir" "$key"
    echo 'set cmd:fail-exit true'
    echo 'cd /'
  done < "$RUNNER_TEMP/targets.tsv"
  echo 'bye'
} > "$RUNNER_TEMP/prewrite.lftp"
timeout 900 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" -e "source $RUNNER_TEMP/prewrite.lftp" "$host"

prewrite_failures=0
: > "$RUNNER_TEMP/prewrite-failures.tsv"
while IFS=$'\t' read -r key domain transport guard title; do
  remote_robots="$proofdir/$key.remote.robots.txt"
  remote_index="$proofdir/$key.remote.index.html"
  live_robots="$proofdir/$key.live.robots.txt"
  live_index="$proofdir/$key.live.index.html"
  proved=0
  proof_kind=''

  if [ -s "$remote_robots" ]; then
    for attempt in $(seq 1 8); do
      rm -f "$live_robots"
      if curl --fail --silent --show-error --location --connect-timeout 15 --max-time 45 \
        -H 'Cache-Control: no-cache, no-store' -H 'Pragma: no-cache' \
        "https://$domain/robots.txt?destination_proof=${GITHUB_RUN_ID}-${key}-${attempt}" -o "$live_robots"; then
        if cmp -s "$remote_robots" "$live_robots"; then
          proved=1
          proof_kind='ROBOTS_BYTE_MATCH'
          break
        fi
      fi
      sleep 3
    done
  fi

  if [ "$proved" != '1' ] && [ -s "$remote_index" ]; then
    for attempt in $(seq 1 8); do
      rm -f "$live_index"
      if curl --fail --silent --show-error --location --connect-timeout 15 --max-time 45 \
        -H 'Cache-Control: no-cache, no-store' -H 'Pragma: no-cache' \
        "https://$domain/?destination_proof=${GITHUB_RUN_ID}-${key}-${attempt}" -o "$live_index"; then
        if cmp -s "$remote_index" "$live_index"; then
          proved=1
          proof_kind='INDEX_BYTE_MATCH'
          break
        fi
      fi
      sleep 3
    done
  fi

  if [ "$proved" != '1' ] && [ ! -s "$remote_robots" ] && [ ! -s "$remote_index" ]; then
    probe_name="oneworldz-destination-proof-${GITHUB_RUN_ID}-${key}.txt"
    probe_local="$proofdir/$key.route-probe.txt"
    probe_live="$proofdir/$key.live.route-probe.txt"
    printf 'ONEWORLDZ_DESTINATION_PROOF\ncommit=%s\nrun=%s\ntarget=%s\ndomain=%s\ntransport=%s\n' \
      "$GITHUB_SHA" "$GITHUB_RUN_ID" "$key" "$domain" "$transport" > "$probe_local"

    {
      echo 'set cmd:fail-exit true'
      echo 'set net:max-retries 2'
      echo 'set net:timeout 30'
      echo 'set ftp:ssl-force true'
      echo 'set ftp:ssl-protect-data true'
      echo 'set ssl:verify-certificate true'
      echo 'set ssl:check-hostname false'
      printf 'cd "%s"\n' "$transport"
      printf 'lcd "%s"\n' "$proofdir"
      printf 'put "%s" -o "%s"\n' "$(basename "$probe_local")" "$probe_name"
      echo 'bye'
    } > "$RUNNER_TEMP/$key.route-probe-put.lftp"

    probe_uploaded=0
    if timeout 300 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" \
      -e "source $RUNNER_TEMP/$key.route-probe-put.lftp" "$host"; then
      probe_uploaded=1
      for attempt in $(seq 1 8); do
        rm -f "$probe_live"
        if curl --fail --silent --show-error --location --connect-timeout 15 --max-time 45 \
          -H 'Cache-Control: no-cache, no-store, max-age=0' -H 'Pragma: no-cache' \
          "https://$domain/$probe_name?destination_proof=${GITHUB_RUN_ID}-${key}-${attempt}" -o "$probe_live"; then
          if cmp -s "$probe_local" "$probe_live"; then
            proved=1
            proof_kind='REVERSIBLE_ROUTE_PROBE_BYTE_MATCH'
            break
          fi
        fi
        sleep 3
      done
    fi

    {
      echo 'set cmd:fail-exit false'
      echo 'set net:max-retries 2'
      echo 'set net:timeout 30'
      echo 'set ftp:ssl-force true'
      echo 'set ftp:ssl-protect-data true'
      echo 'set ssl:verify-certificate true'
      echo 'set ssl:check-hostname false'
      printf 'cd "%s"\n' "$transport"
      printf 'rm -f "%s"\n' "$probe_name"
      echo 'bye'
    } > "$RUNNER_TEMP/$key.route-probe-cleanup.lftp"
    timeout 300 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" \
      -e "source $RUNNER_TEMP/$key.route-probe-cleanup.lftp" "$host" \
      || echo "::warning::Route-probe cleanup command reported failure for $domain"

    if [ "$probe_uploaded" = '1' ] && [ "$proved" = '1' ]; then
      echo "DESTINATION_ROUTE_PROBE_REMOVED $domain -> $transport"
    fi
  fi

  if [ "$proved" != '1' ] && [ "$key" = 'impactbased' ]; then
    if curl --fail --silent --show-error --location --connect-timeout 15 --max-time 45 \
      -H 'Cache-Control: no-cache, no-store' "https://$domain/?destination_proof=${GITHUB_RUN_ID}-${key}-composite" \
      -o "$live_index"; then
      proved=1
      proof_kind='COMPOSITE_AUTHENTICATED_ROOT_PLUS_PUBLIC_HTTPS'
    fi
  fi

  if [ "$proved" != '1' ]; then
    echo "::error::Destination proof failed for $domain -> $transport. No release deployment."
    printf '%s\t%s\t%s\n' "$key" "$domain" "$transport" >> "$RUNNER_TEMP/prewrite-failures.tsv"
    prewrite_failures=$((prewrite_failures + 1))
    continue
  fi
  echo "DESTINATION_PROVED_${proof_kind} $domain -> $transport"
done < "$RUNNER_TEMP/targets.tsv"

if [ "$prewrite_failures" -ne 0 ]; then
  echo "::error::Hostinger prewrite proof failed for $prewrite_failures destination(s); all failures were collected before refusing release deployment."
  cat "$RUNNER_TEMP/prewrite-failures.tsv"
  exit 1
fi

echo 'HOSTINGER_18_DESTINATION_PREWRITE_PROOF=PASS'

mkdir -p deployment-proof
: > "$RUNNER_TEMP/touched.tsv"
: > "$RUNNER_TEMP/deploy-status.tsv"

rollback_target() {
  local key="$1" domain="$2" transport="$3"
  local files="$RUNNER_TEMP/$key.files"
  local dirs="$RUNNER_TEMP/$key.dirs"
  local existing="$RUNNER_TEMP/$key.existing"
  local backup="$RUNNER_TEMP/backups/$key"

  echo "::warning::Rolling back failed target only: $domain -> $transport"
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

  timeout 900 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" \
    -e "source $RUNNER_TEMP/$key.rollback.lftp" "$host"
}

while IFS=$'\t' read -r key domain transport guard title; do
  release_root="$GITHUB_WORKSPACE/apps/oneworldz-ecosystem-release/dist/ecosystem/$key"
  files="$RUNNER_TEMP/$key.files"
  nonindex="$RUNNER_TEMP/$key.nonindex"
  dirs="$RUNNER_TEMP/$key.dirs"
  existing="$RUNNER_TEMP/$key.existing"
  backup="$RUNNER_TEMP/backups/$key"
  postwrite="$RUNNER_TEMP/postwrite/$key"
  public_index="$RUNNER_TEMP/$key.public.index.html"
  public_manifest="$RUNNER_TEMP/$key.public.release-manifest.json"
  mkdir -p "$backup" "$postwrite"

  test -s "$release_root/index.html"
  test -s "$release_root/release-manifest.json"
  node -e 'const fs=require("fs"); const [manifestPath,guard]=process.argv.slice(1); const m=JSON.parse(fs.readFileSync(manifestPath,"utf8")); if(m.deploy_guard!==guard||m.ftp_root!=="/"||m.homepage!=="/index.html"||m.assets_root!=="/assets/") throw new Error("release destination contract mismatch"); if((m.protected_services_modified||[]).length) throw new Error("protected-service mutation declared");' "$release_root/release-manifest.json" "$guard"
  (cd "$release_root" && find . -type f -printf '%P\n' | sort) > "$files"
  test -s "$files"
  grep -Fxq 'index.html' "$files"
  ! grep -Eq '^/|(^|/)\.\.(/|$)' "$files"
  grep -v '^index\.html$' "$files" > "$nonindex" || true
  while IFS= read -r rel; do d="$(dirname "$rel")"; [ "$d" = '.' ] || echo "$d"; done < "$files" | sort -u > "$dirs"

  # Resume support: if this exact candidate is already public, do not back up,
  # upload or re-prove it again. Previous successful targets therefore survive
  # a later target failure and the next run resumes automatically.
  already_current=0
  for attempt in 1 2 3; do
    rm -f "$public_index" "$public_manifest"
    if curl --fail --silent --show-error --location --connect-timeout 10 --max-time 30 \
        -H 'Cache-Control: no-cache, no-store, max-age=0' -H 'Pragma: no-cache' \
        "https://$domain/?resume=${LOCKED_STATIC_TREE}-${key}-${attempt}" -o "$public_index" \
      && curl --fail --silent --show-error --location --connect-timeout 10 --max-time 30 \
        -H 'Cache-Control: no-cache, no-store, max-age=0' -H 'Pragma: no-cache' \
        "https://$domain/release-manifest.json?resume=${LOCKED_STATIC_TREE}-${key}-${attempt}" -o "$public_manifest"; then
      if cmp -s "$release_root/index.html" "$public_index" \
        && cmp -s "$release_root/release-manifest.json" "$public_manifest"; then
        already_current=1
        break
      fi
    fi
    sleep 2
  done

  if [ "$already_current" = '1' ]; then
    printf '%s\t%s\t%s\t%s\n' "$key" "$domain" "$transport" "$title" >> "$RUNNER_TEMP/touched.tsv"
    printf '%s\t%s\tALREADY_CURRENT\n' "$key" "$domain" >> "$RUNNER_TEMP/deploy-status.tsv"
    echo "DEPLOY_RESUME_SKIP_ALREADY_CURRENT https://$domain/"
    continue
  fi

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

  if ! timeout 600 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" \
    -e "source $RUNNER_TEMP/$key.backup.lftp" "$host"; then
    printf '%s\t%s\tBACKUP_FAILED\n' "$key" "$domain" >> "$RUNNER_TEMP/deploy-status.tsv"
    cp "$RUNNER_TEMP/deploy-status.tsv" deployment-proof/deploy-status.tsv
    echo "::error::Backup failed before any write for $domain. Previous successful targets are preserved."
    exit 1
  fi
  (cd "$backup" && find . -type f -printf '%P\n' | sort) > "$existing"

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

  if ! timeout 900 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" \
    -e "source $RUNNER_TEMP/$key.upload.lftp" "$host"; then
    rollback_target "$key" "$domain" "$transport" || true
    printf '%s\t%s\tUPLOAD_FAILED_ROLLED_BACK\n' "$key" "$domain" >> "$RUNNER_TEMP/deploy-status.tsv"
    cp "$RUNNER_TEMP/deploy-status.tsv" deployment-proof/deploy-status.tsv
    echo "::error::Upload failed at $domain. Only that target was rolled back; successful targets remain deployed."
    exit 1
  fi

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

  postwrite_ok=1
  timeout 300 lftp -u "$FTP_USERNAME,$FTP_PASSWORD" -p "$FTP_PORT" \
    -e "source $RUNNER_TEMP/$key.postwrite.lftp" "$host" || postwrite_ok=0
  [ "$postwrite_ok" = '1' ] && cmp -s "$release_root/index.html" "$postwrite/index.html" || postwrite_ok=0
  [ "$postwrite_ok" = '1' ] && cmp -s "$release_root/release-manifest.json" "$postwrite/release-manifest.json" || postwrite_ok=0

  if [ "$postwrite_ok" != '1' ]; then
    rollback_target "$key" "$domain" "$transport" || true
    printf '%s\t%s\tFTPS_BYTE_PROOF_FAILED_ROLLED_BACK\n' "$key" "$domain" >> "$RUNNER_TEMP/deploy-status.tsv"
    cp "$RUNNER_TEMP/deploy-status.tsv" deployment-proof/deploy-status.tsv
    echo "::error::FTPS byte proof failed at $domain. Only that target was rolled back."
    exit 1
  fi

  proved=0
  for attempt in $(seq 1 18); do
    rm -f "$public_index" "$public_manifest"
    if curl --fail --silent --show-error --location --connect-timeout 15 --max-time 45 \
        -H 'Cache-Control: no-cache, no-store, max-age=0' -H 'Pragma: no-cache' \
        "https://$domain/?release=${GITHUB_SHA}-${GITHUB_RUN_ID}-${key}-${attempt}" -o "$public_index" \
      && curl --fail --silent --show-error --location --connect-timeout 15 --max-time 45 \
        -H 'Cache-Control: no-cache, no-store, max-age=0' -H 'Pragma: no-cache' \
        "https://$domain/release-manifest.json?release=${GITHUB_SHA}-${GITHUB_RUN_ID}-${key}-${attempt}" -o "$public_manifest"; then
      if cmp -s "$release_root/index.html" "$public_index" \
        && cmp -s "$release_root/release-manifest.json" "$public_manifest"; then
        proved=1
        break
      fi
    fi
    sleep 10
  done

  if [ "$proved" != '1' ]; then
    rollback_target "$key" "$domain" "$transport" || true
    printf '%s\t%s\tPUBLIC_BYTE_PROOF_FAILED_ROLLED_BACK\n' "$key" "$domain" >> "$RUNNER_TEMP/deploy-status.tsv"
    cp "$RUNNER_TEMP/deploy-status.tsv" deployment-proof/deploy-status.tsv
    echo "::error::Public byte proof failed at $domain. Only that target was rolled back; successful targets remain deployed and will be skipped next run."
    exit 1
  fi

  grep -Fq 'Created with the Vision' "$public_index"
  grep -Fq "Why can't I?" "$public_index"
  ! grep -Eiq 'Created by JayJayTeamDev|Designed by JayJayTeamDev' "$public_index"
  printf '%s\t%s\t%s\t%s\n' "$key" "$domain" "$transport" "$title" >> "$RUNNER_TEMP/touched.tsv"
  printf '%s\t%s\tDEPLOYED_AND_PROVED\n' "$key" "$domain" >> "$RUNNER_TEMP/deploy-status.tsv"
  echo "DEPLOYED_AND_EXACT_PUBLIC_BYTES_PROVED https://$domain/"
done < "$RUNNER_TEMP/targets.tsv"

test "$(wc -l < "$RUNNER_TEMP/touched.tsv" | tr -d ' ')" = '18'
cp "$RUNNER_TEMP/touched.tsv" deployment-proof/touched.tsv
cp "$RUNNER_TEMP/deploy-status.tsv" deployment-proof/deploy-status.tsv
printf 'run_id=%s\nstatic_tree=%s\nproof=EXACT_FTPS_AND_PUBLIC_INDEX_MANIFEST_BYTES\nresume_policy=SKIP_ALREADY_CURRENT_ROLLBACK_FAILED_TARGET_ONLY\n' \
  "$GITHUB_RUN_ID" "$LOCKED_STATIC_TREE" > deployment-proof/release.txt
echo 'HOSTINGER_18_SITE_DEPLOYMENT=PASS'
