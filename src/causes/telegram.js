const { formatCause, parseCausePayload } = require("./core");

const CAUSE_COMMANDS = [
  { command: "cause_add", description: "Add an approved cause to the Impact register" },
  { command: "causes", description: "View active Impact causes" },
  { command: "cause", description: "View one Impact cause" }
];

function registerCauseTelegramHandlers({ bot, repository, supabase, config }) {
  const send = (msg, text, options) => bot.sendMessage(msg.chat.id, text, options);
  const editorAllowed = (msg) => repository.hasPermission(
    msg.from.id,
    "communication.broadcast",
    config.adminTelegramIds,
    config.ownerTelegramId
  );

  async function findCause(slug) {
    const { data, error } = await supabase
      .from("impact_causes")
      .select("id,slug,cause,organiser,location,needs,priority,platforms,tracking,approval_required,fundraiser_url,facebook_url,status,created_by,created_at,updated_at")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  bot.onText(/^\/cause_add(?:@\w+)?(?:\s+([\s\S]+))?$/, async (msg, match) => {
    if (!(await editorAllowed(msg))) {
      return send(msg, "⛔ Command Centre communications access required.");
    }

    const parsed = parseCausePayload(match?.[1]);
    if (!parsed.ok) {
      return send(msg, [
        `❌ ${parsed.error}`,
        "",
        "Use:",
        "/cause_add",
        "Cause: The Davis Family",
        "Organiser: Teighlor Davis",
        "Location: Mityana, Uganda",
        "Needs: Rent, food, medication and school supplies",
        "Priority: Urgent",
        "Platforms: Facebook, X and Telegram",
        "Tracking: JayJayTeamDev unique GoFundMe share link",
        "Approval: Owner required before publishing",
        "Fundraiser: https://...",
        "Facebook: https://..."
      ].join("\n"));
    }

    try {
      const value = parsed.value;
      const existing = await findCause(value.slug);
      const payload = {
        slug: value.slug,
        cause: value.cause,
        organiser: value.organiser,
        location: value.location,
        needs: value.needs,
        priority: value.priority,
        platforms: value.platforms,
        tracking: value.tracking,
        approval_required: value.approvalRequired,
        fundraiser_url: value.fundraiserUrl || existing?.fundraiser_url || null,
        facebook_url: value.facebookUrl || existing?.facebook_url || null,
        status: "active",
        created_by: existing?.created_by || msg.from.id,
        updated_by: msg.from.id,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("impact_causes")
        .upsert(payload, { onConflict: "slug" })
        .select("id,slug,cause,organiser,location,needs,priority,platforms,tracking,approval_required,fundraiser_url,facebook_url,status")
        .single();
      if (error) throw error;

      await repository.recordHistory({
        missionId: null,
        action: existing ? "impact_cause_updated" : "impact_cause_registered",
        actorTelegramId: msg.from.id,
        details: {
          slug: data.slug,
          priority: data.priority,
          platforms: data.platforms,
          approval_required: data.approval_required
        }
      });

      return send(msg, [
        formatCause(data, existing ? "✅ Impact Cause Updated" : "✅ Impact Cause Registered"),
        "",
        data.approval_required
          ? "🔒 Grace may prepare drafts, but nothing may publish without Owner approval."
          : "Grace publishing remains controlled by the normal approval workflow."
      ].join("\n"));
    } catch (error) {
      console.error("Cause add command failed", { name: error?.name || "Error" });
      return send(msg, "❌ Zed could not save that cause to the Impact register.");
    }
  });

  bot.onText(/^\/causes(?:@\w+)?$/, async (msg) => {
    try {
      const { data, error } = await supabase
        .from("impact_causes")
        .select("slug,cause,location,priority,platforms,approval_required")
        .eq("status", "active")
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!data?.length) return send(msg, "💜 Impact Causes\n\nNo active causes are registered yet.");
      const rows = data.map((cause) => [
        `• ${cause.cause} — ${String(cause.priority).toUpperCase()}`,
        `  ${cause.location}`,
        `  /cause ${cause.slug}`,
        cause.approval_required ? "  🔒 Owner approval required" : ""
      ].filter(Boolean).join("\n"));
      return send(msg, `💜 CryptoWorldz Impact Causes\n\n${rows.join("\n\n")}`);
    } catch (error) {
      console.error("Causes command failed", { name: error?.name || "Error" });
      return send(msg, "❌ Zed could not load the Impact cause register.");
    }
  });

  bot.onText(/^\/cause(?:@\w+)?(?:\s+([a-z0-9-]+))?$/, async (msg, match) => {
    const slug = String(match?.[1] || "").trim();
    if (!slug) return send(msg, "❌ Use: /cause cause-id\nExample: /cause the-davis-family");
    try {
      const cause = await findCause(slug);
      return cause
        ? send(msg, formatCause(cause))
        : send(msg, "❌ That cause is not in the Impact register.");
    } catch (error) {
      console.error("Cause command failed", { name: error?.name || "Error" });
      return send(msg, "❌ Zed could not load that cause.");
    }
  });
}

module.exports = { CAUSE_COMMANDS, registerCauseTelegramHandlers };
