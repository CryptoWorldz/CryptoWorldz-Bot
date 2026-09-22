import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import BN from 'bn.js';
import {
  Connection, PublicKey, TransactionMessage, VersionedTransaction,
} from '@solana/web3.js';
import {
  NATIVE_MINT, TOKEN_PROGRAM_ID, getMint, getAssociatedTokenAddress, getAccount,
} from '@solana/spl-token';
import {
  ActivationType, BaseFeeMode, CollectFeeMode, CpAmm,
  getBaseFeeParams, getLiquidityDeltaFromAmountA,
  getSqrtPriceFromPrice, MAX_SQRT_PRICE,
} from '@meteora-ag/cp-amm-sdk';
import * as multisig from '@sqds/multisig';

const CONFIG_PATH = path.resolve('wldz-one-sided-launch.candidate.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const RPC = process.env.SOLANA_RPC_URL ||
  'https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc';
const connection = new Connection(RPC, 'confirmed');

const assert = (condition, message) => {
  if (!condition) throw new Error('WLDZ_BUILD_FAIL: ' + message);
};
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const accountProof = (account) => account ? {
  executable: account.executable,
  lamports: account.lamports,
  owner: account.owner?.toBase58?.() ?? null,
  dataBase64: Buffer.isBuffer(account.data) ? account.data.toString('base64') :
    Array.isArray(account.data) ? account.data[0] : null,
} : null;

assert(config.launchAuthorized === false, 'candidate must remain unsigned');
assert(config.executionEnabled === false, 'candidate execution must remain disabled');
assert(config.token.mint === 'AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U', 'canonical mint drift');
assert(config.token.decimals === 6, 'canonical decimals drift');
assert(config.token.supplyTokens === 100000000, 'canonical supply drift');
assert(config.launch.baseAmountTokens === 15000000, '15M launch amount drift');
assert(config.launch.quoteAmountSol === 0, 'candidate must remain one-sided');
assert(config.launch.baseFeeBps === 200, '2% fee drift');
assert(config.launch.collectFeeMode === 'ONLY_B_QUOTE', 'quote-side fee mode drift');

const mint = new PublicKey(config.token.mint);
const multisigPda = new PublicKey(config.treasury.multisig);
const expectedVault = new PublicKey(config.treasury.vault);
const [derivedVault] = multisig.getVaultPda({
  multisigPda,
  index: Number(config.treasury.vaultIndex),
});
assert(derivedVault.equals(expectedVault), 'configured Squads vault derivation mismatch');

const [mintInfo, multisigInfo, vaultSolLamports] = await Promise.all([
  getMint(connection, mint, 'confirmed', TOKEN_PROGRAM_ID),
  multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda, 'confirmed'),
  connection.getBalance(expectedVault, 'confirmed'),
]);

assert(mintInfo.decimals === config.token.decimals, 'on-chain decimals mismatch');
assert(
  mintInfo.supply === BigInt(config.token.supplyTokens) * 10n ** BigInt(config.token.decimals),
  'on-chain fixed supply mismatch',
);
assert(mintInfo.mintAuthority === null, 'mint authority is not revoked');
assert(mintInfo.freezeAuthority === null, 'freeze authority is not revoked');

const vaultAta = await getAssociatedTokenAddress(mint, expectedVault, true, TOKEN_PROGRAM_ID);
const vaultWldz = await getAccount(connection, vaultAta, 'confirmed', TOKEN_PROGRAM_ID);
assert(vaultWldz.owner.equals(expectedVault), 'WLDZ treasury ATA owner mismatch');
const baseAmountRaw = BigInt(config.launch.baseAmountTokens) * 10n ** BigInt(config.token.decimals);
assert(vaultWldz.amount >= baseAmountRaw, 'treasury does not hold 15M WLDZ');

const threshold = Number(multisigInfo.threshold);
assert(threshold === 2, 'current Squads threshold is not 2');

const initiators = multisigInfo.members.filter((m) => (Number(m.permissions.mask) & 1) === 1);
assert(initiators.length > 0, 'no Squads member has Initiate permission');

const requestedCreator = process.env.SQUADS_CREATOR
  ? new PublicKey(process.env.SQUADS_CREATOR)
  : null;
let creatorMember = requestedCreator
  ? initiators.find((m) => m.key.equals(requestedCreator))
  : null;
if (requestedCreator) assert(creatorMember, 'configured SQUADS_CREATOR is not an Initiate member');

if (!creatorMember) {
  const balances = await Promise.all(
    initiators.map(async (m) => ({ member: m, lamports: await connection.getBalance(m.key, 'confirmed') }))
  );
  balances.sort((a, b) => b.lamports - a.lamports);
  creatorMember = balances[0].member;
}
const creator = creatorMember.key;
const creatorSolLamports = await connection.getBalance(creator, 'confirmed');

const transactionIndex = multisig.utils.toBigInt(multisigInfo.transactionIndex) + 1n;
const [transactionPda] = multisig.getTransactionPda({
  multisigPda,
  index: transactionIndex,
});
const [proposalPda] = multisig.getProposalPda({
  multisigPda,
  transactionIndex,
});
const [positionNftPda] = multisig.getEphemeralSignerPda({
  transactionPda,
  ephemeralSignerIndex: 0,
});

const cpAmm = new CpAmm(connection);
const initSqrtPrice = getSqrtPriceFromPrice(
  String(config.launch.initPriceSolPerWldz),
  config.token.decimals,
  9,
);
const tokenAAmount = new BN(baseAmountRaw.toString());
const tokenBAmount = new BN(0);
const liquidityDelta = getLiquidityDeltaFromAmountA(
  tokenAAmount,
  initSqrtPrice,
  MAX_SQRT_PRICE,
  CollectFeeMode.OnlyB,
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

const { tx: meteoraTx, pool, position } = await cpAmm.createCustomPool({
  payer: expectedVault,
  creator: expectedVault,
  positionNft: positionNftPda,
  tokenAMint: mint,
  tokenBMint: NATIVE_MINT,
  tokenAAmount,
  tokenBAmount,
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

assert((await connection.getAccountInfo(pool, 'confirmed')) === null, 'target Meteora pool already exists');

const latest = await connection.getLatestBlockhash('confirmed');
const innerMessageBuilder = new TransactionMessage({
  payerKey: expectedVault,
  recentBlockhash: latest.blockhash,
  instructions: meteoraTx.instructions,
});
const innerV0 = new VersionedTransaction(innerMessageBuilder.compileToV0Message());
const innerSignerKeys = innerV0.message.staticAccountKeys
  .slice(0, innerV0.message.header.numRequiredSignatures)
  .map((k) => k.toBase58());
const allowedInnerSigners = new Set([expectedVault.toBase58(), positionNftPda.toBase58()]);
for (const signer of innerSignerKeys) {
  assert(allowedInnerSigners.has(signer), 'unexpected Meteora signer: ' + signer);
}
assert(innerSignerKeys.includes(expectedVault.toBase58()), 'vault signer missing');
assert(innerSignerKeys.includes(positionNftPda.toBase58()), 'Squads ephemeral signer missing');

const vaultCreateIx = multisig.instructions.vaultTransactionCreate({
  multisigPda,
  transactionIndex,
  creator,
  rentPayer: creator,
  vaultIndex: Number(config.treasury.vaultIndex),
  ephemeralSigners: 1,
  transactionMessage: innerMessageBuilder,
  memo: 'WORLDZ WLDZ 15M one-sided Meteora launch; 2% OnlyB; permanent lock',
});
const proposalCreateIx = multisig.instructions.proposalCreate({
  multisigPda,
  transactionIndex,
  creator,
  rentPayer: creator,
  isDraft: false,
});

const outerMessage = new TransactionMessage({
  payerKey: creator,
  recentBlockhash: latest.blockhash,
  instructions: [vaultCreateIx, proposalCreateIx],
}).compileToV0Message();
const outerV0 = new VersionedTransaction(outerMessage);

const innerSerialized = Buffer.from(innerV0.serialize());
const outerSerialized = Buffer.from(outerV0.serialize());

const innerSimulation = await connection.simulateTransaction(innerV0, {
  sigVerify: false,
  replaceRecentBlockhash: true,
  commitment: 'confirmed',
  accounts: {
    encoding: 'base64',
    addresses: [pool.toBase58(), position.toBase58()],
  },
});

const outerSimulation = await connection.simulateTransaction(outerV0, {
  sigVerify: false,
  replaceRecentBlockhash: true,
  commitment: 'confirmed',
  accounts: {
    encoding: 'base64',
    addresses: [transactionPda.toBase58(), proposalPda.toBase58()],
  },
});

const artifacts = path.resolve('artifacts');
fs.mkdirSync(artifacts, { recursive: true });

fs.writeFileSync(
  path.join(artifacts, 'wldz-meteora-inner-unsigned.v0.base64.txt'),
  innerSerialized.toString('base64') + '\n',
);
fs.writeFileSync(
  path.join(artifacts, 'wldz-squads-proposal-create-unsigned.v0.base64.txt'),
  outerSerialized.toString('base64') + '\n',
);

const report = {
  status:
    innerSimulation.value.err === null && outerSimulation.value.err === null
      ? 'BUILT_AND_SIMULATED'
      : 'BUILT_SIMULATION_BLOCKED',
  broadcast: false,
  valueMoved: false,
  network: 'mainnet-beta',
  rpc: RPC,
  canonicalMint: mint.toBase58(),
  token: {
    supplyTokens: config.token.supplyTokens,
    decimals: mintInfo.decimals,
    mintAuthorityRevoked: mintInfo.mintAuthority === null,
    freezeAuthorityRevoked: mintInfo.freezeAuthority === null,
    treasuryAta: vaultAta.toBase58(),
    treasuryBalanceRaw: vaultWldz.amount.toString(),
  },
  squads: {
    multisig: multisigPda.toBase58(),
    threshold,
    vaultIndex: Number(config.treasury.vaultIndex),
    vault: expectedVault.toBase58(),
    vaultSolLamports,
    creator: creator.toBase58(),
    creatorSolLamports,
    transactionIndex: transactionIndex.toString(),
    transactionPda: transactionPda.toBase58(),
    proposalPda: proposalPda.toBase58(),
    positionNftEphemeralSigner: positionNftPda.toBase58(),
    ephemeralSigners: 1,
  },
  meteora: {
    program: config.launch.program,
    pool: pool.toBase58(),
    position: position.toBase58(),
    quoteMint: NATIVE_MINT.toBase58(),
    activeWldzTokens: config.launch.baseAmountTokens,
    activeWldzRaw: baseAmountRaw.toString(),
    startingQuoteSolConfigured: 0,
    initPriceSolPerWldz: config.launch.initPriceSolPerWldz,
    collectFeeMode: 'OnlyB',
    baseFeeBps: config.launch.baseFeeBps,
    dynamicFeeEnabled: false,
    permanentLockIncludedAtomically: true,
    liquidityDelta: liquidityDelta.toString(),
    instructionCount: meteoraTx.instructions.length,
    requiredSigners: innerSignerKeys,
  },
  serialized: {
    innerMeteoraV0Bytes: innerSerialized.length,
    innerMeteoraBase64File: 'wldz-meteora-inner-unsigned.v0.base64.txt',
    innerMessageSha256: sha256(Buffer.from(innerV0.message.serialize())),
    squadsProposalCreateV0Bytes: outerSerialized.length,
    squadsProposalCreateBase64File: 'wldz-squads-proposal-create-unsigned.v0.base64.txt',
    squadsProposalMessageSha256: sha256(Buffer.from(outerV0.message.serialize())),
    realTransactionSignature: null,
    realTransactionSignatureReason: 'Unsigned build only. A real Solana signature exists only after an authorized Squads member signs/submits.',
  },
  simulation: {
    innerMeteora: {
      err: innerSimulation.value.err,
      contextSlot: innerSimulation.context.slot,
      unitsConsumed: innerSimulation.value.unitsConsumed ?? null,
      logs: innerSimulation.value.logs ?? [],
      simulatedPoolAccount: accountProof(innerSimulation.value.accounts?.[0] ?? null),
      simulatedPositionAccount: accountProof(innerSimulation.value.accounts?.[1] ?? null),
    },
    squadsProposalCreate: {
      err: outerSimulation.value.err,
      contextSlot: outerSimulation.context.slot,
      unitsConsumed: outerSimulation.value.unitsConsumed ?? null,
      logs: outerSimulation.value.logs ?? [],
      simulatedTransactionAccount: accountProof(outerSimulation.value.accounts?.[0] ?? null),
      simulatedProposalAccount: accountProof(outerSimulation.value.accounts?.[1] ?? null),
    },
  },
};

fs.writeFileSync(
  path.join(artifacts, 'wldz-squads-meteora-build-proof.json'),
  JSON.stringify(report, null, 2) + '\n',
);

console.log('WLDZ_SQUADS_METEORA_BUILD=' + report.status);
console.log('WLDZ_PROPOSAL_PDA=' + proposalPda.toBase58());
console.log('WLDZ_TRANSACTION_PDA=' + transactionPda.toBase58());
console.log('WLDZ_POOL=' + pool.toBase58());
console.log('WLDZ_POSITION=' + position.toBase58());
console.log('WLDZ_INNER_SIM_ERR=' + JSON.stringify(innerSimulation.value.err));
console.log('WLDZ_OUTER_SIM_ERR=' + JSON.stringify(outerSimulation.value.err));
console.log('WLDZ_SIM_FINGERPRINT=' + report.serialized.squadsProposalMessageSha256);

if (innerSimulation.value.err !== null || outerSimulation.value.err !== null) {
  process.exitCode = 2;
}
