const crypto = require("node:crypto");

const BLOCKED_PERMISSIONS = Object.freeze({
  can_send_messages: false,
  can_send_audios: false,
  can_send_documents: false,
  can_send_photos: false,
  can_send_videos: false,
  can_send_video_notes: false,
  can_send_voice_notes: false,
  can_send_polls: false,
  can_send_other_messages: false,
  can_add_web_page_previews: false,
  can_invite_users: false
});

function challengeOptions(code) {
  const set = new Set([Number(code)]);
  while (set.size < 4) set.add(crypto.randomInt(10, 100));
  const values = [...set];
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

function normalizeDomain(value) {
  const raw = String(value || "").trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  return /^[a-z0-9.-]+$/.test(raw) && raw.includes(".") ? raw : null;
}

function extractHosts(text) {
  const matches = String(text || "").match(/https?:\/\/[^\s<>()]+/gi) || [];
  const hosts = [];
  for (const value of matches.slice(0, 20)) {
    try { hosts.push(new URL(value).hostname.toLowerCase().replace(/^www\./, "")); } catch {}
  }
  return [...new Set(hosts)];
}

function registerRexSecureGuard({ bot, supabase, config }) {
  const token = String(config.botToken || "").trim();
  const base = `https://api.telegram.org/bot${token}`;
  let sweeper = null;
  const messageRates = new Map();

  async function api(method, payload = {}) {
    const response = await fetch(`${base}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) {
      const error = new Error(body?.description || `Telegram ${method} failed`);
      error.code = body?.error_code || response.status;
      throw error;
    }
    return body.result;
  }

  async function setting(chatId) {
    const { data, error } = await supabase
      .from("zed_chat_settings")
      .select("secureguard_enabled,secureguard_number_match_enabled,secureguard_timeout_seconds,secureguard_max_attempts,secureguard_antiflood_enabled,secureguard_max_messages_10s,secureguard_links_mode")
      .eq("chat_id", Number(chatId))
      .maybeSingle();
    if (error) throw error;
    return {
      enabled: data?.secureguard_enabled === true,
      numberMatch: data?.secureguard_number_match_enabled !== false,
      timeout: Number(data?.secureguard_timeout_seconds) || 120,
      maxAttempts: Number(data?.secureguard_max_attempts) || 3,
      antiflood: data?.secureguard_antiflood_enabled !== false,
      maxMessages10s: Number(data?.secureguard_max_messages_10s) || 8,
      linksMode: String(data?.secureguard_links_mode || "blocklist")
    };
  }

  async function upsertSetting(chatId, patch) {
    const { error } = await supabase.from("zed_chat_settings").upsert({
      chat_id: Number(chatId),
      ...patch,
      updated_at: new Date().toISOString()
    }, { onConflict: "chat_id" });
    if (error) throw error;
  }

  async function logEvent(chatId, telegramId, eventType, detail = "", actorTelegramId = null) {
    try {
      await supabase.from("secureguard_events").insert({
        chat_id: Number(chatId),
        telegram_id: telegramId == null ? null : Number(telegramId),
        event_type: String(eventType),
        detail: String(detail).slice(0, 500),
        actor_telegram_id: actorTelegramId == null ? null : Number(actorTelegramId)
      });
    } catch {}
  }

  async function isTelegramAdmin(chatId, userId) {
    try {
      const member = await api("getChatMember", { chat_id: chatId, user_id: userId });
      return member?.status === "creator" || member?.status === "administrator";
    } catch {
      return false;
    }
  }

  async function unlockMember(chatId, userId) {
    const chat = await api("getChat", { chat_id: chatId });
    const permissions = chat?.permissions && Object.keys(chat.permissions).length
      ? chat.permissions
      : {
          can_send_messages: true,
          can_send_audios: true,
          can_send_documents: true,
          can_send_photos: true,
          can_send_videos: true,
          can_send_video_notes: true,
          can_send_voice_notes: true,
          can_send_polls: true,
          can_send_other_messages: true,
          can_add_web_page_previews: true,
          can_invite_users: true
        };
    return api("restrictChatMember", { chat_id: chatId, user_id: userId, permissions });
  }

  async function removeMember(chatId, userId) {
    await api("banChatMember", { chat_id: chatId, user_id: userId, revoke_messages: false });
    await api("unbanChatMember", { chat_id: chatId, user_id: userId, only_if_banned: true });
  }

  async function createChallenge(msg, member, cfg) {
    if (member.is_bot) return;
    const code = crypto.randomInt(10, 100);
    const expiresAt = new Date(Date.now() + cfg.timeout * 1000).toISOString();

    await api("restrictChatMember", {
      chat_id: msg.chat.id,
      user_id: member.id,
      permissions: BLOCKED_PERMISSIONS
    });

    await supabase.from("secureguard_challenges")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("chat_id", Number(msg.chat.id))
      .eq("telegram_id", Number(member.id))
      .eq("status", "pending");

    const { data: challenge, error } = await supabase
      .from("secureguard_challenges")
      .insert({
        chat_id: Number(msg.chat.id),
        telegram_id: Number(member.id),
        challenge_code: code,
        max_attempts: cfg.maxAttempts,
        expires_at: expiresAt
      })
      .select("id")
      .single();
    if (error) throw error;

    const options = challengeOptions(code);
    const sent = await bot.sendMessage(
      msg.chat.id,
      `🛡 REX SecureGuard™\n\nWelcome ${member.first_name || "member"}. Match this number to unlock chat access:\n\n🔢 ${code}\n\nYou have ${cfg.timeout} seconds.`,
      {
        reply_markup: {
          inline_keyboard: [
            options.slice(0, 2).map((value) => ({ text: String(value), callback_data: `rex:verify:${challenge.id}:${value}` })),
            options.slice(2, 4).map((value) => ({ text: String(value), callback_data: `rex:verify:${challenge.id}:${value}` }))
          ]
        }
      }
    );

    await supabase.from("secureguard_challenges")
      .update({ message_id: Number(sent.message_id), updated_at: new Date().toISOString() })
      .eq("id", challenge.id);

    await logEvent(msg.chat.id, member.id, "challenge_created", `challenge_id=${challenge.id}`);
  }

  async function expirePending() {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("secureguard_challenges")
      .select("id,chat_id,telegram_id,message_id")
      .eq("status", "pending")
      .lte("expires_at", now)
      .limit(50);
    if (error) throw error;
    for (const row of data || []) {
      try {
        await removeMember(row.chat_id, row.telegram_id);
        await supabase.from("secureguard_challenges")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("id", row.id)
          .eq("status", "pending");
        if (row.message_id) {
          try { await bot.editMessageText("🛡 REX SecureGuard™ — verification expired. Member removed; they may rejoin and try again.", { chat_id: row.chat_id, message_id: row.message_id }); } catch {}
        }
        await logEvent(row.chat_id, row.telegram_id, "challenge_expired", `challenge_id=${row.id}`);
      } catch (error2) {
        console.error("REX expiry action failed", { code: error2?.code || error2?.message || "unknown" });
      }
    }
  }

  async function domainRules(chatId) {
    const { data, error } = await supabase.from("secureguard_domains")
      .select("domain,action,reason").eq("chat_id", Number(chatId));
    if (error) throw error;
    return data || [];
  }

  function matchingRule(host, rules) {
    const matches = (rules || []).filter((rule) => host === rule.domain || host.endsWith("." + rule.domain));
    const allow = matches.find((rule) => rule.action === "allow");
    return allow || matches.find((rule) => rule.action === "block") || null;
  }

  async function enforceFlood(msg, cfg) {
    if (!cfg.antiflood || !msg.from?.id) return false;
    const key = `${msg.chat.id}:${msg.from.id}`;
    const now = Date.now();
    const recent = (messageRates.get(key) || []).filter((stamp) => now - stamp < 10000);
    recent.push(now);
    messageRates.set(key, recent);
    if (recent.length <= cfg.maxMessages10s) return false;
    try { await api("deleteMessage", { chat_id: msg.chat.id, message_id: msg.message_id }); } catch {}
    try {
      await api("restrictChatMember", {
        chat_id: msg.chat.id,
        user_id: msg.from.id,
        permissions: BLOCKED_PERMISSIONS,
        until_date: Math.floor(Date.now() / 1000) + 60
      });
    } catch {}
    await logEvent(msg.chat.id, msg.from.id, "antiflood_triggered", `messages_10s=${recent.length}`);
    return true;
  }

  async function enforceLinks(msg, cfg) {
    const hosts = extractHosts(msg.text || msg.caption || "");
    if (!hosts.length || cfg.linksMode === "allow") return false;
    const admin = await isTelegramAdmin(msg.chat.id, msg.from?.id);
    if (admin) return false;
    let blocked = cfg.linksMode === "admins_only";
    let blockedHost = null;
    if (!blocked && cfg.linksMode === "blocklist") {
      const rules = await domainRules(msg.chat.id);
      for (const host of hosts) {
        const rule = matchingRule(host, rules);
        if (rule?.action === "block") { blocked = true; blockedHost = host; break; }
      }
    }
    if (!blocked) return false;
    try { await api("deleteMessage", { chat_id: msg.chat.id, message_id: msg.message_id }); } catch {}
    await logEvent(msg.chat.id, msg.from?.id, "link_blocked", blockedHost || cfg.linksMode);
    try { await bot.sendMessage(msg.chat.id, `🛡 REX removed a link from a non-admin member${blockedHost ? `: ${blockedHost}` : "."}`); } catch {}
    return true;
  }

  bot.onText(/^\/rexblockdomain(?:@\w+)?\s+(\S+)(?:\s*\|\s*([\s\S]+))?$/i, async (msg, match) => {
    if (!(await isTelegramAdmin(msg.chat.id, msg.from?.id))) return bot.sendMessage(msg.chat.id, "⛔ Telegram group admin access required.");
    const domain = normalizeDomain(match?.[1]);
    if (!domain) return bot.sendMessage(msg.chat.id, "❌ Use /rexblockdomain example.com | optional reason");
    const { error } = await supabase.from("secureguard_domains").upsert({
      chat_id: Number(msg.chat.id), domain, action: "block", reason: String(match?.[2] || "").slice(0, 300), created_by: Number(msg.from.id)
    }, { onConflict: "chat_id,domain" });
    if (error) return bot.sendMessage(msg.chat.id, "❌ REX could not save that domain rule.");
    return bot.sendMessage(msg.chat.id, `🛡 Block rule saved for ${domain}.`);
  });

  bot.onText(/^\/rexallowdomain(?:@\w+)?\s+(\S+)$/i, async (msg, match) => {
    if (!(await isTelegramAdmin(msg.chat.id, msg.from?.id))) return bot.sendMessage(msg.chat.id, "⛔ Telegram group admin access required.");
    const domain = normalizeDomain(match?.[1]);
    if (!domain) return bot.sendMessage(msg.chat.id, "❌ Use /rexallowdomain example.com");
    const { error } = await supabase.from("secureguard_domains").upsert({
      chat_id: Number(msg.chat.id), domain, action: "allow", reason: "Admin allowlist", created_by: Number(msg.from.id)
    }, { onConflict: "chat_id,domain" });
    if (error) return bot.sendMessage(msg.chat.id, "❌ REX could not save that domain rule.");
    return bot.sendMessage(msg.chat.id, `✅ Allow rule saved for ${domain}.`);
  });

  bot.onText(/^\/rexdomains(?:@\w+)?$/i, async (msg) => {
    if (!(await isTelegramAdmin(msg.chat.id, msg.from?.id))) return bot.sendMessage(msg.chat.id, "⛔ Telegram group admin access required.");
    const rules = await domainRules(msg.chat.id).catch(() => []);
    const lines = rules.map((row) => `${row.action === "allow" ? "✅" : "⛔"} ${row.domain}${row.reason ? " — " + row.reason : ""}`);
    return bot.sendMessage(msg.chat.id, `🛡 REX DOMAIN RULES\n\n${lines.join("\n") || "No explicit domain rules."}`);
  });

  bot.onText(/^\/rexlinkmode(?:@\w+)?\s+(allow|blocklist|admins_only)$/i, async (msg, match) => {
    if (!(await isTelegramAdmin(msg.chat.id, msg.from?.id))) return bot.sendMessage(msg.chat.id, "⛔ Telegram group admin access required.");
    await upsertSetting(msg.chat.id, { secureguard_links_mode: String(match[1]).toLowerCase() });
    return bot.sendMessage(msg.chat.id, `🛡 REX link mode: ${String(match[1]).toLowerCase()}`);
  });

  bot.onText(/^\/secureguard(?:@\w+)?(?:\s+(on|off|status))?$/i, async (msg, match) => {
    const action = String(match?.[1] || "status").toLowerCase();
    const chatId = msg.chat.id;
    const type = msg.chat.type;
    const actorId = msg.from?.id;

    if (!["group", "supergroup"].includes(type)) {
      return bot.sendMessage(chatId, "🛡 REX SecureGuard™ works inside Telegram groups/supergroups.");
    }

    if (!(await isTelegramAdmin(chatId, actorId))) {
      return bot.sendMessage(chatId, "⛔ Telegram group admin access required.");
    }

    if (action === "on") {
      if (type !== "supergroup") {
        return bot.sendMessage(chatId,
          "🛡 REX is ready, but number-match member restriction requires a Telegram Supergroup. Upgrade this group to a Supergroup in Telegram first, then run /secureguard on again. REX will recognise the migrated group automatically."
        );
      }
      await upsertSetting(chatId, { secureguard_enabled: true });
      await logEvent(chatId, null, "secureguard_enabled", "", actorId);
    } else if (action === "off") {
      await upsertSetting(chatId, { secureguard_enabled: false });
      await logEvent(chatId, null, "secureguard_disabled", "", actorId);
    }

    const cfg = await setting(chatId);
    let rights = "unknown";
    try {
      const me = await api("getMe");
      const member = await api("getChatMember", { chat_id: chatId, user_id: me.id });
      rights = member?.can_restrict_members ? "✅ can restrict members" : "⚠️ needs Restrict Members admin right";
    } catch {}

    return bot.sendMessage(chatId, [
      "🛡 REX SecureGuard™",
      "",
      `Status: ${cfg.enabled ? "✅ ON" : "⏸ OFF"}`,
      `Chat: ${type === "supergroup" ? "✅ Supergroup" : "⚠️ Basic group"}`,
      `Bot rights: ${rights}`,
      `Number Match: ${cfg.numberMatch ? "✅ ON" : "⏸ OFF"}`,
      `Timeout: ${cfg.timeout}s`,
      `Attempts: ${cfg.maxAttempts}`,
      `Anti-Flood: ${cfg.antiflood ? "✅ ON" : "⏸ OFF"} • max ${cfg.maxMessages10s}/10s`,
      `Link Guard: ${cfg.linksMode}`,
      "",
      "Commands: /secureguard on • /secureguard off • /secureguard status",
      "Domains: /rexblockdomain • /rexallowdomain • /rexdomains • /rexlinkmode"
    ].join("\n"));
  });

  bot.on("message", async (msg) => {
    try {
      if (msg.migrate_to_chat_id) {
        const oldId = Number(msg.chat.id);
        const newId = Number(msg.migrate_to_chat_id);
        const { data } = await supabase.from("zed_chat_settings").select("*").eq("chat_id", oldId).maybeSingle();
        if (data) {
          delete data.created_at;
          delete data.updated_at;
          data.chat_id = newId;
          await supabase.from("zed_chat_settings").upsert({ ...data, updated_at: new Date().toISOString() }, { onConflict: "chat_id" });
          await logEvent(newId, null, "group_migrated", `from=${oldId}`);
        }
        return;
      }

      if (!["group","supergroup"].includes(String(msg.chat?.type || ""))) return;
      const cfg = await setting(msg.chat.id);
      if (!cfg.enabled) return;

      if (Array.isArray(msg.new_chat_members) && msg.new_chat_members.length > 0) {
        if (!cfg.numberMatch || msg.chat.type !== "supergroup") return;
        for (const member of msg.new_chat_members) await createChallenge(msg, member, cfg);
        return;
      }

      if (!msg.from?.id || msg.from?.is_bot || String(msg.text || "").startsWith("/")) return;
      if (await isTelegramAdmin(msg.chat.id, msg.from.id)) return;
      if (await enforceFlood(msg, cfg)) return;
      await enforceLinks(msg, cfg);
    } catch (error) {
      console.error("REX SecureGuard message handling failed", { code: error?.code || error?.message || "unknown" });
    }
  });

  bot.on("callback_query", async (query) => {
    const match = String(query?.data || "").match(/^rex:verify:(\d+):(\d+)$/);
    if (!match || !query.message) return;
    const challengeId = Number(match[1]);
    const answer = Number(match[2]);

    try {
      const { data: row, error } = await supabase
        .from("secureguard_challenges")
        .select("*")
        .eq("id", challengeId)
        .maybeSingle();
      if (error) throw error;
      if (!row || row.status !== "pending") {
        return bot.answerCallbackQuery(query.id, { text: "This verification is no longer active.", show_alert: true });
      }
      if (Number(query.from?.id) !== Number(row.telegram_id)) {
        return bot.answerCallbackQuery(query.id, { text: "That number check belongs to the new member.", show_alert: true });
      }
      if (new Date(row.expires_at).getTime() <= Date.now()) {
        await removeMember(row.chat_id, row.telegram_id);
        await supabase.from("secureguard_challenges").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", row.id);
        await bot.answerCallbackQuery(query.id, { text: "Verification expired.", show_alert: true });
        return bot.editMessageText("🛡 REX SecureGuard™ — verification expired. Rejoin to try again.", { chat_id: row.chat_id, message_id: query.message.message_id });
      }

      if (answer === Number(row.challenge_code)) {
        await unlockMember(row.chat_id, row.telegram_id);
        await supabase.from("secureguard_challenges").update({ status: "passed", updated_at: new Date().toISOString() }).eq("id", row.id);
        await logEvent(row.chat_id, row.telegram_id, "challenge_passed", `challenge_id=${row.id}`);
        await bot.answerCallbackQuery(query.id, { text: "Verified ✅" });
        return bot.editMessageText(`🛡 REX SecureGuard™\n\n✅ ${query.from.first_name || "Member"} verified. Welcome in.`, { chat_id: row.chat_id, message_id: query.message.message_id });
      }

      const attempts = Number(row.attempts || 0) + 1;
      if (attempts >= Number(row.max_attempts || 3)) {
        await removeMember(row.chat_id, row.telegram_id);
        await supabase.from("secureguard_challenges").update({ status: "failed", attempts, updated_at: new Date().toISOString() }).eq("id", row.id);
        await logEvent(row.chat_id, row.telegram_id, "challenge_failed", `challenge_id=${row.id}`);
        await bot.answerCallbackQuery(query.id, { text: "Too many wrong attempts.", show_alert: true });
        return bot.editMessageText("🛡 REX SecureGuard™ — verification failed. Member removed; they may rejoin and try again.", { chat_id: row.chat_id, message_id: query.message.message_id });
      }

      await supabase.from("secureguard_challenges").update({ attempts, updated_at: new Date().toISOString() }).eq("id", row.id);
      return bot.answerCallbackQuery(query.id, { text: `Wrong number. ${Number(row.max_attempts)-attempts} attempt(s) left.`, show_alert: true });
    } catch (error) {
      console.error("REX SecureGuard callback failed", { code: error?.code || error?.message || "unknown" });
      try { await bot.answerCallbackQuery(query.id, { text: "REX hit an error.", show_alert: true }); } catch {}
    }
  });

  sweeper = setInterval(() => expirePending().catch((error) => {
    console.error("REX SecureGuard sweeper failed", { code: error?.code || error?.message || "unknown" });
  }), 30000);
  if (typeof sweeper.unref === "function") sweeper.unref();

  return { challengeOptions, expirePending };
}

module.exports = { BLOCKED_PERMISSIONS, challengeOptions, extractHosts, normalizeDomain, registerRexSecureGuard };
