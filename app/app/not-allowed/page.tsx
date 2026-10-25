import Link from "next/link";

export default function NotAllowedPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Not allowed</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">Your role cannot open that page.</p>
      <Link href="/app" className="mt-6 inline-block underline">
        Back to the reviewer app
      </Link>
    </main>
  );
}
