const WEBSITE_COMMANDS = Object.freeze([
  { command: "websites", description: "Explore the CryptoWorldz website network" },
  { command: "solworldz", description: "Open SolWorldz.xyz" }
]);

const PRIMARY_WEBSITES = Object.freeze([
  { label: "🌐 CryptoWorldz.xyz", url: "https://CryptoWorldz.xyz", purpose: "CryptoWorldz main gateway" },
  { label: "🌏 OneWorldz.com", url: "https://OneWorldz.com", purpose: "OneWorldz 🌏 One Vision" },
  { label: "⚡ SolWorldz.xyz", url: "https://SolWorldz.xyz", purpose: "Solana community World" },
  { label: "💜 PurpleDiamondCrew.com", url: "https://PurpleDiamondCrew.com", purpose: "Leaders on the Ground" }
]);

const CONNECTING_WORLDZ = Object.freeze([
  "EthWorldz.xyz",
  "BaseWorldz.xyz",
  "XRPWorldz.xyz",
  "BNBWorldz.xyz",
  "SuiWorldz.xyz",
  "HyperWorldz.xyz",
  "RobinWorldz.xyz",
  "BitWorldz.xyz",
  "HodlerWorldz.xyz"
]);

const HQ_URL = "https://t.me/CryptoWorldzHQ";

function buildWebsiteMessage(config = {}) {
  const url = String(config.websiteUrl || "https://CryptoWorldz.xyz").trim();
  return [
    "🌐 Check This Out — CryptoWorldz.xyz",
    "",
    "Explore the Command Centre, Worldz network, community missions and real-world impact.",
    "",
    url,
    "",
    "Use /websites to explore the full website network."
  ].join("\n");
}

function buildWebsiteDirectoryMessage() {
  const mainRows = PRIMARY_WEBSITES.map((site) => `${site.label}\n${site.purpose}`).join("\n\n");
  return [
    "🌍 CryptoWorldz Website Network",
    "",
    mainRows,
    "",
    "🚧 Worldz Being Connected",
    CONNECTING_WORLDZ.join(" • "),
    "",
    "Unfinished Worldz direct Legends to CryptoWorldz HQ for updates and support."
  ].join("\n");
}

function buildSolWorldzMessage() {
  return [
    "⚡ Welcome to SolWorldz",
    "",
    "The Solana World of the wider CryptoWorldz ecosystem.",
    "",
    "https://SolWorldz.xyz",
    "",
    "🌍 One World • One Mission"
  ].join("\n");
}

function websiteKeyboard(url) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🌐 Open CryptoWorldz.xyz", url }],
        [{ text: "🌍 Explore All Websites", callback_data: "worldz_websites_directory" }],
        [{ text: "💬 Join CryptoWorldz HQ", url: HQ_URL }]
      ]
    }
  };
}

function directoryKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🌐 CryptoWorldz", url: PRIMARY_WEBSITES[0].url },
          { text: "🌏 OneWorldz", url: PRIMARY_WEBSITES[1].url }
        ],
        [
          { text: "⚡ SolWorldz", url: PRIMARY_WEBSITES[2].url },
          { text: "💜 Diamond Crew", url: PRIMARY_WEBSITES[3].url }
        ],
        [{ text: "💬 CryptoWorldz HQ", url: HQ_URL }]
      ]
    }
  };
}

function solWorldzKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "⚡ Open SolWorldz.xyz", url: PRIMARY_WEBSITES[2].url }],
        [{ text: "🌍 Explore All Websites", callback_data: "worldz_websites_directory" }]
      ]
    }
  };
}

function registerWebsiteTelegramHandlers({ bot, config }) {
  const websitePattern = /^\/website(?:@\w+)?$/;

  if (typeof bot.removeTextListener === "function") {
    bot.removeTextListener(websitePattern);
  }

  bot.onText(websitePattern, (msg) => {
    const url = String(config.websiteUrl || "https://CryptoWorldz.xyz").trim();
    return bot.sendMessage(msg.chat.id, buildWebsiteMessage(config), websiteKeyboard(url));
  });

  bot.onText(/^\/websites(?:@\w+)?$/, (msg) =>
    bot.sendMessage(msg.chat.id, buildWebsiteDirectoryMessage(), directoryKeyboard())
  );

  bot.onText(/^\/solworldz(?:@\w+)?$/, (msg) =>
    bot.sendMessage(msg.chat.id, buildSolWorldzMessage(), solWorldzKeyboard())
  );

  bot.on("callback_query", async (query) => {
    if (!query || query.data !== "worldz_websites_directory") return;
    try {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(query.message.chat.id, buildWebsiteDirectoryMessage(), directoryKeyboard());
    } catch (error) {
      console.error("Website directory callback failed", {
        name: error && error.name ? error.name : "Error"
      });
    }
  });
}

module.exports = {
  CONNECTING_WORLDZ,
  PRIMARY_WEBSITES,
  WEBSITE_COMMANDS,
  buildSolWorldzMessage,
  buildWebsiteDirectoryMessage,
  buildWebsiteMessage,
  directoryKeyboard,
  registerWebsiteTelegramHandlers,
  solWorldzKeyboard,
  websiteKeyboard
};
