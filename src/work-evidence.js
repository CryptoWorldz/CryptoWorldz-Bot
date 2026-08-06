const WORK_EVIDENCE_COMMANDS = Object.freeze([
  { command: "workstart", description: "Start a verified owner work session" },
  { command: "workstop", description: "Stop the current work session" },
  { command: "workevidence", description: "View recorded project evidence" }
]);

const WORK_START_PATTERN = /^\/workstart(?:@\w+)?(?:\s+([\s\S]+))?$/i;
const WORK_STOP_PATTERN = /^\/workstop(?:@\w+)?(?:\s+([\s\S]+))?$/i;
const EVIDENCE_PATTERN = /^\/evidence(?:@\w+)?(?:\s+([a-z_]+)\s*\|\s*([^|]+?)\s*\|\s*(recorded|success|failure|partial)(?:\s*\|\s*([\s\S]+))?)?$/i;
const CATEGORIES = new Set(["commit", "pull_request", "workflow", "deployment", "test", "design", "administration", "expense", "other"]);

function formatDuration(minutes) {
  const value = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(value / 60);
  const remainder = value % 60;
  if (!hours) return `${remainder} minutes`;
  return `${hours}h ${remainder}m`;
}

function registerWorkEvidenceHandlers({ bot, config, supabase }) {
  const ownerAllowed = (msg) => String(msg && msg.from && msg.from.id) === String(config.ownerTelegramId);
  const send = (chatId, text) => bot.sendMessage(chatId, text);

  bot.onText(WORK_START_PATTERN, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");
    const description = String((match && match[1]) || "").trim();
    if (description.length < 3 || description.length > 500) {
      return send(msg.chat.id, "❌ Use: /workstart clear description of the work being started");
    }
    try {
      const { data, error } = await supabase
        .from("owner_work_sessions")
        .insert({ owner_telegram_id: Number(msg.from.id), description, status: "open", self_reported: false })
        .select("id,description,started_at")
        .single();
      if (error && error.code === "23505") return send(msg.chat.id, "⏱ A work session is already open. Use /workstop before starting another.");
      if (error) throw error;
      return send(msg.chat.id, `⏱ Work session #${data.id} started.\n\n${data.description}\nStarted: ${new Date(data.started_at).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}\n\nOnly real elapsed time is recorded; Zed never invents historical hours.`);
    } catch {
      return send(msg.chat.id, "❌ Zed couldn't start the work-evidence session.");
    }
  });

  bot.onText(WORK_STOP_PATTERN, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");
    const note = String((match && match[1]) || "").trim().slice(0, 1000);
    try {
      const { data: open, error: loadError } = await supabase
        .from("owner_work_sessions")
        .select("id,description,started_at")
        .eq("owner_telegram_id", Number(msg.from.id))
        .eq("status", "open")
        .maybeSingle();
      if (loadError) throw loadError;
      if (!open) return send(msg.chat.id, "⏱ No open work session was found.");
      const endedAt = new Date();
      const startedAt = new Date(open.started_at);
      const durationMinutes = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
      const { error } = await supabase
        .from("owner_work_sessions")
        .update({
          ended_at: endedAt.toISOString(),
          duration_minutes: durationMinutes,
          status: "completed",
          evidence_note: note,
          updated_at: endedAt.toISOString()
        })
        .eq("id", open.id);
      if (error) throw error;
      return send(msg.chat.id, `✅ Work session #${open.id} completed.\n\n${open.description}\nVerified elapsed time: ${formatDuration(durationMinutes)}${note ? `\nEvidence note: ${note}` : ""}`);
    } catch {
      return send(msg.chat.id, "❌ Zed couldn't close the work-evidence session.");
    }
  });

  bot.onText(EVIDENCE_PATTERN, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");
    const category = String((match && match[1]) || "").toLowerCase();
    const title = String((match && match[2]) || "").trim();
    const result = String((match && match[3]) || "").toLowerCase();
    const reference = String((match && match[4]) || "").trim().slice(0, 1000);
    if (!CATEGORIES.has(category) || title.length < 3 || !["recorded", "success", "failure", "partial"].includes(result)) {
      return send(msg.chat.id, "❌ Use: /evidence commit|pull_request|workflow|deployment|test|design|administration|expense|other | title | success|failure|partial|recorded | optional reference");
    }
    try {
      const { data, error } = await supabase
        .from("owner_delivery_evidence")
        .insert({
          owner_telegram_id: Number(msg.from.id),
          category,
          title,
          result,
          evidence_reference: reference || null
        })
        .select("id,category,title,result,occurred_at")
        .single();
      if (error) throw error;
      return send(msg.chat.id, `✅ Evidence #${data.id} recorded.\n\n${data.category.toUpperCase()} • ${data.result.toUpperCase()}\n${data.title}`);
    } catch {
      return send(msg.chat.id, "❌ Zed couldn't record that evidence item.");
    }
  });

  bot.onText(/^\/workevidence(?:@\w+)?$/i, async (msg) => {
    if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");
    try {
      const [{ data: sessions, error: sessionError }, { data: evidence, error: evidenceError }] = await Promise.all([
        supabase
          .from("owner_work_sessions")
          .select("id,description,started_at,ended_at,duration_minutes,status,self_reported")
          .eq("owner_telegram_id", Number(msg.from.id))
          .order("started_at", { ascending: false })
          .limit(500),
        supabase
          .from("owner_delivery_evidence")
          .select("id,category,title,result,occurred_at")
          .eq("owner_telegram_id", Number(msg.from.id))
          .order("occurred_at", { ascending: false })
          .limit(500)
      ]);
      if (sessionError) throw sessionError;
      if (evidenceError) throw evidenceError;
      const completed = (sessions || []).filter((item) => item.status === "completed");
      const minutes = completed.reduce((sum, item) => sum + (Number(item.duration_minutes) || 0), 0);
      const successful = (evidence || []).filter((item) => item.result === "success").length;
      const categories = new Map();
      for (const item of evidence || []) categories.set(item.category, (categories.get(item.category) || 0) + 1);
      const categoryRows = [...categories.entries()].map(([category, count]) => `• ${category}: ${count}`).join("\n") || "• No delivery evidence recorded yet";
      return send(
        msg.chat.id,
        `📚 JayJayTeamDev Work Evidence\n\n⏱ Completed timed sessions: ${completed.length}\n🕒 Verified elapsed time: ${formatDuration(minutes)}\n📦 Delivery evidence items: ${(evidence || []).length}\n✅ Successful evidence items: ${successful}\n\nEvidence categories:\n${categoryRows}\n\nThis ledger is suitable for building a factual TAG/Centrelink support package. It records only verified elapsed sessions and explicitly entered evidence; previous hours are not reconstructed or guessed.\n\nA Centrelink advance assessment must remain separate from crypto purchases, token rewards and speculative wallet funding.`
      );
    } catch {
      return send(msg.chat.id, "❌ Zed couldn't load the work-evidence summary.");
    }
  });
}

module.exports = {
  CATEGORIES,
  EVIDENCE_PATTERN,
  WORK_EVIDENCE_COMMANDS,
  WORK_START_PATTERN,
  WORK_STOP_PATTERN,
  formatDuration,
  registerWorkEvidenceHandlers
};
