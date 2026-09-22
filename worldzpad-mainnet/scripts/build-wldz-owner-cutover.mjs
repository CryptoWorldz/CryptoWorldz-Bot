import fs from "node:fs";
import crypto from "node:crypto";
import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";

const RPC = process.env.SOLANA_RPC_URL || "https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc";
const connection = new Connection(RPC, "confirmed");
const OWNER = new PublicKey("Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u");
const MS = new PublicKey("B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN");
const A=(x,m)=>{ if(!x) throw new Error("WLDZ_OWNER_CUTOVER_FAIL: "+m); };
const H=b=>crypto.createHash("sha256").update(b).digest("hex");

const ma = await multisig.accounts.Multisig.fromAccountAddress(connection, MS, "confirmed");
A(Number(ma.threshold)===2, "expected live threshold 2");
A((ma.configAuthority?.toBase58?.() || String(ma.configAuthority)) === "11111111111111111111111111111111", "multisig is not autonomous as expected");
const member = ma.members.find(m=>m.key.equals(OWNER));
A(member, "owner is not a member");
A((Number(member.permissions.mask)&3)===3, "owner needs Initiate + Vote permissions");

const index = multisig.utils.toBigInt(ma.transactionIndex)+1n;
const [txPda] = multisig.getTransactionPda({ multisigPda:MS, index });
const [proposalPda] = multisig.getProposalPda({ multisigPda:MS, transactionIndex:index });

const otherMembers = ma.members.filter(m=>!m.key.equals(OWNER)).map(m=>m.key);
A(otherMembers.length===2, "expected exactly two non-owner members");
const cutoverActions = [
  { __kind:"ChangeThreshold", newThreshold:1 },
  ...otherMembers.map(oldMember=>({ __kind:"RemoveMember", oldMember }))
];
const create = multisig.instructions.configTransactionCreate({
  multisigPda:MS,
  transactionIndex:index,
  creator:OWNER,
  rentPayer:OWNER,
  actions:cutoverActions,
  memo:"WORLDZ owner cutover: JayJayTeamDev becomes sole 1-of-1 treasury member"
});
const proposal = multisig.instructions.proposalCreate({
  multisigPda:MS, transactionIndex:index, creator:OWNER, rentPayer:OWNER, isDraft:true
});
const activate = multisig.instructions.proposalActivate({
  multisigPda:MS, transactionIndex:index, member:OWNER
});
const approve = multisig.instructions.proposalApprove({
  multisigPda:MS, transactionIndex:index, member:OWNER
});

const latest = await connection.getLatestBlockhash("confirmed");
const tx = new VersionedTransaction(new TransactionMessage({
  payerKey:OWNER,
  recentBlockhash:latest.blockhash,
  instructions:[create,proposal,activate,approve]
}).compileToV0Message());
A(Buffer.from(tx.serialize()).length<=1232, "cutover transaction exceeds Solana packet limit");
const sim = await connection.simulateTransaction(tx,{sigVerify:false,replaceRecentBlockhash:true,commitment:"confirmed"});
A(sim.value.err===null, "cutover create/activate/owner-approve simulation failed: "+JSON.stringify(sim.value.err));

const executeIx = multisig.instructions.configTransactionExecute({
  multisigPda:MS, transactionIndex:index, member:OWNER, rentPayer:OWNER
});
const executeTx = new VersionedTransaction(new TransactionMessage({
  payerKey:OWNER,
  recentBlockhash:latest.blockhash,
  instructions:[executeIx]
}).compileToV0Message());

fs.mkdirSync("artifacts",{recursive:true});
fs.writeFileSync("artifacts/wldz-owner-cutover-create-approve.v0.base64.txt",Buffer.from(tx.serialize()).toString("base64")+"\n");
fs.writeFileSync("artifacts/wldz-owner-cutover-execute.v0.base64.txt",Buffer.from(executeTx.serialize()).toString("base64")+"\n");
const proof={
  status:"OWNER_CUTOVER_BUILT_AND_SIMULATED",
  broadcast:false,
  valueMoved:false,
  multisig:MS.toBase58(),
  currentThreshold:Number(ma.threshold),
  targetThreshold:1,
  targetMemberCount:1,
  removedMembers:otherMembers.map(k=>k.toBase58()),
  owner:OWNER.toBase58(),
  transactionIndex:index.toString(),
  transactionPda:txPda.toBase58(),
  proposalPda:proposalPda.toBase58(),
  createApprovePacketBytes:Buffer.from(tx.serialize()).length,
  executePacketBytes:Buffer.from(executeTx.serialize()).length,
  createApproveSimulation:{passed:true,err:null,unitsConsumed:sim.value.unitsConsumed??null},
  fingerprints:{createApprove:H(Buffer.from(tx.message.serialize())),execute:H(Buffer.from(executeTx.message.serialize()))},
  executionRule:"The cutover itself follows the current on-chain threshold. Once executed, JayJayTeamDev is the sole 1-of-1 member and future Squads proposals require only the owner approval."
};
fs.writeFileSync("artifacts/wldz-owner-cutover-proof.json",JSON.stringify(proof,null,2)+"\n");
console.log("WLDZ_OWNER_CUTOVER="+proof.status);
console.log("WLDZ_CUTOVER_TRANSACTION_PDA="+proof.transactionPda);
console.log("WLDZ_CUTOVER_PROPOSAL_PDA="+proof.proposalPda);
console.log("WLDZ_CUTOVER_PACKET_BYTES="+proof.createApprovePacketBytes);
console.log("WLDZ_CUTOVER_SIM=PASS");
