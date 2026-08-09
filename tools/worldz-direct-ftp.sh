#!/usr/bin/env bash
set -euo pipefail

mode="${1:?mode is required: upload or restore}"
source_root="${2:?source root is required}"

case "$mode" in
  upload|restore) ;;
  *) echo "Unsupported transfer mode: $mode" >&2; exit 2 ;;
esac

: "${FTP_HOST:?FTP_HOST is required}"
: "${FTP_USERNAME:?FTP_USERNAME is required}"
: "${FTP_PASSWORD:?FTP_PASSWORD is required}"
: "${FTP_PORT:=21}"
: "${FTP_SERVER_DIR:=/}"
: "${FTP_TRANSFER_TIMEOUT:=300}"
: "${FTP_TLS_VERIFY:=yes}"
: "${FTP_TLS_CHECK_HOSTNAME:=yes}"

normalize_ftp_host() {
  local value="$1"
  value="$(printf '%s' "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  value="${value#ftp://}"
  value="${value#ftps://}"
  value="${value#sftp://}"
  value="${value%%/*}"
  if [[ "$value" != *:*:* && "$value" == *:* ]]; then value="${value%%:*}"; fi
  printf '%s' "$value"
}

FTP_HOST="$(normalize_ftp_host "$FTP_HOST")"
if [[ -z "$FTP_HOST" || "$FTP_HOST" == *$'\n'* || "$FTP_HOST" == *$'\r'* ]]; then
  echo '::error::FTP_HOST is empty or malformed after normalization.' >&2
  exit 5
fi
echo "::add-mask::$FTP_HOST"

# Production rule: certificate and hostname verification are mandatory.
# Old workflows were able to set these to "no", hiding target/certificate faults.
if [[ "$FTP_TLS_VERIFY" != 'yes' ]]; then
  echo '::error::FTP_TLS_VERIFY=no is forbidden for Worldz production transfers.' >&2
  exit 7
fi
if [[ "$FTP_TLS_CHECK_HOSTNAME" != 'yes' ]]; then
  echo '::error::FTP_TLS_CHECK_HOSTNAME=no is forbidden for Worldz production transfers.' >&2
  exit 9
fi

test -d "$source_root"

if [[ "$mode" == "upload" ]]; then
  payload_builder="${GITHUB_WORKSPACE:-$(pwd)}/tools/build-worldz-media-payloads.mjs"
  if [[ -f "$payload_builder" ]]; then node "$payload_builder" "$source_root"; fi
fi

command_file="${RUNNER_TEMP:-/tmp}/worldz-${mode}-${GITHUB_RUN_ID:-manual}.lftp"

lftp_quote() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  printf '"%s"' "$value"
}

emit_file() {
  local file="$1"
  local relative="${file#"$source_root"/}"
  local remote_dir
  remote_dir="$(dirname "$relative")"
  if [[ "$relative" == "$file" || "$relative" == *$'\n'* || "$relative" == *$'\r'* ]]; then
    echo "Unsafe transfer path: $file" >&2
    exit 3
  fi
  if [[ "$remote_dir" != "." && -z "${created_dirs[$remote_dir]+set}" ]]; then
    echo 'set cmd:fail-exit no'
    printf 'mkdir -p %s\n' "$(lftp_quote "$remote_dir")"
    echo 'set cmd:fail-exit yes'
    created_dirs[$remote_dir]=1
  fi
  printf 'put -O %s %s\n' "$(lftp_quote "$remote_dir")" "$(lftp_quote "$file")"
}

declare -A created_dirs=()
declare -a ordinary_files=()
index_file=""

if [[ "$mode" == "upload" ]]; then
  for relative in 404.html _headers live.html .htaccess donate.html reagan-kauja.html robots.txt sitemap.xml; do
    [[ -f "$source_root/$relative" ]] && ordinary_files+=("$source_root/$relative")
  done
  for directory in assets config; do
    if [[ -d "$source_root/$directory" ]]; then
      while IFS= read -r -d '' file; do ordinary_files+=("$file"); done < <(find "$source_root/$directory" -type f -print0 | sort -z)
    fi
  done
  [[ -f "$source_root/index.html" ]] || { echo "Approved package is missing index.html" >&2; exit 4; }
  index_file="$source_root/index.html"
else
  while IFS= read -r -d '' file; do
    [[ "$(basename "$file")" == ".empty-target" ]] && continue
    if [[ "${file#"$source_root"/}" == "index.html" ]]; then index_file="$file"; else ordinary_files+=("$file"); fi
  done < <(find "$source_root" -type f -print0 | sort -z)
fi

{
  echo 'set cmd:fail-exit yes'
  echo 'set net:max-retries 2'
  echo 'set net:timeout 30'
  echo 'set net:idle 30'
  echo 'set ftp:ssl-force yes'
  echo 'set ftp:ssl-protect-data yes'
  echo 'set ssl:verify-certificate yes'
  echo 'set ssl:check-hostname yes'
  echo 'set xfer:clobber yes'
  printf 'cd %s\n' "$(lftp_quote "$FTP_SERVER_DIR")"
  for file in "${ordinary_files[@]}"; do emit_file "$file"; done
  if [[ -n "$index_file" ]]; then emit_file "$index_file"; fi
  echo 'bye'
} > "$command_file"

file_count=${#ordinary_files[@]}
if [[ -n "$index_file" ]]; then ((file_count += 1)); fi
if (( file_count == 0 )); then
  echo "::error::No files available for $mode." >&2
  exit 10
fi

if [[ "${WORLDZ_FTP_DRY_RUN:-0}" == "1" ]]; then
  test -s "$command_file"
  echo "Direct $mode dry run generated $file_count file commands with TLS verification enforced."
  exit 0
fi

if ! getent ahosts "$FTP_HOST" >/dev/null 2>&1; then
  echo '::error::FTP_HOST does not resolve.' >&2
  exit 6
fi

echo "Starting direct $mode of $file_count files with certificate and hostname verification enforced."
timeout "$FTP_TRANSFER_TIMEOUT" lftp -u "$FTP_USERNAME","$FTP_PASSWORD" -p "$FTP_PORT" "$FTP_HOST" < "$command_file"
echo "Direct $mode completed for $file_count files."
