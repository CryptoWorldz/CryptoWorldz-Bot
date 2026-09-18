const DIRECTORY_COMMANDS = Object.freeze([
  { command: "tg", description: "Open this group’s Telegram links" },
  { command: "tglinks", description: "View all CryptoWorldz Telegram links" },
  { command: "x", description: "Open this group’s X page" },
  { command: "xlinks", description: "View all official CryptoWorldz X pages" }
]);

const HQ_URL = "https://t.me/CryptoWorldzHQ";
const GROUP_TYPES = new Set(["group", "supergroup", "channel"]);

function normalizeHandle(value) {
  return String(value || "").trim().replace(/^@/, "");
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "community";
}

function telegramUrl(chat) {
  const username = normalizeHandle(chat && chat.username);
  if (username) return `https://t.me/${username}`;
  const invite = String((chat && chat.invite_link) || "").trim();
  return /^https:\/\/t\.me\//i.test(invite) ? invite : "";
}

function topicUrl(baseUrl, threadId) {
  const url = String(baseUrl || "").replace(/\/$/, "");
  const topic = Number(threadId) || 0;
  if (!url || !topic || /\/\+|\/joinchat\//i.test(url)) return url;
  return `${url}/${topic}`;
}

function projectHaystack(chat, label = "") {
  return [label, chat && chat.title, chat && chat.username]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function chooseProject(projects, chat, label = "") {
  const haystack = projectHaystack(chat, label);
  if (!haystack) return null;
  return (projects || []).find((project) => {
    const terms = [project.slug, project.display_name, ...(project.match_terms || [])]
      .filter(Boolean)
      .map((term) => String(term).toLowerCase());
    return terms.some((term) => term && haystack.includes(term));
  }) || null;
}

function parseIdentifyArgs(value) {
  const [projectLabel = "", topicLabel = ""] = String(value || "")
    .split("|")
    .map((part) => part.trim());
  return { projectLabel, topicLabel };
}

function splitText(text, limit = 4096) {
  const value = String(text || "");
  if (value.length <= limit) return [value];
  const chunks = [];
  let remaining = value;
  while (remaining.length > limit) {
    let splitAt = remaining.lastIndexOf("\n\n", limit);
    if (splitAt < Math.floor(limit / 2)) splitAt = remaining.lastIndexOf("\n", limit);
    if (splitAt < Math.floor(limit / 2)) splitAt = limit;
    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function buildTelegramMessage(destination, socialAccount) {
  const lines = [
    "💬 CryptoWorldz Telegram",
    "",
    `📍 ${destination.title}`
  ];
  if (destination.topic_label) lines.push(`🧵 ${destination.topic_label}`);
  if (destination.public_url) lines.push(`🔗 ${destination.public_url}`);
  if (destination.linked_title || destination.linked_public_url) {
    lines.push(
      "",
      `🔄 Linked Telegram: ${destination.linked_title || "Connected channel/group"}`
    );
    if (destination.linked_public_url) lines.push(`🔗 ${destination.linked_public_url}`);
  }
  if (socialAccount) {
    lines.push("", `𝕏 Matching X: @${socialAccount.handle}`, socialAccount.url);
  }
  lines.push("", "Use /tglinks to view the full CryptoWorldz Telegram Community.");
  return lines.join("\n");
}

function buildXMessage(account, projectName) {
  return [
    "𝕏 CryptoWorldz X",
    "",
    `📍 ${projectName || account.display_name}`,
    `@${account.handle}`,
    account.url,
    "",
    "Use /xlinks to view every official CryptoWorldz X page."
  ].join("\n");
}

function rowsKeyboard(rows) {
  const buttons = (rows || [])
    .filter((row) => row && row.url)
    .slice(0, 40)
    .map((row) => [{ text: row.text.slice(0, 60), url: row.url }]);
  return buttons.length ? { reply_markup: { inline_keyboard: buttons } } : undefined;
}

function registerCommunityDirectoryHandlers({ bot, supabase, config }) {
  const observed = new Set();
  const ownerAllowed = (msg) => String(msg.from && msg.from.id) === String(config.ownerTelegramId);
  const isGroupMessage = (msg) => Boolean(msg && msg.chat && GROUP_TYPES.has(msg.chat.type));

  async function listProjects() {
    const { data, error } = await supabase
      .from("community_projects")
      .select("slug,display_name,status,website_url,primary_telegram_url,match_terms")
      .in("status", ["active", "connecting"])
      .order("display_name", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function getProject(slug) {
    if (!slug) return null;
    const { data, error } = await supabase
      .from("community_projects")
      .select("slug,display_name,status,website_url,primary_telegram_url,match_terms")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function ensureProject(chat, projectLabel, allowCreate) {
    const projects = await listProjects();
    const matched = chooseProject(projects, chat, projectLabel);
    if (matched || !allowCreate) return matched;

    const displayName = projectLabel || chat.title || chat.username || "CryptoWorldz Community";
    const slug = slugify(displayName);
    const { data, error } = await supabase
      .from("community_projects")
      .upsert({
        slug,
        display_name: displayName,
        status: "active",
        match_terms: [String(displayName).toLowerCase()]
      }, { onConflict: "slug" })
      .select("slug,display_name,status,website_url,primary_telegram_url,match_terms")
      .single();
    if (error) throw error;
    return data;
  }

  async function identifyDestination(msg, options = {}) {
    if (!isGroupMessage(msg)) return null;
    const projectLabel = String(options.projectLabel || "").trim();
    const topicLabelOverride = String(options.topicLabel || "").trim();
    const allowCreateProject = Boolean(options.allowCreateProject);
    const chat = await bot.getChat(msg.chat.id).catch(() => msg.chat);
    const project = await ensureProject(chat, projectLabel, allowCreateProject);
    if (!project) return null;

    let linked = null;
    if (chat.linked_chat_id) {
      linked = await bot.getChat(chat.linked_chat_id).catch(() => null);
    }

    const threadId = Number(msg.message_thread_id) || 0;
    const detectedTopicName =
      (msg.forum_topic_created && msg.forum_topic_created.name) ||
      (msg.reply_to_message && msg.reply_to_message.forum_topic_created && msg.reply_to_message.forum_topic_created.name) ||
      "";
    const topicLabel = threadId
      ? topicLabelOverride || detectedTopicName || `Topic ${threadId}`
      : null;
    const baseUrl = telegramUrl(chat);
    const linkedBaseUrl = telegramUrl(linked);

    const row = {
      project_slug: project.slug,
      chat_id: Number(chat.id),
      thread_id: threadId,
      chat_type: chat.type || msg.chat.type,
      title: chat.title || chat.username || "CryptoWorldz Telegram",
      username: normalizeHandle(chat.username) || null,
      public_url: topicUrl(baseUrl, threadId) || null,
      is_forum: Boolean(chat.is_forum),
      linked_chat_id: linked ? Number(linked.id) : chat.linked_chat_id ? Number(chat.linked_chat_id) : null,
      linked_title: linked ? linked.title || linked.username || null : null,
      linked_username: linked ? normalizeHandle(linked.username) || null : null,
      linked_public_url: linkedBaseUrl || null,
      topic_label: topicLabel,
      status: "active",
      last_seen_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("community_telegram_destinations")
      .upsert(row, { onConflict: "chat_id,thread_id" })
      .select("*")
      .single();
    if (error) throw error;

    if (linked) {
      const linkedRow = {
        project_slug: project.slug,
        chat_id: Number(linked.id),
        thread_id: 0,
        chat_type: linked.type || "channel",
        title: linked.title || linked.username || "Linked CryptoWorldz Telegram",
        username: normalizeHandle(linked.username) || null,
        public_url: linkedBaseUrl || null,
        is_forum: Boolean(linked.is_forum),
        linked_chat_id: Number(chat.id),
        linked_title: chat.title || chat.username || null,
        linked_username: normalizeHandle(chat.username) || null,
        linked_public_url: baseUrl || null,
        topic_label: null,
        status: "active",
        last_seen_at: new Date().toISOString()
      };
      const { error: linkedError } = await supabase
        .from("community_telegram_destinations")
        .upsert(linkedRow, { onConflict: "chat_id,thread_id" });
      if (linkedError) throw linkedError;
    }

    return data;
  }

  async function getDestination(msg) {
    const threadId = Number(msg.message_thread_id) || 0;
    let query = supabase
      .from("community_telegram_destinations")
      .select("*")
      .eq("chat_id", Number(msg.chat.id))
      .eq("thread_id", threadId)
      .maybeSingle();
    let { data, error } = await query;
    if (error) throw error;
    if (!data && threadId) {
      ({ data, error } = await supabase
        .from("community_telegram_destinations")
        .select("*")
        .eq("chat_id", Number(msg.chat.id))
        .eq("thread_id", 0)
        .maybeSingle());
      if (error) throw error;
    }
    return data;
  }

  async function getXAccount(projectSlug) {
    if (!projectSlug) return null;
    const { data, error } = await supabase
      .from("community_social_accounts")
      .select("project_slug,platform,display_name,handle,url,status,display_order")
      .eq("project_slug", projectSlug)
      .eq("platform", "x")
      .eq("status", "active")
      .order("display_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function sendLong(chatId, text, options) {
    const chunks = splitText(text);
    for (let index = 0; index < chunks.length; index += 1) {
      await bot.sendMessage(chatId, chunks[index], index === 0 ? options : undefined);
    }
  }

  async function observe(msg) {
    if (!isGroupMessage(msg)) return;
    const key = `${msg.chat.id}:${Number(msg.message_thread_id) || 0}`;
    if (observed.has(key)) return;
    observed.add(key);
    try {
      const destination = await identifyDestination(msg, { allowCreateProject: false });
      if (!destination) observed.delete(key);
    } catch (error) {
      observed.delete(key);
      console.error("Community directory observation failed", {
        name: error && error.name ? error.name : "Error"
      });
    }
  }

  bot.on("message", observe);
  bot.on("channel_post", observe);

  bot.onText(/^\/identify(?:@\w+)?(?:\s+([\s\S]+))?$/i, async (msg, match) => {
    if (!ownerAllowed(msg)) return bot.sendMessage(msg.chat.id, "⛔ Owner access required.");
    if (!isGroupMessage(msg)) {
      return bot.sendMessage(msg.chat.id, "❌ Run /identify inside the channel, group or topic you want Zed to register.");
    }
    try {
      const { projectLabel, topicLabel } = parseIdentifyArgs(match && match[1]);
      const destination = await identifyDestination(msg, {
        projectLabel,
        topicLabel,
        allowCreateProject: true
      });
      const project = await getProject(destination.project_slug);
      const linked = destination.linked_title
        ? `\n🔄 Linked: ${destination.linked_title}`
        : "";
      return bot.sendMessage(
        msg.chat.id,
        `✅ Telegram destination identified.\n\n🌍 Project: ${project ? project.display_name : destination.project_slug}\n📍 ${destination.title}${destination.topic_label ? `\n🧵 ${destination.topic_label}` : ""}\n🆔 Chat: ${destination.chat_id}${destination.thread_id ? `\n🧵 Topic ID: ${destination.thread_id}` : ""}${linked}\n\nUse /tg here to test the local links.`
      );
    } catch (error) {
      console.error("Identify command failed", { name: error && error.name ? error.name : "Error" });
      return bot.sendMessage(msg.chat.id, "❌ Zed could not register this Telegram destination.");
    }
  });

  bot.onText(/^\/setx(?:@\w+)?(?:\s+@?([A-Za-z0-9_]{1,15}))?(?:\s*\|\s*(.+))?$/i, async (msg, match) => {
    if (!ownerAllowed(msg)) return bot.sendMessage(msg.chat.id, "⛔ Owner access required.");
    if (!isGroupMessage(msg)) {
      return bot.sendMessage(msg.chat.id, "❌ Run /setx inside the Telegram group or topic being linked.");
    }
    const handle = normalizeHandle(match && match[1]);
    if (!handle) return bot.sendMessage(msg.chat.id, "❌ Use: /setx @handle | Optional Project Name");
    try {
      let destination = await getDestination(msg);
      if (!destination) {
        destination = await identifyDestination(msg, {
          projectLabel: String((match && match[2]) || "").trim(),
          allowCreateProject: true
        });
      }
      const project = await getProject(destination.project_slug);
      const displayName = String((match && match[2]) || "").trim() ||
        (project && project.display_name) || destination.title;
      const url = `https://x.com/${handle}`;
      const { error } = await supabase
        .from("community_social_accounts")
        .upsert({
          project_slug: destination.project_slug,
          platform: "x",
          display_name: displayName,
          handle,
          url,
          status: "active",
          display_order: 100
        }, { onConflict: "platform,handle" });
      if (error) throw error;
      return bot.sendMessage(msg.chat.id, `✅ X page linked to this project.\n\n𝕏 @${handle}\n${url}\n\nUse /x here to test it.`);
    } catch (error) {
      console.error("Set X command failed", { name: error && error.name ? error.name : "Error" });
      return bot.sendMessage(msg.chat.id, "❌ Zed could not link that X page.");
    }
  });

  bot.onText(/^\/tg(?:@\w+)?$/i, async (msg) => {
    if (!isGroupMessage(msg)) {
      return bot.sendMessage(msg.chat.id, "💬 Use /tglinks to view the full CryptoWorldz Telegram Community.");
    }
    try {
      let destination = await getDestination(msg);
      if (!destination) destination = await identifyDestination(msg, { allowCreateProject: false });
      if (!destination) {
        return bot.sendMessage(msg.chat.id, "⚠️ This group is not identified yet. The Owner can run /identify here once.");
      }
      const account = await getXAccount(destination.project_slug);
      const buttons = [];
      if (destination.public_url) buttons.push([{ text: "💬 Open This Telegram", url: destination.public_url }]);
      if (destination.linked_public_url) buttons.push([{ text: "🔄 Open Linked Telegram", url: destination.linked_public_url }]);
      if (account) buttons.push([{ text: `𝕏 @${account.handle}`, url: account.url }]);
      buttons.push([{ text: "🌍 CryptoWorldz HQ", url: HQ_URL }]);
      return bot.sendMessage(msg.chat.id, buildTelegramMessage(destination, account), {
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (error) {
      console.error("TG command failed", { name: error && error.name ? error.name : "Error" });
      return bot.sendMessage(msg.chat.id, "❌ Zed could not load this Telegram destination.");
    }
  });

  bot.onText(/^\/tglinks(?:@\w+)?$/i, async (msg) => {
    try {
      const [{ data: destinations, error: destinationError }, projects] = await Promise.all([
        supabase
          .from("community_telegram_destinations")
          .select("project_slug,title,topic_label,public_url,chat_type,status")
          .eq("status", "active")
          .order("title", { ascending: true }),
        listProjects()
      ]);
      if (destinationError) throw destinationError;

      const byProject = new Map();
      for (const destination of destinations || []) {
        if (!byProject.has(destination.project_slug)) byProject.set(destination.project_slug, []);
        byProject.get(destination.project_slug).push(destination);
      }

      const lines = ["🌍 CryptoWorldz Telegram Community", ""];
      const keyboardRows = [];
      const usedUrls = new Set();
      for (const project of projects) {
        const rows = byProject.get(project.slug) || [];
        const projectLinks = [];
        if (project.primary_telegram_url) {
          projectLinks.push({ title: "Main Telegram", public_url: project.primary_telegram_url });
        }
        projectLinks.push(...rows);
        const unique = projectLinks.filter((row) => {
          const key = row.public_url || `${project.slug}:${row.title}:${row.topic_label || ""}`;
          if (usedUrls.has(key)) return false;
          usedUrls.add(key);
          return true;
        });
        if (!unique.length) continue;
        lines.push(`💜 ${project.display_name}`);
        for (const row of unique) {
          const label = `${row.title}${row.topic_label ? ` — ${row.topic_label}` : ""}`;
          lines.push(`• ${label}${row.public_url ? `\n  ${row.public_url}` : " — Private / registered"}`);
          if (row.public_url) keyboardRows.push({ text: `${project.display_name}: ${label}`, url: row.public_url });
        }
        lines.push("");
      }
      lines.push("Run /identify once inside any missing CryptoWorldz channel, group or topic.");
      return sendLong(msg.chat.id, lines.join("\n"), rowsKeyboard(keyboardRows));
    } catch (error) {
      console.error("TG links command failed", { name: error && error.name ? error.name : "Error" });
      return bot.sendMessage(msg.chat.id, "❌ Zed could not load the Telegram Community directory.");
    }
  });

  bot.onText(/^\/x(?:@\w+)?$/i, async (msg) => {
    if (!isGroupMessage(msg)) {
      return bot.sendMessage(msg.chat.id, "𝕏 Use /xlinks to view every official CryptoWorldz X page.");
    }
    try {
      let destination = await getDestination(msg);
      if (!destination) destination = await identifyDestination(msg, { allowCreateProject: false });
      if (!destination) {
        return bot.sendMessage(msg.chat.id, "⚠️ This group is not identified yet. The Owner can run /identify here once.");
      }
      const [account, project] = await Promise.all([
        getXAccount(destination.project_slug),
        getProject(destination.project_slug)
      ]);
      if (!account) {
        return bot.sendMessage(msg.chat.id, "⚠️ No X page is linked to this Telegram project yet. The Owner can use /setx @handle.");
      }
      return bot.sendMessage(msg.chat.id, buildXMessage(account, project && project.display_name), {
        reply_markup: { inline_keyboard: [
          [{ text: `𝕏 Open @${account.handle}`, url: account.url }],
          [{ text: "𝕏 View All X Pages", callback_data: "cryptoworldz_xlinks" }]
        ] }
      });
    } catch (error) {
      console.error("X command failed", { name: error && error.name ? error.name : "Error" });
      return bot.sendMessage(msg.chat.id, "❌ Zed could not load this project’s X page.");
    }
  });

  async function sendXLinks(chatId) {
    const { data, error } = await supabase
      .from("community_social_accounts")
      .select("display_name,handle,url,display_order")
      .eq("platform", "x")
      .eq("status", "active")
      .order("display_order", { ascending: true })
      .order("display_name", { ascending: true });
    if (error) throw error;
    const accounts = data || [];
    const text = [
      "𝕏 Official CryptoWorldz X Pages",
      "",
      ...accounts.map((account) => `• ${account.display_name} — @${account.handle}\n  ${account.url}`)
    ].join("\n");
    const buttons = [];
    for (let index = 0; index < accounts.length; index += 2) {
      buttons.push(accounts.slice(index, index + 2).map((account) => ({
        text: `@${account.handle}`,
        url: account.url
      })));
    }
    return bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: buttons } });
  }

  bot.onText(/^\/xlinks(?:@\w+)?$/i, async (msg) => {
    try {
      return await sendXLinks(msg.chat.id);
    } catch (error) {
      console.error("X links command failed", { name: error && error.name ? error.name : "Error" });
      return bot.sendMessage(msg.chat.id, "❌ Zed could not load the X page directory.");
    }
  });

  bot.on("callback_query", async (query) => {
    if (!query || query.data !== "cryptoworldz_xlinks" || !query.message) return;
    try {
      await bot.answerCallbackQuery(query.id);
      await sendXLinks(query.message.chat.id);
    } catch (error) {
      console.error("X links callback failed", { name: error && error.name ? error.name : "Error" });
    }
  });
}

module.exports = {
  DIRECTORY_COMMANDS,
  HQ_URL,
  buildTelegramMessage,
  buildXMessage,
  chooseProject,
  normalizeHandle,
  parseIdentifyArgs,
  registerCommunityDirectoryHandlers,
  slugify,
  splitText,
  telegramUrl,
  topicUrl
};
