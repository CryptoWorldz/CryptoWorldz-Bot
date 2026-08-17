import { autoControlPolicy, links, officialDirectory, supportDirectory } from "./site-data.mjs";

export const perfectPlan = Object.freeze({
  release: "oneworldz-perfect-plan-2026-08-17",
  authority: "OneWorldz_Locked_Master_Build_Specification_APPROVED + JayJayTeamDev TOTAL DEPLOYMENT PLAN",
  motto: "OneWorldz One Vision",
  mission: "Helping the People Who Help People",
  footerContract: Object.freeze({
    line1: "Created with the Vision",
    line2: "When Someone say's You can't Change the World 🌐 just Say “Why can't I?”",
    retiredCredits: Object.freeze(["Created by JayJayTeamDev", "Designed by JayJayTeamDev"]),
    rule: "Every public static HTML page uses this exact two-line footer. No creator/designer attribution may replace or compete with it."
  }),
  advertisingContract: Object.freeze({
    strategy: "ONEWORLDZ_SINGLE_ACTION",
    visual: "Approved OneWorldz visual",
    phrase: "When Someone say's You can't Change the World 🌐 just Say “Why can't I?”",
    ctaLabel: "OneWorldz.com",
    ctaUrl: links.oneworldz,
    primaryActions: 1,
    rule: "Advertising stays deliberately simple: one approved OneWorldz visual, the locked phrase and one clear button to OneWorldz.com. No competing primary CTA or alternate destination."
  }),
  brandContract: Object.freeze({
    oneworldz: Object.freeze({ theme: "BLUE_WHITE", background: "deep blue", primary: "white", accent: "sky blue", rule: "OneWorldz stays human-first and visually blue/white." }),
    cryptoworldz: Object.freeze({ theme: "BLUE_PURPLE", background: "deep blue-purple", primary: "electric blue-purple", accent: "silver/white", rule: "CryptoWorldz is visibly separate from Purple Diamond Crew." }),
    purplediamondcrew: Object.freeze({ theme: "PURPLE_DIAMOND", background: "deep purple", primary: "purple", accent: "diamond lavender", rule: "Purple Diamond Crew keeps its own unmistakable purple identity." }),
    blockchainWorldz: Object.freeze({
      rule: "Each Blockchain World must use its own approved profile/hero image and its chain-specific accent pair from site-data.mjs. No cross-chain image substitution is allowed.",
      mobileRule: "Use the matching approved mobile identity for the same chain; never substitute a different chain image."
    })
  }),
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
  officialDirectory,
  supportDirectory,
  links,
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
    ["On the Ground", links.purpleDiamondCrew, "People turning support into practical work: food, clothing, water, shelter, gardens and community help."],
    ["DonateWorldz", links.donateWorldz, "Three clearly separated support purposes with separate payment destinations and records."],
    ["FoodWorldz", links.foodWorldz, "Food relief, community meals, growing food, water, practical projects and measured outcomes."],
    ["Law", links.oneWorldzLaw, "Public-interest ideas, rights and policy research, including the Robin Hood Law proposal, with clear legal-advice boundaries."],
    ["Learn", links.learnWorldz, "Practical learning about food growing, gardening, community action, research, skills and how people can make a difference together."],
    ["Partnerships & Sponsors", "#partnerships", "Business development, sponsors, institutions and local partners supporting transparent real-world outcomes."],
    ["2026–2030 Help the People", "#movement", "A planned march, concert and global participation movement connecting people who can give, learn, travel, volunteer and act."],
    ["CryptoWorldz", links.cryptoworldz, "The separate crypto and blockchain branch of the wider ecosystem."]
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
    ["Reagan & Children", links.reaganChildren],
    ["Community Support Directory", links.communityDirectory],
    ["Community Impact", links.communityImpact],
    ["Support JayJayTeamDev", links.jayjaySupport]
  ]),
  projectRegistry: Object.freeze([
    Object.freeze({ name: "OneWorldz 🌐 Full Support™", area: "Global humanitarian gateway", state: "FOUNDATION_ACTIVE", url: links.oneworldz }),
    Object.freeze({ name: "CryptoWorldz™", area: "Blockchain ecosystem", state: "FOUNDATION_ACTIVE", url: links.cryptoworldz }),
    Object.freeze({ name: "Command Centre Ultimate™", area: "Protected ZED/AUTO/G.R.A.C.E./RECAP/BASED.BID control system", state: "PROTECTED_BUILD", url: links.zedCommandCentre }),
    Object.freeze({ name: "ZED™", area: "Telegram missions, profiles, points and governance presentation", state: "PROTECTED_ROLE", url: links.zed }),
    Object.freeze({ name: "AUTO • Diamond Buy™", area: "JayJayTeamDev-owned treasury policy controller", state: "LOCKED_EXECUTION_DISABLED", url: links.zedCommandCentre }),
    Object.freeze({ name: "G.R.A.C.E.™", area: "Raaiiidd coordination and approved posting", state: "PROTECTED_ROLE", url: links.zedCommandCentre }),
    Object.freeze({ name: "RECAP™", area: "Community recap, protection and transparency", state: "PARTNER_ROLE", url: links.zedCommandCentre }),
    Object.freeze({ name: "ImpactBased™ × BASED.BID", area: "Purpose-led reviewed launch pathway", state: "DEVELOPING", url: links.impactBased }),
    Object.freeze({ name: "Purple Diamond Crew™ / Hope Chest", area: "On-the-ground action plus separated legacy history", state: "FOUNDATION_ACTIVE", url: links.purpleDiamondCrew }),
    Object.freeze({ name: "2026–2030 Help the People Movement™", area: "Peaceful public participation, events and practical community action", state: "PLANNED", url: links.oneworldz }),
    Object.freeze({ name: "OneWorldz GPT™", area: "Public guide using the protected server API", state: "INTEGRATED", url: links.oneworldz }),
    Object.freeze({ name: "$NBC • Next Big Coin", area: "Existing Solana token portal and planned ecosystem fee receiver", state: "EXISTING_TOKEN_FUTURE_ROUTING_NOT_ACTIVE", url: links.nextBigCoin }),
    Object.freeze({ name: "$SolToken", area: "SolWorldz flagship legacy/token plan", state: "PLAN_OR_LEGACY_REVIEW", url: links.solworldz }),
    Object.freeze({ name: "$SolMars", area: "MUSKMAN project", state: "PLAN_OR_LEGACY_REVIEW", url: links.solworldz }),
    Object.freeze({ name: "$SolBud", area: "Black Bud Bull project with proposed impact routing", state: "PLAN_OR_LEGACY_REVIEW", url: links.solworldz }),
    Object.freeze({ name: "$W • Uganda Unite", area: "Uganda impact token concept", state: "PLAN_OR_LEGACY_REVIEW", url: links.impactBased }),
    Object.freeze({ name: "$RHL • Robin Hood Law", area: "Robin Hood Law token/project concept", state: "PLAN_OR_LEGACY_REVIEW", url: links.robinworldz }),
    Object.freeze({ name: "$DEBT • RecoverYourDebt", area: "Debt recovery/community project concept", state: "PLAN_OR_LEGACY_REVIEW", url: links.robinworldz }),
    Object.freeze({ name: "$SMILES • Action Creates Smiles", area: "Planned Action Spread Smiles impact token", state: "PLANNED", url: links.impactBased })
  ]),
  tokenControl: Object.freeze({
    releaseRule: "No new token launch, migration, fee split, treasury route, lock, unlock or release becomes active merely because it appears on a website or in a plan.",
    lockRule: "Each token must have its own documented supply/owner allocation, lock or vesting schedule, release conditions, fee percentages, recipient wallets, chain, contract authority and emergency procedure before activation.",
    ecosystemFeeRule: "New-token and legacy-token fee strategies may support ecosystem and impact purposes only after exact percentages and recipients are disclosed, technically enforced where applicable, and legally/compliance reviewed.",
    impactRule: "Any charity/community allocation must remain separately accounted for and must never be represented as tax deductible unless that status is independently verified.",
    ownerRule: "JayJayTeamDev may configure owner-controlled strategies using only JayJayTeamDev-owned funds, subject to the AUTO ceiling and compliance rules below."
  }),
  autoControl: autoControlPolicy,
  compliance: Object.freeze({
    principle: "Lawful-by-design. The system must not guess a legal maximum or treat a label such as token, utility, charity, treasury or owner-controlled as determinative of legal obligations.",
    digitalAssetRule: "Before enabling execution, assess the rights, benefits, expectations, marketing and connected arrangements of each digital asset/service to determine whether financial-services, market, custody, virtual-asset, AML/CTF or other obligations apply.",
    ownFundsRule: "AUTO is designed for owner-controlled funds only. No donor, beneficiary, community, customer or third-party money enters AUTO.",
    antiManipulationRule: "No wash trading, fake volume, coordinated misleading activity, artificial price support, hidden market-making or deceptive performance claims.",
    evidenceRule: "Public claims distinguish LIVE, VERIFIED, PLANNED, PROPOSED and HISTORICAL states."
  }),
  proofRules: Object.freeze([
    "No placeholder content in production.",
    "No invented partner, ownership, endorsement, payment, deployment or live-status claim.",
    "No secrets or financial credentials in public code.",
    "Use approved production assets without distortion; no new image generation is required for this plan.",
    "OneWorldz is blue/white; CryptoWorldz is blue-purple; Purple Diamond Crew is its own deep-purple theme.",
    "Every Blockchain World must use the profile/hero artwork that belongs to that exact chain on desktop and mobile.",
    "Desktop and mobile routes must both render cleanly with square/rectangular media shells and self-closing navigation.",
    "Every destination must have reciprocal working links and one clear job.",
    "Every public static HTML page must use the exact two-line Created with the Vision footer and must not restore Created by/Designed by JayJayTeamDev footer credit.",
    "OneWorldz advertising uses one approved visual, the locked Why can't I phrase and one primary button to OneWorldz.com; no competing primary CTA.",
    "The official directory and support directory must use the single canonical URL registry from site-data.mjs.",
    "OneWorldz GPT must be present on OneWorldz.com and DonateWorldz.com and call the protected server API only.",
    "OneWorldz GPT must never expose OPENAI_API_KEY or collect card, bank, seed phrase, private key or password data in chat.",
    "The three donation purposes remain separate even when OneWorldz GPT guides a visitor to them.",
    "AUTO execution remains disabled until owner-owned funds, risk caps, legal/compliance classification, wallet allowlists, audit logs and emergency stop are verified.",
    "Backup before production writes; verify after writes; roll back on failed proof.",
    "Protected CryptoBotz remains untouched by the static release except for separately reviewed protected application changes."
  ])
});

if (perfectPlan.structure.ecosystemDestinations !== 19) throw new Error("Perfect Plan must remain 19 destinations");
if (perfectPlan.structure.staticBuildTargets !== 18) throw new Error("Perfect Plan must remain 18 static targets + 1 protected app");
if (perfectPlan.openAI.publicGuideSurfaces.length !== 2) throw new Error("OneWorldz GPT must remain integrated on OneWorldz and DonateWorldz");
if (perfectPlan.officialDirectory.length < 10) throw new Error("Official ecosystem directory is incomplete");
if (perfectPlan.supportDirectory.length !== 6) throw new Error("Support directory must keep the six locked public pathways");
if (perfectPlan.projectRegistry.length < 15) throw new Error("Project registry is incomplete");
if (perfectPlan.advertisingContract.primaryActions !== 1 || perfectPlan.advertisingContract.ctaUrl !== links.oneworldz) throw new Error("Advertising contract drift");
if (perfectPlan.footerContract.line1 !== "Created with the Vision") throw new Error("Footer contract drift");
