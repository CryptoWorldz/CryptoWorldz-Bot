const { createRequestLimiter, validateTelegramInitData } = require("./miniapp-auth");

const PERIODS = Object.freeze(["1D", "1W", "1M"]);
const PUMP_SQUAD_URL = "https://join.pump.fun/HSag/rwtn4stv";
const PUBLIC_SQUADS_URL = "https://launchpad.cryptoworldz.xyz/squads/";

function normalizePeriod(value) {
  const period = String(value || "1M").trim().toUpperCase();
  return PERIODS.includes(period) ? period : "1M";
}

function periodStart(period, now = new Date()) {
  const ms = period === "1D" ? 86400000 : period === "1W" ? 7 * 86400000 : 30 * 86400000;
  return new Date(now.getTime() - ms);
}

function slugifySquad(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function cleanName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 48);
}

function publicDisplay(user) {
  const username = String(user?.username || "").trim().replace(/^@/, "");
  const firstName = String(user?.first_name || "").trim();
  return username ? `@${username}` : firstName || "Worldz Legend";
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function registerWorldzSquads({ app, bot, config, supabase }) {
  if (!supabase) throw new Error("worldz_squads_supabase_required");
  const allowMiniRequest = createRequestLimiter({ maxEvents: 80, intervalMs: 60000 });
  const maxAgeSeconds = Math.min(86400, Math.max(300, Number(process.env.MINIAPP_INIT_DATA_MAX_AGE_SECONDS) || 86400));

  function publicCors(req, res) {
    const origin = String(req.get("origin") || "");
    if (["https://launchpad.cryptoworldz.xyz", "https://cryptoworldz.xyz"].includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Cache-Control", "no-store");
  }

  function authenticate(req, res, next) {
    const result = validateTelegramInitData(req.get("x-telegram-init-data") || "", config.botToken, { maxAgeSeconds });
    if (!result.ok) return res.status(401).json({ ok: false, error: result.error });
    if (!allowMiniRequest(`${result.user.id}:${req.ip}`)) return res.status(429).json({ ok: false, error: "rate_limited" });
    req.telegramUser = result.user;
    return next();
  }

  async function registeredUser(telegramId) {
    const { data, error } = await supabase
      .from("users")
      .select("telegram_id,username,first_name,points")
      .eq("telegram_id", Number(telegramId))
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function activeMembership(telegramId) {
    const { data, error } = await supabase
      .from("worldz_squad_members")
      .select("squad_id,telegram_id,role,active,joined_at")
      .eq("telegram_id", Number(telegramId))
      .eq("active", true)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function buildLeaderboard(periodInput = "1M") {
    const period = normalizePeriod(periodInput);
    const start = periodStart(period).toISOString();

    const { data: squads, error: squadError } = await supabase
      .from("worldz_squads")
      .select("id,slug,name,description,avatar_url,banner_url,join_mode,status,created_at")
      .eq("status", "active")
      .order("created_at", { ascending: true });
    if (squadError) throw squadError;
    if (!squads?.length) return { period, squads: [] };

    const squadIds = squads.map((row) => row.id);
    const { data: memberships, error: memberError } = await supabase
      .from("worldz_squad_members")
      .select("squad_id,telegram_id,role,joined_at")
      .in("squad_id", squadIds)
      .eq("active", true);
    if (memberError) throw memberError;

    const telegramIds = [...new Set((memberships || []).map((row) => Number(row.telegram_id)).filter(Number.isSafeInteger))];
    const empty = { data: [], error: null };
    const [usersResult, rewardsResult, raidsResult, shillsResult, performanceResult] = await Promise.all([
      telegramIds.length
        ? supabase.from("users").select("telegram_id,username,first_name,points").in("telegram_id", telegramIds)
        : Promise.resolve(empty),
      telegramIds.length
        ? supabase.from("rewards").select("telegram_id,points,created_at").in("telegram_id", telegramIds).gte("created_at", start)
        : Promise.resolve(empty),
      telegramIds.length
        ? supabase.from("mission_submissions").select("telegram_id,status,submitted_at").in("telegram_id", telegramIds).eq("status", "approved").gte("submitted_at", start)
        : Promise.resolve(empty),
      telegramIds.length
        ? supabase.from("social_shill_submissions").select("telegram_id,status,created_at").in("telegram_id", telegramIds).eq("status", "approved").gte("created_at", start)
        : Promise.resolve(empty),
      telegramIds.length
        ? supabase.from("worldz_squad_performance").select("squad_id,telegram_id,period,pnl_usd,banked_usd,volume_usd,trades,source,observed_at,updated_at").in("squad_id", squadIds).eq("period", period)
        : Promise.resolve(empty)
    ]);
    for (const result of [usersResult, rewardsResult, raidsResult, shillsResult, performanceResult]) {
      if (result.error) throw result.error;
    }

    const users = new Map((usersResult.data || []).map((row) => [Number(row.telegram_id), row]));
    const points = new Map();
    for (const row of rewardsResult.data || []) {
      const id = Number(row.telegram_id);
      points.set(id, (points.get(id) || 0) + Math.max(0, number(row.points)));
    }
    const raids = new Map();
    for (const row of raidsResult.data || []) {
      const id = Number(row.telegram_id);
      raids.set(id, (raids.get(id) || 0) + 1);
    }
    const shills = new Map();
    for (const row of shillsResult.data || []) {
      const id = Number(row.telegram_id);
      shills.set(id, (shills.get(id) || 0) + 1);
    }
    const performance = new Map();
    for (const row of performanceResult.data || []) {
      performance.set(`${row.squad_id}:${Number(row.telegram_id)}`, row);
    }

    const membersBySquad = new Map();
    for (const membership of memberships || []) {
      const list = membersBySquad.get(membership.squad_id) || [];
      const id = Number(membership.telegram_id);
      const perf = performance.get(`${membership.squad_id}:${id}`) || {};
      const user = users.get(id) || {};
      list.push({
        display_name: publicDisplay(user),
        role: membership.role,
        joined_at: membership.joined_at,
        points: points.get(id) || 0,
        lifetime_points: Math.max(0, number(user.points)),
        raids: raids.get(id) || 0,
        shills: shills.get(id) || 0,
        pnl_usd: number(perf.pnl_usd),
        banked_usd: number(perf.banked_usd),
        volume_usd: number(perf.volume_usd),
        trades: Math.max(0, Math.trunc(number(perf.trades))),
        performance_source: perf.source || null,
        performance_observed_at: perf.observed_at || null
      });
      membersBySquad.set(membership.squad_id, list);
    }

    const rows = squads.map((squad) => {
      const members = membersBySquad.get(squad.id) || [];
      members.sort((a, b) => b.pnl_usd - a.pnl_usd || b.points - a.points || b.raids - a.raids);
      const total = members.reduce((acc, member) => {
        acc.points += member.points;
        acc.raids += member.raids;
        acc.shills += member.shills;
        acc.pnl_usd += member.pnl_usd;
        acc.banked_usd += member.banked_usd;
        acc.volume_usd += member.volume_usd;
        acc.trades += member.trades;
        return acc;
      }, { points: 0, raids: 0, shills: 0, pnl_usd: 0, banked_usd: 0, volume_usd: 0, trades: 0 });
      return {
        slug: squad.slug,
        name: squad.name,
        description: squad.description,
        avatar_url: squad.avatar_url,
        banner_url: squad.banner_url,
        join_mode: squad.join_mode,
        members: members.length,
        ...total,
        member_rows: members
      };
    });

    rows.sort((a, b) => b.pnl_usd - a.pnl_usd || b.banked_usd - a.banked_usd || b.points - a.points || b.members - a.members);
    return { period, squads: rows };
  }

  async function createSquad(telegramId, input = {}) {
    const user = await registeredUser(telegramId);
    if (!user) return { ok: false, status: 403, error: "register_first" };
    if (await activeMembership(telegramId)) return { ok: false, status: 409, error: "already_in_squad" };

    const name = cleanName(input.name);
    const slug = slugifySquad(input.slug || name);
    if (name.length < 3 || slug.length < 3) return { ok: false, status: 400, error: "invalid_squad_name" };

    const { data: squad, error } = await supabase
      .from("worldz_squads")
      .insert({
        name,
        slug,
        description: String(input.description || "").trim().slice(0, 240),
        owner_telegram_id: Number(telegramId),
        join_mode: "open",
        status: "active"
      })
      .select("id,slug,name,description,join_mode,status")
      .single();
    if (error) {
      if (error.code === "23505") return { ok: false, status: 409, error: "squad_slug_taken" };
      throw error;
    }

    const { error: memberError } = await supabase.from("worldz_squad_members").insert({
      squad_id: squad.id,
      telegram_id: Number(telegramId),
      role: "owner",
      active: true
    });
    if (memberError) {
      await supabase.from("worldz_squads").delete().eq("id", squad.id);
      throw memberError;
    }
    return { ok: true, squad };
  }

  async function joinSquad(telegramId, slugInput) {
    const user = await registeredUser(telegramId);
    if (!user) return { ok: false, status: 403, error: "register_first" };

    const slug = slugifySquad(slugInput);
    const { data: squad, error } = await supabase
      .from("worldz_squads")
      .select("id,slug,name,join_mode,status")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    if (!squad) return { ok: false, status: 404, error: "squad_not_found" };
    if (squad.join_mode !== "open") return { ok: false, status: 403, error: "squad_closed" };

    const current = await activeMembership(telegramId);
    if (current?.squad_id === squad.id) return { ok: true, squad, already_member: true };
    if (current) return { ok: false, status: 409, error: "already_in_squad" };

    const { error: joinError } = await supabase.from("worldz_squad_members").upsert({
      squad_id: squad.id,
      telegram_id: Number(telegramId),
      role: "member",
      active: true,
      left_at: null,
      updated_at: new Date().toISOString()
    }, { onConflict: "squad_id,telegram_id" });
    if (joinError) throw joinError;
    return { ok: true, squad };
  }

  async function leaveSquad(telegramId) {
    const current = await activeMembership(telegramId);
    if (!current) return { ok: false, status: 404, error: "not_in_squad" };
    if (current.role === "owner") return { ok: false, status: 409, error: "owner_cannot_leave" };
    const { error } = await supabase
      .from("worldz_squad_members")
      .update({ active: false, left_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("squad_id", current.squad_id)
      .eq("telegram_id", Number(telegramId))
      .eq("active", true);
    if (error) throw error;
    return { ok: true };
  }

  async function mySquad(telegramId, period) {
    const current = await activeMembership(telegramId);
    const board = await buildLeaderboard(period);
    if (!current) return { period: board.period, squad: null, discover: board.squads.slice(0, 20) };
    const { data: squadRow, error } = await supabase
      .from("worldz_squads")
      .select("slug")
      .eq("id", current.squad_id)
      .maybeSingle();
    if (error) throw error;
    const squad = board.squads.find((row) => row.slug === squadRow?.slug) || null;
    return { period: board.period, squad: squad ? { ...squad, my_role: current.role } : null, discover: board.squads.slice(0, 20) };
  }

  if (app) {
    app.get("/api/public/squads", async (req, res) => {
      publicCors(req, res);
      try {
        const board = await buildLeaderboard(req.query.period);
        return res.json({
          ok: true,
          product: "Worldz Squads™",
          ...board,
          external: { pump_squad: { name: "THECHAOS", url: PUMP_SQUAD_URL } }
        });
      } catch (error) {
        console.error("Worldz Squads public leaderboard failed", { name: error?.name || "Error" });
        return res.status(500).json({ ok: false, error: "squads_unavailable" });
      }
    });

    app.get("/api/public/squads/:slug", async (req, res) => {
      publicCors(req, res);
      try {
        const board = await buildLeaderboard(req.query.period);
        const slug = slugifySquad(req.params.slug);
        const squad = board.squads.find((row) => row.slug === slug);
        if (!squad) return res.status(404).json({ ok: false, error: "squad_not_found" });
        return res.json({ ok: true, period: board.period, squad });
      } catch {
        return res.status(500).json({ ok: false, error: "squad_unavailable" });
      }
    });

    app.get("/api/mini/squads/me", authenticate, async (req, res) => {
      try {
        const data = await mySquad(req.telegramUser.id, req.query.period);
        return res.json({ ok: true, ...data, share_base_url: PUBLIC_SQUADS_URL });
      } catch {
        return res.status(500).json({ ok: false, error: "squads_unavailable" });
      }
    });

    app.post("/api/mini/squads", authenticate, async (req, res) => {
      try {
        const result = await createSquad(req.telegramUser.id, req.body || {});
        return res.status(result.status || 201).json(result);
      } catch (error) {
        console.error("Worldz Squad create failed", { name: error?.name || "Error" });
        return res.status(500).json({ ok: false, error: "squad_create_failed" });
      }
    });

    app.post("/api/mini/squads/:slug/join", authenticate, async (req, res) => {
      try {
        const result = await joinSquad(req.telegramUser.id, req.params.slug);
        return res.status(result.status || 200).json(result);
      } catch {
        return res.status(500).json({ ok: false, error: "squad_join_failed" });
      }
    });

    app.post("/api/mini/squads/leave", authenticate, async (req, res) => {
      try {
        const result = await leaveSquad(req.telegramUser.id);
        return res.status(result.status || 200).json(result);
      } catch {
        return res.status(500).json({ ok: false, error: "squad_leave_failed" });
      }
    });
  }

  if (bot) {
    const send = (chatId, text, options) => bot.sendMessage(chatId, text, options);

    bot.onText(/^\/squads(?:@\w+)?(?:\s+(1d|1w|1m))?$/i, async (msg, match) => {
      try {
        const board = await buildLeaderboard(match?.[1] || "1M");
        const rows = board.squads.slice(0, 10).map((row, index) =>
          `${index + 1}. ${row.name} — PNL $${row.pnl_usd.toFixed(2)} • ${row.points} LP • ${row.members} members`
        );
        return send(msg.chat.id, [
          `🌐 WORLDZ SQUADS • ${board.period}`,
          "",
          rows.join("\n") || "No squads yet.",
          "",
          `Open: ${PUBLIC_SQUADS_URL}`,
          "Create: /createsquad NAME",
          "Join: /joinsquad SLUG"
        ].join("\n"));
      } catch {
        return send(msg.chat.id, "❌ Worldz Squads is temporarily unavailable.");
      }
    });

    bot.onText(/^\/squad(?:@\w+)?$/i, async (msg) => {
      try {
        const data = await mySquad(msg.from.id, "1M");
        if (!data.squad) return send(msg.chat.id, "🌐 You are not in a Worldz Squad yet.\n\nUse /squads to browse, /joinsquad SLUG to join, or /createsquad NAME to start one.");
        const row = data.squad;
        return send(msg.chat.id, [
          `🌐 ${row.name}`,
          "",
          `👥 Members: ${row.members}`,
          `💹 30D Squad PNL: $${row.pnl_usd.toFixed(2)}`,
          `🏦 Banked: $${row.banked_usd.toFixed(2)}`,
          `⭐ Activity: ${row.points} LP • ${row.raids} Raids • ${row.shills} Shills`,
          `📈 Volume: $${row.volume_usd.toFixed(2)} • ${row.trades} trades`,
          "",
          `Share: ${PUBLIC_SQUADS_URL}?s=${encodeURIComponent(row.slug)}&period=1M`
        ].join("\n"));
      } catch {
        return send(msg.chat.id, "❌ I couldn't load your Worldz Squad.");
      }
    });

    bot.onText(/^\/createsquad(?:@\w+)?(?:\s+([\s\S]+))?$/i, async (msg, match) => {
      const name = cleanName(match?.[1]);
      if (!name) return send(msg.chat.id, "Use: /createsquad YOUR SQUAD NAME");
      try {
        const result = await createSquad(msg.from.id, { name });
        if (!result.ok) return send(msg.chat.id, `⚠️ Squad not created: ${result.error}.`);
        return send(msg.chat.id, `✅ Worldz Squad created: ${result.squad.name}\n\nSlug: ${result.squad.slug}\nShare: ${PUBLIC_SQUADS_URL}?s=${result.squad.slug}`);
      } catch {
        return send(msg.chat.id, "❌ I couldn't create that Worldz Squad.");
      }
    });

    bot.onText(/^\/joinsquad(?:@\w+)?\s+([a-z0-9-]{3,32})$/i, async (msg, match) => {
      try {
        const result = await joinSquad(msg.from.id, match[1]);
        if (!result.ok) return send(msg.chat.id, `⚠️ Squad not joined: ${result.error}.`);
        return send(msg.chat.id, `✅ Joined ${result.squad.name}.\n\nUse /squad to view your Squad card and stats.`);
      } catch {
        return send(msg.chat.id, "❌ I couldn't join that Worldz Squad.");
      }
    });

    bot.onText(/^\/leavesquad(?:@\w+)?$/i, async (msg) => {
      try {
        const result = await leaveSquad(msg.from.id);
        if (!result.ok) return send(msg.chat.id, result.error === "owner_cannot_leave" ? "⚠️ Squad owners cannot leave while they own the Squad." : `⚠️ Squad not left: ${result.error}.`);
        return send(msg.chat.id, "✅ You left your Worldz Squad.");
      } catch {
        return send(msg.chat.id, "❌ I couldn't update your Squad membership.");
      }
    });
  }

  return { buildLeaderboard, createSquad, joinSquad, leaveSquad, mySquad };
}

module.exports = {
  PERIODS,
  PUMP_SQUAD_URL,
  PUBLIC_SQUADS_URL,
  cleanName,
  normalizePeriod,
  periodStart,
  registerWorldzSquads,
  slugifySquad
};
