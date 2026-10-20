// The review result: what a finished review says about one agent profile.
// Plain-words explanation: docs/SCHEMA.md
import * as z from "zod";
import { ASI_IDS } from "./owasp";

export const SEVERITIES = ["low", "medium", "high", "critical"] as const;

export const RECOMMENDATIONS = [
  "approve",
  "approve_with_conditions",
  "reject",
  "escalate_to_committee",
] as const;

const text = (max: number) => z.string().trim().min(1).max(max);

export const findingSchema = z.strictObject({
  category: z.enum(ASI_IDS),
  severity: z.enum(SEVERITIES),
  // Must be copied word for word from the profile being reviewed.
  evidenceQuote: text(500),
  whyItMatters: text(1000),
  recommendedControl: text(1000),
});

export const ruleHitSchema = z.strictObject({
  ruleId: text(60),
  summary: text(300),
});

export const secondModelVerdictSchema = z.strictObject({
  verdict: z.enum(["agree", "partly_agree", "disagree"]),
  notes: text(2000),
  // Positions (starting at 0) of findings the second model disputes.
  disputedFindings: z.array(z.int().min(0)),
});

export const reviewResultSchema = z.strictObject({
  profileId: text(40),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  ruleHits: z.array(ruleHitSchema),
  findings: z.array(findingSchema),
  secondModelVerdict: secondModelVerdictSchema,
  recommendation: z.enum(RECOMMENDATIONS),
});

export type Finding = z.infer<typeof findingSchema>;
export type ReviewResult = z.infer<typeof reviewResultSchema>;
