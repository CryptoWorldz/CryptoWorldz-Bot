#!/usr/bin/env node
// REVIVE treasury control diagnostic — READ ONLY.
// No private keys, no signing, no transaction construction, no broadcast.

import fs from 'node:fs';
import {
  Connection,
  PublicKey,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';

const RPC = process.env.SOLANA_MAINNET_RPC_URL?.trim() || clusterApiUrl('mainnet-beta');
const MAINNET_GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

const cfg = JSON.parse(
  fs.readFileSync('../../worldzpad-mainnet/revive/revive-launch-contract.v1.json', 'utf8'),
);

const connection = new Connection(RPC, 'confirmed');
const genesis = await connection.getGenesisHash();
if (genesis !== MAINNET_GENESIS) throw new Error('MAINNET RPC REQUIRED genesis=' + genesis);

const treasury = new PublicKey(cfg.token.treasuryVault);
const rvivMint = new PublicKey(cfg.token.canonicalMint);
const expectedTokenAccount = new PublicKey(cfg.token.treasuryTokenAccount);

const treasuryIsOnCurve = PublicKey.isOnCurve(treasury.toBytes());
const derivedAta = getAssociatedTokenAddressSync(
  rvivMint,
  treasury,
  true, // diagnostic only: treasury is known off-curve
  TOKEN_PROGRAM_ID,
);

const [treasuryInfo, tokenInfo, parsedTokenInfo, tokenBalance, signatures] = await Promise.all([
  connection.getAccountInfo(treasury, 'confirmed'),
  connection.getAccountInfo(expectedTokenAccount, 'confirmed'),
  connection.getParsedAccountInfo(expectedTokenAccount, 'confirmed'),
  connection.getTokenAccountBalance(expectedTokenAccount, 'confirmed'),
  connection.getSignaturesForAddress(expectedTokenAccount, { limit: 100 }, 'confirmed'),
]);

const parsed = parsedTokenInfo?.value?.data?.parsed?.info ?? null;

const signatureSummaries = [];
const programIds = new Set();
const authorityMentions = [];

for (const sig of signatures.slice(0, 40)) {
  let tx = null;
  try {
    tx = await connection.getParsedTransaction(sig.signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
  } catch (e) {
    signatureSummaries.push({
      signature: sig.signature,
      slot: sig.slot,
      blockTime: sig.blockTime,
      err: sig.err,
      fetchError: String(e?.message || e),
    });
    continue;
  }

  const txProgramIds = new Set();
  const instructions = tx?.transaction?.message?.instructions ?? [];
  for (const ix of instructions) {
    if (ix?.programId) {
      const p = ix.programId.toBase58();
      txProgramIds.add(p);
      programIds.add(p);
    }
    const info = ix?.parsed?.info ?? null;
    if (info) {
      const serialized = JSON.stringify(info);
      if (
        serialized.includes(treasury.toBase58()) ||
        serialized.includes(expectedTokenAccount.toBase58())
      ) {
        authorityMentions.push({
          signature: sig.signature,
          program: ix?.program || null,
          programId: ix?.programId?.toBase58?.() || null,
          type: ix?.parsed?.type || null,
          info,
        });
      }
    }
  }

  const inner = tx?.meta?.innerInstructions ?? [];
  for (const group of inner) {
    for (const ix of group.instructions ?? []) {
      if (ix?.programId) {
        const p = ix.programId.toBase58();
        txProgramIds.add(p);
        programIds.add(p);
      }
      const info = ix?.parsed?.info ?? null;
      if (info) {
        const serialized = JSON.stringify(info);
        if (
          serialized.includes(treasury.toBase58()) ||
          serialized.includes(expectedTokenAccount.toBase58())
        ) {
          authorityMentions.push({
            signature: sig.signature,
            inner: true,
            program: ix?.program || null,
            programId: ix?.programId?.toBase58?.() || null,
            type: ix?.parsed?.type || null,
            info,
          });
        }
      }
    }
  }

  signatureSummaries.push({
    signature: sig.signature,
    slot: sig.slot,
    blockTime: sig.blockTime,
    err: sig.err,
    fee: tx?.meta?.fee ?? null,
    programIds: [...txProgramIds],
    accountKeys: (tx?.transaction?.message?.accountKeys ?? []).map((k) => ({
      pubkey: k.pubkey.toBase58(),
      signer: Boolean(k.signer),
      writable: Boolean(k.writable),
    })),
  });
}

const report = {
  proof: 'REVIVE_TREASURY_CONTROL_READ_ONLY',
  network: 'solana-mainnet-beta',
  genesisHash: genesis,
  rpcHost: new URL(RPC).host,
  treasury: {
    address: treasury.toBase58(),
    isOnCurve: treasuryIsOnCurve,
    exists: Boolean(treasuryInfo),
    lamports: treasuryInfo?.lamports ?? 0,
    accountOwnerProgram: treasuryInfo?.owner?.toBase58?.() ?? null,
    executable: treasuryInfo?.executable ?? null,
    dataLength: treasuryInfo?.data?.length ?? null,
  },
  rviv: {
    mint: rvivMint.toBase58(),
    expectedTreasuryTokenAccount: expectedTokenAccount.toBase58(),
    derivedOffCurveOwnerAta: derivedAta.toBase58(),
    ataMatchesConfig: derivedAta.equals(expectedTokenAccount),
    tokenAccountExists: Boolean(tokenInfo),
    tokenProgram: tokenInfo?.owner?.toBase58?.() ?? null,
    amountRaw: tokenBalance?.value?.amount ?? null,
    amountTokens: tokenBalance?.value?.uiAmountString ?? null,
    parsedOwnerAuthority: parsed?.owner ?? null,
    parsedMint: parsed?.mint ?? null,
    delegate: parsed?.delegate ?? null,
    delegatedAmount: parsed?.delegatedAmount ?? null,
    closeAuthority: parsed?.closeAuthority ?? null,
    state: parsed?.state ?? null,
  },
  history: {
    signatureCountReturned: signatures.length,
    inspectedTransactions: signatureSummaries.length,
    programIdsSeen: [...programIds].sort(),
    authorityMentions,
    transactions: signatureSummaries,
  },
  conclusion: treasuryIsOnCurve
    ? 'NORMAL_SIGNER_ADDRESS'
    : 'OFF_CURVE_AUTHORITY_REQUIRES_PROGRAM_DERIVATION_OR_EXISTING_DELEGATE_CONTROL_PATH',
  safety: {
    readOnly: true,
    signs: false,
    broadcasts: false,
    movesSol: false,
    movesRviv: false,
    privateKeysRead: false,
  },
};

fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync(
  'artifacts/revive-treasury-control-readonly.json',
  JSON.stringify(report, null, 2) + '\n',
);

console.log('REVIVE_TREASURY_CONTROL=' + report.conclusion);
console.log('TREASURY_ON_CURVE=' + treasuryIsOnCurve);
console.log('TREASURY_ACCOUNT_OWNER_PROGRAM=' + report.treasury.accountOwnerProgram);
console.log('RVIV_TREASURY_ATA=' + report.rviv.expectedTreasuryTokenAccount);
console.log('RVIV_DERIVED_ATA_MATCH=' + report.rviv.ataMatchesConfig);
console.log('RVIV_AMOUNT_TOKENS=' + report.rviv.amountTokens);
console.log('RVIV_TOKEN_OWNER_AUTHORITY=' + report.rviv.parsedOwnerAuthority);
console.log('RVIV_DELEGATE=' + (report.rviv.delegate || 'NONE'));
console.log('RVIV_CLOSE_AUTHORITY=' + (report.rviv.closeAuthority || 'NONE'));
console.log('HISTORY_PROGRAM_IDS=' + report.history.programIdsSeen.join(','));
for (const m of report.history.authorityMentions.slice(0, 30)) {
  console.log('AUTHORITY_HISTORY ' + JSON.stringify(m));
}
