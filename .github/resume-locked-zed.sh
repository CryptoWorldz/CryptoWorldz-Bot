#!/usr/bin/env bash
set -Eeuo pipefail

# Execute the exact repaired ZED recovery core from the last wiring-repair commit,
# while persisting a compact failure trace on the existing deployment-progress branch.
# This keeps the canonical rail single and makes every subsequent failure inspectable
# even when GitHub's full Actions log transport is unavailable.
CORE_COMMIT="3d26ab5196165b9d5ba93c5dabd0237849423711"
CORE="$RUNNER_TEMP/resume-locked-zed-core.sh"
LOG="$RUNNER_TEMP/zed-runtime-full.log"
TRACE="$RUNNER_TEMP/zed-runtime-failure.txt"

git cat-file -e "$CORE_COMMIT^{commit}"
git show "$CORE_COMMIT:.github/resume-locked-zed.sh" > "$CORE"
chmod +x "$CORE"

set +e
bash -x "$CORE" >"$LOG" 2>&1
rc=$?
set -e

if [ "$rc" -eq 0 ]; then
  echo "ZED_REPAIRED_CORE=PASS commit=$CORE_COMMIT"
  exit 0
fi

tail -n 240 "$LOG" > "$TRACE" || cp "$LOG" "$TRACE"

stage="LOCAL_VALIDATION"
grep -Fq 'PROTECTED_FULL_RUNTIME_SOURCE=PASS' "$LOG" && stage="LIVE_BASELINE"
grep -Eq 'CURRENT_HOSTINGER_MANAGED_ZED_RUNTIME=(PASS|DEGRADED)' "$LOG" && stage="HOSTINGER_DISCOVERY"
grep -Fq 'HOSTINGER_MANAGED_APP_RESOLVED=PASS' "$LOG" && stage="BUILD_DISCOVERY"
grep -Fq 'HOSTINGER_NODE_SOURCE_ARCHIVE=PASS' "$LOG" && stage="ARCHIVE_UPLOAD"
grep -Fq 'HOSTINGER_NODE_ARCHIVE_API=ACCEPTED' "$LOG" && stage="BUILD_CONVERGENCE"
grep -Fq 'HOSTINGER_NODE_DEPLOY_BUILD=PASS' "$LOG" && stage="FTPS_PROOF"
grep -Fq 'PROTECTED_RUNTIME_FTPS_PROOF=' "$LOG" && stage="MANAGED_RESTART"
grep -Fq 'HOSTINGER_MANAGED_RESTART=PASS' "$LOG" && stage="LIVE_CONVERGENCE"

echo "ZED_RUNTIME_FAILURE_STAGE=$stage rc=$rc"
cat "$TRACE"

# Publish the stage first, then preserve the exact tail on the same authenticated
# progress branch already used by the canonical workflow.
bash .github/publish-progress.sh "ZED_${stage}" FAIL || true

git fetch origin deployment-progress --depth=1 || true
WORKTREE="$RUNNER_TEMP/zed-progress-worktree"
rm -rf "$WORKTREE"
if git show-ref --verify --quiet refs/remotes/origin/deployment-progress; then
  git worktree add --detach "$WORKTREE" origin/deployment-progress
  (
    cd "$WORKTREE"
    git checkout -B deployment-progress origin/deployment-progress
    cp "$TRACE" oneworldz-zed-runtime-failure.txt
    printf 'run_id=%s\ncommit=%s\nstage=%s\nexit_code=%s\ncore_commit=%s\n' \
      "$GITHUB_RUN_ID" "$GITHUB_SHA" "$stage" "$rc" "$CORE_COMMIT" \
      > oneworldz-zed-runtime-failure.meta
    git config user.name 'github-actions[bot]'
    git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
    git add oneworldz-zed-runtime-failure.txt oneworldz-zed-runtime-failure.meta
    git commit -m "Record ZED runtime failure ${GITHUB_RUN_ID}" || true
    git push origin HEAD:deployment-progress || true
  )
  git worktree remove "$WORKTREE" --force || true
fi

exit "$rc"
