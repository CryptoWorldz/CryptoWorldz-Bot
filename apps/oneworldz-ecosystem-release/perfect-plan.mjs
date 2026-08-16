export const perfectPlan = Object.freeze({
  release: "oneworldz-perfect-plan-2026-08-16",
  authority: "OneWorldz_Locked_Master_Build_Specification_APPROVED + latest JayJayTeamDev direction",
  motto: "OneWorldz One Vision",
  mission: "Helping the People Who Help People",
  structure: Object.freeze({
    ecosystemDestinations: 19,
    staticBuildTargets: 18,
    protectedApplications: 1,
    protected: ["cryptobotz.cryptoworldz.xyz"],
    excluded: ["solworld.fun"]
  }),
  separation: Object.freeze({
    oneworldz: "Human/global gateway: people, hope, food, learning, law, support, partnerships, field action and the 2026–2030 Help the People movement.",
    cryptoworldz: "Crypto headquarters only: blockchain Worldz, crypto education, Command Centre, LaunchPad, Based.bid and crypto-specific community systems.",
    commandCentre: "Protected CryptoBotz application. Static website builds must not overwrite its code, authentication, Supabase logic, owner controls or financial execution boundaries."
  }),
  openAI: Object.freeze({
    publicGuideName: "OneWorldz GPT",
    publicGuideSurfaces: ["https://oneworldz.com", "https://donateworldz.com"],
    publicApi: "https://cryptobotz.cryptoworldz.xyz/api/oneworldz-gpt/chat",
    ownerOperations: "OneWorldz Hub Central remains the separate owner-authenticated OpenAI operations planner.",
    apiMode: "OpenAI Responses API, server-side only",
    secretRule: "OPENAI_API_KEY must exist only in protected server environment configuration; never in static site code, browser JavaScript, GitHub content or user-visible responses.",
    donationRule: "OneWorldz GPT may explain and route the three approved support purposes, but it never requests card/bank details and never completes a payment inside chat.",
    safetyRule: "Public prompts are moderated. The guide must not invent partnerships, donation status, tax deductibility, legal advice, medical advice, deployment status or financial execution.",
    cryptoRule: "OneWorldz GPT keeps the human/global OneWorldz experience non-crypto by default and routes crypto-specific questions to CryptoWorldz."
  }),
  oneWorldzPathways: Object.freeze([
    ["On the Ground", "https://purplediamondcrew.com", "People turning support into practical work: food, clothing, water, shelter, gardens and community help."],
    ["DonateWorldz", "https://donateworldz.com", "Three clearly separated support purposes with separate payment destinations and records."],
    ["FoodWorldz", "https://foodworldz.com", "Food relief, community meals, growing food, water, practical projects and measured outcomes."],
    ["Law", "https://law.oneworldz.com", "Public-interest ideas, rights and policy research, including the Robin Hood Law proposal, with clear legal-advice boundaries."],
    ["Learn", "https://learn.oneworldz.com", "Practical learning about food growing, gardening, community action, research, skills and how people can make a difference together."],
    ["Partnerships & Sponsors", "#partnerships", "Business development, sponsors, institutions and local partners supporting transparent real-world outcomes."],
    ["2026–2030 Help the People", "#movement", "A planned march, concert and global participation movement connecting people who can give, learn, travel, volunteer and act."],
    ["CryptoWorldz", "https://cryptoworldz.xyz", "The separate crypto and blockchain branch of the wider ecosystem."]
  ]),
  peopleAndStories: Object.freeze([
    "Reagan / Action Spreads Smiles",
    "Just Knate",
    "Sam Weidenhofer",
    "Dylan Thiry",
    "Victor — The Good Boss",
    "MDMotivator"
  ]),
  supportStreams: Object.freeze([
    ["Reagan & Children", "https://donateworldz.com/reagan-children/"],
    ["Community Impact", "https://donateworldz.com/community-impact/"],
    ["Support JayJayTeamDev", "https://donateworldz.com/jayjayteamdev/"]
  ]),
  proofRules: Object.freeze([
    "No placeholder content in production.",
    "No invented partner, ownership, endorsement, payment, deployment or live-status claim.",
    "No secrets or financial credentials in public code.",
    "Use approved production assets without distortion; no new image generation is required for this plan.",
    "Desktop and mobile routes must both render cleanly with square/rectangular media shells and self-closing navigation.",
    "Every destination must have reciprocal working links and one clear job.",
    "OneWorldz GPT must be present on OneWorldz.com and DonateWorldz.com and call the protected server API only.",
    "OneWorldz GPT must never expose OPENAI_API_KEY or collect card, bank, seed phrase, private key or password data in chat.",
    "The three donation purposes remain separate even when OneWorldz GPT guides a visitor to them.",
    "Backup before production writes; verify after writes; roll back on failed proof.",
    "Protected CryptoBotz remains untouched by the static release except for separately reviewed protected application changes."
  ])
});

if (perfectPlan.structure.ecosystemDestinations !== 19) throw new Error("Perfect Plan must remain 19 destinations");
if (perfectPlan.structure.staticBuildTargets !== 18) throw new Error("Perfect Plan must remain 18 static targets + 1 protected app");
if (perfectPlan.openAI.publicGuideSurfaces.length !== 2) throw new Error("OneWorldz GPT must remain integrated on OneWorldz and DonateWorldz");
