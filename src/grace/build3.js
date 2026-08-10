const EXECUTIVE_IDS = new Set(["8029135300", "7615025841", "8604306923", "5978625584"]);
const AD_PLATFORMS = new Set(["facebook", "instagram", "x", "youtube", "tiktok", "other"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseCampaignInput(raw) {
  const [name = "", ...rest] = String(raw || "").split("|").map((x) => x.trim());
  const objective = rest.join(" | ").trim();
  if (!name || name.length > 120) return { ok: false, error: "Campaign name must be 1-120 characters." };
  if (!objective || objective.length > 1000) return { ok: false, error: "Campaign objective must be 1-1000 characters." };
  return { ok: true, value: { name, objective } };
}

function parseBudgetInput(raw) {
  const parts = String(raw || "").split("|").map((x) => x.trim()).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) return { ok: false, error: "Use: /adbudget CAMPAIGN_ID | platform | amount | USD" };
  const [campaignId, platformRaw, amountRaw, currencyRaw = "USD"] = parts;
  const platform = platformRaw.toLowerCase();
  const amount = Number(amountRaw);
  const currency = currencyRaw.toUpperCase();
  if (!UUID.test(campaignId)) return { ok: false, error: "A valid campaign UUID is required." };
  if (!AD_PLATFORMS.has(platform)) return { ok: false, error: `Platform must be one of: ${[...AD_PLATFORMS].join(", ")}.` };
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return { ok: false, error: "Budget amount must be greater than 0 and no more than 1,000,000." };
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: "Currency must be a 3-letter code such as USD or AUD." };
  return { ok: true, value: { campaignId, platform, amount: Number(amount.toFixed(2)), currency } };
}

function registerGraceBuild3Handlers({ bot, repository, supabase, config }) {
  const send = (msg, text) => bot.sendMessage(msg.chat.id, text);
  const ownerId = String(config.ownerTelegramId || "");
  const actorId = (msg) => String(msg.from?.id || "");
  const ownerOnly = (msg) => actorId(msg) === ownerId;
  const executive = (msg) => ownerOnly(msg) || EXECUTIVE_IDS.has(actorId(msg));

  async function workspace() {
    const slug = String(process.env.GRACE_WORKSPACE_SLUG || "cryptoworldz").trim().toLowerCase();
    const { data, error } = await supabase.from("grace_workspaces").select("id,slug,name").eq("slug", slug).eq("status", "active").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Grace workspace '${slug}' was not found.`);
    return data;
  }

  async function audit(wsId, action, msg, details = {}) {
    const { error } = await supabase.from("grace_audit_log").insert({ workspace_id: wsId, action, actor_telegram_id: Number(actorId(msg)), details });
    if (error) throw error;
  }

  bot.onText(/^\/gracepower(?:@\w+)?$/, async (msg) => {
    if (!executive(msg)) return send(msg, "⛔ Grace Stage 3 is restricted to the Executive team.");
    try {
      const ws = await workspace();
      const [{ count: campaigns, error: cErr }, { count: budgets, error: bErr }] = await Promise.all([
        supabase.from("grace_campaigns").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id),
        supabase.from("grace_ad_budgets").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id)
      ]);
      if (cErr) throw cErr;
      if (bErr) throw bErr;
      return send(msg, [
        "⚡ GRACE STAGE 3 — POWER UPGRADE",
        "",
        "Campaign Centre: LIVE ✅",
        "Analytics: LIVE ✅",
        "Campaign planning: LIVE ✅",
        "Ads Centre budget controls: LIVE ✅",
        "Automatic ad spend: LOCKED 🔒",
        `AI provider key: ${process.env.OPENAI_API_KEY ? "CONFIGURED ✅" : "NOT CONFIGURED — planner still works"}`,
        "",
        `Campaigns: ${campaigns || 0}`,
        `Ad budgets: ${budgets || 0}`,
        "",
        "/campaigncreate Name | Objective",
        "/campaigns",
        "/graceanalytics 7",
        "/adbudget CAMPAIGN_ID | platform | amount | USD",
        "/adapprove BUDGET_ID",
        "",
        "Budget approval records authority only. It never launches or spends on an ad platform by itself."
      ].join("\n"));
    } catch (error) {
      console.error("Grace Build 3 status failed", { name: error?.name || "Error" });
      return send(msg, "❌ Grace Stage 3 status is unavailable.");
    }
  });

  bot.onText(/^\/campaigncreate(?:@\w+)?(?:\s+([\s\S]+))?$/, async (msg, match) => {
    if (!executive(msg)) return send(msg, "⛔ Executive Grace access required.");
    const parsed = parseCampaignInput(match?.[1]);
    if (!parsed.ok) return send(msg, `❌ ${parsed.error}\nUse: /campaigncreate Name | Objective`);
    try {
      const ws = await workspace();
      const { data, error } = await supabase.from("grace_campaigns").insert({
        workspace_id: ws.id,
        name: parsed.value.name,
        objective: parsed.value.objective,
        status: "draft",
        created_by: Number(actorId(msg)),
        metadata: { source: "grace_stage3", planner: "command_centre" }
      }).select("id,name,objective,status,created_at").single();
      if (error) throw error;
      await audit(ws.id, "grace_stage3_campaign_created", msg, { campaign_id: data.id, name: data.name });
      return send(msg, [
        "✅ Grace Campaign Created",
        "",
        `Name: ${data.name}`,
        `Campaign ID: ${data.id}`,
        `Status: ${data.status.toUpperCase()}`,
        `Objective: ${data.objective}`,
        "",
        "Campaign remains a draft until explicitly approved/activated."
      ].join("\n"));
    } catch (error) {
      console.error("Grace Build 3 campaign create failed", { name: error?.name || "Error" });
      return send(msg, "❌ Grace could not create that campaign.");
    }
  });

  bot.onText(/^\/campaigns(?:@\w+)?$/, async (msg) => {
    if (!executive(msg)) return send(msg, "⛔ Executive Grace access required.");
    try {
      const ws = await workspace();
      const { data, error } = await supabase.from("grace_campaigns").select("id,name,status,objective,created_at").eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      const rows = (data || []).map((x) => `• ${x.name} — ${String(x.status).toUpperCase()}\n  ${x.id}`);
      return send(msg, `📣 Grace Campaign Centre\n\n${rows.join("\n") || "No campaigns yet."}`);
    } catch (error) {
      console.error("Grace Build 3 campaign list failed", { name: error?.name || "Error" });
      return send(msg, "❌ Grace could not load campaigns.");
    }
  });

  bot.onText(/^\/graceanalytics(?:@\w+)?(?:\s+(\d+))?$/, async (msg, match) => {
    if (!executive(msg)) return send(msg, "⛔ Executive Grace access required.");
    const days = Math.max(1, Math.min(Number(match?.[1] || 7), 90));
    try {
      const ws = await workspace();
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [{ data: results, error: rErr }, { data: growth, error: gErr }] = await Promise.all([
        supabase.from("grace_publish_results").select("status,actual_cost_usd,created_at").eq("workspace_id", ws.id).gte("created_at", since),
        supabase.from("grace_growth_snapshots").select("followers,views,engagements,recorded_at").eq("workspace_id", ws.id).gte("recorded_at", since).order("recorded_at", { ascending: true })
      ]);
      if (rErr) throw rErr;
      if (gErr) throw gErr;
      const counts = {};
      let spend = 0;
      for (const row of results || []) {
        counts[row.status] = (counts[row.status] || 0) + 1;
        spend += Number(row.actual_cost_usd || 0);
      }
      const first = growth?.[0] || null;
      const last = growth?.at(-1) || null;
      const followerDelta = first && last ? Number(last.followers || 0) - Number(first.followers || 0) : 0;
      const viewsDelta = first && last ? Number(last.views || 0) - Number(first.views || 0) : 0;
      const engagementDelta = first && last ? Number(last.engagements || 0) - Number(first.engagements || 0) : 0;
      return send(msg, [
        `📊 Grace Analytics — ${days} Day${days === 1 ? "" : "s"}`,
        "",
        `Publish results: ${(results || []).length}`,
        `Succeeded: ${counts.success || counts.published || 0}`,
        `Failed: ${counts.failed || counts.error || 0}`,
        `Recorded API cost: $${spend.toFixed(2)} USD`,
        "",
        `Follower change: ${followerDelta >= 0 ? "+" : ""}${followerDelta}`,
        `View change: ${viewsDelta >= 0 ? "+" : ""}${viewsDelta}`,
        `Engagement change: ${engagementDelta >= 0 ? "+" : ""}${engagementDelta}`
      ].join("\n"));
    } catch (error) {
      console.error("Grace Build 3 analytics failed", { name: error?.name || "Error" });
      return send(msg, "❌ Grace analytics are unavailable.");
    }
  });

  bot.onText(/^\/adbudget(?:@\w+)?(?:\s+([\s\S]+))?$/, async (msg, match) => {
    if (!ownerOnly(msg)) return send(msg, "⛔ Only JayJayTeamDev can create an advertising budget.");
    const parsed = parseBudgetInput(match?.[1]);
    if (!parsed.ok) return send(msg, `❌ ${parsed.error}`);
    try {
      const ws = await workspace();
      const { data: campaign, error: campaignError } = await supabase.from("grace_campaigns").select("id,name").eq("workspace_id", ws.id).eq("id", parsed.value.campaignId).maybeSingle();
      if (campaignError) throw campaignError;
      if (!campaign) return send(msg, "❌ That Grace campaign was not found.");
      const { data, error } = await supabase.from("grace_ad_budgets").insert({
        workspace_id: ws.id,
        campaign_id: campaign.id,
        platform: parsed.value.platform,
        currency: parsed.value.currency,
        budget_total: parsed.value.amount,
        spend_to_date: 0,
        status: "draft",
        created_by: Number(actorId(msg))
      }).select("id,platform,currency,budget_total,status").single();
      if (error) throw error;
      await audit(ws.id, "grace_stage3_ad_budget_created", msg, { budget_id: data.id, campaign_id: campaign.id, amount: parsed.value.amount, currency: parsed.value.currency, platform: parsed.value.platform });
      return send(msg, [
        "💰 Grace Ads Centre — Budget Draft",
        "",
        `Campaign: ${campaign.name}`,
        `Budget ID: ${data.id}`,
        `Platform: ${data.platform}`,
        `Budget: ${data.currency} ${Number(data.budget_total).toFixed(2)}`,
        `Status: ${data.status.toUpperCase()}`,
        "",
        `Approve record: /adapprove ${data.id}`,
        "",
        "🔒 No ad-platform spend can occur from this action."
      ].join("\n"));
    } catch (error) {
      console.error("Grace Build 3 ad budget failed", { name: error?.name || "Error" });
      return send(msg, "❌ Grace could not create that ad budget.");
    }
  });

  bot.onText(/^\/adapprove(?:@\w+)?(?:\s+(\d+))?$/, async (msg, match) => {
    if (!ownerOnly(msg)) return send(msg, "⛔ Only JayJayTeamDev can approve advertising budgets.");
    const budgetId = Number(match?.[1]);
    if (!Number.isSafeInteger(budgetId) || budgetId < 1) return send(msg, "❌ Use: /adapprove BUDGET_ID");
    try {
      const ws = await workspace();
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("grace_ad_budgets").update({ status: "approved", approved_by: Number(actorId(msg)), approved_at: now, updated_at: now }).eq("workspace_id", ws.id).eq("id", budgetId).eq("status", "draft").select("id,campaign_id,platform,currency,budget_total,status").maybeSingle();
      if (error) throw error;
      if (!data) return send(msg, "❌ That budget was not found or is no longer a draft.");
      await audit(ws.id, "grace_stage3_ad_budget_approved", msg, { budget_id: data.id, campaign_id: data.campaign_id, platform: data.platform, amount: Number(data.budget_total), currency: data.currency });
      return send(msg, [
        "✅ Grace Ad Budget Approved",
        "",
        `Budget ID: ${data.id}`,
        `Platform: ${data.platform}`,
        `Limit: ${data.currency} ${Number(data.budget_total).toFixed(2)}`,
        "",
        "🔒 Approval is recorded, but automatic ad spend remains disabled until a provider ad connector and a separate launch authorization exist."
      ].join("\n"));
    } catch (error) {
      console.error("Grace Build 3 ad approve failed", { name: error?.name || "Error" });
      return send(msg, "❌ Grace could not approve that ad budget.");
    }
  });
}

module.exports = {
  AD_PLATFORMS,
  EXECUTIVE_IDS,
  parseBudgetInput,
  parseCampaignInput,
  registerGraceBuild3Handlers
};
