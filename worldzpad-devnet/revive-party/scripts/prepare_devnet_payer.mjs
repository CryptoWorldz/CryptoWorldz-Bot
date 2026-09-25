import fs from 'node:fs';
import { Keypair } from '@solana/web3.js';

const path=process.env.DEVNET_PAYER_KEYPAIR_FILE || '/tmp/revive-devnet-payer.json';
const pubPath=process.env.DEVNET_PAYER_PUBKEY_FILE || '/tmp/revive-devnet-payer.pubkey';

// Fresh ephemeral key for this DEVNET-ONLY proof run.
// It exists only in the runner's temporary filesystem and must never be reused on mainnet.
const kp=Keypair.generate();

fs.writeFileSync(path,JSON.stringify(Array.from(kp.secretKey)),{mode:0o600});
fs.writeFileSync(pubPath,kp.publicKey.toBase58()+'\n');
console.log('REVIVE_DEVNET_PAYER='+kp.publicKey.toBase58());
console.log('REVIVE_DEVNET_PAYER_POLICY=EPHEMERAL_RANDOM_KEY__DEVNET_ONLY__NO_REAL_VALUE');
