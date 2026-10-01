"use strict";

const crypto = require("node:crypto");

const CIVIC_VOTE_METHODS = Object.freeze([
  "single-choice",
  "approval",
  "ranked-choice-irv"
]);

const CIVIC_PRINCIPLES = Object.freeze([
  "one-verified-eligible-person-one-vote",
  "equal-option-treatment",
  "no-paid-ballot-advantage",
  "rules-published-before-open",
  "identity-vote-separation",
  "transparent-count",
  "source-backed-information",
  "politically-neutral-platform",
  "jurisdiction-law-gate",
  "no-false-official-authority"
]);

function cleanText(value, field, max) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${field} is required.`);
  if (text.length > max) throw new Error(`${field} exceeds ${max} characters.`);
  return text;
}

function normalizeOption(option = {}, index = 0) {
  const id = cleanText(option.id || `option-${index + 1}`, "option id", 80);
  const label = cleanText(option.label, "option label", 120);
  const description = cleanText(option.description || "No additional description supplied.", "option description", 1200);
  return Object.freeze({
    id,
    label,
    description,
    paidPlacement: false,
    weight: 1
  });
}

function buildBallotDefinition(input = {}) {
  const method = String(input.method || "single-choice").trim().toLowerCase();
  if (!CIVIC_VOTE_METHODS.includes(method)) throw new Error("Unsupported civic voting method.");

  if (input.paidPlacementAllowed === true || input.sponsoredRanking === true) {
    throw new Error("Paid ballot placement is prohibited.");
  }

  const options = (Array.isArray(input.options) ? input.options : []).map(normalizeOption);
  if (options.length < 2) throw new Error("A civic ballot requires at least two options.");
  const ids = new Set(options.map((option) => option.id));
  if (ids.size !== options.length) throw new Error("Civic option ids must be unique.");

  const opensAt = new Date(input.opensAt);
  const closesAt = new Date(input.closesAt);
  if (!Number.isFinite(opensAt.getTime()) || !Number.isFinite(closesAt.getTime()) || closesAt <= opensAt) {
    throw new Error("Ballot opening and closing times are invalid.");
  }

  const requestedBinding = input.binding === true || input.bindingStatus === "binding";
  const officialAuthorityRef = String(input.officialAuthorityRef || "").trim();
  const legalReviewState = String(input.legalReviewState || "required").trim().toLowerCase();

  if (requestedBinding && (!officialAuthorityRef || legalReviewState !== "approved")) {
    throw new Error("Binding civic voting requires approved legal review and an official-authority reference.");
  }

  return Object.freeze({
    id: cleanText(input.id, "ballot id", 120),
    title: cleanText(input.title, "ballot title", 180),
    summary: cleanText(input.summary, "ballot summary", 2000),
    jurisdiction: cleanText(input.jurisdiction, "jurisdiction", 120),
    method,
    options: Object.freeze(options),
    opensAt: opensAt.toISOString(),
    closesAt: closesAt.toISOString(),
    bindingStatus: requestedBinding ? "binding-authority-integrated" : "non-binding-public-consultation",
    officialAuthorityRef: requestedBinding ? officialAuthorityRef : null,
    legalReviewState,
    equalExposure: true,
    paidPlacementAllowed: false,
    secretBallotTarget: true,
    identityVoteSeparationRequired: true,
    publicAuditRequired: true,
    resultStatusBeforeClose: "hidden",
    principles: CIVIC_PRINCIPLES
  });
}

function validateSelectionIds(selection, allowed) {
  const out = Array.isArray(selection) ? selection.map(String) : [];
  if (new Set(out).size !== out.length) throw new Error("A ballot cannot rank/select the same option twice.");
  if (out.some((id) => !allowed.has(id))) throw new Error("Ballot includes an unknown option.");
  return out;
}

function countApproval(ballots = [], optionIds = []) {
  const allowed = new Set(optionIds.map(String));
  const totals = Object.fromEntries([...allowed].map((id) => [id, 0]));
  for (const ballot of ballots) {
    for (const id of validateSelectionIds(ballot, allowed)) totals[id] += 1;
  }
  return Object.freeze({ method: "approval", totalBallots: ballots.length, totals: Object.freeze(totals) });
}

function countSingleChoice(ballots = [], optionIds = []) {
  const allowed = new Set(optionIds.map(String));
  const totals = Object.fromEntries([...allowed].map((id) => [id, 0]));
  let invalid = 0;
  for (const ballot of ballots) {
    const selection = validateSelectionIds(ballot, allowed);
    if (selection.length !== 1) { invalid += 1; continue; }
    totals[selection[0]] += 1;
  }
  return Object.freeze({ method: "single-choice", totalBallots: ballots.length, invalid, totals: Object.freeze(totals) });
}

function countRankedChoiceIRV(ballots = [], optionIds = []) {
  const optionList = optionIds.map(String);
  const allowed = new Set(optionList);
  if (allowed.size < 2) throw new Error("IRV requires at least two options.");
  const rankings = ballots.map((ballot) => validateSelectionIds(ballot, allowed));
  let active = new Set(optionList);
  const rounds = [];

  while (active.size > 1) {
    const totals = Object.fromEntries([...active].map((id) => [id, 0]));
    let exhausted = 0;
    for (const ranking of rankings) {
      const current = ranking.find((id) => active.has(id));
      if (current) totals[current] += 1;
      else exhausted += 1;
    }
    const continuing = rankings.length - exhausted;
    const entries = Object.entries(totals);
    const leader = entries.sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    rounds.push(Object.freeze({ totals: Object.freeze({ ...totals }), exhausted, continuing }));

    if (leader && leader[1] > continuing / 2) {
      return Object.freeze({ method: "ranked-choice-irv", status: "complete", winner: leader[0], rounds: Object.freeze(rounds) });
    }

    const min = Math.min(...Object.values(totals));
    const lowest = Object.keys(totals).filter((id) => totals[id] === min);
    if (lowest.length !== 1) {
      return Object.freeze({
        method: "ranked-choice-irv",
        status: "tie-requires-published-resolution",
        tiedLowest: Object.freeze(lowest.sort()),
        rounds: Object.freeze(rounds)
      });
    }
    active.delete(lowest[0]);
  }

  return Object.freeze({
    method: "ranked-choice-irv",
    status: "complete",
    winner: [...active][0] || null,
    rounds: Object.freeze(rounds)
  });
}

function createAuditReceipt({ ballotId, selections, nonce, castAt }) {
  const safeNonce = String(nonce || "");
  if (safeNonce.length < 32) throw new Error("Receipt nonce must contain at least 32 characters.");
  const payload = JSON.stringify({
    ballotId: cleanText(ballotId, "ballot id", 120),
    selections: Array.isArray(selections) ? selections.map(String) : [],
    nonce: safeNonce,
    castAt: new Date(castAt).toISOString()
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

module.exports = {
  CIVIC_VOTE_METHODS,
  CIVIC_PRINCIPLES,
  buildBallotDefinition,
  countApproval,
  countSingleChoice,
  countRankedChoiceIRV,
  createAuditReceipt
};
