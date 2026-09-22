import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import BN from 'bn.js';
import {
  Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction,
} from '@solana/web3.js';
import {
  NATIVE_MINT, TOKEN_PROGRAM_ID, getMint,
} from '@solana/spl-token';
import {
  ActivationType, BaseFeeMode, CollectFeeMode, CpAmm,
  getBaseFeeParams, getLiquidityDeltaFromAmountA,
  getSqrtPriceFromPrice, MAX_SQRT_PRICE,
} from '@meteora-ag/cp-amm-sdk';
import * as multisig from '@sqds/multisig';

const CONFIG_PATH = path.resolve('wldz-one-sided-launch.candidate.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const RPC = process.env.SOLANA_RPC_URL;
if (!RPC) throw new Error('SOLANA_RPC_URL is required');
const connection = new Connection(RPC, 'confirmed');

const mint = new PublicKey(config.token.mint);
const multisigPda = new PublicKey(config.treasury.multisig);
const expectedVault = new PublicKey(config.treasury.vault);
const [derivedVault] = multisig.getVaultPda({ multisigPda, index: config.treasury.vaultIndex });
if (!derivedVault.equals(expectedVault)) throw new Error(`Squads vault mismatch: derived=${derivedVault} expected=${expectedVault}`);

const mintInfo = await getMint(connection, mint, 'confirmed', TOKEN_PROGRAM_ID);
if (mintInfo.decimals !== config.token.decimals) throw new Error('WLDZ decimals drift');
if (mintInfo.supply !== BigInt(config.token.supplyTokens) * 10n ** BigInt(config.token.decimals)) throw new Error('WLDZ fixed supply drift');
if (mintInfo.mintAuthority !== null || mintInfo.freezeAuthority !== null) throw new Error('WLDZ authorities are not revoked');

const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda, 'confirmed');
const threshold = Number(multisigInfo.threshold);
if (threshold !== 2) throw new Error(`Squads threshold drift: expected 2, got ${threshold}`);

const baseAmountRaw = BigInt(config.launch.baseAmountTokens) * 10n ** BigInt(config.token.decimals);
const tokenAAmount = new BN(baseAmountRaw.toString());
const initSqrtPrice = getSqrtPriceFromPrice(String(config.launch.initPriceSolPerWldz), config.token.decimals, 9);
const liquidityDelta = getLiquidityDeltaFromAmountA(
  tokenAAmount, initSqrtPrice, MAX_SQRT_PRICE, CollectFeeMode.OnlyB,
);
const baseFee = getBaseFeeParams({
  baseFeeMode: BaseFeeMode.FeeTimeSchedulerLinear,
  feeTimeSchedulerParam: {
    startingFeeBps: config.launch.baseFeeBps,
    endingFeeBps: config.launch.baseFeeBps,
    numberOfPeriod: 0,
    totalDuration: 0,
  },
});
const poolFees = { baseFee, compoundingFeeBps: 0, padding: 0, dynamicFee: null };

const cpAmm = new CpAmm(connection);
// The position NFT is a one-use launch signer. It is generated locally and never committed.
const positionNft = Keypair.generate();
const { tx: meteoraTx, pool, position } = await cpAmm.createCustomPool({
  payer: expectedVault,
  creator: expectedVault,
  positionNft: positionNft.publicKey,
  tokenAMint: mint,
  tokenBMint: NATIVE_MINT,
  tokenAAmount,
  tokenBAmount: new BN(0),
  sqrtMinPrice: initSqrtPrice,
  sqrtMaxPrice: MAX_SQRT_PRICE,
  liquidityDelta,
  initSqrtPrice,
  poolFees,
  hasAlphaVault: false,
  activationType: ActivationType.Timestamp,
  collectFeeMode: CollectFeeMode.OnlyB,
  activationPoint: null,
  tokenAProgram: TOKEN_PROGRAM_ID,
  tokenBProgram: TOKEN_PROGRAM_ID,
  isLockLiquidity: true,
});

// Squads ephemeral signer PDA replaces the ordinary Keypair signer inside the stored vault message.
const transactionIndex = BigInt(multisigInfo.transactionIndex.toString()) + 1n;
const [ephemeralSigner] = multisig.getEphemeralSignerPda({
  transactionPda: multisig.getTransactionPda({ multisigPda, index: transactionIndex })[0],
  ephemeralSignerIndex: 0,
});
for (const ix of meteoraTx.instructions) {
  for (const key of ix.keys) {
    if (key.pubkey.equals(positionNft.publicKey)) key.pubkey = ephemeralSigner;
  }
}
const latest = await connection.getLatestBlockhash('confirmed');
const vaultMessage = new TransactionMessage({
  payerKey: expectedVault,
  recentBlockhash: latest.blockhash,
  instructions: meteoraTx.instructions,
}).compileToLegacyMessage();

const createIx = multisig.instructions.vaultTransactionCreate({
  multisigPda,
  transactionIndex,
  creator: new PublicKey(process.env.SQUADS_CREATOR || config.token.mint),
  vaultIndex: config.treasury.vaultIndex,
  ephemeralSigners: 1,
  transactionMessage: vaultMessage,
  memo: 'WORLDZ WLDZ 15M one-sided Meteora launch',
});
const proposalIx = multisig.instructions.proposalCreate({
  multisigPda,
  transactionIndex,
  creator: new PublicKey(process.env.SQUADS_CREATOR || config.token.mint),
});

const proof = {
  status: 'BUILT_NOT_EXECUTED',
  network: 'mainnet-beta',
  canonicalMint: mint.toBase58(),
  fixedSupply: config.token.supplyTokens,
  decimals: mintInfo.decimals,
  mintAuthorityRevoked: mintInfo.mintAuthority === null,
  freezeAuthorityRevoked: mintInfo.freezeAuthority === null,
  squads: {
    multisig: multisigPda.toBase58(), vault: expectedVault.toBase58(),
    vaultIndex: config.treasury.vaultIndex, threshold,
    transactionIndex: transactionIndex.toString(),
    ephemeralSigner: ephemeralSigner.toBase58(),
  },
  meteora: {
    program: config.launch.program,
    pool: pool.toBase58(), position: position.toBase58(),
    positionNftEphemeralSigner: ephemeralSigner.toBase58(),
    baseAmountWldz: config.launch.baseAmountTokens,
    baseAmountRaw: baseAmountRaw.toString(),
    quoteAmountSol: 0,
    initialPriceSolPerWldz: config.launch.initPriceSolPerWldz,
    collectFeeMode: 'OnlyB',
    baseFeeBps: config.launch.baseFeeBps,
    lockedAtCreation: true,
  },
  proposalBuilder: {
    createInstructionProgram: createIx.programId.toBase58(),
    proposalInstructionProgram: proposalIx.programId.toBase58(),
    instructionCount: meteoraTx.instructions.length,
  },
  simulation: {
    attempted: false,
    passed: false,
    note: 'Stored Squads vault message cannot execute before the proposal is created/approved. Final execution simulation must use the exact approved transaction account immediately before execution.',
  },
  noValueMoved: true,
};
fs.mkdirSync('artifacts', { recursive: true });
const out = 'artifacts/wldz-squads-meteora-build-proof.json';
fs.writeFileSync(out, JSON.stringify(proof, null, 2) + '\n');
console.log(`WLDZ_SQUADS_METEORA_BUILD=PASS pool=${pool} position=${position} tx_index=${transactionIndex} value_moved=0`);
