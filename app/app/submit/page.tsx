import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { SubmitForm } from "./submit-form";

// Only Submitters may open this page; the check runs on the server.
async function Guarded() {
  await requireUser("submit_profile");
  return <SubmitForm />;
}

export default function SubmitPage() {
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
        <Guarded />
      </Suspense>
    </main>
  );
}
