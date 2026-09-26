import fs from 'node:fs';
import crypto from 'node:crypto';
import { Keypair } from '@solana/web3.js';

const path=process.env.DEVNET_PAYER_KEYPAIR_FILE || '/tmp/revive-devnet-payer.json';
const pubPath=process.env.DEVNET_PAYER_PUBKEY_FILE || '/tmp/revive-devnet-payer.pubkey';

// Intentionally deterministic and PUBLIC DEVNET-ONLY test infrastructure.
// This lets external devnet faucets fund the same test payer between CI runs.
// Never use this address or key on mainnet and never send assets of real value to it.
const seedLabel='WorldzLaunchPad::REVIVE::DEVNET_ONLY::PAYER::v1';
const seed=crypto.createHash('sha256').update(seedLabel,'utf8').digest().subarray(0,32);
const kp=Keypair.fromSeed(seed);

fs.writeFileSync(path,JSON.stringify(Array.from(kp.secretKey)),{mode:0o600});
fs.writeFileSync(pubPath,kp.publicKey.toBase58()+'\n');
console.log('REVIVE_DEVNET_PAYER='+kp.publicKey.toBase58());
console.log('REVIVE_DEVNET_PAYER_POLICY=PERSISTENT_PUBLIC_TEST_KEY__DEVNET_ONLY__NO_REAL_VALUE');
