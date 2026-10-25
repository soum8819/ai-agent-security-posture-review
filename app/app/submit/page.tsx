import { Suspense } from "react";
import { Notice, PageHeader, Skeleton } from "@/components/ui";
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
      <div className="mt-8">
        <Notice tone="bad" role="alert" title="That review cannot be resubmitted">
          Only your own review with changes requested can be resubmitted, and only once.
        </Notice>
      </div>
    );
  }
  const request = (await getDecisions(from)).find((d) => d.outcome === "changes_requested");
  return (
    <>
      <div className="mt-8">
        <Notice tone="warn" title={`Resubmitting review ${shortId(from)} after changes were requested`}>
          {request && <p>The reviewer asked: {request.note}</p>}
          <p className="mt-1">The form starts from the earlier profile. The new review will link to the old one.</p>
        </Notice>
      </div>
      <SubmitForm initialProfile={old.review.profile} supersedes={from} />
    </>
  );
}

export default function SubmitPage({ searchParams }: PageProps<"/app/submit">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <PageHeader
        title="Submit an agent profile"
        description="Fill in the form and press Validate to check it, then Submit for review. The rules and two AI models review it in the background, and a person makes the decision."
      />
      <Suspense fallback={<div className="mt-8"><Skeleton lines={8} /></div>}>
        <Guarded searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
