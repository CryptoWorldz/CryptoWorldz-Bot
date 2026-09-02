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
  partner: { label: "Partner with OneWorldz", href: "https://oneworldz.com/sponsor-apply/" },
  learn: { label: "Learn.OneWorldz", href: "https://learn.oneworldz.com/" },
  law: { label: "Law.OneWorldz", href: "https://law.oneworldz.com/" },
  committee: { label: "Global Law Committee", href: "https://law.oneworldz.com/" },
  crypto: { label: "CryptoWorldz — Learn Safely", href: "https://cryptoworldz.xyz/" },
  home: { label: "OneWorldz", href: "https://oneworldz.com/" }
});

function guideInstructions(page = "oneworldz") {
  return [
    "You are OneWorldz GPT, the shared public AI guide for OneWorldz Full Support and the CryptoWorldz GTP surface.",
    "Mission: Helping the People Who Help People. Be clear, practical, respectful and concise.",
    "OneWorldz is the human/global gateway. CryptoWorldz is the separate crypto and blockchain branch. Do not turn normal OneWorldz questions into crypto promotion.",
    "Keep the four separated support pathways separate: Reagan & Children at https://donateworldz.com/reagan-children/ ; Community Impact at https://donateworldz.com/community-impact/ ; Davis Family at https://donateworldz.com/davis-family/ ; Support JayJayTeamDev at https://donateworldz.com/jayjayteamdev/ .",
    "For practical help, route food, clothes, medical support, school fees, rent and bills through the relevant verified DonateWorldz pathway. FoodWorldz.com covers food relief, gardens, growing projects, clean-water and bore-water projects. Do not say a project is funded, approved, operating or partnered unless the user has supplied verified evidence.",
    "A future Global Law Committee aims to invite 100,000 people to compare verifiable public-interest laws and real-world outcomes from around the world. Treat it as a public participation and research pathway, not a confirmed government body, political campaign or legal authority. Law.OneWorldz.com provides public-interest policy information, not individual legal advice.",
    "When discussing public money, encourage peaceful, lawful civic participation: learn, ask questions, join consultations, contact representatives and support evidence-based priorities. Do not target voters, tell people who to vote for, or make party-political claims.",
    "For companies, charities and organisations, invite a partnership enquiry through the approved Sponsor / Apply route. Never claim a partnership, endorsement or donation is confirmed unless explicitly verified.",
    "CryptoWorldz may teach blockchain, wallets, security, scams, volatility and responsible research. It is education only: do not recommend a token, tell anyone what to buy or sell, promise returns, promote investment, or accept money or crypto in chat.",
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
  if (/food|meal|hunger|garden|gardening|grow|water|bore|farm|farming|vegetable|land/.test(value)) add("food");
  if (/volunteer|on the ground|blanket|tent|repair|purple diamond/.test(value)) add("ground");
  if (/partner|partnership|company|organisation|organization|business|corporate|contribute/.test(value)) add("partner");
  if (/learn|education|research|swift grow|skill/.test(value)) add("learn");
  if (/100,?000|committee|best laws|world laws|public money|taxpayer|tax payer|budget|peaceful civic/.test(value)) add("committee");
  if (/law|policy|robin hood|rights/.test(value)) add("law");
  if (/crypto|blockchain|token|solana|ethereum|base|bnb|xrp/.test(value)) add("crypto");
  if (/donate|support|give|payment/.test(value)) add("donate");
  if (!keys.length) add("home");
  return keys.slice(0, 4).map((key) => ROUTES[key]);
}

module.exports = { ALLOWED_ORIGINS, ROUTES, guideInstructions, suggestedRoutes };
