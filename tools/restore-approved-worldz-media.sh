#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
payload_dir="$repo_root/media/approved-worldz"
out_dir="${1:-$repo_root/.worldz-approved-media}"
archive="$payload_dir/worldz-master-images-approved-v2.zip"
checksum="$payload_dir/worldz-master-images-approved-v2.sha256"

[[ -s "$archive" ]] || { echo "approved master image archive missing: $archive" >&2; exit 1; }
[[ -s "$checksum" ]] || { echo "approved master image checksum missing: $checksum" >&2; exit 1; }

(
  cd "$payload_dir"
  sha256sum -c "$(basename "$checksum")"
)

rm -rf "$out_dir"
mkdir -p "$out_dir"
unzip -q "$archive" -d "$out_dir"

node - "$out_dir/MANIFEST.json" <<'NODE'
const fs = require('fs');
const manifestPath = process.argv[2];
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.version !== '2026-08-10-master-v2') throw new Error('unexpected approved image bundle version');
if (manifest.asset_count !== 34) throw new Error(`expected 34 approved images, got ${manifest.asset_count}`);
if (!Array.isArray(manifest.assets) || manifest.assets.length !== 34) throw new Error('approved image manifest is incomplete');
if (manifest.missing?.length) throw new Error(`approved image bundle reports missing assets: ${manifest.missing.join(', ')}`);
NODE

mkdir -p "$out_dir/pdc" "$out_dir/solworldz"
cp "$out_dir/purple-diamond-crew/action-team.png" "$out_dir/pdc/pdc-mission-board.png"
cp "$out_dir/purple-diamond-crew/hope-chest.png" "$out_dir/pdc/pdc-hope-chest.png"
cp "$out_dir/purple-diamond-crew/banner.png" "$out_dir/pdc/pdc-crest.png"
cp "$out_dir/blockchains/solworldz.png" "$out_dir/solworldz/solworldz-hero-desktop.png"
cp "$out_dir/blockchains/solworldz.png" "$out_dir/solworldz/solworldz-hero-mobile.png"
cp "$out_dir/blockchains/solworldz.png" "$out_dir/solworldz/solworldz-approved-atlas.png"

compat=(
  "$out_dir/pdc/pdc-mission-board.png"
  "$out_dir/pdc/pdc-hope-chest.png"
  "$out_dir/pdc/pdc-crest.png"
  "$out_dir/solworldz/solworldz-hero-desktop.png"
  "$out_dir/solworldz/solworldz-hero-mobile.png"
  "$out_dir/solworldz/solworldz-approved-atlas.png"
)
for file in "${compat[@]}"; do
  [[ -s "$file" ]] || { echo "approved compatibility image missing: $file" >&2; exit 1; }
  [[ "$(wc -c < "$file")" -gt 50000 ]] || { echo "approved compatibility image too small: $file" >&2; exit 1; }
done

# Exact fingerprints used by production verification. A live file must match these bytes,
# not merely share a filename or exceed a size threshold.
(
  cd "$out_dir"
  sha256sum \
    pdc/pdc-mission-board.png \
    pdc/pdc-hope-chest.png \
    pdc/pdc-crest.png \
    solworldz/solworldz-hero-desktop.png \
    solworldz/solworldz-hero-mobile.png \
    solworldz/solworldz-approved-atlas.png \
    > APPROVED-COMPATIBILITY-SHA256.txt
)

echo "Approved Worldz master imagery restored, fingerprinted and verified at $out_dir"
