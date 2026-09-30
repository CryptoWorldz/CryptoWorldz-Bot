const crypto = require("node:crypto");
const {
  ensureGroup,
  isGroup,
  moduleAvailable,
  owner,
  recordAnalytics,
  telegramAdmin
} = require("./community-suite-core");

function timingSafeEqualText(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length || left.length === 0) return false;
  return crypto.timingSafeEqual(left, right);
}

function normalizeMarketEvent(input) {
  const event = input && typeof input === "object" ? input : {};
  const side = String(event.side || "").toLowerCase();
  if (!["buy","sell","transfer","liquidity_add","liquidity_remove"].includes(side)) return null;
  const chain = String(event.chain || "").toLowerCase().trim();
  const tokenAddress = String(event.token_address || event.tokenAddress || "").trim();
  const eventKey = String(event.event_key || event.eventKey || event.tx_signature || event.txSignature || "").trim();
  const observedAt = new Date(event.observed_at || event.observedAt || Date.now());
  if (!chain || !tokenAddress || !eventKey || !Number.isFinite(observedAt.getTime())) return null;
  const usdValue = event.usd_value == null && event.usdValue == null ? null : Number(event.usd_value ?? event.usdValue);
  const nativeValue = event.native_value == null && event.nativeValue == null ? null : Number(event.native_value ?? event.nativeValue);
  return {
    provider: String(event.provider || "external_indexer").slice(0, 80),
    eventKey: eventKey.slice(0, 240),
    chain: chain.slice(0, 40),
    tokenAddress: tokenAddress.slice(0, 240),
    tokenSymbol: event.token_symbol || event.tokenSymbol ? String(event.token_symbol || event.tokenSymbol).toUpperCase().slice(0, 24) : null,
    side,
    usdValue: Number.isFinite(usdValue) && usdValue >= 0 ? usdValue : null,
    nativeValue: Number.isFinite(nativeValue) && nativeValue >= 0 ? nativeValue : null,
    walletAddress: event.wallet_address || event.walletAddress ? String(event.wallet_address || event.walletAddress).slice(0, 240) : null,
    txSignature: event.tx_signature || event.txSignature ? String(event.tx_signature || event.txSignature).slice(0, 240) : null,
    observedAt: observedAt.toISOString(),
    raw: event
  };
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? "$" + number.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—";
}

function alertText(event, rule) {
  const whale = event.side === "buy" && event.usdValue != null && event.usdValue >= Number(rule.whale_buy_usd || Infinity);
  const icon = event.side === "buy" ? (whale ? "🐋🚀" : "🟢") :
    event.side === "sell" ? "🔴" :
    event.side === "liquidity_add" ? "💧➕" :
    event.side === "liquidity_remove" ? "🚨💧➖" : "👛";
  const title = event.side === "buy" ? (whale ? "WHALE BUY" : "BUY ALERT") :
    event.side === "sell" ? "SELL ALERT" :
    event.side === "liquidity_add" ? "LIQUIDITY ADDED" :
    event.side === "liquidity_remove" ? "LIQUIDITY REMOVED" : "WALLET ACTIVITY";
  return [
    `${icon} ${title}`,
    "",
    `Token: ${event.tokenSymbol ? "$" + event.tokenSymbol : event.tokenAddress}`,
    `Chain: ${event.chain}`,
    `Value: ${money(event.usdValue)}`,
    event.nativeValue != null ? `Native amount: ${event.nativeValue}` : null,
    event.walletAddress ? `Wallet: ${event.walletAddress}` : null,
    event.txSignature ? `TX: ${event.txSignature}` : null,
    "",
    `Provider: ${event.provider}`,
    "Worldz displays provider-reported transaction evidence only; it does not fabricate buys or market activity."
  ].filter(Boolean).join("\n");
}

function registerMarketAlertSystem({ app, bot, config, supabase, env = process.env }) {
  const ingestSecret = String(env.WORLDZ_MARKET_INGEST_SECRET || "").trim();
  const send = (message, text) => bot.sendMessage(message.chat.id, text);
  const requireAdmin = async (message) => owner(message, config) || await telegramAdmin(bot, message);

  async function ready(message) {
    if (!isGroup(message)) return false;
    await ensureGroup(supabase, message, config);
    return moduleAvailable(supabase, message.chat.id, "market_alerts");
  }

  bot.onText(/^\/buyalerts(?:@\w+)?$/i, async (message) => {
    try {
      if (!(await ready(message))) return send(message, "⏸ Market Alerts are switched off or paused.");
      const { data, error } = await supabase.from("community_suite_market_alert_rules")
        .select("*").eq("chat_id", Number(message.chat.id)).eq("enabled", true).order("created_at");
      if (error) throw error;
      const lines = (data || []).map((row) => `#${row.id} • ${row.chain} • ${row.token_symbol ? "$" + row.token_symbol : row.token_address} • Buy ≥ ${money(row.min_buy_usd)} • Whale ≥ ${money(row.whale_buy_usd)}`);
      return send(message, [
        "🐋 WORLDZ MARKET ALERTS",
        "",
        lines.join("\n") || "No alert rules.",
        "",
        "Admin: /buyalert TOKEN_ADDRESS | MIN_USD | WHALE_USD | optional-chain | optional-symbol",
        "Disable: /buyalertoff ID",
        `Provider ingest: ${ingestSecret ? "✅ configured" : "⚙️ awaiting WORLDZ_MARKET_INGEST_SECRET + indexer/webhook"}`
      ].join("\n"));
    } catch {
      return send(message, "❌ Market Alerts could not load.");
    }
  });

  bot.onText(/^\/buyalert(?:@\w+)?\s+([\s\S]+)$/i, async (message, match) => {
    try {
      if (!(await ready(message))) return send(message, "⏸ Market Alerts are switched off or paused.");
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const parts = String(match[1]).split("|").map((part) => part.trim());
      const tokenAddress = parts[0];
      const minBuy = Number(parts[1]);
      const whaleBuy = Number(parts[2]);
      const chain = String(parts[3] || "solana").toLowerCase();
      const symbol = parts[4] ? String(parts[4]).toUpperCase().replace(/^\$/, "").slice(0, 24) : null;
      if (!tokenAddress || !Number.isFinite(minBuy) || minBuy < 0 || !Number.isFinite(whaleBuy) || whaleBuy < minBuy) {
        return send(message, "❌ Use /buyalert TOKEN_ADDRESS | MIN_USD | WHALE_USD | optional-chain | optional-symbol");
      }
      const { data, error } = await supabase.from("community_suite_market_alert_rules").upsert({
        chat_id: Number(message.chat.id),
        chain,
        token_address: tokenAddress,
        token_symbol: symbol,
        min_buy_usd: minBuy,
        whale_buy_usd: whaleBuy,
        enabled: true,
        created_by: Number(message.from.id),
        updated_at: new Date().toISOString()
      }, { onConflict: "chat_id,chain,token_address" }).select("*").single();
      if (error) throw error;
      await recordAnalytics(supabase, message.chat.id, message.from.id, "market_alert_rule_saved", { ruleId: data.id, chain });
      return send(message, `✅ Market Alert #${data.id} active. Buy ≥ ${money(minBuy)} • Whale ≥ ${money(whaleBuy)}.`);
    } catch {
      return send(message, "❌ Market Alert rule could not be saved.");
    }
  });

  bot.onText(/^\/buyalertoff(?:@\w+)?\s+(\d+)$/i, async (message, match) => {
    try {
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const { error } = await supabase.from("community_suite_market_alert_rules")
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq("id", Number(match[1])).eq("chat_id", Number(message.chat.id));
      if (error) throw error;
      return send(message, `✅ Market Alert #${match[1]} disabled.`);
    } catch {
      return send(message, "❌ Market Alert could not be disabled.");
    }
  });

  app.post("/api/community-suite/market-event", async (req, res) => {
    if (!ingestSecret) return res.status(503).json({ ok: false, error: "market_ingest_not_configured" });
    const supplied = req.get("x-worldz-market-secret") || "";
    if (!timingSafeEqualText(supplied, ingestSecret)) return res.status(401).json({ ok: false, error: "unauthorized" });
    const event = normalizeMarketEvent(req.body);
    if (!event) return res.status(400).json({ ok: false, error: "invalid_event" });

    try {
      const { data: stored, error: insertError } = await supabase.from("community_suite_market_events").insert({
        provider: event.provider,
        event_key: event.eventKey,
        chain: event.chain,
        token_address: event.tokenAddress,
        token_symbol: event.tokenSymbol,
        side: event.side,
        usd_value: event.usdValue,
        native_value: event.nativeValue,
        wallet_address: event.walletAddress,
        tx_signature: event.txSignature,
        raw: event.raw,
        observed_at: event.observedAt
      }).select("id").single();

      if (insertError) {
        if (String(insertError.code || "") === "23505") return res.json({ ok: true, duplicate: true });
        throw insertError;
      }

      const { data: rules, error: rulesError } = await supabase.from("community_suite_market_alert_rules")
        .select("*").eq("chain", event.chain).eq("token_address", event.tokenAddress).eq("enabled", true);
      if (rulesError) throw rulesError;

      let sent = 0;
      for (const rule of rules || []) {
        const active = await moduleAvailable(supabase, rule.chat_id, "market_alerts");
        if (!active) continue;
        const buyMeets = event.side === "buy" && event.usdValue != null && event.usdValue >= Number(rule.min_buy_usd || 0);
        const importantMarketEvent = ["liquidity_add","liquidity_remove"].includes(event.side);
        if (!buyMeets && !importantMarketEvent) continue;
        try {
          await bot.sendMessage(rule.chat_id, alertText(event, rule));
          await recordAnalytics(supabase, rule.chat_id, null, "market_alert_sent", { eventId: stored.id, side: event.side, usdValue: event.usdValue }, "market_ingest");
          sent += 1;
        } catch (sendError) {
          console.error("Market alert Telegram send failed", { chatId: rule.chat_id, code: sendError?.code || sendError?.message || "unknown" });
        }
      }

      if (event.walletAddress) {
        const { data: watches } = await supabase.from("community_suite_wallet_watchlist")
          .select("*").eq("chain", event.chain).eq("address", event.walletAddress).eq("enabled", true);
        for (const watch of watches || []) {
          const active = await moduleAvailable(supabase, watch.chat_id, "wallet_watch");
          if (!active) continue;
          try {
            await bot.sendMessage(watch.chat_id, [
              "👛 WALLET WATCH ACTIVITY",
              "",
              `${watch.label || "Watched Wallet"} • ${event.walletAddress}`,
              `Event: ${event.side.toUpperCase()}`,
              `Token: ${event.tokenSymbol ? "$" + event.tokenSymbol : event.tokenAddress}`,
              `Value: ${money(event.usdValue)}`,
              event.txSignature ? `TX: ${event.txSignature}` : null,
              "",
              `Provider: ${event.provider}`
            ].filter(Boolean).join("\n"));
          } catch {}
        }
      }

      return res.json({ ok: true, event_id: stored.id, alerts_sent: sent });
    } catch (error) {
      console.error("Market event ingest failed", { code: error?.code || error?.message || "unknown" });
      return res.status(500).json({ ok: false, error: "ingest_failed" });
    }
  });

  return { normalizeMarketEvent };
}

module.exports = {
  alertText,
  normalizeMarketEvent,
  registerMarketAlertSystem,
  timingSafeEqualText
};
