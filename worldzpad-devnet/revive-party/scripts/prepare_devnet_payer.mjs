import fs from 'node:fs';
import { Keypair } from '@solana/web3.js';

const path=process.env.DEVNET_PAYER_KEYPAIR_FILE || '/tmp/revive-devnet-payer.json';
const kp=Keypair.generate();
fs.writeFileSync(path,JSON.stringify(Array.from(kp.secretKey)));
console.log('REVIVE_DEVNET_PAYER='+kp.publicKey.toBase58());
