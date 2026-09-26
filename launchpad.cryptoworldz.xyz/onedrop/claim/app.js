import {Connection,PublicKey,SystemProgram,Transaction,TransactionInstruction} from 'https://esm.sh/@solana/web3.js@1.98.4?bundle';
import {TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,getAssociatedTokenAddressSync,createAssociatedTokenAccountIdempotentInstruction} from 'https://esm.sh/@solana/spl-token@0.4.15?bundle&deps=@solana/web3.js@1.98.4';
import {getWallets} from 'https://esm.sh/@wallet-standard/app@1.1.0?bundle';
import {Buffer} from 'https://esm.sh/buffer@6.0.3?bundle';
globalThis.Buffer??=Buffer;

const RPC='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const MAINNET='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const JITO=new PublicKey('mERKcfxMC5SqJn4Ld4BUris3WKZZ1ojjWJ3A3J5CKxv');
const $=s=>document.querySelector(s),connection=new Connection(RPC,'confirmed');
let manifest=null,wallet=null,plan=null;
function status(m,t=''){const e=$('#status');e.textContent=m;e.className='status'+(t?' '+t:'')}
function stop(m){throw new Error(m)}
function u64(v){const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(v));return b}
function concat(ps){const n=ps.reduce((s,x)=>s+x.length,0),o=new Uint8Array(n);let p=0;for(const x of ps){o.set(x,p);p+=x.length}return o}
async function sha(ps){return new Uint8Array(await crypto.subtle.digest('SHA-256',concat(ps)))}
function cmp(a,b){for(let i=0;i<a.length;i++){if(a[i]!==b[i])return a[i]-b[i]}return 0}
function eq(a,b){return a.length===b.length&&a.every((v,i)=>v===b[i])}
function hex(a){return [...a].map(x=>x.toString(16).padStart(2,'0')).join('')}
function amount(raw,d=6){const x=BigInt(raw),base=10n**BigInt(d),w=x/base,f=(x%base).toString().padStart(d,'0').replace(/0+$/,'');return f?w+'.'+f:w.toString()}
async function leaf(row){const inner=await sha([new PublicKey(row.wallet).toBytes(),u64(row.amountRaw),u64(0)]);return sha([new Uint8Array([0]),inner])}
async function treeAndProof(rows,index){
  let level=await Promise.all(rows.map(leaf)),idx=index,proof=[];
  const original=level[idx];
  while(level.length>1){
    const sib=idx%2?idx-1:(idx+1<level.length?idx+1:idx);proof.push(level[sib]);
    const next=[];
    for(let i=0;i<level.length;i+=2){const a=level[i],b=level[i+1]||level[i],p=cmp(a,b)<=0?[a,b]:[b,a];next.push(await sha([new Uint8Array([1]),p[0],p[1]]))}
    idx=Math.floor(idx/2);level=next;
  }
  let check=original;
  for(const sib of proof){const p=cmp(check,sib)<=0?[check,sib]:[sib,check];check=await sha([new Uint8Array([1]),p[0],p[1]])}
  if(!eq(check,level[0]))stop('Local Merkle proof verification failed.');
  return {root:level[0],proof};
}
async function discriminator(name){return (await sha([new TextEncoder().encode('global:'+name)])).slice(0,8)}
function candidates(){try{return getWallets().get().filter(w=>w?.features?.['standard:connect']&&w?.features?.['solana:signTransaction']&&w?.chains?.includes('solana:mainnet')).sort((a,b)=>Number(!/jupiter/i.test(a.name||''))-Number(!/jupiter/i.test(b.name||'')))}catch{return[]}}
function injected(){const ok=p=>p&&typeof p.connect==='function'&&typeof p.signTransaction==='function';return [window?.jupiter?.solana,window?.solana?.isJupiter?window.solana:null,window?.phantom?.solana,window?.solflare,window?.solana].find(ok)||null}
async function connectWallet(){
  let list=[],p=null;for(let i=0;i<20;i++){list=candidates();p=injected();if(list.length||p)break;await new Promise(r=>setTimeout(r,150))}
  if(list.length){const w=list[0],o=await w.features['standard:connect'].connect(),a=(o?.accounts||w.accounts||[]).find(x=>x.chains?.includes('solana:mainnet'));if(!a)stop('Wallet returned no Solana mainnet account.');return{publicKey:new PublicKey(a.address),async signTransaction(tx){const bytes=tx.serialize({requireAllSignatures:false,verifySignatures:false});const s=await w.features['solana:signTransaction'].signTransaction({transaction:new Uint8Array(bytes),account:a,chain:'solana:mainnet'});if(!s?.[0]?.signedTransaction)stop('Wallet returned no signed transaction.');return Transaction.from(new Uint8Array(s[0].signedTransaction))}}}
  if(p){const o=await p.connect(),pk=(o&&o.publicKey)||p.publicKey;if(!pk)stop('Wallet returned no public key.');return{publicKey:new PublicKey(pk.toString()),signTransaction:tx=>p.signTransaction(tx)}}
  const mod=await import('../wallet-mobile.js?v=20260926-vanilla-reown-c');mod.resetJupiterMobileConnectionState?.();const a=await mod.getJupiterMobileAdapter();await a.connect();if(!a.publicKey)stop('Mobile wallet returned no public key.');return{publicKey:new PublicKey(a.publicKey.toString()),signTransaction:tx=>a.signTransaction(tx)}
}
async function rpc(method,params){const r=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});const j=await r.json();if(!r.ok||j.error)stop('RPC failed: '+JSON.stringify(j.error||r.status));return j.result}
async function load(){
  const r=await fetch('../revive-manifest.v1.json?v=20260926-a',{cache:'no-store'});if(!r.ok)stop('Frozen manifest unavailable.');manifest=await r.json();
  if(manifest.recipients.length!==219)stop('Manifest recipient count mismatch.');
  const mint=new PublicKey(manifest.token.mint),version=BigInt(manifest.distributor.versionU64);
  const [distributor]=PublicKey.findProgramAddressSync([new TextEncoder().encode('MerkleDistributor'),mint.toBytes(),u64(version)],JITO);
  const vault=getAssociatedTokenAddressSync(mint,distributor,true,TOKEN_PROGRAM_ID);
  $('#vault').textContent=distributor.toBase58();
  return {mint,version,distributor,vault};
}
async function prepare(){
  plan=null;$('#claim').disabled=true;if(!wallet||!manifest)stop('Connect a wallet first.');
  if(await connection.getGenesisHash()!==MAINNET)stop('Wrong Solana network.');
  const index=manifest.recipients.findIndex(x=>x.wallet===wallet.publicKey.toBase58());
  if(index<0){$('#review').textContent='Wallet: '+wallet.publicKey.toBase58()+'\nAllocation: none in this frozen OneDrop manifest.';status('This wallet is not an eligible REVIVE OneDrop claimant.','bad');return}
  const row=manifest.recipients[index],{mint,version,distributor,vault}=await load();
  const {root,proof}=await treeAndProof(manifest.recipients,index);
  const info=await connection.getAccountInfo(distributor,'confirmed');
  if(!info)stop('REVIVE OneDrop has not been activated on-chain yet.');
  if(!info.owner.equals(JITO))stop('Distributor owner mismatch.');
  const bytes=new Uint8Array(info.data);
  if(bytes.length<234)stop('Distributor account data is too short.');
  const chainRoot=bytes.slice(17,49);
  if(!eq(root,chainRoot))stop('Frozen manifest root does not match the live distributor. Claim refused.');
  const claimant=wallet.publicKey;
  const [claimStatus]=PublicKey.findProgramAddressSync([new TextEncoder().encode('ClaimStatus'),claimant.toBytes(),distributor.toBytes()],JITO);
  if(await connection.getAccountInfo(claimStatus,'confirmed')){status('This wallet already has a REVIVE OneDrop claim record. No duplicate claim will be sent.','good');$('#review').textContent='Wallet: '+claimant.toBase58()+'\nClaim status: '+claimStatus.toBase58()+'\nAllocation: '+amount(row.amountRaw)+' RVIV\nStatus: CLAIM RECORD EXISTS';return}
  const to=getAssociatedTokenAddressSync(mint,claimant,false,TOKEN_PROGRAM_ID);
  const toInfo=await connection.getAccountInfo(to,'confirmed');
  const before=toInfo?(await connection.getTokenAccountBalance(to,'confirmed')).value.amount:'0';
  const disc=await discriminator('new_claim'),len=Buffer.alloc(4);len.writeUInt32LE(proof.length);
  const data=Buffer.concat([Buffer.from(disc),u64(row.amountRaw),u64(0),len,...proof.map(Buffer.from)]);
  const claimIx=new TransactionInstruction({programId:JITO,data,keys:[
    {pubkey:distributor,isSigner:false,isWritable:true},
    {pubkey:claimStatus,isSigner:false,isWritable:true},
    {pubkey:vault,isSigner:false,isWritable:true},
    {pubkey:to,isSigner:false,isWritable:true},
    {pubkey:claimant,isSigner:true,isWritable:true},
    {pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false},
    {pubkey:SystemProgram.programId,isSigner:false,isWritable:false}
  ]});
  const latest=await connection.getLatestBlockhash('confirmed');
  const tx=new Transaction({feePayer:claimant,recentBlockhash:latest.blockhash});
  if(!toInfo)tx.add(createAssociatedTokenAccountIdempotentInstruction(claimant,to,claimant,mint,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID));
  tx.add(claimIx);
  const raw=tx.serialize({requireAllSignatures:false,verifySignatures:false});
  if(raw.length>1232)stop('Claim transaction exceeds Solana packet limit.');
  const balance=await connection.getBalance(claimant,'confirmed');
  const sim=await rpc('simulateTransaction',[Buffer.from(raw).toString('base64'),{encoding:'base64',sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed',accounts:{encoding:'base64',addresses:[claimant.toBase58()]}}]);
  if(sim?.value?.err)stop('Claim simulation failed: '+JSON.stringify(sim.value.err));
  const after=sim?.value?.accounts?.[0]?.lamports,debit=Number.isSafeInteger(after)?balance-after:null;
  if(debit!==null&&debit>balance)stop('Wallet has insufficient SOL for the simulated claim.');
  plan={tx,latest,to,before,claimStatus,row,root,proof,debit};
  $('#review').textContent='Wallet: '+claimant.toBase58()+'\nAllocation: '+amount(row.amountRaw)+' RVIV\nBuckets: '+row.buckets.join(' + ')+'\nMerkle root: '+hex(root)+'\nProof nodes: '+proof.length+'\nClaim transaction bytes: '+raw.length+' / 1232\nEstimated SOL debit: '+(debit===null?'RPC did not return':(debit/1e9).toFixed(9)+' SOL')+'\nSimulation: PASS';
  status('Eligible allocation verified ✅ Review the amount, then claim.','good');$('#claim').disabled=false;
}
async function claim(){
  if(!plan||!wallet)stop('Verify the claim first.');$('#claim').disabled=true;$('#prepare').disabled=true;
  const msg=plan.tx.compileMessage().serialize().toString('hex');status('Approve the exact REVIVE claim in your wallet.','');
  const signed=await wallet.signTransaction(plan.tx);if(!signed||signed.compileMessage().serialize().toString('hex')!==msg||!signed.verifySignatures())stop('Wallet signature/message mismatch. Nothing broadcast.');
  const sig=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:5});status('Claim broadcast: '+sig+'\nWaiting for confirmation…','');
  const conf=await connection.confirmTransaction({signature:sig,blockhash:plan.latest.blockhash,lastValidBlockHeight:plan.latest.lastValidBlockHeight},'confirmed');
  if(conf.value.err)stop('Claim failed on-chain: '+JSON.stringify(conf.value.err)+'\nSignature: '+sig);
  const after=(await connection.getTokenAccountBalance(plan.to,'confirmed')).value.amount,delta=BigInt(after)-BigInt(plan.before);
  if(delta!==BigInt(plan.row.amountRaw))stop('Claim confirmed but received amount differs from frozen allocation. DO NOT RETRY. Signature: '+sig);
  status('REVIVE CLAIM CONFIRMED ✅\nReceived: '+amount(delta.toString())+' RVIV\nSignature: '+sig,'good');$('#review').textContent+='\n\nCONFIRMED: '+sig;
}
$('#connect').addEventListener('click',async()=>{try{status('Connecting…');wallet=await connectWallet();await load();$('#connect').textContent='Connected: '+wallet.publicKey.toBase58().slice(0,5)+'…'+wallet.publicKey.toBase58().slice(-5);$('#connect').disabled=true;$('#prepare').disabled=false;status('Wallet connected. Verify your REVIVE allocation.','good')}catch(e){wallet=null;status('CONNECT STOPPED\n'+(e?.message||e),'bad')}});
$('#prepare').addEventListener('click',async()=>{try{$('#prepare').disabled=true;status('Verifying frozen allocation + live distributor…');await prepare()}catch(e){plan=null;status('VERIFY STOPPED\n'+(e?.message||e),'bad')}finally{$('#prepare').disabled=false}});
$('#claim').addEventListener('click',async()=>{try{await claim()}catch(e){plan=null;$('#prepare').disabled=false;status('CLAIM STOPPED\n'+(e?.message||e)+'\n\nNo automatic retry. Verify again first.','bad')}});
load().catch(e=>status('LOAD STOPPED\n'+(e?.message||e),'bad'));
