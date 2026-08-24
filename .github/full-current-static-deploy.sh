#!/usr/bin/env bash
set -euo pipefail

: "${CANDIDATE_TREE:?}"
: "${CANDIDATE_FINGERPRINT:?}"

export LOCKED_STATIC_TREE="$CANDIDATE_TREE"

# The 93-route rebuild deliberately replaces the former footer-based webpage
# contract with a full-viewport one-screen application contract. Validate the
# candidate locally before any Hostinger write, then run the proven resumable
# backup/upload/byte-proof engine with only its obsolete post-write footer
# assertions replaced in a temporary copy.
node --input-type=module <<'NODE'
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { productionTargets } from './apps/oneworldz-ecosystem-release/production-targets.mjs';

const root = path.resolve('apps/oneworldz-ecosystem-release/dist/ecosystem');
for (const target of productionTargets) {
  const html = await readFile(path.join(root, target.key, 'index.html'), 'utf8');
  for (const required of [
    'data-one-screen="true"',
    'id="menu-button"',
    'data-last-page="acknowledgements"'
  ]) {
    if (!html.includes(required)) throw new Error(`${target.key} missing one-screen deployment invariant: ${required}`);
  }
  if (/Created by JayJayTeamDev|Designed by JayJayTeamDev/i.test(html)) {
    throw new Error(`${target.key} contains superseded creator footer text`);
  }
}
console.log('ONE_SCREEN_LOCAL_DEPLOY_CONTRACT=PASS targets=18 routes=93');
NODE

patched_deployer="$RUNNER_TEMP/resume-one-screen-static-deploy.sh"
cp .github/resume-locked-static-deploy.sh "$patched_deployer"
python3 - "$patched_deployer" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
text = p.read_text(encoding='utf-8')
old = '''  grep -Fq 'Created with the Vision' "$public_index"
  grep -Fq "Why can't I?" "$public_index"
  ! grep -Eiq 'Created by JayJayTeamDev|Designed by JayJayTeamDev' "$public_index"
'''
new = '''  grep -Fq 'data-one-screen="true"' "$public_index"
  grep -Fq 'id="menu-button"' "$public_index"
  grep -Fq 'data-last-page="acknowledgements"' "$public_index"
  ! grep -Eiq 'Created by JayJayTeamDev|Designed by JayJayTeamDev' "$public_index"
  echo "ONE_SCREEN_PUBLIC_CONTRACT=PASS https://$domain/"
'''
if text.count(old) != 1:
    raise SystemExit('Expected exactly one obsolete footer assertion block in resumable deployer')
p.write_text(text.replace(old, new), encoding='utf-8')
PY
chmod +x "$patched_deployer"

set +e
deploy_output="$(bash "$patched_deployer" 2>&1)"
deploy_status=$?
set -e
printf '%s\n' "$deploy_output" | sed \
  -e 's/HOSTINGER_18_SITE_DEPLOYMENT/HOSTINGER_18_STATIC_TRANSPORT_DEPLOYMENT/g' \
  -e 's/18-site/18-static-transport/g' \
  -e 's/18 site/18 static transport/g'
test "$deploy_status" = '0'

mkdir -p deployment-proof
cat > deployment-proof/current-candidate.txt <<EOF
run_id=$GITHUB_RUN_ID
commit=$GITHUB_SHA
candidate_tree=$CANDIDATE_TREE
candidate_fingerprint=$CANDIDATE_FINGERPRINT
static_transport_roots=18
architecture_destinations=19
candidate_policy=BUILD_CURRENT_MAIN_THEN_FREEZE_WITHIN_RUN
EOF

echo "HOSTINGER_CURRENT_CANDIDATE_STATIC_TRANSPORT=PASS tree=$CANDIDATE_TREE fingerprint=$CANDIDATE_FINGERPRINT roots=18"
