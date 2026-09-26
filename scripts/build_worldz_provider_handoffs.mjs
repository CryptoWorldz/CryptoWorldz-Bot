#!/usr/bin/env node
import fs from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';

const ROOT=new URL('../',import.meta.url);
const read=async path=>JSON.parse(await fs.readFile(new URL(path,ROOT),'utf8'));
const write=async (path,value)=>fs.writeFile(new URL(path,ROOT),JSON.stringify(value,null,2)+'\n');
const mode=process.argv.includes('--write')?'write':'check';

const registryPath='worldzpad-mainnet/token-identity/worldz-token-registry.v1.json';
const jupiterPath='worldzpad-mainnet/worlddexpush/jupiter-vrfd-worldz.v1.json';
const jupiterPublicPath='launchpad.cryptoworldz.xyz/worlddexpush/jupiter/package.json';
const dexPath='worldzpad-mainnet/worlddexpush/dexscreener-worldz.v1.json';
const dexPublicPath='launchpad.cryptoworldz.xyz/worlddexpush/dexscreener/package.json';
const masterPath='worldzpad-mainnet/worlddexpush/worlddexpush.v1.json';

const registry=await read(registryPath);
const jupiter=await read(jupiterPath);
const dex=await read(dexPath);
const master=await read(masterPath);

const live=registry.tokens
  .filter(t=>t.lifecycle==='LIVE'&&t.chain==='Solana')
  .sort((a,b)=>a.launchOrder-b.launchOrder);

if(!live.length) throw new Error('No LIVE Solana Worldz tokens found');
const liveMints=new Set(live.map(t=>t.canonicalMint));
if(liveMints.size!==live.length) throw new Error('LIVE Solana registry contains duplicate/missing mints');

const oldJupiterByMint=new Map(jupiter.tokens.map(t=>[t.mint,t]));
const metadataBySlug=new Map();
for(const token of live){
  const path='launchpad.cryptoworldz.xyz/'+token.slug+'/token-metadata.json';
  const metadata=await read(path);
  if(metadata.address!==token.canonicalMint||metadata.name!==token.name||metadata.symbol!==token.symbol||metadata.decimals!==token.decimals){
    throw new Error(token.symbol+': public metadata identity drift');
  }
  if(metadata.image!==token.image||metadata.website!==token.website||metadata.x!==token.x||metadata.telegram!==token.telegram){
    throw new Error(token.symbol+': public metadata presentation drift');
  }
  metadataBySlug.set(token.slug,metadata);
}

const expectedJupiterTokens=live.map(token=>{
  const metadata=metadataBySlug.get(token.slug);
  const previous=oldJupiterByMint.get(token.canonicalMint);
  return {
    launchOrder:token.launchOrder,
    slug:token.slug,
    name:token.name,
    symbol:token.symbol,
    mint:token.canonicalMint,
    decimals:token.decimals,
    image:token.image,
    website:token.website,
    x:token.x,
    telegram:token.telegram,
    description:metadata.description,
    metaplexMetadataPda:token.metaplexMetadataPda,
    metadataUri:token.metadataUri,
    publicMetadata:token.publicMetadata,
    platformSubmissionPack:metadata.resources?.platformPack??null,
    circulatingSupply:metadata.resources?.liveSupply??null,
    vrfdDashboard:'https://verified.jup.ag/dashboard/'+token.canonicalMint+'?action=update-metadata',
    lastObservedJupiter:previous?.lastObservedJupiter??{
      name:null,symbol:null,icon:null,state:'NOT_AUDITED',observedAt:null
    }
  };
});

const expectedDexTokens=live.map(token=>({
  launchOrder:token.launchOrder,
  slug:token.slug,
  name:token.name,
  symbol:token.symbol,
  chain:'solana',
  mint:token.canonicalMint,
  decimals:token.decimals,
  image:token.image,
  website:token.website,
  x:token.x,
  telegram:token.telegram,
  publicMetadata:token.publicMetadata,
  expectedMarket:{
    venue:token.market?.venue??null,
    pair:token.market?.pair??null,
    pairAddress:token.market?.pool??null,
    status:token.market?.status??null
  },
  tokenPage:'https://dexscreener.com/solana/'+token.canonicalMint,
  pairPage:token.market?.pool?'https://dexscreener.com/solana/'+token.market.pool:null
}));

const expectedMasterTokens=live.map(token=>({
  name:token.name,
  symbol:token.symbol,
  chain:'solana',
  mint:token.canonicalMint,
  identity:token.publicMetadata
}));

const expectedJupiter={...jupiter,tokens:expectedJupiterTokens};
const expectedDex={...dex,tokens:expectedDexTokens};
const expectedMaster={...master,tokens:expectedMasterTokens};
const expectedJupiterPublic={...expectedJupiter,source:'https://launchpad.cryptoworldz.xyz/worlddexpush/jupiter/package.json'};
const expectedDexPublic={...expectedDex,source:'https://launchpad.cryptoworldz.xyz/worlddexpush/dexscreener/package.json'};

const checks=[
  [jupiterPath,jupiter,expectedJupiter],
  [dexPath,dex,expectedDex],
  [masterPath,master,expectedMaster],
  [jupiterPublicPath,await read(jupiterPublicPath),expectedJupiterPublic],
  [dexPublicPath,await read(dexPublicPath),expectedDexPublic]
];

if(mode==='write'){
  for(const [path,,expected] of checks) await write(path,expected);
  console.log('WORLDZ_PROVIDER_HANDOFF_COMPILER=WRITE tokens='+live.length);
}else{
  const drift=checks.filter(([,actual,expected])=>!isDeepStrictEqual(actual,expected)).map(([path])=>path);
  if(drift.length){
    console.error('WORLDZ_PROVIDER_HANDOFF_COMPILER=DRIFT');
    for(const path of drift) console.error('DRIFT '+path);
    console.error('Run: node scripts/build_worldz_provider_handoffs.mjs --write');
    process.exit(1);
  }
  console.log('WORLDZ_PROVIDER_HANDOFF_COMPILER=PASS tokens='+live.length+' providers=JUPITER,DEXSCREENER');
}
