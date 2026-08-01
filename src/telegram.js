const {
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
  parseEditMissionPayload,
  parseNewMissionPayload,
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
  { command: "points", description: "View your Legend Points" },
  { command: "leaderboard", description: "View the Top 25 Legends" },
  { command: "raaiiidd", description: "View the newest active Raaiiidd" },
  { command: "missions", description: "View every active Raaiiidd" },
  { command: "wallet", description: "Connect a public Solana wallet" },
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
  const adminAllowed = (msg) => isAdmin(msg.from.id, config.adminTelegramIds);

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
      const profile = await repository.getProfile(msg.from.id);
      if (!profile) return send(msg.chat.id, "❌ You are not registered. Use /register first.");

      const { user, rewardsEarned } = profile;
      const points = Number(user.points) || 0;
      const completed = Math.max(Number(user.raids) || 0, Number(user.raids_completed) || 0);
      const displayName = user.username ? `@${user.username}` : user.first_name || "Legend";
      return send(
        msg.chat.id,
        `🏆 CryptoWorldz Legend Profile

👤 Username: ${displayName}
🎖 Rank: ${getRank(points)}
⭐ Points: ${points}
🚀 Missions Completed: ${completed}
👛 Wallet Connected: ${user.wallet ? `Yes ✅\n${shortenWallet(user.wallet)}` : "No"}
🎁 Rewards Earned: ${rewardsEarned} Legend Points`
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
        if (!adminAllowed(msg)) return denyAdmin(msg);
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

  bot.onText(/^\/leaderboard(?:@\w+)?$/, async (msg) => {
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

  bot.onText(/^\/help(?:@\w+)?$/, (msg) =>
    send(
      msg.chat.id,
      "🤖💜 Zed — CryptoWorldz Command Centre\n\n/start\n/help\n/register\n/profile\n/points\n/leaderboard\n/raid\n/raaiiidd\n/missions\n/wallet\n/cancel\n/community\n/website\n\n⚠️ Never provide a private key or seed phrase."
    )
  );

  bot.onText(/^\/newmission(?:@\w+)?(?:\s+([\s\S]+))?$/, async (msg, match) => {
    if (!adminAllowed(msg)) return denyAdmin(msg);
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
    if (!adminAllowed(msg)) return denyAdmin(msg);
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
    if (!adminAllowed(msg)) return denyAdmin(msg);
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
    if (!adminAllowed(msg)) return denyAdmin(msg);
    const submissionId = parsePositiveId(match && match[1]);
    if (!submissionId) return send(msg.chat.id, "❌ Use: /approve submission_id");
    try {
      const result = await repository.approveSubmission(submissionId, msg.from.id);
      if (result.already_awarded) {
        return send(msg.chat.id, "⚠️ This submission has already been awarded.");
      }
      await send(
        msg.chat.id,
        `✅ Submission #${submissionId} approved.\n⭐ ${result.awarded_points} Legend Points awarded.`
      );
      try {
        await send(
          result.telegram_id,
          `✅ Raaiiidd Complete!\n\n⭐ ${result.awarded_points} Legend Points awarded.\n🏆 Your leaderboard total has been updated.`
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
    if (!adminAllowed(msg)) return denyAdmin(msg);
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
      await send(msg.chat.id, `✅ Submission #${submissionId} rejected. No points were awarded.`);
      try {
        await send(
          result.submission.telegram_id,
          `❌ Mission submission #${submissionId} was not approved.\n\nReason: ${reason}`
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
    if (!adminAllowed(msg)) return denyAdmin(msg);
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
    if (!adminAllowed(msg)) return denyAdmin(msg);
    pendingBroadcasts.delete(msg.from.id);
    return send(msg.chat.id, "✅ Broadcast cancelled.");
  });

  bot.onText(/^\/confirmbroadcast(?:@\w+)?$/, async (msg) => {
    if (!adminAllowed(msg)) return denyAdmin(msg);
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
          `✅ Mission completion submitted.\n\n🆔 Submission #${claim.submission.id}\nZed has recorded your claim for review. Points will be awarded after approval.`
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
