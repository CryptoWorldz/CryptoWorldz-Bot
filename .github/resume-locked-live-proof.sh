#!/usr/bin/env bash
set -euo pipefail

mkdir -p live-proof
cd apps/oneworldz-ecosystem-release
node --input-type=module <<'NODE' > "$RUNNER_TEMP/live-targets.tsv"
import { productionTargets } from './production-targets.mjs';
for (const target of productionTargets) {
  console.log([target.key,target.domain,target.expectedTitle,target.requiredIdentityText,target.requiredIdentityImage].join('\t'));
}
NODE
test "$(wc -l < "$RUNNER_TEMP/live-targets.tsv" | tr -d ' ')" = '18'
failed=0
while IFS=$'\t' read -r key domain title required_text required_image; do
  node browser-visual-proof.mjs \
    --name "$key" \
    --url "https://$domain/?live_proof=${GITHUB_RUN_ID}-${key}" \
    --expected-title "$title" \
    --required-text "$required_text" \
    --required-image "$required_image" \
    --out "$GITHUB_WORKSPACE/live-proof/$key" || failed=1
done < "$RUNNER_TEMP/live-targets.tsv"
test "$(find "$GITHUB_WORKSPACE/live-proof" -mindepth 2 -maxdepth 2 -name visual-report.json | wc -l | tr -d ' ')" = '18' || failed=1
test "$(find "$GITHUB_WORKSPACE/live-proof" -mindepth 2 -maxdepth 2 -name desktop.png | wc -l | tr -d ' ')" = '18' || failed=1
test "$(find "$GITHUB_WORKSPACE/live-proof" -mindepth 2 -maxdepth 2 -name mobile.png | wc -l | tr -d ' ')" = '18' || failed=1
test "$failed" = '0'
echo 'LIVE_18_SITE_DESKTOP_MOBILE_PROOF=PASS'
cd "$GITHUB_WORKSPACE"

passed=0
for attempt in $(seq 1 30); do
  health="$(curl --fail --silent --show-error --location --connect-timeout 15 --max-time 30 -H 'Cache-Control: no-cache' "https://cryptobotz.cryptoworldz.xyz/health?proof=${GITHUB_RUN_ID}-${attempt}" || true)"
  root="$(curl --fail --silent --show-error --location --connect-timeout 15 --max-time 30 -H 'Cache-Control: no-cache' "https://cryptobotz.cryptoworldz.xyz/?proof=${GITHUB_RUN_ID}-${attempt}" || true)"
  mini_code="$(curl --silent --show-error --location --connect-timeout 15 --max-time 30 -o "$RUNNER_TEMP/miniapp.html" -w '%{http_code}' -H 'Cache-Control: no-cache' "https://cryptobotz.cryptoworldz.xyz/miniapp/?proof=${GITHUB_RUN_ID}-${attempt}" || true)"
  gpt="$(curl --fail --silent --show-error --location --connect-timeout 15 --max-time 30 -H 'Cache-Control: no-cache' "https://cryptobotz.cryptoworldz.xyz/api/oneworldz-gpt/status?proof=${GITHUB_RUN_ID}-${attempt}" || true)"
  if printf '%s' "$health" | grep -Fq '"ok":true' \
    && printf '%s' "$root" | grep -Fq '"service":"CryptoWorldz Zed Bot"' \
    && [ "$mini_code" = '200' ] \
    && grep -Fq 'id="splashback"' "$RUNNER_TEMP/miniapp.html" \
    && printf '%s' "$gpt" | grep -Fq '"ok":true' \
    && printf '%s' "$gpt" | grep -Fq '"openai_api_configured":true'; then
    passed=1
    break
  fi
  echo "LIVE_ZED_CONVERGENCE attempt=$attempt mini=$mini_code"
  sleep 10
done
test "$passed" = '1'
echo 'LIVE_ZED_MINIAPP_GPT_PROOF=PASS'

bash .github/publish-progress.sh LIVE_PROOF PASS
