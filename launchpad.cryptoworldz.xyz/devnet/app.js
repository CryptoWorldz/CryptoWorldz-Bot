import {
  Connection,Keypair,SystemProgram,Transaction,clusterApiUrl
} from 'https://esm.sh/@solana/web3.js@1.98.4?bundle';
import {
  TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,MINT_SIZE,AuthorityType,
  createInitializeMintInstruction,createAssociatedTokenAccountInstruction,
  createMintToInstruction,createSetAuthorityInstruction,getAssociatedTokenAddress
} from 'https://esm.sh/@solana/spl-token@0.4.14?bundle';

const $=s=>document.querySelector(s);
const connection=new Connection(clusterApiUrl('devnet'),'confirmed');
let wallet=null,checked=false;
const U64_MAX=18446744073709551615n;

function provider(){
  return [window.phantom&&window.phantom.solana,window.solflare,window.solana]
    .filter(Boolean).find(p=>typeof p.connect==='function'&&typeof p.signTransaction==='function')||null;
}
function setStatus(text,type=''){
  const el=$('#status');el.textContent=text;el.className='lab-status'+(type?' '+type:'');
}
function params(){
  return {
    name:$('#name').value.trim(),
    symbol:$('#symbol').value.trim().toUpperCase(),
    supply:$('#supply').value.trim(),
    decimals:Number($('#decimals').value),
    fixed:$('#fixed').checked
  };
}
function validate(){
  const p=params(),errors=[];
  if(p.name.length<2||p.name.length>32)errors.push('Token name must be 2–32 characters.');
  if(!/^[A-Z0-9_$]{2,10}$/.test(p.symbol))errors.push('Ticker must be 2–10 letters/numbers/$/_.');
  if(!/^\d+$/.test(p.supply)||BigInt(p.supply)<=0n)errors.push('Supply must be a positive whole number.');
  if(!Number.isInteger(p.decimals)||p.decimals<0||p.decimals>9)errors.push('Decimals must be 0–9.');
  if(!errors.length){
    const amount=BigInt(p.supply)*(10n**BigInt(p.decimals));
    if(amount>U64_MAX)errors.push('Supply × decimals exceeds the SPL Token u64 mint limit.');
  }
  checked=!errors.length;
  $('#launch').disabled=!checked;
  $('#mint-rule').textContent=p.fixed?'Revoked after mint':'Connected wallet retains mint authority';
  setStatus(errors.length?'CHECK FAILED\n• '+errors.join('\n• '):'LOCAL CHECKS PASS ✅\nNetwork: Solana Devnet\nToken: '+p.name+' ($'+p.symbol+')\nSupply: '+p.supply+'\nDecimals: '+p.decimals+'\nMint authority: '+(p.fixed?'revoke after initial mint':'retain in connected wallet'),'');
  return checked;
}
async function connect(){
  wallet=provider();
  if(!wallet){setStatus('No compatible injected Solana wallet found. Open this page inside Phantom/Solflare on mobile or enable a wallet extension on desktop.','bad');return false;}
  try{
    const r=await wallet.connect(),key=(r&&r.publicKey)||wallet.publicKey;
    if(!key)throw new Error('No public key returned');
    $('#wallet-button').textContent=key.toString().slice(0,4)+'…'+key.toString().slice(-4);
    $('#wallet-button').classList.add('connected');
    return true;
  }catch(e){setStatus('Wallet connection cancelled or unavailable.','bad');return false;}
}
async function createDevnetToken(){
  if(!validate())return;
  if(!wallet||!wallet.publicKey){if(!await connect())return;}
  const p=params();
  const owner=wallet.publicKey;
  const mintKeypair=Keypair.generate();
  $('#launch').disabled=true;$('#check').disabled=true;
  setStatus('BUILDING DEVNET TRANSACTION…\nNo transaction has been broadcast.','');
  try{
    const rent=await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
    const ata=await getAssociatedTokenAddress(mintKeypair.publicKey,owner,false,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
    const amount=BigInt(p.supply)*(10n**BigInt(p.decimals));
    const tx=new Transaction();
    tx.add(
      SystemProgram.createAccount({
        fromPubkey:owner,
        newAccountPubkey:mintKeypair.publicKey,
        space:MINT_SIZE,
        lamports:rent,
        programId:TOKEN_PROGRAM_ID
      }),
      createInitializeMintInstruction(mintKeypair.publicKey,p.decimals,owner,null,TOKEN_PROGRAM_ID),
      createAssociatedTokenAccountInstruction(owner,ata,owner,mintKeypair.publicKey,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID),
      createMintToInstruction(mintKeypair.publicKey,ata,owner,amount,[],TOKEN_PROGRAM_ID)
    );
    if(p.fixed){
      tx.add(createSetAuthorityInstruction(mintKeypair.publicKey,owner,AuthorityType.MintTokens,null,[],TOKEN_PROGRAM_ID));
    }
    const latest=await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash=latest.blockhash;tx.lastValidBlockHeight=latest.lastValidBlockHeight;tx.feePayer=owner;
    tx.partialSign(mintKeypair);

    setStatus('WAITING FOR WALLET SIGNATURE…\nThis signature is for a Solana DEVNET token-creation transaction only.','');
    const signed=await wallet.signTransaction(tx);

    setStatus('SIMULATING SIGNED TRANSACTION BEFORE BROADCAST…','');
    const sim=await connection.simulateTransaction(signed,{sigVerify:true});
    if(sim.value.err){
      throw new Error('Devnet simulation failed: '+JSON.stringify(sim.value.err)+(sim.value.logs?'\n'+sim.value.logs.slice(-5).join('\n'):''));
    }

    setStatus('SIMULATION PASS ✅\nBroadcasting to Solana Devnet…','good');
    const signature=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:3,preflightCommitment:'confirmed'});
    const confirmation=await connection.confirmTransaction({signature,blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight},'confirmed');
    if(confirmation.value.err)throw new Error('Transaction confirmation failed: '+JSON.stringify(confirmation.value.err));

    $('#mint').textContent=mintKeypair.publicKey.toString();
    $('#signature').textContent=signature;
    $('#explorer').href='https://explorer.solana.com/address/'+mintKeypair.publicKey.toString()+'?cluster=devnet';
    $('#result').classList.add('show');
    setStatus('WORLDZLAUNCHPAD DEVNET TOKEN CREATED ✅\nMint: '+mintKeypair.publicKey.toString()+'\nSupply minted to: '+ata.toString()+'\nMint authority: '+(p.fixed?'REVOKED':'CONNECTED WALLET')+'\nFreeze authority: NONE','good');
  }catch(e){
    console.error(e);setStatus('DEVNET LAUNCH FAILED\n'+(e&&e.message?e.message:String(e)),'bad');
  }finally{
    $('#check').disabled=false;$('#launch').disabled=!checked;
  }
}
function loadQuery(){
  const q=new URLSearchParams(location.search);
  if(q.get('name'))$('#name').value=q.get('name');
  if(q.get('symbol'))$('#symbol').value=q.get('symbol');
  if(q.get('supply'))$('#supply').value=q.get('supply');
  if(q.get('decimals'))$('#decimals').value=q.get('decimals');
  if(q.has('fixed'))$('#fixed').checked=q.get('fixed')==='1';
  const meta=[];
  if(q.get('intent'))meta.push('Intent: '+q.get('intent').slice(0,16)+'…');
  if(q.get('engine'))meta.push('Engine design: '+q.get('engine'));
  if(q.get('quote'))meta.push('Quote design: '+q.get('quote'));
  if(q.get('fee'))meta.push('Project fee design: '+q.get('fee')+'%');
  if(meta.length)setStatus('WORLDZLAUNCHPAD MANIFEST LOADED\n'+meta.join('\n')+'\n\nRun Local Checks before creating the Devnet mint.');
  $('#mint-rule').textContent=$('#fixed').checked?'Revoked after mint':'Connected wallet retains mint authority';
}
$('#wallet-button').addEventListener('click',connect);
$('#check').addEventListener('click',validate);
$('#launch').addEventListener('click',createDevnetToken);
['#name','#symbol','#supply','#decimals','#fixed'].forEach(id=>$(id).addEventListener('input',()=>{$('#launch').disabled=true;checked=false;}));
loadQuery();
