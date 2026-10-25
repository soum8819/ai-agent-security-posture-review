// The real review workflow (step 10, slice B): rules and model 1, model 2,
// save the result, then pause for an AppSec decision, and for tier 3 a second
// pause for Model Risk. Tier 4 is never approved here: it ends as routed to
// committee. Decisions live in the database; a pause only waits for them.
// Every step before the AppSec pause is unchanged since slice B, so runs
// paused under that code replay the same way.
import { getWorkflowMetadata } from "workflow";
import { appsecHook, appsecToken, modelRiskHook, modelRiskToken } from "./hooks";
import {
  checkerStep,
  failStep,
  reviewStatusStep,
  reviewerStep,
  saveResultStep,
  startReviewStep,
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
    await hook;
  } // Hook released here, so the AppSec stage cannot be resumed twice.

  const afterAppsec = await reviewStatusStep(reviewId);
  if (afterAppsec !== "awaiting_model_risk") {
    return { reviewId, status: afterAppsec };
  }

  {
    using hook = modelRiskHook.create({ token: modelRiskToken(reviewId) });
    await hook;
  }

  return { reviewId, status: await reviewStatusStep(reviewId) };
}
