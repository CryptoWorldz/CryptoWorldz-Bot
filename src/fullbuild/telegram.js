"use strict";

const { summary } = require("./core");

function registerFullBuildTelegramHandlers({ bot }) {
  bot.onText(/^\/worldzfullbuild(?:@\w+)?$/, (msg) => {
    const build = summary();
    return bot.sendMessage(msg.chat.id, [
      "🌐 WORLDZFULLBUILD™ — MASTER BUILD",
      "",
      "ZED LED Command Centre MAX™ leads the complete Worldz architecture.",
      "WorldzLaunchPad™ builds.",
      "Worldz Omnichain™ routes chain-native execution.",
      "WorldzFullScope™ watches, prepares, locks, vests, alerts and proves.",
      "AUTO handles controlled finance workflows.",
      "G.R.A.C.E. coordinates approved communications.",
      "RECAP explains reviewed knowledge.",
      "WorldzProof™ records evidence.",
      "",
      `FullScope is REQUIRED: ${build.chainCount} chains × ${build.tokensPerChain} tokens = ${build.capacity} initial token environments.`,
      "",
      "🗳️ Worldz Votes Centre™ = POPULARITY ONLY",
      "🏛️ WorldzGovern™ = DAO GOVERNANCE ONLY",
      "",
      "/fullscope • /worldzvotes • /worldzgovern",
      "",
      "Release rule: no single module or chain unlocks the entire build. Each executable adapter keeps its own proof and approval gate."
    ].join("\n"));
  });
}

module.exports = { registerFullBuildTelegramHandlers };
