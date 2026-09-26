import fs from "node:fs";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getMint } from "@solana/spl-token";
import { CollectFeeMode, CpAmm } from "@meteora-ag/cp-amm-sdk";
import BN from "bn.js";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
if ((await connection.getGenesisHash()) !== "GH7ome3EiwEr7tu9JuTh2dpYWBJK3z69Xm1ZE3MEE6JC") throw new Error("DEVNET_RPC_REQUIRED");
const evidence = JSON.parse(fs.readFileSync("artifacts/pnex-full-devnet-proof.json", "utf8"));
if (evidence.mainnetTouched !== false || evidence.mainnetExecution !== false || evidence.genesis.mainnetPrice !== null) {
  throw new Error("MAINNET_ISOLATION_FAILED");
}

const cp = new CpAmm(connection);
const mintKey = new PublicKey(evidence.mockMint);
const poolKey = new PublicKey(evidence.pool);
const positionKey = new PublicKey(evidence.position);
const [mint, pool, position, fees] = await Promise.all([
  getMint(connection, mintKey, "confirmed", TOKEN_PROGRAM_ID),
  cp.fetchPoolState(poolKey),
  cp.fetchPositionState(positionKey),
  cp.fetchPoolFees(poolKey)
]);

if (mint.mintAuthority !== null || mint.freezeAuthority !== null) throw new Error("AUTHORITY_PROOF_FAILED");
if (mint.supply !== BigInt(evidence.burn.supplyAfterRaw)) throw new Error("BURN_SUPPLY_PROOF_FAILED");
if (!pool.tokenAMint.equals(mintKey) || Number(pool.collectFeeMode) !== Number(CollectFeeMode.OnlyB)) throw new Error("POOL_IDENTITY_OR_MODE_FAILED");
if (
  BigInt(fees.cliffFeeNumerator.toString()) !== 7_500_000n ||
  Number(fees.numberOfPeriod) !== 0 ||
  Number(pool.poolFees.dynamicFee.initialized) !== 0
) throw new Error("FEE_STATE_PROOF_FAILED");
if (
  position.permanentLockedLiquidity.lte(new BN(0)) ||
  !position.unlockedLiquidity.isZero() ||
  !position.vestedLiquidity.isZero()
) throw new Error("PERMANENT_LOCK_PROOF_FAILED");
if (BigInt(position.metrics.totalClaimedBFee.toString()) < BigInt(evidence.fee.claimedQuoteRaw)) {
  throw new Error("CLAIMED_FEE_PROOF_FAILED");
}
for (const signature of Object.values(evidence.transactions)) {
  const state = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
  if (!state?.value || state.value.err) throw new Error("UNCONFIRMED_TRANSACTION " + signature);
}
console.log("PNEX_FULL_DEVNET_VERIFY=PASS supply_burn=YES authorities_revoked=YES pool=YES fee_75bps=YES dynamic=OFF lock=PERMANENT first_swap=YES fee_claim=YES");
