const AUTO_REFRESH_MS = 60 * 60 * 1000;
const TEAM_APPROVER_NAMES = new Set(["stepper", "remedy", "savage"]);

const REWARD_QUEUE_PATTERN = /^\/rewardqueue(?:@\w+)?$/i;
const REWARD_APPROVE_PATTERN = /^\/rewardapprove(?:@\w+)?(?:\s+(\d+))?$/i;
const REWARD_APPROVER_PATTERN = /^\/rewardapprover(?:@\w+)?(?:\s+([A-Za-z0-9_ -]+)\s+(on|off))?$/i;
const REWARD_APPROVERS_PATTERN = /^\/rewardapprovers(?:@\w+)?$/i;
const REWARD_AUTO_PATTERN = /^\/rewardauto(?:@\w+)?$/i;

function formatUsdc(value) {
  return `${(Math.max(0, Number(value) || 0)).toLocaleString("en-AU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6
  })} USDC`;
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

async function getRewardWallet(supabase) {
  const { data, error } = await supabase
    .from("project_wallets")
    .select("purpose,label,public_address,status,accepted_assets")
    .eq("purpose", "rewards")
    .maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "active" || !data.public_address) return null;
  if (!Array.isArray(data.accepted_assets) || !data.accepted_assets.includes("USDC")) return null;
  return data;
}

async function getSolanaUsdcBalance({ rpcUrl, ownerAddress, usdcMint }) {
  if (!rpcUrl || !ownerAddress || !usdcMint) throw new Error("reward_wallet_balance_unavailable");
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenAccountsByOwner",
      params: [
        ownerAddress,
        { mint: usdcMint },
        { encoding: "jsonParsed", commitment: "confirmed" }
      ]
    }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error("reward_wallet_balance_unavailable");
  const payload = await response.json();
  if (payload.error || !payload.result || !Array.isArray(payload.result.value)) {
    throw new Error("reward_wallet_balance_unavailable");
  }
  return payload.result.value.reduce((total, item) => {
    const amount = Number(
      item &&
      item.account &&
      item.account.data &&
      item.account.data.parsed &&
      item.account.data.parsed.info &&
      item.account.data.parsed.info.tokenAmount &&
      item.account.data.parsed.info.tokenAmount.uiAmountString
    );
    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

async function prepareAutoRewardBatch({ supabase, config, generatedBy = null }) {
  const wallet = await getRewardWallet(supabase);
  if (!wallet) return { outcome: "reward_wallet_not_configured" };
  const kittyUsdc = await getSolanaUsdcBalance({
    rpcUrl: config.solanaRpcUrl,
    ownerAddress: wallet.public_address,
    usdcMint: config.solanaUsdcMint
  });
  const { data, error } = await supabase.rpc("prepare_auto_reward_batch", {
    p_kitty_usdc: kittyUsdc,
    p_generated_by: generatedBy == null ? null : Number(generatedBy)
  });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  return { ...(result || { outcome: "unknown" }), kitty_usdc: kittyUsdc, wallet: wallet.public_address };
}

async function listAutoRewardQueue(supabase, limit = 25) {
  const { data, error } = await supabase.rpc("get_auto_reward_queue", { p_limit: limit });
  if (error) throw error;
  return data || [];
}

async function canApprove({ repository, config, telegramId }) {
  if (String(telegramId) === String(config.ownerTelegramId)) return true;
  return repository.hasPermission(
    telegramId,
    "reward.approve",
    config.adminTelegramIds,
    config.ownerTelegramId
  );
}

async function resolveTeamApprover(supabase, target) {
  const raw = String(target || "").trim();
  let query = supabase
    .from("executive_admins")
    .select("telegram_id,display_name,status");
  if (/^\d+$/.test(raw)) query = query.eq("telegram_id", Number(raw));
  else query = query.ilike("display_name", raw);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw error;
  if (!data || !TEAM_APPROVER_NAMES.has(normalizeName(data.display_name))) return null;
  return data;
}

async function listNamedApprovers(supabase) {
  const { data: executives, error } = await supabase
    .from("executive_admins")
    .select("telegram_id,display_name,status")
    .in("display_name", ["Stepper", "Remedy", "Savage"])
    .order("display_name", { ascending: true });
  if (error) throw error;
  const ids = (executives || []).map((item) => item.telegram_id);
  if (!ids.length) return [];
  const { data: permissions, error: permissionError } = await supabase
    .from("bot_admin_permissions")
    .select("telegram_id,enabled")
    .eq("permission", "reward.approve")
    .in("telegram_id", ids);
  if (permissionError) throw permissionError;
  const enabled = new Map((permissions || []).map((item) => [String(item.telegram_id), Boolean(item.enabled)]));
  return (executives || []).map((item) => ({
    ...item,
    reward_approval: enabled.get(String(item.telegram_id)) === true
  }));
}

function queueText(rows, prepared) {
  const header = [
    "🎁 ZED Auto Reward Queue",
    "",
    `Kitty: ${formatUsdc(prepared && prepared.kitty_usdc)}`,
    prepared && prepared.reward_week_start ? `Reward week: ${prepared.reward_week_start}` : null,
    prepared && prepared.pool_usdc != null ? `Automatic pool: ${formatUsdc(prepared.pool_usdc)}` : null,
    prepared && prepared.total_points != null ? `Rewardable LP: ${Number(prepared.total_points) || 0}` : null,
    "",
    "ZED calculates every amount. Approvers can only APPROVE — they cannot edit the amount."
  ].filter(Boolean);
  if (!rows.length) return [...header, "", "No rewards are waiting for approval."].join("\n");
  const items = rows.map((row) => {
    const name = row.username ? `@${row.username}` : row.first_name || `Telegram ${row.telegram_id}`;
    const wallet = row.wallet_address ? `${String(row.wallet_address).slice(0, 6)}…${String(row.wallet_address).slice(-6)}` : "Wallet required";
    return [
      "",
      `#${row.queue_id} • ${name}`,
      `⭐ ${Number(row.legend_points) || 0} LP`,
      `🎁 ${formatUsdc(row.usdc_amount)}${row.preferred_asset === "SOL" ? " value → SOL at payout quote" : ""}`,
      `👛 ${wallet}`,
      row.status === "wallet_required" ? "⏳ Waiting for member wallet" : `✅ /rewardapprove ${row.queue_id}`
    ].join("\n");
  });
  return [...header, ...items].join("\n");
}

function registerAutoKittyRewardSystem({ bot, repository, supabase, config }) {
  const send = (chatId, text) => bot.sendMessage(chatId, text);
  const isOwner = (id) => String(id || "") === String(config.ownerTelegramId || "");

  async function refreshAndNotify() {
    try {
      const result = await prepareAutoRewardBatch({ supabase, config });
      if (result && result.outcome === "created" && config.ownerTelegramId) {
        await send(
          config.ownerTelegramId,
          `🎁 ZED prepared the weekly Auto Reward Queue.\n\n⭐ ${Number(result.total_points) || 0} LP qualified\n💰 ${formatUsdc(result.allocated_usdc)} allocated from the Kitty\n👥 ${Number(result.queued_count) || 0} Legends queued\n\nAmounts are locked. Use /rewardqueue and only APPROVE when ready.`
        ).catch(() => undefined);
      }
    } catch (error) {
      console.error("Auto reward refresh failed", { name: error && error.name || "Error" });
    }
  }

  bot.onText(REWARD_QUEUE_PATTERN, async (msg) => {
    if (!(await canApprove({ repository, config, telegramId: msg.from.id }))) {
      return send(msg.chat.id, "⛔ Reward approval access is not enabled for you.");
    }
    try {
      const prepared = await prepareAutoRewardBatch({ supabase, config, generatedBy: msg.from.id });
      const rows = await listAutoRewardQueue(supabase, 25);
      return send(msg.chat.id, queueText(rows, prepared));
    } catch (error) {
      console.error("Reward queue failed", { name: error && error.name || "Error" });
      return send(msg.chat.id, "❌ ZED couldn't load the Auto Reward Queue.");
    }
  });

  bot.onText(REWARD_APPROVE_PATTERN, async (msg, match) => {
    if (!(await canApprove({ repository, config, telegramId: msg.from.id }))) {
      return send(msg.chat.id, "⛔ Reward approval access is not enabled for you.");
    }
    const queueId = Number(match && match[1]);
    if (!Number.isSafeInteger(queueId) || queueId <= 0) {
      return send(msg.chat.id, "❌ Use: /rewardapprove QUEUE_ID");
    }
    try {
      const { data, error } = await supabase.rpc("approve_auto_reward", {
        p_queue_id: queueId,
        p_approved_by: Number(msg.from.id)
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (!result || result.outcome === "not_found") return send(msg.chat.id, "❌ Reward queue item not found.");
      if (result.outcome === "wallet_required") return send(msg.chat.id, "⏳ That Legend must connect a Solana wallet before approval.");
      if (result.outcome === "already_approved") return send(msg.chat.id, "✅ That reward is already approved.");
      if (result.outcome !== "approved") return send(msg.chat.id, "❌ That reward cannot be approved right now.");

      await Promise.allSettled([
        send(
          result.telegram_id,
          `🎁 CryptoWorldz Reward Approved!\n\n⭐ Rewarded participation: ${Number(result.legend_points) || 0} LP\n💰 Value: ${formatUsdc(result.usdc_amount)}\n🏦 Asset: ${result.preferred_asset}\n\nYour lifetime Legend Points stay on your profile. This reward period is now marked so it cannot be rewarded twice.`
        ),
        send(
          msg.chat.id,
          `✅ APPROVED\n\n#${queueId}\n⭐ ${Number(result.legend_points) || 0} LP\n🎁 ${formatUsdc(result.usdc_amount)}\n🏦 ${result.preferred_asset}\n\nZED locked the amount — no amount decision or editing was required.`
        )
      ]);
      return undefined;
    } catch (error) {
      console.error("Auto reward approval failed", { name: error && error.name || "Error" });
      return send(msg.chat.id, "❌ ZED couldn't approve that reward.");
    }
  });

  bot.onText(REWARD_APPROVER_PATTERN, async (msg, match) => {
    if (!isOwner(msg.from && msg.from.id)) return send(msg.chat.id, "⛔ Owner access required.");
    const target = String(match && match[1] || "").trim();
    const enabled = String(match && match[2] || "").toLowerCase() === "on";
    if (!target || !match || !match[2]) {
      return send(msg.chat.id, "❌ Use: /rewardapprover stepper|remedy|savage on|off");
    }
    try {
      const executive = await resolveTeamApprover(supabase, target);
      if (!executive) return send(msg.chat.id, "❌ Reward approval delegation is limited to Stepper, Remedy and Savage.");
      await repository.setAdminPermission(
        executive.telegram_id,
        "reward.approve",
        enabled,
        msg.from.id
      );
      const statusNote = executive.status === "active"
        ? ""
        : `\n⚠️ ${executive.display_name}'s Executive record is currently ${executive.status}; the permission is stored but cannot be used until that account is active.`;
      return send(
        msg.chat.id,
        `${enabled ? "✅" : "🛡"} ${executive.display_name} Reward Approval: ${enabled ? "ENABLED" : "DISABLED"}${statusNote}\n\nThey can approve ZED-calculated rewards only. They cannot change LP, percentages or payout amounts.`
      );
    } catch (error) {
      return send(msg.chat.id, "❌ ZED couldn't update that Reward Approver.");
    }
  });

  bot.onText(REWARD_APPROVERS_PATTERN, async (msg) => {
    if (!isOwner(msg.from && msg.from.id)) return send(msg.chat.id, "⛔ Owner access required.");
    try {
      const rows = await listNamedApprovers(supabase);
      return send(
        msg.chat.id,
        `💪 Reward Approval Team\n\n${rows.map((row) => `${row.reward_approval ? "✅" : "⬜"} ${row.display_name} — ${row.reward_approval ? "APPROVAL ON" : "approval off"} • Executive ${row.status}`).join("\n")}\n\nOnly JayJayTeamDev can turn this authority on or off.`
      );
    } catch {
      return send(msg.chat.id, "❌ ZED couldn't load the Reward Approval Team.");
    }
  });

  bot.onText(REWARD_AUTO_PATTERN, async (msg) => {
    if (!(await canApprove({ repository, config, telegramId: msg.from.id }))) {
      return send(msg.chat.id, "⛔ Reward approval access is not enabled for you.");
    }
    try {
      const prepared = await prepareAutoRewardBatch({ supabase, config, generatedBy: msg.from.id });
      const outcome = {
        created: "A completed-week reward batch has been created.",
        existing: "The completed-week reward batch already exists.",
        kitty_below_minimum: "The Kitty is still building. No reward batch is created yet.",
        pool_below_minimum: "The calculated reward pool is still too small.",
        no_points: "No rewardable Legend Points were earned in the completed week.",
        reward_wallet_not_configured: "The Reward Wallet is not configured."
      }[prepared.outcome] || `Status: ${prepared.outcome || "unknown"}`;
      return send(
        msg.chat.id,
        `🤖 ZED Auto Rewards\n\n${outcome}\n💰 Live Reward Kitty: ${formatUsdc(prepared.kitty_usdc)}\n📐 Rule: 10% of available Kitty each completed week\n🛡 Minimum Kitty gate: 100 USDC\n\nZED calculates. Humans only approve.`
      );
    } catch {
      return send(msg.chat.id, "❌ ZED couldn't read the live Reward Kitty.");
    }
  });

  const first = setTimeout(refreshAndNotify, 15000);
  if (typeof first.unref === "function") first.unref();
  const timer = setInterval(refreshAndNotify, AUTO_REFRESH_MS);
  if (typeof timer.unref === "function") timer.unref();

  return { refreshAndNotify };
}

module.exports = {
  REWARD_APPROVE_PATTERN,
  REWARD_APPROVER_PATTERN,
  REWARD_APPROVERS_PATTERN,
  REWARD_AUTO_PATTERN,
  REWARD_QUEUE_PATTERN,
  TEAM_APPROVER_NAMES,
  formatUsdc,
  getSolanaUsdcBalance,
  registerAutoKittyRewardSystem
};
