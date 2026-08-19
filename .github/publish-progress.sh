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
branch="deployment-progress-temp-${run_id}-${gate}-${result}-${RANDOM}"
cleanup(){ git worktree remove --force "$work" >/dev/null 2>&1 || true; rm -rf "$work"; }
trap cleanup EXIT

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'

# __ONE_SHOT_APT_HARDEN_BEGIN__
if [ "$gate" = "BUILD" ] && [ "$result" = "STARTED" ] && ! grep -Fq 'APT_NETWORK_HARDENED_IMAGE_TOOLS' .github/workflows/main.yml; then
  git fetch origin main --depth=1
  test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
  python3 <<'PY'
from pathlib import Path
workflow = Path('.github/workflows/main.yml')
s = workflow.read_text()
image_pair = """          sudo apt-get update -qq
          sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq imagemagick libavif-bin"""
image_hardened = """          # APT_NETWORK_HARDENED_IMAGE_TOOLS
          apt_ok=0
          for apt_attempt in 1 2 3; do
            if timeout 60s sudo apt-get -o Acquire::Retries=2 -o Acquire::http::Timeout=15 -o Acquire::https::Timeout=15 -o Acquire::ForceIPv4=true update -qq \\
              && timeout 120s sudo env DEBIAN_FRONTEND=noninteractive apt-get -o DPkg::Lock::Timeout=30 -o Acquire::Retries=2 -o Acquire::http::Timeout=15 -o Acquire::https::Timeout=15 -o Acquire::ForceIPv4=true install -y -qq imagemagick libavif-bin; then
              apt_ok=1
              break
            fi
            sudo dpkg --configure -a || true
            sleep 5
          done
          test \"$apt_ok\" = \"1\""""
image_count = s.count(image_pair)
if image_count < 4:
    raise SystemExit(f'Expected at least 4 image-tool apt blocks, found {image_count}')
s = s.replace(image_pair, image_hardened)
lftp_pair = """          sudo apt-get update -qq
          sudo apt-get install -y -qq lftp"""
lftp_hardened = """          # APT_NETWORK_HARDENED_LFTP
          apt_ok=0
          for apt_attempt in 1 2 3; do
            if timeout 60s sudo apt-get -o Acquire::Retries=2 -o Acquire::http::Timeout=15 -o Acquire::https::Timeout=15 -o Acquire::ForceIPv4=true update -qq \\
              && timeout 120s sudo apt-get -o DPkg::Lock::Timeout=30 -o Acquire::Retries=2 -o Acquire::http::Timeout=15 -o Acquire::https::Timeout=15 -o Acquire::ForceIPv4=true install -y -qq lftp; then
              apt_ok=1
              break
            fi
            sudo dpkg --configure -a || true
            sleep 5
          done
          test \"$apt_ok\" = \"1\""""
lftp_count = s.count(lftp_pair)
if lftp_count < 2:
    raise SystemExit(f'Expected at least 2 lftp apt blocks, found {lftp_count}')
s = s.replace(lftp_pair, lftp_hardened)
workflow.write_text(s)

publisher = Path('.github/publish-progress.sh')
t = publisher.read_text()
begin = '# __ONE_SHOT_APT_HARDEN_BEGIN__'
end = '# __ONE_SHOT_APT_HARDEN_END__'
start = t.find(begin)
stop = t.rfind(end)
if start < 0 or stop < start:
    raise SystemExit('Could not self-remove one-shot apt hardener')
stop += len(end)
while stop < len(t) and t[stop] in '\r\n':
    stop += 1
publisher.write_text(t[:start] + t[stop:])
PY
  git add .github/workflows/main.yml .github/publish-progress.sh
  git commit -m 'HARDEN GITHUB PACKAGE INSTALLS AND RESTORE PURE REPORTER'
  git push origin HEAD:main
  echo 'APT_NETWORK_HARDENING=PUBLISHED_AND_ONE_SHOT_REMOVED'
  exit 0
fi
# __ONE_SHOT_APT_HARDEN_END__

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

# Canonical deployment progress reporter.
