// The review detail page (slice C), read-only: header, tiers, rules that
// fired, findings (contested first), dropped findings, and cost when stored.
// Who may see it is decided by canViewReview; anyone else gets "not found",
// so the page never reveals that a review exists.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { STAGE_NAMES, stageYouMayDecide } from "@/lib/authz";
import { canResubmit, canViewReview } from "@/lib/review-access";
import {
  SETUP_CHECK_LABEL,
  SETUP_CHECK_SUBMITTER,
  STATUS_TEXT,
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
import { CommitteePanel, DecisionHistory, DroppedFindings, Findings, RuleHits, TierPanel, focusRing } from "./sections";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

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
  const contested = (result?.findings ?? [])
    .filter((f) => f.contested)
    .map((f) => ({ id: f.id, label: `${f.category} ${asiName(f.category)}` }));
  const findingLabels = Object.fromEntries((result?.findings ?? []).map((f) => [f.id, `${f.category} ${asiName(f.category)}`]));
  // The same check the approval route uses decides whether to show the form.
  const myStage = result
    ? stageYouMayDecide({ user, review, decisions, contestedIds: contested.map((c) => c.id) })
    : null;

  return (
    <>
      {working && <AutoRefresh />}

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight break-words">{review.profile.name}</h1>
        {review.submitter_id === SETUP_CHECK_SUBMITTER && (
          <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">{SETUP_CHECK_LABEL}</p>
        )}
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-zinc-600 dark:text-zinc-400">Review</dt>
          <dd className="font-mono break-all">{review.id}</dd>
          <dt className="text-zinc-600 dark:text-zinc-400">Profile</dt>
          <dd>{review.profile_id}, owned by {review.profile.owner}</dd>
          <dt className="text-zinc-600 dark:text-zinc-400">Submitted by</dt>
          <dd>{submitterName(review.submitter_id)}</dd>
          <dt className="text-zinc-600 dark:text-zinc-400">Submitted</dt>
          <dd>{formatTime(review.created_at)}</dd>
          <dt className="text-zinc-600 dark:text-zinc-400">Created on</dt>
          <dd>{createdOn(review.environment)}</dd>
        </dl>
        <p className="mt-4 text-lg">
          Status: <span className="font-medium">{STATUS_TEXT[review.status] ?? review.status}</span>
        </p>
        {review.supersedes && (
          <p className="mt-2">
            This is a resubmission of{" "}
            <Link href={`/app/reviews/${review.supersedes}`} className={`underline underline-offset-2 ${focusRing}`}>
              review {shortId(review.supersedes)}
            </Link>
            , which had changes requested.
          </p>
        )}
        {resubmission && (
          <p className="mt-2">
            Resubmitted as{" "}
            <Link href={`/app/reviews/${resubmission.id}`} className={`underline underline-offset-2 ${focusRing}`}>
              review {shortId(resubmission.id)}
            </Link>
            .
          </p>
        )}
        {canResubmit(user, review, resubmission !== null) && (
          <Link
            href={`/app/submit?from=${review.id}`}
            className={`mt-3 inline-block bg-zinc-900 px-5 py-2 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900 ${focusRing}`}
          >
            Resubmit with changes
          </Link>
        )}
        {review.status === "failed" && review.error && (
          <p role="alert" className="mt-3 rounded border border-red-700 bg-red-50 p-3 text-red-900">
            {review.error}
          </p>
        )}
        {result?.manipulationAttempt.detected && (
          <div role="note" className="mt-4 rounded border border-amber-700 bg-amber-50 p-3 text-amber-950">
            <p className="font-medium">The profile contains text that tries to instruct the reviewer.</p>
            <p className="mt-1 text-sm">The reviewer model flagged it and did not follow it:</p>
            <blockquote data-evidence-quote className="mt-1 border-l-4 border-amber-700 pl-3 text-sm italic break-words">
              “{result.manipulationAttempt.quote}”
            </blockquote>
          </div>
        )}
      </header>

      <TierPanel result={result} />

      {working && (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          The rules and two models are still working. This page refreshes itself until they finish.
        </p>
      )}

      {result && (
        <>
          <RuleHits result={result} profile={review.profile} />
          <Findings result={result} profile={review.profile} />
          <DroppedFindings result={result} />
        </>
      )}

      {review.status === "routed_to_committee" && result && <CommitteePanel reviewId={review.id} />}

      <DecisionHistory decisions={decisions} findingLabels={findingLabels} />

      {myStage && (
        <DecisionPanel reviewId={review.id} stage={myStage} stageName={STAGE_NAMES[myStage]} contested={contested} />
      )}

      {cost && (
        <footer className="mt-10 border-t border-zinc-200 pt-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          This review cost ${cost.total.toFixed(4)} in model calls (reviewer ${cost.reviewer.toFixed(4)}, checker $
          {cost.checker.toFixed(4)}).
        </footer>
      )}
    </>
  );
}

export default function ReviewPage({ params }: PageProps<"/app/reviews/[id]">) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/app/reviews" className={`underline underline-offset-2 ${focusRing}`}>All reviews</Link>
        <Link href="/app" className={`underline underline-offset-2 ${focusRing}`}>Reviewer app home</Link>
      </nav>
      <Suspense fallback={<p className="mt-6 text-zinc-500">Loading...</p>}>
        <ReviewDetail params={params} />
      </Suspense>
    </main>
  );
}
