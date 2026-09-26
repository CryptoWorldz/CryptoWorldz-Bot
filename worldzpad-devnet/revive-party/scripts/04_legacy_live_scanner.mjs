import fs from 'node:fs';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

const RPC=process.env.LEGACY_READ_RPC_URL||clusterApiUrl('mainnet-beta');
if(!/^https?:/i.test(RPC))throw new Error('LEGACY_READ_RPC_URL must be http(s)');
const connection=new Connection(RPC,'confirmed');

function projectExclusions(policy,distribution){
  const addresses=new Set();
  const add=(value)=>{
    const address=String(value||'').trim();
    if(address && !address.startsWith('PENDING_')) addresses.add(address);
  };
  add(distribution.sourceVault);
  for(const row of distribution.verifiedLegacyDevWallets||[])add(row.address);
  for(const row of distribution.watchOnlyDistributionWallets||[])add(row.address);
  for(const row of distribution.programPools||[])add(row.address);
  for(const row of policy.historicalDistributionWallets?.wallets||[])add(row.address);
  for(const asset of policy.assets||[])add(asset.rewardVault?.address);
  return [...addresses].sort();
}

export async function snapshotMint({mint,minimumRaw,excludedWallets=[]}){
  const mintKey=new PublicKey(mint);
  const mintInfo=await connection.getParsedAccountInfo(mintKey,'confirmed');
  const program=mintInfo?.value?.owner;
  if(!program)throw new Error('mint program unavailable '+mint);
  if(!program.equals(TOKEN_PROGRAM_ID)&&!program.equals(TOKEN_2022_PROGRAM_ID)){
    throw new Error('unsupported token program for legacy mint '+mint+' owner='+program.toBase58());
  }

  const rows=await connection.getParsedProgramAccounts(program,{
    commitment:'confirmed',
    filters:[{memcmp:{offset:0,bytes:mint}}],
  });
  const excluded=new Set(excludedWallets);
  const owners=new Map();
  const excludedMatches=new Map();

  for(const row of rows){
    const info=row.account?.data?.parsed?.info;
    const owner=String(info?.owner||'');
    const raw=BigInt(String(info?.tokenAmount?.amount||'0'));
    if(!owner||raw<=0n)continue;
    if(excluded.has(owner)){
      excludedMatches.set(owner,(excludedMatches.get(owner)||0n)+raw);
      continue;
    }
    owners.set(owner,(owners.get(owner)||0n)+raw);
  }

  const minimum=BigInt(minimumRaw);
  const balances=Object.fromEntries(
    [...owners.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([wallet,raw])=>[wallet,raw.toString()])
  );
  const eligibleBalances=Object.fromEntries(
    [...owners.entries()].filter(([,raw])=>raw>=minimum)
      .sort(([a],[b])=>a.localeCompare(b)).map(([wallet,raw])=>[wallet,raw.toString()])
  );
  return {
    mint,
    tokenProgram:program.toBase58(),
    minimumRaw:String(minimumRaw),
    positiveExternalWallets:Object.keys(balances).length,
    eligibleExternalWallets:Object.keys(eligibleBalances).length,
    excludedProjectWalletMatches:excludedMatches.size,
    balances,
    eligibleBalances,
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const policy=JSON.parse(fs.readFileSync('../../worldzpad-mainnet/legacy-flywheel/worldz-legacy-flywheel.v1.json','utf8'));
  const distribution=JSON.parse(fs.readFileSync('../../worldzpad-mainnet/revive/revive-distribution-wallets.v1.json','utf8'));
  const excludedWallets=projectExclusions(policy,distribution);
  if(excludedWallets.length<10)throw new Error('project exclusion registry unexpectedly small');

  const out=[];
  for(const asset of policy.assets){
    const snapshot=await snapshotMint({
      mint:asset.mint,
      minimumRaw:asset.minimumRaw,
      excludedWallets,
    });
    out.push({
      order:asset.order,
      symbol:asset.symbol,
      ...snapshot,
    });
  }

  if(out.length!==10)throw new Error('expected exactly 10 legacy mint snapshots');
  fs.mkdirSync('artifacts',{recursive:true});
  fs.writeFileSync('artifacts/legacy-live-boundary-snapshot.json',JSON.stringify({
    proof:'LEGACY_READ_ONLY_BOUNDARY_SNAPSHOT',
    capturedAt:new Date().toISOString(),
    boundary:'SINGLE_BOUNDARY_ONLY',
    requiredEpochSeconds:21600,
    exclusionRegistryCount:excludedWallets.length,
    exclusionRegistry:excludedWallets,
    assets:out,
    tokenMovement:false,
    limitation:'A qualifying 6-hour epoch requires a second independently captured boundary at least 21,600 seconds later. This file alone is not a completed reward epoch.',
  },null,2)+'\n');
  console.log(
    'LEGACY_LIVE_BOUNDARY=PASS assets='+out.length+
    ' eligible='+out.reduce((s,x)=>s+x.eligibleExternalWallets,0)+
    ' exclusions='+excludedWallets.length+
    ' movement=OFF epoch_complete=NO'
  );
}
