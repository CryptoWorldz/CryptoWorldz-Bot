function createAutoRepository(supabase) {
  async function getSettings() {
    const { data, error } = await supabase
      .from("auto_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Auto settings have not been initialized.");
    return data;
  }

  async function listAllowlistedTokens() {
    const { data, error } = await supabase
      .from("auto_tokens")
      .select("id,network,token_mint,symbol,status,display_name,created_at,updated_at")
      .eq("status", "allowlisted")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function recordAudit({ action, actorTelegramId, details = {} }) {
    const { error } = await supabase.from("auto_audit_log").insert({
      action,
      actor_telegram_id: actorTelegramId,
      details,
      service_mode: "safe_locked"
    });
    if (error) throw error;
  }

  async function recordSimulation({ actorTelegramId, request, result }) {
    const { data, error } = await supabase
      .from("auto_simulation_runs")
      .insert({
        requested_by: actorTelegramId,
        network: result.proposal.network,
        token_mint: result.proposal.token_mint || null,
        currency: result.proposal.currency || null,
        amount_per_order: result.proposal.amount_per_order,
        order_count: result.proposal.order_count,
        total_amount: result.proposal.total_amount,
        interval_minutes: result.proposal.interval_minutes,
        slippage_bps: result.proposal.slippage_bps,
        price_impact_bps: result.proposal.price_impact_bps,
        liquidity_usd: result.proposal.liquidity_usd,
        accepted: result.ok,
        validation_errors: result.errors,
        request_payload: request,
        result_payload: result
      })
      .select("id,accepted,created_at")
      .single();
    if (error) throw error;
    await recordAudit({
      action: result.ok ? "simulation_accepted" : "simulation_rejected",
      actorTelegramId,
      details: { simulation_id: data.id, errors: result.errors }
    });
    return data;
  }

  async function setPaused({ paused, actorTelegramId }) {
    const { data, error } = await supabase
      .from("auto_settings")
      .update({
        paused,
        emergency_stop: paused,
        execution_enabled: false,
        updated_by: actorTelegramId,
        updated_at: new Date().toISOString()
      })
      .eq("id", 1)
      .select("*")
      .single();
    if (error) throw error;
    await recordAudit({
      action: paused ? "service_paused" : "simulation_resumed",
      actorTelegramId,
      details: { execution_enabled: false }
    });
    return data;
  }

  async function emergencyStop(actorTelegramId) {
    const { data, error } = await supabase
      .from("auto_settings")
      .update({
        paused: true,
        emergency_stop: true,
        execution_enabled: false,
        updated_by: actorTelegramId,
        updated_at: new Date().toISOString()
      })
      .eq("id", 1)
      .select("*")
      .single();
    if (error) throw error;
    await recordAudit({
      action: "emergency_stop",
      actorTelegramId,
      details: { execution_enabled: false }
    });
    return data;
  }

  return {
    emergencyStop,
    getSettings,
    listAllowlistedTokens,
    recordAudit,
    recordSimulation,
    setPaused
  };
}

module.exports = { createAutoRepository };
