const test = require("node:test");
const assert = require("node:assert/strict");

const { formatCause, parseCausePayload, slugify } = require("../src/causes/core");

test("Cause register parses the Davis Family mobile command", () => {
  const parsed = parseCausePayload([
    "Cause: The Davis Family",
    "Organiser: Teighlor Davis",
    "Location: Mityana, Uganda",
    "Needs: Rent, food, medication and school supplies",
    "Priority: Urgent",
    "Platforms: Facebook, X and Telegram",
    "Tracking: JayJayTeamDev unique GoFundMe share link",
    "Approval: Owner required before publishing"
  ].join("\n"));

  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.slug, "the-davis-family");
  assert.deepEqual(parsed.value.platforms, ["facebook", "x", "telegram"]);
  assert.equal(parsed.value.approvalRequired, true);
});

test("Cause register validates priorities, platforms and links", () => {
  const base = [
    "Cause: Test Cause",
    "Organiser: Tester",
    "Location: Australia",
    "Needs: Support",
    "Priority: High",
    "Platforms: Facebook",
    "Fundraiser: https://example.com/cause"
  ].join("\n");
  assert.equal(parseCausePayload(base).ok, true);
  assert.equal(parseCausePayload(base.replace("High", "Immediate")).ok, false);
  assert.equal(parseCausePayload(base.replace("Facebook", "MySpace")).ok, false);
  assert.equal(parseCausePayload(base.replace("https://example.com/cause", "http://example.com")).ok, false);
});

test("Cause cards and slugs remain stable", () => {
  assert.equal(slugify(" The Davis Family "), "the-davis-family");
  const card = formatCause({
    slug: "the-davis-family",
    cause: "The Davis Family",
    organiser: "Teighlor Davis",
    location: "Mityana, Uganda",
    needs: "Rent and food",
    priority: "urgent",
    platforms: ["facebook", "x", "telegram"],
    tracking: "JayJayTeamDev link",
    approval_required: true,
    fundraiser_url: "https://example.com"
  });
  assert.match(card, /OWNER REQUIRED/);
  assert.match(card, /Facebook, X, Telegram/);
});
