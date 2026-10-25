// Slice D: every refusal of the decision check, and the allowed paths for each
// tier. No database. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDecision, stagesForTier, type DecisionInput, type ExistingDecision } from "../lib/authz.ts";
import type { User } from "../lib/users.ts";
import { USERS } from "../lib/users.ts";

const byRole = (role: string) => USERS.find((u) => u.role === role)!;
const appsec = byRole("appsec_reviewer");
const modelRisk = byRole("model_risk_reviewer");
const submitter = byRole("submitter");
const auditor = byRole("auditor");

const review = (tier: 1 | 2 | 3 | 4, status = "awaiting_appsec") =>
  ({ status, final_tier: tier, submitter_id: submitter.id }) as const;

const input = (over: Partial<DecisionInput> = {}): DecisionInput => ({
  stage: "appsec",
  outcome: "approved",
  note: "Reviewed the findings.",
  resolutions: [],
  ...over,
});

const run = (over: { user?: User | null; review?: ReturnType<typeof review> | Record<string, unknown>; decisions?: ExistingDecision[]; contestedIds?: string[]; input?: DecisionInput }) =>
  checkDecision({
    user: over.user === undefined ? appsec : over.user,
    review: (over.review ?? review(1)) as never,
    decisions: over.decisions ?? [],
    contestedIds: over.contestedIds ?? [],
    input: over.input ?? input(),
  });

const refused = (r: ReturnType<typeof run>, httpStatus: number, words: RegExp) => {
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.httpStatus, httpStatus);
    assert.match(r.reason, words);
  }
};

test("tiers have the agreed stages", () => {
  assert.deepEqual(stagesForTier(1), ["appsec"]);
  assert.deepEqual(stagesForTier(2), ["appsec"]);
  assert.deepEqual(stagesForTier(3), ["appsec", "model_risk"]);
  assert.deepEqual(stagesForTier(4), []);
});

test("tier 1 and 2: one AppSec decision finishes the review", () => {
  for (const tier of [1, 2] as const) {
    assert.deepEqual(run({ review: review(tier) }), { ok: true, nextStatus: "approved" });
    assert.deepEqual(run({ review: review(tier), input: input({ outcome: "approved_with_conditions", conditions: "Add a tested kill switch." }) }), { ok: true, nextStatus: "approved_with_conditions" });
    assert.deepEqual(run({ review: review(tier), input: input({ outcome: "rejected" }) }), { ok: true, nextStatus: "rejected" });
    assert.deepEqual(run({ review: review(tier), input: input({ outcome: "changes_requested" }) }), { ok: true, nextStatus: "changes_requested" });
  }
});

test("tier 3: AppSec first, then Model Risk; conditions carry through", () => {
  assert.deepEqual(run({ review: review(3) }), { ok: true, nextStatus: "awaiting_model_risk" });
  const afterAppsec: ExistingDecision[] = [{ stage: "appsec", decider_id: appsec.id, outcome: "approved" }];
  const mr = (over: Partial<DecisionInput> = {}, decisions = afterAppsec) =>
    run({ user: modelRisk, review: review(3, "awaiting_model_risk"), decisions, input: input({ stage: "model_risk", ...over }) });
  assert.deepEqual(mr(), { ok: true, nextStatus: "approved" });
  assert.deepEqual(mr({}, [{ ...afterAppsec[0], outcome: "approved_with_conditions" }]), { ok: true, nextStatus: "approved_with_conditions" });
  assert.deepEqual(mr({ outcome: "rejected" }), { ok: true, nextStatus: "rejected" });
});

test("refused: not signed in, wrong role, Auditor, own submission", () => {
  refused(run({ user: null }), 401, /Sign in/);
  refused(run({ user: modelRisk }), 403, /Only an AppSec Reviewer/);
  refused(run({ user: auditor }), 403, /Only an AppSec Reviewer/);
  refused(run({ user: submitter }), 403, /Only an AppSec Reviewer/);
  refused(run({ review: { ...review(1), submitter_id: appsec.id } }), 403, /own submission/);
});

test("refused: tier 4, not waiting, wrong stage, stage missing for the tier", () => {
  refused(run({ review: review(4, "routed_to_committee") }), 409, /committee/);
  refused(run({ review: review(1, "reviewing") }), 409, /not waiting/);
  refused(run({ review: review(1, "approved") }), 409, /not waiting/);
  refused(run({ review: review(3), user: modelRisk, input: input({ stage: "model_risk" }) }), 409, /waiting for an AppSec decision/);
  refused(run({ review: review(2, "awaiting_model_risk"), user: modelRisk, input: input({ stage: "model_risk" }) }), 409, /tier 2 review has no Model Risk/);
});

test("refused: a stage already decided (the double click)", () => {
  refused(run({ decisions: [{ stage: "appsec", decider_id: appsec.id, outcome: "approved" }] }), 409, /already been decided/);
});

test("refused: the same person deciding both tier 3 stages", () => {
  const both: User = { ...modelRisk, id: appsec.id }; // one person holding both roles
  refused(
    run({ user: both, review: review(3, "awaiting_model_risk"), decisions: [{ stage: "appsec", decider_id: appsec.id, outcome: "approved" }], input: input({ stage: "model_risk" }) }),
    403,
    /different person/,
  );
});

test("refused: missing note, too long a note, missing conditions", () => {
  refused(run({ input: input({ note: "   " }) }), 400, /note is required/);
  refused(run({ input: input({ note: "x".repeat(2001) }) }), 400, /at most 2000/);
  refused(run({ input: input({ outcome: "approved_with_conditions" }) }), 400, /conditions written down/);
  refused(run({ input: input({ outcome: "approved_with_conditions", conditions: "  " }) }), 400, /conditions written down/);
});

test("contested findings: each must be resolved before approving; dismissal needs a reason", () => {
  const c = { contestedIds: ["F2"] };
  refused(run({ ...c }), 400, /must be accepted or dismissed/);
  refused(run({ ...c, input: input({ resolutions: [{ findingId: "F2", resolution: "dismissed" }] }) }), 400, /needs a reason/);
  refused(run({ ...c, input: input({ resolutions: [{ findingId: "F9", resolution: "accepted" }] }) }), 400, /not contested/);
  refused(run({ ...c, input: input({ resolutions: [{ findingId: "F2", resolution: "accepted" }, { findingId: "F2", resolution: "accepted" }] }) }), 400, /twice/);
  assert.equal(run({ ...c, input: input({ resolutions: [{ findingId: "F2", resolution: "accepted" }] }) }).ok, true);
  assert.equal(run({ ...c, input: input({ resolutions: [{ findingId: "F2", resolution: "dismissed", reason: "The token is scoped." }] }) }).ok, true);
  // Rejecting or requesting changes does not need resolutions first.
  assert.equal(run({ ...c, input: input({ outcome: "rejected" }) }).ok, true);
  assert.equal(run({ ...c, input: input({ outcome: "changes_requested" }) }).ok, true);
});

test("refused: unknown stage or decision", () => {
  refused(run({ input: input({ outcome: "maybe" as never }) }), 400, /Unknown decision/);
  refused(run({ input: input({ stage: "board" as never }) }), 400, /Unknown decision stage/);
});

test("the decision panel is offered to exactly the people the route accepts", async () => {
  const { stageYouMayDecide } = await import("../lib/authz.ts");
  const args = (user: User | null, r = review(3), decisions: ExistingDecision[] = []) => ({ user, review: r as never, decisions, contestedIds: ["F2"] });
  assert.equal(stageYouMayDecide(args(appsec)), "appsec");
  for (const u of [modelRisk, auditor, submitter, null]) assert.equal(stageYouMayDecide(args(u)), null);
  const afterAppsec: ExistingDecision[] = [{ stage: "appsec", decider_id: appsec.id, outcome: "approved" }];
  assert.equal(stageYouMayDecide(args(modelRisk, review(3, "awaiting_model_risk"), afterAppsec)), "model_risk");
  assert.equal(stageYouMayDecide(args(appsec, review(3, "awaiting_model_risk"), afterAppsec)), null);
  assert.equal(stageYouMayDecide(args(appsec, review(4, "routed_to_committee"))), null);
  assert.equal(stageYouMayDecide(args(appsec, { ...review(1), submitter_id: appsec.id })), null);
});
