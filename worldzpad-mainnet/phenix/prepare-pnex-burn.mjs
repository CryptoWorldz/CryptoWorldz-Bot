#!/usr/bin/env node
/**
 * Worldz ProofBurn™ PNEX burn transaction preparer.
 *
 * Builds a chain-native SPL BurnChecked instruction. It never stores a private
 * key, signs, or broadcasts. With --rpc it fetches a recent blockhash and emits
 * an unsigned base64 transaction for the user's wallet/multisig to review,
 * sign, simulate, and only then broadcast through the approved Worldz flow.
 */
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  createBurnCheckedInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";

function argsOf(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (key === "--self-test" || key === "--token-2022") out[key.slice(2)] = true;
    else if (key.startsWith("--")) out[key.slice(2)] = argv[++i];
  }
  return out;
}

function toRaw(value, decimals) {
  if (!/^\d+(\.\d+)?$/.test(value)) throw new Error("amount must be a positive decimal string");
  const [whole, frac = ""] = value.split(".");
  if (frac.length > decimals) throw new Error(`amount has more than ${decimals} decimal places`);
  const padded = frac.padEnd(decimals, "0");
  const raw = BigInt(whole) * (10n ** BigInt(decimals)) + BigInt(padded || "0");
  if (raw <= 0n) throw new Error("burn amount must be greater than zero");
  return raw;
}

function buildInstruction({ mint, source, owner, amount, decimals, token2022 = false }) {
  const programId = token2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  const raw = toRaw(amount, decimals);
  const ix = createBurnCheckedInstruction(
    new PublicKey(source),
    new PublicKey(mint),
    new PublicKey(owner),
    raw,
    decimals,
    [],
    programId
  );
  return { ix, raw, programId };
}

async function main() {
  const a = argsOf(process.argv);
  if (a["self-test"]) {
    const k = "11111111111111111111111111111111";
    const { ix, raw } = buildInstruction({
      mint: k, source: k, owner: k, amount: "1.000001", decimals: 6
    });
    if (raw !== 1000001n || ix.keys.length < 3) throw new Error("ProofBurn self-test failed");
    console.log("WORLDZ PROOFBURN BUILDER — SELF TEST SUCCESS");
    console.log("No signing. No broadcast.");
    return;
  }

  for (const key of ["mint", "source", "owner", "amount"]) {
    if (!a[key]) throw new Error(`--${key} is required`);
  }
  const decimals = Number(a.decimals ?? "6");
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 9) throw new Error("--decimals must be 0-9");

  const { ix, raw, programId } = buildInstruction({
    mint: a.mint, source: a.source, owner: a.owner,
    amount: a.amount, decimals, token2022: !!a["token-2022"]
  });

  const proof = {
    schema: "WORLDZ-PROOFBURN-PREP-V1",
    network: a.rpc ? "rpc-supplied" : "offline",
    mint: a.mint,
    sourceTokenAccount: a.source,
    authority: a.owner,
    amountTokens: a.amount,
    amountRaw: raw.toString(),
    decimals,
    tokenProgram: programId.toBase58(),
    instruction: {
      programId: ix.programId.toBase58(),
      accounts: ix.keys.map(k => ({ pubkey: k.pubkey.toBase58(), signer: k.isSigner, writable: k.isWritable })),
      dataBase64: Buffer.from(ix.data).toString("base64")
    },
    signed: false,
    broadcast: false,
    irreversibleAfterConfirmedBurn: true,
    nextRequiredSteps: ["wallet/multisig review", "signature", "simulation", "explicit broadcast approval", "confirmed receipt", "Worldz Proof publication"]
  };

  if (a.rpc) {
    const connection = new Connection(a.rpc, "confirmed");
    const latest = await connection.getLatestBlockhash("confirmed");
    const tx = new Transaction({
      feePayer: new PublicKey(a.owner),
      recentBlockhash: latest.blockhash
    }).add(ix);
    proof.recentBlockhash = latest.blockhash;
    proof.lastValidBlockHeight = latest.lastValidBlockHeight;
    proof.unsignedTransactionBase64 = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString("base64");
  }

  console.log(JSON.stringify(proof, null, 2));
}

main().catch(err => {
  console.error(`Worldz ProofBurn preparation failed: ${err.message}`);
  process.exit(1);
});
