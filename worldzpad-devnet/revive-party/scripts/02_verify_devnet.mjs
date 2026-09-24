import fs from 'node:fs';
import {
  Connection, PublicKey, clusterApiUrl
} from '@solana/web3.js';
import { MAGIC } from './common.mjs';

const report=JSON.parse(fs.readFileSync('artifacts/revive-dbc-devnet-proof.json','utf8'));
if(report.network!=='devnet'||report.mainnetExecution!==false)throw new Error('network safety proof failed');
if(report.fee.grossBps!==75||report.fee.dynamic!==false)throw new Error('DBC fee proof mismatch');
if(report.fee.creatorControlledPercent!==51||report.fee.partnerControlledPercent!==49)throw new Error('51/49 mismatch');
if(report.migratedPool.feeBps!==75||report.migratedPool.dynamic!==false)throw new Error('migrated fee mismatch');
if(report.migratedPool.totalPermanentLockedPercent!==100)throw new Error('100% lock config mismatch');
if(report.router.legacyVaultPdas.length!==10||new Set(report.router.legacyVaultPdas.map(x=>x.pda)).size!==10)throw new Error('PDA proof mismatch');
if(JSON.stringify(report.router.weights)!==JSON.stringify(MAGIC.routerWeights))throw new Error('router weights mismatch');

const RPC=process.env.SOLANA_RPC_URL||clusterApiUrl('devnet');
const connection=new Connection(RPC,'confirmed');
const DBC=new PublicKey(report.dbcProgram);
for(const key of ['config','pool']){
  const info=await connection.getAccountInfo(new PublicKey(report[key]),'confirmed');
  if(!info||!info.owner.equals(DBC))throw new Error(key+' no longer verifies on devnet');
}
const tx=await connection.getSignatureStatus(report.transaction,{searchTransactionHistory:true});
if(!tx?.value||tx.value.err)throw new Error('transaction not confirmed cleanly');

console.log('REVIVE_DBC_VERIFY=PASS tx='+report.transaction+' config='+report.config+' pool='+report.pool+' legacy_pdas=10 fee_bps=75 lock_config=100');
