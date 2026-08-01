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
