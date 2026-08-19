#!/usr/bin/env bash
set -euo pipefail

gate="${1:?gate required}"
result="${2:-PASS}"
repo="${GITHUB_REPOSITORY:-CryptoWorldz/CryptoWorldz-Bot}"
run_id="${GITHUB_RUN_ID:-unknown}"
sha="${GITHUB_SHA:-$(git rev-parse HEAD)}"
now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
status_file="oneworldz-deployment-progress.txt"
work="$(mktemp -d)"
cleanup(){ git worktree remove --force "$work" >/dev/null 2>&1 || true; rm -rf "$work"; }
trap cleanup EXIT

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git worktree add --detach "$work" "$sha" >/dev/null
cd "$work"
git checkout --orphan deployment-progress-temp >/dev/null 2>&1
git rm -rf . >/dev/null 2>&1 || true
cat > "$status_file" <<EOF
record=ONEWORLDZ_DEPLOYMENT_PROGRESS
repository=$repo
run_id=$run_id
head_sha=$sha
latest_gate=$gate
latest_result=$result
updated_at_utc=$now
sequence=BUILD_TESTS_LIGHTHOUSE_DESKTOP_MOBILE_ZED_MINIAPP_HOSTINGER_LIVE_PROOF_FINAL
source=GITHUB_ACTIONS_EXECUTION_NOT_MANUAL_MARKER
EOF
git add "$status_file"
git commit -m "PROGRESS $gate $result run $run_id" >/dev/null
git push --force origin HEAD:refs/heads/deployment-progress >/dev/null
echo "DEPLOYMENT_PROGRESS_PUBLISHED gate=$gate result=$result run=$run_id"
