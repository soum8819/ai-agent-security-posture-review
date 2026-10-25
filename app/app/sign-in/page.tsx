// Sign-in (design pass): a centred card with the stand-in notice first, the
// four fictional users as selectable cards, and the demo passcode.
import { Suspense } from "react";
import { Card, Notice, Skeleton, button, cx } from "@/components/ui";
import { ROLE_LABELS, USERS } from "@/lib/users";
import { signIn } from "./actions";

const ERRORS: Record<string, string> = {
  invalid: "Sign-in failed. Check the user and the demo passcode.",
  setup: "Sign-in is not set up on this server yet (SESSION_SECRET or DEMO_PASSCODE is missing).",
  locked: "Too many failed sign-in attempts from your network. Try again in 15 minutes.",
  unavailable: "Sign-in is unavailable right now. Try again in a minute.",
};

const ROLE_HINTS: Record<string, string> = {
  submitter: "Submits agent profiles and sees their own reviews",
  appsec_reviewer: "Decides tier 1 to 3 reviews, first",
  model_risk_reviewer: "Decides tier 3 reviews, after AppSec",
  auditor: "Reads every review and the audit log",
};

async function SignInForm({ searchParams }: { searchParams: PageProps<"/app/sign-in">["searchParams"] }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  const next = typeof params.next === "string" ? params.next : "/app";
  return (
    <form action={signIn} className="space-y-6">
      {error && (
        <Notice tone="bad" role="alert">
          {error}
        </Notice>
      )}
      <input type="hidden" name="next" value={next} />
      <fieldset>
        <legend className="text-sm font-medium">Choose a fictional user</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {USERS.map((u, i) => (
            <label
              key={u.id}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3 transition-colors duration-150 hover:bg-subtle has-[:checked]:border-ink has-[:checked]:bg-subtle"
            >
              <input type="radio" name="userId" value={u.id} defaultChecked={i === 0} required className="mt-1 size-4 accent-[var(--ink)]" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{u.name}</span>
                <span className="block text-xs text-muted">{ROLE_LABELS[u.role]}, {u.team}</span>
                <span className="mt-1 block text-xs text-muted">{ROLE_HINTS[u.role]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm font-medium">
        Demo passcode
        <input
          type="password"
          name="passcode"
          required
          autoComplete="off"
          className="mt-1 w-full rounded-md border border-line bg-page px-3 py-2 text-base font-normal sm:text-sm"
        />
      </label>
      <button type="submit" className={cx(button.primary, "w-full")}>
        Sign in
      </button>
    </form>
  );
}

export default function SignInPage({ searchParams }: PageProps<"/app/sign-in">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <Notice tone="warn" title="Stand-in for Harborline&apos;s corporate sign-in.">
        Fictional users and synthetic data only. Production would use Harborline&apos;s corporate sign-in through OIDC or SAML.
      </Notice>
      <Card className="mt-6 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to the reviewer app</h1>
        <p className="mt-1 text-sm text-muted">Pick who you are acting as. Each role sees and decides different things.</p>
        <div className="mt-6">
          <Suspense fallback={<Skeleton lines={4} />}>
            <SignInForm searchParams={searchParams} />
          </Suspense>
        </div>
      </Card>
    </main>
  );
}
