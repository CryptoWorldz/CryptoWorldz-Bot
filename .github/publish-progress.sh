#!/usr/bin/env bash
set -euo pipefail

gate="${1:?gate required}"
result="${2:-PASS}"
repo="${GITHUB_REPOSITORY:-CryptoWorldz/CryptoWorldz-Bot}"
run_id="${GITHUB_RUN_ID:-unknown}"
sha="${GITHUB_SHA:-$(git rev-parse HEAD)}"
now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
status_file="oneworldz-deployment-progress.txt"

# One-time artifact-quota escape: generate the fingerprint rail as a normal file.
# The in-run token never edits a workflow file; the authenticated connector installs
# this proved candidate atomically afterward.
if [ "$gate" = "BUILD" ] && [ "$result" = "STARTED" ] \
  && ! grep -Fq 'candidate_fingerprint:' .github/workflows/main.yml; then
  if [ ! -f workflow-fingerprint-rail.txt ] \
    || grep -Fq 'tools/fingerprint-oneworldz-candidate.mjs' workflow-fingerprint-rail.txt; then
    python3 tools/generate-fingerprint-rail.py
    test -s workflow-fingerprint-rail.txt
    ! grep -Fq 'actions/upload-artifact' workflow-fingerprint-rail.txt
    ! grep -Fq 'actions/download-artifact' workflow-fingerprint-rail.txt
    grep -Fq 'apps/oneworldz-ecosystem-release/fingerprint-candidate.mjs' workflow-fingerprint-rail.txt
    git config user.name 'github-actions[bot]'
    git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
    git add workflow-fingerprint-rail.txt
    if ! git diff --cached --quiet; then
      git commit -m 'PUBLISH ALLOWED PATH ARTIFACT FREE FINGERPRINT RAIL'
      git push origin HEAD:main
      echo 'ARTIFACT_FREE_FINGERPRINT_RAIL_CANDIDATE=PUBLISHED'
    fi
  fi
fi

work="$(mktemp -d)"
branch="deployment-progress-temp-${run_id}-${gate}-${result}-${RANDOM}"
cleanup(){ git worktree remove --force "$work" >/dev/null 2>&1 || true; rm -rf "$work"; }
trap cleanup EXIT

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git worktree add --detach "$work" "$sha" >/dev/null
cd "$work"
git checkout --orphan "$branch" >/dev/null 2>&1
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

# Canonical deployment trigger marker: authenticated production rail control.
# Live observable canonical BUILD trigger: 2026-08-19.
# Repaired sponsor-shell BUILD trigger: 2026-08-19.
# Artifact-free fingerprint rail generation: 2026-08-19.
