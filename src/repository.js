const { isDuplicateError, permissionsForRole } = require("./core");

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

  async function getMission(missionId) {
    const { data, error } = await supabase.from("missions").select("*").eq("id", missionId).maybeSingle();
    if (error) throw error;
    return data;
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

  async function getAdminAccess(telegramId, fallbackIds = new Set(), ownerId = "") {
    if (String(telegramId) === String(ownerId)) {
      return { authorized: true, role: "owner", permissions: [...permissionsForRole("owner")] };
    }
    const { data: managed, error: managedError } = await supabase.from("bot_admins").select("role,status").eq("telegram_id", telegramId).maybeSingle();
    if (managedError && managedError.code !== "42P01") throw managedError;
    if (managed && managed.status !== "active") return { authorized: false, role: managed.role, permissions: [] };
    const role = managed ? managed.role : fallbackIds.has(String(telegramId)) ? "admin" : null;
    if (!role) return { authorized: false, role: null, permissions: [] };
    const permissions = permissionsForRole(role);
    const { data: overrides, error: overrideError } = await supabase.from("bot_admin_permissions").select("permission,enabled").eq("telegram_id", telegramId);
    if (overrideError && overrideError.code !== "42P01") throw overrideError;
    for (const override of overrides || []) {
      if (override.enabled) permissions.add(override.permission);
      else permissions.delete(override.permission);
    }
    return { authorized: true, role, permissions: [...permissions].sort() };
  }

  async function hasPermission(telegramId, permission, fallbackIds = new Set(), ownerId = "") {
    const access = await getAdminAccess(telegramId, fallbackIds, ownerId);
    return access.authorized && access.permissions.includes(permission);
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

  async function setAdminRole(telegramId, role, actorTelegramId) {
    const { data, error } = await supabase.from("bot_admins").upsert({ telegram_id: telegramId, role, status: "active", added_by: actorTelegramId, updated_at: new Date().toISOString() }, { onConflict: "telegram_id" }).select("*").single();
    if (error) throw error;
    await recordHistory({ missionId: null, action: "admin_role_changed", actorTelegramId, details: { telegram_id: telegramId, role } });
    return data;
  }

  async function setAdminPermission(telegramId, permission, enabled, actorTelegramId) {
    const { data, error } = await supabase.from("bot_admin_permissions").upsert({ telegram_id: telegramId, permission, enabled, set_by: actorTelegramId, updated_at: new Date().toISOString() }, { onConflict: "telegram_id,permission" }).select("*").single();
    if (error) throw error;
    await recordHistory({ missionId: null, action: "admin_permission_changed", actorTelegramId, details: { telegram_id: telegramId, permission, enabled } });
    return data;
  }

  async function listTreasuryAccounts() {
    const { data, error } = await supabase.from("treasury_accounts").select("id,label,network,asset,public_address,status,created_at").eq("status", "active").order("asset", { ascending: true });
    if (error && error.code === "42P01") return [];
    if (error) throw error;
    return data || [];
  }

  async function getContributionRule(asset) {
    const { data, error } = await supabase.from("auto_approval_rules").select("*").eq("rule_key", `kitty_${String(asset).toLowerCase()}`).maybeSingle();
    if (error && error.code === "42P01") return null;
    if (error) throw error;
    return data;
  }

  async function setContributionRule({ asset, enabled, pointsPerUnit, minimumAmount, maxPoints }, actorTelegramId) {
    const rule = { rule_key: `kitty_${asset.toLowerCase()}`, platform: "solana", verification_type: "onchain_transfer", enabled, points_awarded: 0, max_points: maxPoints, config: { asset, points_per_unit: pointsPerUnit, minimum_amount: minimumAmount }, set_by: actorTelegramId, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("auto_approval_rules").upsert(rule, { onConflict: "rule_key" }).select("*").single();
    if (error) throw error;
    await recordHistory({ missionId: null, action: "contribution_rule_changed", actorTelegramId, details: { asset, enabled, points_per_unit: pointsPerUnit, minimum_amount: minimumAmount, max_points: maxPoints } });
    return data;
  }

  async function recordVerifiedContribution({ accountId, telegramId, signature, asset, amount, sender, slot, blockTime, points }) {
    const { data, error } = await supabase.rpc("record_verified_contribution", { p_treasury_account_id: accountId, p_telegram_id: telegramId, p_transaction_signature: signature, p_asset: asset, p_amount: amount, p_sender_address: sender, p_slot: slot, p_block_time: blockTime ? new Date(blockTime * 1000).toISOString() : null, p_points: points }).single();
    if (error) throw error;
    return data;
  }

  async function listContributions(telegramId, limit = 20) {
    const { data, error } = await supabase.from("treasury_contributions").select("id,transaction_signature,asset,amount,status,points_awarded,confirmed_at,created_at").eq("telegram_id", telegramId).order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  }

  async function listPartners() {
    const { data, error } = await supabase.from("partner_profiles").select("id,display_name,organization,partner_role,status,created_at").eq("status", "active").order("created_at", { ascending: false });
    if (error && error.code === "42P01") return [];
    if (error) throw error;
    return data || [];
  }

  async function setTreasuryAccount({ asset, publicAddress, label }, actorTelegramId) {
    const { data, error } = await supabase.from("treasury_accounts").upsert({ asset, public_address: publicAddress, label, network: "solana", status: "active", created_by: actorTelegramId, updated_at: new Date().toISOString() }, { onConflict: "network,asset,public_address" }).select("*").single();
    if (error) throw error;
    await recordHistory({ missionId: null, action: "treasury_account_configured", actorTelegramId, details: { asset, account_id: data.id } });
    return data;
  }

  async function setPartnerProfile({ telegramId, displayName, organization, partnerRole }, actorTelegramId) {
    const { data, error } = await supabase.from("partner_profiles").upsert({ telegram_id: telegramId, display_name: displayName, organization, partner_role: partnerRole, status: "active", created_by: actorTelegramId, updated_at: new Date().toISOString() }, { onConflict: "telegram_id" }).select("*").single();
    if (error) throw error;
    await setAdminRole(telegramId, partnerRole, actorTelegramId);
    await recordHistory({ missionId: null, action: "partner_profile_configured", actorTelegramId, details: { telegram_id: telegramId, organization, partner_role: partnerRole } });
    return data;
  }

  async function listPending(limit = 20) {
    const { data, error } = await supabase
      .from("mission_submissions")
      .select("*")
      .eq("status", "pending")
      .order("submitted_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    const submissions = data || [];
    if (submissions.length === 0) return [];

    const missionIds = [...new Set(submissions.map((row) => row.mission_id).filter((id) => id != null))];
    const telegramIds = [...new Set(submissions.map((row) => row.telegram_id).filter((id) => id != null))];
    const [missionsResult, usersResult] = await Promise.all([
      missionIds.length
        ? supabase.from("missions").select("id,title").in("id", missionIds)
        : Promise.resolve({ data: [], error: null }),
      telegramIds.length
        ? supabase.from("users").select("telegram_id,username,first_name").in("telegram_id", telegramIds)
        : Promise.resolve({ data: [], error: null })
    ]);
    if (missionsResult.error) throw missionsResult.error;
    if (usersResult.error) throw usersResult.error;

    const missionsById = new Map((missionsResult.data || []).map((mission) => [String(mission.id), mission]));
    const usersByTelegramId = new Map((usersResult.data || []).map((user) => [String(user.telegram_id), user]));
    return submissions.map((submission) => ({
      ...submission,
      missions: missionsById.get(String(submission.mission_id)) || null,
      users: usersByTelegramId.get(String(submission.telegram_id)) || null
    }));
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

  async function getMissionHistory(telegramId, limit = 25) {
    const { data, error } = await supabase
      .from("mission_submissions")
      .select("id,mission_id,status,points_awarded,submitted_at,reviewed_at,rejection_reason")
      .eq("telegram_id", telegramId)
      .order("submitted_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  async function listGovernanceProposals(limit = 20, telegramId = null) {
    const { data, error } = await supabase
      .from("governance_proposals")
      .select("id,title,description,options,status,starts_at,ends_at,created_at")
      .in("status", ["active", "open", "completed"])
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    const proposals = data || [];
    if (!proposals.length) return proposals;
    const { data: votes, error: votesError } = await supabase
      .from("governance_votes")
      .select("proposal_id,telegram_id,selected_option,voting_power")
      .in("proposal_id", proposals.map((proposal) => proposal.id));
    if (votesError) throw votesError;
    return proposals.map((proposal) => {
      const proposalVotes = (votes || []).filter((vote) => String(vote.proposal_id) === String(proposal.id));
      const voteCounts = {};
      for (const vote of proposalVotes) voteCounts[vote.selected_option] = (voteCounts[vote.selected_option] || 0) + 1;
      const selected = telegramId === null ? null : proposalVotes.find((vote) => String(vote.telegram_id) === String(telegramId));
      return { ...proposal, vote_counts: voteCounts, total_votes: proposalVotes.length, selected_option: selected ? selected.selected_option : null };
    });
  }

  async function castGovernanceVote(proposalId, telegramId, selectedOption) {
    const user = await getUser(telegramId);
    if (!user) return { outcome: "unregistered" };
    const { data: proposal, error: proposalError } = await supabase
      .from("governance_proposals")
      .select("id,title,options,status,starts_at,ends_at")
      .eq("id", proposalId)
      .maybeSingle();
    if (proposalError) throw proposalError;
    if (!proposal) return { outcome: "not_found" };
    const now = Date.now();
    if (!["active", "open"].includes(proposal.status) || proposal.starts_at && Date.parse(proposal.starts_at) > now || proposal.ends_at && Date.parse(proposal.ends_at) <= now) return { outcome: "closed", proposal };
    const options = Array.isArray(proposal.options) ? proposal.options : [];
    if (!/^\d+$/.test(String(selectedOption)) || Number(selectedOption) < 1 || Number(selectedOption) > options.length) return { outcome: "invalid_option", proposal };
    const { data: vote, error } = await supabase.from("governance_votes").insert({ proposal_id: proposal.id, telegram_id: telegramId, selected_option: String(selectedOption), voting_power: 1 }).select("id,proposal_id,telegram_id,selected_option,created_at").single();
    if (isDuplicateError(error)) return { outcome: "duplicate", proposal };
    if (error) throw error;
    return { outcome: "recorded", proposal, vote, option: options[Number(selectedOption) - 1] };
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
    castGovernanceVote,
    createMission,
    editMission,
    endMission,
    getAdminAccess,
    getCurrentMission,
    getContributionRule,
    getLeaderboard,
    getMissionHistory,
    getMission,
    getMemberDetails,
    getProfile,
    getSubmission,
    findMissionByUrl,
    getRewards,
    getStats,
    getUser,
    hasPermission,
    isManagedAdmin,
    listActiveMissions,
    listActivity,
    listContributions,
    listAdmins,
    listGovernanceProposals,
    listPending,
    listPartners,
    listRegisteredTelegramIds,
    listTreasuryAccounts,
    recordHistory,
    recordVerifiedContribution,
    registerUser,
    rejectSubmission,
    saveWallet,
    setAdmin,
    setAdminPermission,
    setAdminRole,
    setContributionRule,
    setPartnerProfile,
    setTreasuryAccount,
    submitMissionClaim
  };
}

module.exports = { createRepository };
