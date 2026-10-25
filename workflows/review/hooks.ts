// The pause points of a review. Kept apart from the steps so the approval
// route (slice D) can resume a review without loading any model code.
import { defineHook } from "workflow";

// The payload carries only the id of a decision already saved in the
// database; the database record, not this payload, is the source of truth.
export const appsecHook = defineHook<{ decisionId: string }>();

export function appsecToken(reviewId: string) {
  return `appsec-${reviewId}`;
}

// Tier 3 only: the second pause, for the Model Risk decision after AppSec.
export const modelRiskHook = defineHook<{ decisionId: string }>();

export function modelRiskToken(reviewId: string) {
  return `model-risk-${reviewId}`;
}
