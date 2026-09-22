import {Connection,PublicKey,TransactionMessage,VersionedTransaction} from 'https://esm.sh/@solana/web3.js@1.98.4?bundle';
import {NATIVE_MINT,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,getMint,getAssociatedTokenAddress,getAccount,createAssociatedTokenAccountIdempotentInstruction,createTransferCheckedInstruction} from 'https://esm.sh/@solana/spl-token@0.4.15?bundle';
import {getWallets} from 'https://esm.sh/@wallet-standard/app@1.1.0?bundle';
import {ActivationType,BaseFeeMode,CollectFeeMode,CpAmm,derivePositionNftAccount,getBaseFeeParams,getLiquidityDeltaFromAmountA,getSqrtPriceFromPrice,MAX_SQRT_PRICE} from 'https://esm.sh/@meteora-ag/cp-amm-sdk@1.4.7?bundle';
import * as multisig from 'https://esm.sh/@sqds/multisig@2.1.4?bundle';
import BN from 'https://esm.sh/bn.js@5.2.2?bundle';

const $=s=>document.querySelector(s);
const RPC='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const connection=new Connection(RPC,'confirmed');
const OWNER='Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u';
const MINT='AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U';
const MS='B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN';
const VAULT='n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB';
let wallet=null,account=null,ctx=null,busy=false;

const status=(id,text,type='')=>{const e=$(id);e.textContent=text;e.className='status '+type;};
const short=x=>String(x).slice(0,6)+'…'+String(x).slice(-6);
const ownerPk=()=>new PublicKey(OWNER);
const msPk=()=>new PublicKey(MS);
const vaultPk=()=>new PublicKey(VAULT);
function candidates(){try{return getWallets().get().filter(w=>w?.features?.['standard:connect']&&w?.features?.['solana:signTransaction']&&w?.chains?.some(c=>String(c).startsWith('solana:')));}catch{return[]}}
function injected(){return[window.jupiter?.solana,window.phantom?.solana,window.solflare,window.solana].filter(Boolean).find(p=>typeof p.connect==='function'&&typeof p.signTransaction==='function')||null}

async function connectWallet(){
 try{
  status('#connect-status','Opening wallet…','warn');
  const list=candidates(),std=list.find(w=>/jupiter/i.test(w.name))||list[0];
  if(std){
   const out=await std.features['standard:connect'].connect();
   const a=(out?.accounts||std.accounts||[])[0]; if(!a)throw new Error('Wallet returned no account.');
   wallet={kind:'standard',name:std.name,wallet:std,account:a,publicKey:new PublicKey(a.address)};
  }else{
   const p=injected();
   if(p){const out=await p.connect(),pk=(out&&out.publicKey)||p.publicKey;if(!pk)throw new Error('Wallet returned no public key.');wallet={kind:'injected',name:'Solana Wallet',provider:p,publicKey:new PublicKey(pk.toString())};}
   else{const mod=await import('/mint/jupiter-mobile.js?v=20260921-reown-v1');const a=await mod.getJupiterMobileAdapter();await a.connect();if(!a.publicKey)throw new Error('Jupiter Mobile returned no public key.');wallet={kind:'jupiter-mobile',name:'Jupiter Mobile',provider:a,publicKey:new PublicKey(a.publicKey.toString())};}
  }
  if(wallet.publicKey.toBase58()!==OWNER)throw new Error('Wrong wallet. Connect JayJayTeamDev owner wallet.');
  account=wallet.publicKey;$('#wallet-label').textContent=wallet.name+' • '+short(OWNER);
  status('#connect-status','OWNER WALLET CONNECTED ✅\n'+OWNER,'ok');$('#verify').disabled=false;
 }catch(e){wallet=null;account=null;ctx=null;$('#verify').disabled=true;$('#action').disabled=true;status('#connect-status','CONNECTION FAILED\n'+(e?.message||String(e)),'bad');}
}
async function signTx(tx){
 if(wallet.kind==='standard'){
  const out=await wallet.wallet.features['solana:signTransaction'].signTransaction({account:wallet.account,transaction:new Uint8Array(tx.serialize())});
  const bytes=out?.[0]?.signedTransaction;if(!bytes)throw new Error('Wallet returned no signed transaction.');
  return VersionedTransaction.deserialize(bytes);
 }
 return wallet.provider.signTransaction(tx);
}
async function send(ixs,label,lookupTableAccounts=[]){
 for(let attempt=1;attempt<=3;attempt++){
  const latest=await connection.getLatestBlockhash('confirmed');
  const tx=new VersionedTransaction(new TransactionMessage({payerKey:account,recentBlockhash:latest.blockhash,instructions:ixs}).compileToV0Message(lookupTableAccounts));
  status('#action-status',label+'\n\nApprove in your wallet. Attempt '+attempt+'/3.','warn');
  const signed=await signTx(tx);
  const h=await connection.getBlockHeight('confirmed');
  if(h>=latest.lastValidBlockHeight-20)continue;
  const sim=await connection.simulateTransaction(signed,{sigVerify:true,commitment:'confirmed'});
  if(sim.value.err)throw new Error(label+' simulation failed: '+JSON.stringify(sim.value.err));
  const sig=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:5,preflightCommitment:'confirmed'});
  for(let i=0;i<40;i++){
   const st=(await connection.getSignatureStatuses([sig],{searchTransactionHistory:true}))?.value?.[0];
   if(st?.err)throw new Error(label+' on-chain error: '+JSON.stringify(st.err));
   if(st&&(st.confirmationStatus==='confirmed'||st.confirmationStatus==='finalized'))return sig;
   await new Promise(r=>setTimeout(r,1100));
  }
 }
 throw new Error(label+' could not confirm after fresh-blockhash retries.');
}
async function readProposal(index){
 const [pda]=multisig.getProposalPda({multisigPda:msPk(),transactionIndex:index});
 try{return{pda,account:await multisig.accounts.Proposal.fromAccountAddress(connection,pda,'confirmed')}}catch{return{pda,account:null}}
}
async function findCutover(ma){
 const remembered=localStorage.getItem('wldz-owner-cutover-index');
 const list=[];
 if(remembered&&/^\d+$/.test(remembered))list.push(BigInt(remembered));
 const current=multisig.utils.toBigInt(ma.transactionIndex);
 if(current>0n&&!list.some(x=>x===current))list.push(current);
 for(const idx of list){
  const [txPda]=multisig.getTransactionPda({multisigPda:msPk(),index:idx});
  try{
   const tx=await multisig.accounts.ConfigTransaction.fromAccountAddress(connection,txPda,'confirmed');
   const hasOne=(tx.actions||[]).some(a=>a.__kind==='ChangeThreshold'&&Number(a.newThreshold)===1);
   const removes=(tx.actions||[]).filter(a=>a.__kind==='RemoveMember').length;
   if(hasOne&&removes===2){const p=await readProposal(idx);return{index:idx,txPda,proposalPda:p.pda,tx,proposal:p.account};}
  }catch{}
 }
 return null;
}
async function prepareOwnerLaunch(ma,mint,vault,source,vaultSol){
 const current=multisig.utils.toBigInt(ma.transactionIndex);
 let next=current+1n,batch=null,proposal=null;
 const remembered=localStorage.getItem('worldz-owner-v6-batch');
 const tryIdx=[];
 if(remembered&&/^\d+$/.test(remembered))tryIdx.push(BigInt(remembered));
 if(current>0n&&!tryIdx.some(x=>x===current))tryIdx.push(current);
 for(const idx of tryIdx){
  const [bp]=multisig.getTransactionPda({multisigPda:msPk(),index:idx});
  const [pp]=multisig.getProposalPda({multisigPda:msPk(),transactionIndex:idx});
  try{
   const b=await multisig.accounts.Batch.fromAccountAddress(connection,bp,'confirmed');
   const p=await multisig.accounts.Proposal.fromAccountAddress(connection,pp,'confirmed');
   if(b.creator.equals(account)&&b.vaultIndex===0&&b.size<=3&&b.executedTransactionIndex<3){next=idx;batch=b;proposal=p;break;}
  }catch{}
 }
 localStorage.setItem('worldz-owner-v6-batch',next.toString());
 const [batchPda]=multisig.getTransactionPda({multisigPda:msPk(),index:next});
 const [proposalPda]=multisig.getProposalPda({multisigPda:msPk(),transactionIndex:next});
 const [posNft]=multisig.getEphemeralSignerPda({transactionPda:batchPda,ephemeralSignerIndex:0});
 const bh=(await connection.getLatestBlockhash('confirmed')).blockhash;
 const sourceAta=await getAssociatedTokenAddress(mint,vault,true,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
 const devAta=await getAssociatedTokenAddress(mint,account,false,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
 const devMsg=new TransactionMessage({payerKey:vault,recentBlockhash:bh,instructions:[
  createAssociatedTokenAccountIdempotentInstruction(vault,devAta,account,mint,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID),
  createTransferCheckedInstruction(sourceAta,mint,devAta,vault,8000000n*1000000n,6,[],TOKEN_PROGRAM_ID)
 ]});
 const cp=new CpAmm(connection);
 const init=getSqrtPriceFromPrice('0.000001',6,9);
 const amount=new BN((15000000n*1000000n).toString());
 const liq=getLiquidityDeltaFromAmountA(amount,init,MAX_SQRT_PRICE,CollectFeeMode.OnlyB);
 const baseFee=getBaseFeeParams({baseFeeMode:BaseFeeMode.FeeTimeSchedulerLinear,feeTimeSchedulerParam:{startingFeeBps:200,endingFeeBps:200,numberOfPeriod:0,totalDuration:0}});
 const {tx:createPoolTx,pool,position}=await cp.createCustomPool({
  payer:vault,creator:vault,positionNft:posNft,tokenAMint:mint,tokenBMint:NATIVE_MINT,
  tokenAAmount:amount,tokenBAmount:new BN(0),sqrtMinPrice:init,sqrtMaxPrice:MAX_SQRT_PRICE,liquidityDelta:liq,initSqrtPrice:init,
  poolFees:{baseFee,compoundingFeeBps:0,padding:0,dynamicFee:null},hasAlphaVault:false,activationType:ActivationType.Timestamp,
  collectFeeMode:CollectFeeMode.OnlyB,activationPoint:null,tokenAProgram:TOKEN_PROGRAM_ID,tokenBProgram:TOKEN_PROGRAM_ID,isLockLiquidity:false
 });
 if(await connection.getAccountInfo(pool,'confirmed'))throw new Error('WORLDZ Meteora pool already exists. Inspect before creating another.');
 const poolMsg=new TransactionMessage({payerKey:vault,recentBlockhash:bh,instructions:createPoolTx.instructions});
 const lockTx=await cp.permanentLockPosition({owner:vault,position,positionNftAccount:derivePositionNftAccount(posNft),pool,unlockedLiquidity:liq});
 const lockMsg=new TransactionMessage({payerKey:vault,recentBlockhash:bh,instructions:lockTx.instructions});
 return{mode:'launch',ma,mint,vault,source,vaultSol,next,batch,proposal,batchPda,proposalPda,posNft,devMsg,poolMsg,lockMsg,pool,position,liq};
}
async function verify(){
 try{
  $('#verify').disabled=true;$('#action').disabled=true;ctx=null;
  status('#verify-status','Reading canonical WORLDZ + treasury state from Solana mainnet…','warn');
  const mint=new PublicKey(MINT),vault=vaultPk();
  const [mi,ma,vaultSol]=await Promise.all([getMint(connection,mint,'confirmed',TOKEN_PROGRAM_ID),multisig.accounts.Multisig.fromAccountAddress(connection,msPk(),'confirmed'),connection.getBalance(vault,'confirmed')]);
  if(mi.decimals!==6||mi.supply!==100000000000000n||mi.mintAuthority!==null||mi.freezeAuthority!==null)throw new Error('Canonical WORLDZ invariant failed.');
  const member=ma.members.find(m=>m.key.equals(account));if(!member)throw new Error('Owner wallet is not a current Squads member.');
  const sourceAta=await getAssociatedTokenAddress(mint,vault,true,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
  const source=await getAccount(connection,sourceAta,'confirmed',TOKEN_PROGRAM_ID);
  if(Number(ma.threshold)===1&&ma.members.length===1&&ma.members[0].key.equals(account)){
   if(source.amount<23000000n*1000000n)throw new Error('Treasury has less than the 23M WLDZ needed for creator + launch.');
   ctx=await prepareOwnerLaunch(ma,mint,vault,source,vaultSol);
   $('#action').textContent='LAUNCH WORLDZ — OWNER ONLY';
   $('#action').disabled=false;
   status('#verify-status','OWNER MODE READY ✅\nTreasury: 1-of-1 JayJayTeamDev\nVault WLDZ: '+Number(source.amount/1000000n).toLocaleString()+'\nLaunch: 15,000,000 WLDZ / 0 SOL\nCreator allocation: 8,000,000 WLDZ\nExpected pool: '+ctx.pool.toBase58(),'ok');
   return;
  }
  if(Number(ma.threshold)!==2||ma.members.length!==3)throw new Error('Unexpected treasury governance state: '+Number(ma.threshold)+'-of-'+ma.members.length+'.');
  const existing=await findCutover(ma);
  ctx={mode:'cutover',ma,existing};
  if(!existing){
   $('#action').textContent='CREATE OWNER-ONLY 1-OF-1 CUTOVER';
   $('#action').disabled=false;
   status('#verify-status','CURRENT CHAIN STATE\n100M WLDZ remains in the existing autonomous 2-of-3 vault.\nOwner cutover target: JayJayTeamDev becomes the sole 1-of-1 member.\nNo WLDZ has moved.','warn');
  }else{
   const p=existing.proposal?.pretty?.();
   const ownerApproved=existing.proposal?.approved?.some(k=>k.equals(account));
   if(p?.status==='Approved'){
    $('#action').textContent='EXECUTE OWNER-ONLY CUTOVER';
    $('#action').disabled=false;
    status('#verify-status','OWNER CUTOVER APPROVED ✅\nPress EXECUTE OWNER-ONLY CUTOVER. After confirmation, treasury becomes JayJayTeamDev 1-of-1.','ok');
   }else if(p?.status==='Draft'||(p?.status==='Active'&&!ownerApproved)){
    $('#action').textContent='CONTINUE OWNER CUTOVER';
    $('#action').disabled=false;
    status('#verify-status','Owner cutover proposal exists at '+existing.proposalPda.toBase58()+'.\nContinue to activate/record your owner approval.','warn');
   }else{
    $('#action').textContent='REFRESH CUTOVER STATUS';
    $('#action').disabled=false;
    status('#verify-status','OWNER CUTOVER CREATED ✅\nJayJayTeamDev approval is recorded.\nThe current autonomous vault must reach its existing on-chain approval threshold once before it can be converted to permanent owner-only 1-of-1.\nProposal: '+existing.proposalPda.toBase58(),'warn');
   }
  }
 }catch(e){ctx=null;$('#action').disabled=true;status('#verify-status','VERIFICATION STOPPED\n'+(e?.message||String(e)),'bad');}
 finally{$('#verify').disabled=false;}
}
async function runCutover(){
 const {ma,existing}=ctx;
 if(existing){
  const p=existing.proposal?.pretty?.();
  const ownerApproved=existing.proposal?.approved?.some(k=>k.equals(account));
  if(p?.status==='Approved'){
   const ix=multisig.instructions.configTransactionExecute({multisigPda:msPk(),transactionIndex:existing.index,member:account,rentPayer:account});
   await send([ix],'Execute permanent JayJayTeamDev 1-of-1 cutover');
   localStorage.removeItem('wldz-owner-cutover-index');
   await verify();return;
  }
  if(p?.status==='Draft'){
   const activate=multisig.instructions.proposalActivate({multisigPda:msPk(),transactionIndex:existing.index,member:account});
   const approve=multisig.instructions.proposalApprove({multisigPda:msPk(),transactionIndex:existing.index,member:account});
   await send([activate,approve],'Activate + approve owner cutover');
   await verify();return;
  }
  if(p?.status==='Active'&&!ownerApproved){
   const approve=multisig.instructions.proposalApprove({multisigPda:msPk(),transactionIndex:existing.index,member:account});
   await send([approve],'Record JayJayTeamDev cutover approval');
   await verify();return;
  }
  await verify();return;
 }
 const others=ma.members.filter(m=>!m.key.equals(account)).map(m=>m.key);
 if(others.length!==2)throw new Error('Expected two non-owner members before cutover.');
 const index=multisig.utils.toBigInt(ma.transactionIndex)+1n;
 const actions=[{__kind:'ChangeThreshold',newThreshold:1},...others.map(oldMember=>({__kind:'RemoveMember',oldMember}))];
 const create=multisig.instructions.configTransactionCreate({multisigPda:msPk(),transactionIndex:index,creator:account,rentPayer:account,actions,memo:'WORLDZ owner cutover: JayJayTeamDev sole 1-of-1'});
 const proposal=multisig.instructions.proposalCreate({multisigPda:msPk(),transactionIndex:index,creator:account,rentPayer:account,isDraft:true});
 const activate=multisig.instructions.proposalActivate({multisigPda:msPk(),transactionIndex:index,member:account});
 const approve=multisig.instructions.proposalApprove({multisigPda:msPk(),transactionIndex:index,member:account});
 await send([create,proposal,activate,approve],'Create owner-only 1-of-1 cutover + record JayJayTeamDev approval');
 localStorage.setItem('wldz-owner-cutover-index',index.toString());
 await verify();
}
async function runLaunch(){
 let c=ctx;
 const read=async()=>{
  let batch=null,proposal=null;
  try{batch=await multisig.accounts.Batch.fromAccountAddress(connection,c.batchPda,'confirmed')}catch{}
  try{proposal=await multisig.accounts.Proposal.fromAccountAddress(connection,c.proposalPda,'confirmed')}catch{}
  return{batch,proposal};
 };
 let st=await read();
 if(!st.batch&&!st.proposal){
  const b=multisig.instructions.batchCreate({multisigPda:msPk(),creator:account,rentPayer:account,batchIndex:c.next,vaultIndex:0,memo:'WORLDZ owner-only: 8M creator + 15M Meteora + permanent lock'});
  const p=multisig.instructions.proposalCreate({multisigPda:msPk(),transactionIndex:c.next,creator:account,rentPayer:account,isDraft:true});
  const d=multisig.instructions.batchAddTransaction({vaultIndex:0,multisigPda:msPk(),member:account,rentPayer:account,batchIndex:c.next,transactionIndex:1,ephemeralSigners:0,transactionMessage:c.devMsg});
  await send([b,p,d],'1/7 Create owner launch batch + 8M creator leg');st=await read();
 }
 if(!st.batch||!st.proposal)throw new Error('Owner launch batch was not readable after creation.');
 if(st.batch.size===0){const d=multisig.instructions.batchAddTransaction({vaultIndex:0,multisigPda:msPk(),member:account,rentPayer:account,batchIndex:c.next,transactionIndex:1,ephemeralSigners:0,transactionMessage:c.devMsg});await send([d],'1/7 Store 8M creator leg');st=await read();}
 if(st.batch.size===1){const p=multisig.instructions.batchAddTransaction({vaultIndex:0,multisigPda:msPk(),member:account,rentPayer:account,batchIndex:c.next,transactionIndex:2,ephemeralSigners:1,transactionMessage:c.poolMsg});await send([p],'2/7 Store 15M Meteora launch leg');st=await read();}
 if(st.batch.size===2){const l=multisig.instructions.batchAddTransaction({vaultIndex:0,multisigPda:msPk(),member:account,rentPayer:account,batchIndex:c.next,transactionIndex:3,ephemeralSigners:0,transactionMessage:c.lockMsg});await send([l],'3/7 Store permanent LP lock leg');st=await read();}
 let ps=st.proposal.pretty(),approved=st.proposal.approved.some(k=>k.equals(account));
 if(ps.status==='Draft'){const a=multisig.instructions.proposalActivate({multisigPda:msPk(),transactionIndex:c.next,member:account});const ap=multisig.instructions.proposalApprove({multisigPda:msPk(),transactionIndex:c.next,member:account});await send([a,ap],'4/7 Activate + owner approve WORLDZ launch');st=await read();}
 else if(ps.status==='Active'&&!approved){const ap=multisig.instructions.proposalApprove({multisigPda:msPk(),transactionIndex:c.next,member:account});await send([ap],'4/7 Owner approve WORLDZ launch');st=await read();}
 ps=st.proposal.pretty();if(ps.status!=='Approved'&&ps.status!=='Executed')throw new Error('Owner launch proposal is not Approved yet: '+ps.status);
 for(let leg=Number(st.batch.executedTransactionIndex)+1;leg<=3;leg++){
  const ex=await multisig.instructions.batchExecuteTransaction({connection,multisigPda:msPk(),member:account,batchIndex:c.next,transactionIndex:leg});
  await send([ex.instruction],(4+leg)+'/7 Execute WORLDZ batch leg '+leg,ex.lookupTableAccounts||[]);
  st=await read();
 }
 const livePool=await connection.getAccountInfo(c.pool,'confirmed');
 if(!livePool)throw new Error('Launch transactions confirmed but Meteora pool is not visible yet.');
 $('#pool').textContent=c.pool.toBase58();$('#done').classList.remove('hidden');
 status('#action-status','WORLDZ LAUNCH EXECUTED ✅\nOwner treasury mode: 1-of-1\nCreator allocation: 8,000,000 WLDZ\nMeteora launch: 15,000,000 WLDZ / 0 SOL\nPool: '+c.pool.toBase58()+'\nPermanent lock leg executed.','ok');
}
async function act(){
 if(busy||!ctx)return;busy=true;$('#action').disabled=true;$('#verify').disabled=true;
 try{if(ctx.mode==='cutover')await runCutover();else if(ctx.mode==='launch')await runLaunch();}
 catch(e){status('#action-status','STOPPED\n'+(e?.message||String(e))+'\n\nConfirmed on-chain steps are preserved. Press VERIFY LIVE MAINNET STATE before continuing.','bad');}
 finally{busy=false;$('#verify').disabled=false;if(ctx)$('#action').disabled=false;}
}
$('#connect').addEventListener('click',connectWallet);
$('#verify').addEventListener('click',verify);
$('#action').addEventListener('click',act);
