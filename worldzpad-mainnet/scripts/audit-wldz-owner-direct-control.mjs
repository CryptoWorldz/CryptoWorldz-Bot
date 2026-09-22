import { Connection, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount
} from "@solana/spl-token";
import * as multisig from "@sqds/multisig";

const RPC = process.env.SOLANA_RPC_URL || "https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc";
const connection = new Connection(RPC, "confirmed");

const OWNER = new PublicKey("Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u");
const MINT = new PublicKey("AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U");
const MULTISIG = new PublicKey("B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN");
const VAULT = new PublicKey("n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB");

const ms = await multisig.accounts.Multisig.fromAccountAddress(connection, MULTISIG, "confirmed");
const vaultAta = await getAssociatedTokenAddress(MINT, VAULT, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
const ownerAta = await getAssociatedTokenAddress(MINT, OWNER, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

let vaultToken = null;
let ownerToken = null;
try { vaultToken = await getAccount(connection, vaultAta, "confirmed", TOKEN_PROGRAM_ID); } catch {}
try { ownerToken = await getAccount(connection, ownerAta, "confirmed", TOKEN_PROGRAM_ID); } catch {}

const configAuthority = ms.configAuthority?.toBase58?.() || String(ms.configAuthority || "");
const report = {
  network: "mainnet-beta",
  canonicalMint: MINT.toBase58(),
  owner: OWNER.toBase58(),
  multisig: MULTISIG.toBase58(),
  vault: VAULT.toBase58(),
  threshold: Number(ms.threshold),
  memberCount: ms.members.length,
  members: ms.members.map(m => ({ key: m.key.toBase58(), permissionsMask: Number(m.permissions.mask) })),
  configAuthority,
  ownerIsConfigAuthority: configAuthority === OWNER.toBase58(),
  timeLock: Number(ms.timeLock || 0),
  transactionIndex: String(ms.transactionIndex),
  vaultWldz: vaultToken ? Number(vaultToken.amount) / 1_000_000 : null,
  vaultTokenOwner: vaultToken?.owner?.toBase58?.() || null,
  vaultDelegate: vaultToken?.delegate?.toBase58?.() || null,
  vaultDelegatedWldz: vaultToken ? Number(vaultToken.delegatedAmount || 0n) / 1_000_000 : null,
  ownerWldz: ownerToken ? Number(ownerToken.amount) / 1_000_000 : 0,
  ownerAta: ownerAta.toBase58()
};
console.log("WLDZ_OWNER_DIRECT_CONTROL_AUDIT=" + JSON.stringify(report));
console.log("WLDZ_OWNER_IS_CONFIG_AUTHORITY=" + (report.ownerIsConfigAuthority ? "1" : "0"));
console.log("WLDZ_OWNER_WLDZ=" + report.ownerWldz);
console.log("WLDZ_VAULT_WLDZ=" + report.vaultWldz);
console.log("WLDZ_VAULT_DELEGATE=" + (report.vaultDelegate || "NONE"));
console.log("WLDZ_VAULT_DELEGATED_WLDZ=" + report.vaultDelegatedWldz);

console.log("WLDZ_SPENDING_LIMIT_CLASS_METHODS=" + JSON.stringify(Object.getOwnPropertyNames(multisig.accounts.SpendingLimit || {})));
console.log("WLDZ_RPC_EXPORTS=" + JSON.stringify(Object.keys(multisig.rpc || {})));

try {
  const builder = multisig.accounts.SpendingLimit.gpaBuilder();
  const rows = await builder.addFilter("multisig", MULTISIG).run(connection);
  const decoded = [];
  for (const row of rows) {
    const address = row.pubkey || row.publicKey || row[0];
    const accountInfo = row.account || row.accountInfo || row[1];
    let account = null;
    try {
      account = accountInfo?.data
        ? multisig.accounts.SpendingLimit.fromAccountInfo(accountInfo)[0]
        : await multisig.accounts.SpendingLimit.fromAccountAddress(connection, address, "confirmed");
    } catch {}
    if (!account) continue;
    decoded.push({
      address: address?.toBase58?.() || String(address || ""),
      multisig: account.multisig?.toBase58?.() || String(account.multisig || ""),
      vaultIndex: Number(account.vaultIndex || 0),
      mint: account.mint?.toBase58?.() || String(account.mint || ""),
      amount: String(account.amount || 0),
      remainingAmount: String(account.remainingAmount || 0),
      members: (account.members || []).map(x => x.toBase58?.() || String(x)),
      destinations: (account.destinations || []).map(x => x.toBase58?.() || String(x))
    });
  }
  console.log("WLDZ_SPENDING_LIMITS=" + JSON.stringify(decoded));
} catch (error) {
  console.log("WLDZ_SPENDING_LIMIT_AUDIT_ERROR=" + String(error?.message || error));
}
