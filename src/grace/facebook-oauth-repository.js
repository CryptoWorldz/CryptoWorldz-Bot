function createGraceFacebookOAuthRepository(supabase, options = {}) {
  const workspaceSlug = options.workspaceSlug || "cryptoworldz";
  let workspaceCache = null;

  async function getWorkspace() {
    if (workspaceCache) return workspaceCache;
    const { data, error } = await supabase
      .from("grace_workspaces")
      .select("id,slug,name")
      .eq("slug", workspaceSlug)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Grace workspace '${workspaceSlug}' was not found.`);
    workspaceCache = data;
    return data;
  }

  async function getFacebookAccount(accountId) {
    const workspace = await getWorkspace();
    const { data, error } = await supabase
      .from("grace_social_accounts")
      .select("id,workspace_id,platform,account_key,display_name,handle,external_account_id,status,metadata")
      .eq("workspace_id", workspace.id)
      .eq("id", accountId)
      .eq("platform", "facebook")
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function createOAuthState({ accountId, stateHash, verifierCiphertext, expectedHandle, requestedBy, expiresAt }) {
    const workspace = await getWorkspace();
    const { data, error } = await supabase
      .from("grace_oauth_states")
      .insert({
        workspace_id: workspace.id,
        account_id: accountId,
        provider: "facebook",
        state_hash: stateHash,
        verifier_ciphertext: verifierCiphertext,
        expected_handle: expectedHandle,
        requested_by: requestedBy || null,
        expires_at: expiresAt
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
      p_provider: "facebook",
      p_state_hash: stateHash
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] || null : data || null;
  }

  async function saveConnection({ accountId, externalAccountId, username, pageName, accessTokenCiphertext, scope }) {
    const workspace = await getWorkspace();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("grace_oauth_connections")
      .upsert({
        workspace_id: workspace.id,
        account_id: accountId,
        provider: "facebook",
        external_account_id: externalAccountId,
        username,
        access_token_ciphertext: accessTokenCiphertext,
        refresh_token_ciphertext: null,
        token_type: "bearer",
        scope: scope || "pages_show_list pages_read_engagement pages_manage_posts",
        expires_at: null,
        status: "active",
        connected_at: now,
        last_refreshed_at: now,
        last_error: null,
        updated_at: now
      }, { onConflict: "account_id,provider" })
      .select("id,account_id,provider,external_account_id,username,status,connected_at")
      .single();
    if (error) throw error;

    const { error: accountError } = await supabase
      .from("grace_social_accounts")
      .update({
        external_account_id: externalAccountId,
        status: "active",
        metadata: {
          oauth_provider: "facebook",
          oauth_connected: true,
          page_name: pageName || "CryptoWorldz"
        },
        last_error: null,
        updated_at: now
      })
      .eq("workspace_id", workspace.id)
      .eq("id", accountId)
      .eq("platform", "facebook");
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
      .eq("provider", "facebook")
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function markConnectionError(accountId, message) {
    const workspace = await getWorkspace();
    const now = new Date().toISOString();
    await supabase
      .from("grace_oauth_connections")
      .update({ status: "error", last_error: String(message || "OAuth connection failed").slice(0, 1000), updated_at: now })
      .eq("workspace_id", workspace.id)
      .eq("account_id", accountId)
      .eq("provider", "facebook");

    const { error } = await supabase
      .from("grace_social_accounts")
      .update({ status: "error", last_error: String(message || "OAuth connection failed").slice(0, 1000), updated_at: now })
      .eq("workspace_id", workspace.id)
      .eq("id", accountId)
      .eq("platform", "facebook");
    if (error) throw error;
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

  return {
    consumeOAuthState,
    createOAuthState,
    getConnection,
    getFacebookAccount,
    getWorkspace,
    markConnectionError,
    recordAudit,
    saveConnection
  };
}

module.exports = { createGraceFacebookOAuthRepository };
