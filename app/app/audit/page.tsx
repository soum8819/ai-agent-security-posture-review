// The audit log, for the Auditor only (everyone else gets Not allowed).
// Read-only: there is no way to change or delete an event here or anywhere.
import Link from "next/link";
import { Suspense } from "react";
import { AUDIT_PAGE_LIMIT, EVENT_NAMES, detailLines, parseReviewFilter } from "@/lib/audit-view";
import { requireUser } from "@/lib/auth";
import { createdOn, formatTime, shortId, submitterName } from "@/lib/review-view";
import { listAuditEvents } from "@/lib/store";

const focusRing = "rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";
const muted = "text-zinc-600 dark:text-zinc-400";

async function AuditLog({ searchParams }: { searchParams: PageProps<"/app/audit">["searchParams"] }) {
  await requireUser("view_audit_log");
  const raw = (await searchParams).review;
  const filter = parseReviewFilter(raw);
  const badFilter = typeof raw === "string" && raw.trim() !== "" && !filter;
  const events = badFilter ? [] : await listAuditEvents(filter, AUDIT_PAGE_LIMIT);
  const exportHref = filter ? `/app/audit/export?review=${filter}` : "/app/audit/export";

  return (
    <>
      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-sm font-medium">Filter by review id (full id or its first characters)</span>
          <input
            name="review"
            defaultValue={typeof raw === "string" ? raw : ""}
            className={`mt-1 block w-72 max-w-full rounded border border-zinc-300 bg-white px-3 py-2 font-mono dark:border-zinc-700 dark:bg-zinc-900 ${focusRing}`}
          />
        </label>
        <button type="submit" className={`rounded border border-zinc-300 px-4 py-2 dark:border-zinc-700 ${focusRing}`}>Filter</button>
        {filter && <Link href="/app/audit" className={`underline underline-offset-2 ${focusRing}`}>Show all</Link>}
        <a href={exportHref} download className={`bg-zinc-900 px-4 py-2 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900 ${focusRing}`}>
          Export as JSON
        </a>
      </form>
      {badFilter && (
        <p role="alert" className="mt-4 rounded border border-red-700 bg-red-50 p-3 text-red-900">
          A review id has only the letters a to f, digits and dashes, and at least 4 characters.
        </p>
      )}
      <p className={`mt-4 text-sm ${muted}`}>
        {events.length} event{events.length === 1 ? "" : "s"}, newest first
        {events.length === AUDIT_PAGE_LIMIT ? ` (the newest ${AUDIT_PAGE_LIMIT}; the export has all of them)` : ""}.
      </p>
      <ol className="mt-4 space-y-3">
        {events.map((e) => (
          <li key={e.id} className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="font-medium">
              {EVENT_NAMES[e.event_type] ?? e.event_type}
              {e.review_id && (
                <>
                  {" "}for review{" "}
                  <Link href={`/app/reviews/${e.review_id}`} className={`font-mono underline underline-offset-2 ${focusRing}`}>
                    {shortId(e.review_id)}
                  </Link>
                </>
              )}
            </p>
            <p className={`text-sm ${muted}`}>
              Event {e.id}, {formatTime(e.created_at)}, {e.actor_id ? `by ${submitterName(e.actor_id)}` : "by the system"}, on {createdOn(e.environment)}
            </p>
            <dl className="mt-2 grid grid-cols-1 gap-x-4 text-sm sm:grid-cols-[auto_1fr]">
              {detailLines(e.details).map((d, i) => (
                <div key={i} className="contents">
                  <dt className={muted}>{d.label}</dt>
                  <dd className="break-words">{d.value}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ol>
    </>
  );
}

export default function AuditPage({ searchParams }: PageProps<"/app/audit">) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
      <Link href="/app" className={`text-sm underline underline-offset-2 ${focusRing}`}>Reviewer app home</Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Audit log</h1>
      <p className={`mt-2 ${muted}`}>Every recorded event. Events can only be added, never changed or deleted.</p>
      <Suspense fallback={<p className="mt-6 text-zinc-500">Loading...</p>}>
        <AuditLog searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
