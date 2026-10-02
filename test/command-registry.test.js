const test = require("node:test");
const assert = require("node:assert/strict");
const { allRegisteredCommandNames, groupsForRole } = require("../src/command-registry");

const REQUIRED_RUNTIME_COMMANDS = [
  "zedstart","zed","help","commands","commandtree","directory","acknowledgements","supportjay",
  "start","register","profile","rewards","leaderboard","raaiiidd","raids","wallet","cancel","kitty","impact","donate","points",
  "fullscope","worldzfullbuild","fullscopechains","fullscopetokens","worldzwatch","worldzlock","worldzvest",
  "worldzvotes","vote","tokenvote","worldztrending","worldzrankings","worldzvoice","worldzballots","worldzballot","worldzresults",
  "raid","next","raidpoints","raidprogress","stopraid","admin","admingrace","zedsettings","newmission","editmission","endmission","pending","approve","reject","member","admins","permissions","setkitty","setrole","setpermission","setpartner","broadcast","stats","activity",
  "causes","cause","cause_add","shilllink","shillpack","shillcampaign","shill","shillpoints","pendingshills","approveshill","rejectshill","referrals","rewardplan","website","websites","worldzlinks","worldzlive","solworldz","tg","tglinks","x","xlinks","identify","setx",
  "workstart","workstop","evidence","workevidence","rewardbudget","specialreward","rewardasset","fundingplan","funded","contribute","walletplan","setprojectwallet","investmentfunded",
  "worldzcast","worldzcasttargets","confirmworldzcast","cancelworldzcast","worldzcaston","worldzcastoff","boostshill","specialtiers","uniquelegend","legendstatus","reviewlegend","reserverewardon","reserverewardoff",
  "executives","addscopedadmin","disableadmin","appointexecutive",
  "auto","autosimulate","autodca","autodcanew","autodcastart","autodcapause","autodcaresume","autodcacancel","autodcawallet","autodcaenable","autodcadisable","autopause","autoresume","autoemergency",
  "grace","secretary","draft","calendar","schedule","cancelpost","accounts","results","growth","autopost","graceadmin","gracepower","campaigncreate","campaigns","graceanalytics","adbudget","adapprove","pauseall",
  "connectx","gracex","gracestatus","connectfacebook","gracefacebook","metacheck","ownercommands"
];

test("Command Centre registry contains the audited runtime and gateway command inventory", () => {
  const names = new Set(allRegisteredCommandNames());
  for (const command of REQUIRED_RUNTIME_COMMANDS) assert.ok(names.has(command), `missing /${command}`);
  for (const retired of ["missions","worldzgovern","governproposals","governvote","governdelegate"]) {
    assert.equal(names.has(retired), false, `retired /${retired} leaked into registry`);
  }
});

test("member command guide cannot expose protected controls", () => {
  const memberNames = new Set(groupsForRole("member").flatMap((group) => group.commands.map((item) => item.command)));
  for (const command of ["setprojectwallet","autoemergency","appointexecutive","metacheck","adapprove","setrole","pending","approve","reject"]) {
    assert.equal(memberNames.has(command), false, `member guide exposed /${command}`);
  }
});

test("owner command tree includes every role layer", () => {
  const groups = groupsForRole("owner");
  for (const role of ["public","member","admin","executive","owner"]) {
    assert.ok(groups.some((group) => group.minimumRole === role), `owner tree missing ${role} layer`);
  }
});

test("Ronald Raider is exposed as RAIDS, not Missions", () => {
  const raids = groupsForRole("member").find((group) => group.key === "raids");
  assert.ok(raids);
  const names = new Set(raids.commands.map((item) => item.command));
  for (const command of ["raid","next","raaiiidd","raids","raidpoints","creator"]) assert.ok(names.has(command), command);
  assert.equal(names.has("missions"), false);
});

test("Worldz Votes Centre keeps hourly token voting and civic public voice separate", () => {
  const groups = groupsForRole("member");
  const votes = groups.find((group) => group.key === "worldz-votes-centre");
  const civic = groups.find((group) => group.key === "worldz-civic-voice");
  assert.ok(votes);
  assert.ok(civic);
  assert.equal(Boolean(groups.find((group) => group.key === "worldz-govern")), false);
  const tokenNames = new Set(votes.commands.map((item) => item.command));
  const civicNames = new Set(civic.commands.map((item) => item.command));
  assert.ok(tokenNames.has("vote"));
  assert.ok(tokenNames.has("tokenvote"));
  for (const command of ["worldzvoice","worldzballots","worldzballot","worldzresults"]) {
    assert.ok(civicNames.has(command), command);
    assert.equal(tokenNames.has(command), false, command);
  }
});

test("Community Suite command groups expose member tools without leaking owner controls", () => {
  const member = groupsForRole("member");
  const suite = member.find((group) => group.key === "community-suite");
  assert.ok(suite);
  const memberNames = new Set(suite.commands.map((item) => item.command));
  for (const command of ["suite","alice","aicommunity","autopicks","aiconfig","aicapabilities","scan","scan20","events","giveaway","buyalerts","networkstatus","launchstatus"]) {
    assert.ok(memberNames.has(command), command);
  }
  for (const command of ["suiteapprove","networkcreate","networkapprove","networkremove"]) {
    assert.equal(memberNames.has(command), false, command);
  }
});

test("Community Suite admin and owner controls are registered at the correct layers", () => {
  const admin = groupsForRole("admin");
  const suiteAdmin = admin.find((group) => group.key === "community-suite-admin");
  assert.ok(suiteAdmin);
  const adminNames = new Set(suiteAdmin.commands.map((item) => item.command));
  for (const command of ["module","brand","lockdown","autopick","aipreset","aibuild","tickets","buyalert","apikeycreate","webhookadd","networkrequest","launchconnect"]) {
    assert.ok(adminNames.has(command), command);
  }
  const ownerNames = new Set(groupsForRole("owner").flatMap((group) => group.commands.map((item) => item.command)));
  for (const command of ["suiteapprove","networkcreate","networkapprove","networkremove"]) assert.ok(ownerNames.has(command), command);
});

test("REXSECURE ULTIMATE commands respect admin and owner boundaries", () => {
  const adminNames = new Set(groupsForRole("admin").flatMap((group) => group.commands.map((item) => item.command)));
  for (const command of ["secureguard","rexintel","rexreport","rexpatternban","rexunderattack"]) assert.ok(adminNames.has(command), command);
  for (const command of ["rexglobalblock","rexglobalclear"]) assert.equal(adminNames.has(command), false, command);

  const ownerNames = new Set(groupsForRole("owner").flatMap((group) => group.commands.map((item) => item.command)));
  for (const command of ["rexglobalblock","rexglobalclear"]) assert.ok(ownerNames.has(command), command);
});
