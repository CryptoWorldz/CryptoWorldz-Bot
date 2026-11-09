// WORLDZ isolated public Solana devnet mint rehearsal — no legacy WLDZ allocations.
import {Connection,Keypair,clusterApiUrl,LAMPORTS_PER_SOL} from '@solana/web3.js';
import {TOKEN_2022_PROGRAM_ID,createMint,getMint,getOrCreateAssociatedTokenAccount,mintTo,setAuthority,AuthorityType,getAccount} from '@solana/spl-token';
import {writeFileSync,mkdirSync} from 'node:fs';
const rpc=process.env.SOLANA_RPC_URL||clusterApiUrl('devnet');
if(!/devnet/i.test(rpc)&&process.env.WORLDZ_ALLOW_CUSTOM_DEVNET_RPC!=='yes')throw Error('Custom RPC must be explicitly acknowledged as Solana devnet');
const connection=new Connection(rpc,'confirmed'),payer=Keypair.generate(),mintKeypair=Keypair.generate();
const amount=1_000_000n,decimals=6; // Disposable TEST supply; NOT final $WORLDZ.
const balance=await connection.getBalance(payer.publicKey);
if(balance<50_000_000){const sig=await connection.requestAirdrop(payer.publicKey,Math.floor(0.3*LAMPORTS_PER_SOL));await connection.confirmTransaction(sig,'confirmed')}
if(await connection.getBalance(payer.publicKey)<50_000_000)throw Error('Devnet faucet funding unavailable');
const mint=await createMint(connection,payer,payer.publicKey,null,decimals,mintKeypair,{commitment:'confirmed'},TOKEN_2022_PROGRAM_ID);
const ata=await getOrCreateAssociatedTokenAccount(connection,payer,mint,payer.publicKey,false,'confirmed',{commitment:'confirmed'},TOKEN_2022_PROGRAM_ID);
const mintSig=await mintTo(connection,payer,mint,ata.address,payer,amount*10n**BigInt(decimals),[],{commitment:'confirmed'},TOKEN_2022_PROGRAM_ID);
const revokeSig=await setAuthority(connection,payer,mint,payer,AuthorityType.MintTokens,null,[],{commitment:'confirmed'},TOKEN_2022_PROGRAM_ID);
const [m,a]=await Promise.all([getMint(connection,mint,'confirmed',TOKEN_2022_PROGRAM_ID),getAccount(connection,ata.address,'confirmed',TOKEN_2022_PROGRAM_ID)]);
if(m.supply!==amount*10n**BigInt(decimals)||a.amount!==m.supply||m.mintAuthority!==null||m.freezeAuthority!==null)throw Error('On-chain supply/authority verification failed');
const proof={network:'solana-devnet',status:'CONFIRMED_TEST_MINT',token:'WORLDZ_REHEARSAL_NOT_OFFICIAL',mint:mint.toBase58(),tokenAccount:ata.address.toBase58(),supply:amount.toString(),decimals,mintSig,revokeSig,freezeAuthority:null,mintAuthority:null,explorer:'https://explorer.solana.com/address/'+mint.toBase58()+'?cluster=devnet',mainnet:false};
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/worldz-solana-devnet-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof,null,2));
