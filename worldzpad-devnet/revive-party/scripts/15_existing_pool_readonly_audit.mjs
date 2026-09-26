#!/usr/bin/env node
// REVIVE existing Meteora DAMM v2 pool audit. READ ONLY: no keys, signatures or sends.
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import { CpAmm, swapQuoteExactInput } from '@meteora-ag/cp-amm-sdk';
import BN from 'bn.js';

const rpc = process.env.SOLANA_MAINNET_RPC_URL?.trim() || clusterApiUrl('mainnet-beta');
const connection = new Connection(rpc, 'confirmed');
const genesis = await connection.getGenesisHash();
if (genesis !== '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d') throw new Error('MAINNET_RPC_REQUIRED');
const poolAddress = new PublicKey('YWEMDsd6o3dm8uXNnmnWWU3c1UtFqDUKEMfbQ512i5c');
const rvivMint = 'DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R';
const cpAmm = new CpAmm(connection);
const pool = await cpAmm.fetchPoolState(poolAddress);
// Inspect the pinned SDK's decoded state; do not infer safety from address occupancy.
const [fees, positions, vaultA, vaultB, recentSignatures] = await Promise.all([
  cpAmm.fetchPoolFees(poolAddress),
  cpAmm.getAllPositionsByPool(poolAddress),
  connection.getTokenAccountBalance(pool.tokenAVault, 'confirmed'),
  connection.getTokenAccountBalance(pool.tokenBVault, 'confirmed'),
  connection.getSignaturesForAddress(poolAddress, { limit: 20 }, 'confirmed'),
]);
const asText = value => value?.toBase58?.() || value?.toString?.() || String(value);
const safe = value => JSON.parse(JSON.stringify(value, (_, v) =>
  typeof v === 'bigint' ? v.toString() : v?.toBase58?.() || (v?.constructor?.name === 'BN' ? v.toString() : v)
));
const mintsMatch = pool.tokenAMint.toBase58() === rvivMint && pool.tokenBMint.equals(NATIVE_MINT);
const positionNftHolders = await Promise.all(positions.map(async item => {
  const largest = await connection.getTokenLargestAccounts(item.account.nftMint, 'confirmed');
  const holding = largest.value.find(entry => entry.amount !== '0');
  const parsed = holding ? await connection.getParsedAccountInfo(holding.address, 'confirmed') : null;
  return { nftMint: item.account.nftMint.toBase58(),
    tokenAccount: holding?.address.toBase58() || null,
    tokenAmount: holding?.amount || '0',
    owner: parsed?.value?.data?.parsed?.info?.owner || null,
  };
}));
const fixedFeeNumerator = new BN(fees.cliffFeeNumerator.toString('hex'), 16);
const expectedFeeNumerator = new BN(7_500_000); // 75 bps of SDK's 1e9 denominator.
const fullPoolLock = pool.permanentLockLiquidity.eq(pool.liquidity) &&
  positions.length > 0 && positions.every(x => x.account.unlockedLiquidity.isZero());
let sampleBuyQuote;
try {
  const quote = swapQuoteExactInput(pool, new BN(Math.floor(Date.now() / 1000)),
    new BN(1_000_000), 1, false, false, 6, 9);
  sampleBuyQuote = {
    inputLamports: '1000000', estimatedRvivRaw: asText(quote.outputAmount),
    minimumRvivRaw: asText(quote.minimumAmountOut),
    source: 'LOCAL_SDK_QUOTE_ONLY_NOT_TRANSACTION_SIMULATION',
  };
} catch (error) {
  sampleBuyQuote = { error: error?.message || String(error), source: 'LOCAL_SDK_QUOTE_ONLY' };
}
const report = {
  proof: 'REVIVE_EXISTING_METEORA_POOL_READ_ONLY_AUDIT',
  observedAt: new Date().toISOString(), network: 'solana-mainnet-beta', genesis,
  pool: poolAddress.toBase58(),
  tokenAMint: pool.tokenAMint.toBase58(), tokenBMint: pool.tokenBMint.toBase58(),
  rvivWsolPairMatches: mintsMatch,
  fixedFeeNumerator: fixedFeeNumerator.toString(), fixed75BpsMatches: fixedFeeNumerator.eq(expectedFeeNumerator),
  fullPoolLock,
  creator: asText(pool.creator),
  tokenAVault: pool.tokenAVault.toBase58(), tokenBVault: pool.tokenBVault.toBase58(),
  vaultABalanceRaw: vaultA.value.amount, vaultBBalanceRaw: vaultB.value.amount,
  liquidity: asText(pool.liquidity), permanentLockLiquidity: asText(pool.permanentLockLiquidity),
  poolStatus: pool.poolStatus, activationType: pool.activationType,
  activationPoint: asText(pool.activationPoint), collectFeeMode: pool.collectFeeMode,
  sqrtPrice: asText(pool.sqrtPrice), feeVersion: pool.feeVersion,
  decodedBaseFees: safe(fees),
  sampleBuyQuote,
  recentPoolTransactions: recentSignatures.map(item => ({
    signature: item.signature, slot: item.slot, blockTime: item.blockTime,
    confirmationStatus: item.confirmationStatus, err: item.err,
  })),
  positions: positions.map(x => ({
    address: x.publicKey.toBase58(), nftMint: asText(x.account.nftMint),
    unlockedLiquidity: asText(x.account.unlockedLiquidity),
    vestedLiquidity: asText(x.account.vestedLiquidity),
    permanentLockedLiquidity: asText(x.account.permanentLockedLiquidity),
  })),
  positionNftHolders,
  safety: { signed: false, broadcast: false, keysRead: false },
};
console.log(JSON.stringify(report, null, 2));
if (!mintsMatch || !fixedFeeNumerator.eq(expectedFeeNumerator) || !fullPoolLock) process.exitCode = 2;
