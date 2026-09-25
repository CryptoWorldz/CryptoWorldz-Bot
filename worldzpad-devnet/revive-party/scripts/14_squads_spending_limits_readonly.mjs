#!/usr/bin/env node
// REVIVE Squads spending-limit audit — READ ONLY.
import fs from 'node:fs';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import * as squads from '@sqds/multisig';

const RPC=process.env.SOLANA_MAINNET_RPC_URL?.trim()||clusterApiUrl('mainnet-beta');
const MAINNET_GENESIS='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const MEMBER=new PublicKey('Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u');
const MULTISIG=new PublicKey('B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN');
const cfg=JSON.parse(fs.readFileSync('../../worldzpad-mainnet/revive/revive-launch-contract.v1.json','utf8'));
const RVIV=new PublicKey(cfg.token.canonicalMint);
const REQUIRED=30_000_000n*1_000_000n;

const c=new Connection(RPC,'confirmed');
const genesis=await c.getGenesisHash();
if(genesis!==MAINNET_GENESIS)throw new Error('MAINNET RPC REQUIRED');

const programAccounts=await c.getProgramAccounts(squads.PROGRAM_ID,{
  commitment:'confirmed',
  filters:[{memcmp:{offset:8,bytes:MULTISIG.toBase58()}}],
});
const limits=[];
for(const item of programAccounts){
  try{
    const x=squads.accounts.SpendingLimit.fromAccountInfo(item.account)[0];
    if(!x.multisig.equals(MULTISIG))continue;
    const memberAllowed=x.members.some(k=>k.equals(MEMBER));
    const mintMatch=x.mint.equals(RVIV);
    const rawRemaining=BigInt(x.remainingAmount.toString());
    const rawAmount=BigInt(x.amount.toString());
    const destinationOpen=x.destinations.length===0;
    limits.push({
      address:item.pubkey.toBase58(),
      vaultIndex:x.vaultIndex,
      mint:x.mint.toBase58(),
      amountRaw:rawAmount.toString(),
      remainingRaw:rawRemaining.toString(),
      period:x.period?.__kind??String(x.period),
      lastReset:x.lastReset.toString(),
      memberAllowed,
      members:x.members.map(k=>k.toBase58()),
      destinations:x.destinations.map(k=>k.toBase58()),
      destinationOpen,
      rvivMintMatch:mintMatch,
      enoughFor30M:rawRemaining>=REQUIRED,
      usableForRevive30M:memberAllowed&&mintMatch&&rawRemaining>=REQUIRED&&x.vaultIndex===0,
      lamports:item.account.lamports,
    });
  }catch{}
}

const jayRvivAta=getAssociatedTokenAddressSync(RVIV,MEMBER,false,TOKEN_PROGRAM_ID);
const jayAtaInfo=await c.getAccountInfo(jayRvivAta,'confirmed');
const usable=limits.filter(x=>x.usableForRevive30M);

const report={
 proof:'REVIVE_SQUADS_SPENDING_LIMIT_READ_ONLY',
 multisig:MULTISIG.toBase58(),
 member:MEMBER.toBase58(),
 rvivMint:RVIV.toBase58(),
 requiredRaw:REQUIRED.toString(),
 programAccountsMatchingMultisig:programAccounts.length,
 spendingLimits:limits,
 usableLimits:usable,
 jayRvivAta:jayRvivAta.toBase58(),
 jayRvivAtaExists:Boolean(jayAtaInfo),
 safety:{readOnly:true,noSigning:true,noBroadcast:true,noSolMoved:true,noRvivMoved:true}
};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/revive-squads-spending-limits-readonly.json',JSON.stringify(report,null,2)+'\n');
console.log('REVIVE_SPENDING_LIMITS found='+limits.length+' usable='+usable.length+' jay_rviv_ata='+(jayAtaInfo?'EXISTS':'MISSING'));
for(const x of limits)console.log('REVIVE_SPENDING_LIMIT address='+x.address+' vault='+x.vaultIndex+' mint='+x.mint+' remaining='+x.remainingRaw+' member='+x.memberAllowed+' usable='+x.usableForRevive30M+' destinations='+x.destinations.join(','));
