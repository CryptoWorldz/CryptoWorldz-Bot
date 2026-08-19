#!/usr/bin/env bash
set -Eeuo pipefail

# Execute the exact repaired ZED recovery core from the wiring-repair commit.
# On failure, preserve the exact tail on a dedicated diagnostic branch that the
# generic deployment-progress publisher cannot overwrite.
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

tail -n 320 "$LOG" > "$TRACE" || cp "$LOG" "$TRACE"

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

# Keep the normal authenticated progress signal, but write detailed evidence to
# an independent branch so the workflow's later generic FAIL cannot erase it.
bash .github/publish-progress.sh "ZED_${stage}" FAIL || true

WORKTREE="$RUNNER_TEMP/zed-diagnostic-worktree"
rm -rf "$WORKTREE"
git worktree add --detach "$WORKTREE" HEAD
(
  cd "$WORKTREE"
  git checkout --orphan zed-runtime-diagnostics
  git rm -rf . >/dev/null 2>&1 || true
  cp "$TRACE" oneworldz-zed-runtime-failure.txt
  printf 'run_id=%s\ncommit=%s\nstage=%s\nexit_code=%s\ncore_commit=%s\n' \
    "$GITHUB_RUN_ID" "$GITHUB_SHA" "$stage" "$rc" "$CORE_COMMIT" \
    > oneworldz-zed-runtime-failure.meta
  git config user.name 'github-actions[bot]'
  git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
  git add oneworldz-zed-runtime-failure.txt oneworldz-zed-runtime-failure.meta
  git commit -m "Record ZED runtime failure ${GITHUB_RUN_ID}"
  git push --force origin HEAD:zed-runtime-diagnostics
)
git worktree remove "$WORKTREE" --force || true

exit "$rc"
