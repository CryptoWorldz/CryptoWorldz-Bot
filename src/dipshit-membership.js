const crypto = require("node:crypto");
const { isValidSolanaAddress } = require("./core");
const { solanaPayUri, verifySolanaContribution } = require("./solana");
const { registerDipshitConversation } = require("./dipshit-conversation");

const DIPSHIT_PERIOD_SECONDS = 30 * 24 * 60 * 60;
const DIPSHIT_INVOICE_PAYLOAD = "dipshit_pro_monthly_v1";
const DIPSHIT_PRIVACY_URL = "https://cryptoworldz.xyz/dipshit/privacy/";
const DIPSHIT_TERMS_URL = "https://cryptoworldz.xyz/dipshit/terms/";

const DIPSHIT_COMMANDS = Object.freeze([
  { command: "start", description: "Wake up DIPSHIT™" },
  { command: "help", description: "Show the command menu" },
  { command: "status", description: "Check Worldz system status" },
  { command: "check", description: "Run Worldz QA checks" },
  { command: "fix", description: "Troubleshoot a problem" },
  { command: "ask", description: "Talk to DIPSHIT™ in normal language" },
  { command: "report", description: "Report a bug or broken feature" },
  { command: "worldz", description: "Open the WorldzEcosystem™" },
  { command: "zed", description: "Open the ZED Command Centre" },
  { command: "inbox", description: "Open Worldz Inbox" },
  { command: "dipshit", description: "Meet the WORLDZ DUDE" },
  { command: "website", description: "Open CryptoWorldz" },
  { command: "community", description: "Open Worldz community links" },
  { command: "subscribe", description: "Join DIPSHIT™ Pro with Telegram Stars" },
  { command: "membership", description: "Check your membership" },
  { command: "solmembership", description: "View the optional SOL month pass" },
  { command: "claimsol", description: "Verify a SOL membership payment" },
  { command: "cancelmembership", description: "Stop subscription renewal" },
  { command: "privacy", description: "Read the Privacy Policy" },
  { command: "terms", description: "Read membership Terms" },
  { command: "paysupport", description: "Get payment support" }
]);

function safeSecretMatch(received, expected) {
  if (!received || !expected) return false;
  const a = Buffer.from(String(received));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function activeMembership(membership, now = Date.now()) {
  return Boolean(
    membership &&
    membership.current_period_end &&
    Date.parse(membership.current_period_end) > now
  );
}

function validateStarsCheckout(query, starsPrice) {
  return Boolean(
    query &&
    query.invoice_payload === DIPSHIT_INVOICE_PAYLOAD &&
    query.currency === "XTR" &&
    Number.isInteger(starsPrice) &&
    starsPrice > 0 &&
    Number(query.total_amount) === starsPrice
  );
}

function solMembershipEnabled(config) {
  return Boolean(
    config &&
    Number(config.dipshitSolMonthlyAmount) > 0 &&
    isValidSolanaAddress(String(config.dipshitSolRecipient || ""))
  );
}

async function telegramApi(token, method, payload = {}, fetchImpl = fetch) {
  const response = await fetchImpl(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000)
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || body.ok !== true) {
    const error = new Error(`telegram_${method}_failed`);
    error.code = "TELEGRAM_API_FAILED";
    throw error;
  }
  return body.result;
}

function createMembershipRepository(supabase) {
  async function getMembership(telegramId) {
    const { data, error } = await supabase
      .from("dipshit_memberships")
      .select("telegram_id,source,status,current_period_start,current_period_end,auto_renew,telegram_payment_charge_id,created_at,updated_at")
      .eq("telegram_id", telegramId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function recordPayment(params) {
    const { data, error } = await supabase.rpc("record_dipshit_membership_payment", {
      p_telegram_id: params.telegramId,
      p_source: params.source,
      p_payment_ref: params.paymentRef,
      p_currency: params.currency,
      p_amount: params.amount,
      p_period_end: params.periodEnd || null,
      p_is_recurring: Boolean(params.isRecurring),
      p_auto_renew: Boolean(params.autoRenew)
    });
    if (error) throw error;
    return data;
  }

  async function markRenewalCancelled(telegramId) {
    const { data, error } = await supabase
      .from("dipshit_memberships")
      .update({ auto_renew: false, updated_at: new Date().toISOString() })
      .eq("telegram_id", telegramId)
      .select("telegram_id,source,status,current_period_end,auto_renew,telegram_payment_charge_id")
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  return { getMembership, markRenewalCancelled, recordPayment };
}

function registerDipshitMembershipSystem({ app, bot, config, supabase, fetchImpl = fetch }) {
  if (!bot || !config.dipshitBotToken) return { enabled: false };

  const repository = createMembershipRepository(supabase);
  const starsPrice = Number(config.dipshitStarsMonthlyPrice) || 0;
  const starsEnabled = Number.isInteger(starsPrice) && starsPrice > 0;
  const solEnabled = solMembershipEnabled(config);
  const send = (chatId, text, options) => bot.sendMessage(chatId, text, options);
  const conversation = registerDipshitConversation({
    bot,
    config,
    starsEnabled,
    solEnabled,
    send,
    privacyUrl: DIPSHIT_PRIVACY_URL,
    termsUrl: DIPSHIT_TERMS_URL,
    fetchImpl
  });
  const aiEnabled = conversation.aiEnabled;

  const helpText = () => [
    "💙 DIPSHIT™ — WORLDZ DUDE",
    "",
    "💬 Talk normally in private chat. In groups, mention @DipShitBossBot, reply to me, or start with “DipShit …”",
    "",
    "/status — runtime status",
    "/check — quick QA check",
    "/ask <question> — normal-language troubleshooting",
    "/report <problem> — send a bug report",
    "/subscribe — Telegram Stars monthly membership",
    "/membership — membership status",
    "/solmembership — optional external SOL month pass",
    "/claimsol <signature> — verify a SOL payment",
    "/cancelmembership — stop Stars auto-renewal",
    "/privacy — Privacy Policy",
    "/terms — Membership Terms",
    "/paysupport <message> — payment support",
    "",
    "Never send a seed phrase or private key."
  ].join("\n");

  const ownerRelay = async (msg, kind, body) => {
    const text = String(body || "").trim();
    if (!text) return send(msg.chat.id, `Use /${kind === "PAYMENT" ? "paysupport" : "report"} followed by your message.`);
    if (!config.ownerTelegramId) return send(msg.chat.id, "Support relay is not configured yet. Please use the CryptoWorldz website.");
    const username = msg.from && msg.from.username ? `@${msg.from.username}` : "(no username)";
    try {
      await bot.sendMessage(
        config.ownerTelegramId,
        `💙 DIPSHIT™ ${kind}\nFrom: ${username}\nTelegram user: ${msg.from.id}\n\n${text.slice(0, 2500)}`
      );
      return send(msg.chat.id, "✅ Sent to the Worldz operator.");
    } catch {
      return send(msg.chat.id, "⚠️ Support relay is temporarily unavailable. Please try again later.");
    }
  };

  bot.onText(/^\/start(?:@\w+)?$/, (msg) => send(
    msg.chat.id,
    "💙 DIPSHIT™ — WORLDZ DUDE\n\nInteractive QA, troubleshooting and Worldz navigation.\n\n💬 You can talk to me normally. In groups, mention @DipShitBossBot, reply to me, or start with “DipShit …”\n\nUse /help for commands or /subscribe for DIPSHIT™ Pro.\n\nNever send a seed phrase or private key."
  ));
  bot.onText(/^\/help(?:@\w+)?$/, (msg) => send(msg.chat.id, helpText()));
  bot.onText(/^\/status(?:@\w+)?$/, (msg) => send(
    msg.chat.id,
    `💙 DIPSHIT™ STATUS\n\nRuntime: ✅ ONLINE\nNatural chat listener: ✅ ACTIVE\nConversational AI: ${aiEnabled ? "✅ READY" : "⚙️ KEY NOT CONFIGURED"}\nSupport relay: ${config.ownerTelegramId ? "✅ READY" : "⚙️ NOT CONFIGURED"}\nPrivacy + Terms: ✅ READY\nTelegram Stars membership: ${starsEnabled ? "✅ READY" : "⚙️ PRICE NOT SET"}\nExternal SOL month pass: ${solEnabled ? "✅ READY" : "⚙️ NOT CONFIGURED"}\n\nPayments never require a seed phrase or private key.`
  ));
  bot.onText(/^\/check(?:@\w+)?$/, (msg) => send(
    msg.chat.id,
    `🧪 DIPSHIT™ QUICK CHECK\n\n✅ Bot runtime responding\n✅ Natural-language listener active\n${aiEnabled ? "✅" : "⚙️"} Conversational AI\n${config.ownerTelegramId ? "✅" : "⚙️"} Operator support relay\n✅ Privacy route defined\n✅ Terms route defined\n${starsEnabled ? "✅" : "⚙️"} Stars billing\n${solEnabled ? "✅" : "⚙️"} SOL verification\n\nTalk to me normally, or report a problem with /report <message>.`
  ));
  bot.onText(/^\/fix(?:@\w+)?(?:\s+([\s\S]+))?$/, (msg, match) => {
    const problem = String(match && match[1] || "").trim();
    return send(msg.chat.id, problem
      ? `🔧 DIPSHIT™ TROUBLESHOOTING\n\nProblem received: ${problem.slice(0, 1500)}\n\nRun /check first. If it is still broken, send /report followed by the details.`
      : "🔧 Tell me what is broken after /fix, or use /report to send it to the Worldz operator.");
  });
  bot.onText(/^\/report(?:@\w+)?(?:\s+([\s\S]+))?$/, (msg, match) => ownerRelay(msg, "BUG REPORT", match && match[1]));
  bot.onText(/^\/paysupport(?:@\w+)?(?:\s+([\s\S]+))?$/, (msg, match) => ownerRelay(msg, "PAYMENT", match && match[1]));
  bot.onText(/^\/worldz(?:@\w+)?$/, (msg) => send(msg.chat.id, "🌐 WorldzEcosystem™\nhttps://cryptoworldz.xyz/"));
  bot.onText(/^\/zed(?:@\w+)?$/, (msg) => send(msg.chat.id, "🤖 ZED Command Centre\nhttps://cryptobotz.cryptoworldz.xyz/miniapp/"));
  bot.onText(/^\/inbox(?:@\w+)?$/, (msg) => send(msg.chat.id, "📥 Worldz Inbox™\nhttps://cryptobotz.cryptoworldz.xyz/miniapp/#inbox"));
  bot.onText(/^\/dipshit(?:@\w+)?$/, (msg) => send(msg.chat.id, "💙 DIPSHIT™ — WORLDZ DUDE\nhttps://cryptoworldz.xyz/dipshit/"));
  bot.onText(/^\/website(?:@\w+)?$/, (msg) => send(msg.chat.id, "🌐 https://cryptoworldz.xyz/"));
  bot.onText(/^\/community(?:@\w+)?$/, (msg) => send(
    msg.chat.id,
    config.communityTelegramUrl || config.communityWebsiteUrl || "https://cryptoworldz.xyz/"
  ));
  bot.onText(/^\/privacy(?:@\w+)?$/, (msg) => send(msg.chat.id, `🔐 DIPSHIT™ Privacy Policy\n${DIPSHIT_PRIVACY_URL}`));
  bot.onText(/^\/terms(?:@\w+)?$/, (msg) => send(msg.chat.id, `📜 DIPSHIT™ Membership Terms\n${DIPSHIT_TERMS_URL}`));

  bot.onText(/^\/subscribe(?:@\w+)?$/, async (msg) => {
    if (!starsEnabled) {
      return send(msg.chat.id, "⚙️ Telegram Stars membership is built but the monthly Stars price has not been activated yet.");
    }
    try {
      const link = await telegramApi(config.dipshitBotToken, "createInvoiceLink", {
        title: "DIPSHIT Pro",
        description: "30-day recurring DIPSHIT™ Pro membership.",
        payload: DIPSHIT_INVOICE_PAYLOAD,
        currency: "XTR",
        prices: [{ label: "DIPSHIT Pro — 30 days", amount: starsPrice }],
        subscription_period: DIPSHIT_PERIOD_SECONDS
      }, fetchImpl);
      return send(
        msg.chat.id,
        `💙 DIPSHIT™ PRO\n\nPrice: ⭐ ${starsPrice} Telegram Stars every 30 days.\nAuto-renews until cancelled.\n\nTerms: ${DIPSHIT_TERMS_URL}\nPrivacy: ${DIPSHIT_PRIVACY_URL}\n\nSubscribe:\n${link}`,
        { disable_web_page_preview: true }
      );
    } catch {
      return send(msg.chat.id, "❌ I couldn't create the Stars subscription link. Please try again shortly.");
    }
  });

  bot.onText(/^\/membership(?:@\w+)?$/, async (msg) => {
    try {
      const membership = await repository.getMembership(msg.from.id);
      if (!activeMembership(membership)) {
        return send(msg.chat.id, "💙 DIPSHIT™ Membership\n\nStatus: INACTIVE\nUse /subscribe or /solmembership to view available options.");
      }
      const until = new Date(membership.current_period_end).toLocaleString("en-AU", { timeZone: "Australia/Sydney" });
      return send(
        msg.chat.id,
        `💙 DIPSHIT™ Membership\n\nStatus: ✅ ACTIVE\nMethod: ${membership.source === "stars" ? "Telegram Stars" : "SOL month pass"}\nActive until: ${until} AEST/AEDT\nAuto-renew: ${membership.auto_renew ? "ON" : "OFF"}`
      );
    } catch {
      return send(msg.chat.id, "❌ Membership status is temporarily unavailable.");
    }
  });

  bot.onText(/^\/solmembership(?:@\w+)?$/, async (msg) => {
    if (!solEnabled) {
      return send(msg.chat.id, "⚙️ The optional SOL month pass is built but has not been activated yet.");
    }
    const amount = Number(config.dipshitSolMonthlyAmount);
    const uri = solanaPayUri({
      recipient: config.dipshitSolRecipient,
      asset: "SOL",
      amount,
      label: "DIPSHIT Pro — 30-day month pass"
    });
    return send(
      msg.chat.id,
      `💙 OPTIONAL EXTERNAL SOL MONTH PASS\n\nAmount: ${amount} SOL\nRecipient:\n${config.dipshitSolRecipient}\n\nSolana Pay:\n${uri}\n\nAfter the transaction finalizes, use:\n/claimsol <transaction_signature>\n\nThis is a manual 30-day renewal option, not an investment, token sale or recurring wallet debit. Never send a seed phrase or private key.`,
      { disable_web_page_preview: true }
    );
  });

  bot.onText(/^\/claimsol(?:@\w+)?(?:\s+(\S+))?$/, async (msg, match) => {
    if (!solEnabled) return send(msg.chat.id, "⚙️ SOL membership verification is not activated.");
    const signature = String(match && match[1] || "").trim();
    if (!signature) return send(msg.chat.id, "Use: /claimsol <transaction_signature>");
    try {
      const verified = await verifySolanaContribution({
        signature,
        asset: "SOL",
        recipient: config.dipshitSolRecipient,
        rpcUrl: config.solanaRpcUrl,
        usdcMint: config.solanaUsdcMint,
        fetchImpl
      });
      const amountRequired = Number(config.dipshitSolMonthlyAmount);
      if (verified.amount + 1e-9 < amountRequired) {
        return send(msg.chat.id, `❌ Payment verified, but only ${verified.amount} SOL reached the membership recipient. Required: ${amountRequired} SOL.`);
      }
      if (!verified.blockTime || Date.now() - verified.blockTime * 1000 > 24 * 60 * 60 * 1000) {
        return send(msg.chat.id, "❌ That payment is older than the 24-hour claim window.");
      }
      const result = await repository.recordPayment({
        telegramId: msg.from.id,
        source: "sol",
        paymentRef: verified.signature,
        currency: "SOL",
        amount: verified.amount,
        periodEnd: null,
        isRecurring: false,
        autoRenew: false
      });
      const membership = result && result.membership;
      const until = membership && membership.current_period_end
        ? new Date(membership.current_period_end).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })
        : "30 days";
      return send(msg.chat.id, `✅ SOL PAYMENT VERIFIED\n\nDIPSHIT™ Pro is active until ${until} AEST/AEDT.\nTransaction signatures can only be claimed once.`);
    } catch (error) {
      const safe = new Set(["invalid_signature", "transaction_not_confirmed", "wrong_recipient", "no_matching_transfer", "rpc_unavailable"]);
      return send(msg.chat.id, safe.has(error && error.message)
        ? `❌ SOL verification failed: ${error.message.replaceAll("_", " ")}.`
        : "❌ SOL verification is temporarily unavailable.");
    }
  });

  bot.onText(/^\/cancelmembership(?:@\w+)?$/, async (msg) => {
    try {
      const membership = await repository.getMembership(msg.from.id);
      if (!activeMembership(membership)) return send(msg.chat.id, "There is no active DIPSHIT™ membership to cancel.");
      if (membership.source !== "stars" || !membership.telegram_payment_charge_id) {
        return send(msg.chat.id, "Your SOL month pass does not auto-renew. Access simply ends at the current period expiry.");
      }
      if (!membership.auto_renew) return send(msg.chat.id, "Telegram Stars auto-renewal is already OFF.");
      await telegramApi(config.dipshitBotToken, "editUserStarSubscription", {
        user_id: msg.from.id,
        telegram_payment_charge_id: membership.telegram_payment_charge_id,
        is_canceled: true
      }, fetchImpl);
      await repository.markRenewalCancelled(msg.from.id);
      return send(msg.chat.id, "✅ Auto-renewal cancelled. Your current paid period stays active until its expiry.");
    } catch {
      return send(msg.chat.id, "❌ I couldn't cancel renewal automatically. Use /paysupport <message> for help.");
    }
  });

  bot.on("pre_checkout_query", async (query) => {
    const ok = validateStarsCheckout(query, starsPrice);
    try {
      await telegramApi(config.dipshitBotToken, "answerPreCheckoutQuery", {
        pre_checkout_query_id: query.id,
        ok,
        ...(ok ? {} : { error_message: "This DIPSHIT™ subscription invoice is not valid or is no longer available." })
      }, fetchImpl);
    } catch {
      // Telegram requires a fast answer; failures are logged without leaking token details.
      console.error("DIPSHIT pre-checkout response failed");
    }
  });

  bot.on("message", async (msg) => {
    const payment = msg && msg.successful_payment;
    if (!payment || payment.invoice_payload !== DIPSHIT_INVOICE_PAYLOAD) return;
    if (payment.currency !== "XTR" || Number(payment.total_amount) !== starsPrice) {
      console.error("DIPSHIT successful payment rejected: invoice mismatch");
      return;
    }
    try {
      const periodEnd = payment.subscription_expiration_date
        ? new Date(Number(payment.subscription_expiration_date) * 1000).toISOString()
        : new Date(Date.now() + DIPSHIT_PERIOD_SECONDS * 1000).toISOString();
      await repository.recordPayment({
        telegramId: msg.from.id,
        source: "stars",
        paymentRef: payment.telegram_payment_charge_id,
        currency: "XTR",
        amount: payment.total_amount,
        periodEnd,
        isRecurring: Boolean(payment.is_recurring),
        autoRenew: true
      });
      await send(msg.chat.id, "✅ DIPSHIT™ Pro activated. Use /membership to view your current period.");
    } catch {
      console.error("DIPSHIT successful payment persistence failed");
      await send(msg.chat.id, "⚠️ Payment was received but membership activation needs support. Use /paysupport <message>.");
    }
  });

  app.post("/dipshit-telegram-webhook", (req, res) => {
    const supplied = req.get("x-telegram-bot-api-secret-token") || "";
    if (!safeSecretMatch(supplied, config.dipshitWebhookSecret)) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }
    res.sendStatus(200);
    Promise.resolve(bot.processUpdate(req.body)).catch((error) => {
      console.error("DIPSHIT Telegram update processing failed", {
        name: error && error.name ? error.name : "Error"
      });
    });
    return undefined;
  });

  return { enabled: true, aiEnabled, starsEnabled, solEnabled, commandCount: DIPSHIT_COMMANDS.length };
}

module.exports = {
  DIPSHIT_COMMANDS,
  DIPSHIT_INVOICE_PAYLOAD,
  DIPSHIT_PERIOD_SECONDS,
  DIPSHIT_PRIVACY_URL,
  DIPSHIT_TERMS_URL,
  activeMembership,
  createMembershipRepository,
  registerDipshitMembershipSystem,
  solMembershipEnabled,
  telegramApi,
  validateStarsCheckout
};
