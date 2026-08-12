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

echo "Approved Worldz master imagery restored exactly as stored in the approved archive at $out_dir"
