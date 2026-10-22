// The answer key for one evaluation profile (eval/labels/*.json).
// Plain-words explanation: docs/SCHEMA.md and eval/labels/README.md
import * as z from "zod";
import { ASI_IDS } from "./owasp";

const tier = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

export const expectedFindingSchema = z.strictObject({
  category: z.enum(ASI_IDS),
  reason: z.string().trim().min(1),
});

export const labelSchema = z
  .strictObject({
    profileId: z.string().regex(/^profile-\d{2}$/),
    expectedTier: tier,
    acceptableTiers: z.array(tier).min(1).optional(),
    expectedCriticalFindings: z.array(expectedFindingSchema),
    notes: z.string().trim().min(1).optional(),
    heldOut: z.boolean(),
  })
  .refine((l) => !l.acceptableTiers || l.acceptableTiers.includes(l.expectedTier), {
    message: "acceptableTiers must include expectedTier",
    path: ["acceptableTiers"],
  })
  .refine((l) => !l.acceptableTiers || new Set(l.acceptableTiers).size === l.acceptableTiers.length, {
    message: "acceptableTiers must not repeat a tier",
    path: ["acceptableTiers"],
  });

export type Label = z.infer<typeof labelSchema>;

// Rules for the whole answer key, not just one file.
export const HELD_OUT_COUNT = 4;
