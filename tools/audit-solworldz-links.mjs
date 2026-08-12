const targets = [
  'https://oneworldz.com',
  'https://cryptoworldz.xyz',
  'https://solworldz.xyz',
  'https://ethworldz.xyz',
  'https://baseworldz.xyz',
  'https://bnbworldz.xyz',
  'https://xrpworldz.xyz',
  'https://hyperworldz.xyz',
  'https://robinworldz.xyz',
  'https://www.based.bid/b/ImpactBased',
  'https://purplediamondcrew.com'
];

const pending = ['SuiWorldz', 'BitcoinWorldz', 'LearnWorldz'];

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    let response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 SolWorldzReleaseGate/1.0' }
    });
    if ([403, 405].includes(response.status)) {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': 'Mozilla/5.0 SolWorldzReleaseGate/1.0' }
      });
    }
    const reachable = (response.status >= 200 && response.status < 400) || [401, 403].includes(response.status);
    return { url, status: response.status, finalUrl: response.url, reachable };
  } catch (error) {
    return { url, status: 0, finalUrl: '', reachable: false, error: error?.cause?.code || error?.name || String(error) };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
for (const target of targets) {
  const result = await probe(target);
  results.push(result);
  console.log(`${result.reachable ? 'OK' : 'FAIL'} ${result.status || 'NET'} ${result.url}${result.finalUrl && result.finalUrl !== result.url ? ` -> ${result.finalUrl}` : ''}${result.error ? ` (${result.error})` : ''}`);
}

for (const name of pending) console.log(`PENDING ${name} — visible on SolWorldz but intentionally non-clickable until its official live destination passes this gate.`);

const failures = results.filter(result => !result.reachable);
if (failures.length) {
  console.error(`SolWorldz link gate failed: ${failures.length} published clickable destination(s) are not currently reachable.`);
  process.exit(1);
}
console.log(`SolWorldz link gate passed: all ${results.length} published clickable destinations are reachable; ${pending.length} unconnected Worldz remain safely marked pending.`);
