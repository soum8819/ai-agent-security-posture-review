import { SubmitForm } from "./submit-form";

export default function SubmitPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Submit an agent profile
      </h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        Fill in the form and press Validate to check it against the profile
        schema. Nothing is saved or sent anywhere yet.
      </p>
      <SubmitForm />
    </main>
  );
}
