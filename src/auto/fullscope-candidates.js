// Read-only FullScope -> AUTO discovery. Never writes allowlists or enables trading.
const { isValidSolanaAddress } = require("./dca-core");

const RETIRED_SYMBOLS = new Set(["WLDZ", "RVIV"]);

function mapFullscopeBuyCandidates(fullscopeTokens = [], autoTokens = []) {
  const approved = new Set(autoTokens
    .filter(token => token.network === "solana" && token.status === "allowlisted")
    .map(token => String(token.token_mint || "").trim()));
  return fullscopeTokens.map(token => {
    const chain = String(token.chain_key || "").toLowerCase();
    const symbol = String(token.symbol || "").toUpperCase();
    const mint = String(token.contract_address || "").trim();
    const reasons = [];
    if (chain !== "solana") reasons.push("unsupported_auto_chain");
    if (!isValidSolanaAddress(mint)) reasons.push("missing_or_invalid_mint");
    if (token.enabled !== true || token.status !== "live") reasons.push("not_live_and_enabled");
    if (RETIRED_SYMBOLS.has(symbol)) reasons.push("retired_legacy_symbol");
    if (!approved.has(mint)) reasons.push("not_owner_allowlisted");
    return {
      chain, symbol, mint, fullscope_status: token.status || null,
      eligible_for_owner_dca: reasons.length === 0,
      reasons
    };
  });
}

async function readFullscopeBuyCandidates(supabase) {
  const [fullscope, auto] = await Promise.all([
    supabase.from("worldz_fullscope_tokens").select("chain_key,symbol,contract_address,status,enabled"),
    supabase.from("auto_tokens").select("network,token_mint,status")
  ]);
  if (fullscope.error) throw fullscope.error;
  if (auto.error) throw auto.error;
  return mapFullscopeBuyCandidates(fullscope.data || [], auto.data || []);
}

module.exports = { RETIRED_SYMBOLS, mapFullscopeBuyCandidates, readFullscopeBuyCandidates };
