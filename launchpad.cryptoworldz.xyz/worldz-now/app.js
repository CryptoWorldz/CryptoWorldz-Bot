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
  const latest=await connection.getLatestBlockhash('confirmed');
  const tx=new VersionedTransaction(new TransactionMessage({
    payerKey:account,recentBlockhash:latest.blockhash,instructions:ixs
  }).compileToV0Message());
  status('#launch-status',label+'\n\nReview the wallet request carefully.','warn');
  const signed=await signTx(tx);
  const sim=await connection.simulateTransaction(signed,{sigVerify:true,commitment:'confirmed'});
  if(sim.value.err)throw new Error(label+' simulation failed: '+JSON.stringify(sim.value.err));
  const sig=await connection.sendRawTransaction(signed.serialize(),{
    skipPreflight:false,maxRetries:3,preflightCommitment:'confirmed'
  });
  const conf=await connection.confirmTransaction({
    signature:sig,blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight
  },'confirmed');
  if(conf.value.err)throw new Error(label+' confirmation failed: '+JSON.stringify(conf.value.err));
  return sig;
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

    const next=multisig.utils.toBigInt(ma.transactionIndex)+1n;
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

    ctx={mint,ms,vault,ma,next,batchPda,proposalPda,posNft,devMsg,poolMsg,lockMsg,pool,position,liq,vaultSol,sourceAta,sourceAmount:source.amount};
    $('#proof').classList.remove('hidden');
    status('#verify-status','MAINNET VERIFICATION PASS ✅\nSupply: 100,000,000 '+TICKER+'\nVault balance: '+Number(source.amount/1000000n).toLocaleString()+' '+TICKER+'\nVault SOL: '+(vaultSol/1e9).toFixed(6)+' SOL\nThreshold: 2 of 3\nExpected pool: '+pool.toBase58()+'\n\nNo transaction has been signed or broadcast.','ok');
    $('#create').disabled=false;
  }catch(e){
    ctx=null;$('#create').disabled=true;
    status('#verify-status','VERIFICATION STOPPED\n'+(e?.message||String(e))+'\n\nNothing was sent.','bad');
  }finally{$('#verify').disabled=false;}
}

async function createProposal(){
  if(busy||!ctx)return;
  busy=true;$('#create').disabled=true;$('#verify').disabled=true;
  try{
    const {ms,vault,next,batchPda,proposalPda,devMsg,poolMsg,lockMsg}=ctx;
    const batchCreate=multisig.instructions.batchCreate({
      multisigPda:ms,creator:account,rentPayer:account,batchIndex:next,vaultIndex:0,
      memo:'WORLDZ: 8M creator allocation + 15M Meteora launch + permanent LP lock'
    });
    const proposalCreate=multisig.instructions.proposalCreate({
      multisigPda:ms,transactionIndex:next,creator:account,rentPayer:account,isDraft:true
    });
    await send([batchCreate,proposalCreate],'Approval 1/6 — Create Squads batch');

    const addDev=multisig.instructions.batchAddTransaction({
      vaultIndex:0,multisigPda:ms,member:account,rentPayer:account,
      batchIndex:next,transactionIndex:1,ephemeralSigners:0,transactionMessage:devMsg
    });
    await send([addDev],'Approval 2/6 — Add 8M creator allocation');

    const addPool=multisig.instructions.batchAddTransaction({
      vaultIndex:0,multisigPda:ms,member:account,rentPayer:account,
      batchIndex:next,transactionIndex:2,ephemeralSigners:1,transactionMessage:poolMsg
    });
    await send([addPool],'Approval 3/6 — Add 15M Meteora launch');

    const addLock=multisig.instructions.batchAddTransaction({
      vaultIndex:0,multisigPda:ms,member:account,rentPayer:account,
      batchIndex:next,transactionIndex:3,ephemeralSigners:0,transactionMessage:lockMsg
    });
    await send([addLock],'Approval 4/6 — Add permanent LP lock');

    const activate=multisig.instructions.proposalActivate({
      multisigPda:ms,transactionIndex:next,member:account
    });
    await send([activate],'Approval 5/6 — Activate WORLDZ proposal');

    const approve=multisig.instructions.proposalApprove({
      multisigPda:ms,transactionIndex:next,member:account
    });
    await send([approve],'Approval 6/6 — Record JayJayTeamDev approval');

    const info=await connection.getAccountInfo(proposalPda,'confirmed');
    if(!info)throw new Error('Proposal transactions confirmed but proposal account was not found.');
    $('#proposal').textContent=proposalPda.toBase58();
    $('#pool').textContent=ctx.pool.toBase58();
    $('#done').classList.remove('hidden');
    status('#launch-status','WORLDZ PROPOSAL CREATED ✅\nJayJayTeamDev approval: RECORDED\nRequired threshold: 2 of 3\nStill needed: ONE approval from Stepper OR Remedy\nProposal: '+proposalPda.toBase58()+'\n\nThe 8M transfer and 15M launch have NOT executed yet. They execute only after threshold approval and Squads execution.','ok');
  }catch(e){
    status('#launch-status','PROCESS STOPPED\n'+(e?.message||String(e))+'\n\nAny earlier confirmed setup transactions remain on-chain. Re-run Verify before continuing so the page reads the latest Squads state.','bad');
    $('#verify').disabled=false;
  }finally{busy=false;$('#create').disabled=false;$('#verify').disabled=false;}
}

$('#connect').addEventListener('click',connectWallet);
$('#verify').addEventListener('click',verify);
$('#create').addEventListener('click',createProposal);
