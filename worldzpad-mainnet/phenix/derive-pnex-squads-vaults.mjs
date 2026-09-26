#!/usr/bin/env node
import fs from "node:fs";
import { PublicKey } from "@solana/web3.js";
import { getVaultPda } from "@sqds/multisig";

const MULTISIG = new PublicKey("B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN");
const VERIFIED_INDEX0 = "n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB";

const roles = [
  { index: 0, id: "operations_existing", label: "Existing Worldz Operations Treasury" },
  { index: 1, id: "pnex_chance", label: "PHENIX Chance Vault" },
  { index: 2, id: "pnex_flywheel", label: "PHENIX Total Supply FlyWheel Vault" },
  { index: 3, id: "pnex_staged_liquidity", label: "PHENIX Staged Liquidity Reserve Vault" },
  { index: 4, id: "pnex_developer_vesting", label: "PHENIX Developer Vesting Funding Vault" },
  { index: 5, id: "pnex_legacy_claim", label: "PHENIX Purple Diamond Handz Claim Vault" },
  { index: 6, id: "pnex_lp_quote_reserve", label: "PHENIX LP Quote Reserve Vault" }
];

const vaults = roles.map((role) => {
  const [vault, bump] = getVaultPda({ multisigPda: MULTISIG, index: role.index });
  return { ...role, address: vault.toBase58(), bump };
});
if (vaults[0].address !== VERIFIED_INDEX0) {
  throw new Error("SQUADS_VAULT_DERIVATION_MISMATCH expected=" + VERIFIED_INDEX0 + " got=" + vaults[0].address);
}
if (new Set(vaults.map(v => v.address)).size !== vaults.length) throw new Error("DUPLICATE_VAULT_PDA");

const out = {
  schema: "PNEX-SQUADS-VAULT-MAP-V1",
  version: "PNEX-SQUADS-VAULT-MAP-2026-09-26-A",
  network: "solana-mainnet-beta",
  provider: "Squads v4",
  multisigConfigAddress: MULTISIG.toBase58(),
  currentGovernance: "2-of-3",
  requiredGovernanceBeforePHENIXMainnet: "5-of-10",
  governanceUpgradeComplete: false,
  index0CrossCheck: "PASS",
  tokenMint: null,
  note: "Vault owner PDAs are deterministic before PNEX exists. Each PNEX token account/ATA remains pending the canonical mint.",
  vaults,
  execution: { createsAccounts: false, signs: false, broadcasts: false, mainnetExecutionEnabled: false }
};
fs.mkdirSync("worldzpad-mainnet/phenix", { recursive: true });
fs.writeFileSync("worldzpad-mainnet/phenix/pnex-squads-vault-map.v1.json", JSON.stringify(out, null, 2) + "\n");
console.log("PNEX_SQUADS_VAULT_MAP=PASS index0=" + vaults[0].address + " derived_vaults=" + vaults.length + " governance_upgrade=PENDING");
