#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
ROOT="${2:-}"
COMMIT="${3:-}"
RUN_ID="${4:-}"

case "$ROOT" in
  /home/*/domains/oneworldz.com/public_html) ;;
  *) echo 'ONEWORLDZ_VISUAL_REPAIR_FAILED invalid_root'; exit 20 ;;
esac
[[ "$COMMIT" =~ ^[0-9a-f]{40}$ ]] || { echo 'ONEWORLDZ_VISUAL_REPAIR_FAILED invalid_commit'; exit 21; }
[[ "$RUN_ID" =~ ^[0-9]+$ ]] || { echo 'ONEWORLDZ_VISUAL_REPAIR_FAILED invalid_run_id'; exit 22; }

BASE="$HOME/.oneworldz-visual-repair/$RUN_ID"
STAGE="$BASE/stage"
BACKUP="$BASE/backup"
MARKER="$BASE/deployed.ok"
mkdir -p "$BASE"

fetch_file() {
  local rel="$1"
  local dst="$2"
  local url="https://raw.githubusercontent.com/CryptoWorldz/CryptoWorldz-Bot/${COMMIT}/apps/cryptoworldz-web-core/${rel}"
  mkdir -p "$(dirname "$dst")"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 2 --connect-timeout 15 --max-time 60 "$url" -o "$dst"
  elif command -v wget >/dev/null 2>&1; then
    wget -q --timeout=60 -O "$dst" "$url"
  else
    php -r '$u=$argv[1];$d=$argv[2];$x=@file_get_contents($u);if($x===false){exit(2);}if(file_put_contents($d,$x)===false){exit(3);}' "$url" "$dst"
  fi
  test -s "$dst"
}

restore_backup() {
  local rel
  for rel in index.html assets/site-router.js assets/oneworldz-next.js assets/oneworldz-live-fix.css; do
    if [ -f "$BACKUP/$rel" ]; then
      mkdir -p "$(dirname "$ROOT/$rel")"
      cp -p "$BACKUP/$rel" "$ROOT/$rel"
    elif [ -f "$BACKUP/$rel.absent" ]; then
      rm -f "$ROOT/$rel"
    fi
  done
}

if [ "$MODE" = 'rollback' ]; then
  test -d "$BACKUP" || { echo 'ONEWORLDZ_VISUAL_ROLLBACK_FAILED no_backup'; exit 30; }
  restore_backup
  rm -f "$MARKER"
  echo "ONEWORLDZ_VISUAL_ROLLBACK_OK $RUN_ID"
  exit 0
fi

[ "$MODE" = 'deploy' ] || { echo 'ONEWORLDZ_VISUAL_REPAIR_FAILED invalid_mode'; exit 23; }
if [ -f "$MARKER" ]; then
  echo "ONEWORLDZ_VISUAL_REPAIR_OK $RUN_ID already_applied"
  exit 0
fi

rm -rf "$STAGE" "$BACKUP"
mkdir -p "$STAGE/assets" "$BACKUP/assets"

fetch_file 'index.html' "$STAGE/index.html"
fetch_file 'assets/site-router.js' "$STAGE/assets/site-router.js"
fetch_file 'assets/oneworldz-next.js' "$STAGE/assets/oneworldz-next.js"
fetch_file 'assets/oneworldz-live-fix.css' "$STAGE/assets/oneworldz-live-fix.css"

grep -Fq '20260816-oneworldz-visual2' "$STAGE/index.html"
grep -Fq 'oneworldz-live-fix.css' "$STAGE/assets/site-router.js"
grep -Fq '20260816-oneworldz-visual2' "$STAGE/assets/site-router.js"
grep -Fq 'One Connected Gateway' "$STAGE/assets/oneworldz-next.js"
grep -Fq 'https://donateworldz.com/reagan-children/' "$STAGE/assets/oneworldz-next.js"
grep -Fq 'https://impactbased.cryptoworldz.xyz/' "$STAGE/assets/oneworldz-next.js"
! grep -Eqi 'NEXT PASS' "$STAGE/assets/oneworldz-next.js"
grep -Fq 'owz-fixed-hero' "$STAGE/assets/oneworldz-live-fix.css"

affected=(index.html assets/site-router.js assets/oneworldz-next.js assets/oneworldz-live-fix.css)
for rel in "${affected[@]}"; do
  mkdir -p "$(dirname "$BACKUP/$rel")"
  if [ -f "$ROOT/$rel" ]; then
    cp -p "$ROOT/$rel" "$BACKUP/$rel"
  else
    : > "$BACKUP/$rel.absent"
  fi
done

WROTE=0
on_error() {
  local rc=$?
  if [ "$WROTE" = '1' ]; then restore_backup || true; fi
  echo "ONEWORLDZ_VISUAL_REPAIR_FAILED $RUN_ID rc=$rc"
  exit "$rc"
}
trap on_error ERR

# New dependency first, entrypoint last. This avoids a page requesting an asset that is not present yet.
cp -p "$STAGE/assets/oneworldz-live-fix.css" "$ROOT/assets/oneworldz-live-fix.css"
WROTE=1
cp -p "$STAGE/assets/oneworldz-next.js" "$ROOT/assets/oneworldz-next.js"
cp -p "$STAGE/assets/site-router.js" "$ROOT/assets/site-router.js"
cp -p "$STAGE/index.html" "$ROOT/index.html"
chmod 0644 "$ROOT/index.html" "$ROOT/assets/site-router.js" "$ROOT/assets/oneworldz-next.js" "$ROOT/assets/oneworldz-live-fix.css" || true

cmp -s "$STAGE/index.html" "$ROOT/index.html"
cmp -s "$STAGE/assets/site-router.js" "$ROOT/assets/site-router.js"
cmp -s "$STAGE/assets/oneworldz-next.js" "$ROOT/assets/oneworldz-next.js"
cmp -s "$STAGE/assets/oneworldz-live-fix.css" "$ROOT/assets/oneworldz-live-fix.css"

touch "$MARKER"
trap - ERR
echo "ONEWORLDZ_VISUAL_REPAIR_OK $RUN_ID"
