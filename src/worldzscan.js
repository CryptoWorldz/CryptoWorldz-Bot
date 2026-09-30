const {
  ensureGroup,
  isGroup,
  moduleAvailable,
  recordAnalytics
} = require("./community-suite-core");

const DEFAULT_RPC = "https://api.mainnet-beta.solana.com";

async function getJson(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "WorldzScan/1.0" },
      signal: controller.signal
    });
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch {}
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

async function rpcCall(rpcUrl, method, params) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "WorldzScan/1.0" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal
    });
    const body = await response.json();
    if (!response.ok || body.error) throw new Error(body?.error?.message || `RPC ${response.status}`);
    return body.result;
  } finally {
    clearTimeout(timer);
  }
}

function parseScanTarget(raw, fallbackChain = "solana") {
  const value = String(raw || "").trim();
  if (!value) return null;
  const pieces = value.split(/\s+/);
  if (pieces.length >= 2) return { chain: pieces[0].toLowerCase(), address: pieces[1] };
  if (value.includes(":")) {
    const [chain, ...address] = value.split(":");
    return { chain: chain.toLowerCase(), address: address.join(":") };
  }
  return { chain: fallbackChain, address: value };
}

async function dexPairs(chain, address) {
  const rows = await getJson(`https://api.dexscreener.com/token-pairs/v1/${encodeURIComponent(chain)}/${encodeURIComponent(address)}`);
  return Array.isArray(rows) ? rows : [];
}

async function dexOrders(chain, address) {
  try {
    const rows = await getJson(`https://api.dexscreener.com/orders/v1/${encodeURIComponent(chain)}/${encodeURIComponent(address)}`);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

async function jupiterToken(address) {
  try {
    const rows = await getJson(`https://api.jup.ag/tokens/v2/search?query=${encodeURIComponent(address)}`);
    if (!Array.isArray(rows)) return null;
    return rows.find((row) => row.id === address || row.address === address) || rows[0] || null;
  } catch {
    return null;
  }
}

async function solanaMintEvidence(address, rpcUrl) {
  try {
    const [account, largest] = await Promise.all([
      rpcCall(rpcUrl, "getAccountInfo", [address, { encoding: "jsonParsed", commitment: "confirmed" }]),
      rpcCall(rpcUrl, "getTokenLargestAccounts", [address, { commitment: "confirmed" }])
    ]);
    const info = account?.value?.data?.parsed?.info || null;
    if (!info) return null;
    const supplyRaw = BigInt(String(info.supply || "0"));
    let largestPercent = null;
    const largestRaw = largest?.value?.[0]?.amount;
    if (largestRaw != null && supplyRaw > 0n) {
      largestPercent = Number((BigInt(String(largestRaw)) * 1000000n) / supplyRaw) / 10000;
    }
    return {
      mintAuthority: info.mintAuthority ?? null,
      freezeAuthority: info.freezeAuthority ?? null,
      decimals: Number(info.decimals),
      supplyRaw: String(info.supply || "0"),
      largestObservedTokenAccountPercent: largestPercent
    };
  } catch {
    return null;
  }
}

function number(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function usd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return "$" + n.toLocaleString("en-US", { maximumSignificantDigits: 6 });
}

function bestPair(rows) {
  return [...(rows || [])].sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0))[0] || null;
}

function scanWarnings(scan) {
  const warnings = [];
  if (scan.chain === "solana" && scan.mint) {
    if (scan.mint.mintAuthority) warnings.push("⚠️ Mint authority is still present.");
    else warnings.push("✅ Mint authority absent.");
    if (scan.mint.freezeAuthority) warnings.push("⚠️ Freeze authority is still present.");
    else warnings.push("✅ Freeze authority absent.");
    if (scan.mint.largestObservedTokenAccountPercent != null) {
      warnings.push(`ℹ️ Largest observed token account: ${number(scan.mint.largestObservedTokenAccountPercent)}% of supply. Token accounts may include LP/treasury/exchange accounts.`);
    }
  }
  const liquidity = Number(scan.pair?.liquidity?.usd || 0);
  if (scan.pair && liquidity < 1000) warnings.push("⚠️ Observed DEX liquidity is under $1,000.");
  if (!scan.pair) warnings.push("⚠️ No DEX Screener pair was observed.");
  return warnings;
}

async function scanToken(target, options = {}) {
  const chain = String(target.chain || "solana").toLowerCase();
  const address = String(target.address || "").trim();
  if (!address) throw new Error("address_required");
  const rpcUrl = String(options.rpcUrl || DEFAULT_RPC);
  const [pairs, orders, jupiter, mint] = await Promise.all([
    dexPairs(chain, address),
    dexOrders(chain, address),
    chain === "solana" ? jupiterToken(address) : Promise.resolve(null),
    chain === "solana" ? solanaMintEvidence(address, rpcUrl) : Promise.resolve(null)
  ]);
  const pair = bestPair(pairs);
  const base = pair?.baseToken?.address === address ? pair.baseToken : pair?.quoteToken?.address === address ? pair.quoteToken : pair?.baseToken;
  return {
    chain,
    address,
    pairs,
    pair,
    orders,
    jupiter,
    mint,
    name: jupiter?.name || base?.name || null,
    symbol: jupiter?.symbol || base?.symbol || null
  };
}

function scanText(scan) {
  const pair = scan.pair;
  const buys = Number(pair?.txns?.h24?.buys || 0);
  const sells = Number(pair?.txns?.h24?.sells || 0);
  const activeOrders = (scan.orders || []).filter((row) => !["cancelled","expired","completed"].includes(String(row?.status || "").toLowerCase()));
  const warnings = scanWarnings(scan);
  return [
    "🔎 WORLDZSCAN™",
    "",
    `${scan.name || "Unknown Token"} ${scan.symbol ? "($" + scan.symbol + ")" : ""}`,
    `Chain: ${scan.chain}`,
    `CA: ${scan.address}`,
    "",
    `Price: ${usd(pair?.priceUsd)}`,
    `Liquidity: ${usd(pair?.liquidity?.usd)}`,
    `Market Cap: ${usd(pair?.marketCap)}`,
    `FDV: ${usd(pair?.fdv)}`,
    `24h Volume: ${usd(pair?.volume?.h24)}`,
    `24h Buys/Sells: ${number(buys,0)} / ${number(sells,0)}`,
    `DEX Pairs Observed: ${scan.pairs.length}`,
    `Provider paid orders observed: ${scan.orders.length} • active-like: ${activeOrders.length}`,
    scan.jupiter ? `Jupiter identity: ${scan.jupiter.isVerified === true ? "✅ verified signal" : "ℹ️ not marked verified"} • Organic: ${scan.jupiter.organicScoreLabel || "—"}` : null,
    scan.mint ? `Supply raw: ${scan.mint.supplyRaw} • Decimals: ${scan.mint.decimals}` : null,
    "",
    ...warnings,
    "",
    "WorldzScan reports observed evidence and risk indicators. It does not guarantee that a token is safe or profitable."
  ].filter(Boolean).join("\n");
}

function compactScan(scan) {
  const pair = scan.pair;
  return `${scan.symbol ? "$" + scan.symbol : scan.address.slice(0, 8) + "…"} • ${scan.chain} • Price ${usd(pair?.priceUsd)} • Liq ${usd(pair?.liquidity?.usd)} • 24h Vol ${usd(pair?.volume?.h24)}`;
}

async function mapLimit(items, limit, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      try { output[index] = await worker(items[index], index); }
      catch (error) { output[index] = { error: error?.message || "scan_failed", target: items[index] }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return output;
}

function registerWorldzScan({ bot, config, supabase, env = process.env }) {
  const send = (message, text, options) => bot.sendMessage(message.chat.id, text, options);
  const rpcUrl = String(env.SOLANA_RPC_URL || DEFAULT_RPC);

  async function available(message) {
    if (!isGroup(message)) return true;
    await ensureGroup(supabase, message, config);
    return moduleAvailable(supabase, message.chat.id, "worldzscan");
  }

  bot.onText(/^\/scan(?:@\w+)?(?:\s+([\s\S]+))?$/i, async (message, match) => {
    try {
      if (!(await available(message))) return send(message, "⏸ WorldzScan is switched off or paused by Emergency Lockdown.");
      const target = parseScanTarget(match?.[1]);
      if (!target) return send(message, "🔎 Use /scan TOKEN_ADDRESS or /scan CHAIN TOKEN_ADDRESS\nExample: /scan solana MINT");
      const scan = await scanToken(target, { rpcUrl });
      if (isGroup(message)) await recordAnalytics(supabase, message.chat.id, message.from.id, "token_scan", { chain: target.chain, address: target.address });
      return send(message, scanText(scan), pairKeyboard(scan));
    } catch (error) {
      console.error("WorldzScan failed", { code: error?.code || error?.message || "unknown" });
      return send(message, "❌ WorldzScan could not read that token right now.");
    }
  });

  bot.onText(/^\/scan20(?:@\w+)?(?:\s+([\s\S]+))?$/i, async (message, match) => {
    try {
      if (!(await available(message))) return send(message, "⏸ WorldzScan is switched off or paused.");
      const raw = String(match?.[1] || "").trim();
      if (!raw) return send(message, "🔎 /scan20 accepts up to 20 items.\nUse CHAIN:ADDRESS separated by spaces/commas, or bare Solana mints.");
      const tokens = raw.split(/[\s,]+/).filter(Boolean).slice(0, 20).map((item) => parseScanTarget(item));
      const rows = await mapLimit(tokens, 4, (target) => scanToken(target, { rpcUrl }));
      const lines = rows.map((row, index) => row?.error ? `${index + 1}. ❌ ${row.target?.address || "scan failed"}` : `${index + 1}. ${compactScan(row)}`);
      if (isGroup(message)) await recordAnalytics(supabase, message.chat.id, message.from.id, "token_scan20", { count: tokens.length });
      return send(message, `🔎 WORLDZSCAN™ ×${tokens.length}\n\n${lines.join("\n")}\n\nUse /scan ADDRESS for full evidence on one token.`);
    } catch {
      return send(message, "❌ WorldzScan x20 could not complete.");
    }
  });

  bot.onText(/^\/booststatus(?:@\w+)?(?:\s+([\s\S]+))?$/i, async (message, match) => {
    try {
      if (!(await available(message))) return send(message, "⏸ WorldzScan is switched off or paused.");
      const target = parseScanTarget(match?.[1]);
      if (!target) return send(message, "🚀 Use /booststatus TOKEN_ADDRESS or /booststatus CHAIN TOKEN_ADDRESS");
      const orders = await dexOrders(target.chain, target.address);
      const lines = orders.slice(0, 10).map((row) => `• ${row.type || row.product || "order"} • ${row.status || "unknown"}`);
      return send(message, [
        "🚀 PROVIDER PROMOTION STATUS",
        "",
        `Chain: ${target.chain}`,
        `Token: ${target.address}`,
        `DEX Screener order records: ${orders.length}`,
        lines.join("\n") || "No paid-order records observed.",
        "",
        "Provider boosts/promotions are paid exposure and remain separate from organic Worldz Votes."
      ].join("\n"));
    } catch {
      return send(message, "❌ Promotion status could not be checked.");
    }
  });

  return { scanToken };
}

function pairKeyboard(scan) {
  const rows = [];
  if (scan.pair?.url) rows.push([{ text: "📊 Open DEX Screener", url: scan.pair.url }]);
  return rows.length ? { reply_markup: { inline_keyboard: rows } } : undefined;
}

module.exports = {
  bestPair,
  compactScan,
  dexOrders,
  dexPairs,
  mapLimit,
  parseScanTarget,
  registerWorldzScan,
  scanText,
  scanToken,
  scanWarnings,
  solanaMintEvidence
};
