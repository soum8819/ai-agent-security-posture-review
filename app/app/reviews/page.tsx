// The review queue (design pass): newest first. Submitters see only their own
// reviews; reviewers and the Auditor see every review. A table on wide
// screens, compact cards on a phone.
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, PageHeader, Skeleton, StatusPill, TierChip, button } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { reviewScope } from "@/lib/review-access";
import { SETUP_CHECK_LABEL, SETUP_CHECK_SUBMITTER, createdOn, formatTime, shortId, submitterName } from "@/lib/review-view";
import { listReviews } from "@/lib/store";

async function Queue() {
  const user = await requireUser();
  const scope = reviewScope(user);
  const reviews = await listReviews(scope);
  const mayRead = can(user.role, "submit_profile");

  return (
    <>
      <PageHeader
        title={scope.kind === "all" ? "Reviews" : "Your reviews"}
        description={`${reviews.length} review${reviews.length === 1 ? "" : "s"}, newest first.`}
        actions={mayRead ? <Link href="/app/submit" className={button.primary}>Submit a profile</Link> : undefined}
      />

      {reviews.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No reviews yet"
            body={mayRead ? "Submit an agent profile and its review appears here." : "Reviews appear here as soon as a team submits one."}
            action={mayRead ? { href: "/app/submit", label: "Submit a profile" } : undefined}
          />
        </div>
      ) : (
        <>
          {/* Wide screens: a table. */}
          <div className="mt-6 hidden overflow-hidden rounded-lg border border-line md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-subtle text-xs text-muted">
                <tr className="border-b border-line">
                  <th scope="col" className="px-4 py-2.5 font-medium">Agent</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Final tier</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Contested</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-b border-line align-top transition-colors duration-150 last:border-0 hover:bg-subtle">
                    <td className="px-4 py-3">
                      <Link href={`/app/reviews/${r.id}`} className="font-medium hover:underline">{r.profile_name}</Link>
                      <div className="mt-0.5 font-mono text-xs text-muted">{shortId(r.id)}</div>
                      {r.submitter_id === SETUP_CHECK_SUBMITTER && <div className="mt-0.5 text-xs text-muted">{SETUP_CHECK_LABEL}</div>}
                    </td>
                    <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-3"><TierChip tier={r.final_tier} /></td>
                    <td className="px-4 py-3 text-right tabular">{r.contested_count}</td>
                    <td className="px-4 py-3">
                      <div className="tabular">{formatTime(r.created_at)}</div>
                      <div className="text-xs text-muted">by {submitterName(r.submitter_id)}, on {createdOn(r.environment)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone width: one compact card per review. */}
          <ul className="mt-6 divide-y divide-line rounded-lg border border-line md:hidden">
            {reviews.map((r) => (
              <li key={r.id}>
                <Link href={`/app/reviews/${r.id}`} className="block px-4 py-3 transition-colors duration-150 hover:bg-subtle">
                  <span className="block font-medium">{r.profile_name}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusPill status={r.status} />
                    <TierChip tier={r.final_tier} />
                    {r.contested_count > 0 && <span className="text-xs text-muted tabular">{r.contested_count} contested</span>}
                  </span>
                  <span className="mt-2 block text-xs text-muted">
                    <span className="font-mono">{shortId(r.id)}</span>, <span className="tabular">{formatTime(r.created_at)}</span>, on{" "}
                    {createdOn(r.environment)}
                    {r.submitter_id === SETUP_CHECK_SUBMITTER && `, ${SETUP_CHECK_LABEL}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export default function ReviewsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton lines={8} />}>
        <Queue />
      </Suspense>
    </main>
  );
}
