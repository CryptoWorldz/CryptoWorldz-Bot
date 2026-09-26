#!/usr/bin/env node
// REVIVE existing Meteora DAMM v2 pool audit. READ ONLY: no keys, signatures or sends.
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import { CpAmm } from '@meteora-ag/cp-amm-sdk';

const rpc = process.env.SOLANA_MAINNET_RPC_URL?.trim() || clusterApiUrl('mainnet-beta');
const connection = new Connection(rpc, 'confirmed');
const genesis = await connection.getGenesisHash();
if (genesis !== '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d') throw new Error('MAINNET_RPC_REQUIRED');
const poolAddress = new PublicKey('YWEMDsd6o3dm8uXNnmnWWU3c1UtFqDUKEMfbQ512i5c');
const rvivMint = 'DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R';
const cpAmm = new CpAmm(connection);
const pool = await cpAmm.fetchPoolState(poolAddress);
const [fees, positions, vaultA, vaultB] = await Promise.all([
  cpAmm.fetchPoolFees(poolAddress),
  cpAmm.getAllPositionsByPool(poolAddress),
  connection.getTokenAccountBalance(pool.tokenAVault, 'confirmed'),
  connection.getTokenAccountBalance(pool.tokenBVault, 'confirmed'),
]);
const asText = value => value?.toBase58?.() || value?.toString?.() || String(value);
const safe = value => JSON.parse(JSON.stringify(value, (_, v) =>
  typeof v === 'bigint' ? v.toString() : v?.toBase58?.() || (v?.constructor?.name === 'BN' ? v.toString() : v)
));
const mintsMatch = pool.tokenAMint.toBase58() === rvivMint && pool.tokenBMint.equals(NATIVE_MINT);
const report = {
  proof: 'REVIVE_EXISTING_METEORA_POOL_READ_ONLY_AUDIT',
  observedAt: new Date().toISOString(), network: 'solana-mainnet-beta', genesis,
  pool: poolAddress.toBase58(),
  tokenAMint: pool.tokenAMint.toBase58(), tokenBMint: pool.tokenBMint.toBase58(),
  rvivWsolPairMatches: mintsMatch,
  creator: asText(pool.creator),
  tokenAVault: pool.tokenAVault.toBase58(), tokenBVault: pool.tokenBVault.toBase58(),
  vaultABalanceRaw: vaultA.value.amount, vaultBBalanceRaw: vaultB.value.amount,
  liquidity: asText(pool.liquidity), permanentLockLiquidity: asText(pool.permanentLockLiquidity),
  poolStatus: pool.poolStatus, activationType: pool.activationType,
  activationPoint: asText(pool.activationPoint), collectFeeMode: pool.collectFeeMode,
  sqrtPrice: asText(pool.sqrtPrice), feeVersion: pool.feeVersion,
  decodedBaseFees: safe(fees),
  positions: positions.map(x => ({
    address: x.publicKey.toBase58(), nftMint: asText(x.account.nftMint),
    unlockedLiquidity: asText(x.account.unlockedLiquidity),
    vestedLiquidity: asText(x.account.vestedLiquidity),
    permanentLockedLiquidity: asText(x.account.permanentLockedLiquidity),
  })),
  safety: { signed: false, broadcast: false, keysRead: false },
};
console.log(JSON.stringify(report, null, 2));
if (!mintsMatch) process.exitCode = 2;
