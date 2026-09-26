"use strict";

const { summary } = require("./core");

function registerFullBuildTelegramHandlers({ bot }) {
  bot.onText(/^\/worldzfullbuild(?:@\w+)?$/, (msg) => {
    const build = summary();
    return bot.sendMessage(msg.chat.id, [
      "🌐 WORLDZFULLBUILD™ — MASTER BUILD",
      "",
      "Whole-project inheritance: ACTIVE",
      `FullScope: ${build.chains} chains × ${build.tokenSlotsPerChain} token slots = ${build.environments} initial environments.`,
      "",
      "001 WORLDZ • WLDZ • 100M",
      "002 REVIVE • RVIV • 200M",
      "003 PHENIX • PNEX • 250M",
      "004 MIRACLE • MRCL • 348M",
      "",
      "ZED leads • WorldzLaunchPad builds • Omnichain routes • FullScope watches/prepares/proves • AUTO controls finance • G.R.A.C.E. coordinates approved communications • RECAP explains reviewed activity.",
      "",
      "🗳️ Worldz Votes Centre™ = POPULARITY ONLY",
      "🏛️ WorldzGovern™ = DAO GOVERNANCE ONLY",
      "",
      "Direct links:",
      "🌍 OneWorldz — https://oneworldz.com/",
      "💜 DonateWorldz — https://donateworldz.com/",
      "🌐 CryptoWorldz — https://cryptoworldz.xyz/",
      "🚀 WorldzLaunchPad — https://launchpad.cryptoworldz.xyz/",
      "🧭 FullBuild — https://launchpad.cryptoworldz.xyz/fullbuild/",
      "📡 FullScope — https://launchpad.cryptoworldz.xyz/fullscope/",
      "🔗 WorldzLinkz — https://cryptoworldz.xyz/worldzlinkz/",
      "",
      "Release truth: each chain/module must independently pass its wallet, simulation, routing and WorldzProof gates. Mainnet execution is not globally enabled."
    ].join("\n"));
  });
}

module.exports = { registerFullBuildTelegramHandlers };
