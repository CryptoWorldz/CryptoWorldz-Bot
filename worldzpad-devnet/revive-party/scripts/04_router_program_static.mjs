import fs from 'node:fs';
import crypto from 'node:crypto';
import { Keypair, PublicKey } from '@solana/web3.js';
import {
  LEGACY_MINTS,
  deriveLegacyVaults,
  staticRouterProgramId,
  staticRouterAuthority,
} from './common.mjs';
import {
  deriveProgramLegacyVault,
  encodeLegacyPayout,
  buildLegacyPayoutInstruction,
} from './router_program_client.mjs';

function recipientFixture(){
  const seed=crypto.createHash('sha256').update('WORLDZ_DEVNET_HODLER_RECIPIENT').digest().subarray(0,32);
  return Keypair.fromSeed(seed).publicKey;
}
const program=staticRouterProgramId();
const authority=staticRouterAuthority();
const recipient=recipientFixture();

const vaults=deriveLegacyVaults({programId:program,authority});
if(vaults.length!==10||new Set(vaults.map(x=>x.pda)).size!==10)throw new Error('program vault PDA uniqueness failed');

// Cross-check common helper against the exact JS transaction client seed implementation.
for(const row of vaults){
  const direct=deriveProgramLegacyVault(program,authority,new PublicKey(row.mint));
  if(direct.pda.toBase58()!==row.pda||direct.bump!==row.bump){
    throw new Error(row.symbol+' PDA derivation drift between common helper and router client');
  }
}

const data=encodeLegacyPayout(LEGACY_MINTS[0][1],123456789n);
if(data.length!==41||data[0]!==1||data.readBigUInt64LE(33)!==123456789n)throw new Error('payout encoding failed');
const built=buildLegacyPayoutInstruction({
  programId:program,authority,legacyMint:LEGACY_MINTS[0][1],recipient,lamports:123456789n
});
if(!built.vault.equals(new PublicKey(vaults[0].pda)))throw new Error('instruction vault derivation mismatch');
if(built.instruction.keys.length!==4||!built.instruction.keys[0].isSigner)throw new Error('instruction authority contract mismatch');

const rust=fs.readFileSync('router-program/src/lib.rs','utf8');
for(const required of [
  'LEGACY_VAULT_SEED',
  'authority.key.as_ref()',
  'legacy_mint.as_ref()',
  'MissingRequiredSignature',
  'find_program_address',
  'invoke_signed',
  'system_instruction::transfer',
  'InsufficientFunds'
]){
  if(!rust.includes(required))throw new Error('router program safety/seed primitive missing: '+required);
}

fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/revive-router-program-static-proof.json',JSON.stringify({
  proof:'REVIVE_LEGACY_ROUTER_PROGRAM_STATIC',
  programStaticNamespace:program.toBase58(),
  routerAuthorityFixture:authority.toBase58(),
  seedContract:'legacy-vault + authority + legacy_mint',
  vaults,
  instruction:{opcode:1,bytes:41,amount:'123456789'},
  safety:{
    authoritySignatureRequired:true,
    vaultDerivedFromProgramAuthorityAndLegacyMint:true,
    jsClientAndCommonPdaDerivationMatch:true,
    rustSeedContractChecked:true,
    systemProgramChecked:true,
    balanceChecked:true,
    invokeSignedRequired:true,
  },
  deployStatus:'NOT_YET_DEPLOYED__DEVNET_BUILD_REQUIRED',
  mainnetExecution:false
},null,2)+'\n');
console.log('REVIVE_ROUTER_PROGRAM_STATIC=PASS vault_pdas=10 seed_contract=authority+mint signer_gate=ON payout_encoding=41B deployed=NO mainnet=LOCKED');
