const PREP_RPC='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const prepStatus=(m,c='warn')=>{const e=document.querySelector('#prepare-status');if(e){e.textContent=m;e.className='status '+c}};
let prepCfg=null,prepDeps=null,prepCtx=null;

async function getPrepDeps(){
 if(prepDeps)return prepDeps;
 const buffer=await import('https://esm.sh/buffer@6.0.3?bundle');
 if(!globalThis.Buffer)globalThis.Buffer=buffer.Buffer;
 const [web3,spl,walletApp]=await Promise.all([
  import('https://esm.sh/@solana/web3.js@1.98.4?bundle'),
  import('https://esm.sh/@solana/spl-token@0.4.15?bundle&deps=@solana/web3.js@1.98.4'),
  import('https://esm.sh/@wallet-standard/app@1.1.0?bundle')
 ]);
 prepDeps={web3,spl,walletApp};return prepDeps;
}
async function getPrepCfg(){
 if(prepCfg)return prepCfg;
 const r=await fetch('/wldz/distribute/config.json?d=20260923-d',{cache:'no-store'});
 if(!r.ok)throw new Error('Distribution configuration unavailable.');
 prepCfg=await r.json();return prepCfg;
}
function prepInjected(){
 return [window?.jupiter?.solana,window?.jupiter,window?.phantom?.solana,window?.solflare,window?.solana]
  .find(p=>p&&typeof p.connect==='function'&&typeof p.signTransaction==='function')||null;
}
async function prepConnect(){
 if(prepCtx)return prepCtx;
 const [d,cfg]=await Promise.all([getPrepDeps(),getPrepCfg()]);
 const wallets=d.walletApp.getWallets().get().filter(w=>w?.features?.['standard:connect']&&w?.features?.['solana:signTransaction']);
 const wallet=wallets.find(w=>/jupiter/i.test(String(w.name||'')))||wallets[0];
 if(wallet){
  const out=await wallet.features['standard:connect'].connect();
  const account=(out?.accounts||wallet.accounts||[])[0];
  if(!account)throw new Error('Wallet returned no account.');
  prepCtx={kind:'standard',wallet,account,address:account.address};
 }else{
  const p=prepInjected();if(!p)throw new Error('Open this page inside Jupiter Wallet.');
  const out=await p.connect();const pk=out?.publicKey||p.publicKey;
  if(!pk)throw new Error('Wallet returned no public key.');
  prepCtx={kind:'legacy',provider:p,address:pk.toString()};
 }
 if(prepCtx.address!==cfg.authorisedMember){prepCtx=null;throw new Error('Connect the JayJayTeamDev wallet.');}
 return prepCtx;
}
async function prepSign(tx,d){
 if(prepCtx.kind==='standard'){
  const out=await prepCtx.wallet.features['solana:signTransaction'].signTransaction({account:prepCtx.account,transaction:new Uint8Array(tx.serialize())});
  const bytes=out?.[0]?.signedTransaction;if(!bytes)throw new Error('Wallet returned no signed transaction.');
  return d.web3.VersionedTransaction.deserialize(new Uint8Array(bytes));
 }
 return prepCtx.provider.signTransaction(tx);
}
async function prepSend(connection,d,ixs,label){
 const latest=await connection.getLatestBlockhash('processed');
 const tx=new d.web3.VersionedTransaction(new d.web3.TransactionMessage({
  payerKey:new d.web3.PublicKey(prepCtx.address),recentBlockhash:latest.blockhash,instructions:ixs
 }).compileToV0Message());
 prepStatus(label+' — approve in Jupiter Wallet…','warn');
 const signed=await prepSign(tx,d);
 const sig=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:12,preflightCommitment:'processed'});
 try{
  const conf=await connection.confirmTransaction({signature:sig,blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight},'confirmed');
  if(conf.value.err)throw new Error(label+' failed: '+JSON.stringify(conf.value.err));
  return sig;
 }catch(e){
  for(let i=0;i<12;i++){
   const out=await connection.getSignatureStatuses([sig],{searchTransactionHistory:true});
   const st=out?.value?.[0];
   if(st?.err)throw new Error(label+' failed: '+JSON.stringify(st.err));
   if(st&&(st.confirmationStatus==='confirmed'||st.confirmationStatus==='finalized'))return sig;
   await new Promise(r=>setTimeout(r,750));
  }
  throw e;
 }
}
async function missingRecipientAccounts(connection,d,cfg){
 const mint=new d.web3.PublicKey(cfg.mint),out=[];
 for(const x of cfg.legs.flat()){
  const owner=new d.web3.PublicKey(x.address);
  const ata=d.spl.getAssociatedTokenAddressSync(mint,owner,true,d.spl.TOKEN_PROGRAM_ID);
  if(!(await connection.getAccountInfo(ata,'confirmed')))out.push({owner,ata,address:x.address});
 }
 return out;
}
async function prepareRecipients(){
 const btn=document.querySelector('#prepare-accounts');if(btn)btn.disabled=true;
 const main=document.querySelector('#status');if(main){main.textContent='Preparing recipient WLDZ accounts from JayJayTeamDev. Squads vault SOL required: 0.';main.className='status warn';}
 try{
  const [d,cfg]=await Promise.all([getPrepDeps(),getPrepCfg()]);
  await prepConnect();
  const connection=new d.web3.Connection(PREP_RPC,'confirmed');
  let missing=await missingRecipientAccounts(connection,d,cfg);
  if(!missing.length){
   prepStatus('RECIPIENT ACCOUNTS READY ✅\nAll 10 WLDZ recipient accounts already exist. Squads vault SOL is not needed.','good');
   const main=document.querySelector('#status');if(main){main.textContent='Recipient accounts ready ✅ — checking balance now…';main.className='status good';}
   document.querySelector('#preflight')?.click();return;
  }
  const mint=new d.web3.PublicKey(cfg.mint);
  const chunks=[];for(let i=0;i<missing.length;i+=4)chunks.push(missing.slice(i,i+4));
  for(let i=0;i<chunks.length;i++){
   const ixs=chunks[i].map(x=>d.spl.createAssociatedTokenAccountIdempotentInstruction(
    new d.web3.PublicKey(prepCtx.address),x.ata,x.owner,mint,d.spl.TOKEN_PROGRAM_ID,d.spl.ASSOCIATED_TOKEN_PROGRAM_ID
   ));
   await prepSend(connection,d,ixs,'Prepare recipient accounts '+(i+1)+'/'+chunks.length);
  }
  missing=await missingRecipientAccounts(connection,d,cfg);
  if(missing.length)throw new Error(missing.length+' recipient account(s) did not confirm.');
  prepStatus('RECIPIENT ACCOUNTS READY ✅\nJayJayTeamDev paid the account rent. Squads vault SOL required: 0.\n\nChecking balance now…','good');
  const main=document.querySelector('#status');if(main){main.textContent='Recipient accounts ready ✅ — checking balance now…';main.className='status good';}
  document.querySelector('#preflight')?.click();
 }catch(e){
  prepStatus('PREPARATION STOPPED\n'+(e?.message||String(e)),'bad');
 }finally{if(btn)btn.disabled=false}
}
document.querySelector('#prepare-accounts')?.addEventListener('click',prepareRecipients);
