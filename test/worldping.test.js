const test = require("node:test");
const assert = require("node:assert/strict");
const { commercialConfig, isGroup, registerWorldPingHandlers } = require("../src/worldping");

test("WorldPing uses the locked SOL commercial pricing", () => {
  const config = commercialConfig({});
  assert.equal(config.rentSol, 0.3);
  assert.equal(config.rentToOwnSol, 0.5);
  assert.equal(config.rentToOwnMonths, 12);
  assert.equal(config.ownSol, 4.5);
  assert.equal(config.wallet, "Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u");
});

test("WorldPing is limited to Telegram groups", () => {
  assert.equal(isGroup({ chat: { type: "supergroup" } }), true);
  assert.equal(isGroup({ chat: { type: "group" } }), true);
  assert.equal(isGroup({ chat: { type: "private" } }), false);
});


test("Permanent Owner bypasses WorldPing licence and Telegram admin checks", async () => {
  const handlers = [];
  const sent = [];
  let getChatMemberCalls = 0;
  let licenceLookups = 0;

  const bot = {
    onText(regex, handler) {
      handlers.push({ regex, handler });
    },
    async sendMessage(chatId, text) {
      sent.push({ chatId, text });
      return { message_id: 1 };
    },
    async getChatMember() {
      getChatMemberCalls += 1;
      throw new Error("owner must not be forced through Telegram admin verification");
    }
  };

  const supabase = {
    from(table) {
      if (table === "zed_group_licences") {
        licenceLookups += 1;
        throw new Error("owner must not be forced through licence verification");
      }
      assert.equal(table, "zed_group_worldping_settings");
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: { mode: "admins_only" }, error: null };
                }
              };
            }
          };
        }
      };
    }
  };

  registerWorldPingHandlers({
    bot,
    config: { ownerTelegramId: "12345" },
    supabase,
    env: {}
  });

  const worldPing = handlers.find(({ regex }) => regex.test("/worldping test"));
  assert.ok(worldPing, "WorldPing handler must be registered");

  const message = {
    chat: { id: -1001, type: "supergroup" },
    from: { id: 12345, username: "owner" }
  };
  await worldPing.handler(message, ["/worldping test", "test"]);

  assert.equal(licenceLookups, 0);
  assert.equal(getChatMemberCalls, 0);
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /WORLD PING/);
  assert.match(sent[0].text, /test/);
});
