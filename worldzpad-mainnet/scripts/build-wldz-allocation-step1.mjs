import fs from 'node:fs';
import path from 'node:path';
import {
  Connection, PublicKey, Transaction, TransactionMessage, VersionedTransaction
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
  getMint, getAccount, getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction
} from '@solana/spl-token';
import * as multisig from '@sqds/multisig';

const config = JSON.parse(fs.readFileSync(path.resolve('wldz-allocation.master.json'),'utf8'));
const RPC = process.env.SOLANA_RPC_URL;
if(!RPC) throw new Error('SOLANA_RPC_URL is required');
const connection = new Connection(RPC,'confirmed');

const A=(ok,msg)=>{if(!ok)throw new Error('WLDZ_ALLOCATION_FAIL: '+msg);};
const sum=(arr,key)=>arr.reduce((n,x)=>n+Number(x[key]||0),0);

A(config.token.mint==='AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U','canonical mint drift');
A(config.token.fixedSupplyTokens===100000000&&config.token.decimals===6,'fixed supply config drift');
A(sum(config.allocation,'percent')===100,'allocation percent total is not 100');
A(sum(config.allocation,'tokens')===100000000,'allocation token total is not 100M');

const byId=new Map(config.allocation.map(x=>[x.id,x]));
A(byId.get('jayjayteamdev')?.tokens===8000000,'JayJayTeamDev must be 8M');
A(byId.get('initial_launch_lp')?.tokens===15000000,'initial LP must be 15M');
A(byId.get('staged_lp_reserve')?.tokens===20000000,'staged LP reserve must be 20M');
A(byId.get('legacy_snapshot_holders')?.tokens===10000000,'legacy pool must be 10M');
A(byId.get('first_100_worldzlaunchpad')?.tokens===10000000,'first 100 launch pool must be 10M');
A(byId.get('oneworldz_charity_impact')?.tokens===10000000,'charity pool must be 10M');
A(byId.get('worldz_treasury')?.tokens===10000000,'treasury must be 10M');
A(byId.get('general_reserve')?.tokens===5000000,'general reserve must be 5M');
A(byId.get('community_ecosystem_growth')?.tokens===7000000,'community/ecosystem/growth must be 7M');
A(byId.get('operations_security_infrastructure')?.tokens===5000000,'operations/security/infrastructure must be 5M');

const mint=new PublicKey(config.token.mint);
const multisigPda=new PublicKey(config.sourceControl.squadsMultisig);
const vault=new PublicKey(config.sourceControl.vault);
const [derivedVault]=multisig.getVaultPda({multisigPda,index:Number(config.sourceControl.vaultIndex)});
A(derivedVault.equals(vault),'Squads vault derivation mismatch');

const [mintInfo,multisigInfo]=await Promise.all([
  getMint(connection,mint,'confirmed',TOKEN_PROGRAM_ID),
  multisig.accounts.Multisig.fromAccountAddress(connection,multisigPda,'confirmed')
]);
A(mintInfo.decimals===6&&mintInfo.supply===100000000000000n,'live mint supply/decimals drift');
A(mintInfo.mintAuthority===null&&mintInfo.freezeAuthority===null,'mint/freeze authority is not revoked');

const sourceAta=await getAssociatedTokenAddress(mint,vault,true,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
const sourceToken=await getAccount(connection,sourceAta,'confirmed',TOKEN_PROGRAM_ID);
A(sourceToken.amount===100000000000000n,'source vault no longer holds the full 100M WLDZ; rebuild allocation state before proceeding');

const creator=new PublicKey(process.env.SQUADS_CREATOR||byId.get('jayjayteamdev').destination);
const member=multisigInfo.members.find(m=>m.key.equals(creator));
A(member,'SQUADS_CREATOR is not a live Squads member');
A((Number(member.permissions.mask)&multisig.types.Permission.Initiate)!==0,'SQUADS_CREATOR lacks Initiate permission');

const dev=new PublicKey(byId.get('jayjayteamdev').destination);
A(dev.equals(creator),'dev destination must equal authorized JayJayTeamDev wallet for this proposal');
const devAta=await getAssociatedTokenAddress(mint,dev,false,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
const amountRaw=8000000n*1000000n;

const latest=await connection.getLatestBlockhash('confirmed');
const vaultIxs=[
  createAssociatedTokenAccountIdempotentInstruction(
    vault,devAta,dev,mint,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID
  ),
  createTransferCheckedInstruction(
    sourceAta,mint,devAta,vault,amountRaw,6,[],TOKEN_PROGRAM_ID
  )
];

const directMessage=new TransactionMessage({
  payerKey:vault,recentBlockhash:latest.blockhash,instructions:vaultIxs
}).compileToV0Message();
const directTx=new VersionedTransaction(directMessage);
const directSim=await connection.simulateTransaction(directTx,{
  sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed'
});
A(directSim.value.err===null,'8M dev transfer vault-message simulation failed: '+JSON.stringify(directSim.value.err));

const transactionIndex=BigInt(multisigInfo.transactionIndex.toString())+1n;
const [transactionPda]=multisig.getTransactionPda({multisigPda,index:transactionIndex});
const [proposalPda]=multisig.getProposalPda({multisigPda,transactionIndex});

const vaultMessage=new TransactionMessage({
  payerKey:vault,recentBlockhash:latest.blockhash,instructions:vaultIxs
}).compileToLegacyMessage();

const createIx=multisig.instructions.vaultTransactionCreate({
  multisigPda,
  transactionIndex,
  creator,
  vaultIndex:Number(config.sourceControl.vaultIndex),
  ephemeralSigners:0,
  transactionMessage:vaultMessage,
  memo:'WORLDZ WLDZ master allocation — 8M JayJayTeamDev'
});
const proposalIx=multisig.instructions.proposalCreate({multisigPda,transactionIndex,creator});
const proposalTx=new Transaction().add(createIx,proposalIx);
proposalTx.feePayer=creator;
proposalTx.recentBlockhash=latest.blockhash;

const proposalSim=await connection.simulateTransaction(proposalTx,undefined,false);
A(proposalSim.value.err===null,'Squads proposal-create simulation failed: '+JSON.stringify(proposalSim.value.err));

const proof={
  status:'ALLOCATION_LOCKED__DEV_8M_PROPOSAL_READY__NOT_BROADCAST',
  network:'mainnet-beta',
  canonicalMint:mint.toBase58(),
  fixedSupplyTokens:100000000,
  currentSourceVaultWldz: Number(sourceToken.amount/1000000n),
  allocationPercentTotal:sum(config.allocation,'percent'),
  allocationTokenTotal:sum(config.allocation,'tokens'),
  sourceControl:{
    multisig:multisigPda.toBase58(),
    vault:vault.toBase58(),
    threshold:Number(multisigInfo.threshold),
    transactionIndex:transactionIndex.toString()
  },
  immediateOnChainMove:{
    bucket:'jayjayteamdev',
    tokens:8000000,
    destination:dev.toBase58(),
    destinationAta:devAta.toBase58(),
    sourceAta:sourceAta.toBase58(),
    vaultMessageSimulation:{passed:true,err:null,unitsConsumed:directSim.value.unitsConsumed??null}
  },
  retainedControlledAllocation:{
    tokens:92000000,
    note:'92M remains in the Squads-controlled source vault for LP, staged reserve, legacy claims, first-100 launches, charity, treasury, reserve, community/growth and operations. These are earmarked by the master allocation and are not silently moved.'
  },
  charity:{
    tokens:10000000,
    destination:byId.get('oneworldz_charity_impact').destination,
    state:byId.get('oneworldz_charity_impact').state
  },
  legacySnapshot:byId.get('legacy_snapshot_holders').snapshot,
  proposal:{
    address:proposalPda.toBase58(),
    vaultTransactionAddress:transactionPda.toBase58(),
    serializedUnsignedBase64:proposalTx.serialize({requireAllSignatures:false,verifySignatures:false}).toString('base64'),
    requiredCreatorSignature:creator.toBase58(),
    creationSimulation:{passed:true,err:null,unitsConsumed:proposalSim.value.unitsConsumed??null},
    broadcast:false,
    valueMoved:false
  },
  note:'Creating/signing this proposal does not itself transfer WLDZ. Execution remains governed by the live Squads threshold.'
};

fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/wldz-allocation-step1-proof.json',JSON.stringify(proof,null,2)+'\n');
console.log('WLDZ_ALLOCATION_STEP1=PASS');
console.log('WLDZ_DEV_TRANSFER_TOKENS=8000000');
console.log('WLDZ_RETAINED_CONTROLLED_TOKENS=92000000');
console.log('WLDZ_PROPOSAL='+proposalPda.toBase58());
console.log('WLDZ_VAULT_TRANSACTION='+transactionPda.toBase58());
console.log('WLDZ_BROADCAST=0');
