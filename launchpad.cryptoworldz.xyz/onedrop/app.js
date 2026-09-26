import {
  Connection,PublicKey,SystemProgram,Transaction,TransactionInstruction,TransactionMessage
} from 'https://esm.sh/@solana/web3.js@1.98.4?bundle';
import {
  TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,getMint,getAccount
} from 'https://esm.sh/@solana/spl-token@0.4.15?bundle&deps=@solana/web3.js@1.98.4';
import * as squads from 'https://esm.sh/@sqds/multisig@2.1.4?bundle&deps=@solana/web3.js@1.98.4';
import {getWallets} from 'https://esm.sh/@wallet-standard/app@1.1.0?bundle';
import {Buffer} from 'https://esm.sh/buffer@6.0.3?bundle';
globalThis.Buffer??=Buffer;

const RPC='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const MAINNET='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const JITO=new PublicKey('mERKcfxMC5SqJn4Ld4BUris3WKZZ1ojjWJ3A3J5CKxv');
const $=s=>document.querySelector(s);
const connection=new Connection(RPC,'confirmed');
let manifest=null,wallet=null,plan=null;

function status(msg,type=''){const e=$('#status');e.textContent=msg;e.className='status'+(type?' '+type:'');}
function stop(msg){throw new Error(msg)}
function u64(v){const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(v));return b}
function i64(v){const b=Buffer.alloc(8);b.writeBigInt64LE(BigInt(v));return b}
function concat(parts){const n=parts.reduce((s,x)=>s+x.length,0),o=new Uint8Array(n);let p=0;for(const x of parts){o.set(x,p);p+=x.length}return o}
async function sha(parts){return new Uint8Array(await crypto.subtle.digest('SHA-256',concat(parts)))}
function cmp(a,b){for(let i=0;i<a.length;i++){if(a[i]!==b[i])return a[i]-b[i]}return 0}
function hex(a){return [...a].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function merkleRoot(rows){
  const leaves=await Promise.all(rows.map(async r=>{
    const inner=await sha([new PublicKey(r.wallet).toBytes(),u64(r.amountRaw),u64(0)]);
    return sha([new Uint8Array([0]),inner]);
  }));
  if(!leaves.length)stop('Recipient manifest is empty.');
  let level=leaves;
  while(level.length>1){
    const next=[];
    for(let i=0;i<level.length;i+=2){
      const a=level[i],b=level[i+1]||level[i];
      const pair=cmp(a,b)<=0?[a,b]:[b,a];
      next.push(await sha([new Uint8Array([1]),pair[0],pair[1]]));
    }
    level=next;
  }
  return level[0];
}
async function discriminator(name){return (await sha([new TextEncoder().encode('global:'+name)])).slice(0,8)}
function exactTotal(rows){return rows.reduce((s,r)=>s+BigInt(r.amountRaw),0n)}
function walletCandidates(){
  try{return getWallets().get().filter(w=>w?.features?.['standard:connect']&&w?.features?.['solana:signTransaction']&&w?.chains?.includes('solana:mainnet')).sort((a,b)=>Number(!/jupiter/i.test(a.name||''))-Number(!/jupiter/i.test(b.name||'')))}catch{return[]}
}
function injected(){
  const ok=p=>p&&typeof p.connect==='function'&&typeof p.signTransaction==='function';
  return [window?.jupiter?.solana,window?.solana?.isJupiter?window.solana:null,window?.phantom?.solana,window?.solflare,window?.solana].find(ok)||null;
}
async function connectWallet(){
  let list=[],p=null;
  for(let i=0;i<20;i++){list=walletCandidates();p=injected();if(list.length||p)break;await new Promise(r=>setTimeout(r,150))}
  if(list.length){
    const w=list[0],out=await w.features['standard:connect'].connect();
    const account=(out?.accounts||w.accounts||[]).find(a=>a.chains?.includes('solana:mainnet'));
    if(!account)stop('Wallet returned no Solana mainnet account.');
    return {publicKey:new PublicKey(account.address),name:w.name||'Wallet',async signTransaction(tx){
      const bytes=tx.serialize({requireAllSignatures:false,verifySignatures:false});
      const signed=await w.features['solana:signTransaction'].signTransaction({transaction:new Uint8Array(bytes),account,chain:'solana:mainnet'});
      if(!signed?.[0]?.signedTransaction)stop('Wallet returned no signed transaction.');
      return Transaction.from(new Uint8Array(signed[0].signedTransaction));
    }};
  }
  if(p){
    const out=await p.connect(),pk=(out&&out.publicKey)||p.publicKey;
    if(!pk)stop('Wallet returned no public key.');
    return {publicKey:new PublicKey(pk.toString()),name:'Injected Solana Wallet',signTransaction:tx=>p.signTransaction(tx)};
  }
  status('Opening secure Solana wallet connection… choose Jupiter Mobile and approve.','warn');
  const mod=await import('./wallet-mobile.js?v=20260926-vanilla-reown-b');
  mod.resetJupiterMobileConnectionState?.();
  const adapter=await mod.getJupiterMobileAdapter();
  await adapter.connect();
  if(!adapter.publicKey)stop('Mobile wallet returned no public key.');
  return {publicKey:new PublicKey(adapter.publicKey.toString()),name:'Jupiter Mobile',signTransaction:tx=>adapter.signTransaction(tx)};
}
async function rpc(method,params){
  const r=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  const j=await r.json();if(!r.ok||j.error)stop('RPC failed: '+JSON.stringify(j.error||r.status));return j.result;
}
function newDistributorIx({distributor,clawbackAta,mint,tokenVault,admin,root,version,maxTotal,maxNodes,start,end,clawback}){
  return discriminator('new_distributor').then(d=>{
    const data=Buffer.concat([Buffer.from(d),u64(version),Buffer.from(root),u64(maxTotal),u64(maxNodes),i64(start),i64(end),i64(clawback)]);
    if(data.length!==88)stop('Distributor instruction encoding mismatch.');
    return new TransactionInstruction({
      programId:JITO,data,
      keys:[
        {pubkey:distributor,isSigner:false,isWritable:true},
        {pubkey:clawbackAta,isSigner:false,isWritable:true},
        {pubkey:mint,isSigner:false,isWritable:false},
        {pubkey:tokenVault,isSigner:false,isWritable:true},
        {pubkey:admin,isSigner:true,isWritable:true},
        {pubkey:SystemProgram.programId,isSigner:false,isWritable:false},
        {pubkey:ASSOCIATED_TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},
        {pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false}
      ]
    });
  });
}
function metasForWrapped(message,vault){
  if(message.addressTableLookups?.length)stop('Unexpected address lookup table in OneDrop inner message.');
  return message.accountKeys.map((key,i)=>({
    pubkey:key,
    isWritable:squads.utils.isStaticWritableIndex(message,i),
    isSigner:squads.utils.isSignerIndex(message,i)&&!key.equals(vault)
  }));
}
async function load(){
  const r=await fetch('./revive-manifest.v1.json?v=20260926-a',{cache:'no-store'});if(!r.ok)stop('Frozen manifest unavailable.');
  manifest=await r.json();
  if(manifest.schema!=='worldz.onedrop.v1'||manifest.token?.mint!=='DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R')stop('Manifest contract mismatch.');
  if(manifest.recipients.length!==219||exactTotal(manifest.recipients)!==BigInt(manifest.distributor.maxTotalClaimRaw))stop('Manifest total mismatch.');
  status('Frozen REVIVE OneDrop manifest loaded. Connect JayJayTeamDev.','good');
}
async function prepare(){
  plan=null;$('#launch').disabled=true;
  if(!wallet||!manifest)stop('Load manifest and connect wallet first.');
  const owner=new PublicKey(manifest.authority.owner);
  if(!wallet.publicKey.equals(owner))stop('Wrong wallet. Required JayJayTeamDev: '+owner.toBase58());
  if(await connection.getGenesisHash()!==MAINNET)stop('Wrong Solana network.');
  const [jitoInfo,ownerLamports]=await Promise.all([connection.getAccountInfo(JITO,'confirmed'),connection.getBalance(owner,'confirmed')]);
  if(!jitoInfo?.executable)stop('Jito Merkle Distributor program is not executable on the selected network.');

  const mint=new PublicKey(manifest.token.mint),multisig=new PublicKey(manifest.authority.squadsMultisig),vault=new PublicKey(manifest.authority.squadsVault);
  const sourceAta=new PublicKey(manifest.authority.squadsVaultRvivAta),version=BigInt(manifest.distributor.versionU64);
  const mintInfo=await getMint(connection,mint,'confirmed',TOKEN_PROGRAM_ID);
  if(mintInfo.decimals!==manifest.token.decimals||mintInfo.supply!==BigInt(manifest.token.totalSupplyRaw)||mintInfo.mintAuthority||mintInfo.freezeAuthority)stop('Canonical RVIV mint state changed.');

  const ms=await squads.accounts.Multisig.fromAccountAddress(connection,multisig,'confirmed');
  if(Number(ms.threshold)!==1)stop('Squads threshold changed; OneDrop requires a fresh review.');
  const member=ms.members.find(x=>x.key.equals(owner));
  if(!member||![squads.types.Permission.Initiate,squads.types.Permission.Vote,squads.types.Permission.Execute].every(p=>squads.types.Permissions.has(member.permissions,p)))stop('JayJayTeamDev lacks current Squads Initiate + Vote + Execute permissions.');
  const [derivedVault]=squads.getVaultPda({multisigPda:multisig,index:0});
  if(!derivedVault.equals(vault))stop('Squads Vault #0 mismatch.');
  const derivedSource=getAssociatedTokenAddressSync(mint,vault,true,TOKEN_PROGRAM_ID);
  if(!derivedSource.equals(sourceAta))stop('Squads RVIV source ATA mismatch.');
  const source=await getAccount(connection,sourceAta,'confirmed',TOKEN_PROGRAM_ID);
  const movedRaw=BigInt(manifest.executableNow.totalMovedFromSquadsRaw);
  if(source.amount<movedRaw)stop('Squads vault no longer has enough RVIV for the executable OneDrop model.');

  const root=await merkleRoot(manifest.recipients);
  const [distributor]=PublicKey.findProgramAddressSync([new TextEncoder().encode('MerkleDistributor'),mint.toBytes(),u64(version)],JITO);
  if(await connection.getAccountInfo(distributor,'confirmed'))stop('This OneDrop distributor version already exists. Open the claim page and verify before doing anything else.');
  const tokenVault=getAssociatedTokenAddressSync(mint,distributor,true,TOKEN_PROGRAM_ID);
  if(await connection.getAccountInfo(tokenVault,'confirmed'))stop('Unexpected pre-existing OneDrop token vault.');

  const clawbackAta=getAssociatedTokenAddressSync(mint,owner,false,TOKEN_PROGRAM_ID);
  const impact=manifest.buckets.find(x=>x.name==='ONEWORLDZ_IMPACT');
  const impactOwner=new PublicKey(impact.destination);
  const impactAta=getAssociatedTokenAddressSync(mint,impactOwner,true,TOKEN_PROGRAM_ID);
  const [clawbackInfo,impactInfo]=await connection.getMultipleAccountsInfo([clawbackAta,impactAta],'confirmed');

  const now=Math.floor(Date.now()/1000),start=now+3600,end=now+7200,clawback=end+(manifest.distributor.clawbackDelayDays*86400);
  const distIx=await newDistributorIx({distributor,clawbackAta,mint,tokenVault,admin:owner,root,version,maxTotal:BigInt(manifest.distributor.maxTotalClaimRaw),maxNodes:BigInt(manifest.distributor.maxNumNodes),start,end,clawback});

  const claimTransfer=createTransferCheckedInstruction(sourceAta,mint,tokenVault,vault,BigInt(manifest.distributor.maxTotalClaimRaw),manifest.token.decimals,[],TOKEN_PROGRAM_ID);
  const impactTransfer=createTransferCheckedInstruction(sourceAta,mint,impactAta,vault,BigInt(impact.raw),manifest.token.decimals,[],TOKEN_PROGRAM_ID);
  const latest=await connection.getLatestBlockhash('confirmed');
  const inner=new TransactionMessage({payerKey:vault,recentBlockhash:latest.blockhash,instructions:[claimTransfer,impactTransfer]});
  const wrappedBytes=squads.utils.transactionMessageToMultisigTransactionMessageBytes({message:inner,vaultPda:vault});
  const [wrappedMessage]=squads.types.transactionMessageBeet.deserialize(Buffer.from(wrappedBytes));

  const transactionIndex=BigInt(ms.transactionIndex.toString())+1n;
  const [transactionPda]=squads.getTransactionPda({multisigPda:multisig,index:transactionIndex});
  const [proposalPda]=squads.getProposalPda({multisigPda:multisig,transactionIndex});
  if((await connection.getAccountInfo(transactionPda,'confirmed'))||(await connection.getAccountInfo(proposalPda,'confirmed')))stop('Next Squads transaction index is already occupied. Rebuild from live state.');

  const createIx=squads.instructions.vaultTransactionCreate({multisigPda:multisig,transactionIndex,creator:owner,rentPayer:owner,vaultIndex:0,ephemeralSigners:0,transactionMessage:inner,memo:'Worldz OneDrop REVIVE: Dev + Legacy claims and OneWorldz Impact'});
  const proposalIx=squads.instructions.proposalCreate({multisigPda:multisig,transactionIndex,creator:owner,rentPayer:owner,isDraft:false});
  const approveIx=squads.instructions.proposalApprove({multisigPda:multisig,transactionIndex,member:owner,memo:'Approve exact REVIVE OneDrop distribution'});
  const executeIx=squads.generated.createVaultTransactionExecuteInstruction({multisig,proposal:proposalPda,transaction:transactionPda,member:owner,anchorRemainingAccounts:metasForWrapped(wrappedMessage,vault)},squads.PROGRAM_ID);

  const outer=new Transaction({feePayer:owner,recentBlockhash:latest.blockhash});
  if(!clawbackInfo)outer.add(createAssociatedTokenAccountIdempotentInstruction(owner,clawbackAta,owner,mint,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID));
  if(!impactInfo)outer.add(createAssociatedTokenAccountIdempotentInstruction(owner,impactAta,impactOwner,mint,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID));
  outer.add(distIx,createIx,proposalIx,approveIx,executeIx);
  const raw=outer.serialize({requireAllSignatures:false,verifySignatures:false});
  if(raw.length>1232)stop('Exact ONE-transaction build is '+raw.length+' bytes, above Solana\'s 1232-byte packet limit. Nothing was signed or sent.');
  const sim=await rpc('simulateTransaction',[Buffer.from(raw).toString('base64'),{encoding:'base64',sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed',accounts:{encoding:'base64',addresses:[owner.toBase58()]}}]);
  if(sim?.value?.err)stop('Exact ONE-transaction simulation failed: '+JSON.stringify(sim.value.err));
  const after=sim?.value?.accounts?.[0]?.lamports;
  const debit=Number.isSafeInteger(after)?ownerLamports-after:null;
  if(debit!==null&&debit<0)stop('Simulation returned an invalid owner SOL delta.');
  if(debit!==null&&debit>ownerLamports)stop('Connected wallet does not have enough SOL for the simulated OneDrop transaction.');

  plan={outer,latest,root,distributor,tokenVault,impactAta,transactionIndex,transactionPda,proposalPda,ownerLamports,debit,rawLength:raw.length,sourceBefore:source.amount};
  $('#review').textContent=
    'NETWORK: Solana Mainnet\n'+
    'RVIV mint: '+mint.toBase58()+'\n'+
    'Squads source: '+vault.toBase58()+'\n'+
    'Merkle distributor: '+distributor.toBase58()+'\n'+
    'Merkle root: '+hex(root)+'\n'+
    'Unique claimants: '+manifest.recipients.length+'\n'+
    'OneDrop claims: '+(Number(BigInt(manifest.distributor.maxTotalClaimRaw))/1e6).toFixed(6)+' RVIV\n'+
    'OneWorldz direct: 20,000,000 RVIV → '+impactOwner.toBase58()+'\n'+
    'Expected Squads reserve after execution: 100,000,000.000052 RVIV\n'+
    'Squads transaction index: '+transactionIndex+'\n'+
    'Outer transaction bytes: '+raw.length+' / 1232\n'+
    'Owner SOL now: '+(ownerLamports/1e9).toFixed(9)+' SOL\n'+
    'Simulated owner SOL debit: '+(debit===null?'not returned by RPC':(debit/1e9).toFixed(9)+' SOL')+'\n'+
    'Simulation: PASS\n\n'+
    'Final wallet signature creates the claim distributor, creates any missing required ATAs, creates/approves/executes the exact Squads distribution, funds the 219-wallet claim vault, and routes the 20M OneWorldz allocation.';
  status('ONE-TRANSACTION PREFLIGHT PASS ✅\nReview every line, then sign only if your wallet shows the expected transaction.','good');
  $('#launch').disabled=false;
}
async function launch(){
  if(!plan||!wallet)stop('Run the live preflight first.');
  $('#launch').disabled=true;$('#prepare').disabled=true;
  const beforeMessage=plan.outer.compileMessage().serialize().toString('hex');
  status('Wallet approval requested. This is the ONE owner transaction described in the review.','warn');
  const signed=await wallet.signTransaction(plan.outer);
  if(!signed||signed.compileMessage().serialize().toString('hex')!==beforeMessage||!signed.verifySignatures())stop('Wallet signature/message mismatch. Nothing broadcast.');
  const sig=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:5});
  status('Broadcast: '+sig+'\nWaiting for mainnet confirmation…','warn');
  const conf=await connection.confirmTransaction({signature:sig,blockhash:plan.latest.blockhash,lastValidBlockHeight:plan.latest.lastValidBlockHeight},'confirmed');
  if(conf.value.err)stop('On-chain execution failed: '+JSON.stringify(conf.value.err)+'\nSignature: '+sig);
  const [distInfo,vaultBal,impactBal,source]=await Promise.all([
    connection.getAccountInfo(plan.distributor,'confirmed'),
    connection.getTokenAccountBalance(plan.tokenVault,'confirmed'),
    connection.getTokenAccountBalance(plan.impactAta,'confirmed'),
    getAccount(connection,new PublicKey(manifest.authority.squadsVaultRvivAta),'confirmed',TOKEN_PROGRAM_ID)
  ]);
  if(!distInfo)stop('Transaction confirmed but distributor account is not readable yet. DO NOT RETRY. Signature: '+sig);
  if(BigInt(vaultBal.value.amount)!==BigInt(manifest.distributor.maxTotalClaimRaw))stop('Transaction confirmed but claim-vault amount differs from the frozen manifest. DO NOT RETRY. Signature: '+sig);
  if(BigInt(impactBal.value.amount)<20000000000000n)stop('Transaction confirmed but OneWorldz destination is below 20M RVIV. DO NOT RETRY. Signature: '+sig);
  status('WORLDZ ONEDROP LIVE ✅\nSignature: '+sig+'\nClaim vault funded: '+vaultBal.value.uiAmountString+' RVIV\nOneWorldz destination: '+impactBal.value.uiAmountString+' RVIV\nSquads remaining: '+(Number(source.amount)/1e6).toFixed(6)+' RVIV\n\nRecipients can now use the Claim Page.','good');
  $('#review').textContent+='\n\nCONFIRMED SIGNATURE: '+sig;
}
$('#connect').addEventListener('click',async()=>{
  try{status('Connecting…','warn');wallet=await connectWallet();if(!manifest)await load();if(wallet.publicKey.toBase58()!==manifest.authority.owner)stop('Wrong wallet connected: '+wallet.publicKey.toBase58());$('#connect').textContent='Connected: '+wallet.publicKey.toBase58().slice(0,5)+'…'+wallet.publicKey.toBase58().slice(-5);$('#connect').disabled=true;$('#prepare').disabled=false;status('JayJayTeamDev connected. Build and simulate the exact OneDrop transaction.','good')}catch(e){wallet=null;status('CONNECT STOPPED\n'+(e?.message||e),'bad')}
});
$('#prepare').addEventListener('click',async()=>{try{$('#prepare').disabled=true;status('Recomputing Merkle root and live mainnet transaction…','warn');await prepare()}catch(e){plan=null;$('#launch').disabled=true;status('PREFLIGHT STOPPED\n'+(e?.message||e),'bad')}finally{$('#prepare').disabled=false}});
$('#launch').addEventListener('click',async()=>{try{await launch()}catch(e){plan=null;$('#launch').disabled=true;$('#prepare').disabled=false;status('LAUNCH STOPPED\n'+(e?.message||e)+'\n\nNothing else will be sent automatically. Re-run preflight before any retry.','bad')}});
load().catch(e=>status('MANIFEST STOPPED\n'+(e?.message||e),'bad'));
