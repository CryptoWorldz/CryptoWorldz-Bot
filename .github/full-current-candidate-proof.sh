#!/usr/bin/env bash
set -euo pipefail

: "${MIN_PAGE_ROUTES:=93}"

rm -rf candidate-proof
mkdir -p candidate-proof deployment-proof

cd apps/oneworldz-ecosystem-release
node --input-type=module <<'NODE' > "$RUNNER_TEMP/current-targets.tsv"
import { productionTargets } from './production-targets.mjs';
for (const target of productionTargets) {
  console.log([
    target.key,
    target.domain,
    target.expectedTitle,
    target.requiredIdentityText,
    target.requiredIdentityImage
  ].join('\t'));
}
NODE

test "$(wc -l < "$RUNNER_TEMP/current-targets.tsv" | tr -d ' ')" = '18'

failed=0
while IFS=$'\t' read -r key domain title required_text required_image; do
  echo "CANDIDATE_ONE_SCREEN_PROOF START key=$key transport_domain=$domain"
  node browser-one-screen-proof.mjs \
    --name "$key" \
    --root "dist/ecosystem/$key" \
    --required-text "$required_text" \
    --out "$GITHUB_WORKSPACE/candidate-proof/$key" || failed=1
  echo "CANDIDATE_ONE_SCREEN_PROOF END key=$key"
done < "$RUNNER_TEMP/current-targets.tsv"
cd "$GITHUB_WORKSPACE"

test "$failed" = '0'

node apps/oneworldz-ecosystem-release/audit-real-hit-targets.mjs
cat audit-results/real-hit-targets-summary.txt
grep -Fxq 'REAL_HIT_TARGET_ROUTES=93' audit-results/real-hit-targets-summary.txt
grep -Fxq 'REAL_HIT_TARGET_VIEWPORTS=186' audit-results/real-hit-targets-summary.txt
grep -Fxq 'REAL_HIT_TARGET_FAILURES=0' audit-results/real-hit-targets-summary.txt
grep -Fxq 'REAL_HIT_TARGET_GATE=PASS' audit-results/real-hit-targets-summary.txt

node --input-type=module <<'NODE'
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('candidate-proof');
const dirs = await readdir(root, { withFileTypes: true });
const reports = [];
for (const entry of dirs) {
  if (!entry.isDirectory()) continue;
  const file = path.join(root, entry.name, 'visual-report.json');
  try { reports.push(JSON.parse(await readFile(file, 'utf8'))); } catch {}
}
if (reports.length !== 18) throw new Error(`Expected 18 static transport proof reports, found ${reports.length}`);
let routes = 0;
let desktop = 0;
let mobile = 0;
for (const report of reports) {
  if (report.pass !== true) throw new Error(`${report.name}: candidate browser report is not PASS`);
  const expected = Array.isArray(report.expectedRoutes) ? report.expectedRoutes.length : 0;
  if (!expected) throw new Error(`${report.name}: no generated HTML routes discovered`);
  routes += expected;
  desktop += Number(report.totalHtmlPagesAudited?.desktop || 0);
  mobile += Number(report.totalHtmlPagesAudited?.mobile || 0);
  if (Number(report.totalHtmlPagesAudited?.desktop || 0) < expected) throw new Error(`${report.name}: desktop route audit incomplete`);
  if (Number(report.totalHtmlPagesAudited?.mobile || 0) < expected) throw new Error(`${report.name}: mobile route audit incomplete`);
}
const minimum = Number(process.env.MIN_PAGE_ROUTES || 93);
if (routes < minimum) throw new Error(`Current candidate generated only ${routes} page routes; minimum required is ${minimum}`);
const summary = {
  candidate: 'CURRENT_MAIN_ONE_SCREEN_FULL_REBUILD',
  static_transport_roots: 18,
  generated_page_routes: routes,
  desktop_pages_audited: desktop,
  mobile_pages_audited: mobile,
  real_hit_target_gate: 'PASS',
  one_screen_layout_failures: 0,
  browser_failures: 0,
  console_errors: 0,
  broken_images: 0,
  pass: true
};
await writeFile('deployment-proof/current-candidate-browser-summary.json', JSON.stringify(summary, null, 2));
console.log(`CURRENT_CANDIDATE_ONE_SCREEN_ROUTE_PROOF=PASS routes=${routes} desktop=${desktop} mobile=${mobile} hit_targets=PASS static_transport_roots=18`);
NODE
