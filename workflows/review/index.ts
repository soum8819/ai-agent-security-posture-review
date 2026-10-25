// The real review workflow (step 10, slice B): rules and model 1, model 2,
// save the result, then pause for an AppSec decision. Tier 4 is never
// approved here: it ends as routed to committee. The Tier 3 Model Risk pause
// is a separate, later step.
import { getWorkflowMetadata } from "workflow";
import { appsecHook, appsecToken } from "./hooks";
import {
  checkerStep,
  failStep,
  reviewerStep,
  saveResultStep,
  startReviewStep,
  workflowResumedStep,
} from "./steps";

export async function reviewWorkflow(reviewId: string) {
  "use workflow";
  const { workflowRunId } = getWorkflowMetadata();
  await startReviewStep(reviewId, workflowRunId);

  let saved: Awaited<ReturnType<typeof saveResultStep>>;
  try {
    const first = await reviewerStep(reviewId);
    const check = await checkerStep(reviewId, first);
    saved = await saveResultStep(reviewId, first, check);
  } catch (error) {
    await failStep(reviewId, error instanceof Error ? error.message : String(error));
    return { reviewId, status: "failed" as const };
  }

  if (saved.status === "routed_to_committee") {
    return { reviewId, status: saved.status };
  }

  {
    using hook = appsecHook.create({ token: appsecToken(reviewId) });
    const { decisionId } = await hook;
    await workflowResumedStep(reviewId, "appsec", decisionId);
  } // Hook released here, so the AppSec stage cannot be resumed twice.

  return { reviewId, status: "appsec_decided" as const };
}
