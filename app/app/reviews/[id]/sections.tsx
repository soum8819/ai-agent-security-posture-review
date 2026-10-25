// The parts of the review detail page. Server components, read-only.
import type { AgentProfile } from "@/lib/profile-schema";
import type { ReviewRecord } from "@/lib/review";
import type { DecisionRow } from "@/lib/store";
import {
  OUTCOME_TEXT,
  RESUME_TEXT,
  RULE_REQUIREMENTS,
  SEVERITY_COLOURS,
  SEVERITY_WORDS,
  VERDICT_TEXT,
  asiName,
  formatTime,
  modelLabel,
  submitterName,
  splitFindings,
  tierSentence,
  triggeringFields,
} from "@/lib/review-view";
import type { Severity } from "@/lib/rules";

type CheckedFinding = ReviewRecord["findings"][number];
type MissedFinding = ReviewRecord["missedFindings"][number];

export const focusRing =
  "rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

const muted = "text-zinc-600 dark:text-zinc-400";

export function SeverityBadge({ severity }: { severity: Severity }) {
  const c = SEVERITY_COLOURS[severity];
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: c.background, color: c.text }}
    >
      <span className="sr-only">Severity: </span>
      {SEVERITY_WORDS[severity]}
    </span>
  );
}

function modelName(id: string) {
  const m = modelLabel(id);
  return `${m.model} (${m.provider})`;
}

export function TierPanel({ result }: { result: ReviewRecord | null }) {
  const t = result?.tiers;
  const boxes: [string, string, number | undefined][] = [
    ["Rule tier", "Set by the fixed rules", t?.rule],
    ["Reviewer model tier", result ? modelName(result.reviewer.model) : "Reviewer model", t?.reviewer],
    ["Checker model tier", result ? modelName(result.checker.model) : "Checker model", t?.checker],
    ["Final tier", "The highest of the three", t?.final],
  ];
  return (
    <section aria-labelledby="tiers" className="mt-8">
      <h2 id="tiers" className="text-xl font-semibold">Tiers</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {boxes.map(([label, sub, value]) => (
          <div
            key={label}
            className={`rounded border p-3 ${label === "Final tier" ? "border-zinc-900 dark:border-zinc-100" : "border-zinc-200 dark:border-zinc-800"}`}
          >
            <dt className="text-sm font-medium">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{value ?? "pending"}</dd>
            <dd className={`mt-1 text-xs ${muted}`}>{sub}</dd>
          </div>
        ))}
      </dl>
      {t && <p className="mt-3">{tierSentence(t.final, t.setBy)}</p>}
    </section>
  );
}

export function RuleHits({ result, profile }: { result: ReviewRecord; profile: AgentProfile }) {
  return (
    <section aria-labelledby="rules" className="mt-10">
      <h2 id="rules" className="text-xl font-semibold">Rules that fired</h2>
      {result.ruleHits.length === 0 ? (
        <p className={`mt-3 ${muted}`}>No rule fired for this profile.</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {result.ruleHits.map((hit) => (
            <li key={hit.ruleId} className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-semibold">{hit.ruleId}</span>
                <SeverityBadge severity={hit.severity} />
                <span className={`text-sm ${muted}`}>
                  {hit.category} {asiName(hit.category)}
                </span>
              </div>
              <p className="mt-2">
                <span className="font-medium">The rule: </span>
                {RULE_REQUIREMENTS[hit.ruleId]}
              </p>
              <p className="mt-1">
                <span className="font-medium">What it found: </span>
                {hit.reason}
              </p>
              <dl className="mt-3 space-y-2">
                {triggeringFields(profile, hit.field).map((f) => (
                  <div key={f.field}>
                    <dt className={`text-sm ${muted}`}>Profile field: {f.label}</dt>
                    {f.values.map((v) => (
                      <dd key={v}>
                        <mark className="rounded bg-yellow-100 px-1 text-zinc-900">{v}</mark>
                      </dd>
                    ))}
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FindingHeader({ category, severity }: { category: string; severity: Severity }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SeverityBadge severity={severity} />
      <h3 className="font-semibold">
        {category} {asiName(category)}
      </h3>
    </div>
  );
}

function Evidence({ quote }: { quote: string }) {
  return (
    <figure className="mt-3">
      <figcaption className={`text-sm ${muted}`}>Evidence from the profile</figcaption>
      <blockquote className="mt-1 border-l-4 border-zinc-300 pl-3 italic break-words dark:border-zinc-700">
        “{quote}”
      </blockquote>
    </figure>
  );
}

function FloorNote({ f }: { f: { severity: Severity; modelSeverity: Severity; raisedByRule?: string; floorKept?: string } }) {
  if (!f.raisedByRule) return null;
  return (
    <p className={`mt-2 text-sm ${muted}`}>
      Raised to {SEVERITY_WORDS[f.severity]} by rule {f.raisedByRule}. The reviewer model said{" "}
      {SEVERITY_WORDS[f.modelSeverity]}.
      {f.floorKept && " The rule's minimum stays even though the checker model disagrees."}
    </p>
  );
}

function CheckedFindingCard({ f, reviewer, checker }: { f: CheckedFinding; reviewer: string; checker: string }) {
  const verdict = `${VERDICT_TEXT[f.secondModelVerdict] ?? f.secondModelVerdict}.`;
  return (
    <li className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <FindingHeader category={f.category} severity={f.severity} />
      <FloorNote f={f} />
      <Evidence quote={f.evidenceQuote} />
      <div className={`mt-3 grid gap-3 ${f.contested ? "md:grid-cols-2" : ""}`}>
        <div className={f.contested ? "rounded bg-zinc-50 p-3 dark:bg-zinc-900" : ""}>
          <p className="text-sm font-medium">Reviewer model, {reviewer}</p>
          <p className="mt-1">{f.whyItMatters}</p>
        </div>
        <div className={f.contested ? "rounded bg-zinc-50 p-3 dark:bg-zinc-900" : ""}>
          <p className="text-sm font-medium">Checker model, {checker}</p>
          <p className="mt-1">
            <span className="font-medium">{verdict}</span> {f.secondModelReason}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm">
        <span className="font-medium">Suggested fix: </span>
        {f.recommendedControl}
      </p>
    </li>
  );
}

function MissedFindingCard({ f, checker }: { f: MissedFinding; checker: string }) {
  return (
    <li className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <FindingHeader category={f.category} severity={f.severity} />
      <FloorNote f={f} />
      <Evidence quote={f.evidenceQuote} />
      <p className="mt-3 text-sm font-medium">Checker model, {checker}</p>
      <p className="mt-1">{f.whyItMatters}</p>
      <p className="mt-3 text-sm">
        <span className="font-medium">Suggested fix: </span>
        {f.recommendedControl}
      </p>
    </li>
  );
}

export function Findings({ result }: { result: ReviewRecord }) {
  const reviewer = modelName(result.reviewer.model);
  const checker = modelName(result.checker.model);
  const { contested, others } = splitFindings(result.findings);
  return (
    <section aria-labelledby="findings" className="mt-10">
      <h2 id="findings" className="text-xl font-semibold">Findings</h2>

      {contested.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">The two models disagree on these</h3>
          <p className={`mt-1 text-sm ${muted}`}>
            The approver must decide each of these. Both views are shown side by side.
          </p>
          <ul className="mt-3 space-y-4">
            {contested.map((f) => (
              <CheckedFindingCard key={f.id} f={f} reviewer={reviewer} checker={checker} />
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-semibold">{contested.length > 0 ? "Other findings" : "All findings"}</h3>
        {others.length === 0 ? (
          <p className={`mt-2 ${muted}`}>None.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {others.map((f) => (
              <CheckedFindingCard key={f.id} f={f} reviewer={reviewer} checker={checker} />
            ))}
          </ul>
        )}
      </div>

      {result.missedFindings.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold">Found only by the checker model</h3>
          <ul className="mt-3 space-y-4">
            {splitFindings(result.missedFindings.map((f) => ({ ...f, contested: false }))).others.map((f, i) => (
              <MissedFindingCard key={i} f={f} checker={checker} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const DROP_REASONS: Record<string, string> = {
  "evidence quote not found in the profile": "The quoted text is not in the profile, so this finding was not used.",
};

export function DroppedFindings({ result }: { result: ReviewRecord }) {
  const dropped = [
    ...result.droppedFindings.map((d) => ({ ...d, by: modelName(result.reviewer.model), role: "Reviewer model" })),
    ...result.droppedMissedFindings.map((d) => ({ ...d, by: modelName(result.checker.model), role: "Checker model" })),
  ];
  if (dropped.length === 0) return null;
  return (
    <details className="mt-10 rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <summary className={`cursor-pointer font-semibold ${focusRing}`}>
        Findings the evidence check dropped ({dropped.length})
      </summary>
      <ul className="mt-3 space-y-4">
        {dropped.map((d, i) => (
          <li key={i}>
            <p className="text-sm font-medium">
              {d.role}, {d.by}: {d.finding.category} {asiName(d.finding.category)}
            </p>
            <p className="mt-1">
              <span className="font-medium">Why it was dropped: </span>
              {DROP_REASONS[d.reason] ?? d.reason}
            </p>
            <Evidence quote={d.finding.evidenceQuote} />
          </li>
        ))}
      </ul>
    </details>
  );
}

const STAGE_TITLES: Record<string, string> = { appsec: "AppSec decision", model_risk: "Model Risk decision" };

// Every recorded decision, read-only, for everyone who may see the review.
export function DecisionHistory({ decisions, findingLabels }: { decisions: DecisionRow[]; findingLabels: Record<string, string> }) {
  if (decisions.length === 0) return null;
  return (
    <section aria-labelledby="decisions" className="mt-10">
      <h2 id="decisions" className="text-xl font-semibold">Decisions</h2>
      <ol className="mt-3 space-y-4">
        {decisions.map((d) => (
          <li key={d.id} className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="font-semibold">
              {STAGE_TITLES[d.stage]}: {OUTCOME_TEXT[d.outcome] ?? d.outcome}
            </p>
            <p className={`text-sm ${muted}`}>
              By {submitterName(d.decider_id)}, {formatTime(d.created_at)}
            </p>
            <p className="mt-2">
              <span className="font-medium">Note: </span>
              {d.note}
            </p>
            {d.conditions && (
              <p className="mt-1">
                <span className="font-medium">Conditions: </span>
                {d.conditions}
              </p>
            )}
            {d.contested_resolutions.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Contested findings</p>
                <ul className="list-disc pl-5">
                  {d.contested_resolutions.map((r) => (
                    <li key={r.findingId}>
                      {r.findingId}
                      {findingLabels[r.findingId] ? ` (${findingLabels[r.findingId]})` : ""}:{" "}
                      {r.resolution === "accepted" ? "accepted" : `dismissed. Reason: ${r.reason ?? ""}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {d.workflow_resume && <p className={`mt-2 text-sm ${muted}`}>{RESUME_TEXT[d.workflow_resume] ?? d.workflow_resume}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
