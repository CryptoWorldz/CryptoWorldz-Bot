const RPC='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const PUBLIC_RPC='https://api.mainnet-beta.solana.com';
const RESUME_KEY='worldz:wldz:distribution:20260923-a';
const $=s=>document.querySelector(s);
const status=(m,c='warn')=>{const e=$('#status');e.textContent=m;e.className='status '+c};
const fail=m=>{throw new Error(m)};
let ctx=null, cfg=null, depsCache=null;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const short=s=>String(s).slice(0,6)+'…'+String(s).slice(-6);

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
 depsCache={web3,sqds,spl,walletApp}; return depsCache;
}
async function load(){
 const r=await fetch('/wldz/distribute/config.json',{cache:'no-store'});
 if(!r.ok)fail('Distribution configuration unavailable.');
 cfg=await r.json();
 const rows=cfg.legs.flat().map(x=>`<div class="row"><span>${x.role}<br><span class="mono">${short(x.address)}</span></span><b>${Number(x.wldz).toLocaleString()} WLDZ</b></div>`).join('');
 $('#rows').innerHTML=rows;
}
function injected(){
 const candidates=[window?.jupiter?.solana,window?.jupiter,window?.phantom?.solana,window?.solflare,window?.solana];
 return candidates.find(p=>p&&typeof p.connect==='function'&&typeof p.signTransaction==='function')||null;
}
async function connect(){
 if(ctx)return ctx;
 const d=await deps();
 const wallets=d.walletApp.getWallets().get().filter(w=>w?.features?.['standard:connect']&&w?.features?.['solana:signTransaction']&&Array.isArray(w.chains)&&w.chains.some(c=>String(c).startsWith('solana:')));
 const jup=wallets.find(w=>/jupiter/i.test(String(w.name||'')))||wallets[0];
 if(jup){
  const out=await jup.features['standard:connect'].connect();
  const account=(out?.accounts||jup.accounts||[])[0];
  if(!account)fail('Wallet connected but returned no Solana account.');
  ctx={kind:'standard',wallet:jup,account,address:account.address};
 }else{
  const p=injected();
  if(!p)fail('No Solana wallet was detected. Open this page inside Jupiter Wallet.');
  const out=await p.connect();
  const pk=(out&&out.publicKey)||p.publicKey;
  if(!pk)fail('Wallet connected but returned no public key.');
  ctx={kind:'legacy',provider:p,address:pk.toString()};
 }
 if(ctx.address!==cfg.authorisedMember){const wrong=ctx.address;ctx=null;fail('Wrong wallet: '+short(wrong)+'. Connect '+short(cfg.authorisedMember)+'.')}
 $('#connect').textContent=short(ctx.address);
 return ctx;
}
async function signTx(tx,d){
 if(ctx.kind==='standard'){
  const out=await ctx.wallet.features['solana:signTransaction'].signTransaction({account:ctx.account,transaction:new Uint8Array(tx.serialize())});
  const bytes=out?.[0]?.signedTransaction;
  if(!bytes)fail('Wallet returned no signed transaction.');
  return d.web3.VersionedTransaction.deserialize(new Uint8Array(bytes));
 }
 const signed=await ctx.provider.signTransaction(tx);
 if(!signed)fail('Wallet returned no signed transaction.');
 return signed;
}
async function sendVersioned(connection,d,tx,label){
 status(label+' — approve in Jupiter Wallet…','warn');
 const signed=await signTx(tx,d);
 const sig=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:10,preflightCommitment:'processed'});
 const latest=await connection.getLatestBlockhash('processed');
 const conf=await connection.confirmTransaction({signature:sig,blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight},'confirmed').catch(()=>null);
 if(conf?.value?.err)fail(label+' failed: '+JSON.stringify(conf.value.err));
 return sig;
}
async function sendInstructions(connection,d,instructions,label,lookups=[]){
 const latest=await connection.getLatestBlockhash('processed');
 const tx=new d.web3.VersionedTransaction(new d.web3.TransactionMessage({
  payerKey:new d.web3.PublicKey(ctx.address),recentBlockhash:latest.blockhash,instructions
 }).compileToV0Message(lookups));
 return sendVersioned(connection,d,tx,label);
}
function pdaExists(connection,key){return connection.getAccountInfo(key,'confirmed').then(Boolean)}
async function readState(connection,d){
 const member=new d.web3.PublicKey(ctx.address), ms=new d.web3.PublicKey(cfg.multisig), vault=new d.web3.PublicKey(cfg.vault), mint=new d.web3.PublicKey(cfg.mint);
 const ma=await d.sqds.accounts.Multisig.fromAccountAddress(connection,ms,'confirmed');
 if(Number(ma.threshold)!==1)fail('Squads threshold is not 1. Distribution stopped.');
 const mm=ma.members.find(x=>x.key.equals(member));
 if(!mm)fail('Connected wallet is not a member of this Squad.');
 if((Number(mm.permissions.mask)&1)!==1)fail('Connected wallet cannot initiate this Squad transaction.');
 const derived=d.sqds.getVaultPda({multisigPda:ms,index:Number(cfg.vaultIndex)})[0];
 if(!derived.equals(vault))fail('Squads vault mismatch.');
 const mintInfo=await d.spl.getMint(connection,mint,'confirmed',d.spl.TOKEN_PROGRAM_ID);
 if(mintInfo.decimals!==6||mintInfo.supply!==100000000000000n||mintInfo.mintAuthority!==null||mintInfo.freezeAuthority!==null)fail('Canonical WLDZ invariant failed.');
 const sourceAta=await d.spl.getAssociatedTokenAddress(mint,vault,true,d.spl.TOKEN_PROGRAM_ID);
 const source=await d.spl.getAccount(connection,sourceAta,'confirmed',d.spl.TOKEN_PROGRAM_ID);
 const memberSol=await connection.getBalance(member,'confirmed');
 const vaultSol=await connection.getBalance(vault,'confirmed');
 return {member,ms,vault,mint,ma,sourceAta,sourceWldz:source.amount,memberSol,vaultSol};
}
async function preflight(){
 await connect(); const d=await deps(); const connection=new d.web3.Connection(RPC,'confirmed'); const s=await readState(connection,d);
 const have=s.memberSol/d.web3.LAMPORTS_PER_SOL;
 const need=Number(cfg.minimumSignerSol);
 const required=BigInt(cfg.totalWldz)*1000000n;
 if(s.sourceWldz<required)fail('Squads vault WLDZ is below the 55,000,000 WLDZ distribution amount.');
 let missingAtas=0;
 for(const x of cfg.legs.flat()){
  const owner=new d.web3.PublicKey(x.address);
  const ata=await d.spl.getAssociatedTokenAddress(s.mint,owner,true,d.spl.TOKEN_PROGRAM_ID);
  if(!(await pdaExists(connection,ata)))missingAtas++;
 }
 const rent=await connection.getMinimumBalanceForRentExemption(165);
 const vaultNeed=(BigInt(rent)*BigInt(missingAtas)+5000000n);
 if(BigInt(s.vaultSol)<vaultNeed)fail('Squads vault needs more SOL for '+missingAtas+' recipient token accounts.');
 if(have<need){
  $('#sign').disabled=true;
  status('NOT ENOUGH SOL\n\nJayJay signer: '+have.toFixed(6)+' SOL\nRequired before start: '+need.toFixed(2)+' SOL\n\nAdd SOL to '+cfg.authorisedMember+' then tap Check Balance again.','bad');
  return false;
 }
 $('#sign').disabled=false;
 status('READY ✅\nJayJay signer: '+have.toFixed(6)+' SOL\nSquads vault WLDZ: '+Number(s.sourceWldz/1000000n).toLocaleString()+'\nRecipient token accounts missing: '+missingAtas+'\n\nSign & Execute is armed.','good');
 return true;
}
function legMessage(d,s,leg,bh){
 const ixs=[];
 for(const x of leg){
  const owner=new d.web3.PublicKey(x.address);
  const ata=d.spl.getAssociatedTokenAddressSync(s.mint,owner,true,d.spl.TOKEN_PROGRAM_ID);
  ixs.push(d.spl.createAssociatedTokenAccountIdempotentInstruction(s.vault,ata,owner,s.mint,d.spl.TOKEN_PROGRAM_ID,d.spl.ASSOCIATED_TOKEN_PROGRAM_ID));
  ixs.push(d.spl.createTransferCheckedInstruction(s.sourceAta,s.mint,ata,s.vault,BigInt(x.wldz)*1000000n,6,[],d.spl.TOKEN_PROGRAM_ID));
 }
 return new d.web3.TransactionMessage({payerKey:s.vault,recentBlockhash:bh,instructions:ixs});
}
function saved(){try{return JSON.parse(localStorage.getItem(RESUME_KEY)||'null')}catch{return null}}
function save(v){localStorage.setItem(RESUME_KEY,JSON.stringify(v))}
async function run(){
 $('#sign').disabled=true;
 try{
  if(!(await preflight()))return;
  const d=await deps(), connection=new d.web3.Connection(RPC,'confirmed');
  let s=await readState(connection,d);
  const stored=saved();
  let batchIndex=stored?.batchIndex?BigInt(stored.batchIndex):d.sqds.utils.toBigInt(s.ma.transactionIndex)+1n;
  let batchPda=d.sqds.getTransactionPda({multisigPda:s.ms,index:batchIndex})[0];
  let proposalPda=d.sqds.getProposalPda({multisigPda:s.ms,transactionIndex:batchIndex})[0];
  if(!(await pdaExists(connection,batchPda))){
   const setup=[
    d.sqds.instructions.batchCreate({multisigPda:s.ms,creator:s.member,rentPayer:s.member,batchIndex,vaultIndex:Number(cfg.vaultIndex),memo:'WORLDZ WLDZ 55M owner distribution 2026-09-23'}),
    d.sqds.instructions.proposalCreate({multisigPda:s.ms,transactionIndex:batchIndex,creator:s.member,rentPayer:s.member,isDraft:true})
   ];
   await sendInstructions(connection,d,setup,'1/12 Create distribution batch');
   save({batchIndex:String(batchIndex)});
  }
  let batch=await d.sqds.accounts.Batch.fromAccountAddress(connection,batchPda,'confirmed');
  const bh=(await connection.getLatestBlockhash('confirmed')).blockhash;
  for(let i=0;i<cfg.legs.length;i++){
   const txPda=d.sqds.getBatchTransactionPda({multisigPda:s.ms,batchIndex,transactionIndex:i+1})[0];
   if(await pdaExists(connection,txPda))continue;
   const msg=legMessage(d,s,cfg.legs[i],bh);
   const ix=d.sqds.instructions.batchAddTransaction({
    vaultIndex:Number(cfg.vaultIndex),multisigPda:s.ms,member:s.member,rentPayer:s.member,batchIndex,transactionIndex:i+1,ephemeralSigners:0,transactionMessage:msg
   });
   await sendInstructions(connection,d,[ix],(i+2)+'/12 Add distribution leg '+(i+1));
  }
  let proposal=await d.sqds.accounts.Proposal.fromAccountAddress(connection,proposalPda,'confirmed');
  let kind=String(proposal.status?.__kind||'').toLowerCase();
  if(kind==='draft'){
   await sendInstructions(connection,d,[
    d.sqds.instructions.proposalActivate({multisigPda:s.ms,transactionIndex:batchIndex,member:s.member}),
    d.sqds.instructions.proposalApprove({multisigPda:s.ms,transactionIndex:batchIndex,member:s.member,memo:'JayJayTeamDev approved WLDZ distribution'})
   ],'7/12 Activate + approve');
  }else if(kind==='active'){
   await sendInstructions(connection,d,[d.sqds.instructions.proposalApprove({multisigPda:s.ms,transactionIndex:batchIndex,member:s.member,memo:'JayJayTeamDev approved WLDZ distribution'})],'7/12 Approve');
  }
  proposal=await d.sqds.accounts.Proposal.fromAccountAddress(connection,proposalPda,'confirmed');
  kind=String(proposal.status?.__kind||'').toLowerCase();
  if(!['approved','executing','executed'].includes(kind))fail('Proposal is '+kind+'; execution stopped.');
  if(kind!=='executed'){
   for(let i=0;i<cfg.legs.length;i++){
    const txPda=d.sqds.getBatchTransactionPda({multisigPda:s.ms,batchIndex,transactionIndex:i+1})[0];
    if(!(await pdaExists(connection,txPda)))continue;
    const built=await d.sqds.instructions.batchExecuteTransaction({connection,multisigPda:s.ms,member:s.member,batchIndex,transactionIndex:i+1});
    await sendInstructions(connection,d,[built.instruction],(i+8)+'/12 Execute distribution leg '+(i+1),built.lookupTableAccounts);
   }
  }
  s=await readState(connection,d);
  const left=Number(s.sourceWldz/1000000n);
  status('WLDZ DISTRIBUTION EXECUTED ✅\n\nBatch #'+batchIndex+'\nVault WLDZ remaining: '+left.toLocaleString()+'\n\nOn-chain execution completed.','good');
  localStorage.removeItem(RESUME_KEY);
 }catch(e){
  status('STOPPED\n\n'+(e?.message||String(e))+'\n\nNothing else will run until you tap the button again.','bad');
 }finally{$('#sign').disabled=false}
}
$('#connect').addEventListener('click',()=>connect().then(()=>preflight()).catch(e=>status(e.message,'bad')));
$('#preflight').addEventListener('click',()=>preflight().catch(e=>status(e.message,'bad')));
$('#sign').addEventListener('click',run);
await load();
