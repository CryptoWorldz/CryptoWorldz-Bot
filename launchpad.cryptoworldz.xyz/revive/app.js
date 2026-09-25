import {Connection,PublicKey,SystemProgram,Transaction,TransactionMessage,clusterApiUrl} from 'https://esm.sh/@solana/web3.js@1.98.4?bundle';
import {NATIVE_MINT,TOKEN_PROGRAM_ID,getAssociatedTokenAddressSync} from 'https://esm.sh/@solana/spl-token@0.4.14?bundle';
import {getWallets} from 'https://esm.sh/@wallet-standard/app@1.1.0?bundle';
import {CpAmm,ActivationType,BaseFeeMode,CollectFeeMode,MAX_SQRT_PRICE,getBaseFeeParams,getSqrtPriceFromPrice} from 'https://esm.sh/@meteora-ag/cp-amm-sdk@1.4.10?bundle';
import BN from 'https://esm.sh/bn.js@5.2.2?bundle';
import * as squads from 'https://esm.sh/@sqds/multisig@2.1.4?bundle';

const $=s=>document.querySelector(s);
const RPC=clusterApiUrl('mainnet-beta');
const connection=new Connection(RPC,'confirmed');
const MAINNET_GENESIS='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
let wallet=null,plan=null,config=null;

function status(msg,type=''){const el=$('#status');el.textContent=msg;el.className='status '+type;}
function short(x){const s=String(x);return s.slice(0,5)+'…'+s.slice(-5);}
function sol(l){return (Number(l)/1e9).toFixed(9);}

function walletStandardCandidate(){
  try{return getWallets().get().filter(w=>w?.features?.['standard:connect']&&w?.features?.['solana:signTransaction']&&w.chains?.includes('solana:mainnet')).sort((a,b)=>Number(!/jupiter/i.test(a.name))-Number(!/jupiter/i.test(b.name)))[0]||null;}catch{return null}
}
function legacyProvider(){return [window.jupiter&&window.jupiter.solana,window.phantom&&window.phantom.solana,window.solflare,window.solana].filter(Boolean).find(p=>typeof p.connect==='function'&&typeof p.signTransaction==='function')||null;}
async function connectProvider(){
  const standard=walletStandardCandidate();
  if(standard){
    const out=await standard.features['standard:connect'].connect();
    const account=(out?.accounts||standard.accounts||[])[0];
    if(!account)throw new Error('Wallet returned no Solana account.');
    return {
      name:standard.name,
      publicKey:new PublicKey(account.address),
      async signTransaction(tx){
        const wire=tx.serialize({requireAllSignatures:false,verifySignatures:false});
        const out=await standard.features['solana:signTransaction'].signTransaction({transaction:new Uint8Array(wire),account,chain:'solana:mainnet'});
        const bytes=out?.[0]?.signedTransaction;
        if(!bytes)throw new Error('Wallet returned no signed transaction.');
        return Transaction.from(bytes);
      }
    };
  }
  const p=legacyProvider();
  if(p){
    const out=await p.connect();
    const pk=(out&&out.publicKey)||p.publicKey;
    if(!pk)throw new Error('Wallet returned no public key.');
    return {name:'Injected Solana Wallet',publicKey:new PublicKey(pk.toString()),signTransaction:tx=>p.signTransaction(tx)};
  }
  const mod=await import('/mint/jupiter-mobile.js?v=20260926-revive-launch-v1');
  const adapter=await mod.getJupiterMobileAdapter();
  await adapter.connect();
  if(!adapter.publicKey)throw new Error('Jupiter Mobile returned no public key.');
  return {name:'Jupiter Mobile',publicKey:new PublicKey(adapter.publicKey.toString()),signTransaction:tx=>adapter.signTransaction(tx)};
}

async function connect(){
  try{
    if(!config)config=await (await fetch('./launch-config.json?v=20260926a',{cache:'no-store'})).json();
    wallet=await connectProvider();
    if(wallet.publicKey.toBase58()!==config.ownerWallet)throw new Error('Wrong wallet. Connect '+config.ownerWallet);
    $('#connect').textContent=short(wallet.publicKey.toBase58());
    status('Connected. Ready for mainnet preflight.','good');
    $('#preflight').disabled=false;
  }catch(e){status('CONNECT FAILED: '+(e?.message||e),'bad');}
}

async function simulate(tx,sigVerify=false){
  const wire=tx.serialize({requireAllSignatures:false,verifySignatures:false}).toString('base64');
  const latest=await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash=latest.blockhash;
  const fresh=tx.serialize({requireAllSignatures:false,verifySignatures:false}).toString('base64');
  const response=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'simulateTransaction',params:[fresh,{encoding:'base64',sigVerify,replaceRecentBlockhash:!sigVerify,commitment:'confirmed'}]})});
  const env=await response.json();
  if(env.error)throw new Error('RPC simulation error: '+JSON.stringify(env.error));
  return env.result?.value;
}
function size(tx){return tx.serialize({requireAllSignatures:false,verifySignatures:false}).length;}

async function preflight(){
  if(!wallet)return connect();
  $('#preflight').disabled=true;
  $('#setup').disabled=true;
  $('#execute').disabled=true;
  status('Running live mainnet preflight…');
  try{
    const genesis=await connection.getGenesisHash();
    if(genesis!==MAINNET_GENESIS)throw new Error('Not connected to Solana mainnet-beta.');
    const JAY=new PublicKey(config.ownerWallet);
    const MULTISIG=new PublicKey(config.multisig);
    const VAULT=new PublicKey(config.vault);
    const RVIV=new PublicKey(config.rvivMint);

    const ms=await squads.accounts.Multisig.fromAccountAddress(connection,MULTISIG,'confirmed');
    if(Number(ms.threshold)!==1)throw new Error('Squads threshold is not 1. Current threshold='+ms.threshold);
    const member=ms.members.find(m=>m.key.equals(JAY));
    if(!member)throw new Error('JayJayTeamDev is not a live Squads member.');
    const perms={
      initiate:squads.types.Permissions.has(member.permissions,squads.types.Permission.Initiate),
      vote:squads.types.Permissions.has(member.permissions,squads.types.Permission.Vote),
      execute:squads.types.Permissions.has(member.permissions,squads.types.Permission.Execute)
    };
    if(!(perms.initiate&&perms.vote&&perms.execute))throw new Error('Wallet lacks Initiate/Vote/Execute permission.');

    const [vaultPda]=squads.getVaultPda({multisigPda:MULTISIG,index:0});
    if(!vaultPda.equals(VAULT))throw new Error('Vault #0 mismatch.');

    const rvivAta=getAssociatedTokenAddressSync(RVIV,vaultPda,true,TOKEN_PROGRAM_ID);
    const wsolAta=getAssociatedTokenAddressSync(NATIVE_MINT,vaultPda,true);
    const [jayBal,vaultBal,rvivBal,wsolInfo]=await Promise.all([
      connection.getBalance(JAY,'confirmed'),
      connection.getBalance(vaultPda,'confirmed'),
      connection.getTokenAccountBalance(rvivAta,'confirmed'),
      connection.getAccountInfo(wsolAta,'confirmed')
    ]);
    const launchRaw=BigInt(config.initialLiquidityRviv)*1_000_000n;
    if(BigInt(rvivBal.value.amount)<launchRaw)throw new Error('Squads Vault does not hold the required '+config.initialLiquidityRviv.toLocaleString()+' RVIV.');

    const nextIndex=BigInt(ms.transactionIndex.toString())+1n;
    const [transactionPda]=squads.getTransactionPda({multisigPda:MULTISIG,index:nextIndex});
    const [proposalPda]=squads.getProposalPda({multisigPda:MULTISIG,transactionIndex:nextIndex});
    const [positionNftPda,positionNftBump]=squads.getEphemeralSignerPda({transactionPda,ephemeralSignerIndex:0});

    const cpAmm=new CpAmm(connection);
    const initSqrtPrice=getSqrtPriceFromPrice(String(config.openingPriceSolPerRviv),6,9);
    const tokenAAmount=new BN(launchRaw.toString());
    const tokenBAmount=new BN(0);
    const liquidityDelta=cpAmm.preparePoolCreationSingleSide({tokenAAmount,minSqrtPrice:initSqrtPrice,maxSqrtPrice:MAX_SQRT_PRICE,initSqrtPrice,collectFeeMode:CollectFeeMode.OnlyB});
    if(liquidityDelta.lte(new BN(0)))throw new Error('Meteora returned zero liquidity.');
    const baseFee=getBaseFeeParams({baseFeeMode:BaseFeeMode.FeeTimeSchedulerLinear,feeTimeSchedulerParam:{startingFeeBps:config.feeBps,endingFeeBps:config.feeBps,numberOfPeriod:0,totalDuration:0}});
    if(!baseFee)throw new Error('Meteora rejected the '+config.feeBps+' bps fee.');

    const {tx:poolTx,pool,position}=await cpAmm.createCustomPool({
      payer:vaultPda,creator:vaultPda,positionNft:positionNftPda,
      tokenAMint:RVIV,tokenBMint:NATIVE_MINT,tokenAAmount,tokenBAmount,
      sqrtMinPrice:initSqrtPrice,sqrtMaxPrice:MAX_SQRT_PRICE,liquidityDelta,initSqrtPrice,
      poolFees:{baseFee,compoundingFeeBps:0,padding:0,dynamicFee:null},
      hasAlphaVault:false,activationType:ActivationType.Timestamp,collectFeeMode:CollectFeeMode.OnlyB,
      activationPoint:null,tokenAProgram:TOKEN_PROGRAM_ID,tokenBProgram:TOKEN_PROGRAM_ID,isLockLiquidity:true
    });
    if(await connection.getAccountInfo(pool,'confirmed')){
      status('REVIVE pool already exists: '+pool.toBase58(),'good');
      $('#proof').textContent='Pool: '+pool.toBase58();
      return;
    }

    const rentSpecs=[1112,408,165,165,465,165];
    let poolRent=0n;
    for(const bytes of rentSpecs)poolRent+=BigInt(await connection.getMinimumBalanceForRentExemption(bytes,'confirmed'));
    if(!wsolInfo)poolRent+=BigInt(await connection.getMinimumBalanceForRentExemption(165,'confirmed'));
    const need=poolRent+1n;
    const topUp=need>BigInt(vaultBal)?need-BigInt(vaultBal):0n;

    const latest=await connection.getLatestBlockhash('confirmed');
    const innerMessage=new TransactionMessage({payerKey:vaultPda,recentBlockhash:latest.blockhash,instructions:poolTx.instructions});
    const messageBytes=squads.utils.transactionMessageToMultisigTransactionMessageBytes({message:innerMessage,vaultPda});
    const [wrappedMessage]=squads.types.transactionMessageBeet.deserialize(Buffer.from(messageBytes));

    const createIx=squads.instructions.vaultTransactionCreate({multisigPda:MULTISIG,transactionIndex:nextIndex,creator:JAY,rentPayer:JAY,vaultIndex:0,ephemeralSigners:1,transactionMessage:innerMessage,memo:'REVIVE mainnet launch 0.000045 SOL/RVIV'});
    const proposalCreateIx=squads.instructions.proposalCreate({multisigPda:MULTISIG,creator:JAY,rentPayer:JAY,transactionIndex:nextIndex,isDraft:false});
    const approveIx=squads.instructions.proposalApprove({multisigPda:MULTISIG,transactionIndex:nextIndex,member:JAY,memo:'JayJayTeamDev approved REVIVE mainnet launch'});
    const {accountMetas}=await squads.utils.accountsForTransactionExecute({connection,transactionPda,vaultPda,message:wrappedMessage,ephemeralSignerBumps:[positionNftBump],programId:squads.PROGRAM_ID});
    const executeIx=squads.generated.createVaultTransactionExecuteInstruction({multisig:MULTISIG,proposal:proposalPda,transaction:transactionPda,member:JAY,anchorRemainingAccounts:accountMetas},squads.PROGRAM_ID);

    const setupTx=new Transaction({feePayer:JAY,recentBlockhash:latest.blockhash}).add(createIx,proposalCreateIx,approveIx);
    const executeTx=new Transaction({feePayer:JAY,recentBlockhash:latest.blockhash});
    if(topUp>0n)executeTx.add(SystemProgram.transfer({fromPubkey:JAY,toPubkey:vaultPda,lamports:Number(topUp)}));
    executeTx.add(executeIx);
    if(size(setupTx)>1232)throw new Error('Setup transaction too large: '+size(setupTx));
    if(size(executeTx)>1232)throw new Error('Execute transaction too large: '+size(executeTx));

    const setupSim=await simulate(setupTx,false);
    if(setupSim?.err)throw new Error('Setup simulation failed: '+JSON.stringify(setupSim.err));
    const direct=new Transaction({feePayer:JAY,recentBlockhash:latest.blockhash});
    if(topUp>0n)direct.add(SystemProgram.transfer({fromPubkey:JAY,toPubkey:vaultPda,lamports:Number(topUp)}));
    direct.add(...poolTx.instructions);
    const directSim=await simulate(direct,false);
    if(directSim?.err)throw new Error('Pool simulation failed: '+JSON.stringify(directSim.err));

    plan={JAY,MULTISIG,vaultPda,RVIV,rvivAta,nextIndex,transactionPda,proposalPda,positionNftPda,positionNftBump,pool,position,wrappedMessage,accountMetas,createIx,proposalCreateIx,approveIx,executeIx,topUp,jayBal,vaultBal,setupSig:null};
    const roughNeeded=0.021;
    if(jayBal<roughNeeded*1e9)throw new Error('Fee wallet balance is below the 0.021 SOL safety floor.');
    $('#proof').innerHTML='Mint: <b>'+RVIV.toBase58()+'</b><br>Price: <b>'+config.openingPriceSolPerRviv+' SOL/RVIV</b><br>Liquidity: <b>'+config.initialLiquidityRviv.toLocaleString()+' RVIV</b><br>Fee: <b>'+config.feeBps+' bps fixed</b><br>Dynamic fee: <b>OFF</b><br>LP lock: <b>100% permanent</b><br>Wallet SOL: <b>'+sol(jayBal)+'</b><br>Vault top-up: <b>'+sol(topUp)+'</b><br>Path: <b>2 wallet signatures</b>';
    status('MAINNET PREFLIGHT PASS ✅ No transaction has been broadcast yet.','good');
    $('#setup').disabled=false;
  }catch(e){
    status('PREFLIGHT BLOCKED: '+(e?.message||e),'bad');
    $('#preflight').disabled=false;
  }
}

async function signSend(tx,label){
  const latest=await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash=latest.blockhash;
  tx.lastValidBlockHeight=latest.lastValidBlockHeight;
  tx.feePayer=wallet.publicKey;
  const signed=await wallet.signTransaction(tx);
  const sim=await simulateSigned(signed);
  if(sim?.err)throw new Error(label+' signed simulation failed: '+JSON.stringify(sim.err));
  const sig=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:4,preflightCommitment:'confirmed'});
  const conf=await connection.confirmTransaction({signature:sig,blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight},'confirmed');
  if(conf.value.err)throw new Error(label+' confirmation failed: '+JSON.stringify(conf.value.err));
  return sig;
}
async function simulateSigned(tx){
  const wire=tx.serialize().toString('base64');
  const response=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'simulateTransaction',params:[wire,{encoding:'base64',sigVerify:true,replaceRecentBlockhash:false,commitment:'confirmed'}]})});
  const env=await response.json();
  if(env.error)throw new Error('RPC signed simulation error: '+JSON.stringify(env.error));
  return env.result?.value;
}

async function setupLaunch(){
  if(!plan)return preflight();
  $('#setup').disabled=true;
  try{
    status('SIGNATURE 1/2 — create + approve REVIVE launch proposal…');
    const tx=new Transaction().add(plan.createIx,plan.proposalCreateIx,plan.approveIx);
    const sig=await signSend(tx,'Setup');
    plan.setupSig=sig;
    localStorage.setItem('worldz_revival_launch_setup',JSON.stringify({index:plan.nextIndex.toString(),setupSig:sig,pool:plan.pool.toBase58(),at:new Date().toISOString()}));
    $('#sig1').textContent=sig;
    status('SIGNATURE 1/2 CONFIRMED ✅ Now execute the approved launch.','good');
    $('#execute').disabled=false;
  }catch(e){status('SETUP FAILED: '+(e?.message||e),'bad');$('#setup').disabled=false;}
}

async function executeLaunch(){
  if(!plan||!plan.setupSig)return status('Run Signature 1 first.','bad');
  $('#execute').disabled=true;
  try{
    status('SIGNATURE 2/2 — executing REVIVE pool creation + permanent LP lock…');
    const tx=new Transaction();
    if(plan.topUp>0n)tx.add(SystemProgram.transfer({fromPubkey:plan.JAY,toPubkey:plan.vaultPda,lamports:Number(plan.topUp)}));
    tx.add(plan.executeIx);
    const sig=await signSend(tx,'Execute');
    $('#sig2').textContent=sig;
    const poolInfo=await connection.getAccountInfo(plan.pool,'confirmed');
    if(!poolInfo)throw new Error('Execution confirmed but pool account was not found. Do not retry; verify signature '+sig);
    localStorage.removeItem('worldz_revival_launch_setup');
    status('REVIVE IS LIVE ✅ Pool '+plan.pool.toBase58(),'live');
    $('#proof').innerHTML+=' <br>Pool: <b>'+plan.pool.toBase58()+'</b><br>Launch signature: <b>'+sig+'</b>';
    $('#setup').disabled=true;$('#preflight').disabled=true;
  }catch(e){status('EXECUTION NOT COMPLETED: '+(e?.message||e),'bad');$('#execute').disabled=false;}
}

async function init(){
  try{
    config=await (await fetch('./launch-config.json?v=20260926a',{cache:'no-store'})).json();
    $('#price').textContent=config.openingPriceSolPerRviv+' SOL / RVIV';
    $('#mint').textContent=config.rvivMint;
  }catch(e){status('Launch config unavailable: '+e.message,'bad');}
}
$('#connect').addEventListener('click',connect);
$('#preflight').addEventListener('click',preflight);
$('#setup').addEventListener('click',setupLaunch);
$('#execute').addEventListener('click',executeLaunch);
init();
