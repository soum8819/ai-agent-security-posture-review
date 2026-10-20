// TEMPORARY SPIKE (build step 5): proves a review can start, pause on a hook,
// and resume when approvals arrive. No models, UI or database yet.
import { defineHook } from "workflow";

export type Tier = 2 | 3;

export type Approval = {
  approver: string;
  decision: "approved" | "rejected";
  reason?: string;
};

export const reviewHook = defineHook<Approval>();

export function reviewToken(reviewId: string) {
  return `review-${reviewId}`;
}

// Different people needed to approve each tier.
const REQUIRED_APPROVERS: Record<Tier, number> = { 2: 1, 3: 2 };

export async function reviewWorkflow({
  reviewId,
  tier,
}: {
  reviewId: string;
  tier: Tier;
}) {
  "use workflow";

  const approvers: string[] = [];
  let rejection: { approver: string; reason?: string } | undefined;

  {
    using hook = reviewHook.create({ token: reviewToken(reviewId) });

    // Another run already owns this review id: stop instead of competing.
    const conflict = await hook.getConflict();
    if (conflict) {
      return { reviewId, tier, status: "duplicate", existingRunId: conflict.runId };
    }

    await recordSubmission(reviewId, tier);
    await fakeAnalysis(reviewId);

    for await (const approval of hook) {
      if (approval.decision === "rejected") {
        rejection = { approver: approval.approver, reason: approval.reason };
        break;
      }
      // The same person approving twice counts once.
      if (!approvers.includes(approval.approver)) {
        approvers.push(approval.approver);
      }
      if (approvers.length >= REQUIRED_APPROVERS[tier]) {
        break;
      }
    }
  } // Hook disposed here, so the token is released.

  const status = rejection ? "rejected" : "approved";
  await recordDecision(reviewId, status);
  return { reviewId, tier, status, approvers, rejection };
}

async function recordSubmission(reviewId: string, tier: Tier) {
  "use step";
  const receivedAt = new Date().toISOString();
  console.log(`[review] ${reviewId} submitted at tier ${tier}`);
  return { reviewId, tier, receivedAt };
}

async function fakeAnalysis(reviewId: string) {
  "use step";
  return `Placeholder analysis for ${reviewId}. No model was called.`;
}

async function recordDecision(reviewId: string, status: "approved" | "rejected") {
  "use step";
  const decidedAt = new Date().toISOString();
  console.log(`[review] ${reviewId} ${status}`);
  return { reviewId, status, decidedAt };
}
