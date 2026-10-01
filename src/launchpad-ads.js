const { verifySolanaContribution } = require("./solana");

const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_OPERATIONS_TREASURY = "n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB";

function ownerOnly(msg, config) {
  return Boolean(msg?.from?.id) && String(msg.from.id) === String(config.ownerTelegramId || "");
}

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function registerLaunchpadAds({ bot, config, supabase }) {
  if (!bot || !config || !supabase) throw new Error("launchpad_ads_missing_dependencies");
  const treasury = String(process.env.WORLDZ_OPERATIONS_TREASURY_ADDRESS || DEFAULT_OPERATIONS_TREASURY).trim();

  const send = (msg, text) => bot.sendMessage(msg.chat.id, text);

  bot.onText(/^\/launchads(?:@\w+)?(?:\s+(pending|payment|active|all))?$/i, async (msg, match) => {
    if (!ownerOnly(msg, config)) return send(msg, "⛔ Owner access required.");
    const mode = String(match?.[1] || "pending").toLowerCase();
    try {
      let query = supabase
        .from("worldz_launchpad_ads")
        .select("id,project_name,token_symbol,slot,package_code,price_aud,duration_days,status,payment_currency,payment_amount,payment_submitted_at,created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (mode === "pending") query = query.eq("status", "pending_review");
      if (mode === "payment") query = query.eq("status", "payment_review");
      if (mode === "active") query = query.eq("status", "active");
      const { data, error } = await query;
      if (error) throw error;
      const rows = data || [];
      const body = rows.map((row) => [
        `• ${row.project_name}${row.token_symbol ? " ($"+row.token_symbol+")" : ""}`,
        `  ID: ${row.id}`,
        `  ${row.status} • ${row.slot} • A$${Number(row.price_aud).toFixed(2)} / ${row.duration_days}d`,
        row.payment_currency ? `  Quote: ${row.payment_amount} ${row.payment_currency}${row.payment_submitted_at ? " • RECEIPT SUBMITTED" : ""}` : null
      ].filter(Boolean).join("\n")).join("\n\n");
      return send(msg, `🌐 WORLDZ SPOTLIGHT REVIEW\n\n${body || "No matching ad orders."}\n\nApprove: /launchadapprove UUID SOL|USDC AMOUNT\nReject: /launchadreject UUID reason\nActivate after receipt: /launchadactivate UUID`);
    } catch (error) {
      console.error("Worldz Spotlight list failed", { code: error?.code || error?.message || "unknown" });
      return send(msg, "❌ Spotlight review queue is unavailable.");
    }
  });

  bot.onText(/^\/launchadapprove(?:@\w+)?\s+([0-9a-f-]{36})\s+(SOL|USDC)\s+([0-9.]+)$/i, async (msg, match) => {
    if (!ownerOnly(msg, config)) return send(msg, "⛔ Owner access required.");
    const id = String(match[1]);
    const asset = String(match[2]).toUpperCase();
    const amount = money(match[3]);
    if (!ORDER_ID.test(id) || !amount) return send(msg, "❌ Use /launchadapprove UUID SOL|USDC AMOUNT");
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("worldz_launchpad_ads")
        .update({
          status: "approved",
          payment_currency: asset,
          payment_amount: amount,
          payment_destination: treasury,
          approved_by: Number(msg.from.id),
          approved_at: now,
          reviewer_note: "Approved for payment",
          updated_at: now
        })
        .eq("id", id)
        .eq("status", "pending_review")
        .select("id,project_name,price_aud,duration_days,payment_currency,payment_amount,payment_destination,status")
        .maybeSingle();
      if (error) throw error;
      if (!data) return send(msg, "❌ Order not found or it is no longer pending review.");
      return send(msg, [
        "✅ WORLDZ SPOTLIGHT APPROVED",
        "",
        `Project: ${data.project_name}`,
        `Order: ${data.id}`,
        `Package: A$${Number(data.price_aud).toFixed(2)} • ${data.duration_days} day(s)`,
        `Payment quote: ${data.payment_amount} ${data.payment_currency}`,
        `Operations Treasury: ${data.payment_destination}`,
        "",
        "Customer checks the order on /advertise/?order="+data.id,
        "The ad does NOT activate until the finalized on-chain receipt is verified."
      ].join("\n"));
    } catch (error) {
      console.error("Worldz Spotlight approval failed", { code: error?.code || error?.message || "unknown" });
      return send(msg, "❌ Spotlight approval failed.");
    }
  });

  bot.onText(/^\/launchadreject(?:@\w+)?\s+([0-9a-f-]{36})(?:\s+([\s\S]+))?$/i, async (msg, match) => {
    if (!ownerOnly(msg, config)) return send(msg, "⛔ Owner access required.");
    const id = String(match[1]);
    const reason = String(match?.[2] || "Rejected by Worldz review").trim().slice(0, 500);
    if (!ORDER_ID.test(id)) return send(msg, "❌ Use /launchadreject UUID reason");
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("worldz_launchpad_ads")
        .update({ status: "rejected", reviewer_note: reason, approved_by: Number(msg.from.id), updated_at: now })
        .eq("id", id)
        .in("status", ["pending_review","approved"])
        .select("id,project_name,status")
        .maybeSingle();
      if (error) throw error;
      if (!data) return send(msg, "❌ Order not found or cannot be rejected from its current state.");
      return send(msg, `⛔ Spotlight order rejected\n${data.project_name}\n${data.id}\nReason: ${reason}`);
    } catch (error) {
      console.error("Worldz Spotlight rejection failed", { code: error?.code || error?.message || "unknown" });
      return send(msg, "❌ Spotlight rejection failed.");
    }
  });

  bot.onText(/^\/launchadactivate(?:@\w+)?\s+([0-9a-f-]{36})$/i, async (msg, match) => {
    if (!ownerOnly(msg, config)) return send(msg, "⛔ Owner access required.");
    const id = String(match[1]);
    if (!ORDER_ID.test(id)) return send(msg, "❌ Use /launchadactivate UUID");
    try {
      const { data: order, error } = await supabase.from("worldz_launchpad_ads")
        .select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!order) return send(msg, "❌ Spotlight order not found.");
      if (order.status !== "payment_review") return send(msg, "❌ A submitted payment receipt is required before activation.");
      if (!order.payment_signature || !order.payment_currency || !order.payment_destination || !Number(order.payment_amount)) {
        return send(msg, "❌ Payment quote/receipt data is incomplete.");
      }

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
        return send(msg, `❌ Payment is short. Due ${due} ${order.payment_currency}; verified ${received}.`);
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
          activated_by: Number(msg.from.id),
          activated_at: start.toISOString(),
          reviewer_note: "Payment verified on-chain; placement activated.",
          updated_at: start.toISOString()
        })
        .eq("id", id)
        .eq("status", "payment_review")
        .select("id,project_name,slot,start_at,end_at,status")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!active) return send(msg, "❌ Order changed state before activation; check /launchads all.");
      return send(msg, [
        "✅ WORLDZ SPOTLIGHT LIVE",
        "",
        `Project: ${active.project_name}`,
        `Order: ${active.id}`,
        `Placement: ${active.slot}`,
        `Verified receipt: ${order.payment_signature}`,
        `Starts: ${active.start_at}`,
        `Ends: ${active.end_at}`
      ].join("\n"));
    } catch (error) {
      console.error("Worldz Spotlight activation failed", { code: error?.code || error?.message || "unknown" });
      const reason = ["invalid_signature","rpc_unavailable","transaction_not_confirmed","wrong_recipient","no_matching_transfer"].includes(String(error?.message || ""))
        ? String(error.message)
        : "verification_failed";
      return send(msg, `❌ Spotlight payment verification failed: ${reason}`);
    }
  });
}

module.exports = { DEFAULT_OPERATIONS_TREASURY, ORDER_ID, registerLaunchpadAds };
