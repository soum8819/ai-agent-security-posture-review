// Model-written text a person reads must say something: a reviewer summary of
// "x" was accepted in the eval-v2 Claude run. The form sent to the model
// (lib/review-schema.ts) is unchanged, so no prompt changes; this stricter
// check runs on the answer and fails it the way a schema failure does, with
// NoObjectGeneratedError: the workflow step retries once, then the review is
// marked failed. Text is never filled in or rewritten.
import { NoObjectGeneratedError } from "ai";
import * as z from "zod";

// Counted after trimming spaces. The shortest real value in 205 saved runs
// (eval/runs, checked 2026-11-15) was 63 characters, a recommended control;
// 20, about four words, rejects placeholders such as "x", "N/A" or "TBD" with
// a wide margin. Quotes are exempt: they are copied word for word from the
// profile, a real one can be 10 characters ("move_money"), and the evidence
// check already tests them.
export const MIN_MODEL_TEXT_LENGTH = 20;

const prose = z.string().trim().min(MIN_MODEL_TEXT_LENGTH);
const findingText = z.object({ whyItMatters: prose, recommendedControl: prose });

export const reviewerTextSchema = z.object({
  summary: prose,
  findings: z.array(findingText),
});

export const checkerTextSchema = z.object({
  summary: prose,
  verdicts: z.array(z.object({ reason: prose })),
  missedFindings: z.array(findingText),
});

type ModelCall = Pick<
  ConstructorParameters<typeof NoObjectGeneratedError>[0],
  "text" | "response" | "usage" | "finishReason"
>;

// Throws if any checked field is too short, naming every such field.
export function requireModelText(schema: z.ZodType, output: unknown, who: string, call: ModelCall) {
  const parsed = schema.safeParse(output);
  if (parsed.success) return;
  const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
  throw new NoObjectGeneratedError({
    message: `No object generated: the ${who} model's text is under ${MIN_MODEL_TEXT_LENGTH} characters in ${fields}.`,
    cause: parsed.error,
    text: call.text,
    response: call.response,
    usage: call.usage,
    finishReason: call.finishReason,
  });
}
