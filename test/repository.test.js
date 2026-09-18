const test = require("node:test");
const assert = require("node:assert/strict");
const { createRepository } = require("../src/repository");

test("repository converts a unique violation into a duplicate mission claim", async () => {
  const supabase = {
    from(table) {
      assert.equal(table, "mission_submissions");
      return {
        insert(payload) {
          assert.equal(payload.mission_id, 7);
          assert.equal(payload.telegram_id, 123);
          return {
            select() {
              return {
                async single() {
                  return { data: null, error: { code: "23505" } };
                }
              };
            }
          };
        }
      };
    }
  };

  const repository = createRepository(supabase);
  const result = await repository.submitMissionClaim({
    missionId: 7,
    telegramId: 123,
    completionText: "✅ DONE"
  });
  assert.deepEqual(result, { duplicate: true, submission: null });
});

test("repository calls the secure approval RPC with the reviewer ID", async () => {
  let call;
  const supabase = {
    rpc(name, args) {
      call = { name, args };
      return {
        async single() {
          return {
            data: { submission_id: 9, telegram_id: 123, awarded_points: 30 },
            error: null
          };
        }
      };
    }
  };

  const repository = createRepository(supabase);
  const result = await repository.approveSubmission(9, 456);
  assert.deepEqual(call, {
    name: "approve_mission_completion",
    args: { p_submission_id: 9, p_reviewer_telegram_id: 456 }
  });
  assert.equal(result.awarded_points, 30);
});

test("repository maps the transactional points RPC total", async () => {
  let call;
  const supabase = {
    rpc(name, args) {
      call = { name, args };
      return {
        async single() {
          return { data: { adjustment: -10, total_points: 90 }, error: null };
        }
      };
    }
  };

  const repository = createRepository(supabase);
  const result = await repository.adjustPoints(123, -10, 456);
  assert.deepEqual(call, {
    name: "adjust_legend_points",
    args: {
      p_target_telegram_id: 123,
      p_amount: -10,
      p_admin_telegram_id: 456
    }
  });
  assert.equal(result.new_points, 90);
});

test("repository loads pending submission details without an embedded users relationship", async () => {
  const submissions = [
    { id: 16, mission_id: 8, telegram_id: 7615025841, status: "pending", submitted_at: "2026-08-01T08:07:00Z" }
  ];
  const calls = [];
  const supabase = {
    from(table) {
      calls.push(table);
      if (table === "mission_submissions") {
        return {
          select(columns) {
            assert.equal(columns, "*");
            return {
              eq(column, value) {
                assert.deepEqual([column, value], ["status", "pending"]);
                return {
                  order(column, options) {
                    assert.deepEqual([column, options], ["submitted_at", { ascending: false }]);
                    return {
                      async limit(value) {
                        assert.equal(value, 20);
                        return { data: submissions, error: null };
                      }
                    };
                  }
                };
              }
            };
          }
        };
      }
      if (table === "missions") {
        return {
          select(columns) {
            assert.equal(columns, "id,title");
            return {
              async in(column, values) {
                assert.deepEqual([column, values], ["id", [8]]);
                return { data: [{ id: 8, title: "CryptoWorldz X Raaiiidd" }], error: null };
              }
            };
          }
        };
      }
      assert.equal(table, "users");
      return {
        select(columns) {
          assert.equal(columns, "telegram_id,username,first_name");
          return {
            async in(column, values) {
              assert.deepEqual([column, values], ["telegram_id", [7615025841]]);
              return { data: [{ telegram_id: 7615025841, username: "stepper", first_name: "Stepper" }], error: null };
            }
          };
        }
      };
    }
  };

  const repository = createRepository(supabase);
  const result = await repository.listPending();
  assert.deepEqual(calls, ["mission_submissions", "missions", "users"]);
  assert.equal(result[0].missions.title, "CryptoWorldz X Raaiiidd");
  assert.equal(result[0].users.first_name, "Stepper");
});
