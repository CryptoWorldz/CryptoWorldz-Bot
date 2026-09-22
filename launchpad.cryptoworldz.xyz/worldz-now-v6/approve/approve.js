import {Connection,PublicKey,TransactionMessage,VersionedTransaction} from 'https://esm.sh/@solana/web3.js@1.98.4?bundle';
import {getWallets} from 'https://esm.sh/@wallet-standard/app@1.1.0?bundle';
import * as multisig from 'https://esm.sh/@sqds/multisig@2.1.4?bundle';

const RPC='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const MULTISIG='B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN';
const connection=new Connection(RPC,'confirmed');
const $=s=>document.querySelector(s);
const set=(text,type='warn')=>{const e=$('#status');e.textContent=text;e.className='status '+type;};
const msPk=()=>new PublicKey(MULTISIG);
let wallet=null,member=null,target=null,busy=false;

function showMobileHandoff(){
  const targetUrl=new URL(location.href);
  targetUrl.searchParams.set('v','20260922-stepper-mobile-3');
  const target=encodeURIComponent(targetUrl.toString());
  const ref=encodeURIComponent(location.origin);
  $('#open-phantom').href='https://phantom.app/ul/browse/'+target+'?ref='+ref;
  $('#open-solflare').href='https://solflare.com/ul/v1/browse/'+target+'?ref='+ref;
  $('#mobile-handoff').style.display='block';
}
function hideMobileHandoff(){$('#mobile-handoff').style.display='none';}

function injected(){
  return [window.jupiter?.solana,window.phantom?.solana,window.solflare,window.solana]
    .filter(Boolean)
    .find(p=>typeof p.connect==='function'&&typeof p.signTransaction==='function')||null;
}
async function connect(){
  try{
    set('Opening your signer wallet…');
    const available=getWallets().get().filter(w=>w?.features?.['standard:connect']&&w?.features?.['solana:signTransaction']&&w?.chains?.some(c=>String(c).startsWith('solana:')));
    const standard=available.find(w=>/jupiter/i.test(w.name))||available[0];
    if(standard){
      const out=await standard.features['standard:connect'].connect();
      const a=(out?.accounts||standard.accounts||[])[0];
      if(!a)throw new Error('Wallet did not return an account.');
      wallet={kind:'standard',adapter:standard,account:a,publicKey:new PublicKey(a.address),name:standard.name};
    }else{
      const provider=injected();
      if(provider){
        const out=await provider.connect();
        const key=(out&&out.publicKey)||provider.publicKey;
        if(!key)throw new Error('Wallet did not return a public key.');
        wallet={kind:'injected',adapter:provider,publicKey:new PublicKey(key.toString()),name:'Solana Wallet'};
      }else{
        showMobileHandoff();
        throw new Error('Choose PHANTOM or SOLFLARE below. It will reopen this exact approval page inside the wallet that holds the current WORLDZ Treasury signer.');
      }
    }
    hideMobileHandoff();
    member=wallet.publicKey;
    const ma=await multisig.accounts.Multisig.fromAccountAddress(connection,msPk(),'confirmed');
    if(!ma.members.some(m=>m.key.equals(member)))throw new Error('This wallet is not one of the current WORLDZ Treasury signers.');
    target=await findActiveWorldzProposal(ma);
    if(target.proposal.pretty().status!=='Active')throw new Error('The active WORLDZ proposal is already '+target.proposal.pretty().status+'. No further approval is needed.');
    if(target.proposal.approved.some(k=>k.equals(member)))throw new Error('This wallet has already approved the active WORLDZ proposal.');
    $('#connect').textContent='CONNECTED: '+wallet.name;
    $('#approve').disabled=false;
    set('SIGNER READY ✅\nWallet: '+member.toBase58()+'\nProposal: '+target.proposalPda.toBase58()+'\nBatch: '+target.index.toString()+'\n\nPress APPROVE WORLDZ PROPOSAL once.','ok');
  }catch(e){
    wallet=null;member=null;target=null;$('#approve').disabled=true;
    set('CONNECTION STOPPED\n'+(e?.message||String(e)),'bad');
  }
}
async function findActiveWorldzProposal(ma){
  const current=multisig.utils.toBigInt(ma.transactionIndex);
  const indexes=[current+1n,current];
  for(let n=1n;n<=32n;n++)if(current>=n)indexes.push(current-n);
  const matches=[];
  for(const index of [...new Set(indexes.map(String))].map(BigInt)){
    const [batchPda]=multisig.getTransactionPda({multisigPda:msPk(),index});
    const [proposalPda]=multisig.getProposalPda({multisigPda:msPk(),transactionIndex:index});
    try{
      const [batch,proposal]=await Promise.all([
        multisig.accounts.Batch.fromAccountAddress(connection,batchPda,'confirmed'),
        multisig.accounts.Proposal.fromAccountAddress(connection,proposalPda,'confirmed')
      ]);
      const status=proposal.pretty().status;
      if(Number(batch.size)===3&&Number(batch.executedTransactionIndex)<3&&(status==='Active'||status==='Approved'))matches.push({index,batch,proposal,proposalPda});
    }catch{}
  }
  if(matches.length===0)throw new Error('No active 3-leg WORLDZ proposal was found. The proposal may have expired or already executed.');
  if(matches.length>1)throw new Error('More than one unexecuted 3-leg proposal was found. Do not approve from this page until the owner supplies the correct proposal.');
  return matches[0];
}
async function sign(tx){
  if(wallet.kind==='standard'){
    const out=await wallet.adapter.features['solana:signTransaction'].signTransaction({account:wallet.account,transaction:new Uint8Array(tx.serialize())});
    const wire=out?.[0]?.signedTransaction;
    if(!wire)throw new Error('Wallet did not return a signed transaction.');
    return VersionedTransaction.deserialize(wire);
  }
  return wallet.adapter.signTransaction(tx);
}
async function approve(){
  if(busy||!wallet||!target)return;
  busy=true;$('#approve').disabled=true;
  try{
    for(let attempt=1;attempt<=3;attempt++){
      const latest=await connection.getLatestBlockhash('confirmed');
      const ix=multisig.instructions.proposalApprove({multisigPda:msPk(),transactionIndex:target.index,member});
      const tx=new VersionedTransaction(new TransactionMessage({payerKey:member,recentBlockhash:latest.blockhash,instructions:[ix]}).compileToV0Message());
      set('Approve in your wallet now. Attempt '+attempt+'/3.');
      const signed=await sign(tx);
      if(await connection.getBlockHeight('confirmed')>=latest.lastValidBlockHeight-20)continue;
      const sim=await connection.simulateTransaction(signed,{sigVerify:true,commitment:'confirmed'});
      if(sim.value.err)throw new Error('Approval simulation failed: '+JSON.stringify(sim.value.err));
      const signature=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:5,preflightCommitment:'confirmed'});
      for(let i=0;i<40;i++){
        const state=(await connection.getSignatureStatuses([signature],{searchTransactionHistory:true}))?.value?.[0];
        if(state?.err)throw new Error('On-chain approval failed: '+JSON.stringify(state.err));
        if(state&&(state.confirmationStatus==='confirmed'||state.confirmationStatus==='finalized')){
          $('#approve').textContent='APPROVAL RECORDED ✅';
          set('APPROVAL RECORDED ON-CHAIN ✅\nSignature: '+signature+'\n\nThe WORLDZ proposal now has this signer’s approval.','ok');
          return;
        }
        await new Promise(r=>setTimeout(r,1100));
      }
    }
    throw new Error('The approval could not confirm before the transaction blockhash expired. Press the button once more.');
  }catch(e){
    set('APPROVAL STOPPED\n'+(e?.message||String(e))+'\n\nNo token transfer or execution was submitted by this page.','bad');
    $('#approve').disabled=false;
  }finally{busy=false;}
}
$('#connect').addEventListener('click',connect);
$('#approve').addEventListener('click',approve);
