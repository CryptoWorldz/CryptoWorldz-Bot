#!/usr/bin/env bash
set -euo pipefail

mode="${1:?mode required: backup|upload|restore|verify}"
local_file="${2:?local file required}"
remote_name="${3:-command-centre-ultimate-20260811.html}"

: "${FTP_CONNECT_HOST:?FTP_CONNECT_HOST required}"
: "${FTP_USERNAME:?FTP_USERNAME required}"
: "${FTP_PASSWORD:?FTP_PASSWORD required}"
: "${FTP_PORT:=21}"
: "${FTP_SERVER_DIR:=/}"
: "${FTP_TRANSFER_TIMEOUT:=90}"

q(){ local v="$1"; v="${v//\\/\\\\}"; v="${v//\"/\\\"}"; printf '"%s"' "$v"; }
cmd="${RUNNER_TEMP:-/tmp}/cw-versioned-${mode}-${GITHUB_RUN_ID:-manual}.lftp"
{
  echo 'set cmd:fail-exit yes'
  echo 'set net:max-retries 2'
  echo 'set net:timeout 30'
  echo 'set ftp:ssl-force yes'
  echo 'set ftp:ssl-protect-data yes'
  echo 'set ssl:verify-certificate yes'
  echo 'set ssl:check-hostname yes'
  printf 'cd %s\n' "$(q "$FTP_SERVER_DIR")"
  case "$mode" in
    backup)
      echo 'set cmd:fail-exit no'
      printf 'get %s -o %s\n' "$(q "$remote_name")" "$(q "$local_file")"
      echo 'set cmd:fail-exit yes'
      ;;
    upload)
      [[ -s "$local_file" ]] || { echo 'release file missing' >&2; exit 2; }
      printf 'put -o %s %s\n' "$(q "$remote_name")" "$(q "$local_file")"
      ;;
    verify)
      printf 'get %s -o %s\n' "$(q "$remote_name")" "$(q "$local_file")"
      ;;
    restore)
      if [[ -s "$local_file" ]]; then
        printf 'put -o %s %s\n' "$(q "$remote_name")" "$(q "$local_file")"
      else
        echo 'set cmd:fail-exit no'
        printf 'rm %s\n' "$(q "$remote_name")"
        echo 'set cmd:fail-exit yes'
      fi
      ;;
    *) echo "unsupported mode: $mode" >&2; exit 3;;
  esac
  echo 'bye'
} > "$cmd"
timeout "$FTP_TRANSFER_TIMEOUT" lftp -u "$FTP_USERNAME","$FTP_PASSWORD" -p "$FTP_PORT" "$FTP_CONNECT_HOST" < "$cmd"
if [[ "$mode" == backup && -e "$local_file" && ! -s "$local_file" ]]; then rm -f "$local_file"; fi
if [[ "$mode" == verify ]]; then [[ -s "$local_file" ]] || { echo 'remote verification download missing' >&2; exit 4; }; fi
echo "CryptoWorldz versioned $mode completed with verified FTPS."
