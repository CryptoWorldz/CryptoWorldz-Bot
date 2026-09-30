const {
  ensureGroup,
  isGroup,
  moduleAvailable,
  owner,
  recordAnalytics,
  telegramAdmin
} = require("./community-suite-core");

function formatTicket(ticket) {
  if (!ticket) return "Ticket not found.";
  return [
    `🎫 TICKET #${ticket.id}`,
    `Status: ${String(ticket.status || "").toUpperCase()} • Priority: ${String(ticket.priority || "normal").toUpperCase()}`,
    `Subject: ${ticket.subject}`,
    "",
    String(ticket.body || ""),
    ticket.resolution ? `\nLatest admin response:\n${ticket.resolution}` : ""
  ].join("\n");
}

function registerAliceSupport({ bot, config, supabase }) {
  const send = (message, text, options) => bot.sendMessage(message.chat.id, text, options);
  const requireAdmin = async (message) => owner(message, config) || await telegramAdmin(bot, message);

  async function available(message) {
    if (!isGroup(message)) return false;
    await ensureGroup(supabase, message, config);
    return moduleAvailable(supabase, message.chat.id, "alice_support");
  }

  bot.onText(/^\/alice(?:@\w+)?$/i, async (message) => {
    try {
      if (!isGroup(message)) return send(message, "📥 ALICE™ Support runs inside each customer community. Open /alice in the group.");
      if (!(await available(message))) return send(message, "⏸ ALICE Support is switched off for this community.");
      await recordAnalytics(supabase, message.chat.id, message.from.id, "alice_open");
      return send(message, [
        "📥 ALICE™ — COMMUNITY SUPPORT",
        "",
        "Questions • tickets • status • escalation",
        "",
        "Create: /ticket SUBJECT | MESSAGE",
        "View: /ticketstatus ID",
        "Add reply: /ticketreply ID | MESSAGE",
        "My open tickets: /mytickets",
        "",
        "Admins: /tickets • /ticketclose ID | RESOLUTION",
        "ALICE keeps support separate from public chat and escalates unresolved issues to human admins."
      ].join("\n"));
    } catch {
      return send(message, "❌ ALICE could not open.");
    }
  });

  bot.onText(/^\/support(?:@\w+)?(?:\s+([\s\S]+))?$/i, async (message, match) => {
    try {
      if (!isGroup(message)) return send(message, "📥 Use /support inside the community group.");
      if (!(await available(message))) return send(message, "⏸ ALICE Support is switched off.");
      const body = String(match?.[1] || "").trim();
      if (!body) return send(message, "📥 Tell ALICE what you need: /support your question\n\nFor a tracked case use /ticket SUBJECT | MESSAGE.");
      await recordAnalytics(supabase, message.chat.id, message.from.id, "alice_support_question", { preview: body.slice(0, 80) });
      return send(message, [
        "📥 ALICE™",
        "",
        "I’ve logged this as a support interaction.",
        "For anything that needs a human answer or follow-up, create a tracked ticket:",
        "",
        `/ticket Support Request | ${body.slice(0, 1500)}`
      ].join("\n"));
    } catch {
      return send(message, "❌ ALICE could not process that support request.");
    }
  });

  bot.onText(/^\/ticket(?:@\w+)?\s+([\s\S]+)$/i, async (message, match) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Create the ticket inside the community group.");
      if (!(await available(message))) return send(message, "⏸ ALICE Support is switched off.");
      const parts = String(match[1]).split("|");
      const subject = String(parts.shift() || "").trim();
      const body = parts.join("|").trim();
      if (!subject || !body) return send(message, "❌ Use /ticket SUBJECT | MESSAGE");
      if (subject.length > 120 || body.length > 3000) return send(message, "❌ Keep the subject under 120 characters and message under 3000.");
      const { data, error } = await supabase.from("community_suite_tickets").insert({
        chat_id: Number(message.chat.id),
        telegram_id: Number(message.from.id),
        subject,
        body,
        status: "open",
        priority: "normal"
      }).select("*").single();
      if (error) throw error;
      await supabase.from("community_suite_ticket_messages").insert({
        ticket_id: data.id,
        author_telegram_id: Number(message.from.id),
        author_role: "member",
        body
      });
      await recordAnalytics(supabase, message.chat.id, message.from.id, "ticket_created", { ticketId: data.id });
      return send(message, `🎫 ALICE created Ticket #${data.id}.\n\nSubject: ${subject}\nStatus: OPEN\n\nUse /ticketstatus ${data.id} any time.`);
    } catch (error) {
      console.error("ALICE ticket create failed", { code: error?.code || error?.message || "unknown" });
      return send(message, "❌ ALICE could not create that ticket.");
    }
  });

  bot.onText(/^\/mytickets(?:@\w+)?$/i, async (message) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Open your tickets inside the community group.");
      if (!(await available(message))) return send(message, "⏸ ALICE Support is switched off.");
      const { data, error } = await supabase.from("community_suite_tickets")
        .select("id,subject,status,priority,created_at")
        .eq("chat_id", Number(message.chat.id))
        .eq("telegram_id", Number(message.from.id))
        .in("status", ["open","pending","resolved"])
        .order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      const lines = (data || []).map((row) => `#${row.id} • ${row.status.toUpperCase()} • ${row.subject}`);
      return send(message, `📥 MY ALICE TICKETS\n\n${lines.join("\n") || "No open tickets."}`);
    } catch {
      return send(message, "❌ ALICE could not load your tickets.");
    }
  });

  bot.onText(/^\/ticketstatus(?:@\w+)?\s+(\d+)$/i, async (message, match) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Check the ticket inside the community group.");
      if (!(await available(message))) return send(message, "⏸ ALICE Support is switched off.");
      const id = Number(match[1]);
      const admin = await requireAdmin(message);
      let query = supabase.from("community_suite_tickets").select("*").eq("id", id).eq("chat_id", Number(message.chat.id));
      if (!admin) query = query.eq("telegram_id", Number(message.from.id));
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (!data) return send(message, "❌ Ticket not found or not visible to this account.");
      const { data: messages } = await supabase.from("community_suite_ticket_messages")
        .select("author_role,body,created_at").eq("ticket_id", id).order("created_at").limit(12);
      const thread = (messages || []).map((row) => `${row.author_role === "admin" ? "🛡 Admin" : row.author_role === "ai" ? "📥 ALICE" : "👤 Member"}: ${String(row.body).slice(0, 800)}`).join("\n\n");
      return send(message, `${formatTicket(data)}\n\nTHREAD\n${thread || "No messages."}`);
    } catch {
      return send(message, "❌ ALICE could not load that ticket.");
    }
  });

  bot.onText(/^\/ticketreply(?:@\w+)?\s+(\d+)\s*\|\s*([\s\S]+)$/i, async (message, match) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Reply inside the community group.");
      if (!(await available(message))) return send(message, "⏸ ALICE Support is switched off.");
      const id = Number(match[1]);
      const body = String(match[2] || "").trim();
      if (!body || body.length > 3000) return send(message, "❌ Reply must be 1–3000 characters.");
      const admin = await requireAdmin(message);
      let query = supabase.from("community_suite_tickets").select("*").eq("id", id).eq("chat_id", Number(message.chat.id));
      if (!admin) query = query.eq("telegram_id", Number(message.from.id));
      const { data: ticket, error } = await query.maybeSingle();
      if (error) throw error;
      if (!ticket) return send(message, "❌ Ticket not found or not visible to this account.");
      await supabase.from("community_suite_ticket_messages").insert({
        ticket_id: id,
        author_telegram_id: Number(message.from.id),
        author_role: admin ? "admin" : "member",
        body
      });
      const patch = admin
        ? { status: "pending", resolution: body, assigned_to: Number(message.from.id), updated_at: new Date().toISOString() }
        : { status: "open", updated_at: new Date().toISOString() };
      await supabase.from("community_suite_tickets").update(patch).eq("id", id);
      await recordAnalytics(supabase, message.chat.id, message.from.id, "ticket_reply", { ticketId: id, admin });
      return send(message, `✅ Reply added to Ticket #${id}.`);
    } catch {
      return send(message, "❌ ALICE could not add that reply.");
    }
  });

  bot.onText(/^\/tickets(?:@\w+)?$/i, async (message) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Ticket queue belongs inside the group.");
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      if (!(await available(message))) return send(message, "⏸ ALICE Support is switched off.");
      const { data, error } = await supabase.from("community_suite_tickets")
        .select("id,telegram_id,subject,status,priority,created_at")
        .eq("chat_id", Number(message.chat.id))
        .in("status", ["open","pending"])
        .order("created_at").limit(20);
      if (error) throw error;
      const lines = (data || []).map((row) => `#${row.id} • ${row.priority.toUpperCase()} • ${row.status.toUpperCase()} • ${row.subject} • user ${row.telegram_id}`);
      return send(message, `📥 ALICE ADMIN QUEUE\n\n${lines.join("\n") || "No open tickets."}\n\nReply: /ticketreply ID | MESSAGE\nClose: /ticketclose ID | RESOLUTION`);
    } catch {
      return send(message, "❌ ALICE could not load the admin queue.");
    }
  });

  bot.onText(/^\/ticketclose(?:@\w+)?\s+(\d+)\s*\|\s*([\s\S]+)$/i, async (message, match) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Close tickets inside the group.");
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const id = Number(match[1]);
      const resolution = String(match[2] || "").trim();
      if (!resolution) return send(message, "❌ Use /ticketclose ID | RESOLUTION");
      const { data: ticket, error } = await supabase.from("community_suite_tickets")
        .select("*").eq("id", id).eq("chat_id", Number(message.chat.id)).maybeSingle();
      if (error) throw error;
      if (!ticket) return send(message, "❌ Ticket not found.");
      await supabase.from("community_suite_ticket_messages").insert({
        ticket_id: id,
        author_telegram_id: Number(message.from.id),
        author_role: "admin",
        body: resolution
      });
      await supabase.from("community_suite_tickets").update({
        status: "closed",
        resolution,
        assigned_to: Number(message.from.id),
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", id);
      await recordAnalytics(supabase, message.chat.id, message.from.id, "ticket_closed", { ticketId: id });
      return send(message, `✅ Ticket #${id} closed.`);
    } catch {
      return send(message, "❌ ALICE could not close that ticket.");
    }
  });

  return { formatTicket };
}

module.exports = { formatTicket, registerAliceSupport };
