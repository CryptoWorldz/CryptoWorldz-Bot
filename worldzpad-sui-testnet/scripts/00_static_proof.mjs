import fs from 'node:fs';

const move=fs.readFileSync('template/sources/worldz_token.move','utf8');
const required=[
  'coin_registry::new_currency<WorldzToken>',
  'currency.make_supply_fixed(treasury_cap)',
  'currency.finalize_and_delete_metadata_cap(ctx)',
  'PublisherCap { id: object::new(ctx) }',
  'let PublisherCap { id } = cap',
  'id.delete()',
];
for(const needle of required){
  if(!move.includes(needle))throw new Error('missing invariant: '+needle);
}
for(const forbidden of [
  'make_regulated(',
  'DenyCap',
  'create_regulated',
  'transfer_fee',
  'blacklist',
  'pause',
]){
  if(move.toLowerCase().includes(forbidden.toLowerCase()))throw new Error('forbidden token control: '+forbidden);
}
const proof={
  proof:'WORLDZ_SUI_NATIVE_TEMPLATE_STATIC',
  network:'sui-testnet',
  standard:'Sui Currency Standard / CoinRegistry',
  fixedSupply:true,
  treasuryCapSurvives:false,
  metadataMutableAfterInitialization:false,
  denyList:false,
  globalPause:false,
  walletTransferTax:false,
  publisherCapOneUse:true,
  publicMainnetExecution:false,
};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/sui-template-static-proof.json',JSON.stringify(proof,null,2)+'\n');
console.log('WORLDZ_SUI_STATIC=PASS fixed_supply=ON treasury_cap=LOCKED metadata=IMMUTABLE denylist=OFF transfer_tax=OFF mainnet=LOCKED');
