#!/usr/bin/env bash
set -euo pipefail

: "${FTP_HOST:?FTP_HOST is required}"
: "${FTP_PORT:=21}"
: "${HOSTINGER_LOCKED_IP:?HOSTINGER_LOCKED_IP is required}"
: "${HOSTINGER_TLS_ALIAS:?HOSTINGER_TLS_ALIAS is required}"
: "${HOSTINGER_CERT_SHA256:?HOSTINGER_CERT_SHA256 is required}"
: "${GITHUB_ENV:?GITHUB_ENV is required}"

host="$(printf '%s' "$FTP_HOST" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's#^ftp://##' -e 's#^ftps://##' -e 's#/.*$##')"
if [[ "$host" != *:*:* && "$host" == *:* ]]; then host="${host%%:*}"; fi
test -n "$host"

use_pinned=0
if [[ "$host" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  test "$host" = "$HOSTINGER_LOCKED_IP" || { echo '::error::Unapproved numeric FTP host.'; exit 1; }
  use_pinned=1
else
  if getent ahostsv4 "$host" 2>/dev/null | awk '{print $1}' | grep -Fxq "$HOSTINGER_LOCKED_IP"; then
    echo "Configured FTP hostname resolves to the locked Hostinger endpoint; using pinned FTPS identity."
    use_pinned=1
  fi
fi

if [[ "$use_pinned" == '1' ]]; then
  test "$FTP_PORT" = '21' || { echo '::error::Pinned Hostinger FTPS requires port 21.'; exit 1; }
  echo "$HOSTINGER_LOCKED_IP $HOSTINGER_TLS_ALIAS" | sudo tee -a /etc/hosts >/dev/null
  test "$(getent ahostsv4 "$HOSTINGER_TLS_ALIAS" | awk 'NR==1{print $1}')" = "$HOSTINGER_LOCKED_IP"

  cert_ok=0
  cert="$RUNNER_TEMP/hostinger-cert.pem"
  for attempt in 1 2 3; do
    session="$RUNNER_TEMP/hostinger-session-$attempt.txt"
    err="$RUNNER_TEMP/hostinger-openssl-$attempt.err"
    rm -f "$cert" "$session" "$err"
    set +e
    timeout 25 openssl s_client -starttls ftp -connect "$HOSTINGER_LOCKED_IP:21" -verify_return_error -showcerts </dev/null >"$session" 2>"$err"
    rc=$?
    set -e
    if [[ "$rc" -ne 0 ]]; then
      echo "::warning::Hostinger FTPS certificate probe attempt $attempt failed with exit $rc."
      sleep $((attempt * 2))
      continue
    fi
    sed -n '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/p' "$session" | sed -n '1,/-----END CERTIFICATE-----/p' > "$cert"
    [[ -s "$cert" ]] || { sleep $((attempt * 2)); continue; }
    fp="$(openssl x509 -in "$cert" -noout -fingerprint -sha256 | cut -d= -f2)"
    if [[ "$fp" == "$HOSTINGER_CERT_SHA256" ]] \
      && openssl x509 -in "$cert" -noout -ext subjectAltName | grep -Fq 'DNS:*.hstgr.io' \
      && grep -Fq 'Verify return code: 0 (ok)' "$session" \
      && ! grep -Eqi 'verify error|certificate verify failed' "$err"; then
      cert_ok=1
      echo "Pinned Hostinger FTPS certificate verified on attempt $attempt: $fp"
      break
    fi
    echo "::warning::Hostinger FTPS identity checks did not pass on attempt $attempt."
    sleep $((attempt * 2))
  done
  [[ "$cert_ok" == '1' ]] || { echo '::error::Unable to prove locked Hostinger FTPS identity.'; exit 1; }
  echo "FTP_CONNECT_HOST=$HOSTINGER_TLS_ALIAS" >> "$GITHUB_ENV"
  echo 'WORLDZ_FTPS_PINNED=PASS'
else
  getent ahosts "$host" >/dev/null 2>&1 || { echo '::error::Configured FTP hostname does not resolve.'; exit 1; }
  echo "FTP_CONNECT_HOST=$host" >> "$GITHUB_ENV"
  echo 'Using configured FTP hostname with CA and hostname verification.'
fi
