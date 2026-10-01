const { groupsForRole, normalizeRole } = require("./command-registry");

const BOT_MENU_COMMANDS = [
  { command: "zedstart", description: "Open Command Centre MAX" },
  { command: "max", description: "Learn, research, interact and teach with MAX" },
  { command: "fullscope", description: "Open WorldzFullScope multi-chain command layer" },
  { command: "zed", description: "Zed profile, wallet, raids and settings" },
  { command: "auto", description: "Open Auto finance controls" },
  { command: "grace", description: "Open Grace Auto Post controls" },
  { command: "admin", description: "Open Admin controls" },
  { command: "admingrace", description: "Open Grace Admin controls" },
  { command: "zedsettings", description: "Open Command Centre settings" },
  { command: "help", description: "Show the simple command guide" }
];

const MENUS = {
  zed: {
    title: "🤖 ZED COMMAND CENTRE",
    rows: [
      ["👤 Profile", "/profile"],
      ["👛 Wallet", "/wallet"],
      ["🤠 Ronald Raider", "/raid"],
      ["📣 Shill Rewards", "/shillpoints"],
      ["📚 All Commands", "/commands"]
    ]
  },
  fullscope: {
    title: "🌐 WORLDZFULLSCOPE™",
    rows: [
      ["📡 FullScope Status", "/fullscope"],
      ["🪙 Token Registry", "/fullscopetokens"],
      ["📡 WorldzWatch", "/worldzwatch"],
      ["🗳️ Votes Centre", "/worldzvotes"],
      ["⏱️ Hourly Token Vote", "/vote"]
    ]
  },
  votes: {
    title: "🗳️ WORLDZ VOTES CENTRE™ — DEX TOKEN VOTING • 1 VOTE / HOUR",
    rows: [
      ["🔥 Trending", "/worldztrending"],
      ["🏆 Rankings", "/worldzrankings"],
      ["🗳️ Vote Favourite Token", "/vote"],
      ["🪙 Registered Tokens", "/fullscopetokens"],
      ["🌐 FullScope", "/fullscope"]
    ]
  },
  auto: {
    title: "💎 AUTO",
    rows: [
      ["📊 Status", "/auto"],
      ["🧪 Simulation", "/autosimulate"],
      ["📅 DCA", "/autodca"],
      ["⏸ Pause", "/autopause"],
      ["🛑 Emergency Stop", "/autoemergency"]
    ]
  },
  grace: {
    title: "👩‍💼 GRACE AUTO POST™",
    rows: [
      ["✍️ Create Post", "/draft"],
      ["📅 Schedule", "/calendar"],
      ["✅ Approvals", "/approve"],
      ["📱 Accounts", "/accounts"],
      ["📈 Results", "/results"]
    ]
  },
  admin: {
    title: "🛡 ADMIN",
    rows: [
      ["👥 Executive Team", "/executives"],
      ["➕ Add Scoped Admin", "/addscopedadmin"],
      ["🚫 Disable Admin", "/disableadmin"],
      ["👑 Appoint Executive", "/appointexecutive"],
      ["📚 Full Access Commands", "/commands"]
    ]
  },
  admingrace: {
    title: "🛡 GRACE ADMIN",
    rows: [
      ["👩‍💼 Grace Status", "/secretary"],
      ["📱 Social Accounts", "/accounts"],
      ["🔗 Connect X", "/connectx"],
      ["🩺 X Runtime", "/gracestatus"],
      ["🛑 Emergency Stop", "/pauseall"]
    ]
  },
  settings: {
    title: "⚙️ COMMAND CENTRE SETTINGS",
    rows: [
      ["🤖 Zed", "/zed"],
      ["💎 Auto", "/auto"],
      ["👩‍💼 Grace", "/grace"],
      ["🛡 Admin", "/admin"],
      ["🌳 Command Tree", "/commandtree"]
    ]
  }
};

const WEB_ROUTES = Object.freeze({
  miniApp: "https://cryptobotz.cryptoworldz.xyz/miniapp/",
  directory: "https://cryptoworldz.xyz/",
  acknowledgements: "https://donateworldz.com/acknowledgements/",
  supportJay: "https://donateworldz.com/support-jayjayteamdev/",
  donateReagan: "https://donateworldz.com/reagan-children/",
  publicCommands: "https://cryptoworldz.xyz/command-centre-max/",
  fullScope: "https://launchpad.cryptoworldz.xyz/fullscope/",
  fullBuild: "https://launchpad.cryptoworldz.xyz/fullbuild/"
});

function menuText(menu) {
  return [
    menu.title,
    "",
    ...menu.rows.map(([label, command]) => `${label} — ${command}`),
    "",
    "Use /commands for the complete command list available to your access level."
  ].join("\n");
}

function mainKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🧠 OPEN COMMAND CENTRE MAX™", web_app: { url: WEB_ROUTES.miniApp } }],
        [{ text: "🌐 WORLDZFULLSCOPE™", callback_data: "cc:menu:fullscope" }],
        [{ text: "📥 WORLDZ INBOX™", web_app: { url: `${WEB_ROUTES.miniApp}#inbox` } }],
        [{ text: "🗳️ WORLDZ TOKEN VOTES • HOURLY", callback_data: "cc:menu:votes" }],
        [
          { text: "🤖 ZED", callback_data: "cc:menu:zed" },
          { text: "💎 AUTO", callback_data: "cc:menu:auto" }
        ],
        [
          { text: "👩‍💼 GRACE", callback_data: "cc:menu:grace" },
          { text: "🛡 ADMIN", callback_data: "cc:menu:admin" }
        ],
        [
          { text: "📚 COMMANDS", callback_data: "cc:commands" },
          { text: "🌳 STRUCTURE", callback_data: "cc:tree" }
        ],
        [{ text: "⚙️ SETTINGS", callback_data: "cc:menu:settings" }]
      ]
    }
  };
}

function groupText(group) {
  return [
    group.label,
    `Access: ${group.minimumRole.toUpperCase()}`,
    "",
    ...group.commands.map((item) => `/${item.command} — ${item.description}`)
  ].join("\n");
}

function commandTreeText(role) {
  const groups = groupsForRole(role);
  return [
    "🌳 CRYPTOWORLDZ COMMAND STRUCTURAL TREE",
    "",
    `Your access: ${normalizeRole(role).toUpperCase()}`,
    "",
    ...groups.map((group) => `${group.label} — ${group.commands.length} commands`),
    "",
    `Public command webpage: ${WEB_ROUTES.publicCommands}`,
    "Use /commands to expand every command available to you."
  ].join("\n");
}

function registerCommandCentreHandlers({ bot, repository, config, supabase }) {
  const send = (msg, text, options) => bot.sendMessage(msg.chat.id, text, options);
  const isOwner = (msg) => String(msg.from?.id || "") === String(config.ownerTelegramId || "");

  async function roleFor(msg) {
    if (isOwner(msg)) return "owner";
    try {
      if (typeof repository.getAdminAccess === "function") {
        const access = await repository.getAdminAccess(
          msg.from.id,
          config.adminTelegramIds,
          config.ownerTelegramId
        );
        if (access?.authorized) return normalizeRole(access.role || "admin");
      }
      if (typeof repository.isManagedAdmin === "function" && await repository.isManagedAdmin(
        msg.from.id,
        config.adminTelegramIds,
        config.ownerTelegramId
      )) return "admin";
    } catch {}
    return "member";
  }

  const isAdmin = async (msg) => ["admin", "executive", "owner"].includes(await roleFor(msg));

  const SETTING_ROWS = Object.freeze([
    ["ronald_raider_enabled", "🤠 Ronald Raider"],
    ["shill_rewards_enabled", "📣 Shill Rewards"],
    ["referral_links_enabled", "🔗 Shill Links"],
    ["secureguard_enabled", "🛡 REXSECURE ULTIMATE"],
    ["dipshit_enabled", "💙 DipShit"]
  ]);
  const SETTING_KEYS = new Set(SETTING_ROWS.map(([key]) => key));

  async function getChatSettings(chatId) {
    if (!supabase) return Object.fromEntries(SETTING_ROWS.map(([key]) => [key, true]));
    const { data, error } = await supabase
      .from("zed_chat_settings")
      .select("*")
      .eq("chat_id", Number(chatId))
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
    const seed = { chat_id: Number(chatId) };
    const { data: created, error: createError } = await supabase
      .from("zed_chat_settings")
      .upsert(seed, { onConflict: "chat_id" })
      .select("*")
      .single();
    if (createError) throw createError;
    return created;
  }

  function settingsText(row) {
    return [
      "⚙️ ZED BOT SETTINGS",
      "",
      ...SETTING_ROWS.map(([key, label]) => `${row[key] !== false ? "✅" : "⬜"} ${label}: ${row[key] !== false ? "On" : "Off"}`),
      "",
      "Tap any box to switch it on or off.",
      "Only controls wired to live runtime behaviour are shown here.",
      "Changes apply to this Telegram chat only."
    ].join("\n");
  }

  function settingsKeyboard(row) {
    const rows = [];
    for (let i = 0; i < SETTING_ROWS.length; i += 2) {
      rows.push(SETTING_ROWS.slice(i, i + 2).map(([key, label]) => ({
        text: `${row[key] !== false ? "✅" : "⬜"} ${label.replace(/^[^ ]+ /, "")}`,
        callback_data: `cc:toggle:${key}`
      })));
    }
    rows.push([{ text: "🔄 Refresh Settings", callback_data: "cc:settings:refresh" }]);
    return { reply_markup: { inline_keyboard: rows } };
  }

  async function sendSettingsPanel(msg) {
    try {
      const row = await getChatSettings(msg.chat.id);
      return send(msg, settingsText(row), settingsKeyboard(row));
    } catch (error) {
      console.error("Command Centre settings panel failed", { code: error?.code || error?.message || "unknown" });
      return send(msg, "❌ ZED couldn't load the toggle settings panel.");
    }
  }

  async function sendCommandGroups(msg, forcedRole = null) {
    const role = forcedRole || await roleFor(msg);
    const groups = groupsForRole(role);
    await send(msg, `📚 COMMAND CENTRE — ${normalizeRole(role).toUpperCase()} ACCESS\n\n${groups.reduce((sum, group) => sum + group.commands.length, 0)} registered commands across ${groups.length} sections.`);
    for (const group of groups) await send(msg, groupText(group));
  }

  const openHome = (msg) => send(msg, [
    "🧠 CryptoWorldz Command Centre MAX™",
    "",
    "LEARN • RESEARCH • INTERACT • TEACH • BUILD • PROVE",
    "ZED leads the Command Centre. Ronald Raider runs live Raid queues and points submissions. Shill Rewards tracks verified token sharing. WorldzFullScope watches the supported multi-chain token universe and hourly Worldz token votes. AUTO explains controlled finance workflows. G.R.A.C.E. coordinates approved communication. MAX keeps reviewed knowledge clear. WorldzLaunchPad builds and proves launches.",
    "",
    "Gateway commands:",
    "/zedstart • /worldzfullbuild • /fullscope • /worldzvotes • /vote • /commands • /commandtree",
    "",
    "You do not need to memorise the full command list."
  ].join("\n"), mainKeyboard());

  bot.onText(/^\/zedstart(?:@\w+)?$/, openHome);
  bot.onText(/^\/zed(?:@\w+)?$/, (msg) => send(msg, menuText(MENUS.zed)));
  bot.onText(/^\/max(?:@\w+)?$/, (msg) => send(msg, [
    "🧠 COMMAND CENTRE MAX™",
    "",
    "Learn • Research • Interact • Teach",
    "",
    "MAX is source-first: new research is queued separately from approved knowledge, and human review stays above automation.",
    "",
    "Open the Mini App and tap MAX™."
  ].join("\n"), {
    reply_markup: { inline_keyboard: [[{ text: "🧠 OPEN MAX™", web_app: { url: WEB_ROUTES.miniApp } }]] }
  }));
  bot.onText(/^\/grace(?:@\w+)?$/, async (msg) => {
    if (!(await isAdmin(msg))) return send(msg, "⛔ Grace requires Command Centre access.");
    return send(msg, menuText(MENUS.grace));
  });
  bot.onText(/^\/admin(?:@\w+)?$/, async (msg) => {
    if (!(await isAdmin(msg))) return send(msg, "⛔ Admin access required.");
    return send(msg, menuText(MENUS.admin));
  });
  bot.onText(/^\/admingrace(?:@\w+)?$/, async (msg) => {
    if (!(await isAdmin(msg))) return send(msg, "⛔ Grace Admin access required.");
    return send(msg, menuText(MENUS.admingrace));
  });
  bot.onText(/^\/zedsettings(?:@\w+)?$/, async (msg) => {
    if (!(await isAdmin(msg))) return send(msg, "⛔ Command Centre settings require Admin access.");
    return sendSettingsPanel(msg);
  });

  bot.onText(/^\/worldzfullbuild(?:@\w+)?$/, (msg) => send(msg, [
    "🌐 WORLDZFULLBUILD™",
    "",
    "One Worldz. One Build.",
    "",
    "The current main integration source of truth for WorldzLaunchPad, FullScope, Omnichain, Proof, WorldDexPush and the connected Worldz architecture.",
    "",
    "Live claims stay evidence-driven; mainnet execution stays independently gated."
  ].join("\n"), {
    reply_markup: { inline_keyboard: [[{ text: "🌐 OPEN WORLDZFULLBUILD™", url: WEB_ROUTES.fullBuild }]] }
  }));

  bot.onText(/^\/commands(?:@\w+)?$/, (msg) => sendCommandGroups(msg));
  bot.onText(/^\/ownercommands(?:@\w+)?$/, async (msg) => {
    if (!isOwner(msg)) return send(msg, "⛔ Owner access required.");
    return sendCommandGroups(msg, "owner");
  });
  bot.onText(/^\/commandtree(?:@\w+)?$/, async (msg) => send(msg, commandTreeText(await roleFor(msg))));

  bot.onText(/^\/directory(?:@\w+)?$/, (msg) => send(msg, `🌐 Worldz directory\n${WEB_ROUTES.directory}`));
  bot.onText(/^\/acknowledgements?(?:@\w+)?$/i, (msg) => send(msg, `💜 Acknowledgements\n${WEB_ROUTES.acknowledgements}`));
  bot.onText(/^\/supportjay(?:@\w+)?$/i, (msg) => send(msg, `💜 JayJayTeamDev@DonateWorldz\n${WEB_ROUTES.supportJay}`));

  // Current launch route override: the retired GoFundMe route must never be the Command Centre donation destination.
  bot.onText(/^\/donate(?:@\w+)?$/i, (msg) => send(msg, [
    "💜 DonateWorldz — Reagan & Children / Action Spread Smiles",
    WEB_ROUTES.donateReagan,
    "",
    "For all separated support pathways, open https://donateworldz.com/"
  ].join("\n")));

  bot.onText(/^\/help(?:@\w+)?$/, async (msg) => send(msg, [
    "📘 COMMAND CENTRE HELP",
    "",
    "/zedstart — open Command Centre MAX™",
    "/max — open the MAX learning and research hub",
    "/commands — every command available to your role",
    "/inbox — private Worldz Inbox + DM messaging",
    "/commandtree — command sections and structure",
    "/directory — Worldz site directory",
    "/acknowledgements — DonateWorldz Acknowledgements page",
    "/supportjay — exact Support JayJayTeamDev page",
    isOwner(msg) ? "/ownercommands — full owner inventory" : "",
    "",
    `Public command guide: ${WEB_ROUTES.publicCommands}`
  ].filter(Boolean).join("\n")));

  bot.on("callback_query", async (query) => {
    const data = String(query.data || "");
    const msg = query.message;
    if (!msg || !data.startsWith("cc:")) return;
    const actor = { ...msg, from: query.from };

    if (data === "cc:menu:settings" || data === "cc:settings:refresh") {
      if (!(await isAdmin(actor))) {
        await bot.answerCallbackQuery(query.id, { text: "Admin access required", show_alert: true });
        return;
      }
      await bot.answerCallbackQuery(query.id);
      return sendSettingsPanel(actor);
    }

    const toggleMatch = data.match(/^cc:toggle:([a-z_]+)$/);
    if (toggleMatch) {
      if (!(await isAdmin(actor))) {
        await bot.answerCallbackQuery(query.id, { text: "Admin access required", show_alert: true });
        return;
      }
      const key = toggleMatch[1];
      if (!SETTING_KEYS.has(key)) {
        await bot.answerCallbackQuery(query.id, { text: "Unknown setting", show_alert: true });
        return;
      }
      try {
        const current = await getChatSettings(msg.chat.id);
        const next = current[key] === false;
        const { data: updated, error } = await supabase
          .from("zed_chat_settings")
          .update({ [key]: next, updated_by: Number(query.from.id), updated_at: new Date().toISOString() })
          .eq("chat_id", Number(msg.chat.id))
          .select("*")
          .single();
        if (error) throw error;
        await bot.answerCallbackQuery(query.id, { text: `${next ? "Enabled" : "Disabled"}` });
        if (typeof bot.editMessageText === "function") {
          await bot.editMessageText(settingsText(updated), {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            ...settingsKeyboard(updated)
          }).catch(() => sendSettingsPanel(actor));
        } else {
          await sendSettingsPanel(actor);
        }
      } catch (error) {
        console.error("Command Centre setting toggle failed", { code: error?.code || error?.message || "unknown" });
        await bot.answerCallbackQuery(query.id, { text: "Setting update failed", show_alert: true }).catch(() => undefined);
      }
      return;
    }

    const menuMatch = data.match(/^cc:menu:(zed|fullscope|votes|auto|grace|admin)$/);
    if (menuMatch) {
      const key = menuMatch[1];
      if (["grace", "admin", "settings"].includes(key) && !(await isAdmin(actor))) {
        await bot.answerCallbackQuery(query.id, { text: "Admin access required", show_alert: true });
        return;
      }
      await bot.answerCallbackQuery(query.id);
      await send(msg, menuText(MENUS[key]));
      return;
    }

    if (data === "cc:commands") {
      await bot.answerCallbackQuery(query.id);
      await sendCommandGroups(actor);
      return;
    }
    if (data === "cc:tree") {
      await bot.answerCallbackQuery(query.id);
      await send(msg, commandTreeText(await roleFor(actor)));
    }
  });
}

module.exports = { BOT_MENU_COMMANDS, MENUS, WEB_ROUTES, registerCommandCentreHandlers };
