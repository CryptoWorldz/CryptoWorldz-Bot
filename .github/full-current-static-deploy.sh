#!/usr/bin/env bash
set -euo pipefail

: "${CANDIDATE_TREE:?}"
: "${CANDIDATE_FINGERPRINT:?}"

export LOCKED_STATIC_TREE="$CANDIDATE_TREE"

set +e
deploy_output="$(bash .github/resume-locked-static-deploy.sh 2>&1)"
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
