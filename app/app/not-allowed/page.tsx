import Link from "next/link";
import { EmptyState } from "@/components/ui";

export default function NotAllowedPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16 sm:px-6">
      <h1 className="sr-only">Not allowed</h1>
      <EmptyState title="Not allowed" body="Your role cannot open that page." action={{ href: "/app", label: "Back to the reviewer app" }} />
      <p className="mt-4 text-center text-sm text-muted">
        Signed in as the wrong person? <Link href="/app/sign-in" className="text-accent hover:underline">Sign in again</Link>.
      </p>
    </main>
  );
}
