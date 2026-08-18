export const experienceContract = Object.freeze({
  release: "oneworldz-participant-experience-2026-08-19",
  userJourney: Object.freeze([
    "SHILL_LINK_RECOGNISED",
    "LEGEND_REGISTRATION",
    "UNIQUE_COMMAND_CENTRE_SPLASHBACK",
    "AUTHENTICATED_ZED_GUIDE",
    "MISSIONS_ACCESS",
    "RAAIIIDD_CREATOR_TEXT_AND_ARTWORK",
    "HUMAN_ADMIN_REVIEW",
    "VERIFIED_POINTS_AND_REFERRAL_PROGRESS",
    "REAL_WORLD_HERO_EVIDENCE",
    "PUBLIC_HERO_RECOGNITION"
  ]),
  protectedMiniApp: Object.freeze({
    url: "https://cryptobotz.cryptoworldz.xyz/miniapp/",
    theme: "COMMAND_CENTRE_GALAXY_CHROME_NEON",
    splashbackRequired: true,
    systemLeaders: Object.freeze(["ZED", "AUTO", "G.R.A.C.E.", "RECAP", "BASED.BID"]),
    humanLeadershipSeparate: true,
    creatorAutoPublish: false,
    heroAutoPublish: false,
    hourlyHumanReview: true
  }),
  heroes: Object.freeze({
    publicUrl: "https://oneworldz.com/heroes/",
    evidenceMode: "REVIEWABLE_EVIDENCE",
    preExistingRealWorldWorkAllowed: true,
    endorsementMustNotBeInferred: true
  }),
  themes: Object.freeze({
    oneworldz: Object.freeze({ name: "BLUE_WHITE", bg: "#061b37", primary: "#f8fbff", accent: "#52b9ff", accent2: "#ffffff", motif: "humanity-earth-light" }),
    cryptoworldz: Object.freeze({ name: "BLUE_PURPLE_CHROME", bg: "#090415", primary: "#f2efff", accent: "#9c4dff", accent2: "#49e6ff", motif: "command-galaxy-chrome" }),
    purplediamondcrew: Object.freeze({ name: "PURPLE_DIAMOND", bg: "#16051f", primary: "#fff7ff", accent: "#a855f7", accent2: "#e9c7ff", motif: "diamond-hope-chest-action" }),
    impactbased: Object.freeze({ name: "IMPACT_EMERALD_INDIGO", bg: "#071a1d", primary: "#f5fffe", accent: "#39ddb0", accent2: "#7f72ff", motif: "impact-board-purpose" }),
    "law-oneworldz": Object.freeze({ name: "CIVIC_NAVY_GOLD", bg: "#071427", primary: "#f9fbff", accent: "#e9bd55", accent2: "#7cb9ff", motif: "justice-scales-civic" }),
    "learn-oneworldz": Object.freeze({ name: "LEARN_SKY_TEAL", bg: "#071d2b", primary: "#f7fdff", accent: "#48c6e8", accent2: "#65e1b5", motif: "books-growth-knowledge" }),
    foodworldz: Object.freeze({ name: "FOOD_HARVEST_GREEN", bg: "#102014", primary: "#fffdf4", accent: "#78cf6a", accent2: "#efc76a", motif: "food-water-growing-community" }),
    donateworldz: Object.freeze({ name: "DONATE_HEART_VIOLET", bg: "#1b0a1e", primary: "#fff8ff", accent: "#d85ba9", accent2: "#a77cff", motif: "support-heart-clarity" }),
    hodlergalaxy: Object.freeze({ name: "GALAXY_MIDNIGHT_CYAN", bg: "#040918", primary: "#f6f9ff", accent: "#5be3ff", accent2: "#8b65ff", motif: "galaxy-exploration" }),
    hodlerworldz: Object.freeze({ name: "HODLER_GOLD_PURPLE", bg: "#100b19", primary: "#fff9e8", accent: "#f1c75b", accent2: "#9f71ff", motif: "time-horizon-portfolio-learning" })
  })
});

if (experienceContract.protectedMiniApp.systemLeaders.length !== 5) throw new Error("Command Centre must keep five system leaders");
if (experienceContract.protectedMiniApp.creatorAutoPublish !== false) throw new Error("Creator content must remain human-review controlled");
if (experienceContract.heroes.preExistingRealWorldWorkAllowed !== true) throw new Error("Real-world Hero evidence must recognise work done before joining OneWorldz");
