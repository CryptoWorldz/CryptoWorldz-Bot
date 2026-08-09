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
      ["⚙️ Settings", "/zedsettings"]
    ]
  },
  auto: {
    title: "💎 AUTO",
    rows: [
      ["📊 Status", "/auto"],
      ["🧪 Simulation", "/autosimulate"],
      ["📅 DCA", "/autodca"],
      ["⏸ Pause", "/autopause"],
      ["🛑 Emergency Stop", "/autostop"]
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
      ["👥 Users & Roles", "/execs"],
      ["🎯 Missions", "/missionadmin"],
      ["📣 Broadcast", "/broadcast"],
      ["📜 Audit", "/worklog"],
      ["⚙️ Settings", "/zedsettings"]
    ]
  },
  admingrace: {
    title: "🛡 GRACE ADMIN",
    rows: [
      ["👥 Grace Admins", "/graceadmins"],
      ["📱 Social Accounts", "/accounts"],
      ["🔐 Permissions", "/gracepermissions"],
      ["✅ Approval Rules", "/secretary"],
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
      ["🛡 Grace Admin", "/admingrace"]
    ]
  }
};

function menuText(menu) {
  return [
    menu.title,
    "",
    ...menu.rows.map(([label, command]) => `${label} — ${command}`),
    "",
    "Use the gateway command whenever you forget the longer command list."
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
        [{ text: "⚙️ SETTINGS", callback_data: "cc:menu:settings" }]
      ]
    }
  };
}

function registerCommandCentreHandlers({ bot, repository, config }) {
  const send = (msg, text, options) => bot.sendMessage(msg.chat.id, text, options);
  const isOwner = (msg) => String(msg.from?.id || "") === String(config.ownerTelegramId || "");
  const isAdmin = async (msg) => {
    if (isOwner(msg)) return true;
    return repository.isManagedAdmin(
      msg.from.id,
      config.adminTelegramIds,
      config.ownerTelegramId
    );
  };

  const openHome = (msg) => send(msg, [
    "🌐 CryptoWorldz Command Centre",
    "",
    "ONE SIMPLE START POINT",
    "Choose Zed, Auto, Grace, Admin or Settings below.",
    "",
    "Main gateway commands:",
    "/zedstart • /zed • /auto • /grace • /admin • /admingrace • /zedsettings • /help"
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
  bot.onText(/^\/help(?:@\w+)?$/, (msg) => send(msg, [
    "📘 SIMPLE COMMAND GUIDE",
    "",
    "/zedstart — everything starts here",
    "/zed — profile, wallet, missions, leaderboard, settings",
    "/auto — Auto finance controls",
    "/grace — Grace Auto Post™",
    "/admin — Admin controls",
    "/admingrace — Grace permissions and safety",
    "/zedsettings — Command Centre settings",
    "",
    "Advanced commands still work, but you do not need to memorise them."
  ].join("\n")));

  bot.on("callback_query", async (query) => {
    const match = String(query.data || "").match(/^cc:menu:(zed|auto|grace|admin|settings)$/);
    if (!match) return;
    const msg = query.message;
    const actor = { ...msg, from: query.from };
    const key = match[1];
    if (["grace", "admin", "settings"].includes(key) && !(await isAdmin(actor))) {
      await bot.answerCallbackQuery(query.id, { text: "Admin access required", show_alert: true });
      return;
    }
    await bot.answerCallbackQuery(query.id);
    await send(msg, menuText(MENUS[key]));
  });
}

module.exports = { BOT_MENU_COMMANDS, MENUS, registerCommandCentreHandlers };
