// The parts of the review detail page (design pass). Server components,
// read-only. Evidence quotes are always shown exactly as stored and marked
// with data-evidence-quote; nothing else on the page may look like JSON.
import { Card, SectionTitle, SeverityBadge, TierChip, button, cx } from "@/components/ui";
import { profileExcerpts } from "@/lib/evidence";
import type { AgentProfile } from "@/lib/profile-schema";
import type { ReviewRecord } from "@/lib/review";
import type { DecisionRow } from "@/lib/store";
import {
  OUTCOME_TEXT,
  RESUME_TEXT,
  RULE_REQUIREMENTS,
  SEVERITY_WORDS,
  VERDICT_TEXT,
  asiName,
  formatTime,
  modelLabel,
  quoteSource,
  splitFindings,
  submitterName,
  tierSentence,
  triggeringFields,
} from "@/lib/review-view";
import type { Severity } from "@/lib/rules";

type CheckedFinding = ReviewRecord["findings"][number];
type MissedFinding = ReviewRecord["missedFindings"][number];

export { SeverityBadge };

export function modelName(id: string) {
  const m = modelLabel(id);
  return `${m.model} (${m.provider})`;
}

// The four tiers side by side; the final one stands out.
export function TierPanel({ result }: { result: ReviewRecord | null }) {
  const t = result?.tiers;
  const boxes: { label: string; sub: string; value: number | null; final?: boolean }[] = [
    { label: "Rules", sub: "Set by the fixed rules", value: t?.rule ?? null },
    { label: "Reviewer model", sub: result ? modelName(result.reviewer.model) : "Reviewer model", value: t?.reviewer ?? null },
    { label: "Checker model", sub: result ? modelName(result.checker.model) : "Checker model", value: t?.checker ?? null },
    { label: "Final tier", sub: "The highest of the three", value: t?.final ?? null, final: true },
  ];
  return (
    <section aria-labelledby="tiers">
      <SectionTitle id="tiers">Tiers</SectionTitle>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {boxes.map((b) => (
          <div key={b.label} className={cx("rounded-lg border p-3", b.final ? "border-ink bg-subtle" : "border-line")}>
            <dt className="text-xs font-medium text-muted">{b.label}</dt>
            <dd className="mt-2"><TierChip tier={b.value} /></dd>
            <dd className="mt-2 text-xs text-muted">{b.sub}</dd>
          </div>
        ))}
      </dl>
      {t && <p className="mt-3 text-sm text-muted">{tierSentence(t.final, t.setBy)}</p>}
    </section>
  );
}

export function RuleHits({ result, profile }: { result: ReviewRecord; profile: AgentProfile }) {
  return (
    <section aria-labelledby="rules">
      <SectionTitle id="rules" aside={result.ruleHits.length ? `${result.ruleHits.length} fired` : undefined}>
        Rules that fired
      </SectionTitle>
      <Card className="mb-3 p-4">
        <h3 className="text-sm font-medium">
          Why the rules set <TierChip tier={result.tiers.rule} />
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {(result.tiers.ruleReasons ?? []).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">The tier rules look only at the data the agent reads and the actions it can take. The risk rules R1 to R8 below raise findings.</p>
      </Card>
      {result.ruleHits.length === 0 ? (
        <p className="text-sm text-muted">None of the risk rules R1 to R8 fired for this profile.</p>
      ) : (
        <ul className="space-y-3">
          {result.ruleHits.map((hit) => (
            <Card as="li" key={hit.ruleId} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-fill px-1.5 py-0.5 font-mono text-xs font-semibold">{hit.ruleId}</span>
                <SeverityBadge severity={hit.severity} />
                <span className="text-sm text-muted">
                  <span className="font-mono">{hit.category}</span> {asiName(hit.category)}
                </span>
              </div>
              <p className="mt-3 text-sm">
                <span className="font-medium">The rule.</span> {RULE_REQUIREMENTS[hit.ruleId]}
              </p>
              <p className="mt-1 text-sm">
                <span className="font-medium">What it found.</span> {hit.reason}
              </p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {triggeringFields(profile, hit.field).map((f) => (
                  <div key={f.field} className="min-w-0">
                    <dt className="text-xs text-muted">Profile field: {f.label}</dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {f.values.map((v) => (
                        <mark key={v} className="rounded bg-mark-bg px-1.5 py-0.5 text-sm break-words text-mark-fg">{v}</mark>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </ul>
      )}
    </section>
  );
}

// Model-written text. Fragments verbatim from the profile (checked with the
// same exact-match test as evidence quotes) are shown as quotes in monospace;
// everything else exactly as the model wrote it.
function ModelText({ text, profile }: { text: string; profile: AgentProfile }) {
  return (
    <>
      {profileExcerpts(text, profile).map((p, i) =>
        p.excerpt ? (
          <code key={i} data-evidence-quote className="rounded bg-fill px-1 font-mono text-[0.9em] break-words" title="Quoted from the profile">
            {p.text}
          </code>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

// Evidence quotes are shown exactly as stored. Field excerpts in the
// profile's JSON form are set in monospace and say which field they are from.
function Evidence({ quote }: { quote: string }) {
  const source = quoteSource(quote);
  return (
    <figure className="mt-3">
      <figcaption className="text-xs text-muted">
        {source.jsonLike ? `Evidence from the profile. Quoted from the profile field: ${source.field ?? "profile data"}` : "Evidence from the profile"}
      </figcaption>
      {source.jsonLike ? (
        <blockquote data-evidence-quote className="mt-1 rounded-md border border-line bg-subtle px-3 py-2 font-mono text-[13px] leading-relaxed whitespace-pre-line break-words">
          {quote}
        </blockquote>
      ) : (
        <blockquote data-evidence-quote className="mt-1 rounded-md border-l-2 border-line-strong bg-subtle px-3 py-2 text-sm break-words">
          “{quote}”
        </blockquote>
      )}
    </figure>
  );
}

function FindingHeader({ id, category, severity }: { id?: string; category: string; severity: Severity }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SeverityBadge severity={severity} />
      <h3 className="font-medium">
        <span className="font-mono text-sm text-muted">{category}</span> {asiName(category)}
      </h3>
      {id && <span className="ml-auto font-mono text-xs text-muted">{id}</span>}
    </div>
  );
}

function FloorNote({ f }: { f: { severity: Severity; modelSeverity: Severity; raisedByRule?: string; floorKept?: string } }) {
  if (!f.raisedByRule) return null;
  return (
    <p className="mt-2 text-xs text-muted">
      Raised to {SEVERITY_WORDS[f.severity]} by rule {f.raisedByRule}. The reviewer model said {SEVERITY_WORDS[f.modelSeverity]}.
      {f.floorKept && " The rule's minimum stays even though the checker model disagrees."}
    </p>
  );
}

function Fix({ text, profile }: { text: string; profile: AgentProfile }) {
  return (
    <p className="mt-3 border-t border-line pt-3 text-sm">
      <span className="font-medium">Suggested fix.</span> <ModelText text={text} profile={profile} />
    </p>
  );
}

function CheckedFindingCard({ f, reviewer, checker, profile }: { f: CheckedFinding; reviewer: string; checker: string; profile: AgentProfile }) {
  const verdict = `${VERDICT_TEXT[f.secondModelVerdict] ?? f.secondModelVerdict}.`;
  return (
    <Card as="li" className={cx("p-4", f.contested && "border-dot-warn")}>
      <FindingHeader id={f.id} category={f.category} severity={f.severity} />
      <FloorNote f={f} />
      <Evidence quote={f.evidenceQuote} />
      {f.contested ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-line p-3">
            <p className="text-xs font-medium text-muted">Reviewer model, {reviewer}</p>
            <p className="mt-1 text-sm"><ModelText text={f.whyItMatters} profile={profile} /></p>
          </div>
          <div className="rounded-md border border-line p-3">
            <p className="text-xs font-medium text-muted">Checker model, {checker}</p>
            <p className="mt-1 text-sm">
              <span className="font-semibold">{verdict}</span> <ModelText text={f.secondModelReason} profile={profile} />
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm">
            <span className="text-xs font-medium text-muted">Reviewer model, {reviewer}. </span>
            <ModelText text={f.whyItMatters} profile={profile} />
          </p>
          <p className="mt-2 text-sm">
            <span className="text-xs font-medium text-muted">Checker model, {checker}. </span>
            <span className="font-medium">{verdict}</span> <ModelText text={f.secondModelReason} profile={profile} />
          </p>
        </>
      )}
      <Fix text={f.recommendedControl} profile={profile} />
    </Card>
  );
}

function MissedFindingCard({ f, checker, profile }: { f: MissedFinding; checker: string; profile: AgentProfile }) {
  return (
    <Card as="li" className="p-4">
      <FindingHeader category={f.category} severity={f.severity} />
      <FloorNote f={f} />
      <Evidence quote={f.evidenceQuote} />
      <p className="mt-3 text-sm">
        <span className="text-xs font-medium text-muted">Checker model, {checker}. </span>
        <ModelText text={f.whyItMatters} profile={profile} />
      </p>
      <Fix text={f.recommendedControl} profile={profile} />
    </Card>
  );
}

export function Findings({ result, profile }: { result: ReviewRecord; profile: AgentProfile }) {
  const reviewer = modelName(result.reviewer.model);
  const checker = modelName(result.checker.model);
  const { contested, others } = splitFindings(result.findings);
  return (
    <section aria-labelledby="findings" className="space-y-8">
      <SectionTitle id="findings" aside={`${result.findings.length + result.missedFindings.length} in all`}>Findings</SectionTitle>

      {contested.length > 0 && (
        <div>
          <h3 className="font-semibold">The two models disagree on these</h3>
          <p className="mt-1 text-sm text-muted">The approver must decide each of these. Both views are shown side by side.</p>
          <ul className="mt-3 space-y-3">
            {contested.map((f) => (
              <CheckedFindingCard key={f.id} f={f} reviewer={reviewer} checker={checker} profile={profile} />
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="font-semibold">{contested.length > 0 ? "Other findings" : "All findings"}</h3>
        {others.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {others.map((f) => (
              <CheckedFindingCard key={f.id} f={f} reviewer={reviewer} checker={checker} profile={profile} />
            ))}
          </ul>
        )}
      </div>

      {result.missedFindings.length > 0 && (
        <div>
          <h3 className="font-semibold">Found only by the checker model</h3>
          <ul className="mt-3 space-y-3">
            {splitFindings(result.missedFindings.map((f) => ({ ...f, contested: false }))).others.map((f, i) => (
              <MissedFindingCard key={i} f={f} checker={checker} profile={profile} />
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
    <details className="group rounded-lg border border-line">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium">
        Findings the evidence check dropped ({dropped.length})
        <span aria-hidden className="text-muted transition-transform duration-150 group-open:rotate-90">›</span>
      </summary>
      <ul className="space-y-4 border-t border-line px-4 py-4">
        {dropped.map((d, i) => (
          <li key={i}>
            <p className="text-sm font-medium">
              {d.role}, {d.by}: <span className="font-mono text-muted">{d.finding.category}</span> {asiName(d.finding.category)}
            </p>
            <p className="mt-1 text-sm text-muted">{DROP_REASONS[d.reason] ?? d.reason}</p>
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
    <section aria-labelledby="decisions">
      <SectionTitle id="decisions">Decisions</SectionTitle>
      <ol className="space-y-3">
        {decisions.map((d) => (
          <Card as="li" key={d.id} className="p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">
                {STAGE_TITLES[d.stage]}: {OUTCOME_TEXT[d.outcome] ?? d.outcome}
              </p>
              <p className="text-xs text-muted tabular">
                {submitterName(d.decider_id)}, {formatTime(d.created_at)}
              </p>
            </div>
            <p className="mt-2 text-sm">
              <span className="font-medium">Note.</span> {d.note}
            </p>
            {d.conditions && (
              <p className="mt-1 text-sm">
                <span className="font-medium">Conditions.</span> {d.conditions}
              </p>
            )}
            {d.contested_resolutions.length > 0 && (
              <div className="mt-2 text-sm">
                <p className="font-medium">Contested findings</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
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
            {d.workflow_resume && <p className="mt-3 text-xs text-muted">{RESUME_TEXT[d.workflow_resume] ?? d.workflow_resume}</p>}
          </Card>
        ))}
      </ol>
    </section>
  );
}

// Tier 4: the committee decides, not this app. Offers the evidence pack.
export function CommitteePanel({ reviewId }: { reviewId: string }) {
  return (
    <Card as="section" className="p-5">
      <h2 id="committee" className="font-semibold">Sent to the review committee</h2>
      <p className="mt-2 text-sm text-muted">
        The final tier is 4, so this review is not decided in this app. The evidence pack holds what the committee needs: the
        tiers and who set the final tier, the rules that fired, every finding with its evidence quote and both models&apos; views,
        and the profile as submitted.
      </p>
      <a href={`/app/reviews/${reviewId}/evidence`} download className={cx(button.primary, "mt-4 w-full")}>
        Download evidence pack
      </a>
    </Card>
  );
}
