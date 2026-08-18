export const jayJayLaunchContract = Object.freeze({
  authority: "JayJayTeamDev ChatGPT launch requirements",
  oneWorldz: Object.freeze({
    motto: "OneWorldz 🌐 One Vision",
    role: "Human/global gateway",
    marketsAllowed: false,
    tradingInterfaceAllowed: false,
    walletPortfolioAllowed: false,
    sponsorApplyRoute: "/sponsor-apply/"
  }),
  cryptoWorldz: Object.freeze({
    role: "Crypto headquarters",
    marketsRoute: "/markets/",
    applyRoute: "/apply/",
    protectedWalletEntry: "https://cryptobotz.cryptoworldz.xyz/miniapp/",
    protectedCommandCentre: "https://cryptobotz.cryptoworldz.xyz/"
  }),
  socials: Object.freeze({
    oneWorldzX: Object.freeze({ label: "@OneWorldzX", url: "https://x.com/OneWorldzX" }),
    oneWorldzTelegram: Object.freeze({ label: "OneWorldz Telegram", url: "https://t.me/OneWorldzTG" }),
    cryptoWorldzX: Object.freeze({ label: "@CryptoWorldzX", url: "https://x.com/CryptoWorldzX" }),
    zedBot: Object.freeze({ label: "@CryptoWorldzBot", url: "https://t.me/CryptoWorldzBot" }),
    raaiiiddTeam: Object.freeze({ label: "CryptoWorldz Raaiiidd Team", url: "https://t.me/CryptoWorldzRaaiiiddTeam" })
  }),
  worldDex: Object.freeze({
    route: "/dex/",
    rule: "Every Blockchain World has a dedicated DEX Chart route. Token switching is shown only for token addresses already verified in the build; the site must never invent a market address.",
    execution: false
  }),
  support: Object.freeze({
    goFundMeAllowed: false,
    separatedPurposesRequired: true
  }),
  production: Object.freeze({
    acknowledgementsLast: true,
    comingSoonAllowed: false,
    placeholderAllowed: false,
    desktopMobileProofEverySitemapPage: true,
    reciprocalLinksRequired: true
  })
});

export const launchSocialList = Object.freeze(Object.values(jayJayLaunchContract.socials));
