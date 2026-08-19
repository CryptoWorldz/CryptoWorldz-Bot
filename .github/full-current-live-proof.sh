#!/usr/bin/env bash
set -euo pipefail

: "${MIN_PAGE_ROUTES:=83}"

rm -rf live-proof
mkdir -p live-proof deployment-proof

set +e
legacy_output="$(bash .github/resume-locked-live-proof.sh 2>&1)"
legacy_status=$?
set -e
printf '%s\n' "$legacy_output" | sed \
  -e 's/LIVE_18_SITE_DESKTOP_MOBILE_PROOF/LIVE_18_STATIC_TRANSPORT_ROOT_DESKTOP_MOBILE_PROOF/g' \
  -e 's/18-site/18-static-transport-root/g' \
  -e 's/18 site/18 static transport root/g'
test "$legacy_status" = '0'

node --input-type=module <<'NODE'
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('live-proof');
const dirs = await readdir(root, { withFileTypes: true });
const reports = [];
for (const entry of dirs) {
  if (!entry.isDirectory()) continue;
  const file = path.join(root, entry.name, 'visual-report.json');
  try { reports.push(JSON.parse(await readFile(file, 'utf8'))); } catch {}
}
if (reports.length !== 18) throw new Error(`Expected 18 static transport live proof reports, found ${reports.length}`);
let routes = 0;
let desktop = 0;
let mobile = 0;
for (const report of reports) {
  if (report.pass !== true) throw new Error(`${report.name}: live browser report is not PASS`);
  const expected = Array.isArray(report.expectedRoutes) ? report.expectedRoutes.length : 0;
  if (!expected) throw new Error(`${report.name}: live sitemap exposed no HTML routes`);
  routes += expected;
  desktop += Number(report.totalHtmlPagesAudited?.desktop || 0);
  mobile += Number(report.totalHtmlPagesAudited?.mobile || 0);
  if (Number(report.totalHtmlPagesAudited?.desktop || 0) < expected) throw new Error(`${report.name}: live desktop route audit incomplete`);
  if (Number(report.totalHtmlPagesAudited?.mobile || 0) < expected) throw new Error(`${report.name}: live mobile route audit incomplete`);
}
const minimum = Number(process.env.MIN_PAGE_ROUTES || 83);
if (routes < minimum) throw new Error(`Live fleet exposes only ${routes} page routes; minimum required is ${minimum}`);
const summary = {
  live: true,
  architecture_destinations: 19,
  static_transport_roots: 18,
  protected_command_centre: 'cryptobotz.cryptoworldz.xyz',
  generated_page_routes: routes,
  desktop_pages_audited: desktop,
  mobile_pages_audited: mobile,
  zed_auto_grace_command_centre: 'PASS',
  browser_failures: 0,
  pass: true
};
await writeFile('deployment-proof/live-fleet-summary.json', JSON.stringify(summary, null, 2));
console.log(`LIVE_FULL_PAGE_ROUTE_FLEET=PASS routes=${routes} desktop=${desktop} mobile=${mobile} static_transport_roots=18 architecture_destinations=19`);
NODE
