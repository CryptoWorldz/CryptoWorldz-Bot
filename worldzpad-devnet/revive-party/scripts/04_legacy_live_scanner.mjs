import fs from 'node:fs';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

const RPC=process.env.LEGACY_READ_RPC_URL||clusterApiUrl('mainnet-beta');
const connection=new Connection(RPC,'confirmed');

export async function snapshotMint({mint,minimumRaw,excludedWallets=[]}){
  const mintKey=new PublicKey(mint);
  const mintInfo=await connection.getParsedAccountInfo(mintKey,'confirmed');
  const program=mintInfo?.value?.owner;
  if(!program)throw new Error('mint program unavailable '+mint);
  const rows=await connection.getParsedProgramAccounts(program,{
    commitment:'confirmed',
    filters:[{memcmp:{offset:0,bytes:mint}}]
  });
  const excluded=new Set(excludedWallets);
  const owners=new Map();
  for(const row of rows){
    const info=row.account?.data?.parsed?.info;
    const owner=String(info?.owner||'');
    const raw=BigInt(String(info?.tokenAmount?.amount||'0'));
    if(!owner||raw<=0n||excluded.has(owner))continue;
    owners.set(owner,(owners.get(owner)||0n)+raw);
  }
  const balances=Object.fromEntries([...owners.entries()].map(([wallet,raw])=>[wallet,raw.toString()]));
  return {mint,minimumRaw:String(minimumRaw),wallets:Object.keys(balances).length,balances};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const config=JSON.parse(fs.readFileSync('../../worldzpad-mainnet/legacy-flywheel/worldz-legacy-flywheel.v1.json','utf8'));
  const out=[];
  for(const asset of config.assets){
    out.push(await snapshotMint({
      mint:asset.mint,
      minimumRaw:asset.minimumRaw,
      excludedWallets:[]
    }));
  }
  fs.mkdirSync('artifacts',{recursive:true});
  fs.writeFileSync('artifacts/legacy-live-boundary-snapshot.json',JSON.stringify({
    proof:'LEGACY_READ_ONLY_BOUNDARY_SNAPSHOT',
    capturedAt:new Date().toISOString(),
    rpcPublished:false,
    assets:out,
    tokenMovement:false
  },null,2)+'\n');
  console.log('LEGACY_LIVE_BOUNDARY=PASS assets='+out.length+' wallets='+out.reduce((s,x)=>s+x.wallets,0)+' movement=OFF');
}
