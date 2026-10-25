// Slice B: the daily submission limit and where a finished review goes.
// No database. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { DAILY_SUBMISSION_LIMIT, statusAfterReview, submissionAllowed } from "../lib/limits.ts";

test("a user may submit 10 times in 24 hours, not 11", () => {
  assert.equal(DAILY_SUBMISSION_LIMIT, 10);
  assert.equal(submissionAllowed(0), true);
  assert.equal(submissionAllowed(9), true); // this would be the 10th
  assert.equal(submissionAllowed(10), false); // this would be the 11th
});

test("tier 4 is routed to the committee; other tiers wait for AppSec", () => {
  assert.equal(statusAfterReview(4), "routed_to_committee");
  for (const t of [1, 2, 3] as const) assert.equal(statusAfterReview(t), "awaiting_appsec");
});
