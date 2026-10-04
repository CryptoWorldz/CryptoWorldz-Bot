const DEFAULTS = Object.freeze({
  likes: 10,
  reposts: 5,
  replies: 3,
  views: 8,
  reward: 20,
  durationHours: 24
});

const RAID_PULSE_SCAN_INTERVAL_MS = 15_000;
const RAID_PULSE_MIN_GAP_SECONDS = 55;

function detectPlatform(value) {
  let url;
  try { url = new URL(String(value || "").trim()); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (["x.com", "twitter.com"].includes(host)) return { platform: "X", url: url.href };
  if (["youtube.com", "youtu.be"].includes(host)) return { platform: "YouTube", url: url.href };
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return { platform: "TikTok", url: url.href };
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return { platform: "Instagram", url: url.href };
  if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.watch") return { platform: "Facebook", url: url.href };
  if (host === "t.me" || host.endsWith(".telegram.me")) return { platform: "Telegram", url: url.href };
  return { platform: "Website", url: url.href };
}

function extractXStatusId(value) {
  let url;
  try { url = new URL(String(value || "").trim()); } catch { return null; }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!["x.com", "twitter.com"].includes(host)) return null;
  const match = url.pathname.match(/\/(?:i\/web\/)?status(?:es)?\/(\d{5,25})(?:\/|$)/i);
  return match ? match[1] : null;
}

function raidOpenUrl(campaign) {
  const source = String(campaign?.source_url || "").trim();
  if (String(campaign?.platform || "").toUpperCase() !== "X") return source;
  const statusId = extractXStatusId(source);
  if (!statusId) return source;
  const params = new URLSearchParams({ id: statusId, src: source });
  return `https://cryptobotz.cryptoworldz.xyz/miniapp/open-x.html?${params.toString()}`;
}

function numberOr(value, fallback, min = 0, max = 10000000) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function parseDuration(value) {
  if (!value) return DEFAULTS.durationHours;
  const match = String(value).trim().match(/^(\d+)(h|d)$/i);
  if (!match) return null;
  const hours = Number(match[1]) * (match[2].toLowerCase() === "d" ? 24 : 1);
  return Number.isSafeInteger(hours) && hours >= 1 && hours <= 24 * 30 ? hours : null;
}

function parseRaidPayload(value) {
  const parts = String(value || "").split("|").map((part) => part.trim());
  if (!parts[0] || parts.length > 7) return { ok: false, error: "invalid_format" };
  const target = detectPlatform(parts[0]);
  if (!target) return { ok: false, error: "invalid_url" };

  const likes = numberOr(parts[1], DEFAULTS.likes);
  const reposts = numberOr(parts[2], DEFAULTS.reposts);
  const replies = numberOr(parts[3], DEFAULTS.replies);
  const views = numberOr(parts[4], DEFAULTS.views);
  const reward = numberOr(parts[5], DEFAULTS.reward, 1, 100);
  const durationHours = parseDuration(parts[6]);
  if ([likes, reposts, replies, views, reward, durationHours].some((item) => item === null)) {
    return { ok: false, error: "invalid_goal" };
  }

  return {
    ok: true,
    target,
    goals: { likes, reposts, replies, views },
    reward,
    durationHours
  };
}

function progressMark(current, goal) {
  if (!goal) return "⬜";
  return Number(current) >= Number(goal) ? "✅" : "🟥";
}

function progressLine(label, current, goal) {
  return `${progressMark(current, goal)} ${label} ${Number(current) || 0} | ${Number(goal) || 0} [${goal ? Math.min(100, Math.floor((Number(current) || 0) * 100 / goal)) : 100}%]`;
}

function campaignText(campaign) {
  if (!campaign) return "🤠 RONALD RAIDER\n\nNo live Raid right now.";
  const status = String(campaign.status || "").toUpperCase();
  const lines = [
    "🤠⚡ RONALD RAIDER",
    `Raid #${campaign.id} • ${campaign.platform} • ${status}`,
    "",
    "🔥 RAID IN 3 EASY STEPS",
    "1️⃣ Tap OPEN POST.",
    "2️⃣ Like + Repost + Reply genuinely.",
    "3️⃣ Come back here and tap I RAIDED ✅.",
    "",
    `👥 Legends joined: ${Number(campaign.participation_count) || 0}`,
    `⭐ Reward: ${Number(campaign.reward_points) || 0} LP when the completion passes automatic safety checks.`,
    "",
    "🎯 COMMUNITY POST TARGETS — not your personal checklist",
    progressLine("Likes", campaign.likes_current, campaign.likes_goal),
    progressLine("Reposts", campaign.reposts_current, campaign.reposts_goal),
    progressLine("Replies", campaign.replies_current, campaign.replies_goal),
    progressLine("Views", campaign.views_current, campaign.views_goal),
    "",
    "The shared counters can lag. Your participation is recorded when you tap I RAIDED ✅."
  ];
  return lines.join("\n");
}

function raidPulseText(campaign) {
  if (!campaign) return "🤠⚡ RONALD RAIDER — no live Raid.";
  return [
    `🤠⚡ RONALD RAIDER • RAID #${campaign.id} ACTIVE`,
    "",
    "1️⃣ OPEN POST",
    "2️⃣ Like + Repost + Reply",
    "3️⃣ Come back → I RAIDED ✅",
    "",
    `👥 Legends joined: ${Number(campaign.participation_count) || 0}`,
    `⭐ ${Number(campaign.reward_points) || 0} LP on verified completion`,
    "",
    "🎯 Community targets — NOT your personal checklist:",
    `❤️ ${Number(campaign.likes_current) || 0}/${Number(campaign.likes_goal) || 0} • 🔁 ${Number(campaign.reposts_current) || 0}/${Number(campaign.reposts_goal) || 0} • 💬 ${Number(campaign.replies_current) || 0}/${Number(campaign.replies_goal) || 0} • 👀 ${Number(campaign.views_current) || 0}/${Number(campaign.views_goal) || 0}`
  ].join("\n");
}

function keyboard(campaign) {
  if (!campaign) return undefined;
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "𝕏 OPEN RAID POST ↗", url: raidOpenUrl(campaign) }],
        [{ text: "✅ I RAIDED", callback_data: `ronald:done:${campaign.id}` }],
        [
          { text: "🔄 Refresh", callback_data: `ronald:refresh:${campaign.id}` },
          { text: "🏆 Leaderboard", callback_data: "ronald:lb" }
        ]
      ]
    }
  };
}

function registerRonaldRaider({ bot, repository, supabase, config }) {
  const send = (chatId, text, options) => bot.sendMessage(chatId, text, options);
  const permission = (telegramId, name) => repository.hasPermission(
    telegramId,
    name,
    config.adminTelegramIds,
    config.ownerTelegramId
  );
  const localPulseAt = new Map();
  const localPulseMessageIds = new Map();
  let pulseScanRunning = false;

  async function settingEnabled(chatId) {
    try {
      const { data, error } = await supabase
        .from("zed_chat_settings")
        .select("ronald_raider_enabled")
        .eq("chat_id", Number(chatId))
        .maybeSingle();
      if (error) throw error;
      return data ? data.ronald_raider_enabled !== false : true;
    } catch {
      return true;
    }
  }

  async function withParticipation(campaign) {
    if (!campaign?.mission_id) return campaign;
    try {
      const { count, error } = await supabase
        .from("mission_submissions")
        .select("id", { count: "exact", head: true })
        .eq("mission_id", Number(campaign.mission_id))
        .in("status", ["pending", "approved"]);
      if (error) throw error;
      return { ...campaign, participation_count: Number(count) || 0 };
    } catch {
      return { ...campaign, participation_count: 0 };
    }
  }

  async function activeCampaigns() {
    const { data, error } = await supabase
      .from("raid_campaigns")
      .select("*,missions(reward_points,title,expires_at)")
      .eq("status", "active");
    if (error) throw error;
    return Promise.all((data || []).map((row) => withParticipation({
      ...row,
      reward_points: row.missions?.reward_points || DEFAULTS.reward
    })));
  }

  async function resetPulseClock(campaignId) {
    localPulseAt.set(Number(campaignId), Date.now());
    try {
      const { error } = await supabase
        .from("raid_campaigns")
        .update({ last_pulse_at: new Date().toISOString() })
        .eq("id", Number(campaignId));
      if (error) throw error;
    } catch (error) {
      console.warn("Ronald Raider pulse clock persistence unavailable", { code: error?.code || error?.message || "unknown" });
    }
  }

  async function claimPulse(campaignId) {
    try {
      const { data, error } = await supabase.rpc("claim_raid_pulse", {
        p_campaign_id: Number(campaignId),
        p_min_seconds: RAID_PULSE_MIN_GAP_SECONDS
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.claimed) return null;
      return row;
    } catch (error) {
      const key = Number(campaignId);
      const last = localPulseAt.get(key) || 0;
      if (Date.now() - last < RAID_PULSE_MIN_GAP_SECONDS * 1000) return null;
      localPulseAt.set(key, Date.now());
      return {
        claimed: true,
        previous_message_id: localPulseMessageIds.get(key) || null,
        local_fallback: true
      };
    }
  }

  async function safeDeletePulse(chatId, messageId) {
    if (!messageId) return;
    try {
      await bot.deleteMessage(chatId, Number(messageId));
    } catch {}
  }

  async function savePulseMessage(campaignId, messageId) {
    const key = Number(campaignId);
    localPulseMessageIds.set(key, Number(messageId));
    try {
      const { error } = await supabase
        .from("raid_campaigns")
        .update({ last_pulse_message_id: Number(messageId) })
        .eq("id", key)
        .eq("status", "active");
      if (error) throw error;
    } catch (error) {
      console.warn("Ronald Raider pulse message persistence unavailable", { code: error?.code || error?.message || "unknown" });
    }
  }

  async function clearPulse(campaign) {
    if (!campaign) return;
    const key = Number(campaign.id);
    const messageId = campaign.last_pulse_message_id || localPulseMessageIds.get(key);
    await safeDeletePulse(campaign.chat_id, messageId);
    localPulseAt.delete(key);
    localPulseMessageIds.delete(key);
    try {
      await supabase
        .from("raid_campaigns")
        .update({ last_pulse_message_id: null })
        .eq("id", key);
    } catch {}
  }

  async function pulseCampaign(campaign) {
    if (!(await settingEnabled(campaign.chat_id))) return;
    const claim = await claimPulse(campaign.id);
    if (!claim) return;

    const fresh = await campaignById(campaign.id);
    if (!fresh || fresh.status !== "active") return;

    const message = await send(
      fresh.chat_id,
      raidPulseText(fresh),
      { ...keyboard(fresh), disable_notification: true }
    );

    await savePulseMessage(fresh.id, message.message_id);
    await safeDeletePulse(fresh.chat_id, claim.previous_message_id);
  }

  async function pulseActiveRaids() {
    if (pulseScanRunning) return;
    pulseScanRunning = true;
    try {
      const raids = await activeCampaigns();
      const results = await Promise.allSettled(raids.map((campaign) => pulseCampaign(campaign)));
      for (const result of results) {
        if (result.status === "rejected") {
          console.error("Ronald Raider pulse failed", { code: result.reason?.code || result.reason?.message || "unknown" });
        }
      }
    } catch (error) {
      console.error("Ronald Raider pulse scan failed", { code: error?.code || error?.message || "unknown" });
    } finally {
      pulseScanRunning = false;
    }
  }

  async function autoRewardStatus(telegramId) {
    const { data, error } = await supabase.rpc("get_activity_reward_automation_status", {
      p_telegram_id: Number(telegramId)
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function autoAwardRaid(submissionId) {
    if (typeof repository.autoAwardRaidSubmission === "function") {
      return repository.autoAwardRaidSubmission(Number(submissionId));
    }
    const { data, error } = await supabase.rpc("auto_award_raid_submission", {
      p_submission_id: Number(submissionId)
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function reconcilePendingRaidRewards() {
    const { data, error } = await supabase.rpc("reconcile_pending_raid_rewards", { p_limit: 50 });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (row && Number(row.processed) > 0) {
      console.log("Ronald Raider pending reward reconciliation", {
        processed: Number(row.processed) || 0,
        awarded: Number(row.awarded) || 0,
        held: Number(row.held) || 0
      });
    }
    return row;
  }

  function rewardStatusText(status) {
    return [
      "🤠⚡ WORLDZ RAIDPOINTS",
      "",
      `Automation: ${status?.enabled && status?.auto_raid_points ? "✅ ON" : "⏸ OFF"}`,
      `Today: ${Number(status?.raid_claims_today) || 0}/${Number(status?.raid_daily_claim_cap) || 0} Raids`,
      `Points today: ${Number(status?.points_today) || 0}/${Number(status?.user_daily_points_cap) || 0} LP`,
      `Points this week: ${Number(status?.points_this_week) || 0}/${Number(status?.user_weekly_points_cap) || 0} LP`,
      "",
      "✅ Normal genuine completions → auto-award",
      "🛡 Caps / duplicates / unusual cases → exception review only",
      "🏦 Funding path: Treasury → ring-fenced Reward Wallet",
      `🎁 Weekly allocation: up to ${Number(status?.pool_percent) || 0}% of the available Reward Wallet pool`,
      "",
      "The Treasury is not the per-member hot wallet. Automatic allocation stays inside the capped Reward Wallet."
    ].join("\n");
  }

  async function campaignById(id) {
    const { data, error } = await supabase
      .from("raid_campaigns")
      .select("*,missions(reward_points,title,expires_at)")
      .eq("id", Number(id))
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return withParticipation({ ...data, reward_points: data.missions?.reward_points || DEFAULTS.reward });
  }

  async function activeCampaign(chatId) {
    const { data, error } = await supabase
      .from("raid_campaigns")
      .select("*,missions(reward_points,title,expires_at)")
      .eq("chat_id", Number(chatId))
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return withParticipation({ ...data, reward_points: data.missions?.reward_points || DEFAULTS.reward });
  }

  async function queuedCampaign(chatId) {
    const { data, error } = await supabase
      .from("raid_campaigns")
      .select("*,missions(reward_points,title,expires_at)")
      .eq("chat_id", Number(chatId))
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return withParticipation({ ...data, reward_points: data.missions?.reward_points || DEFAULTS.reward });
  }

  async function createCampaign(msg, parsed, queued) {
    if (await repository.findMissionByUrl(parsed.target.url)) {
      return send(msg.chat.id, "⚠️ That post is already in the ZED mission system.");
    }
    if (!queued && await activeCampaign(msg.chat.id)) {
      return send(msg.chat.id, "🤠 Ronald already has a live Raid. Use /next <URL> to line the next one up, or /stopraid first.");
    }

    const expiresAt = new Date(Date.now() + parsed.durationHours * 3600000).toISOString();
    const mission = await repository.createMission({
      title: `Ronald Raider — ${parsed.target.platform} Raid`,
      platform: parsed.target.platform,
      reward_points: parsed.reward,
      link: parsed.target.url,
      target_url: parsed.target.url,
      description: `Ronald Raider targets — Likes ${parsed.goals.likes} • Reposts ${parsed.goals.reposts} • Replies ${parsed.goals.replies} • Views ${parsed.goals.views}`,
      instructions: "Open the post. Complete genuine engagement only. Tap DONE and submit proof when requested. No spam, bots or fake engagement.",
      status: queued ? "open" : "active",
      starts_at: queued ? null : new Date().toISOString(),
      expires_at: expiresAt,
      difficulty: "standard"
    }, msg.from.id);

    const { data, error } = await supabase
      .from("raid_campaigns")
      .insert({
        chat_id: Number(msg.chat.id),
        mission_id: mission.id,
        source_url: parsed.target.url,
        platform: parsed.target.platform,
        status: queued ? "queued" : "active",
        likes_goal: parsed.goals.likes,
        reposts_goal: parsed.goals.reposts,
        replies_goal: parsed.goals.replies,
        views_goal: parsed.goals.views,
        created_by: Number(msg.from.id),
        started_at: queued ? null : new Date().toISOString()
      })
      .select("*,missions(reward_points,title,expires_at)")
      .single();
    if (error) throw error;
    const campaign = await withParticipation({ ...data, reward_points: data.missions?.reward_points || parsed.reward });
    if (!queued) await resetPulseClock(campaign.id);
    return send(
      msg.chat.id,
      queued ? `⏭ Added to Ronald's Raid line-up.\n\n${campaignText(campaign)}` : campaignText(campaign),
      keyboard(campaign)
    );
  }

  async function startNext(chatId, actorId) {
    const next = await queuedCampaign(chatId);
    if (!next) return null;
    const current = await activeCampaign(chatId);
    if (current) {
      await clearPulse(current);
      await supabase.from("raid_campaigns").update({ status: "completed", stopped_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", current.id);
      await supabase.from("missions").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", current.mission_id);
    }
    await supabase.from("raid_campaigns").update({ status: "active", started_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", next.id);
    await supabase.from("missions").update({ status: "active", starts_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", next.mission_id);
    await resetPulseClock(next.id);
    return campaignById(next.id);
  }

  const pulseBootstrapTimer = setTimeout(() => { void pulseActiveRaids(); }, 5_000);
  const pulseTimer = setInterval(() => { void pulseActiveRaids(); }, RAID_PULSE_SCAN_INTERVAL_MS);
  const rewardReconcileBootstrapTimer = setTimeout(() => {
    void reconcilePendingRaidRewards().catch((error) => console.error("Ronald reward reconciliation failed", { code: error?.code || error?.message || "unknown" }));
  }, 12_000);
  const rewardReconcileTimer = setInterval(() => {
    void reconcilePendingRaidRewards().catch((error) => console.error("Ronald reward reconciliation failed", { code: error?.code || error?.message || "unknown" }));
  }, 5 * 60 * 1000);
  if (typeof pulseBootstrapTimer.unref === "function") pulseBootstrapTimer.unref();
  if (typeof pulseTimer.unref === "function") pulseTimer.unref();
  if (typeof rewardReconcileBootstrapTimer.unref === "function") rewardReconcileBootstrapTimer.unref();
  if (typeof rewardReconcileTimer.unref === "function") rewardReconcileTimer.unref();

  bot.onText(/^\/(?:raid|raaiiidd)(?:@\w+)?$/, async (msg) => {
    if (!(await settingEnabled(msg.chat.id))) return send(msg.chat.id, "⏸ Ronald Raider is switched off in /zedsettings.");
    try {
      const live = await activeCampaign(msg.chat.id);
      return send(msg.chat.id, campaignText(live), live ? keyboard(live) : undefined);
    } catch (error) {
      console.error("Ronald Raider load failed", { code: error?.code || error?.message || "unknown" });
      return send(msg.chat.id, "❌ Ronald tripped over his own boots loading this Raid. Try again in a moment.");
    }
  });

  bot.onText(/^\/raidpoints(?:@\w+)?$/i, async (msg) => {
    try {
      return send(msg.chat.id, rewardStatusText(await autoRewardStatus(msg.from.id)));
    } catch (error) {
      console.error("RaidPoints status failed", { code: error?.code || error?.message || "unknown" });
      return send(msg.chat.id, "❌ Ronald couldn't load the RaidPoints engine.");
    }
  });

  bot.onText(/^\/raid(?:@\w+)?\s+([\s\S]+)$/, async (msg, match) => {
    if (!(await permission(msg.from.id, "mission.create"))) return send(msg.chat.id, "⛔ Admin access required.");
    const parsed = parseRaidPayload(match && match[1]);
    if (!parsed.ok) return send(msg.chat.id, "❌ Use: /raid URL | likes | reposts | replies | views | LP | 24h\nShort form works too: /raid URL");
    try { return await createCampaign(msg, parsed, false); }
    catch (error) {
      console.error("Ronald Raider create failed", { code: error?.code || error?.message || "unknown" });
      return send(msg.chat.id, "❌ Ronald couldn't start that Raid.");
    }
  });

  bot.onText(/^\/next(?:@\w+)?(?:\s+([\s\S]+))?$/, async (msg, match) => {
    const payload = String(match && match[1] || "").trim();
    if (payload) {
      if (!(await permission(msg.from.id, "mission.create"))) return send(msg.chat.id, "⛔ Admin access required.");
      const parsed = parseRaidPayload(payload);
      if (!parsed.ok) return send(msg.chat.id, "❌ Use: /next URL | likes | reposts | replies | views | LP | 24h");
      try { return await createCampaign(msg, parsed, true); }
      catch (error) {
        console.error("Ronald Raider queue failed", { code: error?.code || error?.message || "unknown" });
        return send(msg.chat.id, "❌ Ronald couldn't add that Raid to the line-up.");
      }
    }
    try {
      const next = await queuedCampaign(msg.chat.id);
      return send(msg.chat.id, next ? `⏭ NEXT RAID IN LINE\n\n${campaignText(next)}` : "⏭ Ronald's line-up is empty.");
    } catch {
      return send(msg.chat.id, "❌ Ronald couldn't load the next Raid.");
    }
  });

  bot.onText(/^\/raidprogress(?:@\w+)?\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/, async (msg, match) => {
    if (!(await permission(msg.from.id, "mission.edit"))) return send(msg.chat.id, "⛔ Admin access required.");
    try {
      const current = await activeCampaign(msg.chat.id);
      if (!current) return send(msg.chat.id, "🤠 No live Raid to update.");
      const values = match.slice(1, 5).map(Number);
      const { error } = await supabase.from("raid_campaigns").update({
        likes_current: values[0],
        reposts_current: values[1],
        replies_current: values[2],
        views_current: values[3],
        updated_at: new Date().toISOString()
      }).eq("id", current.id);
      if (error) throw error;
      const updated = await campaignById(current.id);
      return send(msg.chat.id, campaignText(updated), keyboard(updated));
    } catch {
      return send(msg.chat.id, "❌ Ronald couldn't update those Raid counters.");
    }
  });

  bot.onText(/^\/stopraid(?:@\w+)?$/, async (msg) => {
    if (!(await permission(msg.from.id, "mission.end"))) return send(msg.chat.id, "⛔ Admin access required.");
    try {
      const current = await activeCampaign(msg.chat.id);
      if (!current) return send(msg.chat.id, "🤠 No live Raid to stop.");
      await clearPulse(current);
      await supabase.from("raid_campaigns").update({ status: "stopped", stopped_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", current.id);
      await supabase.from("missions").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", current.mission_id);
      return send(msg.chat.id, "🛑 Ronald stopped the Raid. Use /next to see what is lined up.");
    } catch {
      return send(msg.chat.id, "❌ Ronald couldn't stop that Raid.");
    }
  });

  bot.on("callback_query", async (query) => {
    const data = String(query?.data || "");
    if (!data.startsWith("ronald:") || !query.message) return;
    const chatId = query.message.chat.id;
    const actorId = query.from?.id;
    try {
      if (data === "ronald:lb") {
        await bot.answerCallbackQuery(query.id);
        const rows = await repository.getLeaderboard();
        const text = rows.slice(0, 10).map((row, index) => `${index + 1}. ${row.username ? "@" + row.username : row.first_name || "Legend"} — ${Number(row.points) || 0} LP`).join("\n");
        return send(chatId, `🏆 RONALD RAIDER LEADERBOARD\n\n${text || "No points yet."}`);
      }

      if (data === "ronald:next") {
        const allowed = await permission(actorId, "mission.create");
        if (!allowed) {
          const next = await queuedCampaign(chatId);
          await bot.answerCallbackQuery(query.id, { text: next ? "Next Raid is lined up." : "No next Raid yet.", show_alert: true });
          return;
        }
        const started = await startNext(chatId, actorId);
        await bot.answerCallbackQuery(query.id, { text: started ? "Next Raid started." : "No queued Raid." });
        if (started) return send(chatId, campaignText(started), keyboard(started));
        return;
      }

      const match = data.match(/^ronald:(done|refresh|stop):(\d+)$/);
      if (!match) return;
      const action = match[1];
      const campaign = await campaignById(match[2]);
      if (!campaign) return bot.answerCallbackQuery(query.id, { text: "Raid not found.", show_alert: true });

      if (action === "refresh") {
        await bot.answerCallbackQuery(query.id);
        return send(chatId, campaignText(campaign), keyboard(campaign));
      }

      if (action === "stop") {
        if (!(await permission(actorId, "mission.end"))) {
          return bot.answerCallbackQuery(query.id, { text: "Admin access required.", show_alert: true });
        }
        await clearPulse(campaign);
        await supabase.from("raid_campaigns").update({ status: "stopped", stopped_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", campaign.id);
        await supabase.from("missions").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", campaign.mission_id);
        await bot.answerCallbackQuery(query.id, { text: "Raid stopped." });
        return send(chatId, "🛑 Ronald stopped the Raid.");
      }

      const claim = await repository.submitMissionClaim({
        missionId: campaign.mission_id,
        telegramId: actorId,
        completionText: "Ronald Raider I RAIDED button",
        proofUrl: ""
      });
      if (claim.duplicate) {
        await bot.answerCallbackQuery(query.id, { text: "Already submitted." });
        return;
      }

      const award = await autoAwardRaid(claim.submission.id);
      if (["awarded","already_awarded"].includes(String(award?.outcome || ""))) {
        await bot.answerCallbackQuery(query.id, { text: `⚡ +${award.points_awarded} RaidPoints` });
        return send(chatId, [
          "⚡ RAIDPOINTS AUTO-AWARDED",
          "",
          `Raid #${campaign.id}`,
          `⭐ +${award.points_awarded} LP`,
          `🏆 New total: ${award.total_points} LP`,
          "",
          "No Admin approval needed."
        ].join("\n"));
      }

      if (["budget_deferred","deferred_auto"].includes(String(award?.outcome || ""))) {
        await bot.answerCallbackQuery(query.id, { text: "Weekly reward pool is full.", show_alert: true });
        return send(chatId, "🛡 Raid completion recorded. ZED + AUTO will retry the protected reward automatically. No routine Admin approval is required.");
      }

      await bot.answerCallbackQuery(query.id, { text: "Automatic check complete.", show_alert: true });
      return send(chatId, [
        "🛡 RAIDPOINTS SAFETY HOLD",
        "",
        `Submission #${claim.submission.id}`,
        `Reason: ${award?.review_reason || "automatic safety check"}`,
        "",
        "Normal completions auto-award. This result came from the automatic rules — not an Admin approval queue."
      ].join("\n"));
    } catch (error) {
      console.error("Ronald Raider callback failed", { code: error?.code || error?.message || "unknown" });
      try { await bot.answerCallbackQuery(query.id, { text: "Ronald hit an error.", show_alert: true }); } catch {}
    }
  });

  return {
    parseRaidPayload,
    activeCampaign,
    queuedCampaign,
    autoRewardStatus,
    autoAwardRaid,
    reconcilePendingRaidRewards,
    pulseActiveRaids
  };
}

module.exports = {
  DEFAULTS,
  RAID_PULSE_MIN_GAP_SECONDS,
  RAID_PULSE_SCAN_INTERVAL_MS,
  campaignText,
  raidPulseText,
  detectPlatform,
  extractXStatusId,
  raidOpenUrl,
  parseRaidPayload,
  progressLine,
  registerRonaldRaider
};
