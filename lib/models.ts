// The single place model names live. Change a model here, not in the routes.
export const REVIEWER_MODEL = "openai/gpt-5-mini";
export const CHECKER_MODEL = "google/gemini-2.5-flash";

// Step 11d, data handling. Each model may only be served by these AI Gateway
// providers (providerOptions.gateway.only). Rule: allow only providers the
// AI Gateway listing marks as both "no training" and "zero data retention
// capable", so turning on zero data retention later (it needs a Pro or
// Enterprise plan) needs no provider change. Checked 2026-10-25:
//   gpt-5-mini: azure and openai are both, so both are allowed.
//   gemini-2.5-flash: vertex is both; google's zero data retention status is
//   unknown, so it is left out. Cost: no fallback provider for the checker.
// Zero data retention itself is not set: it is not available on this plan.
export const REVIEWER_PROVIDERS = ["azure", "openai"];
export const CHECKER_PROVIDERS = ["vertex"];

// Sent with every model call. disallowPromptTraining is free on every plan
// and makes AI Gateway refuse any provider that may train on the prompt.
export function gatewayOptions(only: string[]) {
  return { gateway: { only, disallowPromptTraining: true } };
}

// The provider that actually served a call, as AI Gateway reports it.
export function resolvedProvider(providerMetadata: unknown): string | null {
  const gateway = (providerMetadata as { gateway?: { routing?: { resolvedProvider?: unknown } } } | undefined)?.gateway;
  const p = gateway?.routing?.resolvedProvider;
  return typeof p === "string" ? p : null;
}

export const ALLOWED_MODELS = [REVIEWER_MODEL, CHECKER_MODEL] as const;
export type AllowedModel = (typeof ALLOWED_MODELS)[number];

export function isAllowedModel(name: string | null): name is AllowedModel {
  return ALLOWED_MODELS.includes(name as AllowedModel);
}
