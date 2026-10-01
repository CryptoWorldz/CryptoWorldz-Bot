"use strict";

const {
  MAX_TOKENS_PER_CHAIN,
  SUPPORTED_CHAINS,
  VOTING_NAMESPACES,
  capacitySummary
} = require("./core");

function safeError(label, error) {
  const message = String(error && (error.message || error.code) || "unknown_error")
    .replace(/https?:\/\/[^\s]+/gi, "[URL_REDACTED]")
    .replace(/[A-Za-z0-9_-]{40,}/g, "[VALUE_REDACTED]")
    .slice(0, 240);
  console.error(`WorldzFullScope ${label}: ${message}`);
}

function formatToken(row) {
  const contract = row.contract_address ? ` • CA ${String(row.contract_address).slice(0, 5)}…${String(row.contract_address).slice(-4)}` : "";
  return `${row.symbol} — ${row.name} • ${row.chain_key.toUpperCase()} • ${String(row.status || "planned").toUpperCase()}${contract}`;
}

function formatLeaderboard(rows, metric = "votes_24h") {
  if (!rows.length) return "No organic popularity votes recorded yet.";
  return rows.map((row, index) =>
    `${index + 1}. ${row.symbol} • ${row.chain_key.toUpperCase()} — ${Number(row[metric] || 0)} votes`
  ).join("\n");
}

function registerFullScopeTelegramHandlers({ bot, repository, supabase }) {
  const send = (msg, text, options) => bot.sendMessage(msg.chat.id, text, options);

  async function readChains() {
    const { data, error } = await supabase
      .from("worldz_fullscope_chains")
      .select("chain_key,label,family,enabled,max_tokens,mainnet_execution_enabled")
      .order("chain_key");
    if (error) throw error;
    return data || [];
  }

  async function readTokens() {
    const { data, error } = await supabase
      .from("worldz_fullscope_tokens")
      .select("id,chain_key,name,symbol,contract_address,decimals,status,enabled")
      .eq("enabled", true)
      .order("chain_key")
      .order("symbol")
      .limit(SUPPORTED_CHAINS.length * MAX_TOKENS_PER_CHAIN);
    if (error) throw error;
    return data || [];
  }

  async function readLeaderboard(metric = "votes_24h", limit = 10) {
    const allowed = new Set(["votes_1h", "votes_24h", "votes_7d", "votes_all_time"]);
    const sort = allowed.has(metric) ? metric : "votes_24h";
    const { data, error } = await supabase
      .from("worldz_popularity_leaderboard")
      .select("token_id,chain_key,name,symbol,status,votes_1h,votes_24h,votes_7d,votes_all_time")
      .order(sort, { ascending: false })
      .order("symbol", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  async function resolveToken(symbol, chainKey = "") {
    let query = supabase
      .from("worldz_fullscope_tokens")
      .select("id,chain_key,name,symbol,status,enabled")
      .eq("enabled", true)
      .ilike("symbol", String(symbol || "").trim())
      .limit(10);
    if (chainKey) query = query.eq("chain_key", String(chainKey).trim().toLowerCase());
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async function openVotesCentre(msg) {
    try {
      const rows = await readLeaderboard("votes_1h", 10);
      return send(msg, [
        "🗳️ WORLDZ VOTES CENTRE™",
        "DEX TOKEN VOTING • ONE VOTE PER USER PER HOUR",
        "",
        "Vote for your favourite registered token once every rolling 60 minutes.",
        "",
        "🔥 1-HOUR VOTE LEADERBOARD",
        formatLeaderboard(rows, "votes_1h"),
        "",
        "Vote: /vote SYMBOL [chain]",
        "Alias: /tokenvote SYMBOL [chain]",
        "Trend: /worldztrending",
        "Rankings: /worldzrankings",
        "",
        "Sponsored exposure is stored separately and never counted as a token vote."
      ].join("\n"));
    } catch (error) {
      safeError("votes-centre", error);
      return send(msg, "🗳️ Worldz Votes Centre™ foundation is installed, but its database migration is not active on this runtime yet.");
    }
  }



  bot.onText(/^\/fullscope(?:@\w+)?$/, async (msg) => {
    let status = "Registry status unavailable.";
    try {
      const tokens = await readTokens();
      const counts = Object.fromEntries(SUPPORTED_CHAINS.map((chain) => [
        chain.key,
        tokens.filter((token) => token.chain_key === chain.key).length
      ]));
      status = capacitySummary(counts)
        .map((row) => `${row.label}: ${row.active}/${row.capacity}`)
        .join(" • ");
    } catch (error) {
      safeError("fullscope-status", error);
    }
    return send(msg, [
      "🌐 WORLDZFULLSCOPE™ — ZED LED",
      "",
      `Capacity: ${SUPPORTED_CHAINS.length} chains × ${MAX_TOKENS_PER_CHAIN} tokens = ${SUPPORTED_CHAINS.length * MAX_TOKENS_PER_CHAIN} monitored token slots.`,
      status,
      "",
      "📡 /worldzwatch — monitoring",
      "🪙 /fullscopetokens — registered tokens",
      "⛓️ /fullscopechains — supported chains",
      "🔐 /worldzlock — lock centre",
      "⏳ /worldzvest — vesting centre",
      "🗳️ /worldzvotes — HOURLY TOKEN VOTING",
      "🗳️ /vote SYMBOL [chain] — favourite-token vote",
      "",
      "Financial actions are transaction-intent first: simulate → review → external wallet signature → proof. Telegram stores no private keys."
    ].join("\n"));
  });

  bot.onText(/^\/fullscopechains(?:@\w+)?$/, async (msg) => {
    try {
      const rows = await readChains();
      return send(msg, [
        "⛓️ WORLDZFULLSCOPE™ CHAINS",
        "",
        ...(rows.length ? rows : SUPPORTED_CHAINS).map((row) =>
          `${row.label || row.key} — ${String(row.family).toUpperCase()} • max ${row.max_tokens || MAX_TOKENS_PER_CHAIN} tokens`
        )
      ].join("\n"));
    } catch (error) {
      safeError("chains", error);
      return send(msg, [
        "⛓️ WORLDZFULLSCOPE™ CHAINS",
        "",
        ...SUPPORTED_CHAINS.map((row) => `${row.label} — ${row.family.toUpperCase()} • max ${MAX_TOKENS_PER_CHAIN} tokens`)
      ].join("\n"));
    }
  });

  bot.onText(/^\/fullscopetokens(?:@\w+)?$/, async (msg) => {
    try {
      const rows = await readTokens();
      return send(msg, [
        "🪙 WORLDZFULLSCOPE™ TOKEN REGISTRY",
        "",
        rows.length ? rows.map(formatToken).join("\n") : "No enabled token registrations yet."
      ].join("\n"));
    } catch (error) {
      safeError("tokens", error);
      return send(msg, "🪙 FullScope token registry migration is not active on this runtime yet.");
    }
  });

  bot.onText(/^\/worldzwatch(?:@\w+)?(?:\s+([A-Za-z0-9._-]+))?$/, async (msg, match) => {
    try {
      const symbol = String(match && match[1] || "").trim();
      let tokenId = null;
      if (symbol) {
        const matches = await resolveToken(symbol);
        if (!matches.length) return send(msg, `❌ No FullScope token found for ${symbol.toUpperCase()}.`);
        if (matches.length > 1) return send(msg, `⚠️ ${symbol.toUpperCase()} exists on multiple chains. Use /fullscopetokens to choose the chain.`);
        tokenId = matches[0].id;
      }
      let query = supabase
        .from("worldz_fullscope_events")
        .select("event_type,chain_key,tx_reference,amount_raw,quote_value,observed_at,token_id")
        .order("observed_at", { ascending: false })
        .limit(12);
      if (tokenId) query = query.eq("token_id", tokenId);
      const { data, error } = await query;
      if (error) throw error;
      if (!(data || []).length) return send(msg, "📡 WorldzWatch™ is ready for indexed events; no matching chain events have been recorded yet.");
      return send(msg, [
        "📡 WORLDZWATCH™",
        "",
        ...(data || []).map((row) =>
          `${String(row.event_type).toUpperCase()} • ${String(row.chain_key).toUpperCase()} • ${row.observed_at}${row.quote_value == null ? "" : ` • quote ${row.quote_value}`}`
        )
      ].join("\n"));
    } catch (error) {
      safeError("watch", error);
      return send(msg, "📡 WorldzWatch™ foundation is installed, but its event store is not active on this runtime yet.");
    }
  });

  bot.onText(/^\/worldzvotes(?:@\w+)?$/, openVotesCentre);
  bot.onText(/^\/worldztrending(?:@\w+)?$/, async (msg) => {
    try {
      const rows = await readLeaderboard("votes_1h", 10);
      return send(msg, ["🔥 WORLDZ TRENDING — ORGANIC 1H", "", formatLeaderboard(rows, "votes_1h")].join("\n"));
    } catch (error) {
      safeError("trending", error);
      return send(msg, "🔥 Worldz trending data is not active on this runtime yet.");
    }
  });
  bot.onText(/^\/worldzrankings(?:@\w+)?$/, async (msg) => {
    try {
      const rows = await readLeaderboard("votes_all_time", 20);
      return send(msg, ["🏆 WORLDZ VOTES CENTRE™ — ALL-TIME ORGANIC", "", formatLeaderboard(rows, "votes_all_time")].join("\n"));
    } catch (error) {
      safeError("rankings", error);
      return send(msg, "🏆 Worldz popularity rankings are not active on this runtime yet.");
    }
  });

  bot.onText(/^\/(?:vote|tokenvote)(?:@\w+)?(?:\s+([A-Za-z0-9._-]+))?(?:\s+([A-Za-z0-9._-]+))?$/, async (msg, match) => {
    const symbol = String(match && match[1] || "").trim().toUpperCase();
    const chain = String(match && match[2] || "").trim().toLowerCase();
    if (!symbol) return send(msg, "🗳️ Use: /vote SYMBOL [chain]\nExample: /vote PNEX solana");
    try {
      const matches = await resolveToken(symbol, chain);
      if (!matches.length) return send(msg, `❌ ${symbol} is not registered in WorldzFullScope™${chain ? ` on ${chain}` : ""}.`);
      if (matches.length > 1) {
        return send(msg, [
          `⚠️ ${symbol} exists on more than one chain.`,
          ...matches.map((row) => `/vote ${symbol} ${row.chain_key}`)
        ].join("\n"));
      }
      const token = matches[0];
      const { error } = await supabase.from("worldz_popularity_votes").insert({
        token_id: token.id,
        telegram_id: String(msg.from.id),
        verification_state: "telegram"
      });
      if (error && (error.code === "P0001" || String(error.message || "").includes("worldz_hourly_vote_limit"))) {
        return send(msg, "⏳ You have already used your Worldz token vote this hour. Your next favourite-token vote unlocks 60 minutes after your last vote.");
      }
      if (error) throw error;
      return send(msg, [
        "✅ WORLDZ TOKEN VOTE RECORDED",
        `${token.name} • $${token.symbol} • ${token.chain_key.toUpperCase()}`,
        "",
        "Your one-hour vote is recorded. You can vote again 60 minutes after this vote."
      ].join("\n"));
    } catch (error) {
      safeError("token-vote", error);
      return send(msg, "❌ Worldz Votes Centre™ could not record that popularity vote.");
    }
  });



  bot.onText(/^\/worldzlock(?:@\w+)?$/, (msg) => send(msg, [
    "🔐 WORLDZLOCK™",
    "Token • LP • Treasury • Team • Community • Legacy",
    "",
    "Foundation state: lock records and proof receipts are built into FullScope. Chain-specific lock execution remains adapter-gated and externally signed."
  ].join("\n")));

  bot.onText(/^\/worldzvest(?:@\w+)?$/, (msg) => send(msg, [
    "⏳ WORLDZVEST™",
    "Linear • Periodic • Milestone",
    "",
    "Foundation state: vesting schedules and proof receipts are built into FullScope. Chain-specific creation remains adapter-gated and externally signed."
  ].join("\n")));
}

module.exports = {
  registerFullScopeTelegramHandlers,
  formatLeaderboard,
  formatToken,
  popularityBrand: VOTING_NAMESPACES.popularity.brand
};
