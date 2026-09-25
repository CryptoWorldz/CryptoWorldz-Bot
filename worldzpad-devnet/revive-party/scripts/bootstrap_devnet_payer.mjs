import fs from 'node:fs';
import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';

const file=process.env.DEVNET_PAYER_KEYPAIR_FILE || '/tmp/revive-devnet-payer.json';
const kp=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file,'utf8'))));
const publicRpc=clusterApiUrl('devnet');
const verify=new Connection(publicRpc,'confirmed');
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

async function rpcAirdrop(url,lamports){
  const r=await fetch(url,{
    method:'POST',
    headers:{'content-type':'application/json','user-agent':'Worldz-REVIVE-Devnet-Bootstrap/3.0'},
    body:JSON.stringify({jsonrpc:'2.0',id:1,method:'requestAirdrop',params:[kp.publicKey.toBase58(),lamports,{commitment:'confirmed'}]})
  });
  const x=await r.json().catch(()=>({}));
  if(!r.ok||x.error||!x.result)throw new Error(JSON.stringify(x.error||{status:r.status}));
  return x.result;
}
async function confirm(sig){
  for(let i=0;i<40;i++){
    const s=await verify.getSignatureStatus(sig,{searchTransactionHistory:true}).catch(()=>null);
    if(s?.value?.err)throw new Error('bootstrap transaction failed '+JSON.stringify(s.value.err));
    if(s?.value?.confirmationStatus==='confirmed'||s?.value?.confirmationStatus==='finalized')return;
    await sleep(500);
  }
  throw new Error('bootstrap confirmation timeout');
}
async function balance(){
  return verify.getBalance(kp.publicKey,'confirmed').catch(()=>0);
}

let current=await balance();
if(current>=5_000){
  console.log('REVIVE_POW_BOOTSTRAP=PASS already_funded balance='+current);
  process.exit(0);
}

const sources=[
  // Independent devnet RPCs first: we only need 5,000 lamports to unlock the
  // upstream PoW faucet. These are testnet lamports and have no mainnet value.
  {name:'alchemy_docs_demo',url:'https://solana-devnet.g.alchemy.com/v2/docs-demo',attempts:3},
  {name:'ankr_public',url:'https://rpc.ankr.com/solana_devnet',attempts:3},
  {name:'helius_demo',url:'https://demo.helius.dev/api/rpc?network=devnet',attempts:3},
  {name:'solana_public',url:publicRpc,attempts:6},
];
let failures=[];
for(const source of sources){
  for(let attempt=1;attempt<=source.attempts;attempt++){
    try{
      const sig=await rpcAirdrop(source.url,20_000);
      await confirm(sig);
      current=await balance();
      if(current>=5_000){
        console.log('REVIVE_POW_BOOTSTRAP=PASS source='+source.name+' attempt='+attempt+' balance='+current+' signature='+sig);
        process.exit(0);
      }
      failures.push(source.name+'#'+attempt+':confirmed_but_balance_'+current);
    }catch(e){
      const msg=e?.message||String(e);
      failures.push(source.name+'#'+attempt+':'+msg);
      console.log('REVIVE_POW_BOOTSTRAP_SOURCE_FAILED source='+source.name+' attempt='+attempt+' error='+msg);
      await sleep(Math.min(5000,500*attempt));
    }
  }
}
throw new Error('REVIVE_POW_BOOTSTRAP_FAILED '+failures.slice(-5).join(' | '));
