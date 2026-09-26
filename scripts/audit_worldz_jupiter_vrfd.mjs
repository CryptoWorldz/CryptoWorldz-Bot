import fs from 'node:fs/promises';

const pack=JSON.parse(await fs.readFile('worldzpad-mainnet/worlddexpush/jupiter-vrfd-worldz.v1.json','utf8'));
const report={schema:'WORLDZ-JUPITER-VRFD-AUDIT-V1',generatedAt:new Date().toISOString(),tokens:[]};

async function getJson(url,timeoutMs=20000){
  const ctl=new AbortController(), timer=setTimeout(()=>ctl.abort(),timeoutMs);
  try{
    const r=await fetch(url,{headers:{accept:'application/json','user-agent':'Worldz-Jupiter-VRFD-Audit/1.0'},signal:ctl.signal});
    const text=await r.text(); let body=null; try{body=JSON.parse(text)}catch{}
    return {ok:r.ok,status:r.status,body,error:r.ok?null:text.slice(0,500)};
  }catch(e){return {ok:false,status:null,body:null,error:String(e)}}
  finally{clearTimeout(timer)}
}

let hardFail=false;
for(const token of pack.tokens){
  const url=pack.provider.tokensApi.replace('{MINT}',encodeURIComponent(token.mint));
  const response=await getJson(url);
  const rows=Array.isArray(response.body)?response.body:[];
  const hit=rows.find(x=>x.id===token.mint||x.address===token.mint)||rows[0]||null;
  const observed=hit?{
    name:hit.name??null,symbol:hit.symbol??null,icon:hit.icon??hit.logoURI??null,
    isVerified:hit.isVerified??null,usdPrice:hit.usdPrice??null,liquidity:hit.liquidity??null,
    organicScore:hit.organicScore??null,organicScoreLabel:hit.organicScoreLabel??null
  }:null;

  let state='API_UNAVAILABLE';
  if(response.ok&&hit){
    const name=String(hit.name??''), symbol=String(hit.symbol??'');
    if(name===token.name&&symbol===token.symbol) state='PASS';
    else if(!name&&!symbol) state='PENDING_JUPITER_METADATA';
    else { state='FAIL_WRONG_NONBLANK_IDENTITY'; hardFail=true; }
  }else if(response.ok&&!hit) state='PENDING_NOT_RETURNED';

  report.tokens.push({
    mint:token.mint,expected:{name:token.name,symbol:token.symbol,image:token.image},
    httpStatus:response.status,state,observed,error:response.error??null,vrfdDashboard:token.vrfdDashboard
  });
  console.log('JUPITER_VRFD',token.symbol,state,JSON.stringify(observed));
}
await fs.mkdir('artifacts',{recursive:true});
await fs.writeFile('artifacts/worldz-jupiter-vrfd-status.json',JSON.stringify(report,null,2)+'\n');
console.log('WORLDZ_JUPITER_VRFD_REPORT=artifacts/worldz-jupiter-vrfd-status.json');
if(hardFail) process.exitCode=1;
