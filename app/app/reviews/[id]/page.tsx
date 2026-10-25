// Bare review status page (slice B). Slice C turns this into the full review
// screen. Submitters see only their own reviews; reviewers and the Auditor see
// all. Anything else shows "not found", so the page never reveals that a
// review exists.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getReview } from "@/lib/store";
import { AutoRefresh } from "./auto-refresh";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const STATUS_TEXT: Record<string, string> = {
  queued: "Queued",
  reviewing: "Reviewing: the rules and two models are working",
  awaiting_appsec: "Awaiting an AppSec decision",
  awaiting_model_risk: "Awaiting a Model Risk decision",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Changes requested",
  routed_to_committee: "Routed to the review committee (Tier 4 is not approved in this app)",
  failed: "Failed",
};

async function ReviewStatus({ params }: { params: PageProps<"/app/reviews/[id]">["params"] }) {
  const user = await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const found = await getReview(id);
  if (!found) notFound();
  const { review } = found;
  const mayView = can(user.role, "view_all_reviews") || review.submitter_id === user.id;
  if (!mayView) notFound();

  const working = review.status === "queued" || review.status === "reviewing";
  const tiers: [string, number | null][] = [
    ["Rule tier", review.rule_tier],
    ["Reviewer model tier", review.reviewer_tier],
    ["Checker model tier", review.checker_tier],
    ["Final tier", review.final_tier],
  ];

  return (
    <>
      {working && <AutoRefresh />}
      <p className="mt-2 text-sm text-zinc-500">
        Review {review.id} · profile {review.profile_id} · submitted {new Date(review.created_at).toUTCString()}
        {review.submitter_id === "setup-check" && " · setup check, not a real submission"}
      </p>
      <p className="mt-6 text-lg">
        Status: <span className="font-medium">{STATUS_TEXT[review.status] ?? review.status}</span>
      </p>
      {review.status === "failed" && review.error && (
        <p role="alert" className="mt-3 rounded border border-red-700 bg-red-50 p-3 text-red-900">
          {review.error}
        </p>
      )}
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        {tiers.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-zinc-500">{label}</dt>
            <dd className="text-xl font-medium">{value ?? "pending"}</dd>
          </div>
        ))}
      </dl>
      {review.final_tier_set_by && (
        <p className="mt-2 text-sm text-zinc-500">Final tier set by: {review.final_tier_set_by.join(", ")}</p>
      )}
      <p className="mt-4">
        Contested findings: <span className="font-medium">{working ? "pending" : review.contested_count}</span>
      </p>
      {working && <p className="mt-6 text-sm text-zinc-500">This page refreshes itself until the review finishes.</p>}
    </>
  );
}

export default function ReviewPage({ params }: PageProps<"/app/reviews/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <Link href="/app" className="text-sm underline">Back to the reviewer app</Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Review</h1>
      <Suspense fallback={<p className="mt-6 text-zinc-500">Loading...</p>}>
        <ReviewStatus params={params} />
      </Suspense>
    </main>
  );
}
