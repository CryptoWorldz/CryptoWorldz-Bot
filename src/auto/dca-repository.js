function createAutoDcaRepository(supabase) {
  async function getSettings() {
    const { data, error } = await supabase
      .from("auto_dca_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Auto DCA settings have not been initialized.");
    return data;
  }

  async function listSchedules(limit = 50) {
    const { data, error } = await supabase
      .from("auto_dca_schedules")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.min(Number(limit) || 50, 200)));
    if (error) throw error;
    return data || [];
  }

  async function countStatus() {
    const schedules = await listSchedules(200);
    const counts = { active: 0, draft: 0, completed: 0, executions: 0 };
    for (const schedule of schedules) {
      if (schedule.status === "active") counts.active += 1;
      if (schedule.status === "draft") counts.draft += 1;
      if (schedule.status === "completed") counts.completed += 1;
    }
    const { count, error } = await supabase
      .from("auto_dca_executions")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    counts.executions = count || 0;
    return counts;
  }

  async function listAllowlistedTokens() {
    const { data, error } = await supabase
      .from("auto_tokens")
      .select("id,network,token_mint,symbol,status,display_name,created_at,updated_at")
      .eq("network", "solana")
      .eq("status", "allowlisted")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function audit(action, actorTelegramId, details = {}) {
    const { error } = await supabase.from("auto_audit_log").insert({
      action,
      actor_telegram_id: actorTelegramId,
      details,
      service_mode: "owner_dca"
    });
    if (error) throw error;
  }

  async function createSchedule({ proposal, actorTelegramId }) {
    const { data, error } = await supabase
      .from("auto_dca_schedules")
      .insert({
        owner_telegram_id: actorTelegramId,
        token_mint: proposal.token_mint,
        input_currency: proposal.input_currency,
        input_mint: proposal.input_mint,
        input_decimals: proposal.input_decimals,
        amount_per_buy: proposal.amount_per_buy,
        amount_base_units: proposal.amount_base_units,
        order_count: proposal.order_count,
        total_budget: proposal.total_budget,
        interval_minutes: proposal.interval_minutes,
        slippage_bps: proposal.slippage_bps,
        max_price_impact_bps: proposal.max_price_impact_bps,
        status: "draft",
        next_run_at: proposal.start_at,
        created_by: actorTelegramId,
        updated_by: actorTelegramId
      })
      .select("*")
      .single();
    if (error) throw error;
    await audit("dca_schedule_created", actorTelegramId, { schedule_id: data.id, token_mint: data.token_mint });
    return data;
  }

  async function getSchedule(id) {
    const { data, error } = await supabase
      .from("auto_dca_schedules")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function setScheduleStatus({ id, status, actorTelegramId }) {
    const schedule = await getSchedule(id);
    if (!schedule) return null;
    const updates = {
      status,
      updated_by: actorTelegramId,
      updated_at: new Date().toISOString(),
      locked_by: null,
      locked_until: null
    };
    if (status === "active" && (!schedule.next_run_at || new Date(schedule.next_run_at).getTime() < Date.now())) {
      updates.next_run_at = new Date().toISOString();
    }
    if (["cancelled", "completed"].includes(status)) updates.finished_at = new Date().toISOString();
    const { data, error } = await supabase
      .from("auto_dca_schedules")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    await audit(`dca_schedule_${status}`, actorTelegramId, { schedule_id: id });
    return data;
  }

  async function setWalletAddress({ walletAddress, actorTelegramId }) {
    const { data, error } = await supabase
      .from("auto_dca_settings")
      .update({
        wallet_address: walletAddress,
        execution_enabled: false,
        updated_by: actorTelegramId,
        updated_at: new Date().toISOString()
      })
      .eq("id", 1)
      .select("*")
      .single();
    if (error) throw error;
    await audit("dca_wallet_address_set", actorTelegramId, { wallet_address: walletAddress });
    return data;
  }

  async function setLimits({ patch, actorTelegramId }) {
    const { data, error } = await supabase
      .from("auto_dca_settings")
      .update({ ...patch, execution_enabled: false, updated_by: actorTelegramId, updated_at: new Date().toISOString() })
      .eq("id", 1)
      .select("*")
      .single();
    if (error) throw error;
    await audit("dca_limits_updated", actorTelegramId, patch);
    return data;
  }

  async function setControl({ patch, action, actorTelegramId }) {
    const { data, error } = await supabase
      .from("auto_dca_settings")
      .update({ ...patch, updated_by: actorTelegramId, updated_at: new Date().toISOString() })
      .eq("id", 1)
      .select("*")
      .single();
    if (error) throw error;
    await audit(action, actorTelegramId, patch);
    return data;
  }

  async function claimDueSchedule(workerId) {
    const { data, error } = await supabase.rpc("claim_auto_dca_schedule", { p_worker_id: workerId }).maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function startExecution(schedule, workerId) {
    const sequenceNumber = Number(schedule.completed_buys || 0) + 1;
    const { data, error } = await supabase
      .from("auto_dca_executions")
      .insert({
        schedule_id: schedule.id,
        sequence_number: sequenceNumber,
        status: "processing",
        input_currency: schedule.input_currency,
        input_amount: schedule.amount_per_buy,
        input_amount_base_units: schedule.amount_base_units,
        worker_id: workerId,
        started_at: new Date().toISOString()
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  async function completeExecution({ schedule, execution, result }) {
    const completedBuys = Number(schedule.completed_buys || 0) + 1;
    const completed = completedBuys >= Number(schedule.order_count || 0);
    const nextRunAt = completed
      ? null
      : new Date(Date.now() + Number(schedule.interval_minutes) * 60000).toISOString();

    const { error: executionError } = await supabase
      .from("auto_dca_executions")
      .update({
        status: "success",
        request_id: result.requestId || null,
        router: result.router || null,
        output_amount_base_units: result.outputAmount || null,
        price_impact_bps: result.priceImpactBps ?? null,
        transaction_signature: result.signature || null,
        result_payload: result,
        completed_at: new Date().toISOString()
      })
      .eq("id", execution.id);
    if (executionError) throw executionError;

    const { data, error } = await supabase
      .from("auto_dca_schedules")
      .update({
        completed_buys: completedBuys,
        spent_amount: Number(schedule.spent_amount || 0) + Number(schedule.amount_per_buy || 0),
        status: completed ? "completed" : "active",
        next_run_at: nextRunAt,
        last_signature: result.signature || null,
        last_error: null,
        locked_by: null,
        locked_until: null,
        finished_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", schedule.id)
      .select("*")
      .single();
    if (error) throw error;
    await audit("dca_buy_completed", schedule.owner_telegram_id, {
      schedule_id: schedule.id,
      execution_id: execution.id,
      signature: result.signature || null
    });
    return data;
  }

  async function failExecution({ schedule, execution, errorCode, details = {} }) {
    const message = String(errorCode || "dca_execution_failed").slice(0, 500);
    await supabase
      .from("auto_dca_executions")
      .update({ status: "failed", error_code: message, result_payload: details, completed_at: new Date().toISOString() })
      .eq("id", execution.id);
    const { data, error } = await supabase
      .from("auto_dca_schedules")
      .update({
        status: "paused",
        last_error: message,
        locked_by: null,
        locked_until: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", schedule.id)
      .select("*")
      .single();
    if (error) throw error;
    await audit("dca_buy_failed", schedule.owner_telegram_id, {
      schedule_id: schedule.id,
      execution_id: execution.id,
      error: message
    });
    return data;
  }

  return {
    audit,
    claimDueSchedule,
    completeExecution,
    countStatus,
    createSchedule,
    failExecution,
    getSchedule,
    getSettings,
    listAllowlistedTokens,
    listSchedules,
    setControl,
    setLimits,
    setScheduleStatus,
    setWalletAddress,
    startExecution
  };
}

module.exports = { createAutoDcaRepository };
