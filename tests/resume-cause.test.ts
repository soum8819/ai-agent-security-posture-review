// Every reason a paused run was or was not resumed after a decision, and that
// none of them claims the run expired. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyResume } from "../lib/resume-cause.ts";

const base = { reviewEnvironment: "production", appEnvironment: "production", resumed: false, hookNotFound: false, otherError: null, run: null };

test("each cause is told apart", () => {
  assert.equal(classifyResume({ ...base, resumed: true }).cause, "resumed");
  // The production bug: a review created on a developer's computer, decided on the live site.
  assert.equal(classifyResume({ ...base, reviewEnvironment: "local", hookNotFound: true }).cause, "other_environment");
  assert.equal(classifyResume({ ...base, hookNotFound: true, run: { exists: true, status: "completed" } }).cause, "run_finished");
  assert.equal(classifyResume({ ...base, hookNotFound: true, run: { exists: true, status: "cancelled" } }).cause, "run_finished");
  assert.equal(classifyResume({ ...base, hookNotFound: true, run: { exists: false } }).cause, "run_not_found");
  assert.equal(classifyResume({ ...base, hookNotFound: true, run: { exists: true, status: "running" } }).cause, "hook_not_found");
  assert.equal(classifyResume({ ...base, otherError: "WorkflowAPIError" }).cause, "resume_error");
});

test("the other-environment message names where the run lives", () => {
  assert.match(classifyResume({ ...base, reviewEnvironment: "local" }).detail, /created on a developer's computer.*cannot be resumed from the live site/);
});

test("no message ever claims the run expired, and every failure says the decision stands", () => {
  const cases = [
    { ...base, reviewEnvironment: "local" },
    { ...base, hookNotFound: true, run: { exists: true, status: "completed" } },
    { ...base, hookNotFound: true, run: { exists: false } },
    { ...base, hookNotFound: true, run: { exists: true, status: "running" } },
    { ...base, otherError: "Error" },
  ];
  for (const c of cases) {
    const { detail } = classifyResume(c);
    assert.equal(/expire/i.test(detail), false, detail);
    assert.match(detail, /The decision stands\./);
  }
});
