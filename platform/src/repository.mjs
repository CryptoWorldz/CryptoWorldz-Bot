function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstRow(value) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export function createRepository(supabase, options = {}) {
  if (!supabase) throw new Error("The command centre requires a Supabase client.");
  const workspaceSlug = options.workspaceSlug || "cryptoworldz";
  const clock = options.clock || (() => new Date());
  let workspaceCache = null;

  const nowIso = () => clock().toISOString();

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
      details,
    });
    if (error) throw error;
  }

  async function countRows(table, apply) {
    const workspace = await getWorkspace();
    let query = supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id);
    if (apply) query = apply(query);
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  async function getStatus() {
    const [workspace, settings, accounts, drafts, pending, scheduled, failed] =
      await Promise.all([
        getWorkspace(),
        getSettings(),
        countRows("grace_social_accounts", (query) => query.neq("status", "disabled")),
        countRows("grace_posts", (query) => query.eq("status", "draft")),
        countRows("grace_posts", (query) => query.eq("status", "pending_approval")),
        countRows("grace_post_targets", (query) =>
          query.in("status", ["queued", "publishing"]),
        ),
        countRows("grace_post_targets", (query) =>
          query.in("status", ["failed", "blocked"]),
        ),
      ]);
    return {
      workspace,
      settings,
      counts: { accounts, drafts, pending, scheduled, failed },
    };
  }

  async function setControlState(values, actorTelegramId, action) {
    const workspace = await getWorkspace();
    const { data, error } = await supabase
      .from("grace_settings")
      .update({ ...values, updated_by: actorTelegramId, updated_at: nowIso() })
      .eq("workspace_id", workspace.id)
      .select("*")
      .single();
    if (error) throw error;
    await recordAudit(action, actorTelegramId, values);
    return data;
  }

  const setPostingEnabled = (enabled, actorTelegramId) =>
    setControlState(
      { posting_enabled: Boolean(enabled) },
      actorTelegramId,
      enabled ? "grace_posting_enabled" : "grace_posting_disabled",
    );

  const pauseAll = (actorTelegramId) =>
    setControlState(
      { paused: true, emergency_stop: true, posting_enabled: false },
      actorTelegramId,
      "grace_emergency_pause",
    );

  const resumeAll = (actorTelegramId) =>
    setControlState(
      { paused: false, emergency_stop: false },
      actorTelegramId,
      "grace_resume",
    );

  async function getXAccount(accountId) {
    const workspace = await getWorkspace();
    const { data, error } = await supabase
      .from("grace_social_accounts")
      .select(
        "id,workspace_id,platform,account_key,display_name,handle,external_account_id,status",
      )
      .eq("workspace_id", workspace.id)
      .eq("id", accountId)
      .eq("platform", "x")
      .maybeSingle();
    if (error) throw error;
    if (data || Number(accountId) !== 1) return data;

    // /connectx 1 is the permanent human-friendly command. If a restored
    // database assigned a different identity value, resolve the canonical key.
    const { data: canonical, error: canonicalError } = await supabase
      .from("grace_social_accounts")
      .select(
        "id,workspace_id,platform,account_key,display_name,handle,external_account_id,status",
      )
      .eq("workspace_id", workspace.id)
      .eq("platform", "x")
      .eq("account_key", "cryptoworldzx")
      .maybeSingle();
    if (canonicalError) throw canonicalError;
    return canonical;
  }

  async function createOAuthState({
    accountId,
    stateHash,
    verifierCiphertext,
    expectedHandle,
    requestedBy,
    expiresAt,
  }) {
    const workspace = await getWorkspace();
    const { data, error } = await supabase
      .from("grace_oauth_states")
      .insert({
        workspace_id: workspace.id,
        account_id: accountId,
        provider: "x",
        state_hash: stateHash,
        verifier_ciphertext: verifierCiphertext,
        expected_handle: expectedHandle,
        requested_by: requestedBy || null,
        expires_at: expiresAt,
      })
      .select("id,account_id,expires_at")
      .single();
    if (error) throw error;
    return data;
  }

  async function consumeOAuthState(stateHash) {
    const workspace = await getWorkspace();
    const { data, error } = await supabase.rpc("grace_consume_oauth_state", {
      p_workspace_id: workspace.id,
      p_provider: "x",
      p_state_hash: stateHash,
    });
    if (error) throw error;
    return firstRow(data);
  }

  async function saveConnection({
    accountId,
    externalAccountId,
    username,
    accessTokenCiphertext,
    refreshTokenCiphertext,
    tokenType,
    scope,
    expiresAt,
  }) {
    const workspace = await getWorkspace();
    const timestamp = nowIso();
    const { data, error } = await supabase
      .from("grace_oauth_connections")
      .upsert(
        {
          workspace_id: workspace.id,
          account_id: accountId,
          provider: "x",
          external_account_id: externalAccountId,
          username,
          access_token_ciphertext: accessTokenCiphertext,
          refresh_token_ciphertext: refreshTokenCiphertext || null,
          token_type: tokenType || "bearer",
          scope: scope || "",
          expires_at: expiresAt || null,
          status: "active",
          connected_at: timestamp,
          last_refreshed_at: timestamp,
          last_error: null,
          updated_at: timestamp,
        },
        { onConflict: "account_id,provider" },
      )
      .select("id,account_id,provider,external_account_id,username,status,expires_at,connected_at")
      .single();
    if (error) throw error;

    const { error: accountError } = await supabase
      .from("grace_social_accounts")
      .update({
        handle: username,
        external_account_id: externalAccountId,
        status: "active",
        metadata: { oauth_provider: "x", oauth_connected: true },
        updated_at: timestamp,
      })
      .eq("workspace_id", workspace.id)
      .eq("id", accountId)
      .eq("platform", "x");
    if (accountError) throw accountError;
    return data;
  }

  async function getConnection(accountId) {
    const workspace = await getWorkspace();
    const { data, error } = await supabase
      .from("grace_oauth_connections")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("account_id", accountId)
      .eq("provider", "x")
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function markConnectionError(accountId, message) {
    const workspace = await getWorkspace();
    const timestamp = nowIso();
    const safeMessage = String(message || "OAuth connection failed").slice(0, 1000);
    const { error: connectionError } = await supabase
      .from("grace_oauth_connections")
      .update({ status: "error", last_error: safeMessage, updated_at: timestamp })
      .eq("workspace_id", workspace.id)
      .eq("account_id", accountId)
      .eq("provider", "x");
    if (connectionError) throw connectionError;

    const { error } = await supabase
      .from("grace_social_accounts")
      .update({ status: "error", updated_at: timestamp })
      .eq("workspace_id", workspace.id)
      .eq("id", accountId)
      .eq("platform", "x");
    if (error) throw error;
  }

  async function queueApproval({ accountId, body, actorTelegramId }) {
    const caption = String(body ?? "").trim();
    if (!caption || caption.length > 280) {
      throw new Error("Grace X drafts must contain 1–280 characters.");
    }
    const account = await getXAccount(accountId);
    if (!account) throw new Error("That Grace X account ID does not exist.");
    const workspace = await getWorkspace();
    const timestamp = nowIso();
    const { data: post, error: postError } = await supabase
      .from("grace_posts")
      .insert({
        workspace_id: workspace.id,
        title: caption.slice(0, 80),
        campaign: "Owner Telegram queue",
        body: caption,
        status: "pending_approval",
        scheduled_for: timestamp,
        created_by: actorTelegramId,
      })
      .select("*")
      .single();
    if (postError) throw postError;

    const { error: targetError } = await supabase.from("grace_post_targets").insert({
      workspace_id: workspace.id,
      post_id: post.id,
      account_id: account.id,
      caption,
      scheduled_for: timestamp,
      status: "queued",
      next_attempt_at: timestamp,
    });
    if (targetError) {
      await supabase
        .from("grace_posts")
        .update({ status: "cancelled", updated_at: nowIso() })
        .eq("id", post.id);
      throw targetError;
    }
    await recordAudit("grace_post_queued_for_approval", actorTelegramId, {
      post_id: post.id,
      account_id: account.id,
    });
    return { post, account };
  }

  async function approvePost(postId, actorTelegramId) {
    const workspace = await getWorkspace();
    const timestamp = nowIso();
    const { data, error } = await supabase
      .from("grace_posts")
      .update({
        status: "approved",
        approved_by: actorTelegramId,
        approved_at: timestamp,
        updated_at: timestamp,
      })
      .eq("workspace_id", workspace.id)
      .eq("id", postId)
      .in("status", ["draft", "pending_approval", "approved"])
      .select("id,title,body,status,scheduled_for,approved_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    await recordAudit("grace_post_approved", actorTelegramId, { post_id: postId });
    return data;
  }

  async function claimDueTargets(limit = 10) {
    const workspace = await getWorkspace();
    const { data, error } = await supabase.rpc("grace_claim_due_targets", {
      p_workspace_id: workspace.id,
      p_limit: Math.max(1, Math.min(Number(limit) || 10, 25)),
    });
    if (error) throw error;
    return data || [];
  }

  async function spendRows(accountId = null) {
    const workspace = await getWorkspace();
    const start = clock();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    let query = supabase
      .from("grace_post_targets")
      .select("actual_cost_usd,estimated_cost_usd,status")
      .eq("workspace_id", workspace.id)
      .gte("created_at", start.toISOString())
      .in("status", ["publishing", "published"]);
    if (accountId !== null) query = query.eq("account_id", accountId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  function sumSpend(rows) {
    return rows.reduce((total, row) => {
      const cost = row.status === "published" ? row.actual_cost_usd : row.estimated_cost_usd;
      return total + asNumber(cost);
    }, 0);
  }

  async function authorizeSpend(target, estimatedCost) {
    const settings = await getSettings();
    const spent = sumSpend(await spendRows());
    const workspaceLimit = asNumber(settings.monthly_api_budget_usd);
    if (spent + estimatedCost > workspaceLimit + 1e-9) {
      return {
        ok: false,
        reason: "workspace_budget_exceeded",
        spent,
        limit: workspaceLimit,
      };
    }

    const accountLimit = asNumber(target.monthly_budget_usd);
    if (accountLimit > 0) {
      const accountSpent = sumSpend(await spendRows(target.account_id));
      if (accountSpent + estimatedCost > accountLimit + 1e-9) {
        return {
          ok: false,
          reason: "account_budget_exceeded",
          spent: accountSpent,
          limit: accountLimit,
        };
      }
    }
    return { ok: true, spent, limit: workspaceLimit };
  }

  async function setEstimatedCost(targetId, estimatedCost) {
    const { error } = await supabase
      .from("grace_post_targets")
      .update({ estimated_cost_usd: estimatedCost, updated_at: nowIso() })
      .eq("id", targetId);
    if (error) throw error;
  }

  async function markTargetPublished(targetId, externalPostId, actualCost) {
    const timestamp = nowIso();
    const { data, error } = await supabase
      .from("grace_post_targets")
      .update({
        status: "published",
        external_post_id: externalPostId || null,
        actual_cost_usd: actualCost,
        published_at: timestamp,
        error_message: null,
        updated_at: timestamp,
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
        .update({ status: "published", published_at: timestamp, updated_at: timestamp })
        .eq("id", data.post_id);
      if (postError) throw postError;
    }
  }

  async function markTargetFailed(targetId, message, options = {}) {
    const settings = await getSettings();
    const { data: current, error: currentError } = await supabase
      .from("grace_post_targets")
      .select("attempt_count")
      .eq("id", targetId)
      .single();
    if (currentError) throw currentError;
    const attempts = asNumber(current.attempt_count, 1);
    const permanent = Boolean(options.permanent);
    const exhausted = attempts >= asNumber(settings.max_retry_attempts, 3);
    const status = permanent ? "blocked" : exhausted ? "failed" : "queued";
    const retryDelayMs = Math.min(60, 2 ** attempts) * 60000;
    const { error } = await supabase
      .from("grace_post_targets")
      .update({
        status,
        error_message: String(message || "Publishing failed").slice(0, 1000),
        next_attempt_at:
          status === "queued"
            ? new Date(clock().getTime() + retryDelayMs).toISOString()
            : null,
        updated_at: nowIso(),
      })
      .eq("id", targetId);
    if (error) throw error;
  }

  async function getAutoStatus() {
    const [{ data: settings, error: settingsError }, active, paused, completed, failed] =
      await Promise.all([
        supabase
          .from("auto_dca_settings")
          .select(
            "mode,enabled,paused,emergency_stop,execution_enabled,wallet_address,max_order_amount,max_daily_amount,max_weekly_amount,max_monthly_amount,min_interval_minutes,max_slippage_bps,max_price_impact_bps",
          )
          .eq("id", 1)
          .maybeSingle(),
        countAutoSchedules("active"),
        countAutoSchedules("paused"),
        countAutoSchedules("completed"),
        countAutoSchedules("error"),
      ]);
    if (settingsError) throw settingsError;
    return {
      settings: settings
        ? { ...settings, wallet_address: undefined, wallet_connected: Boolean(settings.wallet_address) }
        : null,
      counts: { active, paused, completed, failed },
      buy_only: true,
      selling_enabled: false,
      private_keys_accepted: false,
      external_signer_required: true,
    };
  }

  async function countAutoSchedules(status) {
    const { count, error } = await supabase
      .from("auto_dca_schedules")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    if (error) throw error;
    return count || 0;
  }

  return {
    approvePost,
    authorizeSpend,
    claimDueTargets,
    consumeOAuthState,
    createOAuthState,
    getAutoStatus,
    getConnection,
    getSettings,
    getStatus,
    getWorkspace,
    getXAccount,
    markConnectionError,
    markTargetFailed,
    markTargetPublished,
    pauseAll,
    queueApproval,
    recordAudit,
    resumeAll,
    saveConnection,
    setEstimatedCost,
    setPostingEnabled,
  };
}
