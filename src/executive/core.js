const SCOPED_ADMIN_ROLES = Object.freeze([
  "admin",
  "moderator",
  "recap_manager",
  "partner_manager",
  "treasury_manager",
  "grace_manager"
]);

const EXECUTIVE_PERMISSIONS = Object.freeze([
  "mission.create",
  "mission.edit",
  "mission.end",
  "submission.view",
  "submission.approve",
  "submission.reject",
  "communication.broadcast",
  "recap.publish",
  "member.view",
  "report.view",
  "treasury.view",
  "treasury.reconcile",
  "partner.report",
  "admin.view",
  "admin.manage_scoped",
  "grace.manage"
]);

function parseTelegramId(value) {
  const text = String(value || "").trim();
  if (!/^\d{5,20}$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase();
  return SCOPED_ADMIN_ROLES.includes(role) ? role : null;
}

function cleanText(value, maxLength = 80) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text || text.length > maxLength) return null;
  return text;
}

module.exports = {
  EXECUTIVE_PERMISSIONS,
  SCOPED_ADMIN_ROLES,
  cleanText,
  normalizeRole,
  parseTelegramId
};
