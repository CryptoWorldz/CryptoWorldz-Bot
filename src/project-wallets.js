const QRCode = require("qrcode");
const { createRequestLimiter, validateTelegramInitData } = require("./miniapp-auth");
const { solanaPayUri, verifySolanaContribution } = require("./solana");

const PROJECT_WALLET_COMMANDS = Object.freeze([
  { command: "contribute", description: "View CryptoWorldz contribution wallets" }
]);

const PURPOSES = Object.freeze(["dev", "investment", "treasury", "rewards"]);
const CONTRIBUTION_PURPOSES = new Set(["dev", "treasury", "rewards"]);
const SOLANA_SIGNATURE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{40,100}$/;
const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function formatAud(cents) {
  return `AUD $${(Math.max(0, Number(cents) || 0) / 100).toFixed(2)}`;
}

function purposeIcon(purpose) {
  return ({ dev: "🛠️", investment: "💎", treasury: "🏦", rewards: "🎁" })[purpose] || "👛";
}

function purposeLabel(purpose) {
  return ({
    dev: "Dev & Launch Wallet",
    investment: "Owner Investment Wallet",
    treasury: "Treasury Multisig",
    rewards: "Reward Wallet"
  })[purpose] || purpose;
}

function parseInvestmentFunding(value) {
  const parts = String(value || "").split("|").map((part) => part.trim());
  if (parts.length !== 3) return { ok: false };
  const aud = Number(parts[0]);
  const usdc = Number(parts[1]);
  const signature = parts[2];
  const audCents = Math.round(aud * 100);
  if (!Number.isFinite(aud) || audCents < 1 || audCents > 10000) return { ok: false };
  if (!Number.isFinite(usdc) || usdc <= 0 || usdc > 1000000) return { ok: false };
  if (!SOLANA_SIGNATURE_PATTERN.test(signature)) return { ok: false };
  return { ok: true, audCents, usdc, signature };
}

function registerProjectWalletSystem({ app, bot, config, supabase }) {
  const allowRequest = createRequestLimiter({ maxEvents: 40, intervalMs: 60000 });
  const isOwnerId = (id) => String(id || "") === String(config.ownerTelegramId || "");
  const send = (chatId, text, options) => bot.sendMessage(chatId, text, options);

  async function authenticateMini(req, res, next) {
    const result = validateTelegramInitData(req.get("x-telegram-init-data") || "", config.botToken);
    if (!result.ok) return res.status(401).json({ ok: false, error: result.error });
    if (!allowRequest(`${result.user.id}:${req.ip}`)) return res.status(429).json({ ok: false, error: "rate_limited" });
    req.telegramUser = result.user;
    return next();
  }

  async function listWallets() {
    const { data, error } = await supabase
      .from("project_wallets")
      .select("purpose,label,network,public_address,wallet_type,control_policy,status,contribution_enabled,accepted_assets,notes,updated_at")
      .order("purpose", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function getWallet(purpose) {
    const { data, error } = await supabase
      .from("project_wallets")
      .select("purpose,label,network,public_address,wallet_type,control_policy,status,contribution_enabled,accepted_assets,notes")
      .eq("purpose", purpose)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function fundingStatus() {
    const { data, error } = await supabase.rpc("get_investment_funding_status");
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  function walletPlanText(wallets, funding) {
    const byPurpose = new Map(wallets.map((wallet) => [wallet.purpose, wallet]));
    const rows = PURPOSES.map((purpose) => {
      const wallet = byPurpose.get(purpose);
      const status = wallet && wallet.status === "active" && wallet.public_address ? "ACTIVE" : "SETUP PENDING";
      return `${purposeIcon(purpose)} ${purposeLabel(purpose)} — ${status}`;
    });
    return [
      "👛 CryptoWorldz Four-Wallet Plan",
      "",
      ...rows,
      "",
      "💎 Owner Investment Policy",
      "• One dedicated transparent wallet",
      "• USDC-funded and BUY ONLY",
      "• No rotating subwallets",
      "• No randomised execution",
      "• Six approved amount presets: 2, 3, 5, 7, 10 or 15 USDC",
      "• Maximum six completed buys per day",
      "• Minimum four hours between buys in a schedule",
      "• AUD $100 weekly funding ceiling",
      `• Recorded this week: ${formatAud(funding.recorded_aud_cents)}`,
      `• Remaining: ${formatAud(funding.remaining_aud_cents)}`,
      "",
      "Zed stores public addresses and audit records only. No seed phrase or private key belongs in Telegram, GitHub or Supabase."
    ].join("\n");
  }

  bot.onText(/^\/walletplan(?:@\w+)?$/i, async (msg) => {
    if (!isOwnerId(msg.from && msg.from.id)) return send(msg.chat.id, "⛔ Owner access required.");
    try {
      const [wallets, funding] = await Promise.all([listWallets(), fundingStatus()]);
      return send(msg.chat.id, walletPlanText(wallets, funding));
    } catch (error) {
      console.error("Wallet plan command failed", { name: error && error.name || "Error" });
      return send(msg.chat.id, "❌ Zed couldn't load the wallet plan.");
    }
  });

  bot.onText(/^\/setprojectwallet(?:@\w+)?(?:\s+(dev|investment|treasury|rewards)\s+([1-9A-HJ-NP-Za-km-z]{32,44}))?$/i, async (msg, match) => {
    if (!isOwnerId(msg.from && msg.from.id)) return send(msg.chat.id, "⛔ Owner access required.");
    const purpose = String(match && match[1] || "").toLowerCase();
    const address = String(match && match[2] || "").trim();
    if (!PURPOSES.includes(purpose) || !SOLANA_ADDRESS_PATTERN.test(address)) {
      return send(msg.chat.id, "❌ Use: /setprojectwallet dev|investment|treasury|rewards PUBLIC_SOLANA_ADDRESS\n\nNever enter a seed phrase or private key.");
    }
    try {
      const { error } = await supabase
        .from("project_wallets")
        .update({
          public_address: address,
          status: "active",
          updated_by: Number(msg.from.id),
          updated_at: new Date().toISOString()
        })
        .eq("purpose", purpose);
      if (error) throw error;

      if (purpose === "investment") {
        const { error: dcaError } = await supabase
          .from("auto_dca_settings")
          .update({
            wallet_address: address,
            execution_enabled: false,
            enabled: false,
            paused: true,
            emergency_stop: true,
            updated_by: Number(msg.from.id),
            updated_at: new Date().toISOString()
          })
          .eq("id", 1);
        if (dcaError) throw dcaError;
      }

      const warning = purpose === "treasury"
        ? "\n\nFor Squads, enter the Vault address only — never the multisig account address."
        : "";
      return send(msg.chat.id, `✅ ${purposeLabel(purpose)} public address recorded.\n\n${address}${warning}\n\nExecution and transfers remain disabled.`);
    } catch (error) {
      console.error("Project wallet update failed", { name: error && error.name || "Error" });
      return send(msg.chat.id, "❌ Zed couldn't save that wallet address.");
    }
  });

  bot.onText(/^\/investmentfunded(?:@\w+)?(?:\s+([\s\S]+))?$/i, async (msg, match) => {
    if (!isOwnerId(msg.from && msg.from.id)) return send(msg.chat.id, "⛔ Owner access required.");
    const parsed = parseInvestmentFunding(match && match[1]);
    if (!parsed.ok) {
      return send(msg.chat.id, "❌ Use: /investmentfunded AUD_VALUE | USDC_AMOUNT | SOLANA_TRANSACTION_SIGNATURE\nExample: /investmentfunded 40 | 26.10 | 5K...full signature");
    }
    try {
      const { data, error } = await supabase.rpc("record_investment_funding_deposit", {
        p_aud_value_cents: parsed.audCents,
        p_usdc_amount: parsed.usdc,
        p_transaction_signature: parsed.signature,
        p_recorded_by: Number(msg.from.id)
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (!result || result.outcome === "weekly_target_exceeded") {
        return send(msg.chat.id, `🛑 That would exceed the AUD $100 weekly investment limit.\n\nRecorded: ${formatAud(result && result.weekly_recorded_aud_cents)}\nRemaining: ${formatAud(result && result.weekly_remaining_aud_cents)}`);
      }
      if (result.outcome === "duplicate_transaction") return send(msg.chat.id, "⚠️ That transaction signature is already recorded.");
      if (result.outcome !== "recorded") return send(msg.chat.id, "❌ That investment funding entry was not accepted.");
      return send(msg.chat.id, `✅ Investment funding recorded.\n\nAUD allocation: ${formatAud(parsed.audCents)}\nActual deposit: ${parsed.usdc} USDC\nWeekly recorded: ${formatAud(result.weekly_recorded_aud_cents)}\nWeekly remaining: ${formatAud(result.weekly_remaining_aud_cents)}\n\nNo automatic buy or transfer was authorised.`);
    } catch (error) {
      console.error("Investment funding record failed", { name: error && error.name || "Error" });
      return send(msg.chat.id, "❌ Zed couldn't record that investment funding transaction.");
    }
  });

  bot.onText(/^\/contribute(?:@\w+)?$/i, async (msg) => {
    try {
      const wallets = (await listWallets()).filter((wallet) => wallet.contribution_enabled);
      const rows = wallets.map((wallet) => {
        const address = wallet.status === "active" && wallet.public_address ? wallet.public_address : "Address setup pending";
        return `${purposeIcon(wallet.purpose)} ${wallet.label}\n${address}`;
      });
      return send(msg.chat.id, `💜 CryptoWorldz Contributions\n\n${rows.join("\n\n")}\n\nOpen your Command Centre Profile for secure QR and verification tools. Contributions are voluntary and do not earn Legend Points. Zed never asks for private keys.`);
    } catch (error) {
      return send(msg.chat.id, "❌ Contribution wallet details are temporarily unavailable.");
    }
  });

  app.get("/api/mini/project-wallets", authenticateMini, async (req, res) => {
    try {
      const wallets = await listWallets();
      return res.json({
        ok: true,
        wallets: wallets.map((wallet) => ({
          ...wallet,
          public_address: wallet.status === "active" ? wallet.public_address : null
        }))
      });
    } catch (error) {
      return res.status(500).json({ ok: false, error: "wallet_directory_failed" });
    }
  });

  app.get("/api/mini/project-wallets/:purpose/qr", authenticateMini, async (req, res) => {
    try {
      const purpose = String(req.params.purpose || "").toLowerCase();
      const asset = String(req.query.asset || "USDC").toUpperCase();
      const amount = req.query.amount === undefined || req.query.amount === "" ? null : Number(req.query.amount);
      if (!CONTRIBUTION_PURPOSES.has(purpose) || !["USDC", "SOL"].includes(asset)) return res.status(400).json({ ok: false, error: "invalid_contribution" });
      if (amount !== null && (!Number.isFinite(amount) || amount <= 0 || amount > 1000000)) return res.status(400).json({ ok: false, error: "invalid_amount" });
      const wallet = await getWallet(purpose);
      if (!wallet || !wallet.contribution_enabled || wallet.status !== "active" || !wallet.public_address) return res.status(409).json({ ok: false, error: "wallet_setup_pending" });
      if (!wallet.accepted_assets.includes(asset)) return res.status(400).json({ ok: false, error: "asset_not_supported" });
      const uri = solanaPayUri({ recipient: wallet.public_address, asset, amount, usdcMint: config.solanaUsdcMint });
      const png = await QRCode.toBuffer(uri, { type: "png", width: 420, margin: 2, color: { dark: "#180526", light: "#ffffff" } });
      res.set("Cache-Control", "no-store");
      return res.type("png").send(png);
    } catch (error) {
      return res.status(500).json({ ok: false, error: "qr_failed" });
    }
  });

  app.post("/api/mini/project-wallets/:purpose/claim", authenticateMini, async (req, res) => {
    try {
      const purpose = String(req.params.purpose || "").toLowerCase();
      const asset = String(req.body && req.body.asset || "").toUpperCase();
      const signature = String(req.body && req.body.signature || "").trim();
      if (!CONTRIBUTION_PURPOSES.has(purpose) || !["USDC", "SOL"].includes(asset) || !SOLANA_SIGNATURE_PATTERN.test(signature)) return res.status(400).json({ ok: false, error: "invalid_contribution" });
      const wallet = await getWallet(purpose);
      if (!wallet || !wallet.contribution_enabled || wallet.status !== "active" || !wallet.public_address) return res.status(409).json({ ok: false, error: "wallet_setup_pending" });
      const { data: member, error: memberError } = await supabase.from("users").select("telegram_id").eq("telegram_id", req.telegramUser.id).maybeSingle();
      if (memberError) throw memberError;
      if (!member) return res.status(403).json({ ok: false, error: "registration_required" });
      const verified = await verifySolanaContribution({
        signature,
        asset,
        recipient: wallet.public_address,
        rpcUrl: config.solanaRpcUrl,
        usdcMint: config.solanaUsdcMint
      });
      const { data, error } = await supabase
        .from("project_wallet_contributions")
        .insert({
          purpose,
          telegram_id: Number(req.telegramUser.id),
          asset,
          amount: verified.amount,
          transaction_signature: signature,
          recipient_address: wallet.public_address,
          sender_address: verified.sender || null,
          slot: verified.slot || null,
          block_time: verified.blockTime ? new Date(verified.blockTime * 1000).toISOString() : null,
          status: "verified"
        })
        .select("id,purpose,asset,amount,status,created_at")
        .single();
      if (error && error.code === "23505") return res.status(409).json({ ok: false, error: "transaction_already_claimed" });
      if (error) throw error;
      return res.status(201).json({ ok: true, contribution: data, points_awarded: 0 });
    } catch (error) {
      const safe = ["invalid_signature", "invalid_asset", "transaction_not_confirmed", "wrong_recipient", "no_matching_transfer"].includes(error.message) ? error.message : "verification_failed";
      return res.status(400).json({ ok: false, error: safe });
    }
  });
}

module.exports = {
  PROJECT_WALLET_COMMANDS,
  PURPOSES,
  formatAud,
  parseInvestmentFunding,
  registerProjectWalletSystem
};
