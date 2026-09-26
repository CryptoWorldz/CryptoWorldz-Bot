import fs from 'node:fs';
import { Connection, Keypair, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';

export const MAGIC_FEE_BPS=75n;
export const PARTNER_DENOMINATOR=490n;
export const PARTNER_WEIGHTS=Object.freeze({
  referrer:170n,
  legacyFlywheel:150n,
  worldzLaunchPad:85n,
  oneWorldzImpact:85n,
});
export const WBTC_SOLANA_MAINNET=Object.freeze({
  symbol:'WBTC',
  mint:'3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
  assetClass:'WRAPPED_BTC',
  listingReference:'Pump supported-pair list / Wormhole Portal'
});

export function routePartnerQuoteAtomic(totalAtomic){
  const total=BigInt(totalAtomic);
  if(total<0n) throw new Error('partner quote fee cannot be negative');
  const routed={};
  let sum=0n;
  for(const [name,weight] of Object.entries(PARTNER_WEIGHTS)){
    const value=total*weight/PARTNER_DENOMINATOR;
    routed[name]=value.toString();
    sum+=value;
  }
  return Object.freeze({
    inputPartnerQuoteAtomic:total.toString(),
    ...routed,
    roundingCarryAtomic:(total-sum).toString(),
  });
}

export async function devnetConnection(){
  const rpc=process.env.SOLANA_RPC_URL?.trim()||clusterApiUrl('devnet');
  const connection=new Connection(rpc,'confirmed');
  const genesisHash=await connection.getGenesisHash();
  const SOLANA_DEVNET_GENESIS='EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
  if(genesisHash!==SOLANA_DEVNET_GENESIS){
    throw new Error('BITWORLDZ DEVNET HARNESS REFUSED NON-DEVNET CLUSTER genesis='+genesisHash);
  }
  return {rpc,connection,genesisHash};
}

export function payerFromEnvironment(){
  const raw=process.env.DEVNET_PAYER_SECRET_JSON?.trim();
  if(raw){
    const parsed=JSON.parse(raw);
    if(!Array.isArray(parsed)||parsed.length!==64) throw new Error('DEVNET_PAYER_SECRET_JSON must be a 64-byte JSON array');
    return {keypair:Keypair.fromSecretKey(Uint8Array.from(parsed)),source:'secret'};
  }
  const file=process.env.DEVNET_PAYER_KEYPAIR_FILE?.trim();
  if(file && fs.existsSync(file)){
    const parsed=JSON.parse(fs.readFileSync(file,'utf8'));
    if(!Array.isArray(parsed)||parsed.length!==64) throw new Error('DEVNET_PAYER_KEYPAIR_FILE must contain 64 secret-key bytes');
    return {keypair:Keypair.fromSecretKey(Uint8Array.from(parsed)),source:'file'};
  }
  return {keypair:Keypair.generate(),source:'ephemeral'};
}

export async function ensureDevnetSol(connection,payer,minLamports=80_000_000){
  let balance=await connection.getBalance(payer.publicKey,'confirmed');
  if(balance>=minLamports) return {source:'existing',balance,airdropSignature:null};
  let lastError=null;
  for(const amount of [0.25,0.15,0.1]){
    try{
      const sig=await connection.requestAirdrop(payer.publicKey,Math.floor(amount*LAMPORTS_PER_SOL));
      const bh=await connection.getLatestBlockhash('confirmed');
      await connection.confirmTransaction({signature:sig,...bh},'confirmed');
      balance=await connection.getBalance(payer.publicKey,'confirmed');
      if(balance>=minLamports) return {source:'airdrop',balance,airdropSignature:sig};
    }catch(e){
      lastError=e;
      await new Promise(r=>setTimeout(r,1800));
    }
  }
  throw new Error('devnet SOL funding unavailable balance='+balance+' error='+(lastError?.message||lastError));
}

export function jsonSafe(value){
  if(typeof value==='bigint') return value.toString();
  if(value && typeof value.toString==='function' && value.constructor?.name==='BN') return value.toString();
  if(Array.isArray(value)) return value.map(jsonSafe);
  if(value && typeof value==='object'){
    const out={};
    for(const [k,v] of Object.entries(value)) out[k]=jsonSafe(v);
    return out;
  }
  return value;
}
