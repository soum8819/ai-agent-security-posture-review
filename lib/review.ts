// One full review: the reviewer model, then the checker model, then contested
// marking and the final tier. Server-side only.
import { analyzeProfile, applyFloor, type AnalysisResult } from "./analyze.ts";
import { crosscheckReview, markContested, type CrosscheckResult } from "./crosscheck.ts";
import type { AgentProfile } from "./profile-schema.ts";
import { finalTier } from "./rules.ts";

// Joins a reviewer result and a checker result into one saved review.
// The final tier is computed here and saved in `tiers`.
export function combineReview(first: AnalysisResult, check: CrosscheckResult) {
  const { checked, unknownVerdicts } = markContested(first.findings, check.verdicts);
  const tiers = {
    rule: first.ruleTier.tier,
    reviewer: first.proposedTier,
    checker: check.proposedTier,
  };
  const { final, setBy } = finalTier(tiers);
  const contested = checked.filter((f) => f.contested).map((f) => f.id);
  return {
    profileId: first.profileId,
    tiers: { ...tiers, final, setBy, ruleReasons: first.ruleTier.reasons },
    contested,
    findings: checked,
    missedFindings: applyFloor(check.missedFindings, first.ruleHits),
    ruleHits: first.ruleHits,
    manipulationAttempt: first.manipulationAttempt,
    reviewerSummary: first.summary,
    checkerSummary: check.summary,
    droppedFindings: first.droppedFindings,
    droppedMissedFindings: check.droppedMissedFindings,
    unknownVerdicts,
    reviewer: {
      model: first.settings.model,
      promptVersion: first.promptVersion,
      settings: first.settings,
      usage: first.usage,
      latencyMs: first.durationMs,
      generationId: first.generationId,
      costUsd: null as number | null,
    },
    checker: {
      model: check.settings.model,
      promptVersion: check.promptVersion,
      settings: check.settings,
      usage: check.usage,
      latencyMs: check.durationMs,
      generationId: check.generationId,
      costUsd: null as number | null,
    },
    rawReviewerOutput: first.rawModelOutput,
    rawCheckerOutput: check.rawModelOutput,
  };
}

export type ReviewRecord = ReturnType<typeof combineReview>;

export async function reviewProfile(profile: AgentProfile): Promise<ReviewRecord> {
  const first = await analyzeProfile(profile);
  const check = await crosscheckReview(profile, first.findings);
  return combineReview(first, check);
}
