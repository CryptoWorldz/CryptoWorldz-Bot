const ALLOWED_ORIGINS = new Set([
  "https://oneworldz.com",
  "https://www.oneworldz.com",
  "https://cryptoworldz.xyz",
  "https://www.cryptoworldz.xyz",
  "https://donateworldz.com",
  "https://www.donateworldz.com",
  "https://foodworldz.com",
  "https://www.foodworldz.com",
  "https://learn.oneworldz.com",
  "https://law.oneworldz.com",
  "https://purplediamondcrew.com",
  "https://www.purplediamondcrew.com"
]);

const ROUTES = Object.freeze({
  reagan: { label: "Reagan & Children", href: "https://donateworldz.com/reagan-children/" },
  community: { label: "Community Impact", href: "https://donateworldz.com/community-impact/" },
  davis: { label: "Davis Family", href: "https://donateworldz.com/davis-family/" },
  jayjay: { label: "Support JayJayTeamDev", href: "https://donateworldz.com/jayjayteamdev/" },
  donate: { label: "DonateWorldz", href: "https://donateworldz.com/" },
  food: { label: "FoodWorldz", href: "https://foodworldz.com/" },
  ground: { label: "Purple Diamond Crew — On the Ground", href: "https://purplediamondcrew.com/" },
  learn: { label: "Learn.OneWorldz", href: "https://learn.oneworldz.com/" },
  law: { label: "Law.OneWorldz", href: "https://law.oneworldz.com/" },
  crypto: { label: "CryptoWorldz", href: "https://cryptoworldz.xyz/" },
  home: { label: "OneWorldz", href: "https://oneworldz.com/" }
});

function guideInstructions(page = "oneworldz") {
  return [
    "You are OneWorldz GPT, the shared public AI guide for OneWorldz Full Support and the CryptoWorldz GTP surface.",
    "Mission: Helping the People Who Help People. Be clear, practical, respectful and concise.",
    "OneWorldz is the human/global gateway. CryptoWorldz is the separate crypto and blockchain branch. Do not turn normal OneWorldz questions into crypto promotion.",
    "Keep the four separated support pathways separate: Reagan & Children at https://donateworldz.com/reagan-children/ ; Community Impact at https://donateworldz.com/community-impact/ ; Davis Family at https://donateworldz.com/davis-family/ ; Support JayJayTeamDev at https://donateworldz.com/jayjayteamdev/ .",
    "PurpleDiamondCrew.com is On the Ground action. FoodWorldz.com covers food relief, growing, water and food-system projects. Learn.OneWorldz.com covers practical learning and research. Law.OneWorldz.com is public-interest policy information and not individual legal advice.",
    "The 2026–2030 Help the People movement is a planned march, concert and participation movement. Never invent a confirmed event, sponsor, partner, donation, deployment status or endorsement.",
    "Never ask for card numbers, bank details, passwords, API keys, wallet seed phrases or private keys. Payments happen only on approved DonateWorldz/Stripe pages, never in chat.",
    "Do not claim tax deductibility or completed fund transfers unless explicitly verified. Do not give individual legal, medical or financial advice.",
    "When useful, finish with one short next action.",
    `Current website surface: ${String(page || "oneworldz").slice(0, 80)}.`
  ].join(" ");
}

function suggestedRoutes(text = "") {
  const value = String(text).toLowerCase();
  const keys = [];
  const add = (key) => { if (!keys.includes(key)) keys.push(key); };

  if (/reagan|uganda|action spreads smiles|children|orphan/.test(value)) add("reagan");
  if (/community impact|community support|35 causes|community cause/.test(value)) add("community");
  if (/davis family/.test(value)) add("davis");
  if (/jayjay|teamdev|developer support|support the build/.test(value)) add("jayjay");
  if (/food|meal|hunger|garden|gardening|grow|water/.test(value)) add("food");
  if (/volunteer|on the ground|blanket|tent|repair|purple diamond/.test(value)) add("ground");
  if (/learn|education|research|swift grow|skill/.test(value)) add("learn");
  if (/law|policy|robin hood|rights/.test(value)) add("law");
  if (/crypto|blockchain|token|solana|ethereum|base|bnb|xrp/.test(value)) add("crypto");
  if (/donate|support|give|payment/.test(value)) add("donate");
  if (!keys.length) add("home");
  return keys.slice(0, 4).map((key) => ROUTES[key]);
}

module.exports = { ALLOWED_ORIGINS, ROUTES, guideInstructions, suggestedRoutes };
