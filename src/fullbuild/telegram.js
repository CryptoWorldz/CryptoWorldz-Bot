"use strict";

const { summary } = require("./core");

function registerFullBuildTelegramHandlers({ bot }) {
  bot.onText(/^\/worldzfullbuild(?:@\w+)?$/, (msg) => {
    const build = summary();
    return bot.sendMessage(msg.chat.id, [
      "🌐 WORLDZFULLBUILD™ — MASTER BUILD",
      "",
      "ZED LED Command Centre MAX™ is the command layer.",
      "WorldzLaunchPad™ builds.",
      "Worldz Omnichain™ routes chain-native execution.",
      "WorldzFullScope™ watches, prepares, locks, vests, alerts and proves.",
      "AUTO handles controlled finance workflows.",
      "G.R.A.C.E. coordinates approved communications.",
      "RECAP explains reviewed knowledge.",
      "WorldzProof™ records evidence.",
      "",
      `FullScope capacity: ${build.chainCount} chains × ${build.tokenSlotsPerChain} tokens = ${build.initialTokenEnvironmentCapacity} initial token environments.`,
      "",
      "🗳️ Worldz Votes Centre™ = POPULARITY ONLY",
      "🏛️ WorldzGovern™ = DAO GOVERNANCE ONLY",
      "",
      "Commands:",
      "/fullscope • /worldzvotes • /worldzgovern",
      "",
      "Release rule: no one chain or module unlocks the whole build. Each executable adapter must independently pass its proof gates before mainnet release."
    ].join("\n"));
  });
}

module.exports = { registerFullBuildTelegramHandlers };
