import fs from 'node:fs/promises';
const targets=[{platform:'bonk.fun',url:'https://www.bonk.fun/'},{platform:'revshare.ltd',url:'https://app.revshare.ltd/'}];
const addr=/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
const results=[];
for(const target of targets){
 try{
  const r=await fetch(target.url,{headers:{'user-agent':'Mozilla/5.0 (compatible; WorldzPublicResearch/1.0)','accept':'text/html'},signal:AbortSignal.timeout(20000)});
  const html=await r.text();
  const addresses=[...new Set(html.match(addr)||[])];
  results.push({...target,httpStatus:r.status,htmlBytes:html.length,publicAddressesFound:addresses.length,candidates:addresses.map(address=>({address,chain:'solana',source:target.url,role:'unverified page mention',creatorVerified:false})),note:'Raw addresses in a page do NOT establish creator attribution. Do not count as verified Dev City recipients.'});
 }catch(e){results.push({...target,error:String(e),candidates:[]})}
}
const out={generatedAt:new Date().toISOString(),results};
await fs.mkdir('launchpad.cryptoworldz.xyz/wallet-snapshots',{recursive:true});
await fs.writeFile('launchpad.cryptoworldz.xyz/wallet-snapshots/bonk-revshare-research.latest.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(results.map(({platform,httpStatus,publicAddressesFound,error})=>({platform,httpStatus,publicAddressesFound,error}))));
