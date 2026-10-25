// The reviewer app home (design pass): who you are, what is waiting for you,
// and action cards for what your role can do.
import Link from "next/link";
import { Suspense } from "react";
import { Card, PageHeader, Skeleton, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { reviewScope } from "@/lib/review-access";
import { listReviews } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/users";

function ActionCard({ href, title, body, stat, primary }: { href: string; title: string; body: string; stat?: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={cx(
        "group block rounded-lg border p-5 transition-colors duration-150",
        primary ? "border-ink bg-subtle hover:bg-fill" : "border-line hover:bg-subtle",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <span aria-hidden className="text-muted transition-transform duration-150 group-hover:translate-x-0.5">→</span>
      </div>
      <p className="mt-1 text-sm text-muted">{body}</p>
      {stat && <p className="mt-4 text-sm font-medium tabular">{stat}</p>}
    </Link>
  );
}

async function Home() {
  const user = await requireUser();
  const reviews = await listReviews(reviewScope(user));
  const count = (status: string) => reviews.filter((r) => r.status === status).length;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  return (
    <>
      <PageHeader
        eyebrow={ROLE_LABELS[user.role]}
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description={`Signed in as ${user.name}, ${user.team}.`}
      />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {user.role === "appsec_reviewer" && (
          <ActionCard
            primary
            href="/app/reviews"
            title="Reviews waiting for AppSec"
            body="Tier 1 and 2 reviews are decided by AppSec alone. Tier 3 goes to Model Risk after you."
            stat={plural(count("awaiting_appsec"), "review") + " waiting"}
          />
        )}
        {user.role === "model_risk_reviewer" && (
          <ActionCard
            primary
            href="/app/reviews"
            title="Reviews waiting for Model Risk"
            body="Tier 3 reviews come to you after AppSec has approved. You must be a different person from the AppSec approver."
            stat={plural(count("awaiting_model_risk"), "review") + " waiting"}
          />
        )}
        {can(user.role, "submit_profile") && (
          <ActionCard
            primary
            href="/app/submit"
            title="Submit an agent profile"
            body="Describe the agent, its tools, data and controls. The rules and two models review it, then a person decides."
          />
        )}
        <ActionCard
          href="/app/reviews"
          title={can(user.role, "view_all_reviews") ? "All reviews" : "Your reviews"}
          body={
            user.role === "auditor"
              ? "Every review, its findings and its decisions, read-only."
              : can(user.role, "view_all_reviews")
                ? "Every review, newest first, with its tier and status."
                : "Your submissions, their status and any changes requested."
          }
          stat={
            user.role === "submitter"
              ? `${plural(reviews.length, "review")}${count("changes_requested") ? `, ${count("changes_requested")} with changes requested` : ""}`
              : plural(reviews.length, "review")
          }
        />
        {can(user.role, "view_audit_log") && (
          <ActionCard primary href="/app/audit" title="Audit log" body="Every recorded event, in order, with a JSON export. Events can only be added, never changed." />
        )}
      </div>
      <Card className="mt-8 p-5">
        <h2 className="text-sm font-semibold">How a review works</h2>
        <ol className="mt-3 grid gap-3 text-sm text-muted sm:grid-cols-5">
          {["Submit a profile", "Fixed rules set a floor", "Reviewer model finds risks", "Checker model checks them", "A person decides"].map((s, i) => (
            <li key={s} className="flex gap-2 sm:flex-col sm:gap-1">
              <span className="font-mono text-xs text-ink">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}

export default function ReviewerApp() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton lines={5} />}>
        <Home />
      </Suspense>
    </main>
  );
}
