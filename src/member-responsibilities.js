const treasuryPolicy = require("../launchpad.cryptoworldz.xyz/treasury-policy.json");

const ADMIN_LABELS = Object.freeze({
  owner: "Permanent Owner",
  admin: "Command Centre Admin",
  moderator: "Moderator",
  partner_manager: "Partner Manager",
  treasury_manager: "Treasury Manager",
  grace_manager: "G.R.A.C.E. Controller"
});

function normalizeId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function resolveTreasuryResponsibilities(user) {
  const telegramId = normalizeId(user?.telegram_id);
  if (!telegramId) return [];

  const roles = [];
  const operations = (treasuryPolicy.signerSlots || []).find(
    (row) => Number(row.telegramId) === telegramId && row.operationsMember === true
  );
  if (operations) {
    roles.push({
      key: "operations_treasury",
      label: "Worldz Operations Treasury",
      detail: "3-of-5 Signer",
      state: String(operations.status || "").includes("VERIFIED") ? "ACTIVE_VERIFIED" : "PENDING"
    });
  }

  const miracle = (treasuryPolicy.governance?.miracleTeam?.roster || []).find(
    (row) => Number(row.telegramId) === telegramId
  );
  if (miracle) {
    roles.push({
      key: "miracle_team_treasury",
      label: "Worldz Miracle Team Treasury",
      detail: "4-of-7 Roster",
      state: treasuryPolicy.governance?.miracleTeam?.status === "FUNDING_PENDING_NOT_DEPLOYED"
        ? "ROSTER_CONFIRMED_DEPLOYMENT_PENDING"
        : "ACTIVE"
    });
  }

  return roles;
}

function resolveAdminResponsibility(access) {
  if (!access?.authorized) return null;
  const role = String(access.role || "admin");
  return {
    key: "command_centre_access",
    label: ADMIN_LABELS[role] || role.replaceAll("_", " "),
    detail: "Active Command Centre Access",
    state: "ACTIVE"
  };
}

function responsibilityLines({ user, adminAccess } = {}) {
  const treasury = resolveTreasuryResponsibilities(user);
  const admin = resolveAdminResponsibility(adminAccess);
  const lines = [];

  for (const role of treasury) {
    const suffix = role.state === "ROSTER_CONFIRMED_DEPLOYMENT_PENDING"
      ? " • deployment pending"
      : "";
    lines.push(`🏦 Worldz Role: ${role.label} • ${role.detail}${suffix}`);
  }
  if (admin) lines.push(`🛡 Admin Status: ${admin.label}`);

  return lines;
}

module.exports = {
  ADMIN_LABELS,
  responsibilityLines,
  resolveAdminResponsibility,
  resolveTreasuryResponsibilities
};
