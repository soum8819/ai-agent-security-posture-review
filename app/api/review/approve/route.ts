// TEMPORARY SPIKE (build step 5): sends one approval or rejection to a
// paused review. Local only. Approver identity is self-declared for now.
import { HookNotFoundError } from "workflow/errors";
import { localOnly } from "@/lib/local-only";
import { reviewHook, reviewToken } from "@/workflows/review";

const REVIEW_ID = /^[a-z0-9-]{3,40}$/;
const APPROVER = /^[A-Za-z0-9._-]{1,64}$/;

export async function POST(request: Request) {
  const blocked = localOnly();
  if (blocked) return blocked;

  const body = await request.json().catch(() => null);
  const { reviewId, approver, decision, reason } = body ?? {};

  if (typeof reviewId !== "string" || !REVIEW_ID.test(reviewId)) {
    return Response.json(
      { error: "reviewId must be 3 to 40 lowercase letters, digits or dashes" },
      { status: 400 },
    );
  }
  if (typeof approver !== "string" || !APPROVER.test(approver)) {
    return Response.json(
      { error: "approver must be 1 to 64 letters, digits, dots, dashes or underscores" },
      { status: 400 },
    );
  }
  if (decision !== "approved" && decision !== "rejected") {
    return Response.json(
      { error: "decision must be approved or rejected" },
      { status: 400 },
    );
  }
  if (reason !== undefined && (typeof reason !== "string" || reason.length > 500)) {
    return Response.json(
      { error: "reason must be text of at most 500 characters" },
      { status: 400 },
    );
  }

  try {
    await reviewHook.resume(reviewToken(reviewId), {
      // Lowercase so "Alice" and "alice" count as the same person.
      approver: approver.toLowerCase(),
      decision,
      ...(reason ? { reason } : {}),
    });
    return Response.json({ delivered: true });
  } catch (error) {
    if (HookNotFoundError.is(error)) {
      return Response.json(
        { error: "No paused review with that id" },
        { status: 404 },
      );
    }
    console.error(
      "[review/approve] resume failed:",
      error instanceof Error ? error.message : String(error),
    );
    return Response.json({ error: "Could not send the approval" }, { status: 500 });
  }
}
