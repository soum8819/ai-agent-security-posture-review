// Record a decision on a review. The decision is checked by lib/authz.ts,
// written to the database first (with its audit event, in one statement), and
// only then is the paused workflow run resumed. If it cannot be resumed, the
// decision still stands, and the audit log and the page record the real cause
// (lib/resume-cause.ts).
import { getRun } from "workflow/api";
import { HookNotFoundError } from "workflow/errors";
import { currentUser } from "@/lib/auth";
import { checkDecision, OUTCOMES, STAGE_NAMES, STAGES, type DecisionInput } from "@/lib/authz";
import { appEnvironment, describeDbError } from "@/lib/db";
import { classifyResume, type RunState } from "@/lib/resume-cause";
import { canViewReview } from "@/lib/review-access";
import { getDecisions, getReview, recordDecision, recordWorkflowResume } from "@/lib/store";
import { appsecHook, appsecToken, modelRiskHook, modelRiskToken } from "@/workflows/review/hooks";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const fail = (status: number, error: string) => Response.json({ error }, { status });

// Only requests sent by this site's own pages are accepted.
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

function parseInput(body: unknown): DecisionInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (!STAGES.includes(b.stage as never) || !OUTCOMES.includes(b.outcome as never)) return null;
  if (typeof b.note !== "string") return null;
  if (b.conditions !== undefined && b.conditions !== null && typeof b.conditions !== "string") return null;
  const resolutions = Array.isArray(b.resolutions) ? b.resolutions : [];
  if (!resolutions.every((r) => r && typeof r === "object" && typeof (r as { findingId?: unknown }).findingId === "string")) return null;
  return {
    stage: b.stage as DecisionInput["stage"],
    outcome: b.outcome as DecisionInput["outcome"],
    note: b.note,
    conditions: typeof b.conditions === "string" ? b.conditions : undefined,
    resolutions: resolutions.map((r) => {
      const x = r as Record<string, unknown>;
      return {
        findingId: String(x.findingId),
        resolution: x.resolution as "accepted" | "dismissed",
        ...(typeof x.reason === "string" && x.reason.trim() ? { reason: x.reason.trim() } : {}),
      };
    }),
  };
}

export async function POST(request: Request, ctx: RouteContext<"/api/reviews/[id]/decisions">) {
  if (!sameOrigin(request)) return fail(403, "Decisions can only be made from the review page.");
  const user = await currentUser();
  if (!user) return fail(401, "Sign in required.");

  const { id } = await ctx.params;
  if (!UUID.test(id)) return fail(404, "Review not found.");
  const found = await getReview(id);
  // Same rule as the review page: if you cannot see it, it does not exist.
  if (!found || !canViewReview(user, found.review) || !found.result) return fail(404, "Review not found.");

  const input = parseInput(await request.json().catch(() => null));
  if (!input) return fail(400, "The decision is incomplete.");

  const decisions = await getDecisions(id);
  const contestedIds = found.result.findings.filter((f) => f.contested).map((f) => f.id);
  const check = checkDecision({ user, review: found.review, decisions, contestedIds, input });
  if (!check.ok) return fail(check.httpStatus, check.reason);

  let decisionId: string | null;
  try {
    decisionId = await recordDecision({
      reviewId: id,
      expectedStatus: found.review.status,
      nextStatus: check.nextStatus,
      stage: input.stage,
      decider: { id: user.id, role: user.role },
      outcome: input.outcome,
      note: input.note.trim(),
      conditions: input.conditions?.trim() || null,
      resolutions: input.resolutions,
    });
  } catch (error) {
    // Two clicks at the same moment: the database refuses the second one.
    if ((error as { code?: string }).code === "23505") {
      return fail(409, `The ${STAGE_NAMES[input.stage]} stage has already been decided.`);
    }
    console.error("[decisions] could not record the decision:", describeDbError(error));
    return fail(500, "Could not record the decision.");
  }
  if (!decisionId) {
    const now = await getDecisions(id);
    return now.some((d) => d.stage === input.stage)
      ? fail(409, `The ${STAGE_NAMES[input.stage]} stage has already been decided.`)
      : fail(409, "The review changed while you were deciding. Reload the page and try again.");
  }

  // The decision stands from here on. Now try to wake the paused run, but only
  // where it lives: a run belongs to the copy of the app that created it.
  const here = appEnvironment();
  let resumed = false;
  let hookNotFound = false;
  let otherError: string | null = null;
  let run: RunState = null;
  if (found.review.environment === here) {
    try {
      if (input.stage === "appsec") await appsecHook.resume(appsecToken(id), { decisionId });
      else await modelRiskHook.resume(modelRiskToken(id), { decisionId });
      resumed = true;
    } catch (error) {
      if (HookNotFoundError.is(error)) hookNotFound = true;
      else {
        otherError = error instanceof Error ? error.name : "unknown error";
        console.error("[decisions] resume failed:", error instanceof Error ? error.message : String(error));
      }
    }
    // No waiting hook: ask the run itself whether it finished or is gone.
    if (hookNotFound && found.review.workflow_run_id) {
      try {
        const r = getRun(found.review.workflow_run_id);
        run = (await r.exists) ? { exists: true, status: await r.status } : { exists: false };
      } catch (error) {
        console.error("[decisions] could not read the run:", error instanceof Error ? error.name : "error");
      }
    }
  }
  const outcome = classifyResume({ reviewEnvironment: found.review.environment, appEnvironment: here, resumed, hookNotFound, otherError, run });
  await recordWorkflowResume(id, decisionId, outcome.cause, outcome.detail).catch((e) =>
    console.error("[decisions] could not record the resume result:", describeDbError(e)),
  );
  const workflow = outcome.cause;

  return Response.json({ decisionId, status: check.nextStatus, workflow }, { status: 201 });
}
