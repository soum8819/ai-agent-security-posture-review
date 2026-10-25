"use client";

// The decision form, shown only to the person whose turn it is. The server
// checks everything again (lib/authz.ts); this form only helps fill it in.
import { useRouter } from "next/navigation";
import { useState } from "react";

type Contested = { id: string; label: string };
type Choice = "approved" | "approved_with_conditions" | "rejected" | "changes_requested";

const CHOICES: { value: Choice; label: string; hint: string }[] = [
  { value: "approved", label: "Approve", hint: "The agent may launch." },
  { value: "approved_with_conditions", label: "Approve with conditions", hint: "The agent may launch once the conditions are met." },
  { value: "rejected", label: "Reject", hint: "The agent may not launch. This ends the review." },
  { value: "changes_requested", label: "Request changes", hint: "This ends the review. The submitter can fix the profile and resubmit it as a new review." },
];

const field =
  "mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

export function DecisionPanel({
  reviewId,
  stage,
  stageName,
  contested,
}: {
  reviewId: string;
  stage: "appsec" | "model_risk";
  stageName: string;
  contested: Contested[];
}) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<Choice | null>(null);
  const [note, setNote] = useState("");
  const [conditions, setConditions] = useState("");
  const [resolutions, setResolutions] = useState<Record<string, { resolution: "accepted" | "dismissed" | null; reason: string }>>(
    Object.fromEntries(contested.map((c) => [c.id, { resolution: null, reason: "" }])),
  );
  const [state, setState] = useState<{ kind: "idle" | "sending" | "done" | "error"; message?: string }>({ kind: "idle" });

  const approving = outcome === "approved" || outcome === "approved_with_conditions";

  async function send() {
    if (!outcome) return setState({ kind: "error", message: "Choose a decision." });
    if (!note.trim()) return setState({ kind: "error", message: "A note is required for every decision." });
    if (outcome === "approved_with_conditions" && !conditions.trim()) {
      return setState({ kind: "error", message: "Write down the conditions." });
    }
    if (approving) {
      for (const c of contested) {
        const r = resolutions[c.id];
        if (!r.resolution) return setState({ kind: "error", message: `Accept or dismiss contested finding ${c.id} before approving.` });
        if (r.resolution === "dismissed" && !r.reason.trim()) {
          return setState({ kind: "error", message: `Give a reason for dismissing contested finding ${c.id}.` });
        }
      }
    }
    setState({ kind: "sending" });
    try {
      const res = await fetch(`/api/reviews/${reviewId}/decisions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stage,
          outcome,
          note,
          conditions: outcome === "approved_with_conditions" ? conditions : undefined,
          resolutions: contested
            .filter((c) => resolutions[c.id].resolution)
            .map((c) => ({ findingId: c.id, resolution: resolutions[c.id].resolution, reason: resolutions[c.id].reason })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setState({ kind: "done", message: "Decision recorded." });
        router.refresh();
      } else if (res.status === 409) {
        // Most often a double click, or someone else deciding first.
        setState({ kind: "error", message: `${body.error ?? "This stage has already been decided."} The page now shows the recorded decision.` });
        router.refresh();
      } else {
        setState({ kind: "error", message: body.error ?? `The decision was not recorded (${res.status}).` });
      }
    } catch {
      setState({ kind: "error", message: "Could not reach the server. The decision was not recorded." });
    }
  }

  return (
    <section aria-labelledby="decide" className="mt-10 rounded border-2 border-zinc-900 p-4 dark:border-zinc-100">
      <h2 id="decide" className="text-xl font-semibold">Your {stageName} decision</h2>

      <fieldset className="mt-4">
        <legend className="font-medium">Decision</legend>
        <div className="mt-2 space-y-2">
          {CHOICES.map((c) => (
            <label key={c.value} className="flex items-start gap-3">
              <input
                type="radio"
                name="outcome"
                value={c.value}
                checked={outcome === c.value}
                onChange={() => setOutcome(c.value)}
                className="mt-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              />
              <span>
                <span className="font-medium">{c.label}</span>
                <span className="block text-sm text-zinc-600 dark:text-zinc-400">{c.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {outcome === "approved_with_conditions" && (
        <label className="mt-4 block font-medium">
          Conditions (required)
          <textarea className={field} rows={3} value={conditions} onChange={(e) => setConditions(e.target.value)} />
        </label>
      )}

      {contested.length > 0 && (
        <fieldset className="mt-6">
          <legend className="font-medium">Contested findings</legend>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Required before approving: accept each one, or dismiss it with a reason.
          </p>
          <div className="mt-3 space-y-4">
            {contested.map((c) => (
              <div key={c.id} className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="font-medium">{c.id}: {c.label}</p>
                <div className="mt-2 flex flex-wrap gap-4">
                  {(["accepted", "dismissed"] as const).map((r) => (
                    <label key={r} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`resolution-${c.id}`}
                        checked={resolutions[c.id].resolution === r}
                        onChange={() => setResolutions({ ...resolutions, [c.id]: { ...resolutions[c.id], resolution: r } })}
                        className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                      />
                      {r === "accepted" ? "Accept the finding" : "Dismiss it"}
                    </label>
                  ))}
                </div>
                {resolutions[c.id].resolution === "dismissed" && (
                  <label className="mt-2 block text-sm font-medium">
                    Reason for dismissing (required)
                    <textarea
                      className={field}
                      rows={2}
                      value={resolutions[c.id].reason}
                      onChange={(e) => setResolutions({ ...resolutions, [c.id]: { ...resolutions[c.id], reason: e.target.value } })}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>
        </fieldset>
      )}

      <label className="mt-6 block font-medium">
        Note (required)
        <textarea className={field} rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      <button
        type="button"
        onClick={send}
        disabled={state.kind === "sending" || state.kind === "done"}
        className="mt-4 rounded bg-zinc-900 px-5 py-2 font-medium text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {state.kind === "sending" ? "Recording..." : "Record decision"}
      </button>

      {state.message && (
        <p
          role={state.kind === "error" ? "alert" : "status"}
          className={`mt-3 rounded border p-3 ${state.kind === "error" ? "border-red-700 bg-red-50 text-red-900" : "border-green-700 bg-green-50 text-green-900"}`}
        >
          {state.message}
        </p>
      )}
    </section>
  );
}
