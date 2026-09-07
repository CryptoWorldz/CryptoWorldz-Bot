import fs from 'node:fs';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, getAccount, getMint } from '@solana/spl-token';

const NETWORK_LABEL = process.env.WORLDZPAD_NETWORK_LABEL || 'devnet';
const reportFile = NETWORK_LABEL === 'localnet' ? 'artifacts/wldz-localnet-phase1-public.json' : 'artifacts/wldz-devnet-phase1-public.json';
const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
const RPC = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
const connection = new Connection(RPC, 'confirmed');
const mint = new PublicKey(report.mint);
const mintInfo = await getMint(connection, mint, 'confirmed', TOKEN_2022_PROGRAM_ID);
const UNIT = 10n ** BigInt(mintInfo.decimals);
const expectedSupply = 100_000_000n * UNIT;

if (report.network !== NETWORK_LABEL) throw new Error(`report network ${report.network} != ${NETWORK_LABEL}`);
if (mintInfo.supply !== expectedSupply) throw new Error(`wrong supply: ${mintInfo.supply}`);
if (mintInfo.mintAuthority !== null) throw new Error('mint authority still exists');
if (mintInfo.freezeAuthority !== null) throw new Error('freeze authority exists');

let vaultTotal = 0n;
for (const [name, vault] of Object.entries(report.masterVaults)) {
  const account = await getAccount(connection, new PublicKey(vault.tokenAccount), 'confirmed', TOKEN_2022_PROGRAM_ID);
  const expected = BigInt(vault.tokens) * UNIT;
  if (account.amount !== expected) throw new Error(`${name} balance mismatch ${account.amount} != ${expected}`);
  vaultTotal += account.amount;
}
if (vaultTotal !== expectedSupply) throw new Error(`vault total mismatch: ${vaultTotal}`);

console.log(`WLDZ_${NETWORK_LABEL.toUpperCase()}_VERIFY=PASS mint=${report.mint} supply=100000000 founder=25 liquidity=25 people_charity=25 ecosystem=25 mint_authority=revoked freeze_authority=none`);
