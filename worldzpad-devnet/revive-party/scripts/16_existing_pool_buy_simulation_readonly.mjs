#!/usr/bin/env node
// A hypothetical 0.001 SOL buy against the existing RVIV pool. READ ONLY.
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { CpAmm, swapQuoteExactInput } from '@meteora-ag/cp-amm-sdk';
import BN from 'bn.js';

const rpc = process.env.SOLANA_MAINNET_RPC_URL?.trim() || clusterApiUrl('mainnet-beta');
const connection = new Connection(rpc, 'confirmed');
const genesis = await connection.getGenesisHash();
if (genesis !== '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d') throw new Error('MAINNET_RPC_REQUIRED');
const poolAddress = new PublicKey('YWEMDsd6o3dm8uXNnmnWWU3c1UtFqDUKEMfbQ512i5c');
const rvivMint = new PublicKey('DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R');
const payer = new PublicKey(process.env.REVIVE_SIMULATION_WALLET || 'Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u');
const sdk = new CpAmm(connection);
const pool = await sdk.fetchPoolState(poolAddress);
if (!pool.tokenAMint.equals(rvivMint) || !pool.tokenBMint.equals(NATIVE_MINT)) throw new Error('WRONG_POOL_MINTS');
const amountIn = new BN(1_000_000); // 0.001 SOL. Never broadcast.
const quote = swapQuoteExactInput(pool, new BN(Math.floor(Date.now() / 1000)), amountIn,
  1, false, false, 6, 9);
const tx = await sdk.swap({
  payer, pool: poolAddress, inputTokenMint: NATIVE_MINT, outputTokenMint: rvivMint,
  amountIn, minimumAmountOut: quote.minimumAmountOut,
  tokenAMint: rvivMint, tokenBMint: NATIVE_MINT,
  tokenAVault: pool.tokenAVault, tokenBVault: pool.tokenBVault,
  tokenAProgram: TOKEN_PROGRAM_ID, tokenBProgram: TOKEN_PROGRAM_ID,
  referralTokenAccount: null, poolState: pool,
});
tx.feePayer = payer;
tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
const wire = tx.serialize({requireAllSignatures:false, verifySignatures:false}).toString('base64');
const reply = await fetch(rpc, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
  jsonrpc:'2.0',id:1,method:'simulateTransaction',params:[wire,{
    encoding:'base64',sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed',
  }],
})});
const envelope = await reply.json();
if (!reply.ok || envelope.error) throw new Error('RPC_SIMULATION_ERROR ' + JSON.stringify(envelope.error || reply.status));
const result = envelope.result?.value;
if (!result) throw new Error('NO_SIMULATION_RESULT');
console.log(JSON.stringify({proof:'REVIVE_EXISTING_POOL_BUY_READ_ONLY_SIMULATION',
  network:'solana-mainnet-beta',pool:poolAddress.toBase58(),
  payer:payer.toBase58(),hypotheticalInputSol:0.001,
  quotedRvivRaw:quote.outputAmount.toString(),minimumRvivRaw:quote.minimumAmountOut.toString(),
  simulationError:result.err,unitsConsumed:result.unitsConsumed,
  logs:result.logs?.slice(-32),safety:{signed:false,broadcast:false,tokenMovement:false}
},null,2));
if(result.err) process.exitCode=2;
