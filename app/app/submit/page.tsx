import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { canResubmit } from "@/lib/review-access";
import { shortId } from "@/lib/review-view";
import { getDecisions, getResubmission, getReview } from "@/lib/store";
import { SubmitForm } from "./submit-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Only Submitters may open this page; the check runs on the server. With
// ?from=<review id>, it pre-fills a resubmission of that review, if this user
// may resubmit it.
async function Guarded({ searchParams }: { searchParams: PageProps<"/app/submit">["searchParams"] }) {
  const user = await requireUser("submit_profile");
  const from = (await searchParams).from;
  if (typeof from !== "string" || !UUID.test(from)) return <SubmitForm />;

  const old = await getReview(from);
  const ok = old && canResubmit(user, old.review, (await getResubmission(from)) !== null);
  if (!old || !ok) {
    return (
      <p role="alert" className="mt-8 rounded border border-red-700 bg-red-50 p-3 text-red-900">
        That review cannot be resubmitted. Only your own review with changes requested can be resubmitted, and only once.
      </p>
    );
  }
  const request = (await getDecisions(from)).find((d) => d.outcome === "changes_requested");
  return (
    <>
      <div className="mt-8 rounded border border-amber-700 bg-amber-50 p-3 text-amber-950">
        <p className="font-medium">Resubmitting review {shortId(from)} after changes were requested.</p>
        {request && <p className="mt-1 text-sm">The reviewer asked: {request.note}</p>}
        <p className="mt-1 text-sm">The form starts from the earlier profile. The new review will link to the old one.</p>
      </div>
      <SubmitForm initialProfile={old.review.profile} supersedes={from} />
    </>
  );
}

export default function SubmitPage({ searchParams }: PageProps<"/app/submit">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Submit an agent profile
      </h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        Fill in the form, press Validate to check it against the profile schema,
        then Submit for review. The rules and two AI models review it in the
        background, and an AppSec Reviewer makes the decision.
      </p>
      <Suspense fallback={<p className="mt-8 text-zinc-500">Loading...</p>}>
        <Guarded searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
