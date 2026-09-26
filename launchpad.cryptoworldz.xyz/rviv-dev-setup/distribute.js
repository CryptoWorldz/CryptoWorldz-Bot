const RPC='https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const OWNER='Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u',MULTISIG='B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN';
const VAULT='n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB',MINT='DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R';
const SOURCE_ATA='28CwdVt2y997WZqTzEuBpuwoyVYAj6JcaD4qDMzyCdtn',RAW=4285714285714n,TOTAL=RAW*7n;
const RECIPIENTS=[
 ['Limited Edition','5HiRrJRU1fyW5eXzHgvSgykBZ6PtrSVzg8A1e8eHB1u9'],
 ['Next Big Coin Dev','3jA7TFbW6h8q75mWpYxkAiAntRm16z9ZRnLiZkjFCTdt'],
 ['PdCrew','DgsWus6bxAMck9eXmS7V3tVNp8n7DinPQrEVexdju94j'],
 ['Purple Diamond Crew','ABmLL6XyNZPBQ5LZpg6DoxqtzHTCUufWUNMkbFfFh53U'],
 ['Purple PDC','G35RixuDLj8NQJ7c8wnKF4Hc518nbYxp1cZwGL5wJTG3'],
 ['SolSavewXRP','5BbgurmtXVr1tohm6NTYU8pmM4n7xQVqp9DTKePN1UW9'],
 ['JayJayTeamDev',OWNER]
];
const $=s=>document.querySelector(s),stop=s=>{throw Error(s)},status=s=>{$('#status').textContent=s};
let depsCache,ctx,state;
$('#recipients').replaceChildren(...RECIPIENTS.map(([name,wallet])=>{const li=document.createElement('li');li.textContent=name+' — '+wallet+' — 4,285,714.285714 RVIV';return li}));
function disable(){for(const key of ['#create','#approve','#execute'])$(key).disabled=true}
async function deps(){
 if(depsCache)return depsCache;
 const b=await import('https://esm.sh/buffer@6.0.3?bundle');globalThis.Buffer??=b.Buffer;
 const [web3,spl,sqds,walletApp]=await Promise.all([
  import('https://esm.sh/@solana/web3.js@1.98.4?bundle'),
  import('https://esm.sh/@solana/spl-token@0.4.15?bundle&deps=@solana/web3.js@1.98.4'),
  import('https://esm.sh/@sqds/multisig@2.1.4?bundle&deps=@solana/web3.js@1.98.4'),
  import('https://esm.sh/@wallet-standard/app@1.1.0?bundle')
 ]);return depsCache={web3,spl,sqds,walletApp};
}
async function connect(){
 const d=await deps();
 const wallets=d.walletApp.getWallets().get().filter(w=>w.chains?.includes('solana:mainnet')&&w.features?.['standard:connect']&&w.features?.['solana:signTransaction']);
 if(wallets.length){const wallet=wallets.find(w=>/jupiter/i.test(w.name))||wallets[0];const result=await wallet.features['standard:connect'].connect();
  const account=(result?.accounts||wallet.accounts||[]).find(a=>a.address===OWNER&&a.chains?.includes('solana:mainnet'));
  if(!account)stop('Connect the JayJayTeamDev mainnet wallet.');ctx={kind:'standard',wallet,account};
 }else{const provider=[window.jupiter?.solana,window.phantom?.solana,window.solflare,window.solana].find(p=>p?.connect&&p?.signTransaction);
  if(!provider)stop('Open inside Jupiter Wallet, Phantom or Solflare.');const result=await provider.connect();
  if(String(result?.publicKey||provider.publicKey||'')!==OWNER)stop('Connect JayJayTeamDev.');ctx={kind:'injected',provider};
 }disable();state=null;status('Owner connected. Check live Squads state.');
}
async function rpc(method,params){const response=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});const out=await response.json();if(!response.ok||out.error)stop('RPC failed: '+JSON.stringify(out.error||response.status));return out.result}
function exact(d,s){
 return RECIPIENTS.map(([,wallet])=>d.spl.createTransferCheckedInstruction(s.sourceAta,s.mint,d.spl.getAssociatedTokenAddressSync(s.mint,new d.web3.PublicKey(wallet),true,d.spl.TOKEN_PROGRAM_ID),s.vault,RAW,6,[],d.spl.TOKEN_PROGRAM_ID));
}
async function transactionFingerprint(conn,d,s){
 const [txPda]=d.sqds.getTransactionPda({multisigPda:s.ms,index:s.next});
 const info=await conn.getAccountInfo(txPda,'confirmed');
 if(!info?.owner.equals(d.sqds.PROGRAM_ID))stop('Squads vault transaction missing or changed owner.');
 const bytes=await crypto.subtle.digest('SHA-256',new Uint8Array(info.data));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
async function check(){
 if(!ctx)stop('Connect JayJayTeamDev first.');disable();state=null;
 const d=await deps(),conn=new d.web3.Connection(RPC,'confirmed');
 if(await conn.getGenesisHash()!=='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d')stop('Wrong network.');
 const ms=new d.web3.PublicKey(MULTISIG),vault=new d.web3.PublicKey(VAULT),mint=new d.web3.PublicKey(MINT),owner=new d.web3.PublicKey(OWNER);
 if(!d.sqds.getVaultPda({multisigPda:ms,index:0})[0].equals(vault))stop('Squads vault derivation mismatch.');
 const account=await d.sqds.accounts.Multisig.fromAccountAddress(conn,ms,'confirmed');
 if(Number(account.threshold)!==1)stop('Squads threshold changed.');
 const member=account.members.find(x=>x.key.equals(owner));
 if(!member||![1,2,4].every(bit=>(Number(member.permissions.mask)&bit)!==0))stop('JayJayTeamDev lacks Squads Initiate, Vote or Execute permission.');
 const mintInfo=await d.spl.getMint(conn,mint,'confirmed',d.spl.TOKEN_PROGRAM_ID);
 if(mintInfo.decimals!==6||mintInfo.supply!==200000000000000n||mintInfo.mintAuthority||mintInfo.freezeAuthority)stop('Canonical RVIV mint changed.');
 const sourceAta=d.spl.getAssociatedTokenAddressSync(mint,vault,true,d.spl.TOKEN_PROGRAM_ID);
 if(sourceAta.toBase58()!==SOURCE_ATA)stop('Source token account mismatch.');
 const source=await d.spl.getAccount(conn,sourceAta,'confirmed',d.spl.TOKEN_PROGRAM_ID);
 if(source.amount<TOTAL)stop('Squads vault lacks 30M RVIV.');
 const atas=RECIPIENTS.map(([,w])=>d.spl.getAssociatedTokenAddressSync(mint,new d.web3.PublicKey(w),true,d.spl.TOKEN_PROGRAM_ID));
 const info=await conn.getMultipleAccountsInfo(atas,'confirmed');
 if(info.some(x=>!x||!x.owner.equals(d.spl.TOKEN_PROGRAM_ID)))stop('A Dev token account is missing or owned by the wrong program. Create the three missing accounts first.');
 const balance=await conn.getBalance(owner,'confirmed');
 const next=BigInt(account.transactionIndex.toString())+1n;
 const [txPda]=d.sqds.getTransactionPda({multisigPda:ms,index:next});
 if(await conn.getAccountInfo(txPda,'confirmed'))stop('Next Squads transaction index already occupied. Recheck.');
 state={d,conn,owner,ms,vault,mint,sourceAta,next,balance};
 $('#review').textContent=`RVIV mint: ${MINT}\nSquads source: ${VAULT}\nSource balance: ${Number(source.amount)/1e6} RVIV\nNext Squads index: ${next}\nSeven destinations: ${RECIPIENTS.length}, token accounts ready: ${info.filter(Boolean).length}\nEach transfer: 4,285,714.285714 RVIV\nTotal: 29,999,999.999998 RVIV\nDev division remainder reserved: 0.000002 RVIV\nOwner SOL: ${balance/1e9}\nNo transfer to Remedy.\n\nA proposal, approval and execution each require a separate reviewed wallet signature.`;
 $('#create').disabled=false;status('Seven-wallet state verified. Create only the exact reviewed proposal.');
}
async function send(ixs,label,s){
 const {d,conn,owner}=s,latest=await conn.getLatestBlockhash('confirmed');
 const tx=new d.web3.Transaction({feePayer:owner,recentBlockhash:latest.blockhash}).add(...ixs);
 const raw=tx.serialize({requireAllSignatures:false,verifySignatures:false});
 if(raw.length>1232)stop(label+' exceeds Solana transaction size.');
 const fee=(await conn.getFeeForMessage(tx.compileMessage(),'confirmed')).value;
 const balance=await conn.getBalance(owner,'confirmed');
 if(fee===null||balance<fee)stop(label+' network fee unavailable or balance too low.');
 const sim=await rpc('simulateTransaction',[Buffer.from(raw).toString('base64'),{encoding:'base64',sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed',accounts:{encoding:'base64',addresses:[OWNER]}}]);
 if(sim?.value?.err)stop(label+' dry-run failed: '+JSON.stringify(sim.value.err));
 const after=sim?.value?.accounts?.[0]?.lamports;
 if(!Number.isSafeInteger(after)||after<0||after>balance)stop(label+' cannot quote Squads account rent; nothing signed.');
 const debit=balance-after;
 if(balance<debit+fee)stop(label+' SOL balance cannot cover simulated debit and network fee.');
 const message=tx.compileMessage().serialize().toString('hex');
 $('#review').textContent+=`\n\n${label}\nSimulated owner SOL debit: ${debit/1e9} SOL\nAdditional quoted network fee: ${fee/1e9} SOL\nMaximum reviewed debit for this step: ${(debit+fee)/1e9} SOL\nTransaction bytes: ${raw.length}\nSimulation: passed.`;
 status(label+' simulated. Check the cost and exact wallet transaction.');
 let signed;
 if(ctx.kind==='standard'){const output=await ctx.wallet.features['solana:signTransaction'].signTransaction({account:ctx.account,transaction:new Uint8Array(raw)});
  if(!output?.[0]?.signedTransaction)stop('Wallet did not sign.');signed=d.web3.Transaction.from(new Uint8Array(output[0].signedTransaction));
 }else signed=await ctx.provider.signTransaction(tx);
 if(!signed||signed.compileMessage().serialize().toString('hex')!==message||!signed.verifySignatures())stop('Wallet signature/message mismatch; not submitted.');
 const signature=await conn.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:3});
 const result=await conn.confirmTransaction({signature,blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight},'confirmed');
 if(result.value.err)stop(label+' failed on-chain: '+JSON.stringify(result.value.err));
 status(label+' confirmed: '+signature);return signature;
}
async function create(){
 const s=state;if(!s)stop('Run the live check first.');disable();
 const latest=await s.conn.getLatestBlockhash('confirmed');
 const message=new s.d.web3.TransactionMessage({payerKey:s.vault,recentBlockhash:latest.blockhash,instructions:exact(s.d,s)});
 const ix=s.d.sqds.instructions.vaultTransactionCreate({multisigPda:s.ms,transactionIndex:s.next,creator:s.owner,rentPayer:s.owner,vaultIndex:0,ephemeralSigners:0,transactionMessage:message,memo:'RVIV seven owner Dev shares 4285714.285714 each'});
 const proposal=s.d.sqds.instructions.proposalCreate({multisigPda:s.ms,transactionIndex:s.next,creator:s.owner,rentPayer:s.owner,isDraft:true});
 await send([ix,proposal],'Create exact seven-share Squads proposal',s);
 s.transactionFingerprint=await transactionFingerprint(s.conn,s.d,s);
 $('#approve').disabled=false;$('#review').textContent+='\nProposal created at Squads index '+s.next+'. Recheck every step in your wallet.';
}
async function approve(){
 const s=state;if(!s)stop('Run the live check.');disable();
 if(!s.transactionFingerprint||await transactionFingerprint(s.conn,s.d,s)!==s.transactionFingerprint)stop('Squads vault transaction changed; stop.');
 const [pda]=s.d.sqds.getProposalPda({multisigPda:s.ms,transactionIndex:s.next});
 const p=await s.d.sqds.accounts.Proposal.fromAccountAddress(s.conn,pda,'confirmed');
 const kind=String(p.status?.__kind||'');
 if(!['Draft','Active'].includes(kind))stop('Unexpected proposal state: '+kind);
 const instructions=kind==='Draft'?[s.d.sqds.instructions.proposalActivate({multisigPda:s.ms,transactionIndex:s.next,member:s.owner})]:[];
 instructions.push(s.d.sqds.instructions.proposalApprove({multisigPda:s.ms,transactionIndex:s.next,member:s.owner,memo:'Owner approves seven equal RVIV Dev transfers'}));
 await send(instructions,'Approve seven-share Squads proposal',s);$('#execute').disabled=false;
}
async function execute(){
 const s=state;if(!s)stop('Run the live check.');disable();
 if(!s.transactionFingerprint||await transactionFingerprint(s.conn,s.d,s)!==s.transactionFingerprint)stop('Squads vault transaction changed; stop.');
 const [pda]=s.d.sqds.getProposalPda({multisigPda:s.ms,transactionIndex:s.next});
 const p=await s.d.sqds.accounts.Proposal.fromAccountAddress(s.conn,pda,'confirmed');
 if(String(p.status?.__kind)!=='Approved')stop('Squads proposal is not approved.');
 const built=await s.d.sqds.instructions.vaultTransactionExecute({connection:s.conn,multisigPda:s.ms,transactionIndex:s.next,member:s.owner});
 if(built.lookupTableAccounts?.length)stop('Unexpected lookup tables. Review anew.');
 await send([built.instruction],'Execute seven equal RVIV Dev transfers',s);
 const source=await s.d.spl.getAccount(s.conn,s.sourceAta,'confirmed',s.d.spl.TOKEN_PROGRAM_ID);
 status('Seven Dev transfers submitted. Remaining Squads vault: '+Number(source.amount)/1e6+' RVIV. Verify all seven receipts on-chain.');
}
for(const [selector,fn] of [['#connect',connect],['#check',check],['#create',create],['#approve',approve],['#execute',execute]]){
 $(selector).addEventListener('click',async()=>{const button=$(selector);button.disabled=true;try{await fn()}catch(e){disable();state=null;status('STOP: '+(e?.message||e))}finally{if(['#connect','#check'].includes(selector))button.disabled=false}});
}
