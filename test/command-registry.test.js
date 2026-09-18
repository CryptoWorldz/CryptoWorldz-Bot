const test = require("node:test");
const assert = require("node:assert/strict");
const { allRegisteredCommandNames, groupsForRole } = require("../src/command-registry");

const REQUIRED_RUNTIME_COMMANDS = [
  "zedstart","zed","help","commands","commandtree","directory","acknowledgements","supportjay",
  "start","register","profile","rewards","leaderboard","raaiiidd","missions","wallet","cancel","kitty","governance","vote","impact","donate","points",
  "raid","admin","admingrace","zedsettings","newmission","editmission","endmission","pending","approve","reject","member","admins","permissions","setkitty","setrole","setpermission","setpartner","broadcast","stats","activity",
  "causes","cause","cause_add","shilllink","referrals","rewardplan","website","websites","worldzlive","solworldz","tg","tglinks","x","xlinks","identify","setx",
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
