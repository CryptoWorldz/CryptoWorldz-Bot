import fs from 'node:fs';
import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';

const file=process.env.DEVNET_PAYER_KEYPAIR_FILE || '/tmp/revive-devnet-payer.json';
const kp=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file,'utf8'))));
const verify=new Connection(clusterApiUrl('devnet'),'confirmed');

async function rpcAirdrop(url,lamports){
  const r=await fetch(url,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id:1,method:'requestAirdrop',params:[kp.publicKey.toBase58(),lamports,{commitment:'confirmed'}]})
  });
  const x=await r.json().catch(()=>({}));
  if(!r.ok||x.error||!x.result)throw new Error(JSON.stringify(x.error||{status:r.status}));
  return x.result;
}
async function confirm(sig){
  for(let i=0;i<30;i++){
    const s=await verify.getSignatureStatus(sig,{searchTransactionHistory:true});
    if(s?.value?.err)throw new Error('bootstrap transaction failed '+JSON.stringify(s.value.err));
    if(s?.value?.confirmationStatus==='confirmed'||s?.value?.confirmationStatus==='finalized')return;
    await new Promise(r=>setTimeout(r,500));
  }
  throw new Error('bootstrap confirmation timeout');
}
let balance=await verify.getBalance(kp.publicKey,'confirmed');
if(balance>=10_000){
  console.log('REVIVE_POW_BOOTSTRAP=PASS already_funded balance='+balance);
  process.exit(0);
}

const attempts=[
  ['helius_demo','https://demo.helius.dev/api/rpc?network=devnet',20_000],
  ['solana_public',clusterApiUrl('devnet'),20_000],
];
let last='';
for(const [name,url,lamports] of attempts){
  try{
    const sig=await rpcAirdrop(url,lamports);
    await confirm(sig);
    balance=await verify.getBalance(kp.publicKey,'confirmed');
    if(balance>=5_000){
      console.log('REVIVE_POW_BOOTSTRAP=PASS source='+name+' balance='+balance+' signature='+sig);
      process.exit(0);
    }
  }catch(e){
    last=name+':'+(e?.message||e);
    console.log('REVIVE_POW_BOOTSTRAP_SOURCE_FAILED '+last);
  }
}
throw new Error('REVIVE_POW_BOOTSTRAP_FAILED '+last);
