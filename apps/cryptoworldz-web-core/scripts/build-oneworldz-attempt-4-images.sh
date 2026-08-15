#!/usr/bin/env bash
set -euo pipefail
ROOT="apps/cryptoworldz-web-core"
SRC="apps/oneworldz-ecosystem-release/source/assets"
CORE="$ROOT/assets/images/website-core"
OUT="$ROOT/assets/images/oneworldz-pass110"
rm -rf "$OUT"; mkdir -p "$OUT/desktop" "$OUT/mobile"
if command -v magick >/dev/null 2>&1; then IM=magick; else IM=convert; fi
render(){ local src="$1" width="$2" height="$3" out="$4" gravity="${5:-center}"; "$IM" "$src" -auto-orient -resize "${width}x${height}^" -gravity "$gravity" -extent "${width}x${height}" -strip -quality 90 -define webp:method=6 "$out"; test -s "$out"; }
render "$SRC/desktop/oneworldz/oneworldz-master.png" 1920 1080 "$OUT/desktop/oneworldz-hero.webp" center
render "$SRC/desktop/oneworldz/oneworldz-master.png" 1080 1350 "$OUT/mobile/oneworldz-hero.webp" center
render "$CORE/purple-diamond-crew/hope-chest-by-firelight.webp" 960 1200 "$OUT/desktop/hope-chest.webp" center
# 4:5 on both viewports: reuse the visually proven derivative rather than create the black mobile WebP regression.
cp "$OUT/desktop/hope-chest.webp" "$OUT/mobile/hope-chest.webp"
test -s "$OUT/mobile/hope-chest.webp"
COUNT=$(find "$OUT" -type f -name '*.webp' | wc -l | tr -d ' '); [ "$COUNT" = "4" ]
echo "ONEWORLDZ PASS110 IMAGE BUILD: 4/4 POSITION ASSETS READY"
