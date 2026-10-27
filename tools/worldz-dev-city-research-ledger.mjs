// Combine independent developer research and Jupiter Studio launch evidence.
// A signer or candidate transaction is NOT proof of token creation or Worldz affiliation.
import fs from 'node:fs/promises';
const root='launchpad.cryptoworldz.xyz/wallet-snapshots/';
const read=async f=>JSON.parse(await fs.readFile(root+f,'utf8'));
const [dev,jupiter]=await Promise.all([read('dev-city-developers.latest.json'),read('jupiter-studio-creators.latest.json')]);
const address=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const wallets=new Map();
for(const item of dev.candidates||[]){
  if(!address.test(item.address)) continue;
  if(!wallets.has(item.address)) wallets.set(item.address,{
    chain:'solana',address:item.address,
    evidence:[{source:'Solfate DevList',type:'third-party-developer-registry',reference:item.source||dev.source}],
    worldzPartner:false,worldzDistributionApproved:false
  });
}
// Jupiter signers are deliberately NOT promoted to a creator/developer wallet.
// Keep launch candidates as transaction evidence pending instruction decoding.
const studio=(jupiter.launches||[]).map(row=>({
  signature:row.signature,
  mintCandidates:row.mintCandidates||[],
  signerCandidates:row.signers||[],
  classification:'unverified-transaction-candidate',
  creatorVerified:false
}));
const out={
  schema:'WORLDZ-DEV-CITY-RESEARCH-LEDGER-V1',
  generatedAt:new Date().toISOString(),
  targetDeveloperWallets:250,
  distributionSeats:100,
  distributionApproved:0,
  independentlyListedDeveloperWallets:wallets.size,
  remainingToResearch:Math.max(0,250-wallets.size),
  jupiterStudio:{
    sourceGeneratedAt:jupiter.generatedAt||null,
    scannedTransactions:jupiter.signaturesScanned||0,
    scanErrors:jupiter.errors||0,
    verifiedCreators:0,
    pendingTransactions:studio
  },
  walletResearch:[...wallets.values()].sort((a,b)=>a.address.localeCompare(b.address)),
  note:'Research only. Jupiter Studio signers are not developer attributions; no partnership, endorsement, or token transfer authorization is implied.'
};
await fs.writeFile(root+'dev-city-research-ledger.latest.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({wallets:wallets.size,remaining:out.remainingToResearch,studioCandidates:studio.length,approved:0}));
if(wallets.size===0)process.exitCode=1;
