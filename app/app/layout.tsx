// The frame around every reviewer app page: a slim top bar with the product
// name, the pages this role can use, who is signed in, and Sign out.
import Link from "next/link";
import { Suspense } from "react";
import { NavLink } from "@/components/nav-link";
import { button } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/users";
import { signOut } from "./sign-in/actions";

async function UserNav() {
  const user = await currentUser();
  if (!user) return null;
  return (
    <>
      <nav aria-label="Reviewer app" className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
        <NavLink href="/app">Home</NavLink>
        <NavLink href="/app/reviews">Reviews</NavLink>
        {can(user.role, "submit_profile") && <NavLink href="/app/submit">Submit</NavLink>}
        {can(user.role, "view_audit_log") && <NavLink href="/app/audit">Audit log</NavLink>}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right leading-tight sm:block">
          <div className="text-sm font-medium">{user.name}</div>
          <div className="text-xs text-muted">{ROLE_LABELS[user.role]}</div>
        </div>
        <form action={signOut}>
          <button type="submit" className={`${button.secondary} min-h-9 sm:min-h-9 px-3`}>
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-page/90 backdrop-blur supports-[backdrop-filter]:bg-page/75">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6">
          <Link href="/app" className="flex items-center gap-2.5 rounded-md">
            <span aria-hidden className="grid size-7 place-items-center rounded-md bg-ink font-mono text-sm font-semibold text-page">
              H
            </span>
            <span className="text-sm font-semibold tracking-tight">Harborline</span>
            <span className="text-sm text-muted">Agent review</span>
            <span className="hidden rounded border border-line px-1.5 py-0.5 text-[11px] text-muted md:inline">Fictional customer</span>
          </Link>
          <Suspense fallback={null}>
            <UserNav />
          </Suspense>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
      <footer className="border-t border-line">
        <p className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-muted sm:px-6">
          Harborline Financial Group is a fictional customer. All agents and data are synthetic. Sign-in is a stand-in for
          corporate sign-in.
        </p>
      </footer>
    </div>
  );
}
