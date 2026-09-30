const test = require("node:test");
const assert = require("node:assert/strict");
const { formatTicket } = require("../src/alice-support");

test("ALICE renders ticket state and latest admin response", () => {
  const text = formatTicket({ id:7, status:"pending", priority:"high", subject:"Help", body:"Issue", resolution:"Checking it" });
  assert.match(text, /TICKET #7/);
  assert.match(text, /PENDING/);
  assert.match(text, /Checking it/);
});
