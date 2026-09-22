import {
  Connection,PublicKey,TransactionMessage,VersionedTransaction
} from 'https://esm.sh/@solana/web3.js@1.98.4?bundle';
import {
  NATIVE_MINT,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,
  getMint,getAssociatedTokenAddress,getAccount,
  createAssociatedTokenAccountIdempotentInstruction,createTransferCheckedInstruction
} from 'https://esm.sh/@solana/spl-token@0.4.15?bundle';
import {getWallets} from 'https://esm.sh/@wallet-standard/app@1.1.0?bundle';
import {
  ActivationType,BaseFeeMode,CollectFeeMode,CpAmm,derivePositionNftAccount,
  getBaseFeeParams,getLiquidityDeltaFromAmountA,getSqrtPriceFromPrice,MAX_SQRT_PRICE
} from 'https://esm.sh/@meteora-ag/cp-amm-sdk@1.4.7?bundle';
import * as multisig from 'https://esm.sh/@sqds/multisig@2.1.4?bundle';
import BN from 'https://esm.sh/bn.js@5.2.2?bundle';

const $=s=>document.querySelector(s);
const RPC='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const connection=new Connection(RPC,'confirmed');
const DEV='Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u';
const MINT='AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U';
const MS='B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN';
const VAULT='n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB';
const DAMM='cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG';
const TICKER='WL'+'DZ';
let wallet=null,account=null,ctx=null,busy=false;

function status(id,text,type=''){const e=$(id);e.textContent=text;e.className='status '+type;}
function short(x){return String(x).slice(0,6)+'…'+String(x).slice(-6);}
function candidates(){
  try{return getWallets().get().filter(w=>w?.features?.['standard:connect']&&w?.features?.['solana:signTransaction']&&w?.chains?.some(c=>String(c).startsWith('solana:')));}catch{return []}
}
function injected(){
  return [window.jupiter?.solana,window.phantom?.solana,window.solflare,window.solana]
    .filter(Boolean).find(p=>typeof p.connect==='function'&&typeof p.signTransaction==='function')||null;
}
async function connectWallet(){
  try{
    status('#connect-status','Opening wallet connection…','warn');
    const list=candidates(),std=list.find(w=>/jupiter/i.test(w.name))||list[0];
    if(std){
      const out=await std.features['standard:connect'].connect();
      const a=(out?.accounts||std.accounts||[])[0];
      if(!a)throw new Error('Wallet returned no account.');
      wallet={kind:'standard',name:std.name,wallet:std,account:a,publicKey:new PublicKey(a.address)};
    }else{
      const p=injected();
      if(p){
        const out=await p.connect(),pk=(out&&out.publicKey)||p.publicKey;
        if(!pk)throw new Error('Wallet returned no public key.');
        wallet={kind:'injected',name:'Solana Wallet',provider:p,publicKey:new PublicKey(pk.toString())};
      }else{
        const mod=await import('/mint/jupiter-mobile.js?v=20260921-reown-v1');
        const a=await mod.getJupiterMobileAdapter();await a.connect();
        if(!a.publicKey)throw new Error('Jupiter Mobile returned no public key.');
        wallet={kind:'jupiter-mobile',name:'Jupiter Mobile',provider:a,publicKey:new PublicKey(a.publicKey.toString())};
      }
    }
    if(wallet.publicKey.toBase58()!==DEV)throw new Error('Wrong wallet. Connect the authorised JayJayTeamDev wallet.');
    account=wallet.publicKey;
    $('#wallet-label').textContent=wallet.name+' • '+short(account.toBase58());
    status('#connect-status','AUTHORISED WALLET CONNECTED ✅\n'+account.toBase58()+'\n\nNo transaction has been sent.','ok');
    status('#verify-status','Authorised wallet connected ✅\nPress VERIFY MAINNET STATE.\n\nThis check does not sign or send anything.','ok');
    $('#verify').disabled=false;
  }catch(e){
    wallet=null;account=null;$('#verify').disabled=true;$('#create').disabled=true;
    status('#connect-status','CONNECTION FAILED\n'+(e?.message||String(e)),'bad');
  }
}
async function signTx(tx){
  if(!wallet)throw new Error('Wallet not connected.');
  if(wallet.kind==='standard'){
    const wire=tx.serialize();
    const out=await wallet.wallet.features['solana:signTransaction'].signTransaction({
      account:wallet.account,transaction:new Uint8Array(wire)
    });
    const bytes=out?.[0]?.signedTransaction;
    if(!bytes)throw new Error('Wallet returned no signed transaction.');
    return VersionedTransaction.deserialize(bytes);
  }
  return wallet.provider.signTransaction(tx);
}
async function send(ixs,label){
  if(!wallet||!account)throw new Error('Wallet not connected.');
  let attempt=0;
  while(attempt<3){
    attempt++;
    const latest=await connection.getLatestBlockhash('confirmed');
    const tx=new VersionedTransaction(new TransactionMessage({
      payerKey:account,recentBlockhash:latest.blockhash,instructions:ixs
    }).compileToV0Message());

    status('#launch-status',
      'FIX V5 • '+label+'\n\nFresh blockhash attempt '+attempt+'/3.\nApprove this wallet request. If it becomes stale, this page will rebuild the same step automatically.','warn');

    const signed=await signTx(tx);

    // Wallet approval can take long enough for a Solana blockhash to expire.
    // Check freshness AFTER the user signs, before broadcast.
    const currentHeight=await connection.getBlockHeight('confirmed');
    if(currentHeight>=latest.lastValidBlockHeight-20){
      status('#launch-status',
        label+'\n\nThat approval took long enough for the Solana blockhash to become stale.\nNothing was broadcast. Re-opening the same approval with a fresh blockhash…','warn');
      continue;
    }

    const sim=await connection.simulateTransaction(signed,{sigVerify:true,commitment:'confirmed'});
    if(sim.value.err)throw new Error(label+' simulation failed: '+JSON.stringify(sim.value.err));

    try{
      const sig=await connection.sendRawTransaction(signed.serialize(),{
        skipPreflight:false,maxRetries:5,preflightCommitment:'confirmed'
      });

      // Poll signature status instead of relying only on confirmTransaction's blockheight timeout.
      for(let i=0;i<35;i++){
        const st=await connection.getSignatureStatuses([sig],{searchTransactionHistory:true});
        const v=st?.value?.[0];
        if(v?.err)throw new Error(label+' on-chain error: '+JSON.stringify(v.err));
        if(v&&(v.confirmationStatus==='confirmed'||v.confirmationStatus==='finalized'))return sig;

        const h=await connection.getBlockHeight('confirmed');
        if(h>latest.lastValidBlockHeight)break;
        await new Promise(res=>setTimeout(res,1200));
      }

      // One last historical lookup: transaction may have landed just as blockhash window closed.
      const final=await connection.getSignatureStatuses([sig],{searchTransactionHistory:true});
      const fv=final?.value?.[0];
      if(fv?.err)throw new Error(label+' on-chain error: '+JSON.stringify(fv.err));
      if(fv&&(fv.confirmationStatus==='confirmed'||fv.confirmationStatus==='finalized'))return sig;

      status('#launch-status',
        label+'\n\nSolana blockhash expired before confirmation.\nNo confirmed transaction was found. Re-opening this same step with a fresh blockhash…','warn');
    }catch(e){
      const msg=e?.message||String(e);
      if(/expired|block height exceeded|blockhash not found|TransactionExpired/i.test(msg)){
        status('#launch-status',
          label+'\n\nSolana blockhash expired.\nRe-opening this same step with a fresh blockhash…','warn');
        continue;
      }
      throw e;
    }
  }
  throw new Error(label+' could not confirm after 3 fresh-blockhash attempts. Stop here; nothing further will be submitted.');
}
async function verify(){
  try{
    $('#verify').disabled=true;$('#create').disabled=true;
    status('#verify-status','VERIFYING LIVE MAINNET STATE…\nNo signing. No transaction.','warn');
    const mint=new PublicKey(MINT),ms=new PublicKey(MS),vault=new PublicKey(VAULT);
    const [mi,ma,vaultSol]=await Promise.all([
      getMint(connection,mint,'confirmed',TOKEN_PROGRAM_ID),
      multisig.accounts.Multisig.fromAccountAddress(connection,ms,'confirmed'),
      connection.getBalance(vault,'confirmed')
    ]);
    if(mi.decimals!==6||mi.supply!==100000000000000n)throw new Error('Canonical WORLDZ supply changed.');
    if(mi.mintAuthority!==null||mi.freezeAuthority!==null)throw new Error('WORLDZ authorities are not revoked.');
    if(Number(ma.threshold)!==2||ma.members.length!==3)throw new Error('Squads governance changed. Stop and rebuild.');
    const [derivedVault]=multisig.getVaultPda({multisigPda:ms,index:0});
    if(!derivedVault.equals(vault))throw new Error('Squads vault derivation mismatch.');
    const sourceAta=await getAssociatedTokenAddress(mint,vault,true,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
    const source=await getAccount(connection,sourceAta,'confirmed',TOKEN_PROGRAM_ID);
    if(source.amount<23000000n*1000000n)throw new Error('Treasury no longer has enough WORLDZ for the approved 8M + 15M batch.');
    const member=ma.members.find(m=>m.key.equals(account));
    if(!member||(Number(member.permissions.mask)&1)!==1)throw new Error('Connected wallet does not have Squads Initiate permission.');

    const FLOW_KEY='worldz-owner-flow-v5-index';
    let chosen=null,existingBatch=null,existingProposal=null;
    const remembered=localStorage.getItem(FLOW_KEY);
    const candidates=[];
    if(remembered&&/^\d+$/.test(remembered))candidates.push(BigInt(remembered));
    const current=multisig.utils.toBigInt(ma.transactionIndex);
    if(current>0n&&!candidates.some(x=>x===current))candidates.push(current);

    for(const idx of candidates){
      const [bp]=multisig.getTransactionPda({multisigPda:ms,index:idx});
      const [pp]=multisig.getProposalPda({multisigPda:ms,transactionIndex:idx});
      try{
        const b=await multisig.accounts.Batch.fromAccountAddress(connection,bp,'confirmed');
        const p=await multisig.accounts.Proposal.fromAccountAddress(connection,pp,'confirmed');
        const pretty=p.pretty();
        if(b.creator.equals(account)&&b.vaultIndex===0&&b.executedTransactionIndex===0&&b.size>=0&&b.size<=3&&pretty.status==='Draft'){
          chosen=idx;existingBatch=b;existingProposal=p;break;
        }
      }catch{}
    }

    const next=chosen??(current+1n);
    localStorage.setItem(FLOW_KEY,next.toString());
    const [batchPda]=multisig.getTransactionPda({multisigPda:ms,index:next});
    const [proposalPda]=multisig.getProposalPda({multisigPda:ms,transactionIndex:next});
    const [posNft]=multisig.getEphemeralSignerPda({transactionPda:batchPda,ephemeralSignerIndex:0});

    const bh=(await connection.getLatestBlockhash('confirmed')).blockhash;
    const devAta=await getAssociatedTokenAddress(mint,account,false,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
    const devIxs=[
      createAssociatedTokenAccountIdempotentInstruction(vault,devAta,account,mint,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID),
      createTransferCheckedInstruction(sourceAta,mint,devAta,vault,8000000n*1000000n,6,[],TOKEN_PROGRAM_ID)
    ];
    const devMsg=new TransactionMessage({payerKey:vault,recentBlockhash:bh,instructions:devIxs});
    const devTest=new VersionedTransaction(devMsg.compileToV0Message());
    const devSim=await connection.simulateTransaction(devTest,{sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed'});
    if(devSim.value.err)throw new Error('8M creator transfer simulation failed.');

    const cp=new CpAmm(connection);
    const init=getSqrtPriceFromPrice('0.000001',6,9);
    const amount=new BN((15000000n*1000000n).toString());
    const liq=getLiquidityDeltaFromAmountA(amount,init,MAX_SQRT_PRICE,CollectFeeMode.OnlyB);
    const baseFee=getBaseFeeParams({
      baseFeeMode:BaseFeeMode.FeeTimeSchedulerLinear,
      feeTimeSchedulerParam:{startingFeeBps:200,endingFeeBps:200,numberOfPeriod:0,totalDuration:0}
    });
    const {tx:createPoolTx,pool,position}=await cp.createCustomPool({
      payer:vault,creator:vault,positionNft:posNft,
      tokenAMint:mint,tokenBMint:NATIVE_MINT,
      tokenAAmount:amount,tokenBAmount:new BN(0),
      sqrtMinPrice:init,sqrtMaxPrice:MAX_SQRT_PRICE,liquidityDelta:liq,initSqrtPrice:init,
      poolFees:{baseFee,compoundingFeeBps:0,padding:0,dynamicFee:null},
      hasAlphaVault:false,activationType:ActivationType.Timestamp,
      collectFeeMode:CollectFeeMode.OnlyB,activationPoint:null,
      tokenAProgram:TOKEN_PROGRAM_ID,tokenBProgram:TOKEN_PROGRAM_ID,isLockLiquidity:false
    });
    if(await connection.getAccountInfo(pool,'confirmed'))throw new Error('Expected Meteora pool already exists. Stop and inspect before continuing.');
    const poolMsg=new TransactionMessage({payerKey:vault,recentBlockhash:bh,instructions:createPoolTx.instructions});
    const poolTest=new VersionedTransaction(poolMsg.compileToV0Message());
    const poolSim=await connection.simulateTransaction(poolTest,{sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed'});
    if(poolSim.value.err)throw new Error('Meteora pool simulation failed: '+JSON.stringify(poolSim.value.err));

    const lockTx=await cp.permanentLockPosition({
      owner:vault,position,positionNftAccount:derivePositionNftAccount(posNft),pool,unlockedLiquidity:liq
    });
    const lockMsg=new TransactionMessage({payerKey:vault,recentBlockhash:bh,instructions:lockTx.instructions});

    ctx={mint,ms,vault,ma,next,batchPda,proposalPda,posNft,devMsg,poolMsg,lockMsg,pool,position,liq,vaultSol,sourceAta,sourceAmount:source.amount,resume:!!chosen,batchSize:existingBatch?.size??null,FLOW_KEY};
    $('#proof').classList.remove('hidden');
    $('#create').textContent=chosen?'CONTINUE WORLDZ PROPOSAL':'CREATE WORLDZ PROPOSAL';
    const resumeText=chosen?'\nRESUME: existing Draft #'+next.toString()+' found with '+existingBatch.size+'/3 batch legs already stored.\nThe console will skip confirmed work.':'\nNEW BATCH: index '+next.toString()+'. First safe step can create the batch + store the 8M creator leg together.';
    status('#verify-status','MAINNET VERIFICATION PASS ✅\nSupply: 100,000,000 '+TICKER+'\nVault balance: '+Number(source.amount/1000000n).toLocaleString()+' '+TICKER+'\nVault SOL: '+(vaultSol/1e9).toFixed(6)+' SOL\nThreshold: 2 of 3\nExpected pool: '+pool.toBase58()+resumeText+'\n\nNo transaction has been signed or broadcast by this verification.','ok');
    $('#create').disabled=false;
  }catch(e){
    ctx=null;$('#create').disabled=true;
    const raw=(e?.message||String(e));
    const friendly=/Failed to fetch|failed to get info about account|network request/i.test(raw)
      ? 'RPC CONNECTION ERROR\nThe browser could not reach the Solana RPC bridge. Reload this page once, reconnect the same wallet, then press VERIFY MAINNET STATE again.\n\nNothing was signed. Nothing was sent.'
      : 'VERIFICATION STOPPED\n'+raw+'\n\nNothing was sent.';
    status('#verify-status',friendly,'bad');
  }finally{$('#verify').disabled=false;}
}

async function createProposal(){
  if(busy||!ctx)return;
  busy=true;$('#create').disabled=true;$('#verify').disabled=true;
  try{
    const {ms,vault,next,batchPda,proposalPda,devMsg,poolMsg,lockMsg}=ctx;

    const readState=async()=>{
      let batch=null,proposal=null;
      try{batch=await multisig.accounts.Batch.fromAccountAddress(connection,batchPda,'confirmed');}catch{}
      try{proposal=await multisig.accounts.Proposal.fromAccountAddress(connection,proposalPda,'confirmed');}catch{}
      return {batch,proposal};
    };

    let state=await readState();

    // If no batch exists, create it AND store the 8M creator leg in one wallet approval.
    if(!state.batch&&!state.proposal){
      const batchCreate=multisig.instructions.batchCreate({
        multisigPda:ms,creator:account,rentPayer:account,batchIndex:next,vaultIndex:0,
        memo:'WORLDZ: 8M creator allocation + 15M Meteora launch + permanent LP lock'
      });
      const proposalCreate=multisig.instructions.proposalCreate({
        multisigPda:ms,transactionIndex:next,creator:account,rentPayer:account,isDraft:true
      });
      const addDev=multisig.instructions.batchAddTransaction({
        vaultIndex:0,multisigPda:ms,member:account,rentPayer:account,
        batchIndex:next,transactionIndex:1,ephemeralSigners:0,transactionMessage:devMsg
      });
      await send([batchCreate,proposalCreate,addDev],'Step 1/4 — Create batch + store 8M creator leg');
      state=await readState();
    }

    if(!state.batch||!state.proposal)throw new Error('Squads batch/proposal is not readable after creation.');
    if(!state.batch.creator.equals(account)||state.batch.vaultIndex!==0)throw new Error('Existing Squads draft does not belong to this authorised WORLDZ flow.');
    let p=state.proposal.pretty();
    if(!['Draft','Active','Approved'].includes(p.status))throw new Error('Unexpected proposal status: '+p.status);

    // Resume exactly at the first missing batch leg.
    if(state.batch.size===0){
      const addDev=multisig.instructions.batchAddTransaction({
        vaultIndex:0,multisigPda:ms,member:account,rentPayer:account,
        batchIndex:next,transactionIndex:1,ephemeralSigners:0,transactionMessage:devMsg
      });
      await send([addDev],'Step 1/4 — Store 8M creator leg');
      state=await readState();
    }
    if(state.batch.size===1){
      const addPool=multisig.instructions.batchAddTransaction({
        vaultIndex:0,multisigPda:ms,member:account,rentPayer:account,
        batchIndex:next,transactionIndex:2,ephemeralSigners:1,transactionMessage:poolMsg
      });
      await send([addPool],'Step 2/4 — Store 15M Meteora launch leg');
      state=await readState();
    }
    if(state.batch.size===2){
      const addLock=multisig.instructions.batchAddTransaction({
        vaultIndex:0,multisigPda:ms,member:account,rentPayer:account,
        batchIndex:next,transactionIndex:3,ephemeralSigners:0,transactionMessage:lockMsg
      });
      await send([addLock],'Step 3/4 — Store permanent LP lock leg');
      state=await readState();
    }
    if(state.batch.size!==3)throw new Error('Expected exactly 3 WORLDZ batch legs; live batch size is '+state.batch.size+'.');

    p=state.proposal.pretty();
    const alreadyApproved=state.proposal.approved.some(k=>k.equals(account));
    if(p.status==='Draft'){
      const activate=multisig.instructions.proposalActivate({multisigPda:ms,transactionIndex:next,member:account});
      const approve=multisig.instructions.proposalApprove({multisigPda:ms,transactionIndex:next,member:account});
      await send([activate,approve],'Step 4/4 — Activate + record JayJayTeamDev approval');
      state=await readState();
    }else if(p.status==='Active'&&!alreadyApproved){
      const approve=multisig.instructions.proposalApprove({multisigPda:ms,transactionIndex:next,member:account});
      await send([approve],'Final step — Record JayJayTeamDev approval');
      state=await readState();
    }

    if(!state.proposal)throw new Error('Proposal disappeared after approval.');
    const final=state.proposal.pretty();
    const jayApproved=state.proposal.approved.some(k=>k.equals(account));
    if(!jayApproved&&final.status!=='Approved')throw new Error('JayJayTeamDev approval is not visible on-chain yet.');

    $('#proposal').textContent=proposalPda.toBase58();
    $('#pool').textContent=ctx.pool.toBase58();
    $('#done').classList.remove('hidden');
    status('#launch-status','WORLDZ PROPOSAL READY ✅\nBatch legs stored: 3/3\nJayJayTeamDev approval: '+(jayApproved?'RECORDED':'THRESHOLD ALREADY APPROVED')+'\nProposal status: '+final.status+'\nRequired threshold: 2 of 3\nProposal: '+proposalPda.toBase58()+'\n\nThe 8M transfer and 15M launch have NOT executed yet. One additional Squads approval is still required unless the proposal already shows Approved.','ok');
  }catch(e){
    status('#launch-status','PROCESS STOPPED\n'+(e?.message||String(e))+'\n\nDo NOT start a new batch. Press VERIFY MAINNET STATE again. FIX V5 will read the existing on-chain draft and continue from the first missing step; confirmed work is not repeated.','bad');
    $('#verify').disabled=false;
  }finally{busy=false;$('#create').disabled=false;$('#verify').disabled=false;}
}

$('#connect').addEventListener('click',connectWallet);
$('#verify').addEventListener('click',verify);
$('#create').addEventListener('click',createProposal);
