const { createRequestLimiter, validateTelegramInitData } = require("./miniapp-auth");
const { getRank } = require("./core");

function extractText(payload) {
  const chunks = [];
  for (const item of payload && payload.output || []) {
    if (!item || item.type !== "message") continue;
    for (const part of item.content || []) if (part && part.type === "output_text" && part.text) chunks.push(part.text);
  }
  return chunks.join("\n").trim();
}
function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-4).flatMap((row) => {
    const role = row?.role === "assistant" ? "assistant" : row?.role === "user" ? "user" : null;
    const content = String(row?.content || "").trim().slice(0, 900);
    return role && content ? [{ role, content }] : [];
  });
}
function safeMission(mission) {
  return {
    id: mission.id,
    title: mission.title,
    platform: mission.platform,
    reward_points: Number(mission.reward_points) || 0,
    description: String(mission.description || "").slice(0, 300),
    target_url: mission.target_url || mission.link || null
  };
}

function registerZedGuide({ app, repository, config, supabase }) {
  const openaiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const model = String(process.env.ONEWORLDZ_OPENAI_MODEL || "gpt-5.6-luna").trim();
  const allow = createRequestLimiter({ maxEvents: 12, intervalMs: 10 * 60 * 1000 });

  function authenticate(req, res, next) {
    const result = validateTelegramInitData(req.get("x-telegram-init-data") || "", config.botToken);
    if (!result.ok) return res.status(401).json({ ok: false, error: result.error });
    if (!allow(`${result.user.id}:${req.ip}`)) return res.status(429).json({ ok: false, error: "rate_limited" });
    req.telegramUser = result.user;
    next();
  }

  app.post("/api/mini/zed/chat", authenticate, async (req, res) => {
    try {
      const telegramId = Number(req.telegramUser.id);
      const message = String(req.body?.message || "").trim().slice(0, 1200);
      if (!message) return res.status(400).json({ ok: false, error: "message_required" });
      const [profile, missions, referralsResult, heroResult, creatorResult] = await Promise.all([
        repository.getMemberDetails(telegramId),
        repository.listActiveMissions(),
        supabase.from("member_referrals").select("id,status,qualifies_at,newcomer_points_awarded,inviter_telegram_id").eq("referred_telegram_id", telegramId).order("joined_at", { ascending: false }).limit(1),
        supabase.from("real_world_hero_applications").select("id,status,review_note,created_at").eq("telegram_id", telegramId).order("created_at", { ascending: false }).limit(3),
        supabase.from("raaiiidd_creator_requests").select("id,status,mission_id,created_at").eq("creator_telegram_id", telegramId).order("created_at", { ascending: false }).limit(3)
      ]);
      if (referralsResult.error) throw referralsResult.error;
      if (heroResult.error) throw heroResult.error;
      if (creatorResult.error) throw creatorResult.error;
      const user = profile?.user || null;
      const context = {
        signed_in_telegram_id: telegramId,
        registered: Boolean(profile),
        profile: user ? {
          first_name: user.first_name || req.telegramUser.first_name || "Legend",
          username: user.username || "",
          points: Number(user.points) || 0,
          rank: getRank(Number(user.points) || 0),
          verified_raaiiidds: Math.max(Number(user.raids) || 0, Number(user.raids_completed) || 0),
          pending_submissions: Number(profile.pending) || 0
        } : null,
        active_missions: missions.slice(0, 12).map(safeMission),
        inbound_referral: (referralsResult.data || [])[0] || null,
        recent_hero_reviews: heroResult.data || [],
        recent_creator_requests: creatorResult.data || []
      };
      if (!openaiKey) return res.json({ ok: true, text: "ZED is connected to your Command Centre data. Open Missions, Creator, Heroes or Profile using the buttons below.", context, suggestions: ["missions","creator","heroes","profile"] });

      const moderation = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: "omni-moderation-latest", input: message }),
        signal: AbortSignal.timeout(15000)
      });
      const modPayload = await moderation.json().catch(() => ({}));
      if (!moderation.ok) return res.status(503).json({ ok: false, error: "moderation_unavailable" });
      if (modPayload?.results?.[0]?.flagged) return res.status(400).json({ ok: false, error: "message_not_supported" });

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model,
          store: false,
          max_output_tokens: 420,
          instructions: [
            "You are ZED inside the authenticated CryptoWorldz Command Centre MiniApp.",
            "Use only the supplied participant context for personal claims. Never invent points, missions, referrals, approvals, donations or partnerships.",
            "Help the signed-in Legend participate: missions, Creator, referrals, Heroes, learning and real-world action.",
            "Do not request passwords, bank details, card details, API keys, seed phrases or private keys.",
            "Do not approve content, missions or Hero evidence yourself; human Admin review controls approval.",
            "When useful, tell the user which MiniApp section to open: Missions, Creator, Heroes or Profile.",
            `SIGNED PARTICIPANT CONTEXT JSON: ${JSON.stringify(context)}`
          ].join(" "),
          input: [...cleanHistory(req.body?.history), { role: "user", content: message }]
        }),
        signal: AbortSignal.timeout(30000)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(503).json({ ok: false, error: "zed_guide_unavailable", context });
      return res.json({ ok: true, text: extractText(payload) || "Open Missions, Creator, Heroes or Profile and I can guide you from there.", context });
    } catch (error) {
      console.error("Authenticated ZED guide failed", { name: error?.name || "Error" });
      return res.status(500).json({ ok: false, error: "zed_guide_failed" });
    }
  });
}

module.exports = { registerZedGuide, safeMission };
