// The one check that decides who may decide a review, and what happens next.
// Every approval route calls checkDecision before writing anything. Plain
// logic with no database or network, so every rule is easy to test.
import type { ReviewStatus } from "./limits.ts";
import type { Tier } from "./rules.ts";
import type { Role, User } from "./users.ts";

export const OUTCOMES = ["approved", "approved_with_conditions", "rejected", "changes_requested"] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const STAGES = ["appsec", "model_risk"] as const;
export type Stage = (typeof STAGES)[number];

export const MAX_NOTE_LENGTH = 2000;

export type Resolution = { findingId: string; resolution: "accepted" | "dismissed"; reason?: string };

export type DecisionInput = {
  stage: Stage;
  outcome: Outcome;
  note: string;
  conditions?: string;
  resolutions: Resolution[];
};

export type ExistingDecision = { stage: Stage; decider_id: string; outcome: Outcome };

export type ReviewForDecision = {
  status: ReviewStatus;
  final_tier: Tier | null;
  submitter_id: string;
};

// Tier 1 and 2: one AppSec decision. Tier 3: AppSec, then Model Risk.
// Tier 4: no decision in this app; it goes to the review committee.
export function stagesForTier(tier: Tier): Stage[] {
  if (tier === 4) return [];
  return tier === 3 ? ["appsec", "model_risk"] : ["appsec"];
}

export const ROLE_FOR_STAGE: Record<Stage, Role> = {
  appsec: "appsec_reviewer",
  model_risk: "model_risk_reviewer",
};

export const STAGE_NAMES: Record<Stage, string> = { appsec: "AppSec", model_risk: "Model Risk" };
const WITH_ARTICLE: Record<Stage, string> = { appsec: "an AppSec", model_risk: "a Model Risk" };

export function waitingStage(status: ReviewStatus): Stage | null {
  if (status === "awaiting_appsec") return "appsec";
  if (status === "awaiting_model_risk") return "model_risk";
  return null;
}

const isApproval = (o: Outcome) => o === "approved" || o === "approved_with_conditions";

// The review's status once this decision is recorded.
export function nextStatus(tier: Tier, input: DecisionInput, earlier: ExistingDecision[]): ReviewStatus {
  if (input.outcome === "rejected") return "rejected";
  if (input.outcome === "changes_requested") return "changes_requested";
  const stages = stagesForTier(tier);
  const remaining = stages.slice(stages.indexOf(input.stage) + 1);
  if (remaining.length > 0) return "awaiting_model_risk";
  const anyConditions = [input.outcome, ...earlier.map((d) => d.outcome)].includes("approved_with_conditions");
  return anyConditions ? "approved_with_conditions" : "approved";
}

export type DecisionCheck =
  | { ok: true; nextStatus: ReviewStatus }
  | { ok: false; httpStatus: 400 | 401 | 403 | 409; reason: string };

const refuse = (httpStatus: 400 | 401 | 403 | 409, reason: string): DecisionCheck => ({ ok: false, httpStatus, reason });

export function checkDecision(args: {
  user: User | null;
  review: ReviewForDecision;
  decisions: ExistingDecision[];
  contestedIds: string[];
  input: DecisionInput;
}): DecisionCheck {
  const { user, review, decisions, contestedIds, input } = args;

  if (!user) return refuse(401, "Sign in required.");
  if (review.final_tier === 4 || review.status === "routed_to_committee") {
    return refuse(409, "Tier 4 reviews are decided by the review committee, not in this app.");
  }
  if (!STAGES.includes(input.stage)) return refuse(400, "Unknown decision stage.");
  if (!OUTCOMES.includes(input.outcome)) return refuse(400, "Unknown decision.");

  if (decisions.some((d) => d.stage === input.stage)) {
    return refuse(409, `The ${STAGE_NAMES[input.stage]} stage has already been decided.`);
  }
  const waiting = waitingStage(review.status);
  if (!waiting || review.final_tier === null) return refuse(409, "This review is not waiting for a decision.");
  if (input.stage !== waiting) {
    return refuse(409, `This review is waiting for ${WITH_ARTICLE[waiting]} decision.`);
  }
  if (!stagesForTier(review.final_tier).includes(input.stage)) {
    return refuse(409, `A tier ${review.final_tier} review has no ${STAGE_NAMES[input.stage]} stage.`);
  }

  if (user.role !== ROLE_FOR_STAGE[input.stage]) {
    return refuse(403, `Only ${WITH_ARTICLE[input.stage]} Reviewer can make this decision.`);
  }
  if (review.submitter_id === user.id) return refuse(403, "Nobody can decide their own submission.");
  if (input.stage === "model_risk" && decisions.some((d) => d.stage === "appsec" && d.decider_id === user.id)) {
    return refuse(403, "The Model Risk decision must be made by a different person from the AppSec decision.");
  }

  const note = input.note?.trim() ?? "";
  if (!note) return refuse(400, "A note is required for every decision.");
  if (note.length > MAX_NOTE_LENGTH) return refuse(400, `The note can be at most ${MAX_NOTE_LENGTH} characters.`);
  if (input.outcome === "approved_with_conditions" && !input.conditions?.trim()) {
    return refuse(400, "Approve with conditions needs the conditions written down.");
  }
  if ((input.conditions?.length ?? 0) > MAX_NOTE_LENGTH) {
    return refuse(400, `The conditions can be at most ${MAX_NOTE_LENGTH} characters.`);
  }

  const resolutions = input.resolutions ?? [];
  const ids = resolutions.map((r) => r.findingId);
  if (new Set(ids).size !== ids.length) return refuse(400, "A contested finding was resolved twice.");
  if (ids.some((id) => !contestedIds.includes(id))) return refuse(400, "A resolution names a finding that is not contested.");
  for (const r of resolutions) {
    if (r.resolution !== "accepted" && r.resolution !== "dismissed") return refuse(400, "Unknown resolution.");
    if (r.resolution === "dismissed" && !r.reason?.trim()) {
      return refuse(400, "Dismissing a contested finding needs a reason.");
    }
  }
  if (isApproval(input.outcome) && contestedIds.some((id) => !ids.includes(id))) {
    return refuse(400, "Every contested finding must be accepted or dismissed before approving.");
  }

  return { ok: true, nextStatus: nextStatus(review.final_tier, input, decisions) };
}

// Which stage, if any, this user may decide right now. Asks checkDecision
// itself with a complete answer, so the review page shows the decision panel
// to exactly the people the approval route will accept.
export function stageYouMayDecide(args: {
  user: User | null;
  review: ReviewForDecision;
  decisions: ExistingDecision[];
  contestedIds: string[];
}): Stage | null {
  const stage = waitingStage(args.review.status);
  if (!stage) return null;
  const check = checkDecision({
    ...args,
    input: {
      stage,
      outcome: "approved",
      note: "check",
      resolutions: args.contestedIds.map((findingId) => ({ findingId, resolution: "accepted" as const })),
    },
  });
  return check.ok ? stage : null;
}
