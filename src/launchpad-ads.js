const dns = require("node:dns").promises;
const net = require("node:net");
const { verifySolanaContribution } = require("./solana");

const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_OPERATIONS_TREASURY = "n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB";
const RETRYABLE = new Set([
  "automation_provider_unavailable",
  "moderation_unavailable",
  "fx_unavailable",
  "rpc_unavailable",
  "transaction_not_confirmed",
  "verification_failed"
]);

function ownerOnly(msg, config) {
  return Boolean(msg?.from?.id) && String(msg.from.id) === String(config.ownerTelegramId || "");
}

function isPrivateIpv4(ip) {
  const parts = String(ip || "").split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return parts[0] === 10 ||
    parts[0] === 127 ||
    parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168);
}

function isPrivateIpv6(ip) {
  const value = String(ip || "").toLowerCase();
  return value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:");
}

async function validatePublicHttps(value) {
  let url;
  try { url = new URL(String(value || "")); }
  catch { throw new Error("unsafe_target_url"); }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname) throw new Error("unsafe_target_url");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local")) throw new Error("unsafe_target_url");

  if (net.isIP(host)) {
    if ((net.isIPv4(host) && isPrivateIpv4(host)) || (net.isIPv6(host) && isPrivateIpv6(host))) throw new Error("unsafe_target_url");
    return url.toString();
  }

  let addresses;
  try { addresses = await dns.lookup(host, { all: true, verbatim: true }); }
  catch { throw new Error("target_dns_unavailable"); }
  if (!addresses.length) throw new Error("target_dns_unavailable");
  for (const item of addresses) {
    if ((item.family === 4 && isPrivateIpv4(item.address)) || (item.family === 6 && isPrivateIpv6(item.address))) {
      throw new Error("unsafe_target_url");
    }
  }
  return url.toString();
}

function credentialRisk(value) {
  return /\b(seed phrase|private key|recovery phrase|wallet phrase|password|bank login|secret key)\b/i.test(String(value || ""));
}

async function moderateSpotlight(openaiKey, order) {
  if (!openaiKey) throw new Error("moderation_unavailable");
  const banner = String(order.banner_url || "");
  if (!/^https:\/\//i.test(banner)) throw new Error("banner_url_invalid");
  const input = [
    {
      type: "text",
      text: [
        "WorldzLaunchPad sponsored placement.",
        `Project: ${String(order.project_name || "")}`,
        `Token: ${String(order.token_symbol || "")}`,
        `Chain: ${String(order.chain || "")}`,
        `Destination: ${String(order.target_url || "")}`
      ].join("\n")
    },
    { type: "image_url", image_url: { url: banner } }
  ];
  let response;
  try {
    response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: "omni-moderation-latest", input }),
      signal: AbortSignal.timeout(25000)
    });
  } catch {
    throw new Error("moderation_unavailable");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("moderation_unavailable");
  if ((body.results || []).some((result) => result?.flagged === true)) throw new Error("content_not_supported");
  return true;
}

async function audUsdRate() {
  const configured = Number(process.env.WORLDZ_AUD_USD_RATE || 0);
  if (configured >= 0.3 && configured <= 1.2) return { rate: configured, source: "WORLDZ_AUD_USD_RATE" };

  let response;
  try {
    response = await fetch("https://api.frankfurter.app/latest?from=AUD&to=USD", {
      headers: { "user-agent": "Worldz-Spotlight/1.0" },
      signal: AbortSignal.timeout(12000)
    });
  } catch {
    throw new Error("fx_unavailable");
  }
  const payload = await response.json().catch(() => ({}));
  const rate = Number(payload?.rates?.USD);
  if (!response.ok || !Number.isFinite(rate) || rate < 0.3 || rate > 1.2) throw new Error("fx_unavailable");
  return { rate, source: "Frankfurter AUD/USD" };
}

function usdcQuote(priceAud, rate) {
  const value = Number(priceAud) * Number(rate);
  if (!Number.isFinite(value) || value <= 0) throw new Error("fx_unavailable");
  return Number(value.toFixed(6));
}

function registerLaunchpadAds({ bot, config, supabase, repository = null }) {
  if (!bot || !config || !supabase) throw new Error("launchpad_ads_missing_dependencies");
  const treasury = String(process.env.WORLDZ_OPERATIONS_TREASURY_ADDRESS || DEFAULT_OPERATIONS_TREASURY).trim();
  const openaiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const send = (msg, text) => bot.sendMessage(msg.chat.id, text);

  async function decision(orderId, value, reason, outcome = value) {
    if (typeof repository?.recordBotDecision !== "function") return;
    await repository.recordBotDecision({
      subjectType: "spotlight_ad",
      subjectKey: String(orderId),
      decision: value,
      reason,
      rex: { checked: true, role: "destination_security", decision: value },
      zed: { checked: true, role: "spotlight_rules", decision: value },
      auto: { checked: true, role: "pricing_payment_state", decision: value, outcome },
      grace: { checked: true, role: "sponsored_content_moderation", decision: value },
      dipshit: { checked: true, role: "placement_usability", decision: value }
    });
  }

  async function autoValidate(id) {
    const { data: order, error } = await supabase.from("worldz_launchpad_ads").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!order) return { outcome: "not_found" };
    if (order.status === "active") return { outcome: "already_active", order };
    if (order.status === "auto_rejected" || order.status === "rejected") return { outcome: "already_rejected", order };
    if (!["auto_check","deferred_auto","approved"].includes(String(order.status))) return { outcome: "not_validatable", order };

    try {
      await validatePublicHttps(order.target_url);
      if (credentialRisk([order.project_name, order.token_symbol, order.chain, order.target_url].join(" "))) {
        throw new Error("credential_request_blocked");
      }
      await moderateSpotlight(openaiKey, order);
      const fx = await audUsdRate();
      const amount = usdcQuote(order.price_aud, fx.rate);
      const now = new Date();
      const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const { data: quoted, error: updateError } = await supabase.from("worldz_launchpad_ads")
        .update({
          status: "approved",
          payment_currency: "USDC",
          payment_amount: amount,
          payment_destination: treasury,
          quote_fx_rate: fx.rate,
          quote_source: fx.source,
          quote_expires_at: expires.toISOString(),
          automation_checked_at: now.toISOString(),
          approved_by: null,
          approved_at: now.toISOString(),
          reviewer_note: "Worldz automation validated content + destination. USDC quote ready for 24 hours.",
          updated_at: now.toISOString()
        })
        .eq("id", order.id)
        .select("*")
        .single();
      if (updateError) throw updateError;
      await decision(order.id, "approved", "worldz_spotlight_auto_validated", "quote_ready");
      return { outcome: "quote_ready", order: quoted };
    } catch (checkError) {
      const reason = String(checkError?.message || "automation_provider_unavailable");
      const retry = RETRYABLE.has(reason) || reason === "target_dns_unavailable";
      const status = retry ? "deferred_auto" : "auto_rejected";
      const now = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase.from("worldz_launchpad_ads")
        .update({
          status,
          automation_checked_at: now,
          reviewer_note: reason,
          updated_at: now
        })
        .eq("id", order.id)
        .select("*")
        .single();
      if (updateError) throw updateError;
      await decision(order.id, retry ? "deferred" : "rejected", reason, status);
      return { outcome: status, reason, order: updated };
    }
  }

  async function autoVerifyPayment(id) {
    const { data: order, error } = await supabase.from("worldz_launchpad_ads").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!order) return { outcome: "not_found" };
    if (order.status === "active") return { outcome: "already_active", order };
    if (order.status !== "payment_review") return { outcome: "not_awaiting_payment", order };
    if (!order.payment_signature || !order.payment_currency || !order.payment_destination || !Number(order.payment_amount)) {
      return { outcome: "payment_data_incomplete", order };
    }

    try {
      const proof = await verifySolanaContribution({
        signature: order.payment_signature,
        asset: order.payment_currency,
        recipient: order.payment_destination,
        rpcUrl: config.solanaRpcUrl,
        usdcMint: config.solanaUsdcMint
      });
      const due = Number(order.payment_amount);
      const received = Number(proof.amount);
      const tolerance = order.payment_currency === "USDC" ? 0.000001 : 0.000000001;
      if (received + tolerance < due) {
        await supabase.from("worldz_launchpad_ads").update({
          reviewer_note: `Payment short. Due ${due} ${order.payment_currency}; verified ${received}. Submit another receipt.`,
          automation_checked_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq("id", order.id);
        await decision(order.id, "deferred", "payment_short", "payment_review");
        return { outcome: "payment_short", due, received, order };
      }

      const start = new Date();
      const end = new Date(start.getTime() + Number(order.duration_days) * 86400000);
      const { data: active, error: updateError } = await supabase.from("worldz_launchpad_ads")
        .update({
          status: "active",
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          payment_verified_at: start.toISOString(),
          payment_sender: proof.sender || null,
          payment_slot: proof.slot || null,
          activated_by: null,
          activated_at: start.toISOString(),
          automation_checked_at: start.toISOString(),
          reviewer_note: "Payment verified on-chain automatically; sponsored placement activated.",
          updated_at: start.toISOString()
        })
        .eq("id", order.id)
        .eq("status", "payment_review")
        .select("*")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!active) return { outcome: "state_changed" };
      await decision(order.id, "approved", "onchain_payment_verified", "active");
      return { outcome: "active", order: active, proof };
    } catch (verifyError) {
      const reason = String(verifyError?.message || "verification_failed");
      await supabase.from("worldz_launchpad_ads").update({
        reviewer_note: `Automatic payment check: ${reason}. Retry is automatic; a new receipt may be submitted if the transfer details were wrong.`,
        automation_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", order.id);
      await decision(order.id, "deferred", reason, "payment_review");
      return { outcome: "payment_review", reason, order };
    }
  }

  async function reconcile() {
    try {
      const now = new Date().toISOString();
      await supabase.from("worldz_launchpad_ads")
        .update({ status: "expired", updated_at: now, reviewer_note: "Sponsored placement completed automatically." })
        .eq("status", "active")
        .lt("end_at", now);

      const { data: staleQuotes } = await supabase.from("worldz_launchpad_ads")
        .select("id")
        .eq("status", "approved")
        .lt("quote_expires_at", now)
        .limit(25);
      for (const row of staleQuotes || []) {
        await supabase.from("worldz_launchpad_ads").update({
          status: "auto_check",
          reviewer_note: "Payment quote expired; refreshing automatically.",
          updated_at: now
        }).eq("id", row.id);
      }

      const { data: checks, error: checkError } = await supabase.from("worldz_launchpad_ads")
        .select("id")
        .in("status", ["auto_check","deferred_auto"])
        .order("updated_at", { ascending: true })
        .limit(20);
      if (checkError) throw checkError;
      for (const row of checks || []) await autoValidate(row.id);

      const { data: payments, error: paymentError } = await supabase.from("worldz_launchpad_ads")
        .select("id")
        .eq("status", "payment_review")
        .order("payment_submitted_at", { ascending: true })
        .limit(20);
      if (paymentError) throw paymentError;
      for (const row of payments || []) await autoVerifyPayment(row.id);
    } catch (error) {
      console.warn("Worldz Spotlight automatic reconciliation unavailable", { code: error?.code || error?.message || "unknown" });
    }
  }

  bot.onText(/^\/launchads(?:@\w+)?(?:\s+(holds|payment|active|all))?$/i, async (msg, match) => {
    if (!ownerOnly(msg, config)) return send(msg, "⛔ Owner access required.");
    const mode = String(match?.[1] || "holds").toLowerCase();
    try {
      let query = supabase.from("worldz_launchpad_ads")
        .select("id,project_name,token_symbol,slot,package_code,price_aud,duration_days,status,payment_currency,payment_amount,payment_submitted_at,reviewer_note,created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (mode === "holds") query = query.in("status", ["auto_check","deferred_auto"]);
      if (mode === "payment") query = query.eq("status", "payment_review");
      if (mode === "active") query = query.eq("status", "active");
      const { data, error } = await query;
      if (error) throw error;
      const rows = data || [];
      const body = rows.map((row) => [
        `• ${row.project_name}${row.token_symbol ? " ($"+row.token_symbol+")" : ""}`,
        `  ID: ${row.id}`,
        `  ${row.status} • ${row.slot} • A$${Number(row.price_aud).toFixed(2)} / ${row.duration_days}d`,
        row.payment_currency ? `  Quote: ${row.payment_amount} ${row.payment_currency}${row.payment_submitted_at ? " • RECEIPT SUBMITTED" : ""}` : null,
        row.reviewer_note ? `  ${row.reviewer_note}` : null
      ].filter(Boolean).join("\n")).join("\n\n");
      return send(msg, `🌐 WORLDZ SPOTLIGHT AUTOMATION\n\n${body || "No matching Spotlight orders."}\n\n/recheckad UUID reruns the automatic checks. Routine approval/activation is automated.`);
    } catch (error) {
      console.error("Worldz Spotlight list failed", { code: error?.code || error?.message || "unknown" });
      return send(msg, "❌ Spotlight automation status is unavailable.");
    }
  });

  bot.onText(/^\/(?:recheckad|launchadrecheck)(?:@\w+)?\s+([0-9a-f-]{36})$/i, async (msg, match) => {
    if (!ownerOnly(msg, config)) return send(msg, "⛔ Owner access required.");
    const id = String(match[1]);
    if (!ORDER_ID.test(id)) return send(msg, "❌ Use /recheckad UUID");
    try {
      const { data: row, error } = await supabase.from("worldz_launchpad_ads").select("id,status").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!row) return send(msg, "❌ Spotlight order not found.");
      const result = row.status === "payment_review" ? await autoVerifyPayment(id) : await autoValidate(id);
      if (result.outcome === "quote_ready") {
        return send(msg, `✅ Automatic Spotlight validation passed. Order ${id} now has its USDC payment quote.`);
      }
      if (result.outcome === "active" || result.outcome === "already_active") {
        return send(msg, `✅ Spotlight ${id} is ACTIVE. On-chain payment proof passed automatically.`);
      }
      return send(msg, `🛡 Automatic Spotlight result: ${result.reason || result.outcome}. No routine Admin approval action is required.`);
    } catch (error) {
      return send(msg, `❌ Automatic Spotlight recheck failed: ${String(error?.message || "retry_failed")}`);
    }
  });

  const bootstrapTimer = setTimeout(() => { void reconcile(); }, 15_000);
  const interval = setInterval(() => { void reconcile(); }, 60_000);
  bootstrapTimer.unref?.();
  interval.unref?.();

  return { autoValidate, autoVerifyPayment, reconcile };
}

module.exports = { DEFAULT_OPERATIONS_TREASURY, ORDER_ID, registerLaunchpadAds };
