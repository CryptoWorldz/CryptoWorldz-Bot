const assert = require("node:assert/strict");
const test = require("node:test");
const {
  WRITE_CONFIRMATION,
  buildARecordUpdate,
  cleanDomain,
  cleanIpv4,
  requireWriteConfirmation
} = require("../src/hub-central/hostinger-client");
const { extractOpenAIText, extractProposals, safeTokenMatch } = require("../src/hub-central/http");

test("Hub Central builds the exact Hostinger A-record update contract", () => {
  assert.deepEqual(buildARecordUpdate({ content: "145.223.108.40" }), {
    overwrite: true,
    zone: [{ name: "@", type: "A", ttl: 14400, records: [{ content: "145.223.108.40" }] }]
  });
});

test("Hub Central refuses malformed domains and IPv4 addresses", () => {
  assert.equal(cleanDomain("DonateWorldz.com."), "donateworldz.com");
  assert.equal(cleanIpv4("145.223.108.40"), "145.223.108.40");
  assert.throws(() => cleanDomain("not a domain"), /invalid_domain/);
  assert.throws(() => cleanIpv4("999.1.1.1"), /invalid_ipv4/);
});

test("Hostinger writes require the exact owner approval phrase", () => {
  assert.equal(WRITE_CONFIRMATION, "APPROVE HOSTINGER WRITE");
  assert.doesNotThrow(() => requireWriteConfirmation(WRITE_CONFIRMATION));
  assert.throws(() => requireWriteConfirmation("approve"), /write_confirmation_required/);
});

test("Hub bearer comparison is exact and timing-safe compatible", () => {
  assert.equal(safeTokenMatch("secret", "secret"), true);
  assert.equal(safeTokenMatch("secret", "Secret"), false);
  assert.equal(safeTokenMatch("short", "longer"), false);
  assert.equal(safeTokenMatch("", ""), false);
});

test("Hub Central extracts OpenAI text and action proposals without executing them", () => {
  const payload = {
    output: [
      { type: "message", content: [{ type: "output_text", text: "DNS is missing an A record." }] },
      { type: "function_call", call_id: "call_1", name: "set_a_record", arguments: "{\"domain\":\"donateworldz.com\",\"name\":\"@\",\"ip\":\"145.223.108.40\"}" }
    ]
  };
  assert.equal(extractOpenAIText(payload), "DNS is missing an A record.");
  assert.deepEqual(extractProposals(payload), [{
    call_id: "call_1",
    action: "set_a_record",
    arguments: { domain: "donateworldz.com", name: "@", ip: "145.223.108.40" }
  }]);
});
