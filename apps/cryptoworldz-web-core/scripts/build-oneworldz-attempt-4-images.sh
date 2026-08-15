#!/usr/bin/env bash
set -euo pipefail

ROOT="apps/cryptoworldz-web-core"
SRC="apps/oneworldz-ecosystem-release/source/assets"
OUT="$ROOT/assets/images/oneworldz-recovery"
mkdir -p "$OUT/desktop" "$OUT/mobile"

if command -v magick >/dev/null 2>&1; then
  IM=magick
else
  IM=convert
fi

render() {
  local src="$1" width="$2" height="$3" out="$4" gravity="${5:-center}"
  "$IM" "$src" -auto-orient -resize "${width}x${height}^" -gravity "$gravity" -extent "${width}x${height}" \
    -modulate 100,108,100 -contrast -strip -quality 90 "$out"
}

# Desktop 1920x1080 — approved repo references only.
render "$SRC/desktop/oneworldz/oneworldz-master.png" 1920 1080 "$OUT/desktop/01-global-gateway.webp"
render "$SRC/desktop/oneworldz/little-legend.png" 1920 1080 "$OUT/desktop/02-little-legend-future.webp" north
render "$SRC/desktop/humanitarian/action-creates-smiles-banner.png" 1920 1080 "$OUT/desktop/03-humanitarian-action.webp"
render "$SRC/desktop/tokens/global-impact-alliance.png" 1920 1080 "$OUT/desktop/04-people-planet-tech-leadership.webp"
render "$SRC/desktop/oneworldz/little-legend.png" 1920 1080 "$OUT/desktop/05-learn.webp" north
render "$SRC/desktop/tokens/robin-hood-law.png" 1920 1080 "$OUT/desktop/06-law.webp"
render "$SRC/desktop/cryptoworldz/impactbased.png" 1920 1080 "$OUT/desktop/07-impactbased.webp"
render "$SRC/desktop/oneworldz/hope-chest.png" 1920 1080 "$OUT/desktop/08-hope-chest.webp"
render "$SRC/desktop/cryptoworldz/command-centre-leader-team.png" 1920 1080 "$OUT/desktop/09-worldz-ecosystem.webp"
render "$SRC/desktop/purple-diamond-crew/action-team.png" 1920 1080 "$OUT/desktop/10-stand-as-one-2030.webp"

# Mobile 1080x1350 — independently fitted mobile references.
render "$SRC/mobile/little-legend.webp" 1080 1350 "$OUT/mobile/01-global-gateway.webp" north
render "$SRC/mobile/little-legend.webp" 1080 1350 "$OUT/mobile/02-little-legend-future.webp" north
render "$SRC/support/mobile/reagan-children-emblem-mobile.webp" 1080 1350 "$OUT/mobile/03-humanitarian-action.webp"
render "$SRC/mobile/global-impact-alliance.webp" 1080 1350 "$OUT/mobile/04-people-planet-tech-leadership.webp"
render "$SRC/mobile/little-legend.webp" 1080 1350 "$OUT/mobile/05-learn.webp" north
render "$SRC/mobile/robin-hood-law.webp" 1080 1350 "$OUT/mobile/06-law.webp"
render "$SRC/mobile/impactbased-landscape.webp" 1080 1350 "$OUT/mobile/07-impactbased.webp"
render "$SRC/mobile/hope-chest.webp" 1080 1350 "$OUT/mobile/08-hope-chest.webp"
render "$SRC/mobile/leader-team.webp" 1080 1350 "$OUT/mobile/09-worldz-ecosystem.webp"
render "$SRC/mobile/uganda-unite.webp" 1080 1350 "$OUT/mobile/10-stand-as-one-2030.webp"

for f in "$OUT"/desktop/*.webp "$OUT"/mobile/*.webp; do
  test -s "$f"
done

COUNT=$(find "$OUT" -type f -name '*.webp' | wc -l | tr -d ' ')
[ "$COUNT" = "20" ]
echo "ONEWORLDZ ATTEMPT 4 IMAGE BUILD: 20/20 READY"
