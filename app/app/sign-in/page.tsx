import { Suspense } from "react";
import { ROLE_LABELS, USERS } from "@/lib/users";
import { signIn } from "./actions";

const ERRORS: Record<string, string> = {
  invalid: "Sign-in failed. Check the user and the demo passcode.",
  setup: "Sign-in is not set up on this server yet (SESSION_SECRET or DEMO_PASSCODE is missing).",
  locked: "Too many failed sign-in attempts from your network. Try again in 15 minutes.",
  unavailable: "Sign-in is unavailable right now. Try again in a minute.",
};

async function SignInForm({ searchParams }: { searchParams: PageProps<"/app/sign-in">["searchParams"] }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  const next = typeof params.next === "string" ? params.next : "/app";
  return (
    <form action={signIn} className="mt-8">
      {error && (
        <p role="alert" className="mb-6 rounded border border-red-700 bg-red-50 p-3 text-red-900">
          {error}
        </p>
      )}
      <input type="hidden" name="next" value={next} />
      <fieldset>
        <legend className="font-medium">Choose a fictional user</legend>
        <div className="mt-3 space-y-2">
          {USERS.map((u, i) => (
            <label key={u.id} className="flex items-center gap-3 rounded border border-zinc-200 p-3 dark:border-zinc-800">
              <input type="radio" name="userId" value={u.id} defaultChecked={i === 0} required />
              <span>
                <span className="font-medium">{u.name}</span>, {ROLE_LABELS[u.role]}
                <span className="block text-sm text-zinc-500">{u.team}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-6 block font-medium">
        Demo passcode
        <input
          type="password"
          name="passcode"
          required
          autoComplete="off"
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <button type="submit" className="mt-6 rounded bg-zinc-900 px-5 py-2 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
        Sign in
      </button>
    </form>
  );
}

export default function SignInPage({ searchParams }: PageProps<"/app/sign-in">) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <p className="rounded border border-amber-600 bg-amber-50 p-3 text-sm font-medium text-amber-900">
        Stand-in for Harborline&apos;s corporate sign-in.
      </p>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Sign in to the reviewer app</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        Fictional users and synthetic data only. Production would use Harborline&apos;s corporate sign-in
        through OIDC or SAML.
      </p>
      <Suspense fallback={<p className="mt-8 text-zinc-500">Loading...</p>}>
        <SignInForm searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
