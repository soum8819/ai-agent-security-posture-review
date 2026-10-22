// Sends the profile and the first model's findings to the checker model
// through AI Gateway, checks the evidence of any missed findings, and marks
// contested findings. Server-side only: it uses the AI Gateway key.
import { generateText, Output } from "ai";
import { checkEvidence, type KeptFinding } from "./analyze.ts";
import { CHECK_PROMPT_VERSION, CHECK_SYSTEM_PROMPT, checkUserPrompt } from "./crosscheck-prompt.ts";
import { CHECKER_MODEL } from "./models.ts";
import type { AgentProfile } from "./profile-schema.ts";
import { crosscheckSchema, type Crosscheck, type ModelReview } from "./review-schema.ts";

export const CHECK_SETTINGS = {
  model: CHECKER_MODEL,
  // google/gemini-2.5-flash accepts temperature (AI Gateway model listing, step 9).
  temperature: 0.2,
  reasoning: "low",
  maxOutputTokens: 6000,
} as const;

type ModelFinding = ModelReview["findings"][number];
type Verdict = Crosscheck["verdicts"][number]["verdict"] | "no_verdict";

export type CheckedFinding = KeptFinding & {
  id: string;
  secondModelVerdict: Verdict;
  secondModelReason: string;
  contested: boolean;
  floorKept?: string;
};

// What the checker sees of a first-model finding: its own severity, never the
// floored one, so no rule result reaches the checker.
export function asFirstModelFinding(f: KeptFinding): ModelFinding {
  return {
    category: f.category,
    severity: f.modelSeverity,
    evidenceQuote: f.evidenceQuote,
    whyItMatters: f.whyItMatters,
    recommendedControl: f.recommendedControl,
  };
}

// Contested: the checker disagrees and the finding is high or critical after
// the rule floor. A rule floor stays even when contested; floorKept records it.
export function markContested(findings: KeptFinding[], verdicts: Crosscheck["verdicts"]) {
  const ids = findings.map((_, i) => `F${i + 1}`);
  const checked: CheckedFinding[] = findings.map((f, i) => {
    const v = verdicts.find((x) => x.findingId.trim().toUpperCase() === ids[i]);
    const verdict: Verdict = v?.verdict ?? "no_verdict";
    const contested = verdict === "disagree" && (f.severity === "high" || f.severity === "critical");
    return {
      ...f,
      id: ids[i],
      secondModelVerdict: verdict,
      secondModelReason: v?.reason ?? "The checker gave no verdict for this finding.",
      contested,
      ...(contested && f.raisedByRule ? { floorKept: f.raisedByRule } : {}),
    };
  });
  const unknownVerdicts = verdicts.filter((v) => !ids.includes(v.findingId.trim().toUpperCase()));
  return { checked, unknownVerdicts };
}

export async function crosscheckReview(profile: AgentProfile, firstFindings: KeptFinding[]) {
  const started = Date.now();
  const result = await generateText({
    model: CHECK_SETTINGS.model,
    temperature: CHECK_SETTINGS.temperature,
    reasoning: CHECK_SETTINGS.reasoning,
    maxOutputTokens: CHECK_SETTINGS.maxOutputTokens,
    system: CHECK_SYSTEM_PROMPT,
    prompt: checkUserPrompt(profile, firstFindings.map(asFirstModelFinding)),
    output: Output.object({ name: "crosscheck", schema: crosscheckSchema }),
  });
  const check = result.output;
  const { kept, dropped } = checkEvidence(check.missedFindings, profile);
  const gateway = result.providerMetadata?.gateway as Record<string, unknown> | undefined;
  return {
    promptVersion: CHECK_PROMPT_VERSION,
    settings: CHECK_SETTINGS,
    verdicts: check.verdicts,
    missedFindings: kept,
    droppedMissedFindings: dropped,
    proposedTier: check.proposedTier,
    summary: check.summary,
    rawModelOutput: check,
    usage: result.usage,
    generationId: typeof gateway?.generationId === "string" ? gateway.generationId : null,
    durationMs: Date.now() - started,
  };
}

export type CrosscheckResult = Awaited<ReturnType<typeof crosscheckReview>>;
