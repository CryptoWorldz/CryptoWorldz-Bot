import crypto from 'node:crypto';
import { Keypair, PublicKey } from '@solana/web3.js';
import { deriveProgramLegacyVault } from './router_program_client.mjs';

export const LEGACY_MINTS = [
  ['PDC','F82HFwxDLKFAbQWq7BmniWWxMgUerQsVu8jS357epump'],
  ['PDC1','PDC1K9aG6vAg5jFYkLin2tdTgwqZypsdvVHhHN2WnWw'],
  ['PDC1-2','PDC1NgvtvLZwnopTfQdzXT5iAqBeGyLdFXEcqnvsR52'],
  ['PDCMAGA','7mwWRQeNpwWrnNhRpC48k7xQCdjCXDWfLLuYsphupump'],
  ['PDCSHARE','PDCLsBaTM3MxCzTWNoRvQejZ4kkhAWZiSc3ipCsoFuE'],
  ['PURPLEDC','9Jd67VEgqWA2K5mck7yiYGxfLrQnmrTnXXzDYE3b7MLf'],
  ['PURPLEOG','DyZP9zn6vRu8J8XCQLNCREgCc12YN4JndnrmE5Upump'],
  ['PCC1','DcekG6rLbQ3K5LtZfSMLgecfqnFAZgJUSpoY7tBgmuGv'],
  ['INVEST','VeSt6vaWE5JsT36sVCzL21daiY7nNNs73TJcJMHgnjC'],
  ['LMTD','Lmtdfb2b392STncVxf2rD6csY4w1rxuHEMizv7vXVtY'],
];

export const MAGIC = {
  grossBps:75,
  protocolSharePercent:20,
  creatorControlledPercent:51,
  partnerControlledPercent:49,
  routes:{referrer:17,legacy:15,worldz:8.5,impact:8.5},
  routerWeights:{referrer:170,legacy:150,worldz:85,impact:85,total:490},
  permanentLock:{creator:60,partner:40,total:100},
};

function staticRole(label){
  const seed=crypto.createHash('sha256').update('WORLDZ_DEVNET_'+label).digest().subarray(0,32);
  return Keypair.fromSeed(seed);
}

// Static fixtures only. These are NOT deployed Solana program/authority keys.
export function staticRouterProgramId(){
  return staticRole('ROUTER_PROGRAM_STATIC_NAMESPACE').publicKey;
}
export function staticRouterAuthority(){
  return staticRole('ROUTER_AUTHORITY').publicKey;
}

export function deriveLegacyVaults({
  programId=staticRouterProgramId(),
  authority=staticRouterAuthority(),
}={}){
  const pid=new PublicKey(programId);
  const auth=new PublicKey(authority);
  return LEGACY_MINTS.map(([symbol,mint])=>{
    const {pda,bump}=deriveProgramLegacyVault(pid,auth,new PublicKey(mint));
    return {symbol,mint,pda:pda.toBase58(),bump};
  });
}
