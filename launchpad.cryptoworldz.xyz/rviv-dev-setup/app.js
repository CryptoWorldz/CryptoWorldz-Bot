const RPC='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const OWNER='Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u';
const MINT='DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R';
const RENT_CEILING=4465320;
const DESTINATIONS=[
 {label:'Purple PDC',wallet:'G35RixuDLj8NQJ7c8wnKF4Hc518nbYxp1cZwGL5wJTG3',ata:'5Wx2mzUSNpq91YShmgdkYwfZ9yZevy98b6qtm4WV48Qe'},
 {label:'SolSavewXRP',wallet:'5BbgurmtXVr1tohm6NTYU8pmM4n7xQVqp9DTKePN1UW9',ata:'C7cn56bNANZ3a9MK4zidX2gRT9aUiqGmwZrxgRLtyg4T'},
 {label:'JayJayTeamDev',wallet:OWNER,ata:'8yutMVrk3BmSJBxrN77iRmwKRpADNqFpykVFKM4wmzSx'}
];
const $=s=>document.querySelector(s);
let depsCache,active,plan;
const stop=s=>{throw Error(s)};
const status=s=>{$('#status').textContent=s};
async function deps(){
 if(depsCache)return depsCache;
 const b=await import('https://esm.sh/buffer@6.0.3?bundle');
 globalThis.Buffer??=b.Buffer;
 const [web3,spl,wallets]=await Promise.all([
  import('https://esm.sh/@solana/web3.js@1.98.4?bundle'),
  import('https://esm.sh/@solana/spl-token@0.4.15?bundle&deps=@solana/web3.js@1.98.4'),
  import('https://esm.sh/@wallet-standard/app@1.1.0?bundle')
 ]);
 return depsCache={web3,spl,wallets};
}
async function connect(){
 const d=await deps();
 const candidates=d.wallets.getWallets().get().filter(w=>w.chains?.includes('solana:mainnet')&&w.features?.['standard:connect']&&w.features?.['solana:signTransaction']);
 let next;
 if(candidates.length){
  const wallet=candidates.find(w=>/jupiter/i.test(w.name))||candidates[0];
  const result=await wallet.features['standard:connect'].connect();
  const account=(result?.accounts||wallet.accounts||[]).find(a=>a.address===OWNER&&a.chains?.includes('solana:mainnet'));
  if(!account)stop('Connect the JayJayTeamDev mainnet wallet.');
  next={kind:'standard',wallet,account,address:account.address};
 }else{
  const provider=[window.jupiter?.solana,window.phantom?.solana,window.solflare,window.solana].find(p=>p?.connect&&p?.signTransaction);
  if(provider){
   const result=await provider.connect();
   const address=String(result?.publicKey||provider.publicKey||'');
   if(address!==OWNER)stop('Connect the JayJayTeamDev wallet.');
   next={kind:'injected',provider,address};
  }else{
   status('Opening Jupiter Mobile connection. Approve the connection in your wallet, then return here. No transaction is being signed.');
   const bridge=await import('/mint/jupiter-mobile.js?v=20260926-reown-react19-v4');
   bridge.resetJupiterMobileConnectionState?.();
   const adapter=await bridge.getJupiterMobileAdapter();
   await Promise.race([adapter.connect(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Jupiter connection timed out. Tap Connect to try again.')),25000))]);
   const address=String(adapter.publicKey||'');
   if(address!==OWNER)stop('Wrong wallet connected. Select JayJayTeamDev in Jupiter and reconnect.');
   next={kind:'adapter',provider:adapter,address};
  }
 }
 active=next;plan=null;$('#sign').disabled=true;status('JayJayTeamDev connected. Recheck mainnet before signing.');
}
async function rpc(method,params){
 const response=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
 const body=await response.json();
 if(!response.ok||body.error)stop('Live RPC check failed: '+JSON.stringify(body.error||response.status));
 return body.result;
}
async function prepare(){
 if(!active)stop('Connect JayJayTeamDev first.');
 plan=null;$('#sign').disabled=true;
 const d=await deps();
 const conn=new d.web3.Connection(RPC,'confirmed');
 if(await conn.getGenesisHash()!=='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d')stop('Wrong Solana network.');
 const mint=new d.web3.PublicKey(MINT),payer=new d.web3.PublicKey(OWNER);
 const mintAccount=await conn.getAccountInfo(mint,'confirmed');
 if(!mintAccount?.owner.equals(d.spl.TOKEN_PROGRAM_ID))stop('Canonical mint program mismatch.');
 const rows=DESTINATIONS.map(x=>({...x,derived:d.spl.getAssociatedTokenAddressSync(mint,new d.web3.PublicKey(x.wallet),true,d.spl.TOKEN_PROGRAM_ID).toBase58()}));
 if(rows.some(x=>x.ata!==x.derived))stop('Destination ATA derivation mismatch.');
 const info=await conn.getMultipleAccountsInfo(rows.map(x=>new d.web3.PublicKey(x.ata)),'confirmed');
 if(info.some(Boolean))stop('One or more token accounts now exist. Rebuild for the new state; do not sign the old transaction.');
 const [rent,balance,block]=await Promise.all([conn.getMinimumBalanceForRentExemption(165,'confirmed'),conn.getBalance(payer,'confirmed'),conn.getLatestBlockhash('confirmed')]);
 if(rent*3>RENT_CEILING)stop('Rent exceeds approved ceiling.');
 const tx=new d.web3.Transaction({feePayer:payer,recentBlockhash:block.blockhash});
 for(const x of rows)tx.add(d.spl.createAssociatedTokenAccountIdempotentInstruction(payer,new d.web3.PublicKey(x.ata),new d.web3.PublicKey(x.wallet),mint,d.spl.TOKEN_PROGRAM_ID,d.spl.ASSOCIATED_TOKEN_PROGRAM_ID));
 const raw=tx.serialize({requireAllSignatures:false,verifySignatures:false});
 if(raw.length>1232||tx.instructions.length!==3)stop('Unexpected transaction size or instruction count.');
 const feeResult=await conn.getFeeForMessage(tx.compileMessage(),'confirmed');
 if(feeResult.value==null)stop('Network fee unavailable.');
 const total=rent*3+feeResult.value;
 if(balance<total)stop('JayJayTeamDev lacks the quoted SOL cost.');
 const simulation=await rpc('simulateTransaction',[Buffer.from(raw).toString('base64'),{encoding:'base64',sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed'}]);
 if(simulation?.value?.err)stop('Simulation failed: '+JSON.stringify(simulation.value.err));
 const message=tx.compileMessage().serialize().toString('hex');
 $('#review').textContent=`Mainnet • Exactly three token account creations\n\n${rows.map(x=>x.label+': '+x.wallet+' → '+x.ata).join('\n')}\n\nRent: ${rent*3} lamports (${rent*3/1e9} SOL)\nNetwork fee: ${feeResult.value} lamports (${feeResult.value/1e9} SOL)\nTotal: ${total} lamports (${total/1e9} SOL)\nFee payer: ${OWNER}\nRVIV transferred: 0\nTransaction bytes: ${raw.length}\nSimulation: passed`;
 plan={tx,conn,block,message,total};$('#sign').disabled=false;status('Simulation passed. Read all destinations and costs above, then review in your wallet.');
}
async function signAndSubmit(){
 const p=plan;if(!p||!active)stop('Run the live check first.');
 $('#sign').disabled=true;plan=null;
 if(await p.conn.getBlockHeight('confirmed')>p.block.lastValidBlockHeight)stop('Blockhash expired. Recheck before signing.');
 let signed;
 const d=await deps();
 if(active.kind==='standard'){
  const output=await active.wallet.features['solana:signTransaction'].signTransaction({account:active.account,transaction:new Uint8Array(p.tx.serialize({requireAllSignatures:false,verifySignatures:false}))});
  if(!output?.[0]?.signedTransaction)stop('Wallet did not sign.');
  signed=d.web3.Transaction.from(new Uint8Array(output[0].signedTransaction));
 }else signed=await active.provider.signTransaction(p.tx);
 if(!signed||signed.compileMessage().serialize().toString('hex')!==p.message)stop('Wallet changed the reviewed transaction; nothing submitted.');
 if(!signed.signatures?.[0]?.signature)stop('Missing owner signature; nothing submitted.');
 if(!signed.verifySignatures())stop('Owner signature did not verify; nothing submitted.');
 const signature=await p.conn.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:3});
 const confirmed=await p.conn.confirmTransaction({signature,blockhash:p.block.blockhash,lastValidBlockHeight:p.block.lastValidBlockHeight},'confirmed');
 if(confirmed.value.err)stop('Chain returned a failure: '+JSON.stringify(confirmed.value.err));
 status('Three RVIV token accounts created. Signature: '+signature+' • Now prepare the seven Dev transfers separately.');
 $('#review').textContent+='\n\nConfirmed transaction: '+signature;
}
for(const [selector,fn] of [['#connect',connect],['#check',prepare],['#sign',signAndSubmit]]){
 $(selector).addEventListener('click',async()=>{
  const button=$(selector);button.disabled=true;
  try{await fn()}catch(error){status('STOP: '+(error?.message||error));$('#sign').disabled=true;plan=null}
  finally{if(selector!=='#sign')button.disabled=false}
 });
}
