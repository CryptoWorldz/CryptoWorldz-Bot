const REWARD_SETTLEMENT_COMMANDS = Object.freeze([
  { command: "rewardasset", description: "Choose USDC or SOL rewards" }
]);

const REWARD_ASSET_PATTERN = /^\/rewardasset(?:@\w+)?(?:\s+(usdc|sol))?$/i;
const FUNDING_PLAN_PATTERN = /^\/fundingplan(?:@\w+)?$/i;
const FUNDED_PATTERN = /^\/funded(?:@\w+)?(?:\s+([\s\S]+))?$/i;
const SOLANA_SIGNATURE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{40,100}$/;

function formatAud(cents) {
  return `AUD $${(Math.max(0, Number(cents) || 0) / 100).toFixed(2)}`;
}

function formatUsdc(amount) {
  const value = Number(amount) || 0;
  return `${value.toLocaleString("en-AU", { maximumFractionDigits: 6 })} USDC`;
}

function normalizeRewardAsset(value) {
  const asset = String(value || "").trim().toUpperCase();
  return asset === "USDC" || asset === "SOL" ? asset : null;
}

function parseFundingRecord(value) {
  const parts = String(value || "").split("|").map((part) => part.trim());
  if (parts.length !== 3) return { ok: false, error: "invalid_format" };

  const audDollars = Number(parts[0]);
  const usdcAmount = Number(parts[1]);
  const signature = parts[2];
  const audCents = Math.round(audDollars * 100);

  if (!Number.isFinite(audDollars) || audCents < 1 || audCents > 20000) {
    return { ok: false, error: "invalid_aud_value" };
  }
  if (!Number.isFinite(usdcAmount) || usdcAmount <= 0 || usdcAmount > 1000000) {
    return { ok: false, error: "invalid_usdc_amount" };
  }
  if (!SOLANA_SIGNATURE_PATTERN.test(signature)) {
    return { ok: false, error: "invalid_transaction_signature" };
  }

  return { ok: true, audCents, usdcAmount, signature };
}

function buildFundingPlan(status, treasuryAccount = null) {
  const schedule = Array.isArray(status.funding_schedule) ? status.funding_schedule : [];
  const rows = schedule.map(
    (item) => `• ${item.day_label}: ${formatAud(item.planned_aud_cents)} worth of USDC`
  );
  const wallet = treasuryAccount && treasuryAccount.public_address
    ? `\n👛 Kitty wallet: ${treasuryAccount.public_address}`
    : "\n👛 USDC Kitty wallet is not configured yet.";

  return [
    "💰 CryptoWorldz Weekly Reward Funding",
    "",
    `🎯 Operating target: ${formatAud(status.weekly_target_aud_cents)}`,
    `🛡 Absolute wallet deposit-recording cap: ${formatAud(status.weekly_max_aud_cents)}`,
    `⭐ Reward hard ceiling: ${Number(status.weekly_target_points) || 0} LP`,
    `🏦 Funding asset: ${status.funding_asset} on Solana`,
    `✅ Recorded this week: ${formatAud(status.recorded_aud_cents)}`,
    `📊 Target remaining: ${formatAud(status.remaining_aud_cents)}`,
    `🚨 Hard-cap remaining: ${formatAud(status.max_remaining_aud_cents)}`,
    "",
    "Planned operating deposits:",
    ...(rows.length ? rows : ["• No active deposit schedule"]),
    wallet,
    "",
    "Members may choose USDC or SOL. USDC is the default. A SOL reward keeps the same USDC value and is converted using the current quote only when the payout is approved.",
    "",
    "The AUD $200 wallet cap is an emergency maximum, not a spending recommendation. No automatic transfers are enabled."
  ].join("\n");
}

function registerRewardSettlementHandlers({ bot, repository, supabase, config }) {
  const send = (chatId, text, options) => bot.sendMessage(chatId, text, options);
  const ownerAllowed = (msg) =>
    String(msg && msg.from && msg.from.id) === String(config.ownerTelegramId);

  async function getFundingStatus() {
    const { data, error } = await supabase.rpc("get_reward_funding_status");
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function getPreference(telegramId) {
    const { data, error } = await supabase
      .from("member_reward_preferences")
      .select("preferred_asset,network,conversion_policy,updated_at")
      .eq("telegram_id", Number(telegramId))
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  bot.onText(REWARD_ASSET_PATTERN, async (msg, match) => {
    try {
      const user = await repository.getUser(msg.from.id);
      if (!user) return send(msg.chat.id, "❌ Register with /register before choosing a reward asset.");

      const requested = normalizeRewardAsset(match && match[1]);
      if (!requested) {
        const preference = await getPreference(msg.from.id);
        const asset = preference ? preference.preferred_asset : "USDC";
        return send(
          msg.chat.id,
          `💜 Your Reward Asset\n\nCurrent choice: ${asset}\nNetwork: Solana\nWallet: ${user.wallet || "Not connected"}\n\nChoose with:\n/rewardasset usdc\n/rewardasset sol\n\nUSDC is paid at its approved USDC amount. SOL keeps the same USDC value and is converted at the payout-time quote. Rewards remain manually approved and are not sent automatically.`
        );
      }

      const { error } = await supabase
        .from("member_reward_preferences")
        .upsert({
          telegram_id: Number(msg.from.id),
          preferred_asset: requested,
          network: "solana",
          conversion_policy: "quote_at_payout",
          updated_at: new Date().toISOString()
        }, { onConflict: "telegram_id" });
      if (error) throw error;

      const walletLine = user.wallet
        ? `👛 Wallet: ${user.wallet}`
        : "⚠️ Connect a Solana wallet with /wallet before any payout can be completed.";
      const detail = requested === "USDC"
        ? "Your approved reward will be paid in Solana USDC."
        : "Your approved reward will keep the same USDC value and be converted to SOL using the current payout-time quote.";

      return send(
        msg.chat.id,
        `✅ Reward asset updated to ${requested}.\n\n${detail}\n${walletLine}\n\nNo payout is automatic; each reward remains owner-approved and recorded on-chain.`
      );
    } catch (error) {
      console.error("Reward asset preference failed", {
        name: error && error.name ? error.name : "Error"
      });
      return send(msg.chat.id, "❌ Zed couldn't update your reward asset choice.");
    }
  });

  bot.onText(FUNDING_PLAN_PATTERN, async (msg) => {
    if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");
    try {
      const [statusResult, accountResult] = await Promise.all([
        getFundingStatus(),
        supabase
          .from("treasury_accounts")
          .select("public_address,asset,network,status")
          .eq("network", "solana")
          .eq("asset", "USDC")
          .eq("status", "active")
          .limit(1)
          .maybeSingle()
      ]);
      if (accountResult.error) throw accountResult.error;
      return send(msg.chat.id, buildFundingPlan(statusResult, accountResult.data));
    } catch (error) {
      console.error("Reward funding plan failed", {
        name: error && error.name ? error.name : "Error"
      });
      return send(msg.chat.id, "❌ Zed couldn't load the weekly funding plan.");
    }
  });

  bot.onText(FUNDED_PATTERN, async (msg, match) => {
    if (!ownerAllowed(msg)) return send(msg.chat.id, "⛔ Owner access required.");

    const parsed = parseFundingRecord(match && match[1]);
    if (!parsed.ok) {
      return send(
        msg.chat.id,
        "❌ Use: /funded AUD value | USDC amount | Solana transaction signature\nExample: /funded 40 | 26.15 | 5K...\n\nOperating target: AUD $100. Absolute weekly wallet-recording cap: AUD $200."
      );
    }

    try {
      const { data, error } = await supabase.rpc("record_reward_funding_deposit", {
        p_aud_value_cents: parsed.audCents,
        p_usdc_amount: parsed.usdcAmount,
        p_transaction_signature: parsed.signature,
        p_recorded_by: Number(msg.from.id)
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;

      if (!result || result.outcome === "weekly_max_exceeded") {
        return send(
          msg.chat.id,
          `🛑 That entry would exceed the AUD $200 weekly Reward Wallet cap.\n\nAlready recorded: ${formatAud(result ? result.weekly_recorded_aud_cents : 0)}\nHard-cap remaining: ${formatAud(result ? result.weekly_max_remaining_aud_cents : 0)}`
        );
      }
      if (result.outcome === "duplicate_transaction") {
        return send(msg.chat.id, "⚠️ That transaction signature is already recorded.");
      }
      if (result.outcome !== "recorded") {
        return send(msg.chat.id, "❌ That funding entry could not be recorded. Check the values and transaction signature.");
      }

      return send(
        msg.chat.id,
        `✅ USDC reward funding recorded.\n\n💵 AUD allocation: ${formatAud(parsed.audCents)}\n🏦 Deposited: ${formatUsdc(parsed.usdcAmount)}\n📊 Weekly recorded total: ${formatAud(result.weekly_recorded_aud_cents)}\n🎯 Operating-target remaining: ${formatAud(result.weekly_remaining_aud_cents)}\n🛡 Hard-cap remaining: ${formatAud(result.weekly_max_remaining_aud_cents)}\n\nThis records the owner-provided transaction reference; it does not authorize automatic spending.`
      );
    } catch (error) {
      console.error("Protected reward budget update failed", {
        name: error && error.name ? error.name : "Error"
      });
      return send(msg.chat.id, "❌ Zed couldn't record that USDC funding transaction.");
    }
  });
}

module.exports = {
  FUNDING_PLAN_PATTERN,
  FUNDED_PATTERN,
  REWARD_ASSET_PATTERN,
  REWARD_SETTLEMENT_COMMANDS,
  buildFundingPlan,
  normalizeRewardAsset,
  parseFundingRecord,
  registerRewardSettlementHandlers
};
