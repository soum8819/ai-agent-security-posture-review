// Reads and writes review state in Neon Postgres. Every change to a review
// also writes an audit event, in the same transaction.
// Server-side only. Never log DATABASE_URL.
import { appEnvironment, getSql } from "./db.ts";
import { SUBMISSION_WINDOW_MS, type ReviewStatus } from "./limits.ts";
import type { AgentProfile } from "./profile-schema.ts";
import type { ReviewScope } from "./review-access.ts";
import type { ReviewRecord } from "./review.ts";
import type { Tier, TierSource } from "./rules.ts";

export type Actor = { id: string; role: string } | null;

export type ReviewRow = {
  id: string;
  submitter_id: string;
  profile_id: string;
  profile: AgentProfile;
  status: ReviewStatus;
  rule_tier: Tier | null;
  reviewer_tier: Tier | null;
  checker_tier: Tier | null;
  final_tier: Tier | null;
  final_tier_set_by: TierSource[] | null;
  contested_count: number;
  workflow_run_id: string | null;
  error: string | null;
  supersedes: string | null;
  environment: string;
  created_at: string;
  updated_at: string;
};

function audit(reviewId: string | null, actor: Actor, eventType: string, details: Record<string, unknown> = {}) {
  return getSql()`
    INSERT INTO audit_events (review_id, actor_id, actor_role, event_type, details, environment)
    VALUES (${reviewId}, ${actor?.id ?? null}, ${actor?.role ?? null}, ${eventType}, ${JSON.stringify(details)}::jsonb, ${appEnvironment()})`;
}

export async function recordAuditEvent(reviewId: string | null, actor: Actor, eventType: string, details: Record<string, unknown> = {}) {
  await audit(reviewId, actor, eventType, details);
}

export async function countRecentSubmissions(submitterId: string, now = Date.now()) {
  const since = new Date(now - SUBMISSION_WINDOW_MS).toISOString();
  const [row] = await getSql()`
    SELECT count(*)::int AS n FROM reviews WHERE submitter_id = ${submitterId} AND created_at > ${since}`;
  return row.n as number;
}

export async function createReview(input: { id: string; submitter: Actor & {}; profile: AgentProfile; supersedes?: string | null }) {
  const sql = getSql();
  await sql.transaction([
    sql`INSERT INTO reviews (id, submitter_id, profile_id, profile, status, supersedes, environment)
        VALUES (${input.id}, ${input.submitter.id}, ${input.profile.id}, ${JSON.stringify(input.profile)}::jsonb,
                'queued', ${input.supersedes ?? null}, ${appEnvironment()})`,
    audit(input.id, input.submitter, "review_submitted", { profileId: input.profile.id }),
  ]);
}

export async function markReviewing(id: string, workflowRunId: string | null) {
  const sql = getSql();
  await sql.transaction([
    sql`UPDATE reviews SET status = 'reviewing', workflow_run_id = coalesce(${workflowRunId}, workflow_run_id), updated_at = now()
        WHERE id = ${id}`,
    audit(id, null, "review_started", { workflowRunId }),
  ]);
}

export async function saveReviewResult(id: string, record: ReviewRecord, status: ReviewStatus) {
  const sql = getSql();
  const t = record.tiers;
  await sql.transaction([
    sql`INSERT INTO review_results (review_id, result) VALUES (${id}, ${JSON.stringify(record)}::jsonb)
        ON CONFLICT (review_id) DO UPDATE SET result = excluded.result`,
    sql`UPDATE reviews SET status = ${status}, rule_tier = ${t.rule}, reviewer_tier = ${t.reviewer},
          checker_tier = ${t.checker}, final_tier = ${t.final}, final_tier_set_by = ${t.setBy},
          contested_count = ${record.contested.length}, error = null, updated_at = now()
        WHERE id = ${id}`,
    audit(id, null, "review_completed", {
      tiers: { rule: t.rule, reviewer: t.reviewer, checker: t.checker, final: t.final, setBy: t.setBy },
      contested: record.contested,
      status,
      reviewerModel: record.reviewer.model,
      checkerModel: record.checker.model,
    }),
  ]);
}

export async function markFailed(id: string, message: string) {
  const sql = getSql();
  await sql.transaction([
    sql`UPDATE reviews SET status = 'failed', error = ${message.slice(0, 500)}, updated_at = now() WHERE id = ${id}`,
    audit(id, null, "review_failed", { error: message.slice(0, 500) }),
  ]);
}

export async function getReview(id: string): Promise<{ review: ReviewRow; result: ReviewRecord | null } | null> {
  const sql = getSql();
  const [review] = await sql`SELECT * FROM reviews WHERE id = ${id}`;
  if (!review) return null;
  const [res] = await sql`SELECT result FROM review_results WHERE review_id = ${id}`;
  return { review: review as ReviewRow, result: (res?.result as ReviewRecord) ?? null };
}

export type ReviewListRow = {
  id: string;
  profile_id: string;
  profile_name: string;
  submitter_id: string;
  created_at: string;
  status: ReviewStatus;
  final_tier: Tier | null;
  contested_count: number;
};

// The review queue, newest first, limited to what this scope may see.
export async function listReviews(scope: ReviewScope, limit = 200): Promise<ReviewListRow[]> {
  const sql = getSql();
  const rows =
    scope.kind === "all"
      ? await sql`SELECT id, profile_id, profile->>'name' AS profile_name, submitter_id, created_at, status, final_tier, contested_count
                  FROM reviews ORDER BY created_at DESC LIMIT ${limit}`
      : await sql`SELECT id, profile_id, profile->>'name' AS profile_name, submitter_id, created_at, status, final_tier, contested_count
                  FROM reviews WHERE submitter_id = ${scope.submitterId} ORDER BY created_at DESC LIMIT ${limit}`;
  return rows as ReviewListRow[];
}
