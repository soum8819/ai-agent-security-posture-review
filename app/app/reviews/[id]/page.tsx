// The review detail page (design pass): header, a summary strip, then the
// details on the left and the decision on the right (stacked on a phone).
// Who may see it is decided by canViewReview; anyone else gets "not found",
// so the page never reveals that a review exists.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Notice, PageHeader, SeverityBadge, Skeleton, StatusPill, TierChip, button, cx, link } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { STAGE_NAMES, stageYouMayDecide, stagesForTier } from "@/lib/authz";
import type { ReviewStatus } from "@/lib/limits";
import { canResubmit, canViewReview } from "@/lib/review-access";
import {
  OUTCOME_TEXT,
  SETUP_CHECK_LABEL,
  SETUP_CHECK_SUBMITTER,
  SEVERITY_ORDER,
  asiName,
  createdOn,
  formatTime,
  reviewCost,
  shortId,
  submitterName,
} from "@/lib/review-view";
import { getDecisions, getResubmission, getReview } from "@/lib/store";
import { AutoRefresh } from "./auto-refresh";
import { DecisionPanel } from "./decision-panel";
import { CommitteePanel, DecisionHistory, DroppedFindings, Findings, RuleHits, TierPanel } from "./sections";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Who acts next, in plain words.
function nextStep(status: ReviewStatus, tier: number | null): string {
  switch (status) {
    case "queued":
    case "reviewing":
      return "The rules and two models are still working.";
    case "awaiting_appsec":
      return tier === 3 ? "An AppSec Reviewer decides first, then Model Risk." : "An AppSec Reviewer decides.";
    case "awaiting_model_risk":
      return "AppSec has approved. A Model Risk Reviewer decides next.";
    case "routed_to_committee":
      return "The review committee decides. Tier 4 is never approved in this app.";
    case "failed":
      return "The review failed before any decision.";
    default:
      return "Decided. See the decisions below.";
  }
}

async function ReviewDetail({ params }: { params: PageProps<"/app/reviews/[id]">["params"] }) {
  const user = await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const found = await getReview(id);
  if (!found || !canViewReview(user, found.review)) notFound();
  const { review, result } = found;

  const working = review.status === "queued" || review.status === "reviewing";
  const cost = result ? reviewCost(result.reviewer, result.checker) : null;
  const decisions = await getDecisions(review.id);
  const resubmission = await getResubmission(review.id);
  const contested = (result?.findings ?? []).filter((f) => f.contested).map((f) => ({ id: f.id, label: `${f.category} ${asiName(f.category)}` }));
  const findingLabels = Object.fromEntries((result?.findings ?? []).map((f) => [f.id, `${f.category} ${asiName(f.category)}`]));
  // The same check the approval route uses decides whether to show the form.
  const myStage = result ? stageYouMayDecide({ user, review, decisions, contestedIds: contested.map((c) => c.id) }) : null;
  const allFindings = result ? [...result.findings, ...result.missedFindings] : [];
  const worst = SEVERITY_ORDER.find((s) => allFindings.some((f) => f.severity === s));
  const stages = review.final_tier ? stagesForTier(review.final_tier as 1 | 2 | 3 | 4) : [];
  const isCommittee = review.status === "routed_to_committee" && result;

  return (
    <>
      {working && <AutoRefresh />}

      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={review.status} />
            {review.submitter_id === SETUP_CHECK_SUBMITTER && (
              <span className="rounded border border-line px-1.5 py-0.5 text-xs">{SETUP_CHECK_LABEL}</span>
            )}
          </span>
        }
        title={review.profile.name}
        description={
          <span className="text-sm">
            Owned by {review.profile.owner}. Submitted by {submitterName(review.submitter_id)} on{" "}
            <span className="tabular">{formatTime(review.created_at)}</span>, on {createdOn(review.environment)}.{" "}
            <span className="font-mono">Review {review.id}</span>
          </span>
        }
        actions={
          <>
            {myStage && (
              <a href="#decide" className={cx(button.accent, "lg:hidden")}>
                Go to your decision
              </a>
            )}
            {canResubmit(user, review, resubmission !== null) && (
              <Link href={`/app/submit?from=${review.id}`} className={button.primary}>
                Resubmit with changes
              </Link>
            )}
          </>
        }
      />

      <div className="mt-6 space-y-3">
        {review.supersedes && (
          <Notice>
            This is a resubmission of{" "}
            <Link href={`/app/reviews/${review.supersedes}`} className={link}>review {shortId(review.supersedes)}</Link>, which had
            changes requested.
          </Notice>
        )}
        {resubmission && (
          <Notice>
            Resubmitted as <Link href={`/app/reviews/${resubmission.id}`} className={link}>review {shortId(resubmission.id)}</Link>.
          </Notice>
        )}
        {review.status === "failed" && review.error && (
          <Notice tone="bad" role="alert" title="The review failed">
            {review.error}
          </Notice>
        )}
        {result?.manipulationAttempt.detected && (
          <Notice tone="warn" role="note" title="The profile contains text that tries to instruct the reviewer">
            <p>The reviewer model flagged it and did not follow it:</p>
            <blockquote data-evidence-quote className="mt-2 rounded-md border border-line bg-page px-3 py-2 text-ink break-words">
              “{result.manipulationAttempt.quote}”
            </blockquote>
          </Notice>
        )}
      </div>

      {/* Summary strip: the four things an approver needs first. */}
      <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <dt className="text-xs font-medium text-muted">Final tier</dt>
          <dd className="mt-2"><TierChip tier={review.final_tier} size="lg" /></dd>
        </Card>
        <Card className="p-4">
          <dt className="text-xs font-medium text-muted">Contested findings</dt>
          <dd className="mt-2 text-2xl font-semibold tabular">{working ? "…" : review.contested_count}</dd>
          {review.contested_count > 0 && <dd className="mt-1 text-xs text-muted">The approver must resolve each one</dd>}
        </Card>
        <Card className="p-4">
          <dt className="text-xs font-medium text-muted">Findings</dt>
          <dd className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-semibold tabular">{working ? "…" : allFindings.length}</span>
            {worst && <SeverityBadge severity={worst} />}
          </dd>
          {worst && <dd className="mt-1 text-xs text-muted">Highest severity shown</dd>}
        </Card>
        <Card className="col-span-2 p-4 lg:col-span-1">
          <dt className="text-xs font-medium text-muted">Next</dt>
          <dd className="mt-2 text-sm">{nextStep(review.status, review.final_tier)}</dd>
        </Card>
      </dl>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="min-w-0 space-y-10">
          <TierPanel result={result} />
          {working && <Skeleton lines={5} />}
          {result && (
            <>
              <RuleHits result={result} profile={review.profile} />
              <Findings result={result} profile={review.profile} />
              <DroppedFindings result={result} />
            </>
          )}
          <DecisionHistory decisions={decisions} findingLabels={findingLabels} />
        </div>

        <aside aria-label="Decision" className="space-y-4 lg:sticky lg:top-20">
          {myStage && <DecisionPanel reviewId={review.id} stage={myStage} stageName={STAGE_NAMES[myStage]} contested={contested} />}
          {isCommittee && <CommitteePanel reviewId={review.id} />}
          {!myStage && !isCommittee && (
            <Card className="p-5">
              <h2 className="font-semibold">Who decides</h2>
              <p className="mt-2 text-sm text-muted">{nextStep(review.status, review.final_tier)}</p>
              {stages.length > 0 && (
                <ol className="mt-4 space-y-2 text-sm">
                  {stages.map((s, i) => {
                    const d = decisions.find((x) => x.stage === s);
                    return (
                      <li key={s} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2">
                        <span>
                          <span className="font-mono text-xs text-muted">{i + 1}.</span> {STAGE_NAMES[s]}
                        </span>
                        <span className="text-xs text-muted">{d ? OUTCOME_TEXT[d.outcome] : "Not yet"}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
              {user.role === "auditor" && <p className="mt-4 text-xs text-muted">You can read this review and its decisions, but not change them.</p>}
            </Card>
          )}
          {cost && (
            <p className="px-1 text-xs text-muted tabular">
              Model calls for this review cost ${cost.total.toFixed(4)} (reviewer ${cost.reviewer.toFixed(4)}, checker $
              {cost.checker.toFixed(4)}).
            </p>
          )}
        </aside>
      </div>
    </>
  );
}

export default function ReviewPage({ params }: PageProps<"/app/reviews/[id]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <Link href="/app/reviews" className="hover:text-ink">Reviews</Link>
        <span aria-hidden className="px-2">/</span>
        <span className="text-ink">Review</span>
      </nav>
      <Suspense fallback={<Skeleton lines={8} />}>
        <ReviewDetail params={params} />
      </Suspense>
    </main>
  );
}
