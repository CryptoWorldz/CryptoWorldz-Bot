const express = require("express");
const { createRateLimiter } = require("./core");
const { validateTelegramInitData } = require("./miniapp-auth");

const WORLDZCAST_COMMANDS = Object.freeze([
  { command: "worldzcast", description: "Create a WorldzCast post" },
  { command: "worldzcasttargets", description: "View WorldzCast destinations" }
]);

const CAST_PATTERN = /^\/worldzcast(?:@\w+)?(?:\s+([\s\S]+))?$/i;
const CONFIRM_PATTERN = /^\/confirmworldzcast(?:@\w+)?(?:\s+([0-9a-f-]{36}))?$/i;
const CANCEL_PATTERN = /^\/cancelworldzcast(?:@\w+)?(?:\s+([0-9a-f-]{36}))?$/i;
const TARGET_ON_PATTERN = /^\/worldzcaston(?:@\w+)?(?:\s+([a-z0-9-]{1,80}))?$/i;
const TARGET_OFF_PATTERN = /^\/worldzcastoff(?:@\w+)?$/i;
const TARGETS_PATTERN = /^\/worldzcasttargets(?:@\w+)?$/i;
const ALLOWED_CHAT_TYPES = new Set(["group", "supergroup", "channel"]);
const MAX_BODY_LENGTH = 8000;
const MAX_TARGETS = 100;
const PHOTO_CAPTION_LIMIT = 1024;
const MESSAGE_LIMIT = 4096;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function splitText(value, limit = MESSAGE_LIMIT) {
  let remaining = String(value || "").trim();
  if (!remaining) return [];
  const chunks = [];
  while (remaining.length > limit) {
    let splitAt = remaining.lastIndexOf("\n\n", limit);
    if (splitAt < Math.floor(limit / 2)) splitAt = remaining.lastIndexOf("\n", limit);
    if (splitAt < Math.floor(limit / 2)) splitAt = remaining.lastIndexOf(" ", limit);
    if (splitAt < Math.floor(limit / 2)) splitAt = limit;
    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function normalizeProjectSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function extractPhoto(message) {
  const photos = Array.isArray(message && message.photo) ? message.photo : [];
  const photo = photos.length ? photos[photos.length - 1] : null;
  return photo ? {
    fileId: photo.file_id,
    uniqueId: photo.file_unique_id || null
  } : null;
}

function targetSendOptions(threadId) {
  const options = {};
  const value = Number(threadId) || 0;
  if (value > 0) options.message_thread_id = value;
  return options;
}

function safeErrorCode(error) {
  return String(
    error && (error.code || error.response && error.response.body && error.response.body.description || error.message) ||
    "delivery_failed"
  ).replace(/\s+/g, " ").slice(0, 180);
}

function inferProject(projects, title, requestedSlug) {
  const normalizedRequested = normalizeProjectSlug(requestedSlug);
  if (normalizedRequested) {
    return (projects || []).find((project) => project.slug === normalizedRequested) || null;
  }
  const haystack = String(title || "").toLowerCase();
  const matched = (projects || []).find((project) => {
    const terms = [project.slug, project.display_name, ...(project.match_terms || [])]
      .filter(Boolean)
      .map((term) => String(term).toLowerCase());
    return terms.some((term) => term && haystack.includes(term));
  });
  return matched || (projects || []).find((project) => project.slug === "cryptoworldz") || null;
}

function registerWorldzCastSystem({ app, bot, config, repository, supabase }) {
  const draftLimiter = createRateLimiter({ maxEvents: 4, intervalMs: 60000 });
  const sendLimiter = createRateLimiter({ maxEvents: 4, intervalMs: 60 * 60 * 1000 });
  const miniLimiter = createRateLimiter({ maxEvents: 30, intervalMs: 60000 });

  async function accessFor(telegramId) {
    return repository.getAdminAccess(
      telegramId,
      config.adminTelegramIds,
      config.ownerTelegramId
    );
  }

  async function canBroadcast(telegramId) {
    const access = await accessFor(telegramId);
    return Boolean(
      access.authorized &&
      access.role !== "grace_manager" &&
      (String(telegramId) === String(config.ownerTelegramId) ||
        access.permissions.includes("communication.broadcast"))
    );
  }

  function isOwner(telegramId) {
    return String(telegramId || "") === String(config.ownerTelegramId || "");
  }

  async function listTargets() {
    const { data, error } = await supabase
      .from("community_telegram_destinations")
      .select("id,project_slug,chat_id,thread_id,chat_type,title,topic_label,broadcast_label,broadcast_order,status")
      .eq("status", "active")
      .eq("broadcast_enabled", true)
      .in("chat_type", ["group", "supergroup", "channel"])
      .order("broadcast_order", { ascending: true })
      .order("project_slug", { ascending: true })
      .order("title", { ascending: true })
      .limit(MAX_TARGETS);
    if (error) throw error;
    return data || [];
  }

  async function listRecentPosts(limit = 8) {
    const { data, error } = await supabase
      .from("worldzcast_posts")
      .select("id,status,body,media_kind,target_count,sent_count,failed_count,created_by,created_at,expires_at,completed_at")
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.min(Number(limit) || 8, 20)));
    if (error) throw error;
    return data || [];
  }

  async function createDraft({ creatorId, body, photo, sourceChatId, sourceThreadId }) {
    const message = String(body || "").trim();
    if (!message && !photo) throw Object.assign(new Error("empty_worldzcast"), { code: "empty_worldzcast" });
    if (message.length > MAX_BODY_LENGTH) {
      throw Object.assign(new Error("message_too_long"), { code: "message_too_long" });
    }
    if (!draftLimiter(String(creatorId))) {
      throw Object.assign(new Error("draft_rate_limited"), { code: "draft_rate_limited" });
    }
    const targets = await listTargets();
    const row = {
      created_by: Number(creatorId),
      body: message,
      media_kind: photo ? "photo" : "none",
      telegram_file_id: photo ? photo.fileId : null,
      telegram_file_unique_id: photo ? photo.uniqueId : null,
      source_chat_id: sourceChatId ? Number(sourceChatId) : null,
      source_thread_id: Number(sourceThreadId) || 0,
      target_count: targets.length
    };
    const { data, error } = await supabase
      .from("worldzcast_posts")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;
    return { draft: data, targets };
  }

  async function getDraft(postId, creatorId) {
    let query = supabase
      .from("worldzcast_posts")
      .select("*")
      .eq("created_by", Number(creatorId))
      .eq("status", "draft")
      .gt("expires_at", new Date().toISOString());
    if (postId) query = query.eq("id", postId);
    else query = query.order("created_at", { ascending: false }).limit(1);
    const { data, error } = postId ? await query.maybeSingle() : await query.maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function updateDraftPhoto(postId, creatorId, photo) {
    const { data, error } = await supabase
      .from("worldzcast_posts")
      .update({
        media_kind: "photo",
        telegram_file_id: photo.fileId,
        telegram_file_unique_id: photo.uniqueId || null
      })
      .eq("id", postId)
      .eq("created_by", Number(creatorId))
      .eq("status", "draft")
      .gt("expires_at", new Date().toISOString())
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function cancelDraft(postId, creatorId) {
    const draft = await getDraft(postId, creatorId);
    if (!draft) return null;
    const { data, error } = await supabase
      .from("worldzcast_posts")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", draft.id)
      .eq("status", "draft")
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function deliverPost(post, target) {
    const options = targetSendOptions(target.thread_id);
    let firstMessage = null;
    if (post.media_kind === "photo" && post.telegram_file_id) {
      if (post.body && post.body.length <= PHOTO_CAPTION_LIMIT) {
        firstMessage = await bot.sendPhoto(target.chat_id, post.telegram_file_id, {
          ...options,
          caption: post.body
        });
      } else {
        firstMessage = await bot.sendPhoto(target.chat_id, post.telegram_file_id, options);
        for (const chunk of splitText(post.body)) {
          await bot.sendMessage(target.chat_id, chunk, options);
        }
      }
    } else {
      for (const chunk of splitText(post.body)) {
        const sent = await bot.sendMessage(target.chat_id, chunk, options);
        if (!firstMessage) firstMessage = sent;
      }
    }
    return firstMessage;
  }

  async function sendDraft(postId, creatorId) {
    if (!sendLimiter(String(creatorId))) {
      throw Object.assign(new Error("send_rate_limited"), { code: "send_rate_limited" });
    }
    const draft = await getDraft(postId, creatorId);
    if (!draft) throw Object.assign(new Error("draft_not_found"), { code: "draft_not_found" });
    const targets = await listTargets();
    if (!targets.length) throw Object.assign(new Error("no_worldzcast_targets"), { code: "no_worldzcast_targets" });

    const now = new Date().toISOString();
    const { data: locked, error: lockError } = await supabase
      .from("worldzcast_posts")
      .update({ status: "sending", confirmed_at: now, target_count: targets.length })
      .eq("id", draft.id)
      .eq("status", "draft")
      .gt("expires_at", now)
      .select("*")
      .maybeSingle();
    if (lockError) throw lockError;
    if (!locked) throw Object.assign(new Error("draft_already_processed"), { code: "draft_already_processed" });

    const deliveries = targets.map((target) => ({
      post_id: locked.id,
      destination_id: target.id,
      chat_id: target.chat_id,
      thread_id: Number(target.thread_id) || 0,
      status: "pending"
    }));
    const { error: deliveryInsertError } = await supabase
      .from("worldzcast_deliveries")
      .upsert(deliveries, { onConflict: "post_id,destination_id", ignoreDuplicates: true });
    if (deliveryInsertError) throw deliveryInsertError;

    let sent = 0;
    let failed = 0;
    for (const target of targets) {
      try {
        const telegramMessage = await deliverPost(locked, target);
        sent += 1;
        await supabase
          .from("worldzcast_deliveries")
          .update({
            status: "sent",
            telegram_message_id: telegramMessage && telegramMessage.message_id || null,
            sent_at: new Date().toISOString(),
            error_code: null
          })
          .eq("post_id", locked.id)
          .eq("destination_id", target.id);
      } catch (error) {
        failed += 1;
        await supabase
          .from("worldzcast_deliveries")
          .update({ status: "failed", error_code: safeErrorCode(error) })
          .eq("post_id", locked.id)
          .eq("destination_id", target.id);
      }
      await wait(90);
    }

    const finalStatus = sent > 0 ? "completed" : "failed";
    const { data: completed, error: completeError } = await supabase
      .from("worldzcast_posts")
      .update({
        status: finalStatus,
        sent_count: sent,
        failed_count: failed,
        completed_at: new Date().toISOString(),
        last_error: sent > 0 ? null : "all_deliveries_failed"
      })
      .eq("id", locked.id)
      .select("*")
      .single();
    if (completeError) throw completeError;
    return completed;
  }

  async function sendDraftPreview(chatId, threadId, draft, targets) {
    const options = targetSendOptions(threadId);
    if (draft.media_kind === "photo" && draft.telegram_file_id) {
      await bot.sendPhoto(chatId, draft.telegram_file_id, {
        ...options,
        caption: draft.body && draft.body.length <= PHOTO_CAPTION_LIMIT
          ? draft.body
          : "🖼 WorldzCast image attached"
      });
      if (draft.body && draft.body.length > PHOTO_CAPTION_LIMIT) {
        for (const chunk of splitText(draft.body)) await bot.sendMessage(chatId, chunk, options);
      }
    } else if (draft.body) {
      for (const chunk of splitText(draft.body)) await bot.sendMessage(chatId, chunk, options);
    }
    await bot.sendMessage(chatId, [
      "📡 WorldzCast™ draft ready",
      "",
      `🎯 Approved destinations: ${targets.length}`,
      `🆔 ${draft.id}`,
      "",
      `Confirm: /confirmworldzcast ${draft.id}`,
      `Cancel: /cancelworldzcast ${draft.id}`,
      "",
      "Nothing is sent until confirmed."
    ].join("\n"), options);
  }

  async function authenticateMini(req, res, next) {
    const auth = validateTelegramInitData(req.get("x-telegram-init-data") || "", config.botToken);
    if (!auth.ok) return res.status(401).json({ ok: false, error: auth.error });
    if (!miniLimiter(`${auth.user.id}:${req.ip}`)) return res.status(429).json({ ok: false, error: "rate_limited" });
    if (!(await canBroadcast(auth.user.id))) return res.status(403).json({ ok: false, error: "broadcast_permission_required" });
    req.telegramUser = auth.user;
    return next();
  }

  async function listProjects() {
    const { data, error } = await supabase
      .from("community_projects")
      .select("slug,display_name,match_terms,status")
      .in("status", ["active", "connecting"])
      .order("display_name", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function upsertDestination(chat, msg, project, enabled) {
    const threadId = Number(msg.message_thread_id) || 0;
    const row = {
      project_slug: project.slug,
      chat_id: Number(chat.id),
      thread_id: threadId,
      chat_type: chat.type || msg.chat.type,
      title: chat.title || chat.username || "CryptoWorldz Telegram",
      username: chat.username || null,
      public_url: chat.username ? `https://t.me/${String(chat.username).replace(/^@/, "")}` : null,
      is_forum: Boolean(chat.is_forum),
      linked_chat_id: chat.linked_chat_id ? Number(chat.linked_chat_id) : null,
      topic_label: threadId ? `Topic ${threadId}` : null,
      status: "active",
      broadcast_enabled: enabled,
      broadcast_label: chat.title || chat.username || "CryptoWorldz Telegram",
      broadcast_updated_by: Number(msg.from.id),
      broadcast_updated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from("community_telegram_destinations")
      .upsert(row, { onConflict: "chat_id,thread_id" })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async function setLinkedDestination(chat, msg, project, enabled) {
    if (!chat.linked_chat_id || Number(msg.message_thread_id) > 0) return null;
    const linked = await bot.getChat(chat.linked_chat_id).catch(() => null);
    if (!linked || !ALLOWED_CHAT_TYPES.has(linked.type)) return null;
    const row = {
      project_slug: project.slug,
      chat_id: Number(linked.id),
      thread_id: 0,
      chat_type: linked.type,
      title: linked.title || linked.username || "Linked CryptoWorldz Telegram",
      username: linked.username || null,
      public_url: linked.username ? `https://t.me/${String(linked.username).replace(/^@/, "")}` : null,
      is_forum: Boolean(linked.is_forum),
      linked_chat_id: Number(chat.id),
      linked_title: chat.title || chat.username || null,
      linked_username: chat.username || null,
      linked_public_url: chat.username ? `https://t.me/${String(chat.username).replace(/^@/, "")}` : null,
      status: "active",
      broadcast_enabled: enabled,
      broadcast_label: linked.title || linked.username || "Linked CryptoWorldz Telegram",
      broadcast_updated_by: Number(msg.from.id),
      broadcast_updated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from("community_telegram_destinations")
      .upsert(row, { onConflict: "chat_id,thread_id" })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  bot.onText(CAST_PATTERN, async (msg, match) => {
    try {
      if (!msg.from || !(await canBroadcast(msg.from.id))) {
        return bot.sendMessage(msg.chat.id, "⛔ WorldzCast requires Admin or Executive communication authority.");
      }
      const reply = msg.reply_to_message || null;
      const photo = extractPhoto(reply);
      const body = String(match && match[1] || reply && (reply.caption || reply.text) || "").trim();
      const { draft, targets } = await createDraft({
        creatorId: msg.from.id,
        body,
        photo,
        sourceChatId: msg.chat.id,
        sourceThreadId: msg.message_thread_id
      });
      return sendDraftPreview(msg.chat.id, msg.message_thread_id, draft, targets);
    } catch (error) {
      const messages = {
        empty_worldzcast: "❌ Add your message after /worldzcast, or reply to a photo/post with /worldzcast.",
        message_too_long: "❌ WorldzCast messages must be 8,000 characters or fewer.",
        draft_rate_limited: "⚠️ Too many drafts. Wait one minute before trying again."
      };
      return bot.sendMessage(msg.chat.id, messages[error.code] || "❌ WorldzCast could not create that draft.");
    }
  });

  bot.onText(CONFIRM_PATTERN, async (msg, match) => {
    try {
      if (!msg.from || !(await canBroadcast(msg.from.id))) {
        return bot.sendMessage(msg.chat.id, "⛔ WorldzCast confirmation authority required.");
      }
      const result = await sendDraft(match && match[1], msg.from.id);
      return bot.sendMessage(msg.chat.id, [
        "📡 WorldzCast™ complete",
        "",
        `✅ Sent: ${result.sent_count}`,
        `❌ Failed: ${result.failed_count}`,
        `🎯 Total targets: ${result.target_count}`,
        `🆔 ${result.id}`
      ].join("\n"));
    } catch (error) {
      const messages = {
        draft_not_found: "❌ No active WorldzCast draft was found.",
        draft_already_processed: "❌ That WorldzCast has already been confirmed or cancelled.",
        no_worldzcast_targets: "❌ No WorldzCast destinations are enabled. Run /worldzcaston inside each approved group or topic.",
        send_rate_limited: "⚠️ WorldzCast sending limit reached. Try again later."
      };
      return bot.sendMessage(msg.chat.id, messages[error.code] || "❌ WorldzCast could not complete the delivery.");
    }
  });

  bot.onText(CANCEL_PATTERN, async (msg, match) => {
    if (!msg.from || !(await canBroadcast(msg.from.id))) {
      return bot.sendMessage(msg.chat.id, "⛔ WorldzCast cancellation authority required.");
    }
    const cancelled = await cancelDraft(match && match[1], msg.from.id).catch(() => null);
    return bot.sendMessage(msg.chat.id, cancelled ? "✅ WorldzCast draft cancelled." : "❌ No active WorldzCast draft was found.");
  });

  bot.onText(TARGET_ON_PATTERN, async (msg, match) => {
    if (!msg.from || !isOwner(msg.from.id)) return bot.sendMessage(msg.chat.id, "⛔ Owner access required.");
    if (!msg.chat || !ALLOWED_CHAT_TYPES.has(msg.chat.type)) {
      return bot.sendMessage(msg.chat.id, "❌ Run /worldzcaston inside a CryptoWorldz group, supergroup or topic.");
    }
    try {
      const chat = await bot.getChat(msg.chat.id).catch(() => msg.chat);
      const projects = await listProjects();
      const project = inferProject(projects, chat.title || chat.username, match && match[1]);
      if (!project) return bot.sendMessage(msg.chat.id, "❌ No matching CryptoWorldz project was found.");
      const destination = await upsertDestination(chat, msg, project, true);
      const linked = await setLinkedDestination(chat, msg, project, true);
      return bot.sendMessage(msg.chat.id, [
        "✅ WorldzCast destination enabled",
        "",
        `🌍 ${project.display_name}`,
        `📍 ${destination.title}${destination.thread_id ? ` • Topic ${destination.thread_id}` : ""}`,
        linked ? `🔄 Linked destination also enabled: ${linked.title}` : null,
        "",
        "Future confirmed WorldzCasts will post here."
      ].filter(Boolean).join("\n"));
    } catch (error) {
      return bot.sendMessage(msg.chat.id, "❌ Zed could not enable this WorldzCast destination.");
    }
  });

  bot.onText(TARGET_OFF_PATTERN, async (msg) => {
    if (!msg.from || !isOwner(msg.from.id)) return bot.sendMessage(msg.chat.id, "⛔ Owner access required.");
    try {
      const threadId = Number(msg.message_thread_id) || 0;
      const { data, error } = await supabase
        .from("community_telegram_destinations")
        .update({
          broadcast_enabled: false,
          broadcast_updated_by: Number(msg.from.id),
          broadcast_updated_at: new Date().toISOString()
        })
        .eq("chat_id", Number(msg.chat.id))
        .eq("thread_id", threadId)
        .select("linked_chat_id")
        .maybeSingle();
      if (error) throw error;
      if (data && data.linked_chat_id && threadId === 0) {
        await supabase
          .from("community_telegram_destinations")
          .update({ broadcast_enabled: false, broadcast_updated_by: Number(msg.from.id), broadcast_updated_at: new Date().toISOString() })
          .eq("chat_id", Number(data.linked_chat_id))
          .eq("thread_id", 0);
      }
      return bot.sendMessage(msg.chat.id, data ? "✅ WorldzCast disabled for this destination." : "❌ This destination was not registered.");
    } catch {
      return bot.sendMessage(msg.chat.id, "❌ Zed could not disable this WorldzCast destination.");
    }
  });

  bot.onText(TARGETS_PATTERN, async (msg) => {
    if (!msg.from || !(await canBroadcast(msg.from.id))) {
      return bot.sendMessage(msg.chat.id, "⛔ WorldzCast viewing authority required.");
    }
    try {
      const targets = await listTargets();
      const rows = targets.map((target, index) =>
        `${index + 1}. ${target.title}${target.topic_label ? ` • ${target.topic_label}` : ""}\n   ${target.project_slug} • ${target.chat_type}`
      );
      return bot.sendMessage(msg.chat.id, [
        "📡 WorldzCast™ Destinations",
        "",
        `Active targets: ${targets.length}`,
        "",
        rows.length ? rows.join("\n\n") : "No destinations enabled yet.",
        "",
        isOwner(msg.from.id) ? "Owner setup: run /worldzcaston inside each approved group or topic." : "Destination setup is owner-controlled."
      ].join("\n"));
    } catch {
      return bot.sendMessage(msg.chat.id, "❌ WorldzCast destinations could not be loaded.");
    }
  });

  app.get("/api/mini/worldzcast/status", authenticateMini, async (req, res) => {
    try {
      const [targets, posts] = await Promise.all([listTargets(), listRecentPosts()]);
      return res.json({
        ok: true,
        targets,
        posts,
        owner: isOwner(req.telegramUser.id),
        limits: { max_body_length: MAX_BODY_LENGTH, max_targets: MAX_TARGETS, image_megabytes: 8 }
      });
    } catch {
      return res.status(500).json({ ok: false, error: "worldzcast_status_failed" });
    }
  });

  app.post("/api/mini/worldzcast/drafts", authenticateMini, async (req, res) => {
    try {
      const { draft, targets } = await createDraft({
        creatorId: req.telegramUser.id,
        body: req.body && req.body.body,
        photo: null,
        sourceChatId: req.telegramUser.id,
        sourceThreadId: 0
      });
      return res.status(201).json({ ok: true, draft, target_count: targets.length });
    } catch (error) {
      const status = error.code === "draft_rate_limited" ? 429 : 400;
      return res.status(status).json({ ok: false, error: error.code || "worldzcast_draft_failed" });
    }
  });

  app.post(
    "/api/mini/worldzcast/drafts/:id/image",
    authenticateMini,
    express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "8mb" }),
    async (req, res) => {
      try {
        if (!Buffer.isBuffer(req.body) || req.body.length < 100) {
          return res.status(400).json({ ok: false, error: "invalid_image" });
        }
        const draft = await getDraft(req.params.id, req.telegramUser.id);
        if (!draft) return res.status(404).json({ ok: false, error: "draft_not_found" });
        const preview = await bot.sendPhoto(
          req.telegramUser.id,
          req.body,
          { caption: `🖼 WorldzCast image attached\n\nDraft: ${draft.id}` },
          { filename: `worldzcast-${draft.id}.jpg`, contentType: req.get("content-type") || "image/jpeg" }
        );
        const photo = extractPhoto(preview);
        if (!photo) return res.status(502).json({ ok: false, error: "telegram_image_upload_failed" });
        const updated = await updateDraftPhoto(draft.id, req.telegramUser.id, photo);
        return res.json({ ok: true, draft: updated });
      } catch (error) {
        if (error && error.type === "entity.too.large") return res.status(413).json({ ok: false, error: "image_too_large" });
        return res.status(502).json({ ok: false, error: "worldzcast_image_failed" });
      }
    }
  );

  app.post("/api/mini/worldzcast/drafts/:id/confirm", authenticateMini, async (req, res) => {
    try {
      const result = await sendDraft(req.params.id, req.telegramUser.id);
      return res.json({ ok: true, result });
    } catch (error) {
      const status = error.code === "send_rate_limited" ? 429 : error.code === "no_worldzcast_targets" ? 409 : 400;
      return res.status(status).json({ ok: false, error: error.code || "worldzcast_send_failed" });
    }
  });

  app.post("/api/mini/worldzcast/drafts/:id/cancel", authenticateMini, async (req, res) => {
    try {
      const result = await cancelDraft(req.params.id, req.telegramUser.id);
      if (!result) return res.status(404).json({ ok: false, error: "draft_not_found" });
      return res.json({ ok: true, result });
    } catch {
      return res.status(500).json({ ok: false, error: "worldzcast_cancel_failed" });
    }
  });

  return {
    listTargets,
    createDraft,
    sendDraft
  };
}

module.exports = {
  WORLDZCAST_COMMANDS,
  extractPhoto,
  inferProject,
  normalizeProjectSlug,
  registerWorldzCastSystem,
  splitText,
  targetSendOptions
};
