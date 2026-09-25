#!/usr/bin/env node
// REVIVE mainnet SOL floor estimator.
// READ-ONLY: no signer, no wallet, no transaction, no token movement.
// It queries Solana mainnet only for current rent-exemption values.

const RPC = process.env.SOLANA_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com';

const ACCOUNTS = [
  { key: 'meteora_pool', bytes: 1112, required: true },
  { key: 'meteora_position', bytes: 408, required: true },
  { key: 'rviv_pool_vault', bytes: 165, required: true },
  { key: 'wsol_pool_vault', bytes: 165, required: true },
  { key: 'position_nft_mint_token2022_with_meteora_metadata', bytes: 465, required: true },
  { key: 'position_nft_account_token2022', bytes: 165, required: true },
  { key: 'payer_wsol_ata_if_missing', bytes: 165, required: false },
];

async function rpc(method, params=[]) {
  const r = await fetch(RPC, {
    method: 'POST',
    headers: {'content-type':'application/json'},
    body: JSON.stringify({jsonrpc:'2.0',id:1,method,params}),
  });
  const x = await r.json();
  if (!r.ok || x.error) throw new Error(method+': '+JSON.stringify(x.error || r.status));
  return x.result;
}

const genesis = await rpc('getGenesisHash');
if (genesis !== '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp') {
  throw new Error('MAINNET RPC REQUIRED; unexpected genesis hash '+genesis);
}

for (const a of ACCOUNTS) {
  a.rentLamports = await rpc('getMinimumBalanceForRentExemption',[a.bytes,{commitment:'confirmed'}]);
}

const requiredRent = ACCOUNTS.filter(x=>x.required).reduce((s,x)=>s+BigInt(x.rentLamports),0n);
const optionalWsolAtaRent = BigInt(ACCOUNTS.find(x=>x.key==='payer_wsol_ata_if_missing').rentLamports);

// createCustomPool uses payer + fresh position NFT mint as the two transaction signers.
const baseSignatureFeeLamports = 2n * 5000n;
// Meteora initializes Token-2022 metadata on the position NFT mint, expanding it to 465 bytes.
// Meteora's customizable-pool path forces at least 1 raw unit of native SOL/wSOL on the quote side.
const mandatoryQuoteLamports = 1n;

const floorWithExistingWsolAta = requiredRent + baseSignatureFeeLamports + mandatoryQuoteLamports;
const floorWithoutExistingWsolAta = floorWithExistingWsolAta + optionalWsolAtaRent;

const report = {
  proof:'REVIVE_MAINNET_SOL_FLOOR_READ_ONLY',
  network:'solana-mainnet-beta',
  genesisHash:genesis,
  rpcHost:new URL(RPC).host,
  accounts:ACCOUNTS,
  transaction:{
    assumedSignatures:2,
    baseFeeLamportsPerSignature:5000,
    baseSignatureFeeLamports:baseSignatureFeeLamports.toString(),
    priorityFeeLamports:0,
    mandatoryQuoteLamports:mandatoryQuoteLamports.toString(),
  },
  floor:{
    existingPayerWsolAtaLamports:floorWithExistingWsolAta.toString(),
    existingPayerWsolAtaSol:Number(floorWithExistingWsolAta)/1e9,
    missingPayerWsolAtaLamports:floorWithoutExistingWsolAta.toString(),
    missingPayerWsolAtaSol:Number(floorWithoutExistingWsolAta)/1e9,
  },
  exclusions:[
    'No optional priority fee',
    'No discretionary first buy',
    'No extra wallet-to-wallet funding transfer',
    'No RVIV acquisition cost: canonical RVIV already exists',
    'No second mint creation',
  ],
  warning:'This is the protocol/account-creation floor, not a recommended wallet balance. Re-run immediately before mainnet and simulate the final signed message before broadcast.',
  mainnetExecution:false,
};

console.log(JSON.stringify(report,null,2));
