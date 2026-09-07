import fs from 'node:fs';
import path from 'node:path';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  AuthorityType,
  TOKEN_2022_PROGRAM_ID,
  createMint,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
} from '@solana/spl-token';

const DECIMALS = 9;
const UNIT = 10n ** BigInt(DECIMALS);
const TOTAL_TOKENS = 100_000_000n;
const MASTER = {
  founder: 25_000_000n,
  liquidity: 25_000_000n,
  peopleCharity: 25_000_000n,
  ecosystem: 25_000_000n,
};
const RPC = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
const connection = new Connection(RPC, 'confirmed');
const payer = Keypair.generate();
const mintKeypair = Keypair.generate();
const vaultOwners = Object.fromEntries(Object.keys(MASTER).map((name) => [name, Keypair.generate()]));
const runtimeDir = path.resolve('.runtime');
const artifactDir = path.resolve('artifacts');
fs.mkdirSync(runtimeDir, { recursive: true });
fs.mkdirSync(artifactDir, { recursive: true });

function secret(kp) { return Array.from(kp.secretKey); }
async function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function fundPayer() {
  const attempts = [2, 1, 0.5, 0.25];
  let lastError;
  for (const sol of attempts) {
    try {
      const sig = await connection.requestAirdrop(payer.publicKey, Math.floor(sol * LAMPORTS_PER_SOL));
      const latest = await connection.getLatestBlockhash('confirmed');
      await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed');
      const balance = await connection.getBalance(payer.publicKey, 'confirmed');
      if (balance > 0) return { sig, solRequested: sol, balanceLamports: balance };
    } catch (err) {
      lastError = err;
      await sleep(3500);
    }
  }
  throw new Error(`Devnet airdrop failed after retries: ${lastError?.message || lastError}`);
}

const airdrop = await fundPayer();

// Token-2022 mint: freeze authority deliberately unset. No TransferFeeConfig or TransferHook extensions.
const mint = await createMint(
  connection,
  payer,
  payer.publicKey,
  null,
  DECIMALS,
  mintKeypair,
  { commitment: 'confirmed' },
  TOKEN_2022_PROGRAM_ID,
);

const vaults = {};
const mintSignatures = {};
for (const [name, tokenCount] of Object.entries(MASTER)) {
  const owner = vaultOwners[name];
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    owner.publicKey,
    false,
    'confirmed',
    { commitment: 'confirmed' },
    TOKEN_2022_PROGRAM_ID,
  );
  const amount = tokenCount * UNIT;
  const sig = await mintTo(
    connection,
    payer,
    mint,
    ata.address,
    payer,
    amount,
    [],
    { commitment: 'confirmed' },
    TOKEN_2022_PROGRAM_ID,
  );
  vaults[name] = { owner: owner.publicKey.toBase58(), tokenAccount: ata.address.toBase58(), tokens: tokenCount.toString() };
  mintSignatures[name] = sig;
}

const revokeSig = await setAuthority(
  connection,
  payer,
  mint,
  payer,
  AuthorityType.MintTokens,
  null,
  [],
  { commitment: 'confirmed' },
  TOKEN_2022_PROGRAM_ID,
);

const mintInfo = await getMint(connection, mint, 'confirmed', TOKEN_2022_PROGRAM_ID);
if (mintInfo.supply !== TOTAL_TOKENS * UNIT) throw new Error(`supply mismatch: ${mintInfo.supply}`);
if (mintInfo.mintAuthority !== null) throw new Error('mint authority was not revoked');
if (mintInfo.freezeAuthority !== null) throw new Error('freeze authority unexpectedly set');

const publicReport = {
  phase: 'WLDZ_DEVNET_PHASE1',
  network: 'devnet',
  rpc: RPC,
  tokenProgram: TOKEN_2022_PROGRAM_ID.toBase58(),
  mint: mint.toBase58(),
  decimals: DECIMALS,
  supplyTokens: TOTAL_TOKENS.toString(),
  mintAuthority: null,
  freezeAuthority: null,
  transferFeeExtension: false,
  transferHook: false,
  masterVaults: vaults,
  signatures: { airdrop: airdrop.sig, mintAllocations: mintSignatures, revokeMintAuthority: revokeSig },
};
fs.writeFileSync(path.join(artifactDir, 'wldz-devnet-phase1-public.json'), JSON.stringify(publicReport, null, 2) + '\n');

// Ephemeral DEVNET keys only. Never upload this file as an artifact and never commit it.
const runtimeState = {
  ...publicReport,
  ephemeralDevnetSecrets: {
    payer: secret(payer),
    mint: secret(mintKeypair),
    vaultOwners: Object.fromEntries(Object.entries(vaultOwners).map(([n, kp]) => [n, secret(kp)])),
  },
};
fs.writeFileSync(path.join(runtimeDir, 'wldz-devnet-state.json'), JSON.stringify(runtimeState));

console.log(`WLDZ_DEVNET_PHASE1=PASS mint=${mint.toBase58()} supply=100000000 vaults=25/25/25/25 mint_authority=revoked freeze_authority=none`);
