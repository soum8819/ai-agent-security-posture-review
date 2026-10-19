// The single place model names live. Change a model here, not in the routes.
export const REVIEWER_MODEL = "openai/gpt-5-mini";
export const CHECKER_MODEL = "google/gemini-2.5-flash";

export const ALLOWED_MODELS = [REVIEWER_MODEL, CHECKER_MODEL] as const;
export type AllowedModel = (typeof ALLOWED_MODELS)[number];

export function isAllowedModel(name: string | null): name is AllowedModel {
  return ALLOWED_MODELS.includes(name as AllowedModel);
}
