#!/usr/bin/env node
import fs from "node:fs";
import { PublicKey } from "@solana/web3.js";
import { getVaultPda } from "@sqds/multisig";

const OPERATIONS_MULTISIG = new PublicKey("B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN");
const VERIFIED_INDEX0 = "n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB";

const operationRoles = [
  { index: 0, id: "operations_existing", label: "Existing Worldz Operations Treasury" },
  { index: 1, id: "pnex_chance", label: "PHENIX Chance Vault" },
  { index: 2, id: "pnex_developer_vesting", label: "PHENIX Developer Vesting Funding Vault" },
  { index: 3, id: "pnex_legacy_claim", label: "PHENIX Purple Diamond Handz Claim Vault" }
];

const operationsVaults = operationRoles.map((role) => {
  const [vault, bump] = getVaultPda({ multisigPda: OPERATIONS_MULTISIG, index: role.index });
  return { ...role, address: vault.toBase58(), bump };
});
if (operationsVaults[0].address !== VERIFIED_INDEX0) {
  throw new Error("SQUADS_VAULT_DERIVATION_MISMATCH expected=" + VERIFIED_INDEX0 + " got=" + operationsVaults[0].address);
}
if (new Set(operationsVaults.map(v => v.address)).size !== operationsVaults.length) throw new Error("DUPLICATE_OPERATIONS_VAULT_PDA");

const reserveVaults = [
  { id:"pnex_flywheel", label:"PHENIX Total Supply FlyWheel Reserve", address:null },
  { id:"pnex_staged_liquidity", label:"PHENIX Staged Liquidity Reserve", address:null },
  { id:"pnex_lp_quote_reserve", label:"PHENIX LP Quote Reserve", address:null }
];

const out = {
  schema:"PNEX-SQUADS-VAULT-MAP-V2",
  version:"PNEX-SQUADS-VAULT-MAP-2026-09-26-B",
  network:"solana-mainnet-beta",
  provider:"Squads v4",
  operations:{
    multisigConfigAddress:OPERATIONS_MULTISIG.toBase58(),
    currentGovernance:"2-of-3",
    requiredGovernanceBeforePHENIXMainnet:"5-of-10",
    governanceUpgradeComplete:false,
    index0CrossCheck:"PASS",
    vaults:operationsVaults
  },
  reserve:{
    requiredGovernanceBeforePHENIXMainnet:"6-of-9",
    multisigConfigAddress:null,
    deploymentComplete:false,
    vaults:reserveVaults
  },
  tokenMint:null,
  note:"Operational vault owner PDAs can be derived now and remain stable through an in-place Operations membership/threshold upgrade. Reserve addresses remain null until the separate 6-of-9 Reserve multisig is deployed. PNEX token accounts remain pending the canonical mint.",
  execution:{createsAccounts:false,signs:false,broadcasts:false,mainnetExecutionEnabled:false}
};
fs.mkdirSync("worldzpad-mainnet/phenix",{recursive:true});
fs.writeFileSync("worldzpad-mainnet/phenix/pnex-squads-vault-map.v1.json",JSON.stringify(out,null,2)+"\n");
console.log("PNEX_SQUADS_VAULT_MAP=PASS operations_index0="+operationsVaults[0].address+" operations_vaults="+operationsVaults.length+" ops_upgrade=5_OF_10_PENDING reserve=6_OF_9_NOT_DEPLOYED");
