import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { NATIVE_MINT, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { CpAmm, CollectFeeMode } from '@meteora-ag/cp-amm-sdk';

const RPC = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
const connection = new Connection(RPC, 'confirmed');
const programId = new PublicKey('cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG');
const account = await connection.getAccountInfo(programId, 'confirmed');
if (!account) throw new Error('Meteora DAMM v2 program account not found on devnet');
if (!account.executable) throw new Error('Meteora DAMM v2 account is not executable');
if (CollectFeeMode.OnlyB !== 1) throw new Error(`OnlyB enum mismatch: ${CollectFeeMode.OnlyB}`);

const cpAmm = new CpAmm(connection);
if (!cpAmm) throw new Error('CpAmm SDK failed to initialize');

console.log(`METEORA_DEVNET_PREFLIGHT=PASS program=${programId.toBase58()} onlyB=${CollectFeeMode.OnlyB} tokenAProgram=${TOKEN_2022_PROGRAM_ID.toBase58()} tokenB=${NATIVE_MINT.toBase58()}`);
