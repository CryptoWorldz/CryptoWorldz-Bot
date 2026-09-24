import fs from 'node:fs';
import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';

const RPC=process.env.SOLANA_RPC_URL?.trim() || clusterApiUrl('devnet');
if(/mainnet/i.test(RPC)) throw new Error('MAINNET RPC FORBIDDEN');
const file=process.env.DEVNET_PAYER_KEYPAIR_FILE || '/tmp/revive-devnet-payer.json';
if(!fs.existsSync(file)) throw new Error('devnet payer keypair file missing');
const raw=JSON.parse(fs.readFileSync(file,'utf8'));
if(!Array.isArray(raw)||raw.length!==64) throw new Error('devnet payer keypair must contain 64 bytes');
const payer=Keypair.fromSecretKey(Uint8Array.from(raw));
const connection=new Connection(RPC,'confirmed');
const balance=await connection.getBalance(payer.publicKey,'confirmed');
const minimum=50_000_000;
if(balance<minimum){
  throw new Error('DEVNET_PAYER_NOT_FUNDED pubkey='+payer.publicKey.toBase58()+' balance_lamports='+balance+' required='+minimum);
}
console.log('REVIVE_DEVNET_PAYER_FUNDED=PASS pubkey='+payer.publicKey.toBase58()+' balance_lamports='+balance);
