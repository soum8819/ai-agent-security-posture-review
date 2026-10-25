// Submit a profile for review. Signed-in Submitters only, at most 10 per
// rolling 24 hours. Saves the review, starts the durable workflow and returns
// at once with the review id; the models run in the workflow, not here.
import { start } from "workflow/api";
import { currentUser } from "@/lib/auth";
import { describeDbError } from "@/lib/db";
import { DAILY_SUBMISSION_LIMIT, MAX_SUBMISSION_BYTES, submissionAllowed } from "@/lib/limits";
import { readJsonBody } from "@/lib/request-body";
import { can } from "@/lib/permissions";
import { canResubmit } from "@/lib/review-access";
import { agentProfileSchema } from "@/lib/profile-schema";
import { countRecentSubmissions, createReview, getResubmission, getReview, markFailed } from "@/lib/store";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
import { reviewWorkflow } from "@/workflows/review";

export async function POST(request: Request) {
  // Size first, so an oversized request is refused before anything else.
  const read = await readJsonBody(request, MAX_SUBMISSION_BYTES);
  if (!read.ok) return Response.json({ error: `The submission is too large (limit ${MAX_SUBMISSION_BYTES / 1024} KB)` }, { status: 413 });

  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (!can(user.role, "submit_profile")) {
    return Response.json({ error: "Only Submitters can submit profiles" }, { status: 403 });
  }

  const body = read.value as { profile?: unknown; supersedes?: unknown } | null;
  const parsed = agentProfileSchema.safeParse(body?.profile);
  if (!parsed.success) {
    return Response.json(
      { error: "The profile does not match the schema", issues: parsed.error.issues.map((i) => `${i.path.join(".") || "profile"}: ${i.message}`) },
      { status: 400 },
    );
  }

  // A resubmission must name a review this user may resubmit.
  const supersedes = body?.supersedes ?? null;
  if (supersedes !== null) {
    if (typeof supersedes !== "string" || !UUID.test(supersedes)) {
      return Response.json({ error: "The review being resubmitted was not found" }, { status: 404 });
    }
    const old = await getReview(supersedes);
    if (!old || old.review.submitter_id !== user.id) {
      return Response.json({ error: "The review being resubmitted was not found" }, { status: 404 });
    }
    if (!canResubmit(user, old.review, (await getResubmission(supersedes)) !== null)) {
      return Response.json(
        { error: "Only a review with changes requested can be resubmitted, and only once" },
        { status: 409 },
      );
    }
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
    await createReview({ id: reviewId, submitter: { id: user.id, role: user.role }, profile: parsed.data, supersedes });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return Response.json({ error: "This review has already been resubmitted" }, { status: 409 });
    }
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
