// Reviews one agent profile with the reviewer model through AI Gateway, then
// drops findings whose evidence is not in the profile and applies the rule floor.
// Server-side only: it uses the AI Gateway key.
import { generateText, Output } from "ai";
import { REVIEWER_MODEL } from "./models.ts";
import type { AgentProfile } from "./profile-schema.ts";
import { modelReviewSchema, type ModelReview } from "./review-schema.ts";
import { PROMPT_VERSION, SYSTEM_PROMPT, profileText, userPrompt } from "./review-prompt.ts";
import { assignTier, enforceFloor, runRules, type RuleHit, type Severity } from "./rules.ts";

export const REVIEW_SETTINGS = {
  model: REVIEWER_MODEL,
  reasoning: "low",
  maxOutputTokens: 6000,
  // No temperature: openai/gpt-5-mini does not accept one (checked on the
  // AI Gateway model listing, step 8). Reasoning effort is fixed instead.
} as const;

type ModelFinding = ModelReview["findings"][number];

export type KeptFinding = ModelFinding & {
  modelSeverity: Severity;
  raisedByRule?: string;
};

export type DroppedFinding = { finding: ModelFinding; reason: string };

const MIN_QUOTE_LENGTH = 4;

// Lower case, straight quotes, single spaces and no spaces around JSON
// symbols, so layout or quote style alone never decides whether a quote is real.
// The words themselves must still match exactly.
function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .replace(/\s*([[\]{}:,])\s*/g, "$1")
    .trim();
}

// Remove one pair of quote marks wrapped around the whole quote.
function unwrap(quote: string) {
  const q = quote.trim();
  const m = q.match(/^(["'“‘])([\s\S]*)(["'”’])$/);
  return m ? m[2] : q;
}

function stringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringValues);
  if (value && typeof value === "object") return Object.values(value).flatMap(stringValues);
  return [];
}

// True if the quote appears in the profile, either in the JSON text the model
// was shown or inside one of the profile's text values.
export function quoteIsInProfile(quote: string, profile: AgentProfile) {
  const q = normalize(unwrap(quote));
  if (q.length < MIN_QUOTE_LENGTH) return false;
  const sources = [profileText(profile), ...stringValues(profile)].map(normalize);
  return sources.some((s) => s.includes(q));
}

export function checkEvidence(findings: ModelFinding[], profile: AgentProfile) {
  const kept: ModelFinding[] = [];
  const dropped: DroppedFinding[] = [];
  for (const f of findings) {
    if (quoteIsInProfile(f.evidenceQuote, profile)) kept.push(f);
    else dropped.push({ finding: f, reason: "evidence quote not found in the profile" });
  }
  return { kept, dropped };
}

// A finding's severity is never below a rule hit in the same OWASP category.
export function applyFloor(findings: ModelFinding[], hits: RuleHit[]): KeptFinding[] {
  return findings.map((f) => {
    const same = hits.filter((h) => h.category === f.category);
    let severity: Severity = f.severity;
    let raisedByRule: string | undefined;
    for (const h of same) {
      const next = enforceFloor(h.severity, severity);
      if (next !== severity) raisedByRule = h.ruleId;
      severity = next;
    }
    return { ...f, severity, modelSeverity: f.severity, ...(raisedByRule ? { raisedByRule } : {}) };
  });
}

export async function analyzeProfile(profile: AgentProfile) {
  const started = Date.now();
  const result = await generateText({
    model: REVIEW_SETTINGS.model,
    reasoning: REVIEW_SETTINGS.reasoning,
    maxOutputTokens: REVIEW_SETTINGS.maxOutputTokens,
    system: SYSTEM_PROMPT,
    prompt: userPrompt(profile),
    output: Output.object({ name: "agent_review", schema: modelReviewSchema }),
  });
  const review = result.output;

  const ruleHits = runRules(profile);
  const { kept, dropped } = checkEvidence(review.findings, profile);
  const manipulationQuoteFound =
    !review.manipulationAttempt.detected ||
    quoteIsInProfile(review.manipulationAttempt.quote, profile);

  const gateway = result.providerMetadata?.gateway as Record<string, unknown> | undefined;

  return {
    profileId: profile.id,
    promptVersion: PROMPT_VERSION,
    settings: REVIEW_SETTINGS,
    ruleTier: assignTier(profile),
    proposedTier: review.proposedTier,
    summary: review.summary,
    manipulationAttempt: { ...review.manipulationAttempt, quoteFound: manipulationQuoteFound },
    findings: applyFloor(kept, ruleHits),
    droppedFindings: dropped,
    ruleHits,
    rawModelOutput: review,
    usage: result.usage,
    generationId: typeof gateway?.generationId === "string" ? gateway.generationId : null,
    durationMs: Date.now() - started,
  };
}

export type AnalysisResult = Awaited<ReturnType<typeof analyzeProfile>>;
