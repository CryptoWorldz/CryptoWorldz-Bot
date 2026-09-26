import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';

export const LEGACY_VAULT_SEED=Buffer.from('legacy-vault');

export function deriveProgramLegacyVault(programId,authority,legacyMint){
  const pid=new PublicKey(programId);
  const auth=new PublicKey(authority);
  const mint=new PublicKey(legacyMint);
  const [pda,bump]=PublicKey.findProgramAddressSync(
    [LEGACY_VAULT_SEED,auth.toBuffer(),mint.toBuffer()],
    pid
  );
  return {pda,bump};
}

export function encodeLegacyPayout(legacyMint,lamports){
  const mint=new PublicKey(legacyMint);
  const amount=BigInt(lamports);
  if(amount<=0n||amount>0xffffffffffffffffn)throw new Error('payout lamports outside u64');
  const data=Buffer.alloc(41);
  data[0]=1;
  mint.toBuffer().copy(data,1);
  data.writeBigUInt64LE(amount,33);
  return data;
}

export function buildLegacyPayoutInstruction({programId,authority,legacyMint,recipient,lamports}){
  const pid=new PublicKey(programId);
  const auth=new PublicKey(authority);
  const mint=new PublicKey(legacyMint);
  const to=new PublicKey(recipient);
  const {pda}=deriveProgramLegacyVault(pid,auth,mint);
  return {
    vault:pda,
    instruction:new TransactionInstruction({
      programId:pid,
      keys:[
        {pubkey:auth,isSigner:true,isWritable:false},
        {pubkey:pda,isSigner:false,isWritable:true},
        {pubkey:to,isSigner:false,isWritable:true},
        {pubkey:SystemProgram.programId,isSigner:false,isWritable:false},
      ],
      data:encodeLegacyPayout(mint,lamports),
    })
  };
}
