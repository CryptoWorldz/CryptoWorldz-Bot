import fs from 'node:fs';
import path from 'node:path';
import BN from 'bn.js';
import { Connection, PublicKey, Transaction, TransactionMessage } from '@solana/web3.js';
import { NATIVE_MINT, TOKEN_PROGRAM_ID, getAccount, getAssociatedTokenAddress, getMint } from '@solana/spl-token';
import { ActivationType, BaseFeeMode, CollectFeeMode, CpAmm, getBaseFeeParams, getLiquidityDeltaFromAmountA, getSqrtPriceFromPrice, MAX_SQRT_PRICE } from '@meteora-ag/cp-amm-sdk';
import * as multisig from '@sqds/multisig';

const config = JSON.parse(fs.readFileSync(path.resolve('wldz-one-sided-launch.candidate.json'), 'utf8'));
const RPC = process.env.SOLANA_RPC_URL;
if (!RPC) throw new Error('SOLANA_RPC_URL is required');
const connection = new Connection(RPC, 'confirmed');
const mint = new PublicKey(config.token.mint);
const multisigPda = new PublicKey(config.treasury.multisig);
const expectedVault = new PublicKey(config.treasury.vault);
const [derivedVault] = multisig.getVaultPda({ multisigPda, index: config.treasury.vaultIndex });
if (!derivedVault.equals(expectedVault)) throw new Error('Squads vault derivation mismatch');

const [mintInfo, multisigInfo] = await Promise.all([
  getMint(connection, mint, 'confirmed', TOKEN_PROGRAM_ID),
  multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda, 'confirmed'),
]);
if (mintInfo.decimals !== 6 || mintInfo.supply !== 100000000000000n) throw new Error('Canonical WLDZ mint drift');
if (mintInfo.mintAuthority !== null || mintInfo.freezeAuthority !== null) throw new Error('WLDZ authorities not revoked');
if (Number(multisigInfo.threshold) !== 2) throw new Error('Squads threshold is not 2');

const creatorEnv = process.env.SQUADS_CREATOR;
if (!creatorEnv) throw new Error('SQUADS_CREATOR is required');
const creator = new PublicKey(creatorEnv);
const member = multisigInfo.members.find((m) => m.key.equals(creator));
if (!member) throw new Error('SQUADS_CREATOR is not a multisig member');
if ((Number(member.permissions.mask) & multisig.types.Permission.Initiate) === 0) throw new Error('SQUADS_CREATOR lacks Initiate permission');

const vaultAta = await getAssociatedTokenAddress(mint, expectedVault, true, TOKEN_PROGRAM_ID);
const vaultToken = await getAccount(connection, vaultAta, 'confirmed', TOKEN_PROGRAM_ID);
const baseAmountRaw = 15000000n * 1000000n;
if (vaultToken.amount < baseAmountRaw) throw new Error('Treasury lacks 15M WLDZ');

const transactionIndex = BigInt(multisigInfo.transactionIndex.toString()) + 1n;
const [transactionPda] = multisig.getTransactionPda({ multisigPda, index: transactionIndex });
const [proposalPda] = multisig.getProposalPda({ multisigPda, transactionIndex });
const [ephemeralSigner] = multisig.getEphemeralSignerPda({ transactionPda, ephemeralSignerIndex: 0 });

const cpAmm = new CpAmm(connection);
const tokenAAmount = new BN(baseAmountRaw.toString());
const initSqrtPrice = getSqrtPriceFromPrice(String(config.launch.initPriceSolPerWldz), 6, 9);
const liquidityDelta = getLiquidityDeltaFromAmountA(tokenAAmount, initSqrtPrice, MAX_SQRT_PRICE, CollectFeeMode.OnlyB);
const baseFee = getBaseFeeParams({ baseFeeMode: BaseFeeMode.FeeTimeSchedulerLinear, feeTimeSchedulerParam: { startingFeeBps: 200, endingFeeBps: 200, numberOfPeriod: 0, totalDuration: 0 } });
const poolFees = { baseFee, compoundingFeeBps: 0, padding: 0, dynamicFee: null };

const { tx: meteoraTx, pool, position } = await cpAmm.createCustomPool({
  payer: expectedVault, creator: expectedVault, positionNft: ephemeralSigner,
  tokenAMint: mint, tokenBMint: NATIVE_MINT, tokenAAmount, tokenBAmount: new BN(0),
  sqrtMinPrice: initSqrtPrice, sqrtMaxPrice: MAX_SQRT_PRICE, liquidityDelta, initSqrtPrice,
  poolFees, hasAlphaVault: false, activationType: ActivationType.Timestamp,
  collectFeeMode: CollectFeeMode.OnlyB, activationPoint: null,
  tokenAProgram: TOKEN_PROGRAM_ID, tokenBProgram: TOKEN_PROGRAM_ID, isLockLiquidity: true,
});
if (await connection.getAccountInfo(pool, 'confirmed')) throw new Error('Target Meteora pool already exists');

const latest = await connection.getLatestBlockhash('confirmed');
const vaultMessage = new TransactionMessage({ payerKey: expectedVault, recentBlockhash: latest.blockhash, instructions: meteoraTx.instructions }).compileToLegacyMessage();
const createIx = multisig.instructions.vaultTransactionCreate({
  multisigPda, transactionIndex, creator, vaultIndex: config.treasury.vaultIndex,
  ephemeralSigners: 1, transactionMessage: vaultMessage, memo: 'WORLDZ WLDZ 15M one-sided Meteora launch',
});
const proposalIx = multisig.instructions.proposalCreate({ multisigPda, transactionIndex, creator });
const proposalBuildTx = new Transaction().add(createIx, proposalIx);
proposalBuildTx.feePayer = creator;
proposalBuildTx.recentBlockhash = latest.blockhash;

const serializedUnsigned = proposalBuildTx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');
const simulation = await connection.simulateTransaction(proposalBuildTx, undefined, false);
if (simulation.value.err !== null) {
  console.error('PROPOSAL_SIM_LOGS=' + JSON.stringify(simulation.value.logs ?? []));
  throw new Error('Proposal-create simulation failed: ' + JSON.stringify(simulation.value.err));
}

const proof = {
  status: 'READY_FOR_CREATOR_SIGNATURE', network: 'mainnet-beta', transactionBroadcast: false, valueMoved: false,
  canonicalMint: mint.toBase58(), proposalAddress: proposalPda.toBase58(), vaultTransactionAddress: transactionPda.toBase58(),
  serializedTransactionBase64: serializedUnsigned,
  transaction: { recentBlockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight, feePayer: creator.toBase58(), requiredSigner: creator.toBase58(), instructionCount: proposalBuildTx.instructions.length },
  squads: { multisig: multisigPda.toBase58(), vault: expectedVault.toBase58(), threshold: Number(multisigInfo.threshold), transactionIndex: transactionIndex.toString(), transactionPda: transactionPda.toBase58(), proposalPda: proposalPda.toBase58(), ephemeralSigner: ephemeralSigner.toBase58() },
  meteora: { program: config.launch.program, pool: pool.toBase58(), position: position.toBase58(), baseAmountWldz: 15000000, quoteAmountSol: 0, openingPriceSolPerWldz: String(config.launch.initPriceSolPerWldz), baseFeeBps: 200, collectFeeMode: 'OnlyB', permanentLockIncludedAtomically: true, liquidityDelta: liquidityDelta.toString(), storedInstructionCount: meteoraTx.instructions.length },
  simulation: { passed: true, err: null, unitsConsumed: simulation.value.unitsConsumed ?? null, logs: simulation.value.logs ?? [], note: 'Unsigned proposal-create transaction simulated with signature verification disabled. No transaction was broadcast.' },
  resultingProposalAccount: { address: proposalPda.toBase58(), existsBeforeSignature: false, expectedAfterSignedCreateConfirmation: true },
};
fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/wldz-squads-proposal-ready.json', JSON.stringify(proof, null, 2) + '\n');
console.log('WLDZ_PROPOSAL_READY=PASS proposal=' + proposalPda.toBase58() + ' transaction=' + transactionPda.toBase58() + ' broadcast=0');
