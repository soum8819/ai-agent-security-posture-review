// Slice C: who may see a review, and how review data is put into plain words.
// No database. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AgentProfile } from "../lib/profile-schema.ts";
import { canViewReview, reviewScope } from "../lib/review-access.ts";
import {
  RULE_REQUIREMENTS,
  SEVERITY_WORDS,
  STATUS_TEXT,
  VERDICT_TEXT,
  contrastRatio,
  looksLikeJson,
  modelLabel,
  quoteSource,
  reviewCost,
  splitFindings,
  tierSentence,
  triggeringFields,
} from "../lib/review-view.ts";
import { USERS } from "../lib/users.ts";

const user = (role: string) => USERS.find((u) => u.role === role)!;

test("a Submitter sees only their own reviews; everyone else sees all", () => {
  const submitter = user("submitter");
  assert.equal(canViewReview(submitter, { submitter_id: submitter.id }), true);
  assert.equal(canViewReview(submitter, { submitter_id: "someone-else" }), false);
  for (const role of ["appsec_reviewer", "model_risk_reviewer", "auditor"]) {
    assert.equal(canViewReview(user(role), { submitter_id: "someone-else" }), true);
    assert.equal(reviewScope(user(role)).kind, "all");
  }
  assert.deepEqual(reviewScope(submitter), { kind: "submitter", submitterId: submitter.id });
});

test("every severity says its word; badge contrast is checked in both modes by tests/design.test.ts", () => {
  for (const sev of ["critical", "high", "medium", "low"] as const) assert.ok(SEVERITY_WORDS[sev].length > 0);
  assert.ok(Math.abs(contrastRatio("#000000", "#ffffff") - 21) < 0.01); // the formula itself
});

test("contested findings come first, then the rest, each most severe first", () => {
  const f = (severity: "low" | "high" | "critical" | "medium", contested: boolean) => ({ severity, contested });
  const { contested, others } = splitFindings([f("low", false), f("high", true), f("critical", false), f("critical", true), f("medium", false)]);
  assert.deepEqual(contested.map((x) => x.severity), ["critical", "high"]);
  assert.deepEqual(others.map((x) => x.severity), ["critical", "medium", "low"]);
});

test("the tier sentence names who set the final tier", () => {
  assert.equal(tierSentence(2, ["rule", "reviewer", "checker"]), "All three agree on tier 2, so the final tier is 2.");
  assert.match(tierSentence(2, ["checker"]), /set by the checker model\./);
  assert.match(tierSentence(4, ["rule", "reviewer"]), /set by the rules and the reviewer model\./);
});

test("model names and providers are shown plainly", () => {
  assert.deepEqual(modelLabel("openai/gpt-5-mini"), { provider: "OpenAI", model: "gpt-5-mini" });
  assert.deepEqual(modelLabel("google/gemini-2.5-flash"), { provider: "Google", model: "gemini-2.5-flash" });
});

test("a rule's triggering fields are shown as plain values, not JSON", () => {
  const profile = {
    tools: [{ name: "Payments API", permissions: ["move_money"] }],
    humanConfirmsActions: false,
    credentials: "shared_token",
  } as unknown as AgentProfile;
  assert.deepEqual(triggeringFields(profile, "tools.permissions, humanConfirmsActions"), [
    { field: "tools.permissions", label: "Tools and permissions", values: ["Payments API: Move money"] },
    { field: "humanConfirmsActions", label: "A person confirms its actions", values: ["No"] },
  ]);
  assert.deepEqual(triggeringFields(profile, "credentials")[0].values, ["A shared token"]);
});

test("cost is shown only when both model costs are stored", () => {
  assert.equal(reviewCost({ costUsd: null }, { costUsd: 0.004 }), null);
  assert.deepEqual(reviewCost({ costUsd: 0.003 }, { costUsd: 0.005 }), { total: 0.008, reviewer: 0.003, checker: 0.005 });
});

test("every rule has a plain requirement, and no screen text uses an em dash", () => {
  for (const id of ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"]) assert.ok(RULE_REQUIREMENTS[id]);
  const all = [STATUS_TEXT, RULE_REQUIREMENTS, VERDICT_TEXT, SEVERITY_WORDS].flatMap((m) => Object.values(m));
  for (const text of all) assert.equal(text.includes("\u2014"), false, text);
});

test("JSON-looking text is detected, and a field excerpt names its field", () => {
  for (const t of ['"memory": "session"', '"untrustedInputs": [ "chat" ]', '{"enabled": true}', '"tools": [ { "name": "Wiki"']) {
    assert.equal(looksLikeJson(t), true, t);
  }
  for (const t of ["It searches the published HR policy library.", 'The bot says "hello".', "Logs: none (see SIEM)"]) {
    assert.equal(looksLikeJson(t), false, t);
  }
  assert.deepEqual(quoteSource('"memory": "session"'), { jsonLike: true, field: "Memory" });
  assert.deepEqual(quoteSource('"logging": {"enabled": true}'), { jsonLike: true, field: "Logging" });
  assert.deepEqual(quoteSource("Reads vendor invoices from an email inbox"), { jsonLike: false, field: null });
});

test("in model text, only fragments verbatim from the profile count as quotes", async () => {
  const { profileExcerpts } = await import("../lib/evidence.ts");
  const profile = {
    id: "p-1", name: "Bot", owner: "Team", businessPurpose: "Answer.", dataReads: ["internal"],
    tools: [{ name: "Wiki", permissions: ["read"] }], humanConfirmsActions: false, untrustedInputs: ["chat"],
    credentials: "own_scoped_token", model: { provider: "X", name: "y" }, memory: "session",
    logging: { enabled: true }, killSwitch: { available: true }, description: "Answers questions.",
  } as unknown as AgentProfile;
  const parts = profileExcerpts('The profile states "untrustedInputs": ["chat"] and "memory": "forever".', profile);
  assert.deepEqual(parts.filter((p) => p.excerpt).map((p) => p.text), ['"untrustedInputs": ["chat"]']);
  assert.ok(parts.some((p) => !p.excerpt && p.text.includes('"memory": "forever"')));
  assert.equal(parts.map((p) => p.text).join(""), 'The profile states "untrustedInputs": ["chat"] and "memory": "forever".');
});

test("only the review's own submitter may resubmit, after Request changes, once", async () => {
  const { canResubmit } = await import("../lib/review-access.ts");
  const submitter = user("submitter");
  const mine = { submitter_id: submitter.id, status: "changes_requested" };
  assert.equal(canResubmit(submitter, mine, false), true);
  assert.equal(canResubmit(submitter, mine, true), false); // already resubmitted
  assert.equal(canResubmit(submitter, { ...mine, status: "approved" }, false), false);
  assert.equal(canResubmit(submitter, { ...mine, submitter_id: "someone-else" }, false), false);
  assert.equal(canResubmit(user("appsec_reviewer"), { ...mine, submitter_id: user("appsec_reviewer").id }, false), false);
});
