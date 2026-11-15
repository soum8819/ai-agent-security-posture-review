// Proves model-written text under the minimum length fails the review the way
// a schema failure does, and that real text passes. Calls no model.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { NoObjectGeneratedError } from "ai";
import {
  MIN_MODEL_TEXT_LENGTH,
  checkerTextSchema,
  requireModelText,
  reviewerTextSchema,
} from "../lib/model-text.ts";

const call = {
  text: "{}",
  response: { id: "test", timestamp: new Date(0), modelId: "test-model" },
  usage: {} as Parameters<typeof requireModelText>[3]["usage"],
  finishReason: "stop" as const,
};

// A real reviewer summary from eval/runs/eval-v1-baseline, profile-02.
const realSummary =
  "This is a read-only HR FAQ agent (Tier 1) with session memory and chat input. Its weaknesses are a manual kill switch and an unpinned model version.";

const finding = {
  whyItMatters: "Untrusted chat text could steer the agent's answers.",
  recommendedControl: "Pin the model version.",
};

const review = (summary: string) => ({ summary, findings: [finding] });

const rejects = (output: unknown, field: RegExp) =>
  assert.throws(
    () => requireModelText(reviewerTextSchema, output, "reviewer", call),
    (e: unknown) => NoObjectGeneratedError.isInstance(e) && field.test(e.message),
  );

test('a summary of "x" is rejected', () => {
  rejects(review("x"), /reviewer model's text is under 20 characters in summary/);
});

test("a whitespace-only summary is rejected", () => {
  rejects(review(" \n\t   ".repeat(10)), /in summary/);
});

test("a normal summary is accepted", () => {
  assert.doesNotThrow(() => requireModelText(reviewerTextSchema, review(realSummary), "reviewer", call));
});

test("the boundary: exactly the minimum passes, one less fails, spaces do not count", () => {
  assert.equal(MIN_MODEL_TEXT_LENGTH, 20);
  const atMinimum = "a".repeat(MIN_MODEL_TEXT_LENGTH);
  const belowMinimum = "a".repeat(MIN_MODEL_TEXT_LENGTH - 1);
  assert.doesNotThrow(() => requireModelText(reviewerTextSchema, review(atMinimum), "reviewer", call));
  rejects(review(belowMinimum), /in summary/);
  rejects(review(`   ${belowMinimum}   `), /in summary/);
});

test("short finding text is rejected and every short field is named", () => {
  const output = { summary: realSummary, findings: [finding, { whyItMatters: "N/A", recommendedControl: "TBD" }] };
  rejects(output, /findings\.1\.whyItMatters, findings\.1\.recommendedControl/);
});

test("the checker's verdict reasons and summary are checked too", () => {
  const output = { summary: realSummary, verdicts: [{ reason: "ok" }], missedFindings: [] };
  assert.throws(
    () => requireModelText(checkerTextSchema, output, "checker", call),
    (e: unknown) => NoObjectGeneratedError.isInstance(e) && /checker model's text .* in verdicts\.0\.reason/.test(e.message),
  );
});
