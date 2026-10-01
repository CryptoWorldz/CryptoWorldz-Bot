const ROLE_RANK = Object.freeze({ public: 0, member: 1, admin: 2, executive: 3, owner: 4 });
const freezeCommands = (rows) => Object.freeze(rows.map(([command, description]) => Object.freeze({ command, description })));
const group = (key, label, minimumRole, rows) => Object.freeze({ key, label, minimumRole, commands: freezeCommands(rows) });

const COMMAND_GROUPS = Object.freeze([
  group("start", "🌐 Start & Navigation", "public", [
    ["zedstart", "Open the complete CryptoWorldz Command Centre"], ["help", "Simple command help"],
    ["dipshit", "Meet DIPSHIT, the blue Worldz Dude"],
    ["commands", "Show commands available to your access level"], ["commandtree", "Show the Command Centre structural tree"],
    ["directory", "Open the Worldz directory"], ["acknowledgements", "Open DonateWorldz acknowledgements"],
    ["supportjay", "Open JayJayTeamDev@DonateWorldz"], ["donate", "Open the current DonateWorldz support choices"]
  ]),
  group("max", "🧠 Command Centre MAX™ • Learn, Research, Interact & Teach", "member", [
    ["max", "Open Command Centre MAX learning and research hub"]
  ]),
  group("fullscope", "🌐 WorldzFullScope™ • Multi-chain Command Layer", "member", [
    ["fullscope", "Open the ZED-led WorldzFullScope command layer"],
    ["worldzfullbuild", "Open the WorldzFullBuild master integration source of truth"],
    ["fullscopechains", "View every currently supported FullScope chain"],
    ["fullscopetokens", "View the multi-chain token registry"],
    ["worldzwatch", "View indexed token and chain activity"],
    ["worldzlock", "Open the chain-aware lock centre"],
    ["worldzvest", "Open the chain-aware vesting centre"]
  ]),
  group("worldz-votes-centre", "🗳️ Worldz Votes Centre™ • DEX TOKEN VOTING • 1 VOTE / HOUR", "member", [
    ["worldzvotes", "Open hourly favourite-token voting and rankings"],
    ["vote", "Vote for one favourite registered token this hour"],
    ["tokenvote", "Alias for the hourly favourite-token vote"],
    ["worldztrending", "View the fastest-rising organic popularity ranking"],
    ["worldzrankings", "View Worldz popularity rankings"]
  ]),
  group("legend", "🤖 ZED • Legend Profile", "member", [
    ["zed", "Open ZED profile, wallet and Raid controls"], ["start", "Start or reopen ZED"],
    ["register", "Register as a CryptoWorldz Legend"], ["profile", "View your Legend profile"],
    ["points", "View Legend Points"], ["rewards", "View reward activity"], ["leaderboard", "View the leaderboard"],
    ["wallet", "Register or view your public wallet association"], ["cancel", "Cancel the current guided action"],
    ["legendstatus", "View Legend recognition status"], ["specialtiers", "View Special Request tiers"],
    ["uniquelegend", "Apply for Unique Legend review"], ["boostshill", "Boost an eligible referred Legend"]
  ]),
  group("raids", "🤠 Ronald Raider • RAIDS", "member", [
    ["raid", "Open Ronald Raider or view the live Raid"],
    ["next", "View the next Raid lined up"],
    ["raaiiidd", "Open the current Ronald Raider Raid"],
    ["raids", "List active Ronald Raider Raids"],
    ["creator", "Open ZED Raid Creator for post, artwork, preview and Admin review"]
  ]),
  group("community", "💜 Community, Heroes, Causes & Social Directory", "member", [
    ["impact", "Open current DonateWorldz impact choices"], ["supportreagan", "Open Reagan & Children on DonateWorldz"],
    ["heroes", "Open Real-World Hero evidence and recognition"], ["kitty", "View public Community Kitty addresses"],
    ["causes", "List registered causes"], ["cause", "View one cause"], ["shilllink", "Create your referral/invite Shill Link"],
    ["shillpoints", "View token Shill Rewards and eligible platforms"], ["shill", "Submit a verified token shill proof for points"],
    ["referrals", "View referral status"], ["rewardplan", "View reward-plan rules"], ["website", "Open a website by project"],
    ["websites", "View the website directory"], ["worldzlinks", "Open WorldzLinkz™ — every Worldz in one QR directory"], ["worldzlive", "View live Worldz sites"], ["solworldz", "Open SolWorldz"],
    ["tg", "Open this project's Telegram link"], ["tglinks", "View official Telegram links"],
    ["x", "Open this project's X page"], ["xlinks", "View official X pages"]
  ]),
  group("inbox", "📥 Worldz Inbox™ • Private DM Messaging", "member", [
    ["inbox", "Open your private Worldz Inbox"], ["dm", "Send a private Worldz DM"],
    ["dmstyle", "Send a WorldzStyle private DM"], ["replydm", "Reply to an Inbox message"],
    ["dmsettings", "Turn private Worldz DMs on or off"], ["dmblock", "Block a Worldz DM sender"],
    ["dmunblock", "Unblock a Worldz DM sender"], ["dmdelete", "Hide an Inbox message"],
    ["dmstatus", "View private messaging status"], ["worldzstyle", "View WorldzStyle message formats"]
  ]),
  group("community-suite", "🌐 Worldz FullBuild™ Community Suite", "member", [
    ["suite", "Open the Community Suite"], ["suiteprice", "View Trial, Rent, Rent-to-Own and Own pricing"],
    ["suitequote", "Calculate the group price after any unused trial credit"],
    ["modules", "View installed community modules"], ["themes", "View Worldz theme packs"],
    ["alice", "Open ALICE community support"], ["support", "Ask ALICE for support"],
    ["aicommunity", "Open the Community AI / selected Auto Pick"], ["askcommunity", "Ask the selected customer AI"],
    ["autopicks", "View ready-made AI Auto Picks"], ["aiconfig", "Open Community AI settings"],
    ["aicapabilities", "View the live AI capability map"], ["aiknowledge", "View approved customer AI knowledge"],
    ["ticket", "Create a tracked support ticket"], ["ticketstatus", "View a support ticket"],
    ["ticketreply", "Reply to a support ticket"], ["mytickets", "View your open support tickets"],
    ["scan", "Scan one token/CA"], ["scan20", "Scan up to 20 token addresses"],
    ["booststatus", "Check provider paid-order status"], ["boostcentre", "Open legitimate promotion options"],
    ["events", "View community calendar events"], ["launchcountdown", "View or configure the next launch countdown"], ["giveaway", "View open giveaways"],
    ["giveawayjoin", "Enter an open giveaway"], ["walletwatch", "View public wallet watchlist"],
    ["buyalerts", "View real market/buy alert rules"],
    ["networkstatus", "View multi-group network licence status"], ["launchstatus", "View LaunchPad community linkage"],
    ["marketplace", "Open Worldz Marketplace add-ons"], ["socials", "View customer social accounts"],
    ["socialcapabilities", "View social publishing/connection capabilities"]
  ]),
  group("worldping", "🌐 WorldPing™ • Licensed Group Alerts", "member", [
    ["worldping", "Send a visible group WorldPing"], ["worldpingmode", "Group admin: AdminsOnlyPing or FullMemberPing"],
    ["zedmaxprice", "View ZED MAX SOL licence prices"], ["zedmaxreceipt", "Submit a SOL payment receipt"]
  ]),
  group("admin-missions", "🛡 Admin • Missions, Reviews, Members & Settings", "admin", [
    ["admin", "Open Admin controls"], ["admingrace", "Open Grace Admin controls"], ["zedsettings", "Open Command Centre settings"], ["secureguard", "Open REX SecureGuard security controls"],
    ["reviewqueue", "Open mission, Creator and Hero human-review queues"],
    ["newmission", "Create a mission"], ["editmission", "Edit a mission"], ["endmission", "End a mission"],
    ["raidprogress", "Update Ronald Raider likes/reposts/replies/views"], ["stopraid", "Stop the live Ronald Raider Raid"],
    ["pending", "Review pending mission submissions"], ["approve", "Approve an authorised pending action"],
    ["reject", "Reject an authorised pending action"], ["pendingshills", "Review pending token shill proofs"],
    ["approveshill", "Approve a verified token shill proof"], ["rejectshill", "Reject a token shill proof"],
    ["member", "Inspect a Legend member"], ["admins", "List managed admins"],
    ["permissions", "View permission structure"], ["setrole", "Set a managed role"], ["setpermission", "Set a scoped permission"],
    ["setpartner", "Create or update a partner profile"], ["stats", "View system statistics"], ["activity", "View safe activity log"]
  ]),
  group("community-suite-admin", "🌐 Admin • Community Suite", "admin", [
    ["suitereceipt", "Submit a Community Suite payment receipt"],
    ["module", "Turn a Community Suite module on or off"], ["brand", "Configure community branding"],
    ["language", "Set community language preference"], ["lockdown", "Control emergency lockdown"],
    ["analytics", "View seven-day Community Suite analytics"],
    ["autopick", "Select a ready-made AI Auto Pick"], ["aipreset", "Alias for selecting an AI Auto Pick"],
    ["aibuild", "Create a Custom Build AI name, personality and purpose"],
    ["ainame", "Set the customer AI display name"], ["aipersonality", "Set the customer AI personality"],
    ["aiinstructions", "Set customer-approved AI instructions"], ["aiforget", "Remove approved AI knowledge"],
    ["tickets", "View ALICE admin ticket queue"], ["ticketclose", "Close an ALICE support ticket"],
    ["eventadd", "Add a community calendar event"], ["eventdel", "Remove a community calendar event"],
    ["giveawaydraw", "Draw recorded giveaway entries"],
    ["watchwallet", "Add a public wallet to the watchlist"], ["unwatchwallet", "Disable a watched wallet"],
    ["promote", "Record a disclosed sponsored promotion"],
    ["buyalert", "Configure real buy/whale alert thresholds"], ["buyalertoff", "Disable a market alert rule"],
    ["apikeycreate", "Create a hashed customer API key"], ["apikeys", "List customer API keys"],
    ["apikeyrevoke", "Revoke a customer API key"], ["webhookadd", "Register a signed HTTPS webhook"],
    ["webhooks", "List signed webhooks"], ["webhookremove", "Disable a webhook"], ["webhooktest", "Test webhook delivery"],
    ["networkrequest", "Request a multi-group network slot"], ["launchconnect", "Link this group to a LaunchPad project/token"],
    ["addonrequest", "Request a Worldz Marketplace add-on"], ["addons", "View Marketplace requests"],
    ["sociallink", "Register an official customer social account"], ["socialdisable", "Disable a social directory account"]
  ]),
  group("communications", "📡 Admin • Communications", "admin", [
    ["broadcast", "Create a scoped broadcast draft"], ["confirmbroadcast", "Confirm a scoped broadcast"],
    ["cancelbroadcast", "Cancel a scoped broadcast"], ["worldzcast", "Create a WorldzCast post"],
    ["confirmworldzcast", "Confirm a WorldzCast draft"], ["cancelworldzcast", "Cancel a WorldzCast draft"],
    ["worldzcasttargets", "View WorldzCast destinations"], ["worldzcaston", "Enable the current WorldzCast destination"],
    ["worldzcastoff", "Disable the current WorldzCast destination"]
  ]),
  group("grace", "👩‍💼 G.R.A.C.E. • Social Operations", "admin", [
    ["grace", "Open Grace controls"], ["secretary", "Open Grace secretary/status"], ["draft", "Create a Grace draft"],
    ["calendar", "View Grace calendar"], ["schedule", "Schedule an approved post"], ["cancelpost", "Cancel a Grace post"],
    ["accounts", "View Grace social accounts"], ["results", "View Grace publish results"], ["growth", "View Grace growth data"],
    ["autopost", "Create a Grace Auto Post schedule"], ["graceadmin", "Manage delegated Grace scheduling access"],
    ["connectx", "Connect an approved X account"], ["gracex", "Alias for X connection"],
    ["connectfacebook", "Connect an approved Facebook Page"], ["gracefacebook", "Alias for Facebook connection"],
    ["pauseall", "Emergency stop Grace publishing"]
  ]),
  group("executive", "🛡 Executive Controls", "executive", [
    ["executives", "View Executive team"], ["addscopedadmin", "Add a scoped admin"], ["disableadmin", "Disable a delegated admin"],
    ["gracepower", "Open Grace Stage 3 power status"], ["campaigncreate", "Create a Grace campaign draft"],
    ["campaigns", "List Grace campaigns"], ["graceanalytics", "View Grace campaign analytics"]
  ]),
  group("owner-auto", "💎 Owner • AUTO Diamond Buy™", "owner", [
    ["auto", "View AUTO status"], ["autosimulate", "Run an AUTO simulation"], ["autodca", "View DCA plans"],
    ["autodcanew", "Create an owner DCA plan"], ["autodcastart", "Start an approved DCA plan"],
    ["autodcapause", "Pause a DCA plan"], ["autodcaresume", "Resume a DCA plan"], ["autodcacancel", "Cancel a DCA plan"],
    ["autodcawallet", "Set the owner DCA wallet boundary"], ["autodcaenable", "Enable AUTO DCA execution after gates"],
    ["autodcadisable", "Disable AUTO DCA execution"], ["autopause", "Pause AUTO"], ["autoresume", "Resume AUTO after safety review"],
    ["autoemergency", "Emergency stop AUTO"]
  ]),
  group("owner-funds", "👑 Owner • Funds, Rewards & Evidence", "owner", [
    ["setkitty", "Set a public Community Kitty address"], ["rewardbudget", "View reward budget controls"],
    ["specialreward", "Record an authorised special reward"], ["rewardasset", "Choose an eligible reward asset"],
    ["fundingplan", "View reward funding plan"], ["funded", "Record reward funding evidence"],
    ["contribute", "Record a project contribution"], ["walletplan", "View project wallet plan"],
    ["setprojectwallet", "Set a verified project public wallet"], ["investmentfunded", "Record owner investment funding"],
    ["workstart", "Start a work-evidence session"], ["workstop", "Stop a work-evidence session"],
    ["evidence", "Record work evidence"], ["workevidence", "Review work evidence"]
  ]),
  group("owner-system", "👑 Owner • System & Integrations", "owner", [
    ["ownercommands", "Show the full owner command inventory"], ["appointexecutive", "Appoint an Executive"],
    ["cause_add", "Add a cause"], ["identify", "Identify/register a Telegram destination"], ["setx", "Link an X page to a project"],
    ["gracestatus", "Check live Grace X runtime"], ["metacheck", "Check Meta OAuth configuration safely"],
    ["adbudget", "Create an advertising budget record"], ["adapprove", "Approve an advertising budget record"],
    ["suiteapprove", "Approve a Community Suite licence/package after payment review"],
    ["networkcreate", "Create a multi-group network licence"], ["networkapprove", "Approve a network group slot"],
    ["networkremove", "Remove a group from a network licence"],
    ["addonquote", "Quote a Marketplace request"], ["addonstatus", "Update Marketplace request status"],
    ["reviewlegend", "Review a Unique Legend application"], ["reserverewardon", "Open the protected Legend reward reserve"],
    ["reserverewardoff", "Lock the protected Legend reward reserve"]
  ])
]);

function normalizeRole(role) {
  const value = String(role || "member").toLowerCase();
  if (value === "owner") return "owner";
  if (value.includes("executive")) return "executive";
  if (value.includes("admin") || value.includes("manager")) return "admin";
  if (value === "public") return "public";
  return "member";
}
function groupsForRole(role) {
  const normalized = normalizeRole(role);
  return COMMAND_GROUPS.filter((item) => ROLE_RANK[item.minimumRole] <= ROLE_RANK[normalized]);
}
function commandsForRole(role) {
  const seen = new Set();
  return groupsForRole(role).flatMap((item) => item.commands.map((command) => ({ ...command, group: item.key, label: item.label, minimumRole: item.minimumRole }))).filter((item) => !seen.has(item.command) && seen.add(item.command));
}
function allRegisteredCommandNames() { return [...new Set(COMMAND_GROUPS.flatMap((item) => item.commands.map((command) => command.command)))].sort(); }

module.exports = { ROLE_RANK, COMMAND_GROUPS, normalizeRole, groupsForRole, commandsForRole, allRegisteredCommandNames };
