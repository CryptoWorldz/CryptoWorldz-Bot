const same = (path, shape = "landscape", fit = "contain", position = "center") => Object.freeze({
  desktop: path,
  mobile: path,
  shape,
  fit,
  position
});

const pair = (desktop, mobile, shape = "landscape", fit = "contain", position = "center") => Object.freeze({
  desktop,
  mobile,
  shape,
  fit,
  position
});

export const visuals = Object.freeze({
  "oneworldz-master": same("/assets/desktop/oneworldz/oneworldz-master.png", "landscape"),
  "oneworldz-gpt": same("/assets/desktop/oneworldz/oneworldz-gpt.png", "landscape"),
  "little-legend": pair("/assets/desktop/oneworldz/little-legend.png", "/assets/mobile/little-legend.webp", "portrait"),
  "reagan-kauja": same("/assets/desktop/oneworldz/reagan-kauja.png", "square"),
  "hope-chest": pair("/assets/desktop/oneworldz/hope-chest.png", "/assets/mobile/hope-chest.webp", "portrait"),

  "crypto-zed": same("/assets/desktop/cryptoworldz/zed-command-centre.png", "square"),
  "command-centre-five": pair("/assets/desktop/cryptoworldz/command-centre-five.png", "/assets/mobile/five-leaders-master.webp", "landscape"),
  "human-leader-team": pair("/assets/desktop/cryptoworldz/command-centre-leader-team.png", "/assets/mobile/leader-team.webp", "square"),
  "zed-auto": same("/assets/desktop/cryptoworldz/zed-auto.png", "landscape"),
  "grace": same("/assets/desktop/cryptoworldz/grace.png", "square"),
  "zed-grace-auto": same("/assets/mobile/zed-grace-auto.webp", "square"),
  "impactbased": pair("/assets/desktop/cryptoworldz/impactbased.png", "/assets/mobile/impactbased-square.webp", "square"),
  "basedbid-partnership": pair("/assets/desktop/cryptoworldz/cryptoworldz-basedbid.webp", "/assets/mobile/cryptoworldz-basedbid-partnership.webp", "landscape"),
  "we-need-you": same("/assets/desktop/cryptoworldz/we-need-you.png", "wide"),

  "world-bit": pair("/assets/desktop/blockchains/bitworldz.png", "/assets/mobile/bitworldz.webp", "wide"),
  "world-sol": pair("/assets/desktop/blockchains/solworldz.png", "/assets/mobile/solworldz.webp", "wide"),
  "world-eth": pair("/assets/desktop/blockchains/ethworldz.png", "/assets/mobile/ethworldz.webp", "wide"),
  "world-base": pair("/assets/desktop/blockchains/baseworldz.png", "/assets/mobile/baseworldz.webp", "wide"),
  "world-bnb": pair("/assets/desktop/blockchains/bnbworldz.png", "/assets/mobile/bnbworldz.webp", "wide"),
  "world-xrp": pair("/assets/desktop/blockchains/xrpworldz.png", "/assets/mobile/xrpworldz.webp", "wide"),
  "world-sui": pair("/assets/desktop/blockchains/suiworldz.png", "/assets/mobile/suiworldz.webp", "wide"),
  "world-hyper": pair("/assets/desktop/blockchains/hyperworldz.png", "/assets/mobile/hyperworldz.webp", "wide"),
  "world-robin": pair("/assets/desktop/blockchains/robinworldz.png", "/assets/mobile/robinworldz.webp", "wide"),
  "world-hodler": pair("/assets/desktop/tokens/next-big-coin.png", "/assets/mobile/next-big-coin.webp", "square"),

  "recover-your-debt": same("/assets/desktop/tokens/recover-your-debt.png", "square"),
  "uganda-unite": pair("/assets/desktop/tokens/uganda-unite.png", "/assets/mobile/uganda-unite.webp", "square"),
  "robin-hood-law": pair("/assets/desktop/tokens/robin-hood-law.png", "/assets/mobile/robin-hood-law.webp", "square"),
  "global-impact-alliance": pair("/assets/desktop/tokens/global-impact-alliance.png", "/assets/mobile/global-impact-alliance.webp", "square"),
  "next-big-coin": pair("/assets/desktop/tokens/next-big-coin.png", "/assets/mobile/next-big-coin.webp", "square"),
  "solmars": pair("/assets/desktop/tokens/solmars.png", "/assets/mobile/solmars.webp", "square"),
  "solbud": same("/assets/desktop/tokens/solbud.png", "square"),
  "soltoken": pair("/assets/desktop/tokens/soltoken.png", "/assets/mobile/soltoken.webp", "square"),
  "black-bud-bull": same("/assets/mobile/black-bud-bull.webp", "square"),

  "pdc-action-team": same("/assets/desktop/purple-diamond-crew/action-team.png", "square"),
  "pdc-banner": same("/assets/desktop/purple-diamond-crew/banner.png", "wide"),
  "pdc-hope-chest": pair("/assets/desktop/purple-diamond-crew/hope-chest.png", "/assets/mobile/hope-chest.webp", "portrait"),
  "humanitarian-action": same("/assets/desktop/humanitarian/action-creates-smiles-banner.png", "wide"),

  "support-reagan": pair("/assets/support/desktop/reagan-children-emblem-desktop.webp", "/assets/support/mobile/reagan-children-emblem-mobile.webp", "square"),
  "support-community": pair("/assets/support/desktop/community-impact-emblem-desktop.webp", "/assets/support/mobile/community-impact-emblem-mobile.webp", "square"),
  "support-jayjay": pair("/assets/support/desktop/jayjayteamdev-emblem-desktop.webp", "/assets/support/mobile/jayjayteamdev-emblem-mobile.webp", "square")
});

export const chainVisualByTarget = Object.freeze({
  solworldz: "world-sol",
  ethworldz: "world-eth",
  baseworldz: "world-base",
  bnbworldz: "world-bnb",
  xrpworldz: "world-xrp",
  suiworldz: "world-sui",
  hyperworldz: "world-hyper",
  robinworldz: "world-robin",
  hodlerworldz: "world-hodler"
});

export const rootHeroByTarget = Object.freeze({
  oneworldz: "oneworldz-master",
  cryptoworldz: "crypto-zed",
  solworldz: "world-sol",
  ethworldz: "world-eth",
  baseworldz: "world-base",
  bnbworldz: "world-bnb",
  xrpworldz: "world-xrp",
  suiworldz: "world-sui",
  hyperworldz: "world-hyper",
  robinworldz: "world-robin",
  hodlerworldz: "world-hodler",
  purplediamondcrew: "pdc-banner",
  impactbased: "impactbased",
  "law-oneworldz": "robin-hood-law",
  "learn-oneworldz": "oneworldz-gpt",
  hodlergalaxy: "we-need-you",
  foodworldz: "humanitarian-action",
  donateworldz: "oneworldz-master"
});

export const exactAltVisual = Object.freeze({
  "OneWorldz GPT": "oneworldz-gpt",
  "Approved CryptoWorldz headquarters production artwork": "crypto-zed",
  "Approved CryptoWorldz builder and alliance production artwork": "we-need-you",
  "The five approved CryptoWorldz system leaders": "command-centre-five",
  "Approved separately labelled human leadership artwork": "human-leader-team",
  "Approved ZED G.R.A.C.E. and AUTO production artwork": "zed-grace-auto",
  "Approved CryptoWorldz and Based.bid partnership production artwork": "basedbid-partnership",
  "Approved ImpactBased desktop and mobile production artwork": "impactbased",
  "Approved CryptoWorldz and Based.bid pathway artwork": "basedbid-partnership",
  "Approved Robin Hood Law production artwork": "robin-hood-law",
  "Approved OneWorldz learning production artwork": "oneworldz-gpt",
  "Approved Purple Diamond Crew Hope Chest production artwork": "pdc-banner",
  "Approved Purple Diamond Crew action team production artwork": "pdc-action-team",
  "FoodWorldz humanitarian support pathway": "humanitarian-action",
  "DonateWorldz central support gateway": "oneworldz-master",
  "HodlerGalaxy ecosystem discovery gateway": "we-need-you",
  "Purple Diamond Crew on-the-ground action preview": "pdc-action-team",
  "DonateWorldz support preview": "oneworldz-master",
  "FoodWorldz humanitarian action preview": "humanitarian-action",
  "Law.OneWorldz preview": "robin-hood-law",
  "Learn.OneWorldz preview": "oneworldz-gpt",
  "OneWorldz partnerships and sponsors preview": "oneworldz-master",
  "2026 to 2030 Help the People movement preview": "humanitarian-action",
  "CryptoWorldz preview": "crypto-zed",
  "OneWorldz Community Support humanitarian action": "humanitarian-action"
});

const pathVisual = new Map();
for (const [key, visual] of Object.entries(visuals)) {
  for (const path of [visual.desktop, visual.mobile]) {
    if (!pathVisual.has(path)) pathVisual.set(path, key);
  }
}

export function visualForExactPath(path) {
  return pathVisual.get(path) || null;
}

export function squareVariant(key) {
  if (key.startsWith("world-") && key !== "world-hodler") {
    const visual = visuals[key];
    return Object.freeze({
      key: `${key}-square`,
      desktop: visual.mobile,
      mobile: visual.mobile,
      shape: "square",
      fit: "contain",
      position: "center"
    });
  }
  if (key === "pdc-banner") {
    const visual = visuals["pdc-action-team"];
    return Object.freeze({ key: "pdc-action-team", ...visual, shape: "square", fit: "contain" });
  }
  const visual = visuals[key];
  return visual ? Object.freeze({ key, ...visual, shape: "square", fit: "contain" }) : null;
}

export function resolvedVisual(key, slot) {
  const visual = visuals[key];
  if (!visual) throw new Error(`Unknown visual key: ${key}`);
  if (["brand", "profile", "support-emblem", "support-profile"].includes(slot)) {
    return squareVariant(key);
  }
  return Object.freeze({ key, ...visual });
}
