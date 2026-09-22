const WORLD_PING_COMMANDS = Object.freeze([
  { command: "worldping", description: "Send a visible group WorldPing" },
  { command: "worldpingmode", description: "Set AdminsOnlyPing or FullMemberPing" },
  { command: "zedmaxprice", description: "View ZED MAX SOL licensing" }
]);

const GROUP_TYPES = new Set(["group", "supergroup"]);
const SOL_SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{32,128}$/;

function commercialConfig(env = process.env) {
  const positive = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
  };
  return {
    wallet: String(env.ZED_MAX_SOL_WALLET_ADDRESS || "Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u").trim(),
    rentSol: positive(env.ZED_MAX_RENT_SOL, 0.3),
    ownSol: positive(env.ZED_MAX_OWNERSHIP_SOL, 4.5),
    rentToOwnSol: positive(env.ZED_MAX_RENT_TO_OWN_SOL, 0.5),
    rentToOwnMonths: Math.max(1, Math.floor(positive(env.ZED_MAX_RENT_TO_OWN_MONTHS, 12)))
  };
}

function isGroup(message) {
  return GROUP_TYPES.has(String(message?.chat?.type || ""));
}

function isOwner(message, config) {
  return String(message?.from?.id || "") === String(config?.ownerTelegramId || "");
}

async function activeLicence(supabase, chatId) {
  const { data, error } = await supabase
    .from("zed_group_licences")
    .select("chat_id,plan,status,expires_at")
    .eq("chat_id", String(chatId))
    .maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "active") return null;
  if (data.expires_at && Date.parse(data.expires_at) <= Date.now()) return null;
  return data;
}

async function worldPingMode(supabase, chatId) {
  const { data, error } = await supabase
    .from("zed_group_worldping_settings")
    .select("mode")
    .eq("chat_id", String(chatId))
    .maybeSingle();
  if (error) throw error;
  return data?.mode || "admins_only";
}

function registerWorldPingHandlers({ bot, config, supabase, env = process.env }) {
  if (!bot || !config || !supabase) throw new Error("WorldPing requires bot, config and Supabase.");
  const pricing = commercialConfig(env);
  const send = (message, text) => bot.sendMessage(message.chat.id, text);
  const admin = async (message) => {
    const member = await bot.getChatMember(message.chat.id, message.from.id);
    return ["creator", "administrator"].includes(String(member?.status || ""));
  };

  bot.onText(/^\/worldping(?:@\w+)?(?:\s+([\s\S]+))?$/i, async (message, match) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Add ZED MAX to a Telegram group, then use /worldping your message.");
      const body = String(match?.[1] || "").trim();
      if (!body) return send(message, "❌ Use /worldping followed by the message for the group.");
      if (!isOwner(message, config) && !(await activeLicence(supabase, message.chat.id))) {
        return send(message, "🔒 This group needs an active ZED MAX licence. Use /zedmaxprice, pay SOL, then submit /zedmaxreceipt SIGNATURE for owner review.");
      }
      // JayJayTeamDev can send a WorldPing even if the optional group-settings
      // table is unavailable. Everyone else retains the configured mode checks.
      const mode = isOwner(message, config) ? "full_member" : await worldPingMode(supabase, message.chat.id);
      if (mode === "admins_only" && !isOwner(message, config) && !(await admin(message))) {
        return send(message, "⛔ This group is on AdminsOnlyPing. A group admin can send it or change mode with /worldpingmode full.");
      }
      const sender = message.from.username ? `@${message.from.username}` : message.from.first_name || "a member";
      return send(message, [
        "🌐 WORLD PING™",
        "",
        body.slice(0, 3000),
        "",
        `Sent by ${sender} • ${mode === "full_member" ? "FullMemberPing" : "AdminsOnlyPing"}`,
        "Visible group alert — Telegram controls individual notification settings."
      ].join("\n"));
    } catch (error) {
      console.error("WorldPing failed", { code: error?.code || "UNKNOWN" });
      return send(message, "❌ WorldPing could not be sent. Please try again.");
    }
  });

  bot.onText(/^\/worldpingmode(?:@\w+)?(?:\s+(admin|full|adminsonlyping|fullmemberping))?$/i, async (message, match) => {
    try {
      if (!isGroup(message)) return send(message, "❌ WorldPing mode can only be changed inside a Telegram group.");
      if (!(await admin(message))) return send(message, "⛔ Only a group admin can change WorldPing mode.");
      const requested = String(match?.[1] || "").toLowerCase();
      const mode = ["admin", "adminsonlyping"].includes(requested) ? "admins_only" : ["full", "fullmemberping"].includes(requested) ? "full_member" : null;
      if (!mode) return send(message, "❌ Use /worldpingmode admin or /worldpingmode full.");
      const { error } = await supabase.from("zed_group_worldping_settings").upsert({
        chat_id: String(message.chat.id), mode, updated_by_telegram_id: message.from.id, updated_at: new Date().toISOString()
      }, { onConflict: "chat_id" });
      if (error) throw error;
      return send(message, `✅ WorldPing is now ${mode === "full_member" ? "FullMemberPing" : "AdminsOnlyPing"}.`);
    } catch (error) {
      console.error("WorldPing mode failed", { code: error?.code || "UNKNOWN" });
      return send(message, "❌ WorldPing mode could not be saved.");
    }
  });

  bot.onText(/^\/zedmaxprice(?:@\w+)?$/i, (message) => send(message, [
    "ZED LED COMMAND CENTRE MAX™",
    "Commercial group licensing — paid in SOL",
    "",
    `RENT — ${pricing.rentSol} SOL / group / 31 days`,
    `RENT TO OWN — ${pricing.rentToOwnSol} SOL / group / month for ${pricing.rentToOwnMonths} months`,
    `OWN — ${pricing.ownSol} SOL one-time perpetual group licence`,
    "",
    "Send SOL to JayJayTeamDev wallet:", pricing.wallet,
    "",
    "After payment: /zedmaxreceipt SOL_SIGNATURE. Access activates only after owner review. JayJayTeamDev has free owner access."
  ].join("\n")));

  bot.onText(/^\/zedmaxreceipt(?:@\w+)?(?:\s+(\S+))?$/i, async (message, match) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Submit the ZED MAX receipt inside the licensed group.");
      const signature = String(match?.[1] || "");
      if (!SOL_SIGNATURE.test(signature)) return send(message, "❌ Use /zedmaxreceipt followed by the Solana transaction signature.");
      const { error } = await supabase.from("zed_group_licence_receipts").insert({
        chat_id: String(message.chat.id), receipt_signature: signature, submitted_by_telegram_id: message.from.id, submitted_at: new Date().toISOString()
      });
      if (error) throw error;
      return send(message, "🧾 ZED MAX receipt submitted. It is pending JayJayTeamDev's on-chain review; no licence is active yet.");
    } catch (error) {
      console.error("ZED MAX receipt failed", { code: error?.code || "UNKNOWN" });
      return send(message, "❌ That receipt could not be recorded. Check the signature has not already been submitted.");
    }
  });

  bot.onText(/^\/zedmaxapprove(?:@\w+)?(?:\s+(-?\d+)\s+(rent|rent_to_own|own))?$/i, async (message, match) => {
    try {
      if (!isOwner(message, config)) return send(message, "⛔ Only JayJayTeamDev can approve a ZED MAX licence.");
      const chatId = String(match?.[1] || ""); const plan = String(match?.[2] || "");
      if (!chatId || !plan) return send(message, "❌ Use /zedmaxapprove CHAT_ID rent|rent_to_own|own after confirming the SOL transfer.");
      const expiresAt = plan === "own" ? null : new Date(Date.now() + 31 * 86400000).toISOString();
      const { error } = await supabase.from("zed_group_licences").upsert({
        chat_id: chatId, plan, status: "active", approved_by_telegram_id: message.from.id, approved_at: new Date().toISOString(), expires_at: expiresAt, updated_at: new Date().toISOString()
      }, { onConflict: "chat_id" });
      if (error) throw error;
      return send(message, `✅ ZED MAX ${plan} licence activated for ${chatId}${expiresAt ? ` until ${expiresAt}` : " permanently"}.`);
    } catch (error) {
      console.error("ZED MAX approval failed", { code: error?.code || "UNKNOWN" });
      return send(message, "❌ ZED MAX licence approval could not be saved.");
    }
  });
}

module.exports = { WORLD_PING_COMMANDS, commercialConfig, isGroup, registerWorldPingHandlers };
