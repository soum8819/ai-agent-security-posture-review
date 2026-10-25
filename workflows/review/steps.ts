// The durable steps of a review. Each runs outside the web request with full
// Node.js access; once a step finishes, its result is kept, so a later failure
// never repeats a paid model call.
import { FatalError } from "workflow";
import { analyzeProfile, type AnalysisResult } from "../../lib/analyze.ts";
import { crosscheckReview, type CrosscheckResult } from "../../lib/crosscheck.ts";
import { statusAfterReview } from "../../lib/limits.ts";
import { agentProfileSchema } from "../../lib/profile-schema.ts";
import { combineReview } from "../../lib/review.ts";
import { getReview, markFailed, markReviewing, saveReviewResult } from "../../lib/store.ts";

async function loadProfile(reviewId: string) {
  const found = await getReview(reviewId);
  if (!found) throw new FatalError(`review ${reviewId} not found`);
  return agentProfileSchema.parse(found.review.profile);
}

export async function startReviewStep(reviewId: string, workflowRunId: string) {
  "use step";
  await markReviewing(reviewId, workflowRunId);
}

// Model 1: rules plus the reviewer model. Only the profile goes to the model.
export async function reviewerStep(reviewId: string): Promise<AnalysisResult> {
  "use step";
  return analyzeProfile(await loadProfile(reviewId));
}
// One retry at most, so a failure costs at most one extra paid call.
reviewerStep.maxRetries = 1;

// Model 2: the checker sees the profile and model 1's findings.
export async function checkerStep(reviewId: string, first: AnalysisResult): Promise<CrosscheckResult> {
  "use step";
  return crosscheckReview(await loadProfile(reviewId), first.findings);
}
checkerStep.maxRetries = 1;

export async function saveResultStep(reviewId: string, first: AnalysisResult, check: CrosscheckResult) {
  "use step";
  const record = combineReview(first, check);
  const status = statusAfterReview(record.tiers.final);
  await saveReviewResult(reviewId, record, status);
  return { status, finalTier: record.tiers.final };
}

export async function failStep(reviewId: string, message: string) {
  "use step";
  await markFailed(reviewId, message);
}

// After a pause: read where the review stands. The decision was already
// recorded in the database by the approval route; the database, not the
// resume message, decides what happens next.
export async function reviewStatusStep(reviewId: string) {
  "use step";
  const found = await getReview(reviewId);
  if (!found) throw new FatalError(`review ${reviewId} not found`);
  return found.review.status;
}
