#!/usr/bin/env bash
set -euo pipefail

source_root="${1:?source root is required}"
live_url="${2:?live URL is required}"

: "${FTP_CONNECT_HOST:?FTP_CONNECT_HOST is required}"
: "${FTP_USERNAME:?FTP_USERNAME is required}"
: "${FTP_PASSWORD:?FTP_PASSWORD is required}"
: "${FTP_PORT:=21}"
: "${FTP_SERVER_DIR:=/}"

[[ -s "$source_root/index.html" ]] || { echo '::error::Source index.html missing'; exit 2; }
[[ -s "$source_root/ultimate.html" ]] || { echo '::error::Source ultimate.html missing'; exit 3; }

remote="$RUNNER_TEMP/cryptoworldz-ultimate-postupload"
rm -rf "$remote"
mkdir -p "$remote"
FTP_TRANSFER_TIMEOUT=90 bash tools/cryptoworldz-ultimate-ftp.sh backup "$remote"

source_index_sha="$(sha256sum "$source_root/index.html" | awk '{print $1}')"
source_ultimate_sha="$(sha256sum "$source_root/ultimate.html" | awk '{print $1}')"
remote_index_sha="$(sha256sum "$remote/index.html" | awk '{print $1}')"
remote_ultimate_sha="$(sha256sum "$remote/ultimate.html" | awk '{print $1}')"

[[ "$source_index_sha" == "$remote_index_sha" ]] || {
  echo "::error::FTP post-upload hash mismatch for index.html: source=$source_index_sha remote=$remote_index_sha"
  exit 4
}
[[ "$source_ultimate_sha" == "$remote_ultimate_sha" ]] || {
  echo "::error::FTP post-upload hash mismatch for ultimate.html: source=$source_ultimate_sha remote=$remote_ultimate_sha"
  exit 5
}
echo "CRYPTOWORLDZ_FTP_POSTUPLOAD_HASH=PASS index=$remote_index_sha ultimate=$remote_ultimate_sha"

home="$RUNNER_TEMP/cryptoworldz-home.html"
ultimate="$RUNNER_TEMP/cryptoworldz-ultimate.html"
success=0

for attempt in $(seq 1 18); do
  cache="release=${GITHUB_SHA:-manual}-${GITHUB_RUN_ID:-manual}-${attempt}-$(date +%s)"
  rm -f "$home" "$ultimate"
  home_code="$(curl -4 -L -sS -o "$home" -w '%{http_code}' \
    --retry 1 --retry-all-errors \
    -H 'Cache-Control: no-cache, no-store, must-revalidate' \
    -H 'Pragma: no-cache' \
    -H 'Expires: 0' \
    -H 'User-Agent: CryptoWorldz-Production-Proof/1.0' \
    --max-time 30 "$live_url/?$cache" || true)"
  ultimate_code="$(curl -4 -L -sS -o "$ultimate" -w '%{http_code}' \
    --retry 1 --retry-all-errors \
    -H 'Cache-Control: no-cache, no-store, must-revalidate' \
    -H 'Pragma: no-cache' \
    -H 'Expires: 0' \
    -H 'User-Agent: CryptoWorldz-Production-Proof/1.0' \
    --max-time 30 "$live_url/ultimate.html?$cache" || true)"

  home_release=no
  home_link=no
  ultimate_title=no
  ultimate_owner=no
  [[ -s "$home" ]] && grep -Fq '20260811-ultimate-foundation1' "$home" && home_release=yes
  [[ -s "$home" ]] && grep -Fq './ultimate.html' "$home" && home_link=yes
  [[ -s "$ultimate" ]] && grep -Fq 'Command Centre Ultimate' "$ultimate" && ultimate_title=yes
  [[ -s "$ultimate" ]] && grep -Fq 'JayJayTeamDev' "$ultimate" && ultimate_owner=yes

  echo "HTTP_PROOF attempt=$attempt home_status=$home_code home_release=$home_release home_link=$home_link ultimate_status=$ultimate_code ultimate_title=$ultimate_title ultimate_owner=$ultimate_owner home_bytes=$(wc -c < "$home" 2>/dev/null || echo 0) ultimate_bytes=$(wc -c < "$ultimate" 2>/dev/null || echo 0)"

  if [[ "$home_code" == '200' \
     && "$ultimate_code" == '200' \
     && "$home_release" == 'yes' \
     && "$home_link" == 'yes' \
     && "$ultimate_title" == 'yes' \
     && "$ultimate_owner" == 'yes' ]] \
     && ! grep -Eqi 'Loading the Worldz experience|default page|parked domain' "$home" \
     && ! grep -Eqi 'default page|parked domain' "$ultimate"; then
    success=1
    break
  fi

  if (( attempt < 18 )); then sleep 5; fi
done

if [[ "$success" != '1' ]]; then
  echo '::error::Public CryptoWorldz HTTP proof did not converge to the uploaded Ultimate release within the bounded retry window.'
  echo "HOME_SHA=$(sha256sum "$home" 2>/dev/null | awk '{print $1}' || true)"
  echo "ULTIMATE_SHA=$(sha256sum "$ultimate" 2>/dev/null | awk '{print $1}' || true)"
  echo 'HOME_HEAD:'
  head -c 500 "$home" 2>/dev/null | tr '\n' ' ' || true
  echo
  echo 'ULTIMATE_HEAD:'
  head -c 500 "$ultimate" 2>/dev/null | tr '\n' ' ' || true
  echo
  exit 6
fi

echo 'CRYPTOWORLDZ_PUBLIC_HTTP_PROOF=PASS'
