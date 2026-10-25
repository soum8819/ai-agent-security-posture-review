import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/users";
import { signOut } from "./sign-in/actions";

const linkClass =
  "underline underline-offset-2 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

async function Home() {
  const user = await requireUser();
  return (
    <>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        Signed in as <span className="font-medium">{user.name}</span>, {ROLE_LABELS[user.role]} ({user.team}).
      </p>
      <ul className="mt-8 list-disc space-y-2 pl-5">
        <li>
          <Link href="/app/reviews" className={linkClass}>Reviews</Link>
          <span className="text-zinc-600 dark:text-zinc-400">
            {can(user.role, "view_all_reviews")
              ? `: all reviews${user.role === "auditor" ? ", read-only" : ""}`
              : ": your own reviews"}
          </span>
        </li>
        {can(user.role, "view_audit_log") && (
          <li>
            <Link href="/app/audit" className={linkClass}>Audit log</Link>
            <span className="text-zinc-600 dark:text-zinc-400">: every recorded event, with a JSON export</span>
          </li>
        )}
        {can(user.role, "submit_profile") && (
          <li>
            <Link href="/app/submit" className={linkClass}>Submit an agent profile</Link>
          </li>
        )}
      </ul>
      <form action={signOut} className="mt-10">
        <button type="submit" className="rounded border border-zinc-300 px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:border-zinc-700">
          Sign out
        </button>
      </form>
    </>
  );
}

export default function ReviewerApp() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Reviewer app</h1>
      <Suspense fallback={<p className="mt-3 text-zinc-500">Loading...</p>}>
        <Home />
      </Suspense>
    </main>
  );
}
