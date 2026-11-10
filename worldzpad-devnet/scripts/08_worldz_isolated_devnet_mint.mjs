// WORLDZ isolated public Solana devnet mint rehearsal — no legacy WLDZ allocations.
import {Connection,Keypair,clusterApiUrl} from '@solana/web3.js';
import {TOKEN_2022_PROGRAM_ID,createMint,getMint,getOrCreateAssociatedTokenAccount,mintTo,setAuthority,AuthorityType,getAccount} from '@solana/spl-token';
import {writeFileSync,mkdirSync} from 'node:fs';
import {readFileSync} from 'node:fs';
const rpc=process.env.SOLANA_RPC_URL||clusterApiUrl('devnet');
if(!/devnet/i.test(rpc)&&process.env.WORLDZ_ALLOW_CUSTOM_DEVNET_RPC!=='yes')throw Error('Custom RPC must be explicitly acknowledged as Solana devnet');
// A funded, disposable devnet signer is required. Never print or upload its key.
const signerPath=String(process.env.WORLDZ_DEVNET_SIGNER_FILE||'').trim();
if(!signerPath)throw Error('DEVNET_SIGNER_REQUIRED: Set WORLDZ_DEVNET_SIGNER_FILE to a disposable funded devnet keypair file. Do not use a mainnet owner key or store the key in Git.');
const signerBytes=JSON.parse(readFileSync(signerPath,'utf8'));
if(!Array.isArray(signerBytes)||signerBytes.length!==64)throw Error('DEVNET_SIGNER_INVALID: Expected a 64-byte Solana keypair JSON file.');
const connection=new Connection(rpc,'confirmed'),payer=Keypair.fromSecretKey(Uint8Array.from(signerBytes)),mintKeypair=Keypair.generate();
const amount=1_000_000n,decimals=6; // Disposable TEST supply; NOT final $WORLDZ.
const balance=await connection.getBalance(payer.publicKey);
if(balance<50_000_000)throw Error('DEVNET_BALANCE_INSUFFICIENT: Fund disposable devnet address '+payer.publicKey.toBase58()+' with at least 0.05 devnet SOL via https://faucet.solana.com then rerun. No mint attempted.');
const mint=await createMint(connection,payer,payer.publicKey,null,decimals,mintKeypair,{commitment:'confirmed'},TOKEN_2022_PROGRAM_ID);
const ata=await getOrCreateAssociatedTokenAccount(connection,payer,mint,payer.publicKey,false,'confirmed',{commitment:'confirmed'},TOKEN_2022_PROGRAM_ID);
const mintSig=await mintTo(connection,payer,mint,ata.address,payer,amount*10n**BigInt(decimals),[],{commitment:'confirmed'},TOKEN_2022_PROGRAM_ID);
const revokeSig=await setAuthority(connection,payer,mint,payer,AuthorityType.MintTokens,null,[],{commitment:'confirmed'},TOKEN_2022_PROGRAM_ID);
const [m,a]=await Promise.all([getMint(connection,mint,'confirmed',TOKEN_2022_PROGRAM_ID),getAccount(connection,ata.address,'confirmed',TOKEN_2022_PROGRAM_ID)]);
if(m.supply!==amount*10n**BigInt(decimals)||a.amount!==m.supply||m.mintAuthority!==null||m.freezeAuthority!==null)throw Error('On-chain supply/authority verification failed');
const proof={network:'solana-devnet',status:'CONFIRMED_TEST_MINT',token:'WORLDZ_REHEARSAL_NOT_OFFICIAL',mint:mint.toBase58(),tokenAccount:ata.address.toBase58(),supply:amount.toString(),decimals,mintSig,revokeSig,freezeAuthority:null,mintAuthority:null,explorer:'https://explorer.solana.com/address/'+mint.toBase58()+'?cluster=devnet',mainnet:false};
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/worldz-solana-devnet-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof,null,2));
