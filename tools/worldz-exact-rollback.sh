#!/usr/bin/env bash
set -euo pipefail

backup="${1:?backup directory is required}"
backup_sha="${2:?backup sha256 manifest is required}"
new_files="${3:?new-file manifest is required}"

: "${FTP_USERNAME:?FTP_USERNAME is required}"
: "${FTP_PASSWORD:?FTP_PASSWORD is required}"
: "${FTP_CONNECT_HOST:?FTP_CONNECT_HOST is required}"
: "${FTP_PORT:=21}"
: "${FTP_SERVER_DIR:=/}"

test -d "$backup"
test -s "$backup_sha"
test -f "$new_files"
test -n "$(find "$backup" -type f -print -quit)"

if grep -nE '(^/|(^|/)\.\.(/|$)|[[:cntrl:]])' "$new_files"; then
  echo '::error::Unsafe path in rollback-new-file manifest.' >&2
  exit 2
fi

if [[ -s "$new_files" ]]; then
  cleanup="${RUNNER_TEMP:-/tmp}/worldz-remove-new-files.lftp"
  {
    echo 'set cmd:fail-exit no'
    echo 'set net:max-retries 2'
    echo 'set net:timeout 30'
    echo 'set ftp:ssl-force yes'
    echo 'set ftp:ssl-protect-data yes'
    echo 'set ssl:verify-certificate yes'
    echo 'set ssl:check-hostname yes'
    printf 'cd "%s"\n' "${FTP_SERVER_DIR//\"/\\\"}"
    while IFS= read -r rel; do
      [[ -n "$rel" ]] || continue
      escaped="${rel//\\/\\\\}"; escaped="${escaped//\"/\\\"}"
      printf 'rm "%s"\n' "$escaped"
    done < "$new_files"
    echo 'bye'
  } > "$cleanup"

  set +e
  timeout 180 lftp -u "$FTP_USERNAME","$FTP_PASSWORD" -p "$FTP_PORT" "$FTP_CONNECT_HOST" < "$cleanup"
  cleanup_rc=$?
  set -e
  echo "Rollback new-file cleanup exit=$cleanup_rc; restore is mandatory regardless of cleanup status."
fi

FTP_TRANSFER_TIMEOUT=360 bash "${GITHUB_WORKSPACE:-$(pwd)}/tools/worldz-direct-ftp.sh" restore "$backup"

verify="${RUNNER_TEMP:-/tmp}/worldz-rollback-verify"
rm -rf "$verify"; mkdir -p "$verify"
timeout 180 lftp -u "$FTP_USERNAME","$FTP_PASSWORD" -p "$FTP_PORT" "$FTP_CONNECT_HOST" <<LFTP
set cmd:fail-exit yes
set net:max-retries 2
set net:timeout 30
set ftp:ssl-force yes
set ftp:ssl-protect-data yes
set ssl:verify-certificate yes
set ssl:check-hostname yes
cd "$FTP_SERVER_DIR"
lcd "$verify"
mirror --parallel=3 --exclude-glob '.well-known/**' --exclude-glob '.env*' --exclude-glob '*.log' --exclude-glob 'cgi-bin/**' .
bye
LFTP

(cd "$verify" && find . -type f -print0 | sort -z | xargs -0 sha256sum | sed 's#  \./#  #') > "${RUNNER_TEMP:-/tmp}/worldz-rollback-verify.sha256"
diff -u "$backup_sha" "${RUNNER_TEMP:-/tmp}/worldz-rollback-verify.sha256"
echo 'WORLDZ_ROLLBACK_EXACT=PASS'
