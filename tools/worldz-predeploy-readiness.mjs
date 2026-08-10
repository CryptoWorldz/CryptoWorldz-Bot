import { lookup } from 'node:dns/promises';
import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const targets = [
  ['OneWorldz','https://oneworldz.com/'],
  ['Reagan','https://oneworldz.com/reagan-kauja/'],
  ['ImpactBased','https://impactbased.oneworldz.com/'],
  ['LawWorldz','https://law.oneworldz.com/'],
  ['LearnWorldz','https://learn.oneworldz.com/'],
  ['BitcoinWorldz','https://bitcoinworldz.xyz/'],
  ['CryptoWorldz','https://cryptoworldz.xyz/'],
  ['SolWorldz','https://solworldz.xyz/'],
  ['EthWorldz','https://ethworldz.xyz/'],
  ['BaseWorldz','https://baseworldz.xyz/'],
  ['BNBWorldz','https://bnbworldz.xyz/'],
  ['XRPWorldz','https://xrpworldz.xyz/'],
  ['SuiWorldz','https://suiworldz.xyz/'],
  ['HyperWorldz','https://hyperworldz.xyz/'],
  ['RobinWorldz','https://robinworldz.xyz/'],
  ['HodlerWorldz','https://hodlerworldz.xyz/'],
  ['PurpleDiamondCrew','https://purplediamondcrew.com/']
];

const fundraiserCandidates = [
  ['Verified Reagan / Action Spread Smiles campaign','https://gofund.me/c2e4fa936']
];

const sourceChecks = [
  ['PDC Crew HQ','apps/worldz-sites/purplediamondcrew/index.html','https://t.me/PurpleDiamondCrew'],
  ['PDC verified donation campaign','apps/worldz-sites/purplediamondcrew/index.html','https://gofund.me/c2e4fa936'],
  ['PDC Reagan page','apps/worldz-sites/purplediamondcrew/index.html','https://oneworldz.com/reagan-kauja/'],
  ['PDC CryptoWorldz','apps/worldz-sites/purplediamondcrew/index.html','https://cryptoworldz.xyz'],
  ['PDC intended ImpactBased route','apps/worldz-sites/purplediamondcrew/index.html','https://impactbased.oneworldz.com'],
  ['PDC donate page verified campaign','apps/worldz-sites/purplediamondcrew/donate/index.html','https://gofund.me/c2e4fa936'],
  ['PDC Hope Chest verified campaign','apps/worldz-sites/purplediamondcrew/hope-chest/index.html','https://gofund.me/c2e4fa936'],
  ['Reagan Facebook','apps/cryptoworldz-web-core/reagan-kauja.html','https://www.facebook.com/share/196pruFjJq/?mibextid=wwXIfr'],
  ['Reagan TikTok','apps/cryptoworldz-web-core/reagan-kauja.html','https://www.tiktok.com/@actionspreadsmilesorg'],
  ['Reagan YouTube','apps/cryptoworldz-web-core/reagan-kauja.html','https://youtube.com/@action_spread_smiles'],
  ['Reagan WhatsApp','apps/cryptoworldz-web-core/reagan-kauja.html','https://wa.me/256752673029'],
  ['Reagan donation campaign','apps/cryptoworldz-web-core/reagan-kauja.html','https://gofund.me/c2e4fa936'],
  ['Reagan approved children media','apps/cryptoworldz-web-core/assets/reagan-smiles-media.js','/assets/images/website-core/action-creates-smiles/action-creates-smiles-reagan-kids.webp'],
  ['Approved chain hero','apps/cryptoworldz-web-core/assets/coming-soon-next.js','assets/worldz-master/cryptoworldz/we-need-you.png']
];

const requiredFiles = [
  'apps/worldz-sites/purplediamondcrew/mission/index.html',
  'apps/worldz-sites/purplediamondcrew/our-work/index.html',
  'apps/worldz-sites/purplediamondcrew/impact/index.html',
  'apps/worldz-sites/purplediamondcrew/crew/index.html',
  'apps/worldz-sites/purplediamondcrew/donate/index.html',
  'apps/worldz-sites/purplediamondcrew/hope-chest/index.html',
  'apps/cryptoworldz-web-core/assets/images/website-core/action-creates-smiles/action-creates-smiles-reagan-kids.webp',
  'media/approved-worldz/worldz-master-images-approved-v2.zip',
  'media/approved-worldz/worldz-master-images-approved-v2.sha256',
  'tools/restore-approved-worldz-media.sh'
];

async function probeUrl(url, timeoutMs=20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {'user-agent':'CryptoWorldz-Predeploy-Proof/1.0','cache-control':'no-cache'}
    });
    return {ok: response.ok, status: response.status, finalUrl: response.url};
  } catch (error) {
    return {ok:false,status:null,finalUrl:null,error:error?.cause?.code || error?.name || String(error)};
  } finally { clearTimeout(timer); }
}

const result = {generatedAt:new Date().toISOString(), targets:[], fundraiserCandidates:[], sourceChecks:[], requiredFiles:[]};

for (const [name,url] of targets) {
  const host = new URL(url).hostname;
  let dns;
  try { dns = await lookup(host,{all:true}); }
  catch { dns = []; }
  const web = dns.length ? await probeUrl(url) : {ok:false,status:null,finalUrl:null,error:'DNS_NOT_RESOLVED'};
  const row = {name,url,host,dnsResolved:dns.length>0,addresses:dns.map(x=>x.address),https:web};
  result.targets.push(row);
  console.log(`${row.dnsResolved?'DNS':'NO-DNS'} ${name} ${host} :: ${web.status ?? web.error ?? 'no-http'}`);
}

for (const [name,url] of fundraiserCandidates) {
  const web = await probeUrl(url,30000);
  const row = {name,url,...web};
  result.fundraiserCandidates.push(row);
  console.log(`${web.ok?'LINK':'BAD-LINK'} ${name} :: ${url} -> ${web.finalUrl || web.error || web.status}`);
}

for (const [name,path,needle] of sourceChecks) {
  try {
    const text = await readFile(path,'utf8');
    const ok = text.includes(needle);
    result.sourceChecks.push({name,path,needle,ok});
    console.log(`${ok?'SOURCE':'MISSING'} ${name}`);
  } catch (error) {
    result.sourceChecks.push({name,path,needle,ok:false,error:error.code||String(error)});
    console.log(`MISSING ${name} :: ${error.code||error}`);
  }
}

for (const path of requiredFiles) {
  let ok=true; try { await access(path,constants.R_OK); } catch { ok=false; }
  result.requiredFiles.push({path,ok});
  console.log(`${ok?'FILE':'NO-FILE'} ${path}`);
}

const activeCoreFiles = [
  'apps/cryptoworldz-web-core/index.html',
  'apps/cryptoworldz-web-core/reagan-kauja.html',
  'apps/cryptoworldz-web-core/assets/app.js',
  'apps/cryptoworldz-web-core/assets/site-router.js',
  'apps/cryptoworldz-web-core/assets/coming-soon-next.js'
];
let retiredDomainHits=[];
for (const path of activeCoreFiles) {
  try {
    const text=await readFile(path,'utf8');
    if (/solworld\.fun/i.test(text)) retiredDomainHits.push(path);
  } catch {}
}
result.retiredDomainHits=retiredDomainHits;

await import('node:fs/promises').then(({mkdir,writeFile})=>mkdir('predeploy-readiness',{recursive:true}).then(()=>writeFile('predeploy-readiness/report.json',JSON.stringify(result,null,2))));

const sourceOk = result.sourceChecks.every(x=>x.ok) && result.requiredFiles.every(x=>x.ok) && retiredDomainHits.length===0;
const liveReady = result.targets.filter(x=>x.dnsResolved && x.https.ok).map(x=>x.name);
const dnsBlocked = result.targets.filter(x=>!x.dnsResolved).map(x=>x.name);
const httpsBlocked = result.targets.filter(x=>x.dnsResolved && !x.https.ok).map(x=>x.name);
console.log(`SOURCE_GATE=${sourceOk?'PASS':'FAIL'}`);
console.log(`LIVE_READY=${liveReady.join(',')}`);
console.log(`DNS_BLOCKED=${dnsBlocked.join(',')}`);
console.log(`HTTPS_BLOCKED=${httpsBlocked.join(',')}`);

// This readiness audit is intentionally non-deploying. Source failures are fatal;
// DNS/HTTPS failures are reported as deployment blockers rather than modified here.
if (!sourceOk) process.exitCode=1;
