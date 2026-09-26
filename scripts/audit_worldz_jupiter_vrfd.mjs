import fs from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';

const canonicalPath='worldzpad-mainnet/worlddexpush/jupiter-vrfd-worldz.v1.json';
const publicPath='launchpad.cryptoworldz.xyz/worlddexpush/jupiter/package.json';
const registryPath='worldzpad-mainnet/token-identity/worldz-token-registry.v1.json';

const pack=JSON.parse(await fs.readFile(canonicalPath,'utf8'));
const publicPack=JSON.parse(await fs.readFile(publicPath,'utf8'));
const registry=JSON.parse(await fs.readFile(registryPath,'utf8'));
const report={
  schema:'WORLDZ-JUPITER-VRFD-AUDIT-V1',
  generatedAt:new Date().toISOString(),
  packageVersion:pack.version,
  provider:pack.provider?.name??null,
  tokens:[]
};

async function getJson(url,timeoutMs=20000){
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),timeoutMs);
  try{
    const r=await fetch(url,{
      headers:{accept:'application/json','user-agent':'Worldz-Jupiter-VRFD-Audit/2.0'},
      signal:ctl.signal
    });
    const text=await r.text();
    let body=null;
    try{body=JSON.parse(text)}catch{}
    return {ok:r.ok,status:r.status,body,error:r.ok?null:text.slice(0,500)};
  }catch(e){
    return {ok:false,status:null,body:null,error:String(e)};
  }finally{
    clearTimeout(timer);
  }
}

function fail(message){
  throw new Error(message);
}

function sorted(values){
  return [...values].sort();
}

// Public package is allowed one public-only provenance field and nothing else.
// Provider URLs, release/payment/signing rules, version/status and token payload
// must remain byte-semantically equivalent to the canonical package.
const publicComparable=structuredClone(publicPack);
delete publicComparable.source;
if(!isDeepStrictEqual(publicComparable,pack)){
  fail('Public Jupiter VRFD package drifted from canonical package');
}

const liveRegistry=registry.tokens.filter(t=>t.lifecycle==='LIVE');
const registryByMint=new Map(liveRegistry.map(t=>[t.canonicalMint,t]));
const packageByMint=new Map(pack.tokens.map(t=>[t.mint,t]));

if(packageByMint.size!==pack.tokens.length){
  fail('Jupiter VRFD package contains duplicate mint entries');
}
if(registryByMint.size!==liveRegistry.length){
  fail('Canonical LIVE registry contains duplicate or missing mint entries');
}

const liveMints=sorted(registryByMint.keys());
const packagedMints=sorted(packageByMint.keys());
if(!isDeepStrictEqual(packagedMints,liveMints)){
  const missing=liveMints.filter(m=>!packageByMint.has(m));
  const extra=packagedMints.filter(m=>!registryByMint.has(m));
  fail('Jupiter VRFD LIVE coverage mismatch missing='+missing.join(',')+' extra='+extra.join(','));
}

let hardFail=false;

for(const token of pack.tokens){
  const canonical=registryByMint.get(token.mint);
  if(!canonical) fail('Jupiter package contains non-LIVE or unknown mint '+token.mint);

  const expectedCanonical={
    launchOrder:canonical.launchOrder,
    slug:canonical.slug,
    name:canonical.name,
    symbol:canonical.symbol,
    mint:canonical.canonicalMint,
    decimals:canonical.decimals,
    image:canonical.image,
    website:canonical.website,
    x:canonical.x,
    telegram:canonical.telegram,
    metaplexMetadataPda:canonical.metaplexMetadataPda,
    metadataUri:canonical.metadataUri,
    publicMetadata:canonical.publicMetadata
  };
  for(const [key,expected] of Object.entries(expectedCanonical)){
    if(token[key]!==expected){
      fail(`Jupiter package ${token.symbol||token.mint} canonical field drift: ${key}`);
    }
  }

  const expectedDashboard='https://verified.jup.ag/dashboard/'+token.mint+'?action=update-metadata';
  if(token.vrfdDashboard!==expectedDashboard){
    fail('Jupiter package '+token.symbol+' VRFD dashboard drift');
  }

  // Cross-check fields that live in the public token metadata rather than the
  // identity registry (description + canonical image aliases).
  const metadataFile='launchpad.cryptoworldz.xyz/'+token.slug+'/token-metadata.json';
  const metadata=JSON.parse(await fs.readFile(metadataFile,'utf8'));
  const metadataExpected={
    name:metadata.name,
    symbol:metadata.symbol,
    address:metadata.address,
    decimals:metadata.decimals,
    image:metadata.image,
    website:metadata.website,
    x:metadata.x,
    telegram:metadata.telegram,
    description:metadata.description
  };
  const packageExpected={
    name:token.name,
    symbol:token.symbol,
    address:token.mint,
    decimals:token.decimals,
    image:token.image,
    website:token.website,
    x:token.x,
    telegram:token.telegram,
    description:token.description
  };
  if(!isDeepStrictEqual(packageExpected,metadataExpected)){
    fail('Jupiter package '+token.symbol+' drifted from public token metadata');
  }

  const url=pack.provider.tokensApi.replace('{MINT}',encodeURIComponent(token.mint));
  const response=await getJson(url);
  const rows=Array.isArray(response.body)?response.body:[];
  const hit=rows.find(x=>x.id===token.mint||x.address===token.mint)||null;
  const observed=hit?{
    name:hit.name??null,
    symbol:hit.symbol??null,
    icon:hit.icon??hit.logoURI??null,
    isVerified:hit.isVerified??null,
    usdPrice:hit.usdPrice??null,
    liquidity:hit.liquidity??null,
    organicScore:hit.organicScore??null,
    organicScoreLabel:hit.organicScoreLabel??null
  }:null;

  let state;
  if(!response.ok){
    state='FAIL_PROVIDER_UNAVAILABLE';
    hardFail=true;
  }else if(!Array.isArray(response.body)){
    state='FAIL_PROVIDER_PAYLOAD_INVALID';
    hardFail=true;
  }else if(!hit){
    state='PENDING_NOT_RETURNED';
  }else{
    const name=String(hit.name??'');
    const symbol=String(hit.symbol??'');
    if(name===token.name&&symbol===token.symbol){
      state='PASS';
    }else if(!name&&!symbol){
      state='PENDING_JUPITER_METADATA';
    }else{
      state='FAIL_WRONG_NONBLANK_IDENTITY';
      hardFail=true;
    }
  }

  report.tokens.push({
    mint:token.mint,
    expected:{
      name:token.name,
      symbol:token.symbol,
      image:token.image,
      website:token.website
    },
    httpStatus:response.status,
    state,
    observed,
    error:response.error??null,
    vrfdDashboard:token.vrfdDashboard
  });
  console.log('JUPITER_VRFD',token.symbol,state,JSON.stringify(observed));
}

report.summary={
  liveRegistryTokens:liveRegistry.length,
  packagedTokens:pack.tokens.length,
  providerQueries:report.tokens.length,
  pass:report.tokens.filter(t=>t.state==='PASS').length,
  pending:report.tokens.filter(t=>t.state.startsWith('PENDING_')).length,
  failed:report.tokens.filter(t=>t.state.startsWith('FAIL_')).length
};

await fs.mkdir('artifacts',{recursive:true});
await fs.writeFile('artifacts/worldz-jupiter-vrfd-status.json',JSON.stringify(report,null,2)+'\n');
console.log('WORLDZ_JUPITER_VRFD_REPORT=artifacts/worldz-jupiter-vrfd-status.json');
console.log('WORLDZ_JUPITER_VRFD_SUMMARY='+JSON.stringify(report.summary));
if(hardFail) process.exitCode=1;
