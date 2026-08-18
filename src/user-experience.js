const crypto = require("node:crypto");
const { createRequestLimiter, validateTelegramInitData } = require("./miniapp-auth");

const STEPPER_TELEGRAM_ID = String(process.env.STEPPER_TELEGRAM_ID || "7615025841");
const MINIAPP_URL = "https://cryptobotz.cryptoworldz.xyz/miniapp/";
const HEROES_URL = "https://oneworldz.com/heroes/";
const DONATE_REAGAN_URL = "https://donateworldz.com/reagan-children/";
const DRAFT_BUCKET = "raaiiidd-drafts";

function validHttps(value) {
  try { return new URL(String(value || "")).protocol === "https:"; }
  catch { return false; }
}
function cleanText(value, max) { return String(value || "").trim().slice(0, max); }
function slugify(value) {
  return cleanText(value, 120).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "hero";
}
function inferPlatform(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "x.com" || host.endsWith(".x.com") || host === "twitter.com" || host.endsWith(".twitter.com")) return "X";
    if (host.includes("facebook.com")) return "Facebook";
    if (host.includes("tiktok.com")) return "TikTok";
    if (host.includes("youtube.com") || host === "youtu.be") return "YouTube";
  } catch {}
  return "Community";
}
function extractResponseText(payload) {
  const out = [];
  for (const item of payload && payload.output || []) {
    if (!item || item.type !== "message") continue;
    for (const part of item.content || []) if (part && part.type === "output_text" && part.text) out.push(part.text);
  }
  return out.join("\n").trim();
}
async function moderate(openaiKey, text) {
  if (!openaiKey) return;
  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({ model: "omni-moderation-latest", input: text }),
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("moderation_failed");
  if (payload?.results?.[0]?.flagged) throw new Error("content_not_supported");
}
async function generatePostCopy(openaiKey, idea) {
  const fallback = {
    title: cleanText(idea.split(/[.!?\n]/)[0] || "Community Raaiiidd", 90),
    body: cleanText(idea, 1600)
  };
  if (!openaiKey) return fallback;
  await moderate(openaiKey, idea);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: String(process.env.ONEWORLDZ_OPENAI_MODEL || "gpt-4o-mini"),
      store: false,
      max_output_tokens: 420,
      instructions: [
        "You are ZED helping a CryptoWorldz Legend prepare a proposed Raaiiidd post for human admin review.",
        "Write energetic but factual social copy. Do not invent donations, partnerships, results, endorsements or live deployment claims.",
        "Do not request money, private keys, seed phrases, passwords or bank credentials.",
        "Return exactly two sections: TITLE: one short title, then POST: the complete copy. No markdown headings."
      ].join(" "),
      input: idea
    }),
    signal: AbortSignal.timeout(30000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return fallback;
  const text = extractResponseText(payload);
  const title = cleanText((/^TITLE:\s*(.+)$/mi.exec(text) || [])[1] || fallback.title, 90);
  const body = cleanText((/POST:\s*([\s\S]+)$/mi.exec(text) || [])[1] || text || fallback.body, 1600);
  return { title, body };
}
async function generateImage(openaiKey, idea) {
  if (!openaiKey) throw new Error("openai_api_not_configured");
  await moderate(openaiKey, idea);
  const prompt = [
    "Create a square social-media Raaiiidd artwork for the OneWorldz / CryptoWorldz ecosystem.",
    "Visual language: cinematic purposeful digital artwork, deep space depth, premium chrome highlights, electric purple and blue energy, strong readable focal composition, hopeful people-first tone.",
    "Never fabricate a real person's likeness, endorsement, donation result, government seal, partner logo or token price.",
    "Do not include wallet addresses, QR codes, payment claims or tiny unreadable text.",
    `Campaign idea: ${idea}`
  ].join(" ");
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: String(process.env.ONEWORLDZ_IMAGE_MODEL || "gpt-image-1-mini"),
      prompt,
      size: "1024x1024",
      quality: "low",
      output_format: "webp"
    }),
    signal: AbortSignal.timeout(90000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("image_generation_failed");
  const b64 = payload?.data?.[0]?.b64_json;
  if (!b64) throw new Error("image_generation_empty");
  return Buffer.from(b64, "base64");
}

function registerUserExperienceSystem({ app, bot, repository, config, supabase }) {
  const allowAuth = createRequestLimiter({ maxEvents: 120, intervalMs: 60000 });
  const allowParticipant = createRequestLimiter({ maxEvents: 80, intervalMs: 60000 });
  const allowImages = createRequestLimiter({ maxEvents: 2, intervalMs: 60 * 60 * 1000 });
  const openaiKey = String(process.env.OPENAI_API_KEY || "").trim();

  function authenticate(req, res, next) {
    if (!allowAuth(req.ip)) return res.status(429).json({ ok: false, error: "rate_limited" });
    const result = validateTelegramInitData(req.get("x-telegram-init-data") || "", config.botToken);
    if (!result.ok) return res.status(401).json({ ok: false, error: result.error });
    if (!allowParticipant(`${result.user.id}:${req.ip}`)) return res.status(429).json({ ok: false, error: "rate_limited" });
    req.telegramUser = result.user;
    next();
  }
  async function registered(telegramId) { return Boolean(await repository.getUser(telegramId)); }
  async function workspace() {
    const { data, error } = await supabase.from("grace_workspaces").select("id").eq("slug", String(process.env.GRACE_WORKSPACE_SLUG || "cryptoworldz")).eq("status", "active").single();
    if (error) throw error;
    return data;
  }
  async function signImage(path, seconds = 3600) {
    if (!path) return null;
    const { data, error } = await supabase.storage.from(DRAFT_BUCKET).createSignedUrl(path, seconds);
    if (error) return null;
    return data?.signedUrl || null;
  }
  async function creatorRows(query) {
    const { data, error } = await query.select("id,grace_post_id,creator_telegram_id,desired_reward_points,target_url,status,mission_id,review_note,reviewed_by,reviewed_at,created_at,grace_posts(id,title,body,link_url,media,status)").order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    const rows = [];
    for (const row of data || []) {
      const post = row.grace_posts || {};
      const imagePath = post.media && post.media.storage_path;
      rows.push({ ...row, image_url: await signImage(imagePath), image_path: imagePath || null });
    }
    return rows;
  }

  app.get("/api/mini/referral-progress", authenticate, async (req, res) => {
    try {
      const telegramId = Number(req.telegramUser.id);
      const [profile, inboundResult, outgoingResult] = await Promise.all([
        repository.getMemberDetails(telegramId),
        supabase.from("member_referrals").select("id,inviter_telegram_id,status,joined_at,qualifies_at,qualified_at,newcomer_points_awarded,rejection_reason").eq("referred_telegram_id", telegramId).order("joined_at", { ascending: false }).limit(1),
        supabase.from("member_referrals").select("id,status,inviter_points_awarded").eq("inviter_telegram_id", telegramId)
      ]);
      if (inboundResult.error) throw inboundResult.error;
      if (outgoingResult.error) throw outgoingResult.error;
      const inbound = (inboundResult.data || [])[0] || null;
      let boosted = false;
      if (inbound) {
        const { data } = await supabase.from("shill_boosts").select("id").eq("referral_id", inbound.id).limit(1);
        boosted = Boolean(data && data.length);
      }
      const outgoing = outgoingResult.data || [];
      return res.json({
        ok: true,
        referral_recognised: Boolean(inbound),
        inbound,
        registration_complete: Boolean(profile),
        first_raaiiidd_complete: Boolean(profile && Math.max(Number(profile.user?.raids) || 0, Number(profile.user?.raids_completed) || 0) > 0),
        shill_boost_awarded: boosted,
        outgoing: {
          recorded: outgoing.length,
          qualified: outgoing.filter((x) => x.status === "qualified").length,
          pending: outgoing.filter((x) => x.status === "pending").length,
          points_awarded: outgoing.reduce((sum, x) => sum + (Number(x.inviter_points_awarded) || 0), 0)
        }
      });
    } catch (error) {
      console.error("Referral experience load failed", { name: error?.name || "Error" });
      return res.status(500).json({ ok: false, error: "referral_progress_failed" });
    }
  });

  app.post("/api/mini/creator/draft", authenticate, async (req, res) => {
    try {
      if (!await registered(req.telegramUser.id)) return res.status(403).json({ ok: false, error: "registration_required" });
      const idea = cleanText(req.body?.idea, 1200);
      if (idea.length < 10) return res.status(400).json({ ok: false, error: "idea_required" });
      const draft = await generatePostCopy(openaiKey, idea);
      return res.json({ ok: true, draft, approval_required: true, auto_publish: false });
    } catch (error) {
      return res.status(400).json({ ok: false, error: String(error?.message || "draft_failed") });
    }
  });

  app.post("/api/mini/creator/image", authenticate, async (req, res) => {
    try {
      if (!await registered(req.telegramUser.id)) return res.status(403).json({ ok: false, error: "registration_required" });
      if (!allowImages(String(req.telegramUser.id))) return res.status(429).json({ ok: false, error: "image_hourly_limit_reached" });
      const idea = cleanText(req.body?.idea, 1000);
      if (idea.length < 10) return res.status(400).json({ ok: false, error: "idea_required" });
      const image = await generateImage(openaiKey, idea);
      const objectPath = `${req.telegramUser.id}/${Date.now()}-${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from(DRAFT_BUCKET).upload(objectPath, image, { contentType: "image/webp", cacheControl: "3600", upsert: false });
      if (error) throw error;
      return res.status(201).json({ ok: true, image_path: objectPath, image_url: await signImage(objectPath), approval_required: true });
    } catch (error) {
      console.error("Raaiiidd image generation failed", { name: error?.name || "Error" });
      return res.status(400).json({ ok: false, error: String(error?.message || "image_generation_failed") });
    }
  });

  app.post("/api/mini/creator/submit", authenticate, async (req, res) => {
    try {
      const telegramId = Number(req.telegramUser.id);
      if (!await registered(telegramId)) return res.status(403).json({ ok: false, error: "registration_required" });
      const title = cleanText(req.body?.title, 90);
      const body = cleanText(req.body?.body, 1800);
      const imagePath = cleanText(req.body?.image_path, 500);
      const targetUrl = cleanText(req.body?.target_url, 1000);
      const reward = Math.max(0, Math.min(Number(req.body?.reward_points) || 10, 100));
      if (title.length < 3 || body.length < 10) return res.status(400).json({ ok: false, error: "draft_required" });
      if (targetUrl && !validHttps(targetUrl)) return res.status(400).json({ ok: false, error: "invalid_target_url" });
      if (imagePath && !imagePath.startsWith(`${telegramId}/`)) return res.status(403).json({ ok: false, error: "image_owner_mismatch" });
      const ws = await workspace();
      const { data: post, error: postError } = await supabase.from("grace_posts").insert({
        workspace_id: ws.id,
        title,
        campaign: "member_raaiiidd_creator",
        body,
        platform_overrides: {},
        media: imagePath ? { storage_bucket: DRAFT_BUCKET, storage_path: imagePath, generated_for_review: true, creator_telegram_id: telegramId } : { generated_for_review: false, creator_telegram_id: telegramId },
        link_url: targetUrl || null,
        status: "pending_approval",
        created_by: telegramId
      }).select("id,title,status").single();
      if (postError) throw postError;
      const { data: request, error: requestError } = await supabase.from("raaiiidd_creator_requests").insert({
        grace_post_id: post.id,
        creator_telegram_id: telegramId,
        desired_reward_points: reward,
        target_url: targetUrl || null,
        status: "pending"
      }).select("id,status,created_at").single();
      if (requestError) throw requestError;
      await bot.sendMessage(STEPPER_TELEGRAM_ID, `🛡️ New Raaiiidd Creator Review\n\nRequest #${request.id}\nCreator: ${telegramId}\nTitle: ${title}\n\nApproval is required before publication or mission activation.`, { reply_markup: { inline_keyboard: [[{ text: "Open Review Queue", web_app: { url: `${MINIAPP_URL}#admin-review` } }]] } }).catch(() => undefined);
      return res.status(201).json({ ok: true, request, post, approval_required: true, auto_publish: false });
    } catch (error) {
      console.error("Raaiiidd creator submission failed", { name: error?.name || "Error" });
      return res.status(500).json({ ok: false, error: "creator_submission_failed" });
    }
  });

  app.get("/api/mini/creator/mine", authenticate, async (req, res) => {
    try { return res.json({ ok: true, requests: await creatorRows(supabase.from("raaiiidd_creator_requests").eq("creator_telegram_id", Number(req.telegramUser.id))) }); }
    catch { return res.status(500).json({ ok: false, error: "creator_history_failed" }); }
  });

  app.get("/api/mini/admin/creator", authenticate, async (req, res) => {
    try {
      if (!await repository.hasPermission(req.telegramUser.id, "mission.create", config.adminTelegramIds, config.ownerTelegramId)) return res.status(403).json({ ok: false, error: "admin_required" });
      return res.json({ ok: true, requests: await creatorRows(supabase.from("raaiiidd_creator_requests").eq("status", "pending")) });
    } catch { return res.status(500).json({ ok: false, error: "creator_review_failed" }); }
  });

  app.post("/api/mini/admin/creator/:id/approve", authenticate, async (req, res) => {
    try {
      const reviewer = Number(req.telegramUser.id);
      if (!await repository.hasPermission(reviewer, "mission.create", config.adminTelegramIds, config.ownerTelegramId)) return res.status(403).json({ ok: false, error: "admin_required" });
      const id = Number(req.params.id);
      const { data: request, error } = await supabase.from("raaiiidd_creator_requests").select("*,grace_posts(*)").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!request) return res.status(404).json({ ok: false, error: "not_found" });
      if (request.status !== "pending") return res.status(409).json({ ok: false, error: "already_reviewed" });
      const now = new Date().toISOString();
      const post = request.grace_posts;
      await supabase.from("grace_posts").update({ status: "approved", approved_by: reviewer, approved_at: now, updated_at: now }).eq("id", post.id);
      let mission = null;
      if (request.target_url && validHttps(request.target_url)) {
        mission = await repository.createMission({
          title: cleanText(post.title, 140),
          platform: inferPlatform(request.target_url),
          target_url: request.target_url,
          reward_points: request.desired_reward_points,
          status: "active",
          description: cleanText(post.body, 1200),
          instructions: "Open the approved Raaiiidd. Complete the requested genuine action. Submit DONE with an optional HTTPS proof link for Admin review.",
          link: request.target_url,
          starts_at: now,
          expires_at: null,
          difficulty: "standard",
          max_submissions: null
        }, reviewer);
      }
      const { data: updated, error: updateError } = await supabase.from("raaiiidd_creator_requests").update({ status: "approved", mission_id: mission?.id || null, review_note: cleanText(req.body?.note, 500) || null, reviewed_by: reviewer, reviewed_at: now, updated_at: now }).eq("id", id).eq("status", "pending").select("*").single();
      if (updateError) throw updateError;
      await bot.sendMessage(request.creator_telegram_id, mission ? `✅ Your Raaiiidd Creator request #${id} was approved.\n\nMission #${mission.id} is now active.` : `✅ Your Raaiiidd Creator request #${id} was approved.\n\nThe creative is approved and is waiting for a real published HTTPS destination before the Raaiiidd mission can be activated.`).catch(() => undefined);
      return res.json({ ok: true, request: updated, mission, awaiting_publication_url: !mission });
    } catch (error) {
      console.error("Creator approval failed", { name: error?.name || "Error" });
      return res.status(409).json({ ok: false, error: "creator_approval_failed" });
    }
  });

  app.post("/api/mini/admin/creator/:id/activate", authenticate, async (req, res) => {
    try {
      const reviewer = Number(req.telegramUser.id);
      if (!await repository.hasPermission(reviewer, "mission.create", config.adminTelegramIds, config.ownerTelegramId)) return res.status(403).json({ ok: false, error: "admin_required" });
      const url = cleanText(req.body?.target_url, 1000);
      if (!validHttps(url)) return res.status(400).json({ ok: false, error: "valid_https_target_required" });
      const id = Number(req.params.id);
      const { data: request, error } = await supabase.from("raaiiidd_creator_requests").select("*,grace_posts(*)").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!request || request.status !== "approved") return res.status(409).json({ ok: false, error: "approval_required" });
      if (request.mission_id) return res.status(409).json({ ok: false, error: "already_active" });
      const mission = await repository.createMission({
        title: cleanText(request.grace_posts.title, 140), platform: inferPlatform(url), target_url: url,
        reward_points: request.desired_reward_points, status: "active", description: cleanText(request.grace_posts.body, 1200),
        instructions: "Open the approved Raaiiidd. Complete the requested genuine action. Submit DONE with an optional HTTPS proof link for Admin review.",
        link: url, starts_at: new Date().toISOString(), expires_at: null, difficulty: "standard", max_submissions: null
      }, reviewer);
      await supabase.from("raaiiidd_creator_requests").update({ target_url: url, mission_id: mission.id, updated_at: new Date().toISOString() }).eq("id", id);
      await supabase.from("grace_posts").update({ link_url: url, updated_at: new Date().toISOString() }).eq("id", request.grace_post_id);
      await bot.sendMessage(request.creator_telegram_id, `🚀 Your approved Creator request #${id} is now live as Raaiiidd Mission #${mission.id}.`).catch(() => undefined);
      return res.json({ ok: true, mission });
    } catch { return res.status(409).json({ ok: false, error: "creator_activation_failed" }); }
  });

  app.post("/api/mini/admin/creator/:id/reject", authenticate, async (req, res) => {
    try {
      const reviewer = Number(req.telegramUser.id);
      if (!await repository.hasPermission(reviewer, "mission.create", config.adminTelegramIds, config.ownerTelegramId)) return res.status(403).json({ ok: false, error: "admin_required" });
      const reason = cleanText(req.body?.reason, 500);
      if (reason.length < 2) return res.status(400).json({ ok: false, error: "reason_required" });
      const id = Number(req.params.id);
      const { data: request } = await supabase.from("raaiiidd_creator_requests").select("*").eq("id", id).maybeSingle();
      if (!request || request.status !== "pending") return res.status(409).json({ ok: false, error: "not_pending" });
      const now = new Date().toISOString();
      await supabase.from("grace_posts").update({ status: "rejected", rejected_by: reviewer, rejected_at: now, rejection_reason: reason, updated_at: now }).eq("id", request.grace_post_id);
      await supabase.from("raaiiidd_creator_requests").update({ status: "rejected", review_note: reason, reviewed_by: reviewer, reviewed_at: now, updated_at: now }).eq("id", id);
      await bot.sendMessage(request.creator_telegram_id, `❌ Raaiiidd Creator request #${id} was not approved.\n\nReason: ${reason}`).catch(() => undefined);
      return res.json({ ok: true });
    } catch { return res.status(409).json({ ok: false, error: "creator_rejection_failed" }); }
  });

  app.post("/api/mini/heroes/apply", authenticate, async (req, res) => {
    try {
      const telegramId = Number(req.telegramUser.id);
      if (!await registered(telegramId)) return res.status(403).json({ ok: false, error: "registration_required" });
      const displayName = cleanText(req.body?.display_name || req.telegramUser.first_name, 120);
      const story = cleanText(req.body?.story, 3000);
      const evidenceUrl = cleanText(req.body?.evidence_url, 1200);
      if (displayName.length < 2 || story.length < 20 || !validHttps(evidenceUrl)) return res.status(400).json({ ok: false, error: "hero_evidence_required" });
      const { data, error } = await supabase.from("real_world_hero_applications").insert({ telegram_id: telegramId, display_name: displayName, story, evidence_url: evidenceUrl, status: "pending" }).select("id,status,created_at").single();
      if (error) throw error;
      await bot.sendMessage(STEPPER_TELEGRAM_ID, `🦸 New Real-World Hero Review\n\nApplication #${data.id}\n${displayName}\n\nEvidence is awaiting human review.`, { reply_markup: { inline_keyboard: [[{ text: "Open Review Queue", web_app: { url: `${MINIAPP_URL}#admin-review` } }]] } }).catch(() => undefined);
      return res.status(201).json({ ok: true, application: data });
    } catch { return res.status(500).json({ ok: false, error: "hero_application_failed" }); }
  });

  app.get("/api/mini/heroes/mine", authenticate, async (req, res) => {
    const { data, error } = await supabase.from("real_world_hero_applications").select("id,display_name,status,review_note,reviewed_at,created_at").eq("telegram_id", Number(req.telegramUser.id)).order("created_at", { ascending: false }).limit(20);
    if (error) return res.status(500).json({ ok: false, error: "hero_history_failed" });
    return res.json({ ok: true, applications: data || [] });
  });

  app.get("/api/mini/admin/heroes", authenticate, async (req, res) => {
    try {
      if (!await repository.hasPermission(req.telegramUser.id, "member.view", config.adminTelegramIds, config.ownerTelegramId)) return res.status(403).json({ ok: false, error: "admin_required" });
      const { data, error } = await supabase.from("real_world_hero_applications").select("*").eq("status", "pending").order("created_at", { ascending: true }).limit(50);
      if (error) throw error;
      return res.json({ ok: true, applications: data || [] });
    } catch { return res.status(500).json({ ok: false, error: "hero_review_failed" }); }
  });

  app.post("/api/mini/admin/heroes/:id/approve", authenticate, async (req, res) => {
    try {
      const reviewer = Number(req.telegramUser.id);
      if (!await repository.hasPermission(reviewer, "member.view", config.adminTelegramIds, config.ownerTelegramId)) return res.status(403).json({ ok: false, error: "admin_required" });
      const id = Number(req.params.id);
      const { data: application, error } = await supabase.from("real_world_hero_applications").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!application || application.status !== "pending") return res.status(409).json({ ok: false, error: "not_pending" });
      const now = new Date().toISOString();
      const summary = cleanText(req.body?.summary || application.story, 900);
      const slug = `${slugify(application.display_name)}-${id}`;
      const { data: hero, error: heroError } = await supabase.from("real_world_heroes").insert({ application_id: id, telegram_id: application.telegram_id, slug, display_name: application.display_name, summary, status: "published", approved_by: reviewer, approved_at: now }).select("id,slug,display_name,summary,approved_at").single();
      if (heroError) throw heroError;
      await supabase.from("real_world_hero_applications").update({ status: "approved", review_note: cleanText(req.body?.note, 500) || null, reviewed_by: reviewer, reviewed_at: now, updated_at: now }).eq("id", id);
      await bot.sendMessage(application.telegram_id, `🦸 Real-World Hero Recognition Approved\n\n${application.display_name}\nYour verified recognition has been added to the OneWorldz Heroes register.\n${HEROES_URL}`).catch(() => undefined);
      return res.json({ ok: true, hero });
    } catch { return res.status(409).json({ ok: false, error: "hero_approval_failed" }); }
  });

  app.post("/api/mini/admin/heroes/:id/reject", authenticate, async (req, res) => {
    try {
      const reviewer = Number(req.telegramUser.id);
      if (!await repository.hasPermission(reviewer, "member.view", config.adminTelegramIds, config.ownerTelegramId)) return res.status(403).json({ ok: false, error: "admin_required" });
      const reason = cleanText(req.body?.reason, 500);
      if (reason.length < 2) return res.status(400).json({ ok: false, error: "reason_required" });
      const id = Number(req.params.id);
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("real_world_hero_applications").update({ status: "rejected", review_note: reason, reviewed_by: reviewer, reviewed_at: now, updated_at: now }).eq("id", id).eq("status", "pending").select("telegram_id").maybeSingle();
      if (error) throw error;
      if (!data) return res.status(409).json({ ok: false, error: "not_pending" });
      await bot.sendMessage(data.telegram_id, `Your Real-World Hero evidence review needs more information.\n\n${reason}`).catch(() => undefined);
      return res.json({ ok: true });
    } catch { return res.status(409).json({ ok: false, error: "hero_rejection_failed" }); }
  });

  app.get("/api/public/heroes", async (req, res) => {
    try {
      const { data, error } = await supabase.from("real_world_heroes").select("slug,display_name,summary,approved_at").eq("status", "published").order("approved_at", { ascending: false }).limit(100);
      if (error) throw error;
      res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
      return res.json({ ok: true, heroes: data || [] });
    } catch { return res.status(500).json({ ok: false, error: "heroes_unavailable" }); }
  });

  async function reviewDigest() {
    try {
      const [{ count: creatorCount, error: creatorError }, { count: heroCount, error: heroError }, pendingMissions] = await Promise.all([
        supabase.from("raaiiidd_creator_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("real_world_hero_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        repository.listPending(50)
      ]);
      if (creatorError) throw creatorError;
      if (heroError) throw heroError;
      const missionCount = (pendingMissions || []).length;
      const total = Number(creatorCount || 0) + Number(heroCount || 0) + missionCount;
      if (!total) return;
      await bot.sendMessage(STEPPER_TELEGRAM_ID, `✅ Stepper Hourly Approval Check\n\n🚀 Creator Raaiiidds: ${creatorCount || 0}\n📥 Mission evidence: ${missionCount}\n🦸 Hero evidence: ${heroCount || 0}\n\nTotal waiting: ${total}\n\nNothing is auto-approved. Human review remains required.`, { reply_markup: { inline_keyboard: [[{ text: "Open Command Centre Review", web_app: { url: `${MINIAPP_URL}#admin-review` } }]] } });
    } catch (error) {
      console.error("Stepper hourly review digest failed", { name: error?.name || "Error" });
    }
  }

  bot.onText(/^\/creator(?:@\w+)?$/i, async (msg) => bot.sendMessage(msg.chat.id, "🎨 ZED Raaiiidd Creator\n\nDraft the post, generate approved-theme artwork, preview it and submit it for Admin review. Nothing auto-publishes.", { reply_markup: { inline_keyboard: [[{ text: "Open Raaiiidd Creator", web_app: { url: `${MINIAPP_URL}#create` } }]] } }));
  bot.onText(/^\/heroes(?:@\w+)?$/i, async (msg) => bot.sendMessage(msg.chat.id, `🦸 OneWorldz Heroes\n\nAlready helping people in the real world? Submit evidence for human review and recognition.\n\n${HEROES_URL}`, { reply_markup: { inline_keyboard: [[{ text: "Submit Hero Evidence", web_app: { url: `${MINIAPP_URL}#heroes` } }], [{ text: "Public Heroes", url: HEROES_URL }]] } }));
  bot.onText(/^\/reviewqueue(?:@\w+)?$/i, async (msg) => {
    if (!await repository.hasPermission(msg.from.id, "submission.view", config.adminTelegramIds, config.ownerTelegramId)) return bot.sendMessage(msg.chat.id, "⛔ Admin access required.");
    return bot.sendMessage(msg.chat.id, "🛡️ Command Centre Review Queue\n\nMission evidence, participant-created Raaiiidds and Real-World Hero evidence are reviewed here.", { reply_markup: { inline_keyboard: [[{ text: "Open Review Queue", web_app: { url: `${MINIAPP_URL}#admin-review` } }]] } });
  });
  bot.onText(/^\/supportreagan(?:@\w+)?$/i, (msg) => bot.sendMessage(msg.chat.id, `💜 Reagan & Children\n\nUse the current dedicated DonateWorldz pathway:\n${DONATE_REAGAN_URL}`));

  const firstDigest = setTimeout(reviewDigest, 60 * 1000);
  const hourlyDigest = setInterval(reviewDigest, 60 * 60 * 1000);
  firstDigest.unref?.(); hourlyDigest.unref?.();
  return { stop() { clearTimeout(firstDigest); clearInterval(hourlyDigest); } };
}

module.exports = {
  DRAFT_BUCKET,
  HEROES_URL,
  MINIAPP_URL,
  STEPPER_TELEGRAM_ID,
  generateImage,
  generatePostCopy,
  inferPlatform,
  registerUserExperienceSystem,
  slugify,
  validHttps
};
