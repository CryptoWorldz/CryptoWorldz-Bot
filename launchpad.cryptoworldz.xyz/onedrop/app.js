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
const RESUME='worldz:onedrop:rviv:3of5:v1';
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
    const inner=await sha([new PublicKey(r.wallet).toBytes(),u64(r.amountUnlockedRaw??r.amountRaw),u64(r.amountLockedRaw??0)]);
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
function exactTotal(rows){return rows.reduce((s,r)=>s+BigInt(r.amountUnlockedRaw??r.amountRaw)+BigInt(r.amountLockedRaw??0),0n)}
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
  const mod=await import('./wallet-mobile.js?v=20260926-vanilla-reown-c');
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
async function verifyExecuted({distributor,tokenVault,impactAta}){
  const [distInfo,vaultBal,impactBal,source]=await Promise.all([
    connection.getAccountInfo(distributor,'confirmed'),
    connection.getTokenAccountBalance(tokenVault,'confirmed'),
    connection.getTokenAccountBalance(impactAta,'confirmed'),
    getAccount(connection,new PublicKey(manifest.authority.squadsVaultRvivAta),'confirmed',TOKEN_PROGRAM_ID)
  ]);
  if(!distInfo)stop('Distributor account is not readable.');
  if(BigInt(vaultBal.value.amount)!==BigInt(manifest.distributor.maxTotalClaimRaw))stop('Claim-vault amount differs from the frozen manifest.');
  if(BigInt(impactBal.value.amount)<20000000000000n)stop('Worldz Impact destination is below 20M RVIV.');
  status('WORLDZ ONEDROP LIVE ✅\nClaim vault funded: '+vaultBal.value.uiAmountString+' RVIV\nWorldz Impact destination: '+impactBal.value.uiAmountString+' RVIV\nSquads remaining: '+(Number(source.amount)/1e6).toFixed(6)+' RVIV\n\nRecipients can now use the Claim Page.','good');
}

function storedIndex(){
  try{const x=JSON.parse(localStorage.getItem(RESUME)||'null');return x?.index?BigInt(x.index):null}catch{return null}
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
  if(mintInfo.decimals!==manifest.token.decimals)stop('Canonical RVIV decimals changed: '+mintInfo.decimals+' expected '+manifest.token.decimals);
  if(mintInfo.supply!==BigInt(manifest.token.totalSupplyRaw))stop('Canonical RVIV supply changed: '+mintInfo.supply+' expected '+manifest.token.totalSupplyRaw);
  if(mintInfo.mintAuthority!==null)stop('Canonical RVIV mint authority is not revoked: '+mintInfo.mintAuthority.toBase58());
  if(mintInfo.freezeAuthority!==null)stop('Canonical RVIV freeze authority is not revoked: '+mintInfo.freezeAuthority.toBase58());

  const ms=await squads.accounts.Multisig.fromAccountAddress(connection,multisig,'confirmed');
  if(Number(ms.threshold)!==3||ms.members.length!==5)stop('Squads governance is not the required 3-of-5. Nothing will be built.');
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
  const tokenVault=getAssociatedTokenAddressSync(mint,distributor,true,TOKEN_PROGRAM_ID);
  const clawbackAta=getAssociatedTokenAddressSync(mint,owner,false,TOKEN_PROGRAM_ID);
  const impact=manifest.buckets.find(x=>x.name==='WORLDZ_IMPACT')||manifest.buckets.find(x=>x.name==='ONEWORLDZ_IMPACT');
  if(!impact)stop('Worldz Impact bucket missing.');
  const impactOwner=new PublicKey(impact.destination);
  const impactAta=getAssociatedTokenAddressSync(mint,impactOwner,true,TOKEN_PROGRAM_ID);

  const claimTransfer=createTransferCheckedInstruction(sourceAta,mint,tokenVault,vault,BigInt(manifest.distributor.maxTotalClaimRaw),manifest.token.decimals,[],TOKEN_PROGRAM_ID);
  const impactTransfer=createTransferCheckedInstruction(sourceAta,mint,impactAta,vault,BigInt(impact.raw),manifest.token.decimals,[],TOKEN_PROGRAM_ID);
  const latest=await connection.getLatestBlockhash('confirmed');
  const inner=new TransactionMessage({payerKey:vault,recentBlockhash:latest.blockhash,instructions:[claimTransfer,impactTransfer]});
  const wrappedBytes=squads.utils.transactionMessageToMultisigTransactionMessageBytes({message:inner,vaultPda:vault});
  const [wrappedMessage]=squads.types.transactionMessageBeet.deserialize(Buffer.from(wrappedBytes));

  const resume=storedIndex();
  if(resume!==null){
    const transactionIndex=resume;
    const [transactionPda]=squads.getTransactionPda({multisigPda:multisig,index:transactionIndex});
    const [proposalPda]=squads.getProposalPda({multisigPda:multisig,transactionIndex});
    const [txInfo,proposalInfo]=await Promise.all([connection.getAccountInfo(transactionPda,'confirmed'),connection.getAccountInfo(proposalPda,'confirmed')]);
    if(!txInfo||!proposalInfo){localStorage.removeItem(RESUME);stop('Saved OneDrop proposal is missing on-chain. Resume state cleared; rebuild from live state.');}
    const proposal=await squads.accounts.Proposal.fromAccountAddress(connection,proposalPda,'confirmed');
    const kind=String(proposal.status?.__kind||'').toLowerCase();
    const approvals=(proposal.approved||[]).map(x=>x.toBase58());
    if(kind==='executed'){
      await verifyExecuted({distributor,tokenVault,impactAta});
      localStorage.removeItem(RESUME);
      $('#review').textContent='Squads proposal '+transactionIndex+' is already executed.\nApprovals recorded: '+approvals.length+'/3.';
      return;
    }
    if(kind!=='approved'&&kind!=='executing'){
      $('#review').textContent='NETWORK: Solana Mainnet\nRVIV mint: '+mint.toBase58()+'\nSquads proposal index: '+transactionIndex+'\nProposal: '+proposalPda.toBase58()+'\nStatus: '+kind.toUpperCase()+'\nApprovals recorded: '+approvals.length+'/3\n\nTwo additional authorized members must approve this exact proposal in Squads before execution. No RVIV has moved from the Squads vault.';
      status('WAITING FOR 3-OF-5 APPROVALS\nCurrent approvals: '+approvals.length+'/3.\nOpen the Team Zed Treasury in Squads and have two more authorized members approve the pending proposal. Then return here and tap Build / Refresh.','warn');
      return;
    }

    if(!(await connection.getAccountInfo(distributor,'confirmed')))stop('Proposal is approved but the expected OneDrop distributor is missing. Do not execute.');
    const metas=wrappedMessage.accountKeys.map((key,i)=>({pubkey:key,isWritable:squads.utils.isStaticWritableIndex(wrappedMessage,i),isSigner:squads.utils.isSignerIndex(wrappedMessage,i)&&!key.equals(vault)}));
    const executeIx=squads.generated.createVaultTransactionExecuteInstruction({multisig,proposal:proposalPda,transaction:transactionPda,member:owner,anchorRemainingAccounts:metas},squads.PROGRAM_ID);
    const outer=new Transaction({feePayer:owner,recentBlockhash:latest.blockhash}).add(executeIx);
    const raw=outer.serialize({requireAllSignatures:false,verifySignatures:false});
    if(raw.length>1232)stop('3-of-5 execution transaction is '+raw.length+' bytes, above Solana packet limit.');
    const sim=await rpc('simulateTransaction',[Buffer.from(raw).toString('base64'),{encoding:'base64',sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed',accounts:{encoding:'base64',addresses:[owner.toBase58()]}}]);
    if(sim?.value?.err)stop('Approved Squads execution simulation failed: '+JSON.stringify(sim.value.err));
    const after=sim?.value?.accounts?.[0]?.lamports;
    const debit=Number.isSafeInteger(after)?ownerLamports-after:null;
    if(debit!==null&&debit>ownerLamports)stop('Connected wallet does not have enough SOL for the simulated execution.');
    plan={mode:'EXECUTE',outer,latest,root,distributor,tokenVault,impactAta,transactionIndex,proposalPda,debit};
    $('#launch').textContent='4. Execute Approved 3-of-5 Proposal';
    $('#review').textContent='NETWORK: Solana Mainnet\nRVIV mint: '+mint.toBase58()+'\nSquads proposal index: '+transactionIndex+'\nApprovals recorded: '+approvals.length+'/3\nClaim vault: '+(Number(BigInt(manifest.distributor.maxTotalClaimRaw))/1e6).toFixed(6)+' RVIV\nLegacy unlocked: '+(Number(BigInt(manifest.distributor.amountUnlockedRaw))/1e6).toFixed(6)+' RVIV\nDev locked / 12-month vesting: '+(Number(BigInt(manifest.distributor.amountLockedRaw))/1e6).toFixed(6)+' RVIV\nWorldz Impact: 20,000,000 RVIV\nOwner SOL now: '+(ownerLamports/1e9).toFixed(9)+' SOL\nSimulated execution SOL debit: '+(debit===null?'not returned by RPC':(debit/1e9).toFixed(9)+' SOL')+'\nSimulation: PASS';
    status('3-OF-5 APPROVAL COMPLETE ✅\nThe exact Squads execution simulated successfully. Review it, then sign only if your wallet shows the expected execution.','good');
    $('#launch').disabled=false;
    return;
  }

  if(await connection.getAccountInfo(distributor,'confirmed'))stop('This OneDrop distributor already exists but no local proposal resume record is present. Verify the existing distributor and Squads proposal before doing anything else.');
  const [clawbackInfo,impactInfo]=await connection.getMultipleAccountsInfo([clawbackAta,impactAta],'confirmed');
  const now=Math.floor(Date.now()/1000);
  const start=now;
  const end=now+(Number(manifest.distributor.vesting?.devVestingDurationDays||365)*86400);
  const clawback=end+(manifest.distributor.clawbackDelayDays*86400);
  const distIx=await newDistributorIx({distributor,clawbackAta,mint,tokenVault,admin:owner,root,version,maxTotal:BigInt(manifest.distributor.maxTotalClaimRaw),maxNodes:BigInt(manifest.distributor.maxNumNodes),start,end,clawback});

  const transactionIndex=BigInt(ms.transactionIndex.toString())+1n;
  const [transactionPda]=squads.getTransactionPda({multisigPda:multisig,index:transactionIndex});
  const [proposalPda]=squads.getProposalPda({multisigPda:multisig,transactionIndex});
  if((await connection.getAccountInfo(transactionPda,'confirmed'))||(await connection.getAccountInfo(proposalPda,'confirmed')))stop('Next Squads transaction index is already occupied. Rebuild from live state.');

  const createIx=squads.instructions.vaultTransactionCreate({multisigPda:multisig,transactionIndex,creator:owner,rentPayer:owner,vaultIndex:0,ephemeralSigners:0,transactionMessage:inner,memo:'Worldz OneDrop REVIVE: 12-month Dev vesting + Legacy claims + Worldz Impact'});
  const proposalIx=squads.instructions.proposalCreate({multisigPda:multisig,transactionIndex,creator:owner,rentPayer:owner,isDraft:false});
  const approveIx=squads.instructions.proposalApprove({multisigPda:multisig,transactionIndex,member:owner,memo:'JayJayTeamDev approval 1/3 — exact REVIVE OneDrop distribution'});
  const outer=new Transaction({feePayer:owner,recentBlockhash:latest.blockhash});
  if(!clawbackInfo)outer.add(createAssociatedTokenAccountIdempotentInstruction(owner,clawbackAta,owner,mint,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID));
  if(!impactInfo)outer.add(createAssociatedTokenAccountIdempotentInstruction(owner,impactAta,impactOwner,mint,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID));
  outer.add(distIx,createIx,proposalIx,approveIx);
  const raw=outer.serialize({requireAllSignatures:false,verifySignatures:false});
  if(raw.length>1232)stop('3-of-5 setup transaction is '+raw.length+' bytes, above Solana packet limit. Nothing was signed or sent.');
  const sim=await rpc('simulateTransaction',[Buffer.from(raw).toString('base64'),{encoding:'base64',sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed',accounts:{encoding:'base64',addresses:[owner.toBase58()]}}]);
  if(sim?.value?.err)stop('3-of-5 setup simulation failed: '+JSON.stringify(sim.value.err));
  const after=sim?.value?.accounts?.[0]?.lamports;
  const debit=Number.isSafeInteger(after)?ownerLamports-after:null;
  if(debit!==null&&debit>ownerLamports)stop('Connected wallet does not have enough SOL for the simulated setup.');

  plan={mode:'CREATE',outer,latest,root,distributor,tokenVault,impactAta,transactionIndex,proposalPda,debit};
  $('#launch').textContent='3. Create Proposal + Approval 1/3';
  $('#review').textContent='NETWORK: Solana Mainnet\nRVIV mint: '+mint.toBase58()+'\nSquads source: '+vault.toBase58()+'\nRequired governance: 3-of-5\nSquads proposal index: '+transactionIndex+'\nMerkle distributor: '+distributor.toBase58()+'\nUnique claimants: '+manifest.recipients.length+'\nLegacy unlocked: '+(Number(BigInt(manifest.distributor.amountUnlockedRaw))/1e6).toFixed(6)+' RVIV\nDev locked / 12-month linear vesting: '+(Number(BigInt(manifest.distributor.amountLockedRaw))/1e6).toFixed(6)+' RVIV\nWorldz Impact after treasury execution: 20,000,000 RVIV\nOuter setup bytes: '+raw.length+' / 1232\nOwner SOL now: '+(ownerLamports/1e9).toFixed(9)+' SOL\nSimulated owner SOL debit: '+(debit===null?'not returned by RPC':(debit/1e9).toFixed(9)+' SOL')+'\nSimulation: PASS\n\nThis first signature creates the distributor and Squads proposal and records JayJayTeamDev approval 1/3. It DOES NOT execute the Squads RVIV transfers.';
  status('3-OF-5 SETUP PREFLIGHT PASS ✅\nONE-TRANSACTION PREFLIGHT PASS — SETUP STAGE ONLY; NO TREASURY EXECUTION\nReview every line. The first signature records only approval 1/3; two more Squads approvals are required before RVIV can move.','good');
  $('#launch').disabled=false;
}

async function launch(){
  if(!plan||!wallet)stop('Run the live preflight first.');
  $('#launch').disabled=true;$('#prepare').disabled=true;
  const beforeMessage=plan.outer.compileMessage().serialize().toString('hex');
  status(plan.mode==='CREATE'?'Wallet approval requested for setup + approval 1/3. No Squads RVIV transfer executes in this step.':'Wallet approval requested to execute the already-approved 3-of-5 Squads proposal.','warn');
  const signed=await wallet.signTransaction(plan.outer);
  if(!signed||signed.compileMessage().serialize().toString('hex')!==beforeMessage||!signed.verifySignatures())stop('Wallet signature/message mismatch. Nothing broadcast.');
  const sig=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:5});
  status('Broadcast: '+sig+'\nWaiting for mainnet confirmation…','warn');
  const conf=await connection.confirmTransaction({signature:sig,blockhash:plan.latest.blockhash,lastValidBlockHeight:plan.latest.lastValidBlockHeight},'confirmed');
  if(conf.value.err)stop('On-chain transaction failed: '+JSON.stringify(conf.value.err)+'\nSignature: '+sig);

  if(plan.mode==='CREATE'){
    const [distInfo,proposalInfo]=await Promise.all([connection.getAccountInfo(plan.distributor,'confirmed'),connection.getAccountInfo(plan.proposalPda,'confirmed')]);
    if(!distInfo||!proposalInfo)stop('Setup confirmed but distributor/proposal is not readable yet. DO NOT RETRY. Signature: '+sig);
    localStorage.setItem(RESUME,JSON.stringify({index:String(plan.transactionIndex)}));
    plan=null;
    status('REVIVE 3-OF-5 PROPOSAL CREATED ✅\nSignature: '+sig+'\nJayJayTeamDev approval: 1/3.\n\nNEXT: two more authorized Team Zed Treasury members approve the pending proposal in Squads. No RVIV has moved from the treasury yet. After approval reaches 3/5, return here and tap Build / Refresh.','good');
    $('#review').textContent+='\n\nSETUP CONFIRMED: '+sig+'\nWaiting for two additional Squads approvals.';
    $('#prepare').disabled=false;
    return;
  }

  await verifyExecuted(plan);
  localStorage.removeItem(RESUME);
  $('#review').textContent+='\n\nEXECUTION CONFIRMED: '+sig;
}

$('#connect').addEventListener('click',async()=>{
  try{status('Connecting…','warn');wallet=await connectWallet();if(!manifest)await load();if(wallet.publicKey.toBase58()!==manifest.authority.owner)stop('Wrong wallet connected: '+wallet.publicKey.toBase58());$('#connect').textContent='Connected: '+wallet.publicKey.toBase58().slice(0,5)+'…'+wallet.publicKey.toBase58().slice(-5);$('#connect').disabled=true;$('#prepare').disabled=false;status('JayJayTeamDev connected. Build or refresh the exact 3-of-5 OneDrop proposal.','good')}catch(e){wallet=null;status('CONNECT STOPPED\n'+(e?.message||e),'bad')}
});
$('#prepare').addEventListener('click',async()=>{try{$('#prepare').disabled=true;status('Recomputing Merkle root and live 3-of-5 Squads state…','warn');await prepare()}catch(e){plan=null;$('#launch').disabled=true;status('PREFLIGHT STOPPED\n'+(e?.message||e),'bad')}finally{$('#prepare').disabled=false}});
$('#launch').addEventListener('click',async()=>{try{await launch()}catch(e){plan=null;$('#launch').disabled=true;$('#prepare').disabled=false;status('LAUNCH STOPPED\n'+(e?.message||e)+'\n\nNothing else will be sent automatically. Re-run preflight before any retry.','bad')}});
load().catch(e=>status('MANIFEST STOPPED\n'+(e?.message||e),'bad'));
