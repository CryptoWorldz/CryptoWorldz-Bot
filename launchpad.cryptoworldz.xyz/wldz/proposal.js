(()=>{
const REQUIRED='Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u';
const RPC='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const MINT='AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U';
const MULTISIG='B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN';
const VAULT='n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB';
const VAULT_INDEX=0;
const RESUME_KEY='worldz:wldz:damm-v2-proposal:'+MULTISIG;
const $=s=>document.querySelector(s);
const set=(m,c='')=>{const e=$('#proposal-status');if(e){e.textContent=m;e.className='status '+c}};
const fail=m=>{throw new Error(m)};
const assert=(v,m)=>{if(!v)fail(m)};
const textErr=e=>e?.message||String(e);
const accountExists=async(connection,key)=>Boolean(await connection.getAccountInfo(key,'confirmed'));

function loadResume(){
 try{
  const raw=localStorage.getItem(RESUME_KEY);
  if(!raw)return null;
  const saved=JSON.parse(raw);
  if(saved?.wallet!==REQUIRED||saved?.multisig!==MULTISIG||!saved?.batchIndex)return null;
  return saved;
 }catch{return null}
}
function saveResume(batchIndex,status){
 try{localStorage.setItem(RESUME_KEY,JSON.stringify({wallet:REQUIRED,multisig:MULTISIG,batchIndex:String(batchIndex),status,updatedAt:new Date().toISOString()}))}catch{}
}
function clearResume(){try{localStorage.removeItem(RESUME_KEY)}catch{}}

async function deps(){
 const buffer=await import('https://esm.sh/buffer@6.0.3?bundle');
 if(!globalThis.Buffer)globalThis.Buffer=buffer.Buffer;
 const [web3,sqds,cp,spl,bn]=await Promise.all([
  import('https://esm.sh/@solana/web3.js@1.98.4?bundle'),
  import('https://esm.sh/@sqds/multisig@2.1.4?bundle&deps=@solana/web3.js@1.98.4'),
  import('https://esm.sh/@meteora-ag/cp-amm-sdk@1.4.7?bundle&deps=@solana/web3.js@1.98.4,bn.js@5.2.2'),
  import('https://esm.sh/@solana/spl-token@0.4.15?bundle&deps=@solana/web3.js@1.98.4'),
  import('https://esm.sh/bn.js@5.2.2?bundle')
 ]);
 return {web3,sqds,cp,spl,BN:bn.default||bn.BN||bn};
}

async function manifest(){
 const r=await fetch('/wldz/launch-config.json',{cache:'no-store'});
 if(!r.ok)fail('Launch manifest unavailable. Reload the page and try again.');
 const c=await r.json();
 assert(c.token?.mint===MINT,'Launch stopped: canonical WLDZ mint does not match the locked manifest.');
 assert(c.token?.supplyTokens===100000000&&c.token?.decimals===6,'Launch stopped: WLDZ supply or decimals changed.');
 assert(c.treasury?.multisig===MULTISIG&&c.treasury?.vault===VAULT,'Launch stopped: Squads custody details changed.');
 assert(c.launch?.engine==='METEORA_DAMM_V2_ONE_SIDED','Launch stopped: launch engine changed.');
 assert(c.launch?.baseAmountTokens===15000000,'Launch stopped: launch amount is no longer 15M WLDZ.');
 assert(c.launch?.quoteAmountSol===0,'Launch stopped: starting quote must remain zero.');
 assert(c.launch?.baseFeeBps===200&&c.launch?.feeCollection==='ONLY_B_QUOTE','Launch stopped: fee configuration changed.');
 assert(c.launch?.permanentLock===true,'Launch stopped: permanent LP lock is no longer enabled.');
 return c;
}

async function sendInstructions(provider,connection,web3,payer,instructions,label){
 const latest=await connection.getLatestBlockhash('confirmed');
 const tx=new web3.VersionedTransaction(new web3.TransactionMessage({
  payerKey:payer,
  recentBlockhash:latest.blockhash,
  instructions
 }).compileToV0Message());
 set(label+' — approve in your wallet…','warn');
 const signed=await provider.signTransaction(tx);
 const signature=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:3});
 const confirmation=await connection.confirmTransaction({
  signature,
  blockhash:latest.blockhash,
  lastValidBlockHeight:latest.lastValidBlockHeight
 },'confirmed');
 if(confirmation.value.err!==null){
  fail(label+' failed on-chain: '+JSON.stringify(confirmation.value.err));
 }
 return signature;
}

async function readCustody(connection,sqds,spl,web3,member){
 const multisigPda=new web3.PublicKey(MULTISIG);
 const vault=new web3.PublicKey(VAULT);
 const mint=new web3.PublicKey(MINT);
 const account=await sqds.accounts.Multisig.fromAccountAddress(connection,multisigPda,'confirmed');
 assert(Number(account.threshold)===1,'Launch stopped: Squads threshold is no longer the authorised temporary 1-of-2 configuration.');
 const memberAccount=account.members.find(x=>x.key.equals(member));
 assert(memberAccount,'Launch stopped: connected wallet is not a member of the WLDZ Squads.');
 assert((Number(memberAccount.permissions.mask)&1)===1,'Launch stopped: connected wallet does not have Squads Initiate permission.');
 const derivedVault=sqds.getVaultPda({multisigPda,index:VAULT_INDEX})[0];
 assert(derivedVault.equals(vault),'Launch stopped: configured Squads vault does not derive from the configured multisig.');
 const mintInfo=await spl.getMint(connection,mint,'confirmed',spl.TOKEN_PROGRAM_ID);
 assert(mintInfo.decimals===6&&mintInfo.supply===100000000000000n,'Launch stopped: on-chain WLDZ supply invariant failed.');
 assert(mintInfo.mintAuthority===null&&mintInfo.freezeAuthority===null,'Launch stopped: WLDZ mint or freeze authority is not revoked.');
 const ata=await spl.getAssociatedTokenAddress(mint,vault,true,spl.TOKEN_PROGRAM_ID);
 const tokenAccount=await spl.getAccount(connection,ata,'confirmed',spl.TOKEN_PROGRAM_ID);
 assert(tokenAccount.amount>=15000000n*1000000n,'Launch stopped: Squads vault does not hold the required 15M WLDZ.');
 return {account,multisigPda,vault,mint};
}

async function loadSavedBatch(connection,sqds,member){
 const saved=loadResume();
 if(!saved)return null;
 try{
  const index=BigInt(saved.batchIndex);
  const transactionPda=sqds.getTransactionPda({multisigPda:new (await deps()).web3.PublicKey(MULTISIG),index})[0];
  const proposalPda=sqds.getProposalPda({multisigPda:new (await deps()).web3.PublicKey(MULTISIG),transactionIndex:index})[0];
  const [batchInfo,proposalInfo]=await Promise.all([
   accountExists(connection,transactionPda),
   accountExists(connection,proposalPda)
  ]);
  if(!batchInfo||!proposalInfo){clearResume();return null}
  const [batch,proposal]=await Promise.all([
   sqds.accounts.Batch.fromAccountAddress(connection,transactionPda,'confirmed'),
   sqds.accounts.Proposal.fromAccountAddress(connection,proposalPda,'confirmed')
  ]);
  if(!batch.creator.equals(member)||!batch.multisig.equals(new (await deps()).web3.PublicKey(MULTISIG))||Number(batch.vaultIndex)!==VAULT_INDEX){
   clearResume();return null;
  }
  return {index,transactionPda,proposalPda,batch,proposal,saved};
 }catch{
  clearResume();
  return null;
 }
}

function proposalStatus(sqds,proposal){
 if(!proposal)return 'missing';
 if(sqds.types.isProposalStatusDraft(proposal.status))return 'draft';
 if(sqds.types.isProposalStatusActive(proposal.status))return 'active';
 if(sqds.types.isProposalStatusApproved(proposal.status))return 'approved';
 if(sqds.types.isProposalStatusExecuted(proposal.status))return 'executed';
 if(sqds.types.isProposalStatusRejected?.(proposal.status))return 'rejected';
 if(sqds.types.isProposalStatusCancelled?.(proposal.status))return 'cancelled';
 return 'other';
}

async function buildPlan(connection,d,custody,member,batchIndex){
 const {web3,sqds,cp,spl,BN}=d;
 const ms=custody.multisigPda;
 const vault=custody.vault;
 const mint=custody.mint;
 const [transactionPda]=sqds.getTransactionPda({multisigPda:ms,index:batchIndex});
 const [proposalPda]=sqds.getProposalPda({multisigPda:ms,transactionIndex:batchIndex});
 const [positionNftPda]=sqds.getEphemeralSignerPda({transactionPda,ephemeralSignerIndex:0});
 const [poolLegPda]=sqds.getBatchTransactionPda({multisigPda:ms,batchIndex,transactionIndex:1});
 const [lockLegPda]=sqds.getBatchTransactionPda({multisigPda:ms,batchIndex,transactionIndex:2});

 const amm=new cp.CpAmm(connection);
 const init=cp.getSqrtPriceFromPrice('0.000001',6,9);
 const raw=15000000n*1000000n;
 const amount=new BN(raw.toString());
 const liquidity=cp.getLiquidityDeltaFromAmountA(amount,init,cp.MAX_SQRT_PRICE,cp.CollectFeeMode.OnlyB);
 const baseFee=cp.getBaseFeeParams({
  baseFeeMode:cp.BaseFeeMode.FeeTimeSchedulerLinear,
  feeTimeSchedulerParam:{startingFeeBps:200,endingFeeBps:200,numberOfPeriod:0,totalDuration:0}
 });
 const created=await amm.createCustomPool({
  payer:vault,
  creator:vault,
  positionNft:positionNftPda,
  tokenAMint:mint,
  tokenBMint:spl.NATIVE_MINT,
  tokenAAmount:amount,
  tokenBAmount:new BN(0),
  sqrtMinPrice:init,
  sqrtMaxPrice:cp.MAX_SQRT_PRICE,
  liquidityDelta:liquidity,
  initSqrtPrice:init,
  poolFees:{baseFee,compoundingFeeBps:0,padding:0,dynamicFee:null},
  hasAlphaVault:false,
  activationType:cp.ActivationType.Timestamp,
  collectFeeMode:cp.CollectFeeMode.OnlyB,
  activationPoint:null,
  tokenAProgram:spl.TOKEN_PROGRAM_ID,
  tokenBProgram:spl.TOKEN_PROGRAM_ID,
  isLockLiquidity:false
 });
 assert(!(await accountExists(connection,created.pool)),'Launch stopped: the target WLDZ/wSOL DAMM V2 pool already exists. Do not create a duplicate proposal.');
 const lockTx=await amm.permanentLockPosition({
  owner:vault,
  position:created.position,
  positionNftAccount:cp.derivePositionNftAccount(positionNftPda),
  pool:created.pool,
  unlockedLiquidity:liquidity
 });
 const bh=(await connection.getLatestBlockhash('confirmed')).blockhash;
 const poolMessage=new web3.TransactionMessage({payerKey:vault,recentBlockhash:bh,instructions:created.tx.instructions});
 const lockMessage=new web3.TransactionMessage({payerKey:vault,recentBlockhash:bh,instructions:lockTx.instructions});
 const setup=[
  sqds.instructions.batchCreate({
   multisigPda:ms,
   creator:member,
   rentPayer:member,
   batchIndex,
   vaultIndex:VAULT_INDEX,
   memo:'WORLDZ WLDZ 15M Meteora launch + permanent lock'
  }),
  sqds.instructions.proposalCreate({
   multisigPda:ms,
   transactionIndex:batchIndex,
   creator:member,
   rentPayer:member,
   isDraft:true
  })
 ];
 const addPool=[sqds.instructions.batchAddTransaction({
  vaultIndex:VAULT_INDEX,
  multisigPda:ms,
  member,
  rentPayer:member,
  batchIndex,
  transactionIndex:1,
  ephemeralSigners:1,
  transactionMessage:poolMessage
 })];
 const addLock=[sqds.instructions.batchAddTransaction({
  vaultIndex:VAULT_INDEX,
  multisigPda:ms,
  member,
  rentPayer:member,
  batchIndex,
  transactionIndex:2,
  ephemeralSigners:0,
  transactionMessage:lockMessage
 })];
 const activate=[sqds.instructions.proposalActivate({
  multisigPda:ms,
  transactionIndex:batchIndex,
  member
 })];
 return {transactionPda,proposalPda,poolLegPda,lockLegPda,pool:created.pool,position:created.position,setup,addPool,addLock,activate};
}

$('#create-proposal')?.addEventListener('click',async()=>{
 const button=$('#create-proposal');
 const provider=window.phantom?.solana||window.solana;
 if(!provider?.connect||!provider?.signTransaction){
  set('Wallet unavailable. Open this page in the same wallet browser that is connected to Squads.','warn');
  return;
 }
 if(button)button.disabled=true;
 try{
  set('Connecting the authorised WLDZ initiator wallet…','warn');
  const result=await provider.connect();
  const member=result.publicKey||provider.publicKey;
  if(!member||member.toBase58()!==REQUIRED){
   fail('Connect '+REQUIRED.slice(0,4)+'…'+REQUIRED.slice(-4)+' only. This wallet is not the authorised WLDZ initiator.');
  }
  await manifest();
  set('Reading live Squads state and WLDZ custody…','warn');
  const d=await deps();
  const connection=new d.web3.Connection(RPC,'confirmed');
  const custody=await readCustody(connection,d.sqds,d.spl,d.web3,member);

  const saved=loadResume();
  let resumed=null;
  if(saved){
   const index=BigInt(saved.batchIndex);
   const transactionPda=d.sqds.getTransactionPda({multisigPda:custody.multisigPda,index})[0];
   const proposalPda=d.sqds.getProposalPda({multisigPda:custody.multisigPda,transactionIndex:index})[0];
   if(await accountExists(connection,transactionPda)&&await accountExists(connection,proposalPda)){
    const [batch,proposal]=await Promise.all([
     d.sqds.accounts.Batch.fromAccountAddress(connection,transactionPda,'confirmed'),
     d.sqds.accounts.Proposal.fromAccountAddress(connection,proposalPda,'confirmed')
    ]);
    if(batch.creator.equals(member)&&batch.multisig.equals(custody.multisigPda)&&Number(batch.vaultIndex)===VAULT_INDEX){
     resumed={index,transactionPda,proposalPda,batch,proposal};
    }else{
     clearResume();
    }
   }else{
    clearResume();
   }
  }

  if(resumed){
   const state=proposalStatus(d.sqds,resumed.proposal);
   if(state==='active'||state==='approved'||state==='executed'){
    saveResume(resumed.index,state);
    set('WLDZ Squads proposal #'+resumed.index+' is already '+state+'. No duplicate proposal was created. Open Squads Transactions to continue.','good');
    return;
   }
   if(state!=='draft'){
    fail('Saved WLDZ proposal #'+resumed.index+' is '+state+'. No new proposal was created.');
   }
  }

  const batchIndex=resumed?.index||(d.sqds.utils.toBigInt(custody.account.transactionIndex)+1n);
  set((resumed?'Resuming':'Building')+' WLDZ proposal #'+batchIndex+' from live Squads state…','warn');
  const plan=await buildPlan(connection,d,custody,member,batchIndex);
  const sigs=[];

  if(!resumed){
   const fresh=await d.sqds.accounts.Multisig.fromAccountAddress(connection,custody.multisigPda,'confirmed');
   const expected=d.sqds.utils.toBigInt(fresh.transactionIndex)+1n;
   assert(expected===batchIndex,'Squads changed while the WLDZ proposal was being prepared. Nothing was sent. Press Create WLDZ Squads Proposal again.');
   sigs.push(await sendInstructions(provider,connection,d.web3,member,plan.setup,'1/4 Creating the live WLDZ batch proposal'));
   saveResume(batchIndex,'draft');
  }

  if(!(await accountExists(connection,plan.poolLegPda))){
   sigs.push(await sendInstructions(provider,connection,d.web3,member,plan.addPool,'2/4 Adding the 15M WLDZ DAMM V2 pool leg'));
  }
  if(!(await accountExists(connection,plan.lockLegPda))){
   sigs.push(await sendInstructions(provider,connection,d.web3,member,plan.addLock,'3/4 Adding the permanent LP lock leg'));
  }

  const proposal=await d.sqds.accounts.Proposal.fromAccountAddress(connection,plan.proposalPda,'confirmed');
  const state=proposalStatus(d.sqds,proposal);
  if(state==='draft'){
   sigs.push(await sendInstructions(provider,connection,d.web3,member,plan.activate,'4/4 Activating the proposal'));
  }else if(state!=='active'&&state!=='approved'&&state!=='executed'){
   fail('WLDZ proposal entered unexpected state '+state+'. Activation was not attempted.');
  }

  const finalProposal=await d.sqds.accounts.Proposal.fromAccountAddress(connection,plan.proposalPda,'confirmed');
  const finalState=proposalStatus(d.sqds,finalProposal);
  assert(finalState==='active'||finalState==='approved'||finalState==='executed','Proposal activation was not confirmed on-chain.');
  saveResume(batchIndex,finalState);
  set(
   'WLDZ proposal #'+batchIndex+' is '+finalState+'. Pool: '+plan.pool.toBase58()+
   '\\nOpen Squads Transactions to review, approve and execute.'+
   (sigs.length?'\\n'+sigs.map((s,i)=>(i+1)+'. '+s).join('\\n'):''),
   'good'
  );
 }catch(e){
  set('WLDZ proposal stopped safely: '+textErr(e),'warn');
 }finally{
  if(button)button.disabled=false;
 }
});
})();