// Plain rules with no database or network, so they are easy to test.
import type { Tier } from "./rules.ts";

// At most 10 submissions per user in any 24 hours (rolling), to cap model spend.
export const DAILY_SUBMISSION_LIMIT = 10;
export const SUBMISSION_WINDOW_MS = 24 * 60 * 60 * 1000;

export function submissionAllowed(submissionsInWindow: number) {
  return submissionsInWindow < DAILY_SUBMISSION_LIMIT;
}

export const REVIEW_STATUSES = [
  "queued",
  "reviewing",
  "awaiting_appsec",
  "awaiting_model_risk",
  "approved",
  "approved_with_conditions",
  "rejected",
  "changes_requested",
  "routed_to_committee",
  "failed",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

// Where a review goes once both models are done. Tier 4 is never approved in
// this app: it is routed to the review committee. Every other tier waits for
// AppSec first.
export function statusAfterReview(finalTier: Tier): ReviewStatus {
  return finalTier === 4 ? "routed_to_committee" : "awaiting_appsec";
}

// Step 12: at most 5 failed sign-ins per 15 minutes from one network address.
// After that, sign-in is refused (even with the right passcode) until the
// window has passed.
export const SIGN_IN_MAX_FAILURES = 5;
export const SIGN_IN_WINDOW_MS = 15 * 60 * 1000;

export function signInAllowed(recentFailures: number) {
  return recentFailures < SIGN_IN_MAX_FAILURES;
}

// Request size limits, checked before a body is parsed.
export const MAX_SUBMISSION_BYTES = 64 * 1024;
export const MAX_DECISION_BYTES = 16 * 1024;
