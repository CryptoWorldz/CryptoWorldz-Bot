const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  DIPSHIT_COMMANDS,
  DIPSHIT_INVOICE_PAYLOAD,
  DIPSHIT_PERIOD_SECONDS,
  activeMembership,
  solMembershipEnabled,
  validateStarsCheckout
} = require("../src/dipshit-membership");

const ROOT = path.join(__dirname, "..");

test("DIPSHIT paid membership contract uses recurring 30-day Telegram Stars", () => {
  assert.equal(DIPSHIT_PERIOD_SECONDS, 2592000);
  assert.equal(DIPSHIT_INVOICE_PAYLOAD, "dipshit_pro_monthly_v1");
  assert.equal(validateStarsCheckout({
    invoice_payload: DIPSHIT_INVOICE_PAYLOAD,
    currency: "XTR",
    total_amount: 99
  }, 99), true);
  assert.equal(validateStarsCheckout({
    invoice_payload: DIPSHIT_INVOICE_PAYLOAD,
    currency: "USD",
    total_amount: 99
  }, 99), false);
});

test("membership status is derived from the paid period end", () => {
  assert.equal(activeMembership({ current_period_end: new Date(Date.now() + 60_000).toISOString() }), true);
  assert.equal(activeMembership({ current_period_end: new Date(Date.now() - 60_000).toISOString() }), false);
});

test("SOL month pass stays disabled without an explicit valid recipient and amount", () => {
  assert.equal(solMembershipEnabled({ dipshitSolMonthlyAmount: 0, dipshitSolRecipient: "" }), false);
  assert.equal(solMembershipEnabled({ dipshitSolMonthlyAmount: 0.01, dipshitSolRecipient: "not-a-wallet" }), false);
});

test("DIPSHIT command menu includes payment, privacy and cancellation controls", () => {
  const names = DIPSHIT_COMMANDS.map((item) => item.command);
  for (const command of ["subscribe","membership","solmembership","claimsol","cancelmembership","privacy","terms","paysupport"]) {
    assert.ok(names.includes(command), command);
  }
});

test("public privacy and terms pages exist and keep retired branding out", () => {
  const privacy = fs.readFileSync(path.join(ROOT, "cryptoworldz.xyz/dipshit/privacy/index.html"), "utf8");
  const terms = fs.readFileSync(path.join(ROOT, "cryptoworldz.xyz/dipshit/terms/index.html"), "utf8");
  assert.match(privacy, /Privacy Policy/);
  assert.match(privacy, /seed phrase/);
  assert.match(terms, /Telegram Stars/);
  assert.match(terms, /SOL month pass/);
  assert.match(terms, /does not buy tokens/i);
  assert.doesNotMatch(privacy + terms, /OneWorldz|oneworldz\.com/i);
});

test("membership migration is private-by-default and idempotent", () => {
  const sql = fs.readFileSync(path.join(ROOT, "supabase/migrations/20260929113500_dipshit_memberships.sql"), "utf8");
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /unique \(source, payment_ref\)/i);
  assert.match(sql, /zed_runtime_authorized\(\)/);
  assert.match(sql, /record_dipshit_membership_payment/);
});
