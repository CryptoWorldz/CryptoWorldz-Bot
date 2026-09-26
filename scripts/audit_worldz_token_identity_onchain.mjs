import fs from 'node:fs/promises';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { publicKey } from '@metaplex-foundation/umi';
import { findMetadataPda, fetchMetadata } from '@metaplex-foundation/mpl-token-metadata';

const registryPath = 'worldzpad-mainnet/token-identity/worldz-token-registry.v1.json';
const outPath = 'artifacts/worldz-token-identity-onchain.json';
const registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));
const rpc = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const umi = createUmi(rpc);

async function jsonFetch(url, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {headers:{'user-agent':'WorldzLaunchPad-Identity-Audit/1.0'}, signal:ctrl.signal});
    const text = await r.text();
    let body = null;
    try { body = JSON.parse(text); } catch {}
    return {ok:r.ok,status:r.status,body,text:text.slice(0,500)};
  } catch (e) {
    return {ok:false,status:null,error:String(e)};
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
for (const token of registry.tokens.filter(t => t.chain === 'Solana' && t.canonicalMint)) {
  const row = {
    launchOrder: token.launchOrder,
    canonical: {
      name: token.name,
      symbol: token.symbol,
      mint: token.canonicalMint,
      decimals: token.decimals,
      image: token.image ?? null
    },
    metaplex: null,
    offchain: null,
    jupiter: null,
    checks: {}
  };

  try {
    const mint = publicKey(token.canonicalMint);
    const pda = findMetadataPda(umi, {mint});
    const md = await fetchMetadata(umi, pda);
    row.metaplex = {
      pda: String(pda[0]),
      name: md.name,
      symbol: md.symbol,
      uri: md.uri,
      updateAuthority: String(md.updateAuthority),
      isMutable: md.isMutable
    };
    row.checks.onchainNameMatches = md.name === token.name;
    row.checks.onchainSymbolMatches = md.symbol === token.symbol;

    if (md.uri) {
      const off = await jsonFetch(md.uri);
      row.offchain = {url:md.uri,status:off.status,ok:off.ok};
      if (off.body && typeof off.body === 'object') {
        row.offchain.name = off.body.name ?? null;
        row.offchain.symbol = off.body.symbol ?? null;
        row.offchain.image = off.body.image ?? null;
        row.offchain.description = off.body.description ?? null;
        row.checks.offchainNameMatches = off.body.name == null || off.body.name === token.name;
        row.checks.offchainSymbolMatches = off.body.symbol == null || off.body.symbol === token.symbol;
      }
    }
  } catch (e) {
    row.metaplex = {error:String(e)};
    row.checks.metaplexReadable = false;
  }

  const jupUrl = 'https://api.jup.ag/tokens/v2/search?query=' + encodeURIComponent(token.canonicalMint);
  const j = await jsonFetch(jupUrl);
  row.jupiter = {url:jupUrl,status:j.status,ok:j.ok};
  if (Array.isArray(j.body)) {
    const exact = j.body.find(x => x.id === token.canonicalMint || x.address === token.canonicalMint) || j.body[0] || null;
    if (exact) {
      row.jupiter.token = {
        id: exact.id ?? exact.address ?? null,
        name: exact.name ?? null,
        symbol: exact.symbol ?? null,
        icon: exact.icon ?? exact.logoURI ?? null,
        isVerified: exact.isVerified ?? null,
        organicScoreLabel: exact.organicScoreLabel ?? null
      };
      row.checks.jupiterNameMatches = exact.name === token.name;
      row.checks.jupiterSymbolMatches = exact.symbol === token.symbol;
    }
  } else if (j.error) {
    row.jupiter.error = j.error;
  } else if (j.body && typeof j.body === 'object') {
    row.jupiter.body = j.body;
  }

  results.push(row);
}

await fs.mkdir('artifacts', {recursive:true});
await fs.writeFile(outPath, JSON.stringify({
  version:'WORLDZ-ONCHAIN-IDENTITY-AUDIT-1',
  generatedAt:new Date().toISOString(),
  rpc,
  results
}, null, 2) + '\n');

for (const r of results) {
  console.log('TOKEN', r.canonical.symbol, r.canonical.mint);
  console.log('  Metaplex:', JSON.stringify(r.metaplex));
  console.log('  Offchain:', JSON.stringify(r.offchain));
  console.log('  Jupiter:', JSON.stringify(r.jupiter));
  console.log('  Checks:', JSON.stringify(r.checks));
}
console.log('WORLDZ_TOKEN_IDENTITY_AUDIT_REPORT=' + outPath);
