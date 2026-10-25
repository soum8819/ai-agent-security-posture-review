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
  "mt-1 w-full rounded-md border border-line bg-page px-3 py-2 text-base text-ink placeholder:text-muted sm:text-sm";

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
    <section aria-labelledby="decide" className="scroll-mt-24 rounded-lg border border-ink bg-page p-5">
      <h2 id="decide" className="font-semibold">Your {stageName} decision</h2>

      <fieldset className="mt-4 space-y-2">
        <legend className="text-sm font-medium">Decision</legend>
        <div className="mt-2 space-y-2">
          {CHOICES.map((c) => (
            <label key={c.value} className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3 transition-colors duration-150 hover:bg-subtle has-[:checked]:border-ink has-[:checked]:bg-subtle">
              <input
                type="radio"
                name="outcome"
                value={c.value}
                checked={outcome === c.value}
                onChange={() => setOutcome(c.value)}
                className="mt-1 size-4 accent-[var(--ink)]"
              />
              <span>
                <span className="text-sm font-medium">{c.label}</span>
                <span className="block text-xs text-muted">{c.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {outcome === "approved_with_conditions" && (
        <label className="mt-4 block text-sm font-medium">
          Conditions (required)
          <textarea className={field} rows={3} value={conditions} onChange={(e) => setConditions(e.target.value)} />
        </label>
      )}

      {contested.length > 0 && (
        <fieldset className="mt-6">
          <legend className="text-sm font-medium">Contested findings</legend>
          <p className="text-xs text-muted">
            Required before approving: accept each one, or dismiss it with a reason.
          </p>
          <div className="mt-3 space-y-4">
            {contested.map((c) => (
              <div key={c.id} className="rounded-md border border-dot-warn p-3">
                <p className="text-sm font-medium"><span className="font-mono text-muted">{c.id}</span> {c.label}</p>
                <div className="mt-2 flex flex-wrap gap-4">
                  {(["accepted", "dismissed"] as const).map((r) => (
                    <label key={r} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm sm:min-h-9">
                      <input
                        type="radio"
                        name={`resolution-${c.id}`}
                        checked={resolutions[c.id].resolution === r}
                        onChange={() => setResolutions({ ...resolutions, [c.id]: { ...resolutions[c.id], resolution: r } })}
                        className="size-4 accent-[var(--ink)]"
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

      <label className="mt-5 block text-sm font-medium">
        Note (required)
        <textarea className={field} rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      <button
        type="button"
        onClick={send}
        disabled={state.kind === "sending" || state.kind === "done"}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-page transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state.kind === "sending" ? "Recording decision…" : "Record decision"}
      </button>

      {state.message && (
        <p
          role={state.kind === "error" ? "alert" : "status"}
          className={`mt-3 rounded-md border border-l-4 bg-subtle px-3 py-2 text-sm ${state.kind === "error" ? "border-dot-bad" : "border-dot-ok"}`}
        >
          {state.message}
        </p>
      )}
    </section>
  );
}
