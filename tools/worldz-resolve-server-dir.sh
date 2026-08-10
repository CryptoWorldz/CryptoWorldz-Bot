#!/usr/bin/env bash
set -euo pipefail

: "${FTP_USERNAME:?FTP_USERNAME is required}"
: "${FTP_PASSWORD:?FTP_PASSWORD is required}"
: "${FTP_CONNECT_HOST:?FTP_CONNECT_HOST is required}"
: "${FTP_PORT:=21}"
: "${FTP_SERVER_DIR:=/}"
: "${GITHUB_ENV:?GITHUB_ENV is required}"

probe_listing() {
  local dir="$1"
  timeout 60 lftp -u "$FTP_USERNAME","$FTP_PASSWORD" -p "$FTP_PORT" "$FTP_CONNECT_HOST" -e "set cmd:fail-exit yes; set net:max-retries 2; set net:timeout 20; set ftp:ssl-force yes; set ftp:ssl-protect-data yes; set ssl:verify-certificate yes; set ssl:check-hostname yes; cd '$dir'; cls -1; bye" 2>/dev/null
}

configured="$FTP_SERVER_DIR"
case "$configured" in
  /|/public_html) ;;
  *) echo '::error::Unexpected configured FTP server directory.' >&2; exit 2 ;;
esac

if [[ "$configured" == '/public_html' ]]; then
  probe_listing '/public_html' >/dev/null
  echo 'FTP_SERVER_DIR=/public_html' >> "$GITHUB_ENV"
  echo 'WORLDZ_SERVER_DIR=/public_html (configured)'
  exit 0
fi

root_listing="$(probe_listing '/')"
root_has_index=0
root_has_public_html=0
printf '%s\n' "$root_listing" | grep -Fxq 'index.html' && root_has_index=1 || true
printf '%s\n' "$root_listing" | grep -Fxq 'public_html' && root_has_public_html=1 || true

if [[ "$root_has_index" == '1' ]]; then
  echo 'FTP_SERVER_DIR=/' >> "$GITHUB_ENV"
  echo 'WORLDZ_SERVER_DIR=/ (root index.html present)'
  exit 0
fi

if [[ "$root_has_public_html" == '1' ]]; then
  public_listing="$(probe_listing '/public_html')"
  if printf '%s\n' "$public_listing" | grep -Fxq 'index.html'; then
    echo 'FTP_SERVER_DIR=/public_html' >> "$GITHUB_ENV"
    echo 'WORLDZ_SERVER_DIR=/public_html (served-root auto-detected)'
    exit 0
  fi
fi

# Empty/new domain roots may legitimately have no index yet. In that case only
# accept the configured root when public_html is not demonstrably the served site.
echo 'FTP_SERVER_DIR=/' >> "$GITHUB_ENV"
echo 'WORLDZ_SERVER_DIR=/ (no alternate served root proven)'
