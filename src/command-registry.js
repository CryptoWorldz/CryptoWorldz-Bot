const ROLE_RANK = Object.freeze({ public: 0, member: 1, admin: 2, executive: 3, owner: 4 });
const freezeCommands = (rows) => Object.freeze(rows.map(([command, description]) => Object.freeze({ command, description })));
const group = (key, label, minimumRole, rows) => Object.freeze({ key, label, minimumRole, commands: freezeCommands(rows) });

const COMMAND_GROUPS = Object.freeze([
  group("start", "🌐 Start & Navigation", "public", [
    ["zedstart", "Open the complete CryptoWorldz Command Centre"], ["help", "Simple command help"],
    ["commands", "Show commands available to your access level"], ["commandtree", "Show the Command Centre structural tree"],
    ["directory", "Open Directory@OneWorldz"], ["acknowledgements", "Open Acknowledgements@OneWorldz"],
    ["supportjay", "Open JayJayTeamDev@DonateWorldz"], ["donate", "Open the current DonateWorldz support choices"]
  ]),
  group("legend", "🤖 ZED • Legend Profile", "member", [
    ["zed", "Open ZED profile, wallet and mission controls"], ["start", "Start or reopen ZED"],
    ["register", "Register as a CryptoWorldz Legend"], ["profile", "View your Legend profile"],
    ["points", "View Legend Points"], ["rewards", "View reward activity"], ["leaderboard", "View the leaderboard"],
    ["wallet", "Register or view your public wallet association"], ["cancel", "Cancel the current guided action"],
    ["legendstatus", "View Legend recognition status"], ["specialtiers", "View Special Request tiers"],
    ["uniquelegend", "Apply for Unique Legend review"], ["boostshill", "Boost an eligible referred Legend"]
  ]),
  group("missions", "🚀 Missions, Creator & Raaiiidd", "member", [
    ["raaiiidd", "Open Raaiiidd missions"], ["missions", "List active missions"], ["raid", "Open or record a Raaiiidd link"],
    ["creator", "Open ZED Raaiiidd Creator for post, artwork, preview and Admin review"]
  ]),
  group("community", "💜 Community, Heroes, Causes & Social Directory", "member", [
    ["impact", "Open current DonateWorldz impact choices"], ["supportreagan", "Open Reagan & Children on DonateWorldz"],
    ["heroes", "Open Real-World Hero evidence and recognition"], ["kitty", "View public Community Kitty addresses"],
    ["governance", "Open governance information"], ["vote", "Vote in an active governance proposal"],
    ["causes", "List registered causes"], ["cause", "View one cause"], ["shilllink", "Create your referral/shill link"],
    ["referrals", "View referral status"], ["rewardplan", "View reward-plan rules"], ["website", "Open a website by project"],
    ["websites", "View the website directory"], ["worldzlive", "View live Worldz sites"], ["solworldz", "Open SolWorldz"],
    ["tg", "Open this project's Telegram link"], ["tglinks", "View official Telegram links"],
    ["x", "Open this project's X page"], ["xlinks", "View official X pages"]
  ]),
  group("admin-missions", "🛡 Admin • Missions, Reviews, Members & Settings", "admin", [
    ["admin", "Open Admin controls"], ["admingrace", "Open Grace Admin controls"], ["zedsettings", "Open Command Centre settings"],
    ["reviewqueue", "Open mission, Creator and Hero human-review queues"],
    ["newmission", "Create a mission"], ["editmission", "Edit a mission"], ["endmission", "End a mission"],
    ["pending", "Review pending mission submissions"], ["approve", "Approve an authorised pending action"],
    ["reject", "Reject an authorised pending action"], ["member", "Inspect a Legend member"], ["admins", "List managed admins"],
    ["permissions", "View permission structure"], ["setrole", "Set a managed role"], ["setpermission", "Set a scoped permission"],
    ["setpartner", "Create or update a partner profile"], ["stats", "View system statistics"], ["activity", "View safe activity log"]
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
