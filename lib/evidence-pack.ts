// The evidence pack for a Tier 4 review: a readable text file for the review
// committee, since Tier 4 is never approved in this app. Plain function with
// no database or network, so its contents are easy to test.
import type { AgentProfile } from "./profile-schema.ts";
import type { ReviewRecord } from "./review.ts";
import {
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
} from "./review-view.ts";

// Evidence quotes stay exactly as stored; field excerpts say their field.
export const EVIDENCE_PREFIX = "  Evidence from the profile";
const evidence = (quote: string) => {
  const s = quoteSource(quote);
  return s.jsonLike ? `${EVIDENCE_PREFIX} (quoted from the field: ${s.field ?? "profile data"}): ${quote}` : `${EVIDENCE_PREFIX}: "${quote}"`;
};

const model = (id: string) => {
  const m = modelLabel(id);
  return `${m.model} (${m.provider})`;
};

export function evidencePackText(args: {
  reviewId: string;
  submitterId: string;
  createdAt: string;
  profile: AgentProfile;
  result: ReviewRecord;
  generatedAt: string;
}) {
  const { reviewId, submitterId, createdAt, profile, result, generatedAt } = args;
  const t = result.tiers;
  const { contested, others } = splitFindings(result.findings);
  const lines: string[] = [];
  const add = (...l: string[]) => lines.push(...l);

  add(
    "EVIDENCE PACK FOR THE REVIEW COMMITTEE",
    "Harborline Financial Group, AI agent security review (fictional, synthetic data)",
    "",
    `Agent: ${profile.name}`,
    `Owner: ${profile.owner}`,
    `Business purpose: ${profile.businessPurpose}`,
    `Review: ${reviewId}`,
    `Submitted by ${submitterName(submitterId)}, ${formatTime(createdAt)}`,
    `Pack generated: ${formatTime(generatedAt)}`,
    "",
    "Why this goes to the committee: the final tier is 4. Tier 4 agents move money or act on their own at scale, and they are never approved in this app.",
    "",
    "TIERS",
    `Rule tier: ${t.rule}`,
    `Reviewer model tier: ${t.reviewer} (${model(result.reviewer.model)})`,
    `Checker model tier: ${t.checker} (${model(result.checker.model)})`,
    `Final tier: ${t.final}`,
    tierSentence(t.final, t.setBy),
    "",
    "RULES THAT FIRED",
  );
  if (result.ruleHits.length === 0) add("No rule fired.");
  for (const h of result.ruleHits) {
    add(`${h.ruleId}, ${SEVERITY_WORDS[h.severity]}, ${h.category} ${asiName(h.category)}`);
    add(`  The rule: ${RULE_REQUIREMENTS[h.ruleId] ?? ""}`);
    add(`  What it found: ${h.reason}`);
    for (const f of triggeringFields(profile, h.field)) add(`  Profile field, ${f.label}: ${f.values.join("; ")}`);
  }

  const finding = (f: (typeof result.findings)[number]) => {
    add(`${f.id}, ${SEVERITY_WORDS[f.severity]}, ${f.category} ${asiName(f.category)}`);
    if (f.raisedByRule) add(`  Raised to ${SEVERITY_WORDS[f.severity]} by rule ${f.raisedByRule}; the reviewer model said ${SEVERITY_WORDS[f.modelSeverity]}.`);
    add(evidence(f.evidenceQuote));
    add(`  Reviewer model: ${f.whyItMatters}`);
    add(`  Checker model: ${VERDICT_TEXT[f.secondModelVerdict] ?? f.secondModelVerdict}. ${f.secondModelReason}`);
    add(`  Suggested fix: ${f.recommendedControl}`);
  };
  add("", "FINDINGS THE TWO MODELS DISAGREE ON");
  if (contested.length === 0) add("None.");
  contested.forEach(finding);
  add("", "OTHER FINDINGS");
  if (others.length === 0) add("None.");
  others.forEach(finding);

  add("", "FOUND ONLY BY THE CHECKER MODEL");
  if (result.missedFindings.length === 0) add("None.");
  for (const f of result.missedFindings) {
    add(`${SEVERITY_WORDS[f.severity]}, ${f.category} ${asiName(f.category)}`);
    add(evidence(f.evidenceQuote));
    add(`  Checker model: ${f.whyItMatters}`);
    add(`  Suggested fix: ${f.recommendedControl}`);
  }

  const dropped = result.droppedFindings.length + result.droppedMissedFindings.length;
  add(
    "",
    "EVIDENCE CHECK",
    `${dropped} finding${dropped === 1 ? " was" : "s were"} dropped because the quoted text is not in the profile.`,
    "",
    "PROFILE AS SUBMITTED",
    `Description: ${profile.description}`,
  );
  return lines.join("\n") + "\n";
}
