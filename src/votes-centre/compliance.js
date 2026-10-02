"use strict";

function evaluatePublicationGate(profile = {}, context = {}) {
  const blockers = [];
  const warnings = [];
  const now = new Date(context.now || Date.now());
  const validThrough = profile.validThrough ? new Date(`${profile.validThrough}T23:59:59.999Z`) : null;

  if (!Number.isFinite(now.getTime())) blockers.push("invalid-review-time");
  if (validThrough && now > validThrough) blockers.push("compliance-profile-expired");

  if (profile.worldzProductRules?.bindingVotingEnabled !== false) {
    blockers.push("binding-voting-must-default-off");
  }
  if (profile.worldzProductRules?.paidBallotPlacementAllowed !== false) {
    blockers.push("paid-ballot-placement-must-be-off");
  }
  if (profile.worldzProductRules?.neutralPresentationRequired !== true) {
    blockers.push("neutral-presentation-required");
  }

  if (profile.communications?.authorisationReviewRequired && context.requiresAuthorisation === true) {
    if (!String(context.authorisationText || "").trim()) blockers.push("required-authorisation-missing");
  }

  if (context.bindingRequested === true) {
    if (!String(context.officialAuthorityRef || "").trim()) blockers.push("official-authority-reference-required");
    if (String(context.legalReviewState || "").toLowerCase() !== "approved") blockers.push("approved-legal-review-required");
    if (context.independentAuditApproved !== true) blockers.push("independent-audit-required");
    if (context.privacyEligibilityApproved !== true) blockers.push("privacy-eligibility-review-required");
  }

  if (!context.sourceBundleCount || Number(context.sourceBundleCount) < 1) {
    warnings.push("source-bundle-empty");
  }

  return Object.freeze({
    allowed: blockers.length === 0,
    blockers: Object.freeze(blockers),
    warnings: Object.freeze(warnings),
    profile: profile.profile || null,
    asOf: profile.asOf || null,
    validThrough: profile.validThrough || null
  });
}

module.exports = { evaluatePublicationGate };
