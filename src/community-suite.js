const {
  MODULES,
  THEME_PACKS,
  SOL_SIGNATURE,
  currentLicence,
  ensureGroup,
  isGroup,
  owner,
  pricing,
  recordAnalytics,
  setModule,
  telegramAdmin
} = require("./community-suite-core");

const MARKETPLACE_ADDONS = Object.freeze([
  ["premium_custom_brand", "🎨 Premium Custom Brand", "Custom bot names, artwork, command labels and visual system", "quote"],
  ["branded_miniapp", "📱 Branded Mini App", "Customer-branded Telegram Mini App/control surface", "quote"],
  ["custom_website", "🌐 Custom Project Page", "Branded project/community web page with Worldz integrations", "quote"],
  ["advanced_ai", "🧠 Advanced AI Knowledge", "Larger approved knowledge base, premium AI usage and custom workflows", "quote"],
  ["advanced_analytics", "📊 Advanced Analytics", "Expanded community, campaign and conversion reporting", "quote"],
  ["api_webhooks", "🔌 API + Webhooks", "Customer API keys, signed webhooks and integration support", "included_or_quote"],
  ["extra_socials", "📣 Extra Social Connections", "Additional social accounts/platform connection work", "quote"],
  ["multi_group", "🌐 Multi-Group Network", "One customer network operating across multiple Telegram groups", "quote"],
  ["custom_chain", "⛓ Custom Chain Adapter", "Additional token/chain data integration beyond standard support", "quote"],
  ["launch_support", "🚀 Launch Support Pack", "LaunchPad/community setup, countdown, links and launch-day support", "quote"],
  ["priority_support", "⚡ Priority Support", "Higher-priority Worldz technical support lane", "quote"],
  ["custom_security", "🛡 Custom REX Rules", "Custom moderation, trusted identity and security-policy configuration", "quote"],
  ["sponsored_slot", "📢 Sponsored Worldz Placement", "Clearly disclosed paid promotional placement", "quote"],
  ["campaign_pack", "📣 Campaign Pack", "G.R.A.C.E.-assisted campaign setup across supported social channels", "quote"],
  ["migration_setup", "🧰 Migration + Setup", "Move an existing Telegram project into the Worldz Suite", "quote"]
]);

const COMPAT_TOGGLES = Object.freeze({
  rex_secureguard: "secureguard_enabled",
  ronald_raider: "ronald_raider_enabled",
  shill_rewards: "shill_rewards_enabled",
  worldping: "worldping_enabled",
  social: "grace_panel_enabled",
  inbox: "notifications_enabled"
});

function moduleText(rows) {
  const state = new Map((rows || []).map((row) => [row.module_key, row.enabled !== false]));
  return MODULES.map(([key, label]) => `${state.get(key) !== false ? "✅" : "⬜"} ${label} — ${key}`).join("\n");
}

function themeText() {
  return THEME_PACKS.map((theme, index) =>
    `${index + 1}. ${theme.name} — ${theme.key} • ${theme.primary} / ${theme.accent}`
  ).join("\n");
}

function packageLabel(value) {
  return value === "operations" ? "Operations Bot" : value === "ai" ? "Custom AI Community Bot" : "Full 2-Bot Suite";
}

function planLabel(value) {
  return value === "trial" ? "Starter Trial" :
    value === "rent" ? "Rent" :
    value === "rent_to_own" ? "Rent-to-Own" :
    value === "own" ? "Own" : String(value || "Unlicensed");
}

function upgradeQuote(prices, plan, licence = null) {
  const base = plan === "rent" ? Number(prices.rentSol) :
    plan === "rent_to_own" ? Number(prices.rentToOwnSol) :
    plan === "own" ? Number(prices.ownSol) : Number(prices.trialSol);
  const storedCredit = Number(licence?.trial_credit_sol || 0);
  const credit = plan !== "trial" && !licence?.trial_credit_used_at ? Math.min(base, Math.max(0, storedCredit)) : 0;
  return {
    base: Number(base.toFixed(9)),
    credit: Number(credit.toFixed(9)),
    due: Number(Math.max(0, base - credit).toFixed(9))
  };
}

function registerCommunitySuiteHandlers({ bot, config, supabase, env = process.env }) {
  const prices = pricing(env);
  const send = (message, text, options) => bot.sendMessage(message.chat.id, text, options);
  const requireAdmin = async (message) => owner(message, config) || await telegramAdmin(bot, message);

  async function groupRow(message) {
    return ensureGroup(supabase, message, config);
  }

  bot.onText(/^\/suite(?:@\w+)?$/i, async (message) => {
    try {
      if (!isGroup(message)) {
        return send(message, [
          "🌐 WORLDZ FULLBUILD™ COMMUNITY SUITE",
          "",
          "Operations Bot • Custom AI Community Bot • Full 2-Bot Suite",
          "REX security • ALICE support • raids • shills • scanning • market alerts • votes • governance • social • inbox • analytics • webhooks",
          "",
          "Add the Worldz operations bot to a Telegram group and run /suite there."
        ].join("\n"));
      }
      const group = await groupRow(message);
      const licence = await currentLicence(supabase, message.chat.id);
      const { data: brand } = await supabase.from("community_suite_branding")
        .select("*").eq("chat_id", Number(message.chat.id)).maybeSingle();
      await recordAnalytics(supabase, message.chat.id, message.from.id, "suite_open");
      return send(message, [
        "🌐 WORLDZ FULLBUILD™ COMMUNITY SUITE",
        "",
        `Community: ${group.display_name}`,
        `Package: ${packageLabel(licence?.product_package || group.product_package)}`,
        `Licence: ${licence ? "✅ " + planLabel(licence.plan) : "🔒 Not active"}`,
        `Brand: ${brand?.mode || "worldz_theme"} • ${brand?.theme_key || "purple_galaxy"}`,
        `Language: ${group.language_code || "en"}`,
        `Emergency Lockdown: ${group.emergency_lockdown ? "🚨 ON" : "✅ OFF"}`,
        "",
        "/modules • /themes • /suiteprice • /analytics • /boostcentre",
        "Admins: /module • /brand • /language • /lockdown"
      ].join("\n"));
    } catch (error) {
      console.error("Community Suite open failed", { code: error?.code || error?.message || "unknown" });
      return send(message, "❌ Community Suite could not load.");
    }
  });

  bot.onText(/^\/suiteprice(?:@\w+)?$/i, (message) => send(message, [
    "🌐 WORLDZ FULLBUILD™ COMMUNITY SUITE",
    "Choose Operations Bot • Custom AI Bot • Full 2-Bot Suite",
    "",
    `🧪 STARTER TRIAL — ${prices.trialSol} SOL / ${prices.trialDays} days / one group`,
    `🔄 RENT — ${prices.rentSol} SOL / group / ${prices.rentDays} days`,
    `🏠 RENT TO OWN — ${prices.rentToOwnSol} SOL / month × ${prices.rentToOwnMonths}`,
    `👑 OWN — ${prices.ownSol} SOL one-time perpetual group licence`,
    "",
    "One Starter Trial per group. Its 0.05 SOL payment is stored as a one-time credit toward the first paid upgrade.",
    "Use /suitequote rent|rent_to_own|own inside the group before paying.",
    "Rent-to-Own converts to Own after 12 approved monthly payments.",
    "Own covers the purchased release. Third-party APIs, premium AI usage, external hosting and future major-version upgrades can be separate.",
    "",
    `Payment wallet: ${prices.wallet}`,
    "After payment inside the group:",
    "/suitereceipt PLAN PACKAGE SOL_SIGNATURE",
    "PLAN: trial | rent | rent_to_own | own",
    "PACKAGE: operations | ai | full"
  ].join("\n")));

  bot.onText(/^\/suitequote(?:@\w+)?\s+(rent|rent_to_own|own)$/i, async (message, match) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Open the quote inside the group being licensed.");
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      await groupRow(message);
      const plan = String(match[1]).toLowerCase();
      const { data: licence, error } = await supabase.from("zed_group_licences")
        .select("plan,status,trial_credit_sol,trial_credit_used_at,rent_to_own_payments")
        .eq("chat_id", Number(message.chat.id)).maybeSingle();
      if (error) throw error;
      const quote = upgradeQuote(prices, plan, licence);
      const creditLine = quote.credit > 0
        ? `Trial credit: -${quote.credit} SOL ✅`
        : `Trial credit: ${Number(licence?.trial_credit_sol || 0) > 0 ? "already used" : "none"}`;
      return send(message, [
        "🧾 WORLDZ SUITE QUOTE",
        "",
        `Plan: ${planLabel(plan)}`,
        `Base: ${quote.base} SOL`,
        creditLine,
        `DUE: ${quote.due} SOL`,
        plan === "rent_to_own" ? `Approved RTO payments so far: ${Number(licence?.rent_to_own_payments || 0)}/${prices.rentToOwnMonths}` : null,
        "",
        `Payment wallet: ${prices.wallet}`,
        "After payment: /suitereceipt PLAN PACKAGE SOL_SIGNATURE",
        "Payment still requires on-chain review before activation."
      ].filter(Boolean).join("\n"));
    } catch {
      return send(message, "❌ Suite quote could not be calculated.");
    }
  });

  bot.onText(/^\/suitereceipt(?:@\w+)?\s+(trial|rent|rent_to_own|own)\s+(operations|ai|full)\s+(\S+)$/i, async (message, match) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Submit the receipt inside the group being licensed.");
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const plan = String(match[1]).toLowerCase();
      const productPackage = String(match[2]).toLowerCase();
      const signature = String(match[3]);
      if (!SOL_SIGNATURE.test(signature)) return send(message, "❌ That does not look like a Solana transaction signature.");
      await groupRow(message);
      const { error } = await supabase.from("zed_group_licence_receipts").insert({
        chat_id: Number(message.chat.id),
        receipt_signature: signature,
        submitted_by_telegram_id: Number(message.from.id),
        submitted_at: new Date().toISOString(),
        requested_plan: plan,
        requested_package: productPackage
      });
      if (error) throw error;
      await recordAnalytics(supabase, message.chat.id, message.from.id, "licence_receipt_submitted", { plan, productPackage });
      return send(message, `🧾 Receipt submitted for ${planLabel(plan)} • ${packageLabel(productPackage)}. Access remains pending until the payment is reviewed on-chain.`);
    } catch (error) {
      console.error("Community Suite receipt failed", { code: error?.code || error?.message || "unknown" });
      return send(message, "❌ Receipt could not be recorded. Check whether that signature was already submitted.");
    }
  });

  bot.onText(/^\/suiteapprove(?:@\w+)?\s+(-?\d+)\s+(trial|rent|rent_to_own|own)\s+(operations|ai|full)$/i, async (message, match) => {
    try {
      if (!owner(message, config)) return send(message, "⛔ Owner approval required.");
      const chatId = Number(match[1]);
      const requestedPlan = String(match[2]).toLowerCase();
      const productPackage = String(match[3]).toLowerCase();
      const now = Date.now();
      const { data: previous, error: readError } = await supabase.from("zed_group_licences")
        .select("*").eq("chat_id", chatId).maybeSingle();
      if (readError) throw readError;

      let plan = requestedPlan;
      let payments = Number(previous?.rent_to_own_payments || 0);
      let expiresAt = null;
      let trialCreditSol = Number(previous?.trial_credit_sol || 0);
      let trialCreditUsedAt = previous?.trial_credit_used_at || null;

      if (requestedPlan === "trial" && previous?.approved_at) {
        return send(message, "❌ This group has already used or held an approved Suite plan. Starter Trial is one-time per group.");
      }
      if (requestedPlan === "trial") {
        trialCreditSol = prices.trialSol;
        trialCreditUsedAt = null;
        expiresAt = new Date(now + prices.trialDays * 86400000).toISOString();
      }
      if (requestedPlan === "rent") expiresAt = new Date(now + prices.rentDays * 86400000).toISOString();
      if (requestedPlan === "rent_to_own") {
        payments = Math.min(prices.rentToOwnMonths, payments + 1);
        if (payments >= prices.rentToOwnMonths) {
          plan = "own";
          expiresAt = null;
        } else {
          const base = previous?.expires_at && Date.parse(previous.expires_at) > now ? Date.parse(previous.expires_at) : now;
          expiresAt = new Date(base + prices.rentDays * 86400000).toISOString();
        }
      }

      const { error } = await supabase.from("zed_group_licences").upsert({
        chat_id: chatId,
        plan,
        status: "active",
        product_package: productPackage,
        rent_to_own_payments: payments,
        trial_credit_sol: trialCreditSol,
        trial_credit_used_at: requestedPlan !== "trial" && trialCreditSol > 0 && !trialCreditUsedAt ? new Date().toISOString() : trialCreditUsedAt,
        approved_by_telegram_id: Number(message.from.id),
        approved_at: new Date().toISOString(),
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }, { onConflict: "chat_id" });
      if (error) throw error;

      await supabase.from("community_suite_groups").update({
        product_package: productPackage,
        updated_at: new Date().toISOString()
      }).eq("chat_id", chatId);

      await supabase.from("zed_group_licence_receipts").update({ status: "accepted" })
        .eq("chat_id", chatId).eq("status", "pending_review")
        .eq("requested_plan", requestedPlan).eq("requested_package", productPackage);

      const rto = requestedPlan === "rent_to_own" ? ` • payment ${payments}/${prices.rentToOwnMonths}` : "";
      const usedCredit = requestedPlan !== "trial" && trialCreditSol > 0 && !trialCreditUsedAt ? ` • ${trialCreditSol} SOL trial credit consumed` : "";
      return send(message, `✅ ${packageLabel(productPackage)} • ${planLabel(plan)} activated for ${chatId}${rto}${usedCredit}${expiresAt ? ` until ${expiresAt}` : " • perpetual release licence"}.`);
    } catch (error) {
      console.error("Community Suite approval failed", { code: error?.code || error?.message || "unknown" });
      return send(message, "❌ Licence approval could not be saved.");
    }
  });

  bot.onText(/^\/modules(?:@\w+)?$/i, async (message) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Open /modules inside the community group.");
      await groupRow(message);
      const { data, error } = await supabase.from("community_suite_modules")
        .select("module_key,enabled").eq("chat_id", Number(message.chat.id)).order("module_key");
      if (error) throw error;
      return send(message, `🧩 WORLDZ MODULES\n\n${moduleText(data)}\n\nAdmin: /module MODULE on|off`);
    } catch {
      return send(message, "❌ Module settings could not be loaded.");
    }
  });

  bot.onText(/^\/module(?:@\w+)?\s+([a-z0-9_]+)\s+(on|off)$/i, async (message, match) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Module controls belong inside a group.");
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      await groupRow(message);
      const key = String(match[1]).toLowerCase();
      const enabled = String(match[2]).toLowerCase() === "on";
      if (!MODULES.some(([candidate]) => candidate === key)) return send(message, "❌ Unknown module. Use /modules.");
      await setModule(supabase, message.chat.id, key, enabled, message.from.id);
      const compat = COMPAT_TOGGLES[key];
      if (compat) {
        await supabase.from("zed_chat_settings").upsert({
          chat_id: Number(message.chat.id),
          [compat]: enabled,
          updated_by: Number(message.from.id),
          updated_at: new Date().toISOString()
        }, { onConflict: "chat_id" });
      }
      await recordAnalytics(supabase, message.chat.id, message.from.id, "module_changed", { key, enabled });
      return send(message, `${enabled ? "✅" : "⬜"} ${key} switched ${enabled ? "ON" : "OFF"}.`);
    } catch (error) {
      console.error("Community Suite module toggle failed", { code: error?.code || error?.message || "unknown" });
      return send(message, "❌ Module setting could not be changed.");
    }
  });

  bot.onText(/^\/themes(?:@\w+)?$/i, (message) => send(message, `🎨 WORLDZ THEME PACKS\n\n${themeText()}\n\nAdmin: /brand theme THEME_KEY`));

  bot.onText(/^\/brand(?:@\w+)?(?:\s+(.*))?$/i, async (message, match) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Branding is configured inside the customer group.");
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      await groupRow(message);
      const raw = String(match?.[1] || "").trim();
      if (!raw) {
        const { data } = await supabase.from("community_suite_branding").select("*").eq("chat_id", Number(message.chat.id)).maybeSingle();
        return send(message, [
          "🎨 COMMUNITY BRAND",
          "",
          `Mode: ${data?.mode || "worldz_theme"}`,
          `Theme: ${data?.theme_key || "purple_galaxy"}`,
          `Bot: ${data?.bot_display_name || "ZED-powered Operations Bot"}`,
          `AI: ${data?.ai_display_name || "Custom AI Community Bot"}`,
          `Token: ${data?.token_symbol || "—"} ${data?.token_address || ""}`,
          "",
          "/brand theme KEY",
          "/brand mode worldz_theme|customer|premium_custom",
          "/brand bot DISPLAY NAME",
          "/brand ai DISPLAY NAME",
          "/brand token SYMBOL ADDRESS"
        ].join("\n"));
      }
      const [action, ...parts] = raw.split(/\s+/);
      const rest = parts.join(" ").trim();
      const patch = { updated_by_telegram_id: Number(message.from.id), updated_at: new Date().toISOString() };
      if (action === "theme") {
        if (!THEME_PACKS.some((item) => item.key === rest)) return send(message, "❌ Unknown theme. Use /themes.");
        patch.theme_key = rest; patch.mode = "worldz_theme";
      } else if (action === "mode") {
        if (!["worldz_theme","customer","premium_custom"].includes(rest)) return send(message, "❌ Mode: worldz_theme | customer | premium_custom");
        patch.mode = rest;
      } else if (action === "bot") {
        if (!rest || rest.length > 64) return send(message, "❌ Bot display name must be 1–64 characters.");
        patch.bot_display_name = rest;
      } else if (action === "ai") {
        if (!rest || rest.length > 64) return send(message, "❌ AI display name must be 1–64 characters.");
        patch.ai_display_name = rest;
      } else if (action === "token") {
        const [symbol, address] = parts;
        if (!symbol || !address) return send(message, "❌ Use /brand token SYMBOL ADDRESS");
        patch.token_symbol = symbol.toUpperCase().slice(0, 16);
        patch.token_address = address.slice(0, 160);
      } else return send(message, "❌ Use /brand with theme, mode, bot, ai or token.");
      const { error } = await supabase.from("community_suite_branding").upsert({
        chat_id: Number(message.chat.id), ...patch
      }, { onConflict: "chat_id" });
      if (error) throw error;
      await recordAnalytics(supabase, message.chat.id, message.from.id, "branding_changed", { action });
      return send(message, "✅ Community branding updated.");
    } catch {
      return send(message, "❌ Branding could not be updated.");
    }
  });

  bot.onText(/^\/language(?:@\w+)?(?:\s+([a-z]{2,8}(?:-[A-Z]{2})?))?$/i, async (message, match) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Language settings belong inside the group.");
      await groupRow(message);
      const requested = String(match?.[1] || "").trim();
      if (!requested) {
        const { data } = await supabase.from("community_suite_groups").select("language_code").eq("chat_id", Number(message.chat.id)).maybeSingle();
        return send(message, `🌍 Community language: ${data?.language_code || "en"}\n\nAdmin: /language en • es • pt-BR • etc.`);
      }
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const { error } = await supabase.from("community_suite_groups")
        .update({ language_code: requested, updated_at: new Date().toISOString() })
        .eq("chat_id", Number(message.chat.id));
      if (error) throw error;
      return send(message, `✅ Community language preference set to ${requested}. AI/localised modules can use this preference when connected.`);
    } catch {
      return send(message, "❌ Language preference could not be updated.");
    }
  });

  bot.onText(/^\/lockdown(?:@\w+)?(?:\s+(on|off|status))?$/i, async (message, match) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Emergency Lockdown belongs inside a group.");
      await groupRow(message);
      const action = String(match?.[1] || "status").toLowerCase();
      if (action !== "status" && !(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      if (action === "on" || action === "off") {
        const enabled = action === "on";
        const { error } = await supabase.from("community_suite_groups")
          .update({ emergency_lockdown: enabled, updated_at: new Date().toISOString() })
          .eq("chat_id", Number(message.chat.id));
        if (error) throw error;
        await recordAnalytics(supabase, message.chat.id, message.from.id, enabled ? "lockdown_on" : "lockdown_off");
      }
      const { data } = await supabase.from("community_suite_groups")
        .select("emergency_lockdown").eq("chat_id", Number(message.chat.id)).maybeSingle();
      return send(message, data?.emergency_lockdown
        ? "🚨 WORLDZ EMERGENCY LOCKDOWN — ON\n\nREX security, ALICE support and Inbox remain available. Optional campaign, giveaway, market, raid and automation modules are paused."
        : "✅ WORLDZ EMERGENCY LOCKDOWN — OFF\n\nEnabled modules can operate normally.");
    } catch {
      return send(message, "❌ Lockdown state could not be changed.");
    }
  });

  bot.onText(/^\/networkstatus(?:@\w+)?$/i, async (message) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Network status belongs inside a customer group.");
      await groupRow(message);
      const { data: group, error } = await supabase.from("community_suite_groups")
        .select("network_key").eq("chat_id", Number(message.chat.id)).maybeSingle();
      if (error) throw error;
      if (!group?.network_key) return send(message, "🌐 This group is not attached to a multi-group network licence.");
      const { data: network } = await supabase.from("community_suite_networks").select("*").eq("network_key", group.network_key).maybeSingle();
      const { count } = await supabase.from("community_suite_network_members").select("*", { count:"exact", head:true })
        .eq("network_key", group.network_key).eq("status", "active");
      return send(message, [
        "🌐 COMMUNITY SUITE NETWORK",
        "",
        `Network: ${network?.name || group.network_key}`,
        `Key: ${group.network_key}`,
        `Active groups: ${count || 0}/${network?.max_groups || "—"}`,
        `Status: ${network?.status || "unknown"}`
      ].join("\n"));
    } catch {
      return send(message, "❌ Network status could not be loaded.");
    }
  });

  bot.onText(/^\/networkrequest(?:@\w+)?\s+([a-z0-9_-]{2,48})$/i, async (message, match) => {
    try {
      if (!isGroup(message) || !(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      await groupRow(message);
      const networkKey = String(match[1]).toLowerCase();
      const { data: network, error } = await supabase.from("community_suite_networks")
        .select("*").eq("network_key", networkKey).eq("status", "active").maybeSingle();
      if (error) throw error;
      if (!network) return send(message, "❌ Active network licence not found.");
      const { error: requestError } = await supabase.from("community_suite_network_members").upsert({
        network_key: networkKey,
        chat_id: Number(message.chat.id),
        status: "pending",
        requested_by: Number(message.from.id),
        requested_at: new Date().toISOString()
      }, { onConflict:"network_key,chat_id" });
      if (requestError) throw requestError;
      return send(message, `🌐 Network request submitted for ${network.name}. Owner approval is required before this group consumes a network slot.`);
    } catch {
      return send(message, "❌ Network request could not be recorded.");
    }
  });

  bot.onText(/^\/networkcreate(?:@\w+)?\s+([a-z0-9_-]{2,48})\s*\|\s*([^|]+)\s*\|\s*(\d+)$/i, async (message, match) => {
    try {
      if (!owner(message, config)) return send(message, "⛔ Worldz owner access required.");
      const networkKey = String(match[1]).toLowerCase();
      const name = String(match[2]).trim().slice(0, 120);
      const maxGroups = Number(match[3]);
      if (!name || !Number.isInteger(maxGroups) || maxGroups < 1 || maxGroups > 1000) return send(message, "❌ Use /networkcreate KEY | NAME | MAX_GROUPS");
      const { error } = await supabase.from("community_suite_networks").upsert({
        network_key: networkKey,
        name,
        owner_telegram_id: Number(message.from.id),
        max_groups: maxGroups,
        status: "active",
        updated_at: new Date().toISOString()
      }, { onConflict:"network_key" });
      if (error) throw error;
      return send(message, `✅ Network ${name} created with up to ${maxGroups} group slots.`);
    } catch {
      return send(message, "❌ Network licence could not be created.");
    }
  });

  bot.onText(/^\/networkapprove(?:@\w+)?\s+([a-z0-9_-]{2,48})\s+(-?\d+)$/i, async (message, match) => {
    try {
      if (!owner(message, config)) return send(message, "⛔ Worldz owner access required.");
      const networkKey = String(match[1]).toLowerCase();
      const chatId = Number(match[2]);
      const { data: network, error } = await supabase.from("community_suite_networks").select("*").eq("network_key", networkKey).eq("status","active").maybeSingle();
      if (error) throw error;
      if (!network) return send(message, "❌ Active network not found.");
      const { count } = await supabase.from("community_suite_network_members").select("*",{count:"exact",head:true}).eq("network_key",networkKey).eq("status","active");
      const { data: existing } = await supabase.from("community_suite_network_members").select("status").eq("network_key",networkKey).eq("chat_id",chatId).maybeSingle();
      if (existing?.status !== "active" && Number(count || 0) >= Number(network.max_groups)) return send(message, "❌ That network has no free group slots.");
      await supabase.from("community_suite_network_members").upsert({
        network_key:networkKey, chat_id:chatId, status:"active",
        approved_by:Number(message.from.id), approved_at:new Date().toISOString()
      }, {onConflict:"network_key,chat_id"});
      await supabase.from("community_suite_groups").update({network_key:networkKey,updated_at:new Date().toISOString()}).eq("chat_id",chatId);
      return send(message, `✅ Group ${chatId} activated on network ${network.name}.`);
    } catch {
      return send(message, "❌ Network group approval failed.");
    }
  });

  bot.onText(/^\/networkremove(?:@\w+)?\s+([a-z0-9_-]{2,48})\s+(-?\d+)$/i, async (message, match) => {
    try {
      if (!owner(message, config)) return send(message, "⛔ Worldz owner access required.");
      const networkKey=String(match[1]).toLowerCase(), chatId=Number(match[2]);
      await supabase.from("community_suite_network_members").update({status:"removed"}).eq("network_key",networkKey).eq("chat_id",chatId);
      await supabase.from("community_suite_groups").update({network_key:null,updated_at:new Date().toISOString()}).eq("chat_id",chatId).eq("network_key",networkKey);
      return send(message, `✅ Group ${chatId} removed from network ${networkKey}.`);
    } catch {
      return send(message, "❌ Network group could not be removed.");
    }
  });

  bot.onText(/^\/launchconnect(?:@\w+)?\s+([^|]+)\s*\|\s*([^|]+)\s*\|\s*(\S+)$/i, async (message, match) => {
    try {
      if (!isGroup(message) || !(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      await groupRow(message);
      const slug=String(match[1]).trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-").slice(0,80);
      const symbol=String(match[2]).trim().toUpperCase().replace(/^\$/,"").slice(0,24);
      const address=String(match[3]).trim().slice(0,240);
      if (!slug || !symbol || !address) return send(message, "❌ Use /launchconnect PROJECT_SLUG | SYMBOL | TOKEN_ADDRESS");
      await supabase.from("community_suite_groups").update({launchpad_project_slug:slug,updated_at:new Date().toISOString()}).eq("chat_id",Number(message.chat.id));
      await supabase.from("community_suite_branding").upsert({
        chat_id:Number(message.chat.id),token_symbol:symbol,token_address:address,updated_by_telegram_id:Number(message.from.id),updated_at:new Date().toISOString()
      },{onConflict:"chat_id"});
      await recordAnalytics(supabase,message.chat.id,message.from.id,"launchpad_link_recorded",{slug,symbol});
      return send(message, `🚀 LaunchPad linkage recorded: ${slug} • ${symbol} • ${address}\n\nThis records the community relationship; it does not claim an external listing or launch is live without separate evidence.`);
    } catch {
      return send(message, "❌ LaunchPad linkage could not be recorded.");
    }
  });

  bot.onText(/^\/launchstatus(?:@\w+)?$/i, async (message) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Launch status belongs inside the customer group.");
      await groupRow(message);
      const {data:group}=await supabase.from("community_suite_groups").select("launchpad_project_slug").eq("chat_id",Number(message.chat.id)).maybeSingle();
      const {data:brand}=await supabase.from("community_suite_branding").select("token_symbol,token_address").eq("chat_id",Number(message.chat.id)).maybeSingle();
      return send(message, [
        "🚀 WORLDZLAUNCHPAD™ COMMUNITY LINK",
        "",
        `Project slug: ${group?.launchpad_project_slug || "not linked"}`,
        `Token: ${brand?.token_symbol ? "$"+brand.token_symbol : "—"}`,
        `Address: ${brand?.token_address || "—"}`,
        "",
        "Use /scan TOKEN_ADDRESS for live market/authority evidence."
      ].join("\n"));
    } catch {
      return send(message, "❌ Launch linkage could not be loaded.");
    }
  });

  bot.onText(/^\/analytics(?:@\w+)?$/i, async (message) => {
    try {
      if (!isGroup(message)) return send(message, "❌ Analytics belongs inside the group.");
      if (!(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data, error } = await supabase.from("community_suite_analytics_events")
        .select("event_type").eq("chat_id", Number(message.chat.id)).gte("created_at", since);
      if (error) throw error;
      const counts = {};
      for (const row of data || []) counts[row.event_type] = (counts[row.event_type] || 0) + 1;
      const lines = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 20)
        .map(([key, value]) => `• ${key}: ${value}`);
      return send(message, `📊 COMMUNITY SUITE ANALYTICS — LAST 7 DAYS\n\n${lines.join("\n") || "No Suite events recorded yet."}`);
    } catch {
      return send(message, "❌ Analytics could not be loaded.");
    }
  });

  bot.onText(/^\/marketplace(?:@\w+)?$/i, async (message) => {
    try {
      if (!isGroup(message)) {
        const lines = MARKETPLACE_ADDONS.map(([key,label,description]) => `• ${label} — ${description} — ${key}`);
        return send(message, `🌐 WORLDZ MARKETPLACE™\n\n${lines.join("\n")}\n\nOpen this inside your customer group to request an add-on.`);
      }
      await groupRow(message);
      const { data: requests, error } = await supabase.from("community_suite_addon_requests")
        .select("id,addon_key,status,quoted_sol,quoted_aud,owner_note,created_at")
        .eq("chat_id", Number(message.chat.id))
        .order("created_at", { ascending:false }).limit(15);
      if (error) throw error;
      const requested = new Map((requests || []).map((row) => [row.addon_key,row]));
      const lines = MARKETPLACE_ADDONS.map(([key,label,description,pricingType]) => {
        const row = requested.get(key);
        const state = row ? ` • ${row.status.toUpperCase()}` : "";
        const price = row?.quoted_sol != null ? ` • quote ${row.quoted_sol} SOL` :
          row?.quoted_aud != null ? ` • quote A${row.quoted_aud}` :
          pricingType === "included_or_quote" ? " • may be included by package" : " • quote";
        return `${label}${state}\n${description}${price}\nKey: ${key}`;
      });
      return send(message, [
        "🌐 WORLDZ MARKETPLACE™",
        "",
        lines.join("\n\n"),
        "",
        "Admin request: /addonrequest ADDON_KEY | optional note",
        "View requests: /addons",
        "",
        "No add-on activates or charges automatically. A quote/review comes first."
      ].join("\n"));
    } catch {
      return send(message, "❌ Worldz Marketplace could not load.");
    }
  });

  bot.onText(/^\/addonrequest(?:@\w+)?\s+([a-z0-9_]+)(?:\s*\|\s*([\s\S]+))?$/i, async (message, match) => {
    try {
      if (!isGroup(message) || !(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      await groupRow(message);
      const addonKey = String(match[1]).toLowerCase();
      const addon = MARKETPLACE_ADDONS.find(([key]) => key === addonKey);
      if (!addon) return send(message, "❌ Unknown add-on. Use /marketplace.");
      const note = String(match?.[2] || "").trim().slice(0, 1200);
      const { data, error } = await supabase.from("community_suite_addon_requests").insert({
        chat_id: Number(message.chat.id),
        addon_key: addonKey,
        status: "requested",
        requested_by: Number(message.from.id),
        request_note: note
      }).select("*").single();
      if (error) throw error;
      await recordAnalytics(supabase, message.chat.id, message.from.id, "addon_requested", { addonKey, requestId:data.id });
      return send(message, `🧾 Marketplace Request #${data.id}\n\n${addon[1]}\nStatus: REQUESTED\n\nNo charge or activation has occurred. Worldz can review scope and quote it next.`);
    } catch {
      return send(message, "❌ Add-on request could not be recorded.");
    }
  });

  bot.onText(/^\/addons(?:@\w+)?$/i, async (message) => {
    try {
      if (!isGroup(message) || !(await requireAdmin(message))) return send(message, "⛔ Group admin access required.");
      const { data, error } = await supabase.from("community_suite_addon_requests")
        .select("*").eq("chat_id", Number(message.chat.id)).order("created_at",{ascending:false}).limit(30);
      if (error) throw error;
      const lines = (data || []).map((row) => {
        const addon = MARKETPLACE_ADDONS.find(([key]) => key === row.addon_key);
        const quote = row.quoted_sol != null ? `${row.quoted_sol} SOL` : row.quoted_aud != null ? `A${row.quoted_aud}` : "not quoted";
        return `#${row.id} • ${addon?.[1] || row.addon_key} • ${row.status.toUpperCase()} • ${quote}`;
      });
      return send(message, `🌐 MARKETPLACE REQUESTS\n\n${lines.join("\n") || "No add-on requests yet."}`);
    } catch {
      return send(message, "❌ Marketplace requests could not be loaded.");
    }
  });

  bot.onText(/^\/addonquote(?:@\w+)?\s+(\d+)\s+(sol|aud)\s+([0-9]+(?:\.[0-9]+)?)(?:\s*\|\s*([\s\S]+))?$/i, async (message, match) => {
    try {
      if (!owner(message, config)) return send(message, "⛔ Worldz owner access required.");
      const id = Number(match[1]);
      const currency = String(match[2]).toLowerCase();
      const amount = Number(match[3]);
      const note = String(match?.[4] || "").trim().slice(0, 1200);
      if (!Number.isFinite(amount) || amount < 0) return send(message, "❌ Quote amount must be valid.");
      const patch = {
        status:"quoted",
        owner_note:note,
        updated_at:new Date().toISOString(),
        quoted_sol: currency === "sol" ? amount : null,
        quoted_aud: currency === "aud" ? amount : null
      };
      const { data, error } = await supabase.from("community_suite_addon_requests")
        .update(patch).eq("id", id).select("*").maybeSingle();
      if (error) throw error;
      if (!data) return send(message, "❌ Marketplace request not found.");
      return send(message, `✅ Request #${id} quoted at ${currency === "sol" ? amount+" SOL" : "A$"+amount}. No activation/payment occurs automatically.`);
    } catch {
      return send(message, "❌ Marketplace quote could not be saved.");
    }
  });

  bot.onText(/^\/addonstatus(?:@\w+)?\s+(\d+)\s+(approved|active|declined|cancelled)$/i, async (message, match) => {
    try {
      if (!owner(message, config)) return send(message, "⛔ Worldz owner access required.");
      const id = Number(match[1]), status = String(match[2]).toLowerCase();
      const { data, error } = await supabase.from("community_suite_addon_requests")
        .update({status,updated_at:new Date().toISOString()}).eq("id",id).select("*").maybeSingle();
      if (error) throw error;
      if (!data) return send(message, "❌ Marketplace request not found.");
      return send(message, `✅ Marketplace Request #${id} → ${status.toUpperCase()}.`);
    } catch {
      return send(message, "❌ Marketplace status could not be updated.");
    }
  });

  bot.onText(/^\/boostcentre(?:@\w+)?$/i, async (message) => {
    if (isGroup(message)) await recordAnalytics(supabase, message.chat.id, message.from.id, "boost_centre_open");
    return send(message, [
      "🚀 WORLDZ BOOST CENTRE™",
      "",
      "Organic Worldz Votes and paid promotion stay separate.",
      "",
      "Available promotion lanes:",
      "• DEX Screener official Boost / Token Info handoff",
      "• Sponsored Worldz placement — clearly labelled",
      "• G.R.A.C.E. campaign scheduling",
      "• Cross-community opt-in promotion",
      "• Referral campaigns",
      "",
      "No fake buys • no wash trading • no spoofed alerts • no fake votes • no undisclosed paid ranking.",
      "",
      "Worldz records provider status; external purchases still require explicit customer approval."
    ].join("\n"));
  });
}

module.exports = {
  MARKETPLACE_ADDONS,
  moduleText,
  packageLabel,
  planLabel,
  registerCommunitySuiteHandlers,
  themeText,
  upgradeQuote
};
