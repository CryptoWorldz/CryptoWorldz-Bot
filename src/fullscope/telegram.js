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
      const rows = await readLeaderboard("votes_24h", 10);
      return send(msg, [
        "🗳️ WORLDZ VOTES CENTRE™",
        "POPULARITY • TRENDING • VISIBILITY • RANKINGS",
        "",
        "This is community popularity voting. It cannot authorize treasury, DAO or governance actions.",
        "",
        "🔥 24-HOUR ORGANIC LEADERBOARD",
        formatLeaderboard(rows, "votes_24h"),
        "",
        "Cast: /tokenvote SYMBOL [chain]",
        "Trend: /worldztrending",
        "Rankings: /worldzrankings",
        "",
        "Sponsored exposure is stored separately and never counted as an organic vote."
      ].join("\n"));
    } catch (error) {
      safeError("votes-centre", error);
      return send(msg, "🗳️ Worldz Votes Centre™ foundation is installed, but its database migration is not active on this runtime yet.");
    }
  }

  async function openGovern(msg) {
    try {
      const proposals = await repository.listGovernanceProposals(20, msg.from.id);
      const active = (proposals || []).filter((proposal) => ["active", "open"].includes(proposal.status));
      if (!active.length) {
        return send(msg, [
          "🏛️ WORLDZGOVERN™",
          "DAO • PROPOSALS • TREASURY • RULES • GOVERNANCE",
          "",
          "No active governance proposals right now.",
          "",
          "WorldzGovern™ is completely separate from Worldz Votes Centre™ popularity rankings."
        ].join("\n"));
      }
      const rows = active.map((proposal) => {
        const choices = (Array.isArray(proposal.options) ? proposal.options : [])
          .map((option, index) => `${index + 1}. ${option} — ${proposal.vote_counts[String(index + 1)] || 0}`)
          .join("\n");
        return `🏛️ Proposal #${proposal.id}\n${proposal.title}\n${choices}\nTotal governance votes: ${proposal.total_votes}\nCast: /governvote ${proposal.id} OPTION`;
      });
      return send(msg, [
        "🏛️ WORLDZGOVERN™",
        "DAO • PROPOSALS • TREASURY • RULES • GOVERNANCE",
        "",
        ...rows,
        "",
        "Governance results never increase token popularity rankings."
      ].join("\n\n"));
    } catch (error) {
      safeError("govern", error);
      return send(msg, "❌ WorldzGovern™ could not load governance proposals.");
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
      "🗳️ /worldzvotes — POPULARITY ONLY",
      "🏛️ /worldzgovern — GOVERNANCE ONLY",
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

  bot.onText(/^\/tokenvote(?:@\w+)?(?:\s+([A-Za-z0-9._-]+))?(?:\s+([A-Za-z0-9._-]+))?$/, async (msg, match) => {
    const symbol = String(match && match[1] || "").trim().toUpperCase();
    const chain = String(match && match[2] || "").trim().toLowerCase();
    if (!symbol) return send(msg, "🗳️ Use: /tokenvote SYMBOL [chain]\nExample: /tokenvote PNEX solana");
    try {
      const matches = await resolveToken(symbol, chain);
      if (!matches.length) return send(msg, `❌ ${symbol} is not registered in WorldzFullScope™${chain ? ` on ${chain}` : ""}.`);
      if (matches.length > 1) {
        return send(msg, [
          `⚠️ ${symbol} exists on more than one chain.`,
          ...matches.map((row) => `/tokenvote ${symbol} ${row.chain_key}`)
        ].join("\n"));
      }
      const token = matches[0];
      const { error } = await supabase.from("worldz_popularity_votes").insert({
        token_id: token.id,
        telegram_id: String(msg.from.id),
        verification_state: "telegram"
      });
      if (error && error.code === "23505") {
        return send(msg, `⚠️ You already cast today's organic popularity vote for ${token.symbol} on ${token.chain_key.toUpperCase()}.`);
      }
      if (error) throw error;
      return send(msg, [
        "✅ WORLDZ POPULARITY VOTE RECORDED",
        `${token.name} • $${token.symbol} • ${token.chain_key.toUpperCase()}`,
        "",
        "This affects Worldz Votes Centre™ popularity only.",
        "It gives ZERO authority in WorldzGovern™."
      ].join("\n"));
    } catch (error) {
      safeError("token-vote", error);
      return send(msg, "❌ Worldz Votes Centre™ could not record that popularity vote.");
    }
  });

  bot.onText(/^\/worldzgovern(?:@\w+)?$/, openGovern);
  bot.onText(/^\/governproposals(?:@\w+)?$/, openGovern);
  bot.onText(/^\/governvote(?:@\w+)?(?:\s+(\d+)\s+(\d+))?$/, async (msg, match) => {
    const proposalId = Number(match && match[1] || 0);
    const option = Number(match && match[2] || 0);
    if (!Number.isInteger(proposalId) || proposalId < 1 || !Number.isInteger(option) || option < 1) {
      return send(msg, "🏛️ Use: /governvote PROPOSAL_ID OPTION\nExample: /governvote 12 2");
    }
    try {
      const result = await repository.castGovernanceVote(proposalId, msg.from.id, String(option));
      if (result.outcome === "duplicate") return send(msg, "⚠️ You have already cast your WorldzGovern™ vote on this proposal.");
      if (result.outcome === "invalid_option") return send(msg, "❌ That WorldzGovern™ option does not exist.");
      if (result.outcome !== "recorded") return send(msg, "❌ That WorldzGovern™ proposal is not currently open.");
      return send(msg, [
        "✅ WORLDZGOVERN™ VOTE RECORDED",
        `Proposal #${result.proposal.id} — ${result.proposal.title}`,
        `Choice: ${result.option}`,
        "",
        "This governance vote does NOT alter Worldz Votes Centre™ popularity rankings."
      ].join("\n"));
    } catch (error) {
      safeError("govern-vote", error);
      return send(msg, "❌ WorldzGovern™ could not record that governance vote.");
    }
  });

  bot.onText(/^\/governdelegate(?:@\w+)?$/, (msg) => send(msg, [
    "🏛️ WORLDZGOVERN™ DELEGATION",
    "",
    "Delegation is reserved in the architecture but is NOT enabled in the current governance runtime.",
    "Current governance remains the existing one-member / one-vote model until a separately reviewed delegation contract is activated."
  ].join("\n")));

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
  popularityBrand: VOTING_NAMESPACES.popularity.brand,
  governanceBrand: VOTING_NAMESPACES.governance.brand
};
