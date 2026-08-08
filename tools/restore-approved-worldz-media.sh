#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
payload_dir="$repo_root/media/approved-worldz"
out_dir="${1:-$repo_root/.worldz-approved-media}"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

archive="$tmp_dir/worldz-approved-media.tar.gz"
cat "$payload_dir"/payload.part*.b64 | tr -d '\r\n' | base64 --decode > "$archive"

actual_bytes="$(wc -c < "$archive" | tr -d ' ')"
[[ "$actual_bytes" == '506131' ]] || { echo "approved media archive size mismatch: $actual_bytes" >&2; exit 1; }

echo 'e235be56dbdd98780bf73eb74251fe998b921218e8ef24f90d6d035916a048d8  '"$archive" | sha256sum -c -

rm -rf "$out_dir"
mkdir -p "$out_dir"
tar -xzf "$archive" -C "$out_dir"

(
  cd "$out_dir"
  cat <<'HASHES' | sha256sum -c -
19977d76f164ed0b81e946f735db41041fc0cbf4e8a4b64c39cda48c49edf211  pdc/pdc-mission-board.webp
6be880663d2f02542017a5df26817c767cbde48bcd2e6dac92252439f874a77a  pdc/pdc-hope-chest.webp
3c0ad06a1684f0dd70b6960d131ab45cfea60bea2bcd67e6421f657925095f12  pdc/pdc-crest.webp
0ca2db345de4ff1d62acf0942121685568c08251d18fbd93c94092de80c0e0ba  solworldz/solworldz-hero-desktop.webp
fd27246792433b348699f4ad66040100e17d2d641971972e90bf9e66abac6660  solworldz/solworldz-hero-mobile.webp
1de7c502883f6f38374b7b562597ae7cb9e9725256218f61a6c8d30122091a21  solworldz/solworldz-approved-atlas.webp
HASHES
)

echo "Approved Worldz media restored and verified at $out_dir"
