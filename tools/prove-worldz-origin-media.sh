#!/usr/bin/env bash
set -euo pipefail

source_root="${1:?source root is required}"
shift

: "${FTP_USERNAME:?FTP_USERNAME is required}"
: "${FTP_PASSWORD:?FTP_PASSWORD is required}"
: "${FTP_CONNECT_HOST:?FTP_CONNECT_HOST is required}"
: "${FTP_PORT:=21}"
: "${FTP_SERVER_DIR:=/}"
: "${LIVE_URL:?LIVE_URL is required}"
: "${WORLDZ_MEDIA_RMSE_MAX:=0.05}"

command -v lftp >/dev/null
command -v curl >/dev/null
command -v identify >/dev/null
command -v compare >/dev/null

prove_one() {
  local rel="$1"
  [[ -n "$rel" ]] || return 0
  [[ "$rel" != /* && "$rel" != *'..'* && "$rel" != *$'\n'* && "$rel" != *$'\r'* ]] || {
    echo "::error::Unsafe media proof path: $rel" >&2
    return 1
  }

  local approved="$source_root/$rel"
  test -s "$approved"

  local token
  token="$(printf '%s' "$rel" | sha256sum | awk '{print $1}')"
  local origin="$RUNNER_TEMP/worldz-origin-$token.bin"
  local public="$RUNNER_TEMP/worldz-public-$token.bin"
  local headers="$RUNNER_TEMP/worldz-public-$token.headers"

  timeout 60 lftp -u "$FTP_USERNAME","$FTP_PASSWORD" -p "$FTP_PORT" "$FTP_CONNECT_HOST" -e "set cmd:fail-exit yes; set net:max-retries 1; set net:timeout 20; set ftp:passive-mode yes; set ftp:ssl-force yes; set ftp:ssl-protect-data yes; set ssl:verify-certificate yes; set ssl:check-hostname yes; cd '$FTP_SERVER_DIR'; get '$rel' -o '$origin'; bye"
  test -s "$origin"

  local approved_sha origin_sha
  approved_sha="$(sha256sum "$approved" | awk '{print $1}')"
  origin_sha="$(sha256sum "$origin" | awk '{print $1}')"
  if [[ "$approved_sha" != "$origin_sha" ]]; then
    echo "::error::Origin FTP bytes do not match approved source for $rel" >&2
    echo "approved_sha256=$approved_sha"
    echo "origin_sha256=$origin_sha"
    return 1
  fi

  local cache_sep='?'
  [[ "$LIVE_URL/$rel" == *\?* ]] && cache_sep='&'

  local public_ok=0 attempt curl_rc proof_url
  for attempt in 1 2 3 4; do
    rm -f "$public" "$headers"
    proof_url="$LIVE_URL/$rel${cache_sep}worldz-proof=${GITHUB_SHA:-manual}-${GITHUB_RUN_ID:-manual}-$token-$attempt"
    set +e
    curl -L -fsS -D "$headers" \
      -A 'Mozilla/5.0 WorldzProductionProof/2.1' \
      -H 'Accept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8' \
      -H 'Cache-Control: no-cache' \
      --connect-timeout 15 --max-time 40 \
      "$proof_url" -o "$public"
    curl_rc=$?
    set -e
    if [[ "$curl_rc" -eq 0 && -s "$public" ]]; then
      public_ok=1
      [[ "$attempt" -gt 1 ]] && echo "Public CDN media fetch recovered on attempt $attempt for $rel"
      break
    fi
    echo "::warning::Public CDN media fetch attempt $attempt failed for $rel (curl exit $curl_rc). Exact FTP-origin bytes already passed; retrying fresh public request."
    sleep $((attempt * 2))
  done
  if [[ "$public_ok" != '1' ]]; then
    echo "::error::Public CDN media could not be fetched after 4 bounded attempts for $rel" >&2
    return 1
  fi

  local approved_dims origin_dims public_dims
  approved_dims="$(identify -format '%wx%h' "$approved")"
  origin_dims="$(identify -format '%wx%h' "$origin")"
  public_dims="$(identify -format '%wx%h' "$public")"
  if [[ "$approved_dims" != "$origin_dims" || "$approved_dims" != "$public_dims" ]]; then
    echo "::error::Rendered image dimensions changed for $rel: approved=$approved_dims origin=$origin_dims public=$public_dims" >&2
    return 1
  fi

  local rmse_raw rmse_norm
  set +e
  rmse_raw="$(compare -metric RMSE "$approved" "$public" null: 2>&1 >/dev/null)"
  set -e
  rmse_norm="$(printf '%s' "$rmse_raw" | sed -n 's/.*(\([0-9.eE+-]*\)).*/\1/p')"
  test -n "$rmse_norm"
  if ! awk -v n="$rmse_norm" -v max="$WORLDZ_MEDIA_RMSE_MAX" 'BEGIN { exit !(n <= max) }'; then
    echo "::error::Public CDN image differs too much from approved source for $rel: normalized RMSE=$rmse_norm max=$WORLDZ_MEDIA_RMSE_MAX" >&2
    return 1
  fi

  local public_sha
  public_sha="$(sha256sum "$public" | awk '{print $1}')"
  echo "MEDIA_PROOF $rel"
  echo "  origin_sha256=$origin_sha (exact approved match)"
  echo "  public_sha256=$public_sha"
  echo "  dimensions=$approved_dims"
  echo "  cdn_rmse_normalized=$rmse_norm"
  grep -Ei '^(content-type:|server:|x-hcdn-cache-status:|cache-control:)' "$headers" | sed 's/^/  /' || true
}

if (($# == 0)); then
  echo '::error::At least one media path is required.' >&2
  exit 2
fi

for rel in "$@"; do
  [[ -n "$rel" ]] || continue
  prove_one "$rel"
done

echo 'WORLDZ_ORIGIN_AND_CDN_MEDIA_PROOF=PASS'
