const RPC='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const RESUME_KEY='worldz:wldz:distribution:vault-v1';
const $=s=>document.querySelector(s);
const status=(m,c='warn')=>{const e=$('#status');e.textContent=m;e.className='status '+c};
const fail=m=>{throw new Error(m)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const short=s=>String(s).slice(0,6)+'…'+String(s).slice(-6);
let cfg=null,ctx=null,depsCache=null;

async function deps(){
 if(depsCache)return depsCache;
 const buffer=await import('https://esm.sh/buffer@6.0.3?bundle');
 if(!globalThis.Buffer)globalThis.Buffer=buffer.Buffer;
 const [web3,sqds,spl,walletApp]=await Promise.all([
  import('https://esm.sh/@solana/web3.js@1.98.4?bundle'),
  import('https://esm.sh/@sqds/multisig@2.1.4?bundle&deps=@solana/web3.js@1.98.4'),
  import('https://esm.sh/@solana/spl-token@0.4.15?bundle&deps=@solana/web3.js@1.98.4'),
  import('https://esm.sh/@wallet-standard/app@1.1.0?bundle')
 ]);
 depsCache={web3,sqds,spl,walletApp};return depsCache;
}

async function load(){
 const r=await fetch('/wldz/distribute/config.json?v=20260923-vault-v1',{cache:'no-store'});
 if(!r.ok)fail('Distribution configuration unavailable.');
 cfg=await r.json();
 $('#rows').innerHTML=cfg.legs.flat().map(x=>`<div class="row"><span>${x.role}<br><span class="mono">${short(x.address)}</span></span><b>${Number(x.wldz).toLocaleString()} WLDZ</b></div>`).join('');
}

function injected(){
 return [window?.jupiter?.solana,window?.jupiter,window?.phantom?.solana,window?.solflare,window?.solana]
  .find(p=>p&&typeof p.connect==='function'&&typeof p.signTransaction==='function')||null;
}

async function connect(){
 if(ctx)return ctx;
 const d=await deps();
 const wallets=d.walletApp.getWallets().get().filter(w=>w?.features?.['standard:connect']&&w?.features?.['solana:signTransaction']);
 const wallet=wallets.find(w=>/jupiter/i.test(String(w.name||'')))||wallets[0];
 if(wallet){
  const out=await wallet.features['standard:connect'].connect();
  const account=(out?.accounts||wallet.accounts||[])[0];
  if(!account)fail('Wallet returned no Solana account.');
  ctx={kind:'standard',wallet,account,address:account.address};
 }else{
  const p=injected();if(!p)fail('Open this page inside Jupiter Wallet.');
  const out=await p.connect();const pk=out?.publicKey||p.publicKey;
  if(!pk)fail('Wallet returned no public key.');
  ctx={kind:'legacy',provider:p,address:pk.toString()};
 }
 if(ctx.address!==cfg.authorisedMember){const bad=ctx.address;ctx=null;fail('Wrong wallet: '+short(bad));}
 $('#connect').textContent=short(ctx.address);return ctx;
}

async function sign(tx,d){
 if(ctx.kind==='standard'){
  const out=await ctx.wallet.features['solana:signTransaction'].signTransaction({account:ctx.account,transaction:new Uint8Array(tx.serialize())});
  const bytes=out?.[0]?.signedTransaction;if(!bytes)fail('Wallet returned no signed transaction.');
  return d.web3.VersionedTransaction.deserialize(new Uint8Array(bytes));
 }
 const signed=await ctx.provider.signTransaction(tx);if(!signed)fail('Wallet returned no signed transaction.');return signed;
}

async function simulate(connection,tx,label){
 const sim=await connection.simulateTransaction(tx,{sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed'});
 if(sim.value.err){
  const logs=(sim.value.logs||[]).slice(-8).join('\n');
  fail(label+' dry-run failed.\n'+JSON.stringify(sim.value.err)+(logs?'\n'+logs:''));
 }
 return sim.value;
}

async function sendInstructions(connection,d,instructions,label,lookups=[]){
 const latest=await connection.getLatestBlockhash('processed');
 const tx=new d.web3.VersionedTransaction(new d.web3.TransactionMessage({
  payerKey:new d.web3.PublicKey(ctx.address),recentBlockhash:latest.blockhash,instructions
 }).compileToV0Message(lookups));
 await simulate(connection,tx,label);
 status(label+' — dry-run passed ✅\nApprove in Jupiter Wallet…','good');
 const signed=await sign(tx,d);
 const sig=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:12,preflightCommitment:'processed'});
 try{
  const c=await connection.confirmTransaction({signature:sig,blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight},'confirmed');
  if(c.value.err)fail(label+' failed on-chain: '+JSON.stringify(c.value.err));
 }catch(e){
  for(let i=0;i<16;i++){
   const s=(await connection.getSignatureStatuses([sig],{searchTransactionHistory:true}))?.value?.[0];
   if(s?.err)fail(label+' failed on-chain: '+JSON.stringify(s.err));
   if(s&&(s.confirmationStatus==='confirmed'||s.confirmationStatus==='finalized'))return sig;
   await sleep(750);
  }
  throw e;
 }
 return sig;
}

const exists=(connection,key)=>connection.getAccountInfo(key,'confirmed').then(Boolean);

async function state(connection,d){
 const member=new d.web3.PublicKey(ctx.address),ms=new d.web3.PublicKey(cfg.multisig),vault=new d.web3.PublicKey(cfg.vault),mint=new d.web3.PublicKey(cfg.mint);
 const ma=await d.sqds.accounts.Multisig.fromAccountAddress(connection,ms,'confirmed');
 if(Number(ma.threshold)!==1)fail('Squads threshold is not 1.');
 const mm=ma.members.find(x=>x.key.equals(member));if(!mm)fail('JayJayTeamDev is not a live Squad member.');
 if((Number(mm.permissions.mask)&1)!==1)fail('JayJayTeamDev cannot initiate this Squad transaction.');
 if(!d.sqds.getVaultPda({multisigPda:ms,index:Number(cfg.vaultIndex)})[0].equals(vault))fail('Squads vault mismatch.');
 const mi=await d.spl.getMint(connection,mint,'confirmed',d.spl.TOKEN_PROGRAM_ID);
 if(mi.decimals!==6||mi.mintAuthority!==null||mi.freezeAuthority!==null)fail('Canonical WLDZ authority/decimals check failed.');
 if(mi.supply>100000000n*1000000n)fail('WLDZ supply exceeds the locked 100M cap.');
 const sourceAta=d.spl.getAssociatedTokenAddressSync(mint,vault,true,d.spl.TOKEN_PROGRAM_ID);
 const source=await d.spl.getAccount(connection,sourceAta,'confirmed',d.spl.TOKEN_PROGRAM_ID);
 const memberSol=await connection.getBalance(member,'confirmed');
 return {member,ms,vault,mint,ma,sourceAta,sourceWldz:source.amount,memberSol,mintSupply:mi.supply};
}

async function recipientCheck(connection,d,s){
 let missing=0;
 for(const x of cfg.legs.flat()){
  const owner=new d.web3.PublicKey(x.address);
  const ata=d.spl.getAssociatedTokenAddressSync(s.mint,owner,true,d.spl.TOKEN_PROGRAM_ID);
  if(!(await exists(connection,ata)))missing++;
 }
 return missing;
}

function transferInstructions(d,s){
 return cfg.legs.flat().map(x=>{
  const owner=new d.web3.PublicKey(x.address);
  const ata=d.spl.getAssociatedTokenAddressSync(s.mint,owner,true,d.spl.TOKEN_PROGRAM_ID);
  return d.spl.createTransferCheckedInstruction(s.sourceAta,s.mint,ata,s.vault,BigInt(x.wldz)*1000000n,6,[],d.spl.TOKEN_PROGRAM_ID);
 });
}

async function preflight(){
 await connect();
 const d=await deps(),connection=new d.web3.Connection(RPC,'confirmed'),s=await state(connection,d);
 if(s.sourceWldz<BigInt(cfg.totalWldz)*1000000n)fail('Squads vault does not contain the full 55,000,000 WLDZ.');
 const missing=await recipientCheck(connection,d,s);
 if(missing){
  $('#sign').disabled=true;
  status('Recipient token accounts still missing: '+missing+'\nTap 1. Prepare Recipient Accounts.','bad');
  return false;
 }
 const prep=$('#prepare-accounts');if(prep){prep.disabled=true;prep.textContent='1. Recipient Accounts Ready ✅';}
 const ps=$('#prepare-status');if(ps){ps.textContent='RECIPIENT ACCOUNTS READY ✅\nAll 10 destination token accounts are confirmed on-chain.';ps.className='status good';}

 const bh=(await connection.getLatestBlockhash('confirmed')).blockhash;
 const inner=new d.web3.VersionedTransaction(new d.web3.TransactionMessage({payerKey:s.vault,recentBlockhash:bh,instructions:transferInstructions(d,s)}).compileToV0Message());
 await simulate(connection,inner,'55M WLDZ transfer');
 const have=s.memberSol/d.web3.LAMPORTS_PER_SOL;
 $('#sign').disabled=false;
 status('READY ✅\nJayJay signer: '+have.toFixed(6)+' SOL\nSquads vault WLDZ: '+Number(s.sourceWldz/1000000n).toLocaleString()+'\nRecipient token accounts missing: 0\n55M WLDZ transfer dry-run: PASSED ✅\n\nSign & Execute is armed.','good');
 return true;
}

async function run(){
 $('#sign').disabled=true;
 try{
  if(!(await preflight()))return;
  const d=await deps(),connection=new d.web3.Connection(RPC,'confirmed');
  let s=await state(connection,d);
  let stored=null;try{stored=JSON.parse(localStorage.getItem(RESUME_KEY)||'null')}catch{}
  let index=stored?.index?BigInt(stored.index):BigInt(s.ma.transactionIndex.toString())+1n;
  let txPda=d.sqds.getTransactionPda({multisigPda:s.ms,index})[0];
  let proposalPda=d.sqds.getProposalPda({multisigPda:s.ms,transactionIndex:index})[0];

  if(stored?.index && !(await exists(connection,txPda))){
   localStorage.removeItem(RESUME_KEY);
   index=BigInt(s.ma.transactionIndex.toString())+1n;
   txPda=d.sqds.getTransactionPda({multisigPda:s.ms,index})[0];
   proposalPda=d.sqds.getProposalPda({multisigPda:s.ms,transactionIndex:index})[0];
  }

  if(!(await exists(connection,txPda))){
   const bh=(await connection.getLatestBlockhash('confirmed')).blockhash;
   const vaultMessage=new d.web3.TransactionMessage({payerKey:s.vault,recentBlockhash:bh,instructions:transferInstructions(d,s)});
   const create=d.sqds.instructions.vaultTransactionCreate({
    multisigPda:s.ms,transactionIndex:index,creator:s.member,rentPayer:s.member,vaultIndex:Number(cfg.vaultIndex),
    ephemeralSigners:0,transactionMessage:vaultMessage,memo:'WORLDZ WLDZ 55M owner distribution'
   });
   const proposal=d.sqds.instructions.proposalCreate({multisigPda:s.ms,transactionIndex:index,creator:s.member,rentPayer:s.member,isDraft:true});
   await sendInstructions(connection,d,[create,proposal],'1/3 Create WLDZ proposal');
   localStorage.setItem(RESUME_KEY,JSON.stringify({index:String(index)}));
  }

  let proposal=await d.sqds.accounts.Proposal.fromAccountAddress(connection,proposalPda,'confirmed');
  let kind=String(proposal.status?.__kind||'').toLowerCase();
  if(kind==='draft'){
   await sendInstructions(connection,d,[
    d.sqds.instructions.proposalActivate({multisigPda:s.ms,transactionIndex:index,member:s.member}),
    d.sqds.instructions.proposalApprove({multisigPda:s.ms,transactionIndex:index,member:s.member,memo:'JayJayTeamDev approved WLDZ distribution'})
   ],'2/3 Approve WLDZ proposal');
  }else if(kind==='active'){
   await sendInstructions(connection,d,[d.sqds.instructions.proposalApprove({multisigPda:s.ms,transactionIndex:index,member:s.member,memo:'JayJayTeamDev approved WLDZ distribution'})],'2/3 Approve WLDZ proposal');
  }

  proposal=await d.sqds.accounts.Proposal.fromAccountAddress(connection,proposalPda,'confirmed');
  kind=String(proposal.status?.__kind||'').toLowerCase();
  if(!['approved','executing','executed'].includes(kind))fail('Proposal status is '+kind+'.');

  if(kind!=='executed'){
   const built=await d.sqds.instructions.vaultTransactionExecute({connection,multisigPda:s.ms,transactionIndex:index,member:s.member});
   await sendInstructions(connection,d,[built.instruction],'3/3 Execute 55M WLDZ distribution',built.lookupTableAccounts);
  }

  await sleep(800);
  s=await state(connection,d);
  localStorage.removeItem(RESUME_KEY);
  status('WLDZ DISTRIBUTION EXECUTED ✅\n\nDistributed: 55,000,000 WLDZ\nVault remaining: '+Number(s.sourceWldz/1000000n).toLocaleString()+' WLDZ','good');
 }catch(e){
  status('STOPPED\n\n'+(e?.message||String(e))+'\n\nNo next transaction will be signed until its dry-run passes.','bad');
 }finally{
  try{await preflight()}catch{}
 }
}

$('#connect').addEventListener('click',()=>connect().then(preflight).catch(e=>status(e.message,'bad')));
$('#preflight').addEventListener('click',()=>preflight().catch(e=>status(e.message,'bad')));
$('#sign').addEventListener('click',run);
await load();
