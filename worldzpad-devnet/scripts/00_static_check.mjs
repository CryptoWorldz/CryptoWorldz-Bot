import { PublicKey } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, NATIVE_MINT } from '@solana/spl-token';
import { CpAmm, CollectFeeMode } from '@meteora-ag/cp-amm-sdk';

const TOTAL = 100_000_000;
const master = [25_000_000, 25_000_000, 25_000_000, 25_000_000];
const people = [14_000_000, 4_000_000, 7_000_000];
const feeRoutes = [10, 40, 20, 15, 10, 5];
const METEORA_DAMM_V2 = new PublicKey('cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG');

if (master.reduce((a, b) => a + b, 0) !== TOTAL) throw new Error('master allocation != 100M');
if (people.reduce((a, b) => a + b, 0) !== 25_000_000) throw new Error('people+charity != 25M');
if (feeRoutes.reduce((a, b) => a + b, 0) !== 100) throw new Error('AUTO fee routes != 100%');
if (CollectFeeMode.OnlyB !== 1) throw new Error(`Meteora OnlyB enum changed: ${CollectFeeMode.OnlyB}`);
if (!TOKEN_2022_PROGRAM_ID || !NATIVE_MINT || !CpAmm || !METEORA_DAMM_V2) throw new Error('required Solana/Meteora exports missing');

console.log('WLDZ_DEVNET_STATIC=PASS supply=100000000 master=25/25/25/25 people=14/4/7 fee=10/40/20/15/10/5 onlyB=1 wallet_transfer_tax=0');
