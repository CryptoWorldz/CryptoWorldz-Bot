const REAGAN_URL = "https://donateworldz.com/reagan-children/";
const COMMUNITY_URL = "https://donateworldz.com/community-impact/";
const JAYJAY_URL = "https://donateworldz.com/support-jayjayteamdev/";

function registerCurrentImpactHandlers({ bot }) {
  bot.onText(/^\/(?:impact|donate)(?:@\w+)?$/i, (msg) => bot.sendMessage(
    msg.chat.id,
    "💜 OneWorldz Support Paths\n\nChoose the exact purpose you want to support. Each purpose stays separate and uses its own current DonateWorldz page.\n\nLegend Points are never purchased by donations.",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "💜 Reagan & Children", url: REAGAN_URL }],
          [{ text: "🌍 Community Impact", url: COMMUNITY_URL }],
          [{ text: "🛠 Support JayJayTeamDev", url: JAYJAY_URL }]
        ]
      }
    }
  ));
}

module.exports = { COMMUNITY_URL, JAYJAY_URL, REAGAN_URL, registerCurrentImpactHandlers };
