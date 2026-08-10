#!/usr/bin/env bash
set -euo pipefail

mode="${1:?mode is required: backup, upload or restore}"
root="${2:?source or backup directory is required}"

case "$mode" in
  backup|upload|restore) ;;
  *) echo "Unsupported mode: $mode" >&2; exit 2 ;;
esac

: "${FTP_CONNECT_HOST:?FTP_CONNECT_HOST is required}"
: "${FTP_USERNAME:?FTP_USERNAME is required}"
: "${FTP_PASSWORD:?FTP_PASSWORD is required}"
: "${FTP_PORT:=21}"
: "${FTP_SERVER_DIR:=/}"
: "${FTP_TRANSFER_TIMEOUT:=120}"

quote_lftp() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  printf '"%s"' "$value"
}

common() {
  cat <<'LFTP'
set cmd:fail-exit yes
set net:max-retries 2
set net:timeout 30
set net:idle 30
set ftp:ssl-force yes
set ftp:ssl-protect-data yes
set ssl:verify-certificate yes
set ssl:check-hostname yes
set xfer:clobber yes
LFTP
}

command_file="${RUNNER_TEMP:-/tmp}/cryptoworldz-ultimate-${mode}-${GITHUB_RUN_ID:-manual}.lftp"
mkdir -p "$root"

case "$mode" in
  backup)
    {
      common
      printf 'cd %s\n' "$(quote_lftp "$FTP_SERVER_DIR")"
      # index.html is known production state and is mandatory for rollback.
      printf 'get %s -o %s\n' "$(quote_lftp 'index.html')" "$(quote_lftp "$root/index.html")"
      # ultimate.html may not exist on the first Ultimate deployment.
      echo 'set cmd:fail-exit no'
      printf 'get %s -o %s\n' "$(quote_lftp 'ultimate.html')" "$(quote_lftp "$root/ultimate.html")"
      echo 'set cmd:fail-exit yes'
      echo 'bye'
    } > "$command_file"
    ;;
  upload)
    [[ -s "$root/index.html" ]] || { echo 'CryptoWorldz index.html missing' >&2; exit 3; }
    [[ -s "$root/ultimate.html" ]] || { echo 'CryptoWorldz ultimate.html missing' >&2; exit 4; }
    {
      common
      printf 'cd %s\n' "$(quote_lftp "$FTP_SERVER_DIR")"
      # New page first. Homepage switches last so visitors never see a link to a missing page.
      printf 'put -O . %s\n' "$(quote_lftp "$root/ultimate.html")"
      printf 'put -O . %s\n' "$(quote_lftp "$root/index.html")"
      echo 'bye'
    } > "$command_file"
    ;;
  restore)
    [[ -s "$root/index.html" ]] || { echo 'Rollback index.html missing' >&2; exit 5; }
    {
      common
      printf 'cd %s\n' "$(quote_lftp "$FTP_SERVER_DIR")"
      if [[ -s "$root/ultimate.html" ]]; then
        printf 'put -O . %s\n' "$(quote_lftp "$root/ultimate.html")"
      else
        echo 'set cmd:fail-exit no'
        printf 'rm %s\n' "$(quote_lftp 'ultimate.html')"
        echo 'set cmd:fail-exit yes'
      fi
      printf 'put -O . %s\n' "$(quote_lftp "$root/index.html")"
      echo 'bye'
    } > "$command_file"
    ;;
esac

if [[ "${CRYPTOWORLDZ_FTP_DRY_RUN:-0}" == '1' ]]; then
  test -s "$command_file"
  cat "$command_file"
  exit 0
fi

timeout "$FTP_TRANSFER_TIMEOUT" lftp -u "$FTP_USERNAME","$FTP_PASSWORD" -p "$FTP_PORT" "$FTP_CONNECT_HOST" < "$command_file"

if [[ "$mode" == 'backup' ]]; then
  [[ -s "$root/index.html" ]] || { echo 'Mandatory production index backup was not captured' >&2; exit 6; }
  # A failed optional GET may leave an empty file; empty means it did not exist for rollback purposes.
  [[ ! -e "$root/ultimate.html" || -s "$root/ultimate.html" ]] || rm -f "$root/ultimate.html"
fi

echo "CryptoWorldz Ultimate $mode completed with TLS verification enforced."
