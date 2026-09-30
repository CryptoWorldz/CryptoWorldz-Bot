const DEFAULT_BOT_USERNAME = "DipShitBossBot";

function extractDipshitResponseText(payload) {
  const chunks = [];
  for (const item of payload && payload.output || []) {
    if (!item || item.type !== "message") continue;
    for (const part of item.content || []) {
      if (part && part.type === "output_text" && part.text) chunks.push(part.text);
    }
  }
  return chunks.join("\n").trim();
}

function normalizeDipshitHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-8).flatMap((item) => {
    const role = item && item.role === "assistant" ? "assistant" : item && item.role === "user" ? "user" : null;
    const content = String(item && item.content || "").trim().slice(0, 1200);
    return role && content ? [{ role, content }] : [];
  });
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function moderationRequiresHardBlock(result) {
  const categories = result && result.categories || {};
  return Boolean(
    categories["sexual/minors"] ||
    categories["self-harm/instructions"] ||
    categories["self-harm/intent"] ||
    categories["illicit/violent"] ||
    categories["hate/threatening"] ||
    categories["harassment/threatening"]
  );
}
function shouldHandleDipshitConversation(msg, botUsername = DEFAULT_BOT_USERNAME) {
  const text = String(msg && msg.text || "").trim();
  if (!text || text.startsWith("/")) return false;

  const chatType = String(msg && msg.chat && msg.chat.type || "");
  if (chatType === "private") return true;

  const username = String(botUsername || DEFAULT_BOT_USERNAME).replace(/^@/, "");
  const mention = username && new RegExp(`(?:^|\\s)@${escapeRegex(username)}(?:\\b|$)`, "i").test(text);
  const addressed = /^dip\s*shit\b[\s,:;.!?-]*/i.test(text);
  const replyUsername = String(msg && msg.reply_to_message && msg.reply_to_message.from && msg.reply_to_message.from.username || "");
  const replyToBot = Boolean(username && replyUsername && replyUsername.toLowerCase() === username.toLowerCase());
  return Boolean(mention || addressed || replyToBot);
}

function stripDipshitAddressing(text, botUsername = DEFAULT_BOT_USERNAME) {
  const username = String(botUsername || DEFAULT_BOT_USERNAME).replace(/^@/, "");
  let cleaned = String(text || "").trim();
  if (username) cleaned = cleaned.replace(new RegExp(`@${escapeRegex(username)}\\b`, "ig"), " ");
  cleaned = cleaned.replace(/^dip\s*shit\b[\s,:;.!?-]*/i, "");
  return cleaned.replace(/\s{2,}/g, " ").trim();
}

async function callDipshitAI({ apiKey, model, message, history, context, fetchImpl = fetch }) {
  if (!apiKey) throw new Error("openai_api_not_configured");

  const moderation = await fetchImpl("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "omni-moderation-latest", input: message }),
    signal: AbortSignal.timeout(15000)
  });
  const moderationPayload = await moderation.json().catch(() => ({}));
  if (!moderation.ok) throw new Error("moderation_unavailable");
  const moderationResult = moderationPayload?.results?.[0];
  if (moderationResult?.flagged && moderationRequiresHardBlock(moderationResult)) {
    return "Nah — that one crosses a line I can't help with. Give me the Worldz, ZED, Telegram, wallet-display or site problem instead and this DipShit will get useful.";
  }

  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 420,
      instructions: [
        "You are DIPSHIT™, the blue WORLDZ DUDE inside CryptoWorldz.",
        "Your job is interactive QA, troubleshooting and Worldz navigation. Be concise, practical and genuinely useful.",
        "Personality: you are a smart DipShit on purpose — cheeky, quick, self-aware, a little irreverent and comfortable with mild swearing when the user is clearly bantering. You can joke about yourself being a DipShit. Never become cruel, threatening, discriminatory or relentlessly insulting.",
        "Do not treat ordinary profanity, teasing or a user calling you slow or stupid as a safety refusal. Answer the substance and banter back lightly when appropriate.",
        "Diagnose symptoms step by step. Ask one useful follow-up only when necessary.",
        "Never claim you ran a live check unless the supplied runtime context proves it or the user ran /check.",
        "Never request or accept seed phrases, private keys, passwords, API keys, bank-card details or other secrets.",
        "You have no wallet signing, treasury, governance execution or mainnet broadcast authority.",
        "Do not invent deployments, balances, listings, approvals, memberships, transactions, partnerships or verification states.",
        "For bugs that need the operator, tell the user to use /report followed by the problem. For payment issues use /paysupport.",
        "For navigation, use the supplied official Worldz links and commands.",
        `RUNTIME CONTEXT JSON: ${JSON.stringify(context)}`
      ].join(" "),
      input: [...normalizeDipshitHistory(history), { role: "user", content: String(message || "").slice(0, 1200) }]
    }),
    signal: AbortSignal.timeout(30000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("dipshit_ai_unavailable");
  return extractDipshitResponseText(payload) || "Tell me what is broken and what you expected to happen. I'll work through it with you.";
}

function registerDipshitConversation({
  bot,
  config,
  starsEnabled,
  solEnabled,
  send,
  privacyUrl,
  termsUrl,
  supabase = null,
  fetchImpl = fetch
}) {
  const openaiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const model = String(process.env.DIPSHIT_OPENAI_MODEL || process.env.ONEWORLDZ_OPENAI_MODEL || "gpt-4o-mini").trim();
  const botUsername = String(process.env.DIPSHIT_BOT_USERNAME || DEFAULT_BOT_USERNAME).replace(/^@/, "");
  const aiEnabled = Boolean(openaiKey);
  const conversations = new Map();

  const remember = (key, role, content) => {
    if (!conversations.has(key) && conversations.size >= 500) {
      const oldest = conversations.keys().next().value;
      if (oldest) conversations.delete(oldest);
    }
    conversations.set(key, [...(conversations.get(key) || []), { role, content }].slice(-8));
  };

  const chatAllowsConversation = async (msg) => {
    const chatType = String(msg?.chat?.type || "");
    if (!supabase || chatType === "private") return true;
    try {
      const { data, error } = await supabase
        .from("zed_chat_settings")
        .select("dipshit_enabled")
        .eq("chat_id", Number(msg.chat.id))
        .maybeSingle();
      if (error) throw error;
      return data ? data.dipshit_enabled !== false : true;
    } catch {
      return true;
    }
  };

  const handleConversation = async (msg, suppliedText) => {
    if (!(await chatAllowsConversation(msg))) return undefined;
    const raw = String(suppliedText == null ? msg?.text || "" : suppliedText).trim();
    const message = stripDipshitAddressing(raw, botUsername);
    if (!message) {
      return send(msg.chat.id, "💙 I'm here. Tell me what's broken, what you're trying to do, or ask me where something is in Worldz.");
    }
    if (!aiEnabled) {
      return send(msg.chat.id, "⚙️ I can hear normal messages, but my conversational AI key is not connected on this runtime yet. Use /check for QA or /report <problem> to send the issue to the Worldz operator.");
    }

    const key = `${msg.chat.id}:${msg.from?.id || "unknown"}`;
    const history = conversations.get(key) || [];
    const context = {
      runtime_online: true,
      natural_chat_listener: true,
      conversational_ai: aiEnabled,
      support_relay: Boolean(config.ownerTelegramId),
      stars_membership: Boolean(starsEnabled),
      sol_membership: Boolean(solEnabled),
      chat_type: msg.chat?.type || "unknown",
      official_links: {
        cryptoworldz: "https://cryptoworldz.xyz/",
        command_centre: "https://cryptobotz.cryptoworldz.xyz/miniapp/",
        inbox: "https://cryptobotz.cryptoworldz.xyz/miniapp/#inbox",
        dipshit: "https://cryptoworldz.xyz/dipshit/",
        privacy: privacyUrl,
        terms: termsUrl
      },
      support_commands: ["/status", "/check", "/fix <problem>", "/report <problem>", "/paysupport <message>"]
    };

    try {
      if (typeof bot.sendChatAction === "function") bot.sendChatAction(msg.chat.id, "typing").catch(() => {});
      const answer = await callDipshitAI({ apiKey: openaiKey, model, message, history, context, fetchImpl });
      remember(key, "user", message);
      remember(key, "assistant", answer);
      return send(msg.chat.id, `💙 ${answer.slice(0, 3800)}`);
    } catch (error) {
      console.error("DIPSHIT conversational reply failed", {
        name: error?.name || "Error",
        code: error?.message || "unknown"
      });
      return send(msg.chat.id, "⚠️ My conversational brain hit a problem. /check still works, and /report <problem> will send the issue to the Worldz operator.");
    }
  };

  bot.onText(/^\/ask(?:@\w+)?(?:\s+([\s\S]+))?$/, (msg, match) => {
    const question = String(match && match[1] || "").trim();
    return question
      ? handleConversation(msg, question)
      : send(msg.chat.id, "💙 Ask me anything about a Worldz problem after /ask — or just talk to me normally.");
  });

  bot.on("message", async (msg) => {
    if (!shouldHandleDipshitConversation(msg, botUsername)) return;
    return handleConversation(msg);
  });

  return { aiEnabled, botUsername, handleConversation };
}

module.exports = {
  callDipshitAI,
  extractDipshitResponseText,
  moderationRequiresHardBlock,
  normalizeDipshitHistory,
  registerDipshitConversation,
  shouldHandleDipshitConversation,
  stripDipshitAddressing
};
