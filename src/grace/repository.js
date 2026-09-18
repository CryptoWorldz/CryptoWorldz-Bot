const { secretReferenceFor } = require("./core");

function createGraceRepository(supabase, options = {}) {
  const workspaceSlug = options.workspaceSlug || "cryptoworldz";
  let workspaceCache = null;

  async function getWorkspace() {
    if (workspaceCache) return workspaceCache;
    const { data, error } = await supabase
      .from("grace_workspaces")
      .select("*")
      .eq("slug", workspaceSlug)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Grace workspace '${workspaceSlug}' was not found.`);
    workspaceCache = data;
    return data;
  }

  async function getSettings() {
    const workspace = await getWorkspace();
    const { data, error } = await supabase
      .from("grace_settings")
      .select("*")
      .eq("workspace_id", workspace.id)
      .single();
    if (error) throw error;
    return data;
  }

  async function recordAudit(action, actorTelegramId, details = {}) {
    const workspace = await getWorkspace();
    const { error } = await supabase.from("grace_audit_log").insert({
      workspace_id: workspace.id,
      action,
      actor_telegram_id: actorTelegramId || null,
      details
    });
    if (error) throw error;
  }

  async function getStatus() {
    const workspace = await getWorkspace();
    const settings = await getSettings();
    const count = async (table, apply) => {
      let query = supabase.from(table).select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id);
      if (apply) query = apply(query);
      const { count: total, error } = await query;
      if (error) throw error;
      return total || 0;
    };

    const [accounts, drafts, pending, scheduled, failed] = await Promise.all([
      count("grace_social_accounts", (query) => query.neq("status", "disabled")),
      count("grace_posts", (query) => query.eq("status", "draft")),
      count("grace_posts", (query) => query.eq("status", "pending_approval")),
      count("grace_post_targets", (query) => query.in("status", ["queued", "publishing"])),
      count("grace_post_targets", (query) => query.in("status", ["failed", "blocked"]))
    ]);

    return { workspace, settings, counts: { accounts, drafts, pending, scheduled, failed } };
  }

  async function setControlState(values, actorTelegramId, action) {
    const workspace = await getWorkspace();
    const { data, error } = await supabase
      .from("grace_settings")
      .update({ ...values, updated_by: actorTelegramId, updated_at: new Date().toISOString() })
      .eq("workspace_id", workspace.id)
      .select("*")
      .single();
    if (error) throw error;
    await recordAudit(action, actorTelegramId, values);
    return data;
  }

  const pauseAll = (actorTelegramId) => setControlState(
    { paused: true, emergency_stop: true, posting_enabled: false },
    actorTelegramId,
    "grace_emergency_pause"
  );

  const resumeAll = (actorTelegramId) => setControlState(
    { paused: false, emergency_stop: false },
    actorTelegramId,
    "grace_resume"
  );

  const setPostingEnabled = (enabled, actorTelegramId) => setControlState(
    { posting_enabled: Boolean(enabled) },
    actorTelegramId,
    enabled ? "grace_posting_enabled" : "grace_posting_disabled"
  );

  const setMonthlyBudget = (amount, actorTelegramId) => setControlState(
    { monthly_api_budget_usd: amount },
    actorTelegramId,
    "grace_budget_updated"
  );

  async function createDraft({ title, body, campaign = "", linkUrl = "", media = {}, actorTelegramId }) {
    const workspace = await getWorkspace();
    const { data, error } = await supabase
      .from("grace_posts")
      .insert({
        workspace_id: workspace.id,
        title,
        campaign,
        body,
        link_url: linkUrl || null,
        media,
        status: "draft",
        created_by: actorTelegramId
      })
      .select("*")
      .single();
    if (error) throw error;
    await recordAudit("grace_draft_created", actorTelegramId, { post_id: data.id, title });
    return data;
  }

  async function getPost(postId) {
    const workspace = await getWorkspace();
    const { data, error } = await supabase
      .from("grace_posts")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("id", postId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function listCalendar(days = 7) {
    const workspace = await getWorkspace();
    const now = new Date();
    const end = new Date(now.getTime() + Math.max(1, Math.min(Number(days) || 7, 31)) * 86400000);
    const { data, error } = await supabase
      .from("grace_posts")
      .select("id,title,status,scheduled_for,created_at,approved_at")
      .eq("workspace_id", workspace.id)
      .gte("scheduled_for", now.toISOString())
      .lte("scheduled_for", end.toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(50);
    if (error) throw error;
    return data || [];
  }

  async function listAccounts() {
    const workspace = await getWorkspace();
    const { data, error } = await supabase
      .from("grace_social_accounts")
      .select("id,platform,account_key,display_name,handle,status,credential_secret_ref,daily_post_limit,monthly_budget_usd,created_at")
      .eq("workspace_id", workspace.id)
      .order("platform", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function addAccount({ platform, accountKey, displayName, handle, actorTelegramId }) {
    const workspace = await getWorkspace();
    const credentialSecretRef = secretReferenceFor(platform, accountKey);
    const { data, error } = await supabase
      .from("grace_social_accounts")
      .insert({
        workspace_id: workspace.id,
        platform,
        account_key: accountKey,
        display_name: displayName,
        handle: handle || null,
        credential_secret_ref: credentialSecretRef,
        status: "pending_credentials",
        created_by: actorTelegramId
      })
      .select("*")
      .single();
    if (error) throw error;
    await recordAudit("grace_account_added", actorTelegramId, {
      account_id: data.id,
      platform,
      account_key: accountKey,
      credential_secret_ref: credentialSecretRef
    });
    return data;
  }

  async function setAccountStatus(accountId, status, actorTelegramId) {
    const workspace = await getWorkspace();
    const { data, error } = await supabase
      .from("grace_social_accounts")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("workspace_id", workspace.id)
      .eq("id", accountId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    await recordAudit("grace_account_status_changed", actorTelegramId, { account_id: accountId, status });
    return data;
  }

  async function schedulePost({ postId, accountIds, scheduledFor, actorTelegramId }) {
    const workspace = await getWorkspace();
    const settings = await getSettings();
    const post = await getPost(postId);
    if (!post) return { outcome: "not_found" };
    if (["published", "cancelled", "rejected"].includes(post.status)) return { outcome: "closed", post };

    const { data: accounts, error: accountError } = await supabase
      .from("grace_social_accounts")
      .select("id,status")
      .eq("workspace_id", workspace.id)
      .in("id", accountIds)
      .neq("status", "disabled");
    if (accountError) throw accountError;
    if (!accounts || accounts.length !== accountIds.length) return { outcome: "invalid_accounts" };

    const targetRows = accounts.map((account) => ({
      workspace_id: workspace.id,
      post_id: post.id,
      account_id: account.id,
      caption: post.body,
      media: post.media || {},
      scheduled_for: scheduledFor,
      status: "queued",
      next_attempt_at: scheduledFor
    }));

    const { error: targetError } = await supabase
      .from("grace_post_targets")
      .upsert(targetRows, { onConflict: "post_id,account_id" });
    if (targetError) throw targetError;

    const nextStatus = settings.approval_required ? "pending_approval" : "approved";
    const update = {
      scheduled_for: scheduledFor,
      status: nextStatus,
      updated_at: new Date().toISOString()
    };
    if (!settings.approval_required) {
      update.approved_by = actorTelegramId;
      update.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("grace_posts")
      .update(update)
      .eq("workspace_id", workspace.id)
      .eq("id", post.id)
      .select("*")
      .single();
    if (error) throw error;
    await recordAudit("grace_post_scheduled", actorTelegramId, {
      post_id: post.id,
      account_ids: accountIds,
      scheduled_for: scheduledFor,
      status: nextStatus
    });
    return { outcome: "scheduled", post: data, targetCount: accounts.length };
  }

  async function approvePost(postId, actorTelegramId) {
    const workspace = await getWorkspace();
    const { data, error } = await supabase
      .from("grace_posts")
      .update({
        status: "approved",
        approved_by: actorTelegramId,
        approved_at: new Date().toISOString(),
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq("workspace_id", workspace.id)
      .eq("id", postId)
      .in("status", ["draft", "pending_approval", "approved"])
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    await recordAudit("grace_post_approved", actorTelegramId, { post_id: postId });
    return data;
  }

  async function rejectPost(postId, reason, actorTelegramId) {
    const workspace = await getWorkspace();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("grace_posts")
      .update({
        status: "rejected",
        rejected_by: actorTelegramId,
        rejected_at: now,
        rejection_reason: reason,
        updated_at: now
      })
      .eq("workspace_id", workspace.id)
      .eq("id", postId)
      .not("status", "in", "(published,cancelled)")
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const { error: targetError } = await supabase
      .from("grace_post_targets")
      .update({ status: "cancelled", updated_at: now })
      .eq("workspace_id", workspace.id)
      .eq("post_id", postId)
      .in("status", ["queued", "blocked"]);
    if (targetError) throw targetError;
    await recordAudit("grace_post_rejected", actorTelegramId, { post_id: postId, reason });
    return data;
  }

  async function claimDueTargets(limit = 10) {
    const workspace = await getWorkspace();
    const { data, error } = await supabase.rpc("grace_claim_due_targets", {
      p_workspace_id: workspace.id,
      p_limit: Math.max(1, Math.min(Number(limit) || 10, 25))
    });
    if (error) throw error;
    return data || [];
  }

  async function getMonthlySpend() {
    const workspace = await getWorkspace();
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("grace_post_targets")
      .select("actual_cost_usd,estimated_cost_usd,status")
      .eq("workspace_id", workspace.id)
      .gte("created_at", start.toISOString())
      .in("status", ["publishing", "published"]);
    if (error) throw error;
    return (data || []).reduce((total, row) => {
      const cost = row.status === "published" ? row.actual_cost_usd : row.estimated_cost_usd;
      return total + (Number(cost) || 0);
    }, 0);
  }

  async function authorizeSpend(target, estimatedCost) {
    const settings = await getSettings();
    const spent = await getMonthlySpend();
    const workspaceRemaining = Number(settings.monthly_api_budget_usd) - spent;
    if (estimatedCost > workspaceRemaining + 1e-9) {
      return { ok: false, reason: "workspace_budget_exceeded", spent, limit: Number(settings.monthly_api_budget_usd) };
    }

    const accountLimit = Number(target.monthly_budget_usd);
    if (Number.isFinite(accountLimit) && accountLimit > 0) {
      const workspace = await getWorkspace();
      const start = new Date();
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("grace_post_targets")
        .select("actual_cost_usd,estimated_cost_usd,status")
        .eq("workspace_id", workspace.id)
        .eq("account_id", target.account_id)
        .gte("created_at", start.toISOString())
        .in("status", ["publishing", "published"]);
      if (error) throw error;
      const accountSpent = (data || []).reduce((total, row) => total + (Number(row.status === "published" ? row.actual_cost_usd : row.estimated_cost_usd) || 0), 0);
      if (accountSpent + estimatedCost > accountLimit + 1e-9) {
        return { ok: false, reason: "account_budget_exceeded", spent: accountSpent, limit: accountLimit };
      }
    }

    return { ok: true, spent, limit: Number(settings.monthly_api_budget_usd) };
  }

  async function setEstimatedCost(targetId, estimatedCost) {
    const { error } = await supabase
      .from("grace_post_targets")
      .update({ estimated_cost_usd: estimatedCost, updated_at: new Date().toISOString() })
      .eq("id", targetId);
    if (error) throw error;
  }

  async function markTargetPublished(targetId, externalPostId, actualCost) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("grace_post_targets")
      .update({
        status: "published",
        external_post_id: externalPostId || null,
        actual_cost_usd: actualCost,
        published_at: now,
        error_message: null,
        updated_at: now
      })
      .eq("id", targetId)
      .select("post_id")
      .single();
    if (error) throw error;

    const { count, error: remainingError } = await supabase
      .from("grace_post_targets")
      .select("id", { count: "exact", head: true })
      .eq("post_id", data.post_id)
      .neq("status", "published");
    if (remainingError) throw remainingError;
    if (!count) {
      const { error: postError } = await supabase
        .from("grace_posts")
        .update({ status: "published", published_at: now, updated_at: now })
        .eq("id", data.post_id);
      if (postError) throw postError;
    }
  }

  async function markTargetFailed(targetId, message, options = {}) {
    const settings = await getSettings();
    const permanent = Boolean(options.permanent);
    const { data: current, error: currentError } = await supabase
      .from("grace_post_targets")
      .select("attempt_count")
      .eq("id", targetId)
      .single();
    if (currentError) throw currentError;

    const attempts = Number(current.attempt_count) || 1;
    const exhausted = attempts >= Number(settings.max_retry_attempts || 3);
    const status = permanent ? "blocked" : exhausted ? "failed" : "queued";
    const retryDelayMs = Math.min(60, 2 ** attempts) * 60000;
    const { error } = await supabase
      .from("grace_post_targets")
      .update({
        status,
        error_message: String(message || "Publishing failed").slice(0, 1000),
        next_attempt_at: status === "queued" ? new Date(Date.now() + retryDelayMs).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", targetId);
    if (error) throw error;
  }

  async function getResults(days = 7) {
    const workspace = await getWorkspace();
    const since = new Date(Date.now() - Math.max(1, Math.min(Number(days) || 7, 90)) * 86400000).toISOString();
    const { data, error } = await supabase
      .from("grace_post_targets")
      .select("status,actual_cost_usd,estimated_cost_usd,created_at,published_at")
      .eq("workspace_id", workspace.id)
      .gte("created_at", since);
    if (error) throw error;
    const summary = { total: 0, published: 0, queued: 0, failed: 0, blocked: 0, cost: 0 };
    for (const row of data || []) {
      summary.total += 1;
      if (Object.prototype.hasOwnProperty.call(summary, row.status)) summary[row.status] += 1;
      summary.cost += Number(row.actual_cost_usd || row.estimated_cost_usd) || 0;
    }
    return summary;
  }

  async function recordGrowthSnapshot({ accountId, followers, following = 0, views = 0, engagements = 0, actorTelegramId }) {
    const workspace = await getWorkspace();
    const { data, error } = await supabase
      .from("grace_growth_snapshots")
      .insert({
        workspace_id: workspace.id,
        account_id: accountId,
        followers,
        following,
        views,
        engagements,
        recorded_by: actorTelegramId
      })
      .select("*")
      .single();
    if (error) throw error;
    await recordAudit("grace_growth_recorded", actorTelegramId, { account_id: accountId, followers, views, engagements });
    return data;
  }

  async function getGrowthSummary() {
    const workspace = await getWorkspace();
    const { data, error } = await supabase
      .from("grace_growth_snapshots")
      .select("account_id,followers,views,engagements,recorded_at")
      .eq("workspace_id", workspace.id)
      .order("recorded_at", { ascending: false })
      .limit(250);
    if (error) throw error;

    const perAccount = new Map();
    for (const row of data || []) {
      const list = perAccount.get(row.account_id) || [];
      list.push(row);
      perAccount.set(row.account_id, list);
    }

    let followers = 0;
    let followerChange = 0;
    let views = 0;
    let engagements = 0;
    for (const rows of perAccount.values()) {
      const latest = rows[0];
      const oldest = rows[rows.length - 1];
      followers += Number(latest.followers) || 0;
      followerChange += (Number(latest.followers) || 0) - (Number(oldest.followers) || 0);
      views += Number(latest.views) || 0;
      engagements += Number(latest.engagements) || 0;
    }
    return { accountsTracked: perAccount.size, followers, followerChange, views, engagements };
  }

  return {
    addAccount,
    approvePost,
    authorizeSpend,
    claimDueTargets,
    createDraft,
    getGrowthSummary,
    getMonthlySpend,
    getPost,
    getResults,
    getSettings,
    getStatus,
    getWorkspace,
    listAccounts,
    listCalendar,
    markTargetFailed,
    markTargetPublished,
    pauseAll,
    recordAudit,
    recordGrowthSnapshot,
    rejectPost,
    resumeAll,
    schedulePost,
    setAccountStatus,
    setEstimatedCost,
    setMonthlyBudget,
    setPostingEnabled
  };
}

module.exports = { createGraceRepository };
