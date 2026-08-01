const { isDuplicateError } = require("./core");

function createRepository(supabase) {
  async function getUser(telegramId) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", telegramId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function registerUser(msg) {
    const telegramId = msg.from.id;
    const username = msg.from.username || "";
    const firstName = msg.from.first_name || "Legend";
    const existing = await getUser(telegramId);

    if (existing) {
      const { error } = await supabase
        .from("users")
        .update({ username, first_name: firstName, updated_at: new Date().toISOString() })
        .eq("telegram_id", telegramId);
      if (error) throw error;
      return { created: false };
    }

    const { error } = await supabase.from("users").insert({
      telegram_id: telegramId,
      username,
      first_name: firstName,
      wallet: null,
      points: 0,
      raids: 0,
      raids_completed: 0
    });
    if (error) throw error;
    return { created: true };
  }

  async function saveWallet(telegramId, wallet) {
    const { error } = await supabase
      .from("users")
      .update({ wallet, updated_at: new Date().toISOString() })
      .eq("telegram_id", telegramId);
    if (error) throw error;
  }

  async function listActiveMissions() {
    const { data, error } = await supabase
      .from("missions")
      .select("*")
      .in("status", ["active", "open"])
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (error) throw error;
    const now = Date.now();
    return (data || []).filter((mission) => !mission.expires_at || Date.parse(mission.expires_at) > now);
  }

  async function getCurrentMission() {
    const missions = await listActiveMissions();
    return missions[0] || null;
  }

  async function submitMissionClaim({ missionId, telegramId, completionText, proofUrl = "" }) {
    const { data, error } = await supabase
      .from("mission_submissions")
      .insert({
        mission_id: missionId,
        telegram_id: telegramId,
        proof_url: proofUrl,
        completion_text: completionText,
        status: "pending",
        points_awarded: 0
      })
      .select("id,mission_id,telegram_id,status,points_awarded")
      .single();

    if (isDuplicateError(error)) return { duplicate: true, submission: null };
    if (error) throw error;
    return { duplicate: false, submission: data };
  }

  async function approveSubmission(submissionId, reviewerTelegramId = null) {
    const { data, error } = await supabase
      .rpc("approve_mission_completion", {
        p_submission_id: submissionId,
        p_reviewer_telegram_id: reviewerTelegramId
      })
      .single();
    if (error) throw error;
    return data;
  }

  async function getSubmission(submissionId) {
    const { data, error } = await supabase
      .from("mission_submissions")
      .select("*")
      .eq("id", submissionId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function rejectSubmission(submissionId, reviewerTelegramId, reason) {
    const submitted = await getSubmission(submissionId);
    if (!submitted) return { outcome: "not_found", submission: null };
    if (submitted.status !== "pending") {
      return { outcome: "already_reviewed", submission: submitted };
    }

    const { data, error } = await supabase
      .from("mission_submissions")
      .update({
        status: "rejected",
        rejection_reason: reason,
        reviewer_telegram_id: reviewerTelegramId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", submissionId)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { outcome: "already_reviewed", submission: await getSubmission(submissionId) };

    await recordHistory({
      missionId: data.mission_id,
      action: "mission_submission_rejected",
      actorTelegramId: reviewerTelegramId,
      details: { submission_id: submissionId, telegram_id: data.telegram_id }
    });
    return { outcome: "rejected", submission: data };
  }

  async function createMission(mission, actorTelegramId) {
    const { data, error } = await supabase
      .from("missions")
      .insert({ ...mission, created_by: actorTelegramId })
      .select("*")
      .single();
    if (error) throw error;
    await recordHistory({
      missionId: data.id,
      action: "mission_created",
      actorTelegramId,
      details: { title: data.title, platform: data.platform, reward_points: data.reward_points }
    });
    return data;
  }

  async function findMissionByUrl(url) {
    const { data, error } = await supabase.from("missions").select("id,status").eq("target_url", url).limit(1);
    if (error) throw error;
    return (data || [])[0] || null;
  }

  async function isManagedAdmin(telegramId, fallbackIds = new Set(), ownerId = "") {
    if (String(telegramId) === String(ownerId) || fallbackIds.has(String(telegramId))) return true;
    const { data, error } = await supabase.from("bot_admins").select("status").eq("telegram_id", telegramId).eq("status", "active").maybeSingle();
    if (error && error.code !== "42P01") throw error;
    return Boolean(data);
  }

  async function listAdmins() {
    const { data, error } = await supabase.from("bot_admins").select("telegram_id,role,status,added_by,created_at").order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function setAdmin(telegramId, status, actorTelegramId) {
    const { data, error } = await supabase.from("bot_admins").upsert({ telegram_id: telegramId, role: "admin", status, added_by: actorTelegramId, updated_at: new Date().toISOString() }, { onConflict: "telegram_id" }).select("*").single();
    if (error) throw error;
    await recordHistory({ missionId: null, action: status === "active" ? "admin_added" : "admin_removed", actorTelegramId, details: { telegram_id: telegramId } });
    return data;
  }

  async function listPending(limit = 20) {
    const { data, error } = await supabase.from("mission_submissions").select("*,missions(title),users(username,first_name)").eq("status", "pending").order("submitted_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  }

  async function getRewards(telegramId, limit = 10) {
    const { data, error } = await supabase.from("reward_transactions").select("*").eq("telegram_id", telegramId).order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  }

  async function getMemberDetails(telegramId) {
    const profile = await getProfile(telegramId);
    if (!profile) return null;
    const { data, error } = await supabase.from("mission_submissions").select("status,points_awarded").eq("telegram_id", telegramId);
    if (error) throw error;
    const submissions = data || [];
    return { ...profile, pending: submissions.filter((r) => r.status === "pending").length,
      approved: submissions.filter((r) => r.status === "approved").length,
      rejected: submissions.filter((r) => r.status === "rejected").length };
  }

  async function getStats() {
    const [users, wallets, missions, completed, pending, rewards] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }).not("wallet", "is", null),
      supabase.from("missions").select("id", { count: "exact", head: true }).in("status", ["active", "open"]),
      supabase.from("missions").select("id", { count: "exact", head: true }).in("status", ["completed", "closed"]),
      supabase.from("mission_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("reward_transactions").select("amount")
    ]);
    for (const result of [users, wallets, missions, completed, pending, rewards]) if (result.error) throw result.error;
    return { users: users.count || 0, wallets: wallets.count || 0, active: missions.count || 0, completed: completed.count || 0, pending: pending.count || 0, points: (rewards.data || []).reduce((n, r) => n + Math.max(0, Number(r.amount) || 0), 0) };
  }

  async function listActivity(limit = 15) {
    const { data, error } = await supabase.from("mission_history").select("action,actor_telegram_id,created_at").order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  }

  async function editMission(missionId, field, newValue, actorTelegramId) {
    const updates = { [field]: newValue, updated_at: new Date().toISOString() };
    if (field === "link") updates.target_url = newValue;
    if (field === "status" && ["completed", "closed", "cancelled"].includes(newValue)) {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("missions")
      .update(updates)
      .eq("id", missionId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    await recordHistory({
      missionId,
      action: "mission_edited",
      actorTelegramId,
      details: { field }
    });
    return data;
  }

  async function endMission(missionId, actorTelegramId) {
    const { data, error } = await supabase
      .from("missions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", missionId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    await recordHistory({
      missionId,
      action: "mission_completed",
      actorTelegramId,
      details: {}
    });
    return data;
  }

  async function adjustPoints(telegramId, amount, actorTelegramId) {
    const { data, error } = await supabase
      .rpc("adjust_legend_points", {
        p_target_telegram_id: telegramId,
        p_amount: amount,
        p_admin_telegram_id: actorTelegramId
      })
      .single();
    if (error) throw error;
    return {
      ...data,
      new_points: data && data.new_points !== undefined ? data.new_points : data.total_points
    };
  }

  async function getProfile(telegramId) {
    const user = await getUser(telegramId);
    if (!user) return null;
    let rewardsEarned = 0;
    const pageSize = 1000;
    for (let start = 0; ; start += pageSize) {
      const { data, error } = await supabase
        .from("rewards")
        .select("points")
        .eq("telegram_id", telegramId)
        .gt("points", 0)
        .range(start, start + pageSize - 1);
      if (error) throw error;
      rewardsEarned += (data || []).reduce(
        (total, reward) => total + (Number(reward.points) || 0),
        0
      );
      if (!data || data.length < pageSize) break;
    }
    return { user, rewardsEarned };
  }

  async function getLeaderboard() {
    const { data, error } = await supabase
      .from("users")
      .select("first_name,username,points")
      .order("points", { ascending: false })
      .order("registered_at", { ascending: true })
      .limit(25);
    if (error) throw error;
    return data || [];
  }

  async function listRegisteredTelegramIds() {
    const ids = [];
    const pageSize = 1000;
    for (let start = 0; ; start += pageSize) {
      const { data, error } = await supabase
        .from("users")
        .select("telegram_id")
        .order("id", { ascending: true })
        .range(start, start + pageSize - 1);
      if (error) throw error;
      for (const row of data || []) ids.push(row.telegram_id);
      if (!data || data.length < pageSize) break;
    }
    return ids;
  }

  async function recordHistory({ missionId, action, actorTelegramId, details }) {
    const { error } = await supabase.from("mission_history").insert({
      mission_id: missionId || null,
      action,
      actor_telegram_id: actorTelegramId || null,
      details: details || {}
    });
    if (error) throw error;
  }

  return {
    adjustPoints,
    approveSubmission,
    createMission,
    editMission,
    endMission,
    getCurrentMission,
    getLeaderboard,
    getMemberDetails,
    getProfile,
    getSubmission,
    findMissionByUrl,
    getRewards,
    getStats,
    getUser,
    listActiveMissions,
    listActivity,
    listAdmins,
    listPending,
    listRegisteredTelegramIds,
    recordHistory,
    registerUser,
    rejectSubmission,
    saveWallet,
    setAdmin,
    isManagedAdmin,
    submitMissionClaim
  };
}

module.exports = { createRepository };
