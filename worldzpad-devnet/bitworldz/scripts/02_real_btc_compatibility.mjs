import fs from 'node:fs';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { DynamicBondingCurveClient, deriveTokenBadgeAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { WBTC_SOLANA_MAINNET, jsonSafe } from './common.mjs';

fs.mkdirSync('artifacts',{recursive:true});
const rpc=process.env.SOLANA_MAINNET_RPC_URL?.trim()||clusterApiUrl('mainnet-beta');
const connection=new Connection(rpc,'confirmed');
const client=new DynamicBondingCurveClient(connection,'confirmed');
const mintKey=new PublicKey(WBTC_SOLANA_MAINNET.mint);

const report={
  proof:'BITWORLDZ_REAL_BTC_REPRESENTATION_READ_ONLY_V1',
  network:'mainnet-beta',
  mode:'READ_ONLY__NO_SIGNER__NO_TRANSACTION',
  reference:WBTC_SOLANA_MAINNET,
  status:'STARTED',
  mainnetExecution:false,
};

try{
  const [mint,accountInfo]=await Promise.all([
    getMint(connection,mintKey,'confirmed'),
    connection.getAccountInfo(mintKey,'confirmed'),
  ]);
  if(!accountInfo) throw new Error('WBTC mint account not found');
  report.mint={
    address:mintKey.toBase58(),
    decimals:mint.decimals,
    supplyAtomic:mint.supply.toString(),
    mintAuthority:mint.mintAuthority?.toBase58?.()??null,
    freezeAuthority:mint.freezeAuthority?.toBase58?.()??null,
    ownerProgram:accountInfo.owner.toBase58(),
  };
  if(mint.decimals!==8) throw new Error('WBTC decimals are not the expected 8');

  const badgeAddress=deriveTokenBadgeAddress(mintKey);
  report.meteoraDbc={tokenBadgeAddress:badgeAddress.toBase58(),tokenBadgePresent:false};
  try{
    const badge=await client.state.getTokenBadge(badgeAddress);
    if(badge){
      report.meteoraDbc.tokenBadgePresent=true;
      report.meteoraDbc.tokenBadge=jsonSafe(badge);
    }
  }catch(e){
    report.meteoraDbc.tokenBadgeReadError=e?.message||String(e);
  }

  report.status='PASS_ASSET_IDENTITY_READ_ONLY';
  report.compatibilityConclusion=report.meteoraDbc.tokenBadgePresent
    ? 'MINT_EXISTS_AND_DBC_TOKEN_BADGE_VISIBLE__LIVE_POOL_PROOF_STILL_REQUIRED'
    : 'MINT_EXISTS__DBC_QUOTE_COMPATIBILITY_NOT_YET_PROVEN_BY_THIS_READ_ONLY_CHECK';
  fs.writeFileSync('artifacts/bitworldz-real-btc-compat.json',JSON.stringify(jsonSafe(report),null,2)+'\n');
  console.log('BITWORLDZ_REAL_BTC_COMPAT=PASS_READ_ONLY mint='+mintKey.toBase58()+' decimals='+mint.decimals+' token_badge='+(report.meteoraDbc.tokenBadgePresent?'YES':'NO_OR_UNREADABLE'));
}catch(error){
  report.status='FAIL_READ_ONLY';
  report.error=error?.message||String(error);
  fs.writeFileSync('artifacts/bitworldz-real-btc-compat.json',JSON.stringify(jsonSafe(report),null,2)+'\n');
  console.error('BITWORLDZ_REAL_BTC_COMPAT=FAIL '+report.error);
  process.exitCode=1;
}
