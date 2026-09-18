const WEBSITE_COMMANDS = Object.freeze([
  { command: "websites", description: "Explore the CryptoWorldz website network" },
  { command: "worldzlive", description: "Open the verified live Worldz directory" },
  { command: "solworldz", description: "Open SolWorldz.xyz" }
]);

const RELEASE_BUILD = "b4950719f1280511b17dfa36d7835366404d3bfc";
const RELEASE_ROOT = `https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/${RELEASE_BUILD}/apps/cryptoworldz-web-core`;
const LIVE_DIRECTORY_URL = `${RELEASE_ROOT}/live.html`;

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
    "Use /websites for the full network or /worldzlive for the verified working backup."
  ].join("\n");
}

function buildWebsiteDirectoryMessage() {
  const mainRows = PRIMARY_WEBSITES.map((site) => `${site.label}\n${site.purpose}`).join("\n\n");
  return [
    "🌍 CryptoWorldz Website Network",
    "",
    mainRows,
    "",
    "✅ Verified Live Directory",
    "All 18 Worldz routes, shared visuals and website images are available through /worldzlive while final custom-domain deployment completes.",
    "",
    "🚧 Custom Domains Being Connected",
    CONNECTING_WORLDZ.join(" • "),
    "",
    "Use the live directory whenever a custom domain is still updating."
  ].join("\n");
}

function buildLiveDirectoryMessage() {
  return [
    "✅ Worldz Live Directory",
    "",
    "18 verified browser routes are online from the pinned public release package.",
    "",
    "Includes OneWorldz, JayJayTeamDev, CryptoWorldz, Purple Diamond Crew, SolWorldz, every blockchain World, ImpactBased, Robin Hood Law and LearnWorldz.",
    "",
    `Build: ${RELEASE_BUILD.slice(0, 12)}`,
    "",
    "This public fallback never requests seed phrases, private keys or wallet-signing credentials."
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
    "If the custom domain is updating, open /worldzlive.",
    "",
    "🌍 One World • One Mission"
  ].join("\n");
}

function websiteKeyboard(url) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🌐 Open CryptoWorldz.xyz", url }],
        [{ text: "✅ Verified Live Directory", url: LIVE_DIRECTORY_URL }],
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
        [{ text: "✅ Open All 18 Live Worldz", url: LIVE_DIRECTORY_URL }],
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

function liveDirectoryKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Open Worldz Live Directory", url: LIVE_DIRECTORY_URL }],
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
        [{ text: "✅ Verified Live Directory", url: LIVE_DIRECTORY_URL }],
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

  bot.onText(/^\/worldzlive(?:@\w+)?$/, (msg) =>
    bot.sendMessage(msg.chat.id, buildLiveDirectoryMessage(), liveDirectoryKeyboard())
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
  LIVE_DIRECTORY_URL,
  PRIMARY_WEBSITES,
  RELEASE_BUILD,
  WEBSITE_COMMANDS,
  buildLiveDirectoryMessage,
  buildSolWorldzMessage,
  buildWebsiteDirectoryMessage,
  buildWebsiteMessage,
  directoryKeyboard,
  liveDirectoryKeyboard,
  registerWebsiteTelegramHandlers,
  solWorldzKeyboard,
  websiteKeyboard
};
