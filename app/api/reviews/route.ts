// Submit a profile for review. Signed-in Submitters only, at most 10 per
// rolling 24 hours. Saves the review, starts the durable workflow and returns
// at once with the review id; the models run in the workflow, not here.
import { start } from "workflow/api";
import { currentUser } from "@/lib/auth";
import { describeDbError } from "@/lib/db";
import { DAILY_SUBMISSION_LIMIT, submissionAllowed } from "@/lib/limits";
import { can } from "@/lib/permissions";
import { agentProfileSchema } from "@/lib/profile-schema";
import { countRecentSubmissions, createReview, markFailed } from "@/lib/store";
import { reviewWorkflow } from "@/workflows/review";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (!can(user.role, "submit_profile")) {
    return Response.json({ error: "Only Submitters can submit profiles" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = agentProfileSchema.safeParse(body?.profile);
  if (!parsed.success) {
    return Response.json(
      { error: "The profile does not match the schema", issues: parsed.error.issues.map((i) => `${i.path.join(".") || "profile"}: ${i.message}`) },
      { status: 400 },
    );
  }

  let reviewId: string;
  try {
    if (!submissionAllowed(await countRecentSubmissions(user.id))) {
      return Response.json(
        { error: `Daily limit reached: at most ${DAILY_SUBMISSION_LIMIT} submissions in 24 hours` },
        { status: 429 },
      );
    }
    reviewId = crypto.randomUUID();
    await createReview({ id: reviewId, submitter: { id: user.id, role: user.role }, profile: parsed.data });
  } catch (error) {
    console.error("[reviews] could not save the review:", describeDbError(error));
    return Response.json({ error: "Could not save the review" }, { status: 500 });
  }

  try {
    await start(reviewWorkflow, [reviewId]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[reviews] could not start the workflow:", message);
    await markFailed(reviewId, `Could not start the review workflow: ${message}`).catch(() => {});
    return Response.json({ error: "Could not start the review", reviewId }, { status: 500 });
  }

  return Response.json({ reviewId }, { status: 201 });
}
