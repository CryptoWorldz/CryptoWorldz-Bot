import fs from 'node:fs/promises';
const key=process.env.PUMP_API_KEY;
if(!key) { console.error('PUMP_API_KEY missing. Apply at developers.pump.fun, then save key as GitHub Actions secret.'); process.exitCode=2; }
else {
 const source='launchpad.cryptoworldz.xyz/wallet-snapshots/pumpfun-creator-candidates.latest.json';
 const out='launchpad.cryptoworldz.xyz/wallet-snapshots/pumpfun-api-profiles.latest.json';
 const {creators=[]}=JSON.parse(await fs.readFile(source,'utf8'));
 const rows=[];
 for(const c of creators) {
  if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(c.address))continue;
  const response=await fetch('https://api.pump.fun/v1/users/'+encodeURIComponent(c.address),{headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(20000)});
  if(response.status===429){const wait=Math.min(30,Math.max(1,Number(response.headers.get('retry-after'))||2));await new Promise(r=>setTimeout(r,wait*1000));continue}
  if(!response.ok){rows.push({address:c.address,status:response.status,error:(await response.text()).slice(0,180)});continue}
  const body=await response.json();
  const data=body.data??body;
  rows.push({address:c.address,status:200,profile:data,source:'https://api.pump.fun/v1/users/'+c.address,warning:'Profile response does not prove token creation; separate launch evidence required'});
  await new Promise(r=>setTimeout(r,650));
 }
 await fs.writeFile(out,JSON.stringify({generatedAt:new Date().toISOString(),source:'pump.fun official read-only Developer API',profiles:rows},null,2)+'\n');
 console.log('Fetched '+rows.filter(x=>x.status===200).length+' profiles; '+rows.length+' responses');
}
