const { groupsForRole, normalizeRole } = require("./command-registry");

const BOT_MENU_COMMANDS = [
  { command: "zedstart", description: "Open the Zed Command Centre" },
  { command: "zed", description: "Zed profile, wallet, missions and settings" },
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
      ["🚀 Missions", "/missions"],
      ["🏆 Leaderboard", "/leaderboard"],
      ["📚 All Commands", "/commands"]
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
  directory: "https://oneworldz.com/directory/",
  acknowledgements: "https://oneworldz.com/acknowledgements/",
  supportJay: "https://donateworldz.com/support-jayjayteamdev/",
  donateReagan: "https://donateworldz.com/reagan-children/",
  publicCommands: "https://cryptoworldz.xyz/command-centre/commands/"
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

function registerCommandCentreHandlers({ bot, repository, config }) {
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

  async function sendCommandGroups(msg, forcedRole = null) {
    const role = forcedRole || await roleFor(msg);
    const groups = groupsForRole(role);
    await send(msg, `📚 COMMAND CENTRE — ${normalizeRole(role).toUpperCase()} ACCESS\n\n${groups.reduce((sum, group) => sum + group.commands.length, 0)} registered commands across ${groups.length} sections.`);
    for (const group of groups) await send(msg, groupText(group));
  }

  const openHome = (msg) => send(msg, [
    "🌐 CryptoWorldz Command Centre",
    "",
    "ONE START POINT • FULL STRUCTURAL TREE",
    "ZED, AUTO, G.R.A.C.E., Admin, websites and role-based commands are connected here.",
    "",
    "Gateway commands:",
    "/zedstart • /commands • /commandtree • /directory • /acknowledgements • /supportjay",
    "",
    "You do not need to memorise the full command list."
  ].join("\n"), mainKeyboard());

  bot.onText(/^\/zedstart(?:@\w+)?$/, openHome);
  bot.onText(/^\/zed(?:@\w+)?$/, (msg) => send(msg, menuText(MENUS.zed)));
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
    return send(msg, menuText(MENUS.settings));
  });

  bot.onText(/^\/commands(?:@\w+)?$/, (msg) => sendCommandGroups(msg));
  bot.onText(/^\/ownercommands(?:@\w+)?$/, async (msg) => {
    if (!isOwner(msg)) return send(msg, "⛔ Owner access required.");
    return sendCommandGroups(msg, "owner");
  });
  bot.onText(/^\/commandtree(?:@\w+)?$/, async (msg) => send(msg, commandTreeText(await roleFor(msg))));

  bot.onText(/^\/directory(?:@\w+)?$/, (msg) => send(msg, `🌐 Directory@OneWorldz\n${WEB_ROUTES.directory}`));
  bot.onText(/^\/acknowledgements?(?:@\w+)?$/i, (msg) => send(msg, `💜 Acknowledgements@OneWorldz\n${WEB_ROUTES.acknowledgements}`));
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
    "/zedstart — open the Command Centre",
    "/commands — every command available to your role",
    "/commandtree — command sections and structure",
    "/directory — public OneWorldz site/page directory",
    "/acknowledgements — exact Acknowledgements page",
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

    const menuMatch = data.match(/^cc:menu:(zed|auto|grace|admin|settings)$/);
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
