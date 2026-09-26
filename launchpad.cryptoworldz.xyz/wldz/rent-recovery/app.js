const RPC='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const JAY='Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u';
const MULTISIG='B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN';
const MAX_TX_BYTES=1232;
const $=s=>document.querySelector(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const short=s=>String(s).slice(0,6)+'…'+String(s).slice(-6);
const fail=m=>{throw new Error(m)};
const setStatus=(m,c='warn')=>{const e=$('#status');e.textContent=m;e.className='status '+c};
let depsCache=null,ctx=null,lastPlan=null;

async function deps(){
 if(depsCache)return depsCache;
 const buffer=await import('https://esm.sh/buffer@6.0.3?bundle');
 if(!globalThis.Buffer)globalThis.Buffer=buffer.Buffer;
 const [web3,sqds,walletApp]=await Promise.all([
  import('https://esm.sh/@solana/web3.js@1.98.4?bundle'),
  import('https://esm.sh/@sqds/multisig@2.1.4?bundle&deps=@solana/web3.js@1.98.4'),
  import('https://esm.sh/@wallet-standard/app@1.1.0?bundle')
 ]);
 depsCache={web3,sqds,walletApp};return depsCache;
}
function injected(){
 return [window?.jupiter?.solana,window?.jupiter,window?.phantom?.solana,window?.solflare,window?.solana]
  .find(p=>p&&typeof p.connect==='function'&&typeof p.signTransaction==='function')||null;
}
async function connect(){
 if(ctx)return ctx;
 const d=await deps();
 const wallets=d.walletApp.getWallets().get().filter(w=>w?.features?.['standard:connect']&&w?.features?.['solana:signTransaction']);
 const wallet=wallets.find(w=>/jupiter/i.test(String(w.name||'')))||wallets.find(w=>/solflare|phantom/i.test(String(w.name||'')))||wallets[0];
 if(wallet){
  const out=await wallet.features['standard:connect'].connect();
  const account=(out?.accounts||wallet.accounts||[])[0];
  if(!account)fail('Wallet returned no Solana account.');
  ctx={kind:'standard',wallet,account,address:account.address};
 }else{
  const provider=injected();
  if(!provider)fail('Open this page inside Jupiter Wallet, Phantom, or Solflare.');
  const out=await provider.connect();
  const pk=out?.publicKey||provider.publicKey;
  if(!pk)fail('Wallet returned no public key.');
  ctx={kind:'legacy',provider,address:pk.toString()};
 }
 if(ctx.address!==JAY){const bad=ctx.address;ctx=null;fail('Wrong wallet connected: '+short(bad)+'\nConnect JayJayTeamDev: '+short(JAY));}
 $('#connect').textContent=short(ctx.address);
 return ctx;
}
async function signLegacy(tx,d){
 if(ctx.kind==='standard'){
  const unsigned=tx.serialize({requireAllSignatures:false,verifySignatures:false});
  const out=await ctx.wallet.features['solana:signTransaction'].signTransaction({
   account:ctx.account,
   transaction:new Uint8Array(unsigned)
  });
  const bytes=out?.[0]?.signedTransaction;
  if(!bytes)fail('Wallet returned no signed transaction.');
  return d.web3.Transaction.from(new Uint8Array(bytes));
 }
 const signed=await ctx.provider.signTransaction(tx);
 if(!signed)fail('Wallet returned no signed transaction.');
 return signed;
}
function readRentCollector(ms,d){
 const r=ms.rentCollector;
 if(!r)return null;
 if(r instanceof d.web3.PublicKey)return r;
 if(r?.toBase58)return r;
 if(Array.isArray(r)&&r[0]?.toBase58)return r[0];
 return null;
}
function permissions(d,member){
 return {
  initiate:d.sqds.types.Permissions.has(member.permissions,d.sqds.types.Permission.Initiate),
  vote:d.sqds.types.Permissions.has(member.permissions,d.sqds.types.Permission.Vote),
  execute:d.sqds.types.Permissions.has(member.permissions,d.sqds.types.Permission.Execute),
 };
}
async function scan(connection,d,ms,msKey){
 const current=BigInt(ms.transactionIndex.toString());
 const stale=BigInt(ms.staleTransactionIndex.toString());
 const rows=[];
 for(let i=1n;i<=current;i++){
  const [txPda]=d.sqds.getTransactionPda({multisigPda:msKey,index:i});
  const [proposalPda]=d.sqds.getProposalPda({multisigPda:msKey,transactionIndex:i});
  const [txInfo,proposalInfo]=await connection.getMultipleAccountsInfo([txPda,proposalPda],'confirmed');
  let type='MISSING';
  if(txInfo){
   try{d.sqds.accounts.VaultTransaction.fromAccountInfo(txInfo);type='VaultTransaction';}
   catch{
    try{d.sqds.accounts.ConfigTransaction.fromAccountInfo(txInfo);type='ConfigTransaction';}
    catch{type='OTHER_OR_UNDECODED';}
   }
  }
  let status=proposalInfo?'UNDECODED':'MISSING';
  if(proposalInfo){try{status=d.sqds.accounts.Proposal.fromAccountInfo(proposalInfo)[0].status.__kind}catch{}}
  const supported=type==='VaultTransaction'||type==='ConfigTransaction';
  const terminal=['Executed','Rejected','Cancelled'].includes(status);
  const isStale=i<=stale;
  if(supported&&(terminal||isStale)){
   rows.push({index:i,type,status,txPda,proposalPda,lamports:BigInt((txInfo?.lamports||0)+(proposalInfo?.lamports||0))});
  }
 }
 return rows;
}
function closeIx(d,msKey,row,rentCollector){
 const factory=row.type==='VaultTransaction'
  ?d.sqds.instructions.vaultTransactionAccountsClose
  :d.sqds.instructions.configTransactionAccountsClose;
 return factory({multisigPda:msKey,rentCollector,transactionIndex:row.index});
}
async function buildPlan(){
 await connect();
 const d=await deps();
 const connection=new d.web3.Connection(RPC,'confirmed');
 const memberKey=new d.web3.PublicKey(JAY),msKey=new d.web3.PublicKey(MULTISIG);
 const ms=await d.sqds.accounts.Multisig.fromAccountAddress(connection,msKey,'confirmed');
 if(Number(ms.threshold)!==1)fail('STOP: live Squads threshold is '+ms.threshold+', not 1.');
 const member=ms.members.find(m=>m.key.equals(memberKey));
 if(!member)fail('STOP: JayJayTeamDev is not a live Squads member.');
 const p=permissions(d,member);
 if(!(p.initiate&&p.vote&&p.execute))fail('STOP: JayJayTeamDev does not have Initiate + Vote + Execute.');
 const currentCollector=readRentCollector(ms,d);
 if(currentCollector&&!currentCollector.equals(memberKey))fail('STOP: another rent collector is already configured: '+currentCollector.toBase58());

 const rows=await scan(connection,d,ms,msKey);
 if(!rows.length)fail('No eligible historical Squads rent accounts remain.');
 const gross=rows.reduce((a,x)=>a+x.lamports,0n);
 const latest=await connection.getLatestBlockhash('confirmed');
 const nextIndex=BigInt(ms.transactionIndex.toString())+1n;
 const [newTxPda]=d.sqds.getTransactionPda({multisigPda:msKey,index:nextIndex});
 const [newProposalPda]=d.sqds.getProposalPda({multisigPda:msKey,transactionIndex:nextIndex});

 const mandatory=[];
 if(!currentCollector){
  mandatory.push(
   d.sqds.instructions.configTransactionCreate({
    multisigPda:msKey,transactionIndex:nextIndex,creator:memberKey,rentPayer:memberKey,
    actions:[{__kind:'SetRentCollector',newRentCollector:memberKey}]
   }),
   d.sqds.instructions.proposalCreate({
    multisigPda:msKey,creator:memberKey,rentPayer:memberKey,transactionIndex:nextIndex,isDraft:false
   }),
   d.sqds.instructions.proposalApprove({multisigPda:msKey,transactionIndex:nextIndex,member:memberKey}),
   d.sqds.instructions.configTransactionExecute({
    multisigPda:msKey,transactionIndex:nextIndex,member:memberKey,rentPayer:memberKey
   }),
   d.sqds.instructions.configTransactionAccountsClose({
    multisigPda:msKey,rentCollector:memberKey,transactionIndex:nextIndex
   })
  );
 }

 const ixs=[...mandatory,...rows.map(r=>closeIx(d,msKey,r,memberKey))];
 const tx=new d.web3.Transaction({feePayer:memberKey,recentBlockhash:latest.blockhash});
 tx.add(...ixs);
 const bytes=tx.serialize({requireAllSignatures:false,verifySignatures:false}).length;
 if(bytes>MAX_TX_BYTES)fail('STOP: recovery transaction is '+bytes+' bytes; preflight limit is '+MAX_TX_BYTES+'. Nothing signed.');

 const feeReply=await connection.getFeeForMessage(tx.compileMessage(),'confirmed');
 if(feeReply.value==null)fail('Could not calculate Solana fee.');
 const fee=BigInt(feeReply.value);
 const before=BigInt(await connection.getBalance(memberKey,'confirmed'));
 const wire=tx.serialize({requireAllSignatures:false,verifySignatures:false}).toString('base64');
 const simResp=await fetch(RPC,{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({
   jsonrpc:'2.0',
   id:1,
   method:'simulateTransaction',
   params:[wire,{
    encoding:'base64',
    sigVerify:false,
    replaceRecentBlockhash:true,
    commitment:'confirmed'
   }]
  })
 });
 const simEnv=await simResp.json();
 if(!simResp.ok||simEnv.error)fail('STOP: live dry-run RPC failed. Nothing signed.\n'+JSON.stringify(simEnv.error||simResp.status));
 const sim=simEnv.result?.value;
 if(!sim)fail('STOP: live dry-run returned no result. Nothing signed.');
 if(sim.err){
  const logs=(sim.logs||[]).slice(-8).join('\n');
  fail('STOP: live dry-run failed. Nothing signed.\n'+JSON.stringify(sim.err)+(logs?'\n'+logs:''));
 }
 const net=gross-fee;
 lastPlan={d,connection,tx,latest,rows,gross,fee,net,before,msKey,memberKey,currentCollector,newTxPda,newProposalPda,bytes};
 $('#recovery-readout').textContent=rows.length+' accounts • ~'+(Number(net)/1e9).toFixed(6)+' SOL net';
 $('#recover').disabled=false;
 setStatus(
  'READY ✅\n'+
  'Wallet: '+short(JAY)+'\n'+
  'Squads threshold: 1\n'+
  'Permissions: Initiate + Vote + Execute ✅\n'+
  'Rent collector: '+(currentCollector?'already JayJayTeamDev':'will be set to JayJayTeamDev')+'\n'+
  'Eligible accounts: '+rows.map(r=>r.index.toString()).join(', ')+'\n'+
  'Gross rent: '+(Number(gross)/1e9).toFixed(6)+' SOL\n'+
  'Network fee: '+(Number(fee)/1e9).toFixed(6)+' SOL\n'+
  'Transaction size: '+bytes+' / '+MAX_TX_BYTES+' bytes\n'+
  'Live simulation: PASSED ✅\n\n'+
  'Tap “2. Sign & Recover SOL” and approve the transaction in your wallet.',
  'good'
 );
 return lastPlan;
}
async function recover(){
 $('#recover').disabled=true;
 try{
  const plan=await buildPlan();
  setStatus('LIVE CHECK PASSED ✅\nApprove the Squads rent-recovery transaction in your wallet…','good');
  const signed=await signLegacy(plan.tx,plan.d);
  const sig=await plan.connection.sendRawTransaction(signed.serialize(),{
   skipPreflight:false,maxRetries:12,preflightCommitment:'processed'
  });
  setStatus('Transaction sent ✅\n'+sig+'\nWaiting for confirmation…','warn');
  try{
   const conf=await plan.connection.confirmTransaction({
    signature:sig,
    blockhash:plan.latest.blockhash,
    lastValidBlockHeight:plan.latest.lastValidBlockHeight
   },'confirmed');
   if(conf.value.err)fail('On-chain recovery failed: '+JSON.stringify(conf.value.err));
  }catch(e){
   let confirmed=false;
   for(let i=0;i<16;i++){
    const s=(await plan.connection.getSignatureStatuses([sig],{searchTransactionHistory:true}))?.value?.[0];
    if(s?.err)fail('On-chain recovery failed: '+JSON.stringify(s.err));
    if(s&&(s.confirmationStatus==='confirmed'||s.confirmationStatus==='finalized')){confirmed=true;break}
    await sleep(750);
   }
   if(!confirmed)throw e;
  }
  const after=BigInt(await plan.connection.getBalance(plan.memberKey,'confirmed'));
  const newMs=await plan.d.sqds.accounts.Multisig.fromAccountAddress(plan.connection,plan.msKey,'confirmed');
  const collector=readRentCollector(newMs,plan.d);
  const remaining=await scan(plan.connection,plan.d,newMs,plan.msKey);
  if(!collector?.equals(plan.memberKey))fail('Transaction confirmed but rent collector verification failed.');
  setStatus(
   'RECOVERY COMPLETE ✅\n'+
   'Signature: '+sig+'\n'+
   'JayJayTeamDev is now the Squads rent collector ✅\n'+
   'Wallet SOL: '+(Number(after)/1e9).toFixed(9)+'\n'+
   'Change from pre-sign balance: '+(Number(after-plan.before)/1e9).toFixed(9)+' SOL\n'+
   'Eligible historical rent accounts remaining: '+remaining.length+'\n\n'+
   (remaining.length?'Run the check again to recover any remaining eligible rent.':'REVIVE launch funding is now available from the recovered SOL. 🚀'),
   remaining.length?'warn':'good'
  );
  $('#recovery-readout').textContent=remaining.length?'Recovery partially complete':'Recovered ✅';
 }catch(e){
  setStatus((e?.message||String(e)),'bad');
 }finally{
  lastPlan=null;
  $('#recover').disabled=true;
 }
}
$('#connect')?.addEventListener('click',()=>connect().then(()=>setStatus('JayJayTeamDev connected ✅\nTap “1. Check Recovery”.','good')).catch(e=>setStatus(e?.message||String(e),'bad')));
$('#check')?.addEventListener('click',()=>{ $('#recover').disabled=true; buildPlan().catch(e=>setStatus(e?.message||String(e),'bad')); });
$('#recover')?.addEventListener('click',recover);
