import fs from 'node:fs/promises';

const strict=process.argv.includes('--strict') || process.env.WORLDZ_RELEASE_STRICT==='1';
const mrcl=JSON.parse(await fs.readFile('worldzpad-omnichain/fullscope/worldz-miracle-token.v1.json','utf8'));
const quality=JSON.parse(await fs.readFile('worldzpad-omnichain/fullscope/worldz-launch-quality-gate.v1.json','utf8'));
const mint=mrcl.token?.canonicalMint ?? null;
const expected={
  name:mrcl.launchQualityGate?.metadata?.name ?? mrcl.token?.name,
  symbol:mrcl.launchQualityGate?.metadata?.symbol ?? mrcl.token?.symbol,
  image:mrcl.launchQualityGate?.metadata?.canonicalImage ?? null,
  website:mrcl.launchQualityGate?.metadata?.website ?? null,
  description:mrcl.launchQualityGate?.metadata?.description ?? null
};

const report={
  schema:'WORLDZ-LAUNCH-SURFACE-AUDIT-V1',
  generatedAt:new Date().toISOString(),
  token:'MIRACLE',
  symbol:'MRCL',
  mint,
  strict,
  expected,
  jupiter:{state:'PENDING'},
  dexScreener:{state:'PENDING'},
  release:{state:'BLOCKED'}
};

function placeholder(v){
  return v==null || String(v).startsWith('PENDING_') || String(v).trim()==='';
}
async function getJson(url,headers={}){
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),20000);
  try{
    const r=await fetch(url,{headers:{accept:'application/json','user-agent':'WorldzLaunchQuality/1.0',...headers},signal:ctl.signal});
    const text=await r.text();
    let body=null; try{ body=JSON.parse(text); }catch{}
    return {ok:r.ok,status:r.status,body,error:r.ok?null:text.slice(0,500)};
  }catch(e){
    return {ok:false,status:null,body:null,error:String(e)};
  }finally{ clearTimeout(timer); }
}

if(!mint){
  report.release.state='PRELAUNCH_NO_MINT';
  report.release.blockers=['CANONICAL_MINT_PENDING','FINAL_METADATA_PENDING'];
  await fs.mkdir('artifacts',{recursive:true});
  await fs.writeFile('artifacts/mrcl-launch-surface-audit.json',JSON.stringify(report,null,2)+'\n');
  console.log('MRCL_LAUNCH_SURFACE=PRELAUNCH_NO_MINT');
  console.log('No provider pass is claimed before canonical mainnet mint exists.');
  process.exit(0);
}

const metadataBlockers=[];
for(const [k,v] of Object.entries(expected)){
  if(placeholder(v)) metadataBlockers.push('FINAL_'+k.toUpperCase()+'_PENDING');
}
if(metadataBlockers.length){
  report.release.blockers=metadataBlockers;
  report.release.state='BLOCKED_CANONICAL_METADATA_INCOMPLETE';
  await fs.mkdir('artifacts',{recursive:true});
  await fs.writeFile('artifacts/mrcl-launch-surface-audit.json',JSON.stringify(report,null,2)+'\n');
  console.error('MRCL_LAUNCH_SURFACE=BLOCKED_CANONICAL_METADATA_INCOMPLETE');
  if(strict) process.exit(1);
  process.exit(0);
}

// Jupiter Tokens V2
const jupHeaders={};
if(process.env.JUPITER_API_KEY) jupHeaders['x-api-key']=process.env.JUPITER_API_KEY;
const jr=await getJson('https://api.jup.ag/tokens/v2/search?query='+encodeURIComponent(mint),jupHeaders);
report.jupiter.httpStatus=jr.status;
if(!jr.ok){
  report.jupiter.state='PENDING_PROVIDER_UNAVAILABLE';
  report.jupiter.error=jr.error;
}else if(!Array.isArray(jr.body)){
  report.jupiter.state='FAIL_INVALID_PROVIDER_PAYLOAD';
}else{
  const hit=jr.body.find(x=>x?.id===mint) ?? null;
  if(!hit){
    report.jupiter.state='PENDING_NOT_INDEXED';
  }else{
    const identity={
      name:hit.name??'',
      symbol:hit.symbol??'',
      icon:hit.icon??null,
      isVerified:hit.isVerified??false,
      organicScore:hit.organicScore??null,
      organicScoreLabel:hit.organicScoreLabel??null,
      liquidity:hit.liquidity??null,
      holderCount:hit.holderCount??null,
      audit:hit.audit??null,
      stats5m:hit.stats5m??null,
      stats1h:hit.stats1h??null,
      stats24h:hit.stats24h??null
    };
    report.jupiter.observed=identity;
    if(identity.name!==expected.name || identity.symbol!==expected.symbol){
      report.jupiter.state='FAIL_WRONG_IDENTITY';
    }else if(!identity.icon){
      report.jupiter.state='PENDING_ICON';
    }else{
      report.jupiter.state='PASS_IDENTITY';
      report.jupiter.imageUrlExactMatch=identity.icon===expected.image;
      if(!report.jupiter.imageUrlExactMatch) report.jupiter.imageReview='REVIEW_PROVIDER_ICON_VISUALLY_OR_BY_SOURCE_METADATA';
    }
    report.jupiter.verificationState=identity.isVerified?'VERIFIED':'PENDING_UNVERIFIED';
    report.jupiter.organicScoreTruth='OBSERVED_ONLY__NOT_MANUFACTURED_OR_GUARANTEED';
  }
}

// DEX Screener
const dr=await getJson('https://api.dexscreener.com/token-pairs/v1/solana/'+encodeURIComponent(mint));
report.dexScreener.httpStatus=dr.status;
if(!dr.ok){
  report.dexScreener.state='PENDING_PROVIDER_UNAVAILABLE';
  report.dexScreener.error=dr.error;
}else{
  const raw=Array.isArray(dr.body)?dr.body:(Array.isArray(dr.body?.pairs)?dr.body.pairs:[]);
  const pairs=raw.filter(p=>p?.baseToken?.address===mint || p?.quoteToken?.address===mint);
  if(!pairs.length){
    report.dexScreener.state='PENDING_NOT_INDEXED';
  }else{
    let wrong=false, identity=false, price=false, liquidity=false, image=false;
    const observations=[];
    for(const p of pairs){
      const side=p?.baseToken?.address===mint?p.baseToken:p.quoteToken;
      const row={
        pairAddress:p?.pairAddress??null,
        dexId:p?.dexId??null,
        name:side?.name??'',
        symbol:side?.symbol??'',
        priceUsd:p?.priceUsd??null,
        liquidityUsd:p?.liquidity?.usd??null,
        imageUrl:p?.info?.imageUrl??null,
        websites:p?.info?.websites??[],
        socials:p?.info?.socials??[]
      };
      observations.push(row);
      if(row.name===expected.name && row.symbol===expected.symbol) identity=true;
      else if(row.name || row.symbol) wrong=true;
      if(row.priceUsd!=null) price=true;
      if(Number(row.liquidityUsd)>0) liquidity=true;
      if(row.imageUrl) image=true;
    }
    report.dexScreener.observed=observations;
    if(wrong) report.dexScreener.state='FAIL_WRONG_IDENTITY';
    else if(!identity) report.dexScreener.state='PENDING_IDENTITY';
    else if(!price) report.dexScreener.state='PENDING_PRICE';
    else if(!liquidity) report.dexScreener.state='PENDING_LIQUIDITY';
    else report.dexScreener.state='PASS_MARKET_IDENTITY';
    report.dexScreener.imageState=image?'OBSERVED_IMAGE_PRESENT':'PENDING_IMAGE_OR_ENHANCED_INFO';
  }
}

const hardFail=[report.jupiter.state,report.dexScreener.state].some(x=>String(x).startsWith('FAIL_'));
const providerIdentityPass=report.jupiter.state==='PASS_IDENTITY' && report.dexScreener.state==='PASS_MARKET_IDENTITY';
if(hardFail){
  report.release.state='FAIL_EXTERNAL_IDENTITY';
}else if(providerIdentityPass){
  report.release.state='EXTERNAL_IDENTITY_VERIFIED';
}else{
  report.release.state='INDEXING_PENDING';
}
report.release.officialLaunchAllowed = report.release.state==='EXTERNAL_IDENTITY_VERIFIED';

await fs.mkdir('artifacts',{recursive:true});
await fs.writeFile('artifacts/mrcl-launch-surface-audit.json',JSON.stringify(report,null,2)+'\n');
console.log('MRCL_LAUNCH_SURFACE='+report.release.state);
console.log('JUPITER='+report.jupiter.state+' DEXSCREENER='+report.dexScreener.state);
console.log('REPORT=artifacts/mrcl-launch-surface-audit.json');
if(strict && !report.release.officialLaunchAllowed) process.exit(1);
