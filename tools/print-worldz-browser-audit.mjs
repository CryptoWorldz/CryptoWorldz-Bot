import { readFileSync } from 'node:fs';

const reportPath = process.argv[2] || 'browser-audit/report.json';
const shouldFail = process.argv.includes('--fail');
const report = JSON.parse(readFileSync(reportPath, 'utf8'));

console.log(JSON.stringify(report.totals, null, 2));
for (const result of report.results || []) {
  const summary = result.summary || {};
  const reasons = (summary.failureReasons || []).join('; ') || '-';
  console.log(
    `${summary.pass ? 'PASS' : 'FAIL'} ${String(result.viewport || '').padEnd(7)} ${result.url} ` +
    `http=${summary.mainDocumentStatus ?? '-'} visible=${summary.visibleImages ?? '-'} ` +
    `broken=${summary.brokenImages ?? '-'} undersized=${summary.undersizedImages ?? '-'} ` +
    `docFailures=${summary.documentFailures ?? '-'} reason=${reasons}`
  );
}

if (shouldFail && Number(report.totals?.failed || 0) > 0) {
  console.error(`${report.totals.failed} browser audit targets failed.`);
  process.exitCode = 1;
}
