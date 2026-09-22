const {
  ADMIN_PERMISSIONS,
  createRateLimiter,
  formatCommunity,
  formatMission,
  formatMissionList,
  formatWebsite,
  getRank,
  isAdmin,
  isDoneClaim,
  isValidSolanaAddress,
  medalFor,
  normalizeGovernanceOption,
  parseEditMissionPayload,
  parseNewMissionPayload,
  parseSimpleRaid,
  parsePointsAdjustment,
  parsePositiveId,
  shortenWallet,
  splitTelegramMessage
} = require("./core");

const PUBLIC_COMMANDS = [
  { command: "start", description: "Open the Zed Command Centre" },
  { command: "help", description: "View the public command menu" },
  { command: "register", description: "Register your Legend Profile" },
  { command: "profile", description: "View your Legend Profile" },
  { command: "rewards", description: "View reward history" },
  { command: "points", description: "View your Legend Points" },
  { command: "leaderboard", description: "View the Top 25 Legends" },
  { command: "raaiiidd", description: "View the newest active Raaiiidd" },
  { command: "missions", description: "View every active Raaiiidd" },
  { command: "wallet", description: "Connect a public Solana wallet" },
  { command: "kitty", description: "View the community SOL/USDC kitty" },
  { command: "governance", description: "View active community votes" },
  { command: "vote", description: "Vote on a governance proposal" },
  { command: "cancel", description: "Cancel wallet registration" },
  { command: "community", description: "Open CryptoWorldz community links" },
  { command: "website", description: "Open CryptoWorldz.xyz" }
];

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function safeError(context, error) {
  console.error(`${context} failed`, {
    name: error && error.name ? error.name : "Error",
    code: error && error.code ? error.code : undefined
  });
}

function registerTelegramHandlers({ bot, repository, config }) {
  const pendingWalletRegistration = new Set();
  const pendingBroadcasts = new Map();
  const allowBroadcastDraft = createRateLimiter({ maxEvents: 2, intervalMs: 60000 });

  const send = (chatId, text) => bot.sendMessage(chatId, text);
  const sendLong = async (chatId, text) => {
    for (const chunk of splitTelegramMessage(text)) await send(chatId, chunk);
  };
  const denyAdmin = (msg) => send(msg.chat.id, "⛔ Admin access required.");
  const adminAllowed = (msg) => repository.isManagedAdmin(msg.from.id, config.adminTelegramIds, config.ownerTelegramId);
  const permissionAllowed = (msg, permission) => repository.hasPermission(msg.from.id, permission, config.adminTelegramIds, config.ownerTelegramId);
  const ownerAllowed = (msg) => String(msg.from.id) === String(config.ownerTelegramId);

  bot.onText(/^\/start(?:@\w+)?$/, async (msg) => {
    try {
      await repository.registerUser(msg);
      await send(
        msg.chat.id,
        `🤖💜 Hello ${msg.from.first_name || "Legend"}!

I'm Zed — your guide to the CryptoWorldz Command Centre.

🚀 Raaiiidd Missions
🏆 Leaderboards & Rewards
👛 Wallet Registration
🗳️ Governance & Voting
💰 Treasury Transparency
🎁 Airdrops & Events

Use /profile to view your Legend Profile.
Use /help to open the Command Menu.

🌍 One World • One Mission • One CryptoWorldz`
      );
    } catch (error) {
      safeError("Start command", error);
      await send(msg.chat.id, "❌ I couldn't create your Legend Profile. Please try again shortly.");
    }
  });

  bot.onText(/^\/register(?:@\w+)?$/, async (msg) => {
    try {
      const result = await repository.registerUser(msg);
      await send(
        msg.chat.id,
        result.created
          ? "🎉 Registration complete!\n\nUse /wallet to connect your public Solana wallet."
          : "✅ You are already registered!\n\nYour Legend Profile has been refreshed."
      );
    } catch (error) {
      safeError("Register command", error);
      await send(msg.chat.id, "❌ Registration failed. Please try again shortly.");
    }
  });

  bot.onText(/^\/profile(?:@\w+)?$/, async (msg) => {
    try {
      const profile = await repository.getMemberDetails(msg.from.id);
      if (!profile) return send(msg.chat.id, "❌ You are not registered. Use /register first.");

      const { user, rewardsEarned } = profile;
      const points = Number(user.points) || 0;
      const completed = Math.max(Number(user.raids) || 0, Number(user.raids_completed) || 0);
      const displayName = user.username ? `@${user.username}` : user.first_name || "Legend";
      return send(
        msg.chat.id,
        `🏆 CryptoWorldz Legend Profile

👤 Username: ${displayName}
🆔 Telegram ID: ${user.telegram_id}
🎖 Rank: ${getRank(points)}
⭐ Legend Points: ${points}
🚀 Raaiiidds Completed: ${completed}
📥 Pending Submissions: ${profile.pending}
👛 Wallet Connected: ${user.wallet ? `Yes ✅\n${shortenWallet(user.wallet)}` : "No"}
🎁 Rewards Earned: ${rewardsEarned} Legend Points
📅 Member Since: ${user.registered_at || user.created_at}`
      );
    } catch (error) {
      safeError("Profile command", error);
      return send(msg.chat.id, "❌ I couldn't load your profile.");
    }
  });

  bot.onText(/^\/wallet(?:@\w+)?(?:\s+(.+))?$/, async (msg, match) => {
    try {
      const user = await repository.getUser(msg.from.id);
      if (!user) return send(msg.chat.id, "❌ You are not registered. Use /register first.");

      const supplied = match && match[1] ? match[1].trim() : "";
      if (!supplied) {
        pendingWalletRegistration.add(msg.from.id);
        return send(
          msg.chat.id,
          "👛 Send your public Solana wallet address in your next message.\n\n⚠️ Never send a seed phrase or private key.\nUse /cancel to stop."
        );
      }
      if (!isValidSolanaAddress(supplied)) {
        return send(msg.chat.id, "❌ That isn't a valid Solana public wallet address.");
      }

      await repository.saveWallet(msg.from.id, supplied);
      return send(msg.chat.id, `✅ Wallet Connected!\n\n👛 ${shortenWallet(supplied)}`);
    } catch (error) {
      safeError("Wallet command", error);
      return send(msg.chat.id, "❌ I couldn't save your wallet.");
    }
  });

  bot.onText(/^\/cancel(?:@\w+)?$/, async (msg) => {
    pendingWalletRegistration.delete(msg.from.id);
    await send(msg.chat.id, "✅ Wallet registration cancelled.");
  });

  bot.onText(/^\/points(?:@\w+)?(?:\s+(.+))?$/, async (msg, match) => {
    const argumentsText = match && match[1] ? match[1].trim() : "";
    try {
      if (argumentsText) {
        if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");
        const parsed = parsePointsAdjustment(argumentsText);
        if (!parsed.ok) {
          return send(msg.chat.id, "❌ Use: /points telegram_id amount\nExample: /points 123456789 50");
        }
        const result = await repository.adjustPoints(parsed.telegramId, parsed.amount, msg.from.id);
        return send(
          msg.chat.id,
          `✅ Legend Points updated.\n\n👤 ${parsed.telegramId}\n⭐ Adjustment: ${parsed.amount > 0 ? "+" : ""}${parsed.amount}\n🏆 New total: ${result.new_points}`
        );
      }

      const user = await repository.getUser(msg.from.id);
      if (!user) return send(msg.chat.id, "❌ You are not registered. Use /register first.");
      const points = Number(user.points) || 0;
      return send(
        msg.chat.id,
        `⭐ Legend Points\n\nYou currently have ${points} Legend Points.\n🏆 Rank: ${getRank(points)}`
      );
    } catch (error) {
      safeError("Points command", error);
      return send(msg.chat.id, "❌ I couldn't update or load Legend Points.");
    }
  });

  bot.onText(/^\/leaderboard(?:@\w+)?(?:\s+(daily|weekly|monthly|all))?$/, async (msg) => {
    try {
      const data = await repository.getLeaderboard();
      if (data.length === 0) {
        return send(msg.chat.id, "🏆 CryptoWorldz Top 25 Legends\n\nNo Legends have joined yet.");
      }
      const rows = data.map((user, index) => {
        const name = user.username ? `@${user.username}` : user.first_name || "Legend";
        return `${medalFor(index)} ${name} — ${Number(user.points) || 0} LP`;
      });
      return send(msg.chat.id, `🏆 CryptoWorldz Top 25 Legends\n\n${rows.join("\n")}`);
    } catch (error) {
      safeError("Leaderboard command", error);
      return send(msg.chat.id, "❌ I couldn't load the leaderboard.");
    }
  });

  const sendCurrentMission = async (msg) => {
    try {
      return sendLong(msg.chat.id, formatMission(await repository.getCurrentMission()));
    } catch (error) {
      safeError("Raaiiidd command", error);
      return send(msg.chat.id, "❌ I couldn't load the current Raaiiidd.");
    }
  };

  bot.onText(/^\/(?:raid|raaiiidd)(?:@\w+)?$/, sendCurrentMission);

  bot.onText(/^\/raid(?:@\w+)?\s+([\s\S]+)$/, async (msg, match) => {
    if (!(await permissionAllowed(msg, "mission.create"))) return denyAdmin(msg);
    const parsed = parseSimpleRaid(match && match[1]);
    if (!parsed.ok) return send(msg.chat.id, "❌ Use a safe HTTPS link: /raid <link> | 10 | 24h");
    try {
      if (await repository.findMissionByUrl(parsed.mission.target_url)) return send(msg.chat.id, "⚠️ A mission already exists for this link.");
      const mission = await repository.createMission(parsed.mission, msg.from.id);
      return send(msg.chat.id, `✅ New Raaiiidd Created!\n\n🎯 ${mission.title}\n🌐 ${mission.platform}\n⭐ ${mission.reward_points} Legend Points\n🔗 ${mission.link}\n\nMission #${mission.id} is now active.\n\nUse /raaiiidd to view it.`);
    } catch (error) {
      safeError("Simple Raaiiidd", error);
      return send(msg.chat.id, "❌ I couldn't create that Raaiiidd.");
    }
  });

  bot.onText(/^\/missions(?:@\w+)?$/, async (msg) => {
    try {
      return sendLong(msg.chat.id, formatMissionList(await repository.listActiveMissions()));
    } catch (error) {
      safeError("Missions command", error);
      return send(msg.chat.id, "❌ I couldn't load active Raaiiidds.");
    }
  });

  bot.onText(/^\/community(?:@\w+)?$/, (msg) => send(msg.chat.id, formatCommunity(config)));
  bot.onText(/^\/website(?:@\w+)?$/, (msg) => send(msg.chat.id, formatWebsite(config)));
  bot.onText(/^\/kitty(?:@\w+)?$/, async (msg) => {
    try {
      const accounts = await repository.listTreasuryAccounts();
      if (!accounts.length) return send(msg.chat.id, "💜 The CryptoWorldz Community Kitty is being prepared. No contribution address is active yet.");
      const rows = accounts.map((account) => `💰 ${account.asset} on Solana\n${account.public_address}\n${account.label}`).join("\n\n");
      return send(msg.chat.id, `💜 CryptoWorldz Community Kitty\n\n${rows}\n\nContributions are recorded only after verifiable on-chain confirmation.\n⚠️ Zed will never ask for your seed phrase or private key and will never move funds automatically.`);
    } catch (error) { safeError("Kitty command", error); return send(msg.chat.id, "❌ I couldn't load the Community Kitty."); }
  });

  bot.onText(/^\/governance(?:@\w+)?$/, async (msg) => {
    try {
      const proposals = await repository.listGovernanceProposals(10, msg.from.id);
      const active = proposals.filter((proposal) => ["active", "open"].includes(proposal.status));
      if (!active.length) return send(msg.chat.id, "🗳️ No active CryptoWorldz Governance Votes right now.");
      const rows = active.map((proposal) => {
        const options = Array.isArray(proposal.options) ? proposal.options : [];
        const choices = options.map((option, index) => `${index + 1}. ${option} — ${proposal.vote_counts[String(index + 1)] || 0} votes`).join("\n");
        return `🗳️ Proposal #${proposal.id}\n${proposal.title}\n\n${proposal.description}\n\n${choices}\n\nTotal Votes: ${proposal.total_votes}${proposal.selected_option ? `\n✅ Your Vote: Option ${proposal.selected_option}` : `\nVote: /vote ${proposal.id} 1|2|3`}`;
      });
      return sendLong(msg.chat.id, rows.join("\n\n——————————\n\n"));
    } catch (error) { safeError("Governance command", error); return send(msg.chat.id, "❌ I couldn't load Governance Votes."); }
  });

  bot.onText(/^\/vote(?:@\w+)?(?:\s+(\d+)\s+(\d+))?$/, async (msg, match) => {
    const proposalId = parsePositiveId(match && match[1]);
    if (!proposalId) return send(msg.chat.id, "❌ Use: /vote proposal_id option\nExample: /vote 1 3");
    try {
      const proposals = await repository.listGovernanceProposals(20, msg.from.id);
      const proposal = proposals.find((item) => String(item.id) === String(proposalId));
      const option = normalizeGovernanceOption(match && match[2], proposal && Array.isArray(proposal.options) ? proposal.options.length : 0);
      if (!option) return send(msg.chat.id, "❌ That voting option is not available.");
      const result = await repository.castGovernanceVote(proposalId, msg.from.id, option);
      if (result.outcome === "duplicate") return send(msg.chat.id, "⚠️ You have already voted on this proposal.");
      if (result.outcome === "unregistered") return send(msg.chat.id, "❌ Register with /start before voting.");
      if (result.outcome !== "recorded") return send(msg.chat.id, "❌ This Governance Vote is not currently open.");
      return send(msg.chat.id, `✅ Governance Vote Recorded!\n\n🗳️ ${result.proposal.title}\nYour Choice: ${result.option}\n\nOne Legend • One Vote 💜`);
    } catch (error) { safeError("Vote command", error); return send(msg.chat.id, "❌ I couldn't record that vote."); }
  });

  bot.onText(/^\/help(?:@\w+)?$/, (msg) =>
    send(
      msg.chat.id,
      "🤖💜 Zed — CryptoWorldz Command Centre\n\n/start\n/help\n/register\n/profile\n/points\n/leaderboard\n/raid\n/raaiiidd\n/missions\n/wallet\n/kitty\n/governance\n/vote proposal_id option\n/cancel\n/community\n/website\n\n⚠️ Never provide a private key or seed phrase."
    )
  );

  bot.onText(/^\/admin(?:@\w+)?$/, async (msg) => {
    if (!(await adminAllowed(msg))) return denyAdmin(msg);
    const access = await repository.getAdminAccess(msg.from.id, config.adminTelegramIds, config.ownerTelegramId);
    return send(msg.chat.id, `🛡️ Zed Admin Command Centre\n\nRole: ${access.role}\n\n🚀 Missions\n/raid <link>\n/newmission\n/editmission\n/endmission\n/missions\n\n📥 Submissions\n/pending\n/approve\n/reject\n\n🏆 Legend Management\n/member telegram_id\n/points\n/admins\n/permissions\n\n💜 Community Operations\n/kitty\n/setkitty\n/setrole\n/setpermission\n/setpartner\n\n📢 Communication\n/broadcast\n\n📊 Reports\n/stats\n/activity`);
  });

  bot.onText(/^\/admins(?:@\w+)?$/, async (msg) => {
    if (!(await adminAllowed(msg))) return denyAdmin(msg);
    try {
      const rows = await repository.listAdmins();
      const configured = [...config.adminTelegramIds].map((id) => `${id} — fallback admin`);
      if (config.ownerTelegramId) configured.unshift(`${config.ownerTelegramId} — owner`);
      return send(msg.chat.id, `🛡️ Zed Admin Team\n\n${[...configured, ...rows.map((r) => `${r.telegram_id} — ${r.role} (${r.status})`)].join("\n")}`);
    } catch { return send(msg.chat.id, "❌ I couldn't load the Admin Team."); }
  });

  bot.onText(/^\/(addadmin|removeadmin)(?:@\w+)?(?:\s+(\d+))?$/, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");
    const id = parsePositiveId(match && match[2]);
    if (!id) return send(msg.chat.id, `❌ Use: /${match[1]} telegram_id`);
    if (match[1] === "removeadmin" && String(id) === String(config.ownerTelegramId)) return send(msg.chat.id, "⛔ The primary owner cannot be removed.");
    try { await repository.setAdmin(id, match[1] === "addadmin" ? "active" : "disabled", msg.from.id); return send(msg.chat.id, `✅ Admin ${match[1] === "addadmin" ? "added" : "disabled"}: ${id}`); }
    catch { return send(msg.chat.id, "❌ I couldn't update the Admin Team."); }
  });

  bot.onText(/^\/permissions(?:@\w+)?(?:\s+(\d+))?$/, async (msg, match) => {
    if (!(await adminAllowed(msg))) return denyAdmin(msg);
    const id = parsePositiveId(match && match[1]) || msg.from.id;
    if (String(id) !== String(msg.from.id) && !ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");
    try {
      const access = await repository.getAdminAccess(id, config.adminTelegramIds, config.ownerTelegramId);
      return send(msg.chat.id, `🛡️ Zed Permissions\n\n👤 ${id}\n🎖 Role: ${access.role || "none"}\n${access.permissions.length ? access.permissions.map((permission) => `✅ ${permission}`).join("\n") : "No active permissions."}`);
    } catch { return send(msg.chat.id, "❌ I couldn't load permissions."); }
  });

  bot.onText(/^\/setrole(?:@\w+)?(?:\s+(\d+)\s+(owner|admin|moderator|recap_manager|partner_manager|treasury_manager))?$/, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");
    const id = parsePositiveId(match && match[1]); const role = match && match[2];
    if (!id || !role || role === "owner") return send(msg.chat.id, "❌ Use: /setrole telegram_id admin|moderator|recap_manager|partner_manager|treasury_manager");
    try { await repository.setAdminRole(id, role, msg.from.id); return send(msg.chat.id, `✅ ${id} now has the ${role} role.`); }
    catch { return send(msg.chat.id, "❌ I couldn't update that role."); }
  });

  bot.onText(/^\/setpermission(?:@\w+)?(?:\s+(\d+)\s+([a-z.]+)\s+(on|off))?$/, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");
    const id = parsePositiveId(match && match[1]); const permission = match && match[2]; const enabled = match && match[3] === "on";
    if (!id || !ADMIN_PERMISSIONS.includes(permission) || !match[3]) return send(msg.chat.id, `❌ Use: /setpermission telegram_id permission on|off\n\nAllowed:\n${ADMIN_PERMISSIONS.join("\n")}`);
    try { await repository.setAdminPermission(id, permission, enabled, msg.from.id); return send(msg.chat.id, `✅ ${permission} turned ${enabled ? "on" : "off"} for ${id}.`); }
    catch { return send(msg.chat.id, "❌ I couldn't update that permission."); }
  });

  bot.onText(/^\/setkitty(?:@\w+)?(?:\s+(SOL|USDC)\s+(\S+)(?:\s+([\s\S]+))?)?$/, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");
    const asset = match && match[1]; const publicAddress = match && match[2]; const label = (match && match[3] || "CryptoWorldz Community Kitty").trim();
    if (!asset || !isValidSolanaAddress(publicAddress)) return send(msg.chat.id, "❌ Use: /setkitty SOL|USDC public_solana_address Optional Label\n\nNever send a private key or seed phrase.");
    if (label.length > 100) return send(msg.chat.id, "❌ Kitty labels must be 100 characters or fewer.");
    try { await repository.setTreasuryAccount({ asset, publicAddress, label }, msg.from.id); return send(msg.chat.id, `✅ ${asset} Community Kitty configured with a public Solana address.\n\n⚠️ No private keys are stored and Zed cannot move funds.`); }
    catch { return send(msg.chat.id, "❌ I couldn't configure that Kitty account."); }
  });

  bot.onText(/^\/setpartner(?:@\w+)?(?:\s+(\d+)\s+(recap_manager|partner_manager|treasury_manager)\s*\|\s*([^|]+)\s*\|\s*([^|]+))?$/, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");
    const telegramId = parsePositiveId(match && match[1]); const partnerRole = match && match[2]; const displayName = match && match[3] && match[3].trim(); const organization = match && match[4] && match[4].trim();
    if (!telegramId || !partnerRole || !displayName || !organization) return send(msg.chat.id, "❌ Use: /setpartner telegram_id recap_manager|partner_manager|treasury_manager | Name | Organization");
    try { await repository.setPartnerProfile({ telegramId, displayName, organization, partnerRole }, msg.from.id); return send(msg.chat.id, `✅ Partner profile created.\n\n👤 ${displayName}\n🏢 ${organization}\n🎖 ${partnerRole}\n\nPermissions remain owner-adjustable with /setpermission.`); }
    catch { return send(msg.chat.id, "❌ I couldn't configure that partner profile."); }
  });

  bot.onText(/^\/pending(?:@\w+)?$/, async (msg) => {
    if (!(await permissionAllowed(msg, "submission.view"))) return denyAdmin(msg);
    try { const rows = await repository.listPending(); if (!rows.length) return send(msg.chat.id, "📥 No pending submissions.");
      return sendLong(msg.chat.id, `📥 Pending Submissions\n\n${rows.map((r) => `#${r.id} • Mission #${r.mission_id}\n👤 ${r.users?.username ? `@${r.users.username}` : r.users?.first_name || "Legend"} (${r.telegram_id})\n🎯 ${r.missions?.title || "Mission"}\n🕒 ${r.submitted_at}\n📝 ${r.proof_url || r.completion_text || "DONE"}\nStatus: ${r.status}`).join("\n\n")}\n\n/approve submission_id\n/reject submission_id reason`); }
    catch { return send(msg.chat.id, "❌ I couldn't load pending submissions."); }
  });

  bot.onText(/^\/rewards(?:@\w+)?$/, async (msg) => {
    try { const user = await repository.getUser(msg.from.id); if (!user) return send(msg.chat.id, "❌ You are not registered. Use /register first."); const rows = await repository.getRewards(msg.from.id); return send(msg.chat.id, `🎁 Legend Reward History\n\n${rows.length ? rows.map((r) => `⭐ ${Number(r.amount) >= 0 ? "+" : ""}${r.amount} — ${r.reason}`).join("\n") : "No rewards recorded yet."}\n\nTotal Legend Points: ${user.points || 0}`); }
    catch { return send(msg.chat.id, "❌ I couldn't load reward history."); }
  });

  bot.onText(/^\/submit(?:@\w+)?(?:\s+(\d+)\s+(https:\/\/\S+))?$/, async (msg, match) => {
    const missionId = parsePositiveId(match && match[1]); const proof = match && match[2];
    if (!missionId || !proof) return send(msg.chat.id, "❌ Use: /submit mission_id proof_link");
    try { const user = await repository.getUser(msg.from.id); if (!user) return send(msg.chat.id, "❌ You are not registered. Use /register first.");
      const claim = await repository.submitMissionClaim({ missionId, telegramId: msg.from.id, completionText: "Proof submitted", proofUrl: proof });
      if (claim.duplicate) return send(msg.chat.id, "⚠️ You have already submitted this mission.");
      return send(msg.chat.id, `✅ Raaiiidd Submission Received!\n\n🎯 Mission #${missionId}\n📥 Submission #${claim.submission.id}\n⏳ Status: Pending Review\n\nAn Admin Team member will review it.`); }
    catch { return send(msg.chat.id, "❌ I couldn't record that proof submission."); }
  });

  bot.onText(/^\/member(?:@\w+)?(?:\s+(\d+))?$/, async (msg, match) => {
    if (!(await permissionAllowed(msg, "member.view"))) return denyAdmin(msg); const id = parsePositiveId(match && match[1]);
    if (!id) return send(msg.chat.id, "❌ Use: /member telegram_id");
    try { const p = await repository.getMemberDetails(id); if (!p) return send(msg.chat.id, "❌ Legend not found."); const u = p.user; const points = Number(u.points) || 0;
      return send(msg.chat.id, `👤 Legend Member\n\n🆔 Telegram ID: ${u.telegram_id}\n👤 ${u.username ? `@${u.username}` : u.first_name || "Legend"}\n📅 Registered: ${u.registered_at || u.created_at}\n👛 Wallet: ${u.wallet ? shortenWallet(u.wallet) : "Not connected"}\n⭐ Points: ${points}\n🎖 Rank: ${getRank(points)}\n✅ Approved: ${p.approved}\n📥 Pending: ${p.pending}\n❌ Rejected: ${p.rejected}\n🎁 Rewards earned: ${p.rewardsEarned} LP`); }
    catch { return send(msg.chat.id, "❌ I couldn't load that member."); }
  });

  bot.onText(/^\/stats(?:@\w+)?$/, async (msg) => { if (!(await adminAllowed(msg))) return denyAdmin(msg); try { const s = await repository.getStats(); return send(msg.chat.id, `📊 CryptoWorldz Command Centre Stats\n\n👥 Registered Legends: ${s.users}\n👛 Connected Wallets: ${s.wallets}\n🚀 Active Raaiiidds: ${s.active}\n✅ Completed Raaiiidds: ${s.completed}\n📥 Pending Submissions: ${s.pending}\n⭐ Total Legend Points Awarded: ${s.points}`); } catch { return send(msg.chat.id, "❌ I couldn't load stats."); } });
  bot.onText(/^\/activity(?:@\w+)?$/, async (msg) => { if (!(await adminAllowed(msg))) return denyAdmin(msg); try { const rows = await repository.listActivity(); return send(msg.chat.id, `📊 Recent Safe Activity\n\n${rows.map((r) => `${r.created_at} — ${r.action} — ${r.actor_telegram_id || "system"}`).join("\n") || "No activity yet."}`); } catch { return send(msg.chat.id, "❌ I couldn't load activity."); } });

  bot.onText(/^\/newmission(?:@\w+)?(?:\s+([\s\S]+))?$/, async (msg, match) => {
    if (!(await permissionAllowed(msg, "mission.create"))) return denyAdmin(msg);
    const parsed = parseNewMissionPayload(match && match[1]);
    if (!parsed.ok) {
      return send(
        msg.chat.id,
        "❌ Use: /newmission Title | Platform | Reward Points | Link | Description | Instructions"
      );
    }
    try {
      const mission = await repository.createMission(parsed.mission, msg.from.id);
      return send(msg.chat.id, `✅ Mission #${mission.id} created.\n\n${mission.title}`);
    } catch (error) {
      safeError("New mission command", error);
      return send(msg.chat.id, "❌ I couldn't create that mission.");
    }
  });

  bot.onText(/^\/editmission(?:@\w+)?(?:\s+([\s\S]+))?$/, async (msg, match) => {
    if (!(await permissionAllowed(msg, "mission.edit"))) return denyAdmin(msg);
    const parsed = parseEditMissionPayload(match && match[1]);
    if (!parsed.ok) {
      return send(
        msg.chat.id,
        "❌ Use: /editmission mission_id field | new value\nAllowed: title, description, platform, link, instructions, reward_points, status"
      );
    }
    try {
      const mission = await repository.editMission(
        parsed.missionId,
        parsed.field,
        parsed.newValue,
        msg.from.id
      );
      return mission
        ? send(msg.chat.id, `✅ Mission #${mission.id} updated: ${parsed.field}.`)
        : send(msg.chat.id, "❌ Mission not found.");
    } catch (error) {
      safeError("Edit mission command", error);
      return send(msg.chat.id, "❌ I couldn't update that mission.");
    }
  });

  bot.onText(/^\/endmission(?:@\w+)?(?:\s+(\d+))?$/, async (msg, match) => {
    if (!(await permissionAllowed(msg, "mission.end"))) return denyAdmin(msg);
    const missionId = parsePositiveId(match && match[1]);
    if (!missionId) return send(msg.chat.id, "❌ Use: /endmission mission_id");
    try {
      const mission = await repository.endMission(missionId, msg.from.id);
      return mission
        ? send(msg.chat.id, `✅ Mission #${mission.id} completed. Previous rewards remain recorded.`)
        : send(msg.chat.id, "❌ Mission not found.");
    } catch (error) {
      safeError("End mission command", error);
      return send(msg.chat.id, "❌ I couldn't end that mission.");
    }
  });

  bot.onText(/^\/approve(?:@\w+)?(?:\s+(\d+))?$/, async (msg, match) => {
    if (!(await permissionAllowed(msg, "submission.approve"))) return denyAdmin(msg);
    const submissionId = parsePositiveId(match && match[1]);
    if (!submissionId) return send(msg.chat.id, "❌ Use: /approve submission_id");
    try {
      const result = await repository.approveSubmission(submissionId, msg.from.id);
      if (result.already_awarded) {
        return send(msg.chat.id, "⚠️ This submission has already been awarded.");
      }
      await send(
        msg.chat.id,
        `✅ Submission Approved!\n\n📥 Submission #${submissionId}\n👤 ${result.telegram_id}\n🎯 ${result.mission_title}\n⭐ ${result.awarded_points} Legend Points awarded\n🏆 New total: ${result.total_points}`
      );
      try {
        await send(
          result.telegram_id,
          `✅ Raaiiidd Complete!\n\n🎯 ${result.mission_title}\n⭐ ${result.awarded_points} Legend Points awarded\n🏆 New total: ${result.total_points}\n🎖 Rank: ${getRank(result.total_points)}\n\nYour contribution has been recorded.`
        );
      } catch (notifyError) {
        safeError("Approval notification", notifyError);
      }
      return undefined;
    } catch (error) {
      safeError("Approve command", error);
      return send(msg.chat.id, "❌ I couldn't approve that submission.");
    }
  });

  bot.onText(/^\/reject(?:@\w+)?(?:\s+(\d+)\s+([\s\S]+))?$/, async (msg, match) => {
    if (!(await permissionAllowed(msg, "submission.reject"))) return denyAdmin(msg);
    const submissionId = parsePositiveId(match && match[1]);
    const reason = match && match[2] ? match[2].trim() : "";
    if (!submissionId || !reason) return send(msg.chat.id, "❌ Use: /reject submission_id reason");
    if (reason.length > 500) return send(msg.chat.id, "❌ Rejection reasons must be 500 characters or fewer.");
    try {
      const result = await repository.rejectSubmission(submissionId, msg.from.id, reason);
      if (result.outcome === "not_found") return send(msg.chat.id, "❌ Submission not found.");
      if (result.outcome === "already_reviewed") {
        return send(msg.chat.id, "⚠️ This submission has already been reviewed.");
      }
      await send(msg.chat.id, `✅ Submission Reviewed\n\n📥 Submission #${submissionId}\n❌ Rejected\n📝 Reason: ${reason}`);
      try {
        await send(
          result.submission.telegram_id,
          `❌ Submission Not Approved\n\n🎯 Mission #${result.submission.mission_id}\n📝 Reason: ${reason}\n\nYou may contact the Admin Team if you believe this needs review.`
        );
      } catch (notifyError) {
        safeError("Rejection notification", notifyError);
      }
      return undefined;
    } catch (error) {
      safeError("Reject command", error);
      return send(msg.chat.id, "❌ I couldn't reject that submission.");
    }
  });

  bot.onText(/^\/broadcast(?:@\w+)?(?:\s+([\s\S]+))?$/, async (msg, match) => {
    if (!(await permissionAllowed(msg, "communication.broadcast"))) return denyAdmin(msg);
    const message = match && match[1] ? match[1].trim() : "";
    if (!message) return send(msg.chat.id, "❌ Use: /broadcast Your message here");
    if (message.length > 4096) return send(msg.chat.id, "❌ Broadcasts must be 4096 characters or fewer.");
    if (!allowBroadcastDraft(String(msg.from.id))) {
      return send(msg.chat.id, "⚠️ Broadcast rate limit reached. Please wait one minute.");
    }

    pendingBroadcasts.set(msg.from.id, { message, createdAt: Date.now() });
    return send(
      msg.chat.id,
      `📢 Broadcast draft ready (${message.length} characters).\n\nUse /confirmbroadcast to send or /cancelbroadcast to cancel.`
    );
  });

  bot.onText(/^\/cancelbroadcast(?:@\w+)?$/, async (msg) => {
    if (!(await permissionAllowed(msg, "communication.broadcast"))) return denyAdmin(msg);
    pendingBroadcasts.delete(msg.from.id);
    return send(msg.chat.id, "✅ Broadcast cancelled.");
  });

  bot.onText(/^\/confirmbroadcast(?:@\w+)?$/, async (msg) => {
    if (!(await permissionAllowed(msg, "communication.broadcast"))) return denyAdmin(msg);
    const draft = pendingBroadcasts.get(msg.from.id);
    if (!draft || Date.now() - draft.createdAt > 10 * 60 * 1000) {
      pendingBroadcasts.delete(msg.from.id);
      return send(msg.chat.id, "❌ No active broadcast draft. Use /broadcast first.");
    }

    pendingBroadcasts.delete(msg.from.id);
    try {
      const recipients = new Set((await repository.listRegisteredTelegramIds()).map(String));
      for (const chatId of config.allowedChatIds) recipients.add(String(chatId));

      let sent = 0;
      let failed = 0;
      for (const recipient of recipients) {
        try {
          await send(recipient, draft.message);
          sent += 1;
        } catch {
          failed += 1;
        }
        await wait(50);
      }

      return send(
        msg.chat.id,
        `📢 Broadcast complete.\n\n✅ Sent: ${sent}\n❌ Failed: ${failed}\n👥 Total: ${recipients.size}`
      );
    } catch (error) {
      safeError("Broadcast", error);
      return send(msg.chat.id, "❌ The broadcast could not be completed.");
    }
  });

  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/")) return;
    const text = msg.text.trim();

    if (pendingWalletRegistration.has(msg.from.id)) {
      if (!isValidSolanaAddress(text)) {
        return send(
          msg.chat.id,
          "❌ That isn't a valid Solana public wallet address. Try again or use /cancel."
        );
      }
      try {
        await repository.saveWallet(msg.from.id, text);
        pendingWalletRegistration.delete(msg.from.id);
        return send(msg.chat.id, `✅ Wallet Connected!\n\n👛 ${shortenWallet(text)}`);
      } catch (error) {
        safeError("Wallet message", error);
        return send(msg.chat.id, "❌ I couldn't save your wallet.");
      }
    }

    if (!isDoneClaim(text)) return;

    try {
      const user = await repository.getUser(msg.from.id);
      if (!user) return send(msg.chat.id, "❌ You are not registered. Use /register first.");
      const mission = await repository.getCurrentMission();
      if (!mission) return send(msg.chat.id, "🚀 There is no active Raaiiidd to claim right now.");

      const claim = await repository.submitMissionClaim({
        missionId: mission.id,
        telegramId: msg.from.id,
        completionText: text
      });
      if (claim.duplicate) {
        return send(msg.chat.id, "⚠️ You have already claimed this mission reward.");
      }

      if (!config.autoApproveMissionClaims) {
        return send(
          msg.chat.id,
          `✅ Raaiiidd Submission Received!\n\n🎯 ${mission.title}\n📥 Submission #${claim.submission.id}\n⏳ Status: Pending Review\n⭐ Potential Reward: ${mission.reward_points} Legend Points\n\nAn Admin Team member will review it.`
        );
      }

      const approved = await repository.approveSubmission(claim.submission.id, null);
      return send(
        msg.chat.id,
        `✅ Raaiiidd Complete!\n\n⭐ ${approved.awarded_points} Legend Points awarded.\n🏆 Your leaderboard total has been updated.`
      );
    } catch (error) {
      safeError("Mission claim", error);
      return send(msg.chat.id, "❌ I couldn't record that mission claim. Please try again shortly.");
    }
  });

  return { PUBLIC_COMMANDS };
}

module.exports = { PUBLIC_COMMANDS, registerTelegramHandlers };
