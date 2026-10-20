// TEMPORARY SPIKE (build step 5): starts a review workflow. Local only.
import { start } from "workflow/api";
import { localOnly } from "@/lib/local-only";
import { reviewWorkflow, type Tier } from "@/workflows/review";

const REVIEW_ID = /^[a-z0-9-]{3,40}$/;

export async function POST(request: Request) {
  const blocked = localOnly();
  if (blocked) return blocked;

  const body = await request.json().catch(() => null);
  const reviewId = body?.reviewId;
  const tier = body?.tier;

  if (typeof reviewId !== "string" || !REVIEW_ID.test(reviewId)) {
    return Response.json(
      { error: "reviewId must be 3 to 40 lowercase letters, digits or dashes" },
      { status: 400 },
    );
  }
  if (tier !== 2 && tier !== 3) {
    return Response.json(
      { error: "tier must be 2 or 3 (tiers 1 and 4 are not handled yet)" },
      { status: 400 },
    );
  }

  try {
    const run = await start(reviewWorkflow, [{ reviewId, tier: tier as Tier }]);
    return Response.json({ runId: run.runId, reviewId, tier });
  } catch (error) {
    console.error(
      "[review/start] failed:",
      error instanceof Error ? error.message : String(error),
    );
    return Response.json({ error: "Could not start the review" }, { status: 500 });
  }
}
