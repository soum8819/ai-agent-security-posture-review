// The review queue: newest first. Submitters see only their own reviews;
// reviewers and the Auditor see every review. Read-only in slice C.
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { reviewScope } from "@/lib/review-access";
import {
  SETUP_CHECK_LABEL,
  SETUP_CHECK_SUBMITTER,
  STATUS_TEXT,
  createdOn,
  formatTime,
  shortId,
  submitterName,
} from "@/lib/review-view";
import { listReviews } from "@/lib/store";

const linkClass =
  "underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 rounded";

async function Queue() {
  const user = await requireUser();
  const scope = reviewScope(user);
  const reviews = await listReviews(scope);

  if (reviews.length === 0) {
    return <p className="mt-6 text-zinc-600 dark:text-zinc-400">No reviews yet.</p>;
  }

  return (
    <>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        {scope.kind === "all" ? "All reviews" : "Your reviews"}, newest first.
      </p>

      {/* Wide screens: a table. */}
      <table className="mt-6 hidden w-full border-collapse text-left text-sm md:table">
        <thead>
          <tr className="border-b border-zinc-300 dark:border-zinc-700">
            <th scope="col" className="py-2 pr-3 font-medium">Review</th>
            <th scope="col" className="py-2 pr-3 font-medium">Profile</th>
            <th scope="col" className="py-2 pr-3 font-medium">Submitted</th>
            <th scope="col" className="py-2 pr-3 font-medium">Status</th>
            <th scope="col" className="py-2 pr-3 font-medium">Final tier</th>
            <th scope="col" className="py-2 font-medium">Contested</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((r) => (
            <tr key={r.id} className="border-b border-zinc-200 align-top dark:border-zinc-800">
              <td className="py-2 pr-3 font-mono">
                <Link href={`/app/reviews/${r.id}`} className={linkClass}>{shortId(r.id)}</Link>
              </td>
              <td className="py-2 pr-3">
                {r.profile_name}
                {r.submitter_id === SETUP_CHECK_SUBMITTER && (
                  <span className="block text-xs text-zinc-600 dark:text-zinc-400">{SETUP_CHECK_LABEL}</span>
                )}
              </td>
              <td className="py-2 pr-3">
                {formatTime(r.created_at)}
                <span className="block text-xs text-zinc-600 dark:text-zinc-400">by {submitterName(r.submitter_id)}, on {createdOn(r.environment)}</span>
              </td>
              <td className="py-2 pr-3">{STATUS_TEXT[r.status] ?? r.status}</td>
              <td className="py-2 pr-3">{r.final_tier ?? "not yet"}</td>
              <td className="py-2">{r.contested_count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phone width: one card per review. */}
      <ul className="mt-6 space-y-3 md:hidden">
        {reviews.map((r) => (
          <li key={r.id} className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
            <Link href={`/app/reviews/${r.id}`} className={`${linkClass} font-medium`}>
              {r.profile_name}
            </Link>
            {r.submitter_id === SETUP_CHECK_SUBMITTER && (
              <span className="block text-xs text-zinc-600 dark:text-zinc-400">{SETUP_CHECK_LABEL}</span>
            )}
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-zinc-600 dark:text-zinc-400">Review</dt>
              <dd className="font-mono">{shortId(r.id)}</dd>
              <dt className="text-zinc-600 dark:text-zinc-400">Submitted</dt>
              <dd>{formatTime(r.created_at)}</dd>
              <dt className="text-zinc-600 dark:text-zinc-400">Created on</dt>
              <dd>{createdOn(r.environment)}</dd>
              <dt className="text-zinc-600 dark:text-zinc-400">Status</dt>
              <dd>{STATUS_TEXT[r.status] ?? r.status}</dd>
              <dt className="text-zinc-600 dark:text-zinc-400">Final tier</dt>
              <dd>{r.final_tier ?? "not yet"}</dd>
              <dt className="text-zinc-600 dark:text-zinc-400">Contested</dt>
              <dd>{r.contested_count}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function ReviewsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6">
      <Link href="/app" className={`text-sm ${linkClass}`}>Back to the reviewer app</Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Reviews</h1>
      <Suspense fallback={<p className="mt-6 text-zinc-500">Loading...</p>}>
        <Queue />
      </Suspense>
    </main>
  );
}
