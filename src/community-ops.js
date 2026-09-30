const crypto = require("node:crypto");
const {
  ensureGroup,
  isGroup,
  moduleAvailable,
  owner,
  recordAnalytics,
  telegramAdmin
} = require("./community-suite-core");

function parseIsoWithOffset(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(text)) return null;
  const ms = Date.parse(text);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

function formatCountdown(targetMs, nowMs = Date.now()) {
  const diff = Math.max(0, Number(targetMs) - Number(nowMs));
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return `${days}d ${hours}h ${minutes}m`;
}

function pickWinners(entries, count) {
  const pool = [...new Set((entries || []).map(Number).filter(Number.isFinite))];
  const winners = [];
  const limit = Math.min(Math.max(0, Number(count) || 0), pool.length);
  while (winners.length < limit) {
    const index = crypto.randomInt(0, pool.length);
    winners.push(pool[index]);
    pool.splice(index, 1);
  }
  return winners;
}

function registerCommunityOps({ bot, config, supabase }) {
  const send = (message, text, options) => bot.sendMessage(message.chat.id, text, options);
  const requireAdmin = async (message) => owner(message, config) || await telegramAdmin(bot, message);
  let reminderTimer = null;

  async function ready(message, moduleKey) {
    if (!isGroup(message)) return false;
    await ensureGroup(supabase, message, config);
    return moduleAvailable(supabase, message.chat.id, moduleKey);
  }

  bot.onText(/^\/events(?:@\w+)?$/i, async (message) => {
    try {
      if (!(await ready(message, "calendar"))) return send(message, "⏸ Community Calendar is switched off or paused.");
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("community_suite_calendar_events")
        .select("*").eq("chat_id", Number(message.chat.id)).gte("starts_at", now)
        .order("starts_at").limit(15);
      if (error) throw error;
      const lines = (data || []).map((row) => `#${row.id} • ${new Date(row.starts_at).toLocaleString("en-AU")} • ${row.title}${row.link_url ? " • " + row.link_url : ""}`);
      return send(message, `📅 COMMUNITY CALENDAR\n\n${lines.join("\n") || "No upcoming events."}\n\nAdmin: /eventadd ISO_WITH_OFFSET | TITLE | DESCRIPTION | OPTIONAL_URL`);
    } catch {
      return send(message, "❌ Calendar could not be loaded.");
    }
  });

  bot.onText(/^\/eventadd(?:@\w+)?\s+([\s\S]+)$/i, async (message, match) => {
    try {
      if (!(await ready(message, "calendar"))) return send(message, "⏸ Community Calendar is switched off or paused.");
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const parts = String(match[1]).split("|").map((part) => part.trim());
      const starts = parseIsoWithOffset(parts[0]);
      const title = parts[1] || "";
      const description = parts[2] || "";
      const linkUrl = parts[3] || null;
      if (!starts || !title) return send(message, "❌ Use /eventadd 2026-10-08T19:00+11:00 | TITLE | DESCRIPTION | OPTIONAL_URL");
      if (starts.getTime() <= Date.now()) return send(message, "❌ Event time must be in the future.");
      const { data, error } = await supabase.from("community_suite_calendar_events").insert({
        chat_id: Number(message.chat.id),
        title: title.slice(0, 160),
        event_type: "community",
        starts_at: starts.toISOString(),
        description: description.slice(0, 1500),
        link_url: linkUrl ? linkUrl.slice(0, 500) : null,
        reminder_minutes: 60,
        created_by: Number(message.from.id)
      }).select("*").single();
      if (error) throw error;
      await recordAnalytics(supabase, message.chat.id, message.from.id, "calendar_event_created", { eventId: data.id });
      return send(message, `✅ Event #${data.id} scheduled for ${starts.toLocaleString("en-AU")}. Default reminder: 60 minutes before.`);
    } catch {
      return send(message, "❌ Event could not be created.");
    }
  });

  bot.onText(/^\/launchcountdown(?:@\w+)?(?:\s+([\s\S]+))?$/i, async (message, match) => {
    try {
      if (!(await ready(message, "calendar"))) return send(message, "⏸ Community Calendar is switched off or paused.");
      const raw = String(match?.[1] || "").trim();
      if (!raw) {
        const { data, error } = await supabase.from("community_suite_calendar_events")
          .select("*").eq("chat_id", Number(message.chat.id)).eq("event_type", "launch")
          .gte("starts_at", new Date().toISOString()).order("starts_at").limit(1).maybeSingle();
        if (error) throw error;
        if (!data) return send(message, "🚀 No future launch countdown is configured. Admin: /launchcountdown ISO_WITH_OFFSET | TITLE | OPTIONAL_URL");
        const target = Date.parse(data.starts_at);
        return send(message, [
          "🚀 LAUNCH COUNTDOWN",
          "",
          data.title,
          `⏳ ${formatCountdown(target)}`,
          `Launch time: ${new Date(target).toLocaleString("en-AU")}`,
          data.link_url || null,
          "",
          `Event #${data.id} • reminder 60 minutes before`
        ].filter(Boolean).join("\n"));
      }

      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const parts = raw.split("|").map((part) => part.trim());
      const starts = parseIsoWithOffset(parts[0]);
      const title = parts[1] || "";
      const linkUrl = parts[2] || null;
      if (!starts || !title) return send(message, "❌ Use /launchcountdown 2026-10-08T19:00+11:00 | TOKEN/PROJECT LAUNCH | OPTIONAL_URL");
      if (starts.getTime() <= Date.now()) return send(message, "❌ Launch time must be in the future.");
      const { data, error } = await supabase.from("community_suite_calendar_events").insert({
        chat_id: Number(message.chat.id),
        title: title.slice(0, 160),
        event_type: "launch",
        starts_at: starts.toISOString(),
        description: "Worldz Launch Countdown",
        link_url: linkUrl ? linkUrl.slice(0, 500) : null,
        reminder_minutes: 60,
        created_by: Number(message.from.id)
      }).select("*").single();
      if (error) throw error;
      await recordAnalytics(supabase, message.chat.id, message.from.id, "launch_countdown_created", { eventId:data.id });
      return send(message, `🚀 Launch Countdown #${data.id} set.\n\n${data.title}\n⏳ ${formatCountdown(starts.getTime())}\nLaunch: ${starts.toLocaleString("en-AU")}\n\nDelete/change via the calendar controls if needed.`);
    } catch {
      return send(message, "❌ Launch Countdown could not be loaded or saved.");
    }
  });

  bot.onText(/^\/eventdel(?:@\w+)?\s+(\d+)$/i, async (message, match) => {
    try {
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const { error } = await supabase.from("community_suite_calendar_events")
        .delete().eq("id", Number(match[1])).eq("chat_id", Number(message.chat.id));
      if (error) throw error;
      return send(message, `✅ Event #${match[1]} removed.`);
    } catch {
      return send(message, "❌ Event could not be removed.");
    }
  });

  bot.onText(/^\/giveaway(?:@\w+)?(?:\s+([\s\S]+))?$/i, async (message, match) => {
    try {
      if (!(await ready(message, "giveaways"))) return send(message, "⏸ Giveaways are switched off or paused.");
      const raw = String(match?.[1] || "").trim();
      if (!raw) {
        const { data } = await supabase.from("community_suite_giveaways")
          .select("*").eq("chat_id", Number(message.chat.id)).eq("status", "open")
          .order("entry_closes_at").limit(10);
        const lines = (data || []).map((row) => `#${row.id} • ${row.title} • Prize: ${row.prize_text} • closes ${new Date(row.entry_closes_at).toLocaleString("en-AU")}`);
        return send(message, `🎁 COMMUNITY GIVEAWAYS\n\n${lines.join("\n") || "No open giveaways."}\n\nJoin: /giveawayjoin ID\nAdmin create: /giveaway TITLE | PRIZE | ISO_WITH_OFFSET | WINNERS`);
      }
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required to create a giveaway.");
      const parts = raw.split("|").map((part) => part.trim());
      const title = parts[0];
      const prize = parts[1];
      const closes = parseIsoWithOffset(parts[2]);
      const winners = Number(parts[3] || 1);
      if (!title || !prize || !closes || !Number.isInteger(winners) || winners < 1 || winners > 25) {
        return send(message, "❌ Use /giveaway TITLE | PRIZE | 2026-10-08T20:00+11:00 | WINNERS");
      }
      if (closes.getTime() <= Date.now()) return send(message, "❌ Giveaway close time must be in the future.");
      const { data, error } = await supabase.from("community_suite_giveaways").insert({
        chat_id: Number(message.chat.id),
        title: title.slice(0, 160),
        prize_text: prize.slice(0, 500),
        status: "open",
        entry_closes_at: closes.toISOString(),
        max_winners: winners,
        created_by: Number(message.from.id)
      }).select("*").single();
      if (error) throw error;
      await recordAnalytics(supabase, message.chat.id, message.from.id, "giveaway_created", { giveawayId: data.id });
      return send(message, `🎁 Giveaway #${data.id} OPEN\n\n${data.title}\nPrize: ${data.prize_text}\nWinners: ${data.max_winners}\nCloses: ${closes.toLocaleString("en-AU")}\n\nEnter with /giveawayjoin ${data.id}`);
    } catch {
      return send(message, "❌ Giveaway could not be created.");
    }
  });

  bot.onText(/^\/giveawayjoin(?:@\w+)?\s+(\d+)$/i, async (message, match) => {
    try {
      if (!(await ready(message, "giveaways"))) return send(message, "⏸ Giveaways are switched off or paused.");
      const id = Number(match[1]);
      const { data: giveaway, error } = await supabase.from("community_suite_giveaways")
        .select("*").eq("id", id).eq("chat_id", Number(message.chat.id)).maybeSingle();
      if (error) throw error;
      if (!giveaway || giveaway.status !== "open" || Date.parse(giveaway.entry_closes_at) <= Date.now()) return send(message, "❌ That giveaway is not open.");
      const { error: entryError } = await supabase.from("community_suite_giveaway_entries").upsert({
        giveaway_id: id,
        telegram_id: Number(message.from.id),
        entered_at: new Date().toISOString()
      }, { onConflict: "giveaway_id,telegram_id" });
      if (entryError) throw entryError;
      await recordAnalytics(supabase, message.chat.id, message.from.id, "giveaway_entry", { giveawayId: id });
      return send(message, `✅ You are entered in Giveaway #${id}: ${giveaway.title}`);
    } catch {
      return send(message, "❌ Giveaway entry could not be recorded.");
    }
  });

  bot.onText(/^\/giveawaydraw(?:@\w+)?\s+(\d+)$/i, async (message, match) => {
    try {
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const id = Number(match[1]);
      const { data: giveaway, error } = await supabase.from("community_suite_giveaways")
        .select("*").eq("id", id).eq("chat_id", Number(message.chat.id)).maybeSingle();
      if (error) throw error;
      if (!giveaway || giveaway.status !== "open") return send(message, "❌ Giveaway not found or already closed.");
      if (Date.parse(giveaway.entry_closes_at) > Date.now()) return send(message, "❌ Entry window is still open.");
      const { data: entries, error: entriesError } = await supabase.from("community_suite_giveaway_entries")
        .select("telegram_id").eq("giveaway_id", id);
      if (entriesError) throw entriesError;
      const winners = pickWinners((entries || []).map((row) => row.telegram_id), giveaway.max_winners);
      await supabase.from("community_suite_giveaways").update({
        status: "closed",
        winner_telegram_ids: winners,
        updated_at: new Date().toISOString()
      }).eq("id", id);
      await recordAnalytics(supabase, message.chat.id, message.from.id, "giveaway_drawn", { giveawayId: id, winners: winners.length });
      return send(message, `🎁 GIVEAWAY #${id} DRAW COMPLETE\n\n${winners.length ? winners.map((value, index) => `${index + 1}. Telegram ID ${value}`).join("\n") : "No eligible entries."}\n\nRandom selection used only among recorded unique entries.`);
    } catch {
      return send(message, "❌ Giveaway draw could not complete.");
    }
  });

  bot.onText(/^\/walletwatch(?:@\w+)?$/i, async (message) => {
    try {
      if (!(await ready(message, "wallet_watch"))) return send(message, "⏸ Wallet Watch is switched off or paused.");
      const { data, error } = await supabase.from("community_suite_wallet_watchlist")
        .select("*").eq("chat_id", Number(message.chat.id)).eq("enabled", true).order("created_at");
      if (error) throw error;
      const lines = (data || []).map((row) => `#${row.id} • ${row.chain} • ${row.label || "Wallet"} • ${row.address}`);
      return send(message, `👛 WALLET WATCHLIST\n\n${lines.join("\n") || "No watched wallets."}\n\nAdmin: /watchwallet ADDRESS | LABEL | optional-chain\nRemove: /unwatchwallet ID`);
    } catch {
      return send(message, "❌ Wallet Watch could not load.");
    }
  });

  bot.onText(/^\/watchwallet(?:@\w+)?\s+([\s\S]+)$/i, async (message, match) => {
    try {
      if (!(await ready(message, "wallet_watch"))) return send(message, "⏸ Wallet Watch is switched off or paused.");
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const parts = String(match[1]).split("|").map((part) => part.trim());
      const address = parts[0];
      const label = parts[1] || "Wallet";
      const chain = String(parts[2] || "solana").toLowerCase();
      if (!address || address.length > 200) return send(message, "❌ Use /watchwallet ADDRESS | LABEL | optional-chain");
      const { data, error } = await supabase.from("community_suite_wallet_watchlist").upsert({
        chat_id: Number(message.chat.id),
        chain,
        address,
        label: label.slice(0, 80),
        enabled: true,
        created_by: Number(message.from.id)
      }, { onConflict: "chat_id,chain,address" }).select("*").single();
      if (error) throw error;
      await recordAnalytics(supabase, message.chat.id, message.from.id, "wallet_watch_added", { watchId: data.id, chain });
      return send(message, `✅ Watching ${label} on ${chain}: ${address}`);
    } catch {
      return send(message, "❌ Wallet could not be added to the watchlist.");
    }
  });

  bot.onText(/^\/unwatchwallet(?:@\w+)?\s+(\d+)$/i, async (message, match) => {
    try {
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const { error } = await supabase.from("community_suite_wallet_watchlist")
        .update({ enabled: false }).eq("id", Number(match[1])).eq("chat_id", Number(message.chat.id));
      if (error) throw error;
      return send(message, `✅ Wallet Watch #${match[1]} disabled.`);
    } catch {
      return send(message, "❌ Wallet Watch could not be disabled.");
    }
  });

  bot.onText(/^\/promote(?:@\w+)?\s+([\s\S]+)$/i, async (message, match) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Promotion records belong inside the customer group.");
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const parts = String(match[1]).split("|").map((part) => part.trim());
      const tokenAddress = parts[0] || null;
      const provider = parts[1];
      const product = parts[2];
      if (!provider || !product) return send(message, "❌ Use /promote TOKEN_ADDRESS | PROVIDER | PRODUCT");
      const { data, error } = await supabase.from("community_suite_promotions").insert({
        chat_id: Number(message.chat.id),
        token_address: tokenAddress,
        provider: provider.slice(0, 80),
        product: product.slice(0, 120),
        status: "planned",
        paid: false,
        disclosure_text: "Sponsored / paid promotion",
        created_by: Number(message.from.id)
      }).select("*").single();
      if (error) throw error;
      await recordAnalytics(supabase, message.chat.id, message.from.id, "promotion_planned", { promotionId: data.id, provider });
      return send(message, `🚀 Promotion #${data.id} recorded as PLANNED.\nProvider: ${data.provider}\nProduct: ${data.product}\nDisclosure: Sponsored / paid promotion\n\nOrganic Worldz Votes remain separate.`);
    } catch {
      return send(message, "❌ Promotion record could not be created.");
    }
  });

  async function sendDueReminders() {
    const now = Date.now();
    const horizon = new Date(now + 7 * 86400000).toISOString();
    const { data, error } = await supabase.from("community_suite_calendar_events")
      .select("*").is("reminder_sent_at", null).gte("starts_at", new Date(now).toISOString()).lte("starts_at", horizon)
      .limit(100);
    if (error) throw error;
    for (const event of data || []) {
      const dueAt = Date.parse(event.starts_at) - Number(event.reminder_minutes || 0) * 60000;
      if (dueAt > now) continue;
      try {
        const available = await moduleAvailable(supabase, event.chat_id, "calendar");
        if (!available) continue;
        await bot.sendMessage(event.chat_id, `📅 EVENT REMINDER\n\n${event.title}\nStarts: ${new Date(event.starts_at).toLocaleString("en-AU")}\n${event.description || ""}${event.link_url ? "\n" + event.link_url : ""}`);
        await supabase.from("community_suite_calendar_events").update({ reminder_sent_at: new Date().toISOString() }).eq("id", event.id);
      } catch (error2) {
        console.error("Community calendar reminder failed", { eventId: event.id, code: error2?.code || error2?.message || "unknown" });
      }
    }
  }

  reminderTimer = setInterval(() => sendDueReminders().catch((error) => {
    console.error("Community calendar sweeper failed", { code: error?.code || error?.message || "unknown" });
  }), 60000);
  if (typeof reminderTimer.unref === "function") reminderTimer.unref();

  return { parseIsoWithOffset, pickWinners, sendDueReminders };
}

module.exports = { formatCountdown, parseIsoWithOffset, pickWinners, registerCommunityOps };
