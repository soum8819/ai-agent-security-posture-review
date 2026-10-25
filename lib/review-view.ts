// Turns stored review data into plain words for the review screens. No
// database or network here, so every rule is easy to test.
import { VALUE_LABELS } from "./labels.ts";
import type { ReviewStatus } from "./limits.ts";
import { ASI_CATEGORIES } from "./owasp.ts";
import type { AgentProfile } from "./profile-schema.ts";
import type { Severity, TierSource } from "./rules.ts";
import { findUser } from "./users.ts";

export const STATUS_TEXT: Record<ReviewStatus, string> = {
  queued: "Queued",
  reviewing: "Reviewing: the rules and two models are working",
  awaiting_appsec: "Waiting for an AppSec decision",
  awaiting_model_risk: "Waiting for a Model Risk decision",
  approved: "Approved",
  approved_with_conditions: "Approved with conditions",
  rejected: "Rejected",
  changes_requested: "Changes requested",
  routed_to_committee: "Sent to the review committee (Tier 4 is never approved in this app)",
  failed: "Failed",
};

export const SETUP_CHECK_SUBMITTER = "setup-check";
export const SETUP_CHECK_LABEL = "setup check, not a real submission";

export function shortId(id: string) {
  return id.slice(0, 8);
}

export function submitterName(submitterId: string) {
  if (submitterId === SETUP_CHECK_SUBMITTER) return "Setup check";
  return findUser(submitterId)?.name ?? submitterId;
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso)) + " UTC";
}

const PROVIDERS: Record<string, string> = { openai: "OpenAI", google: "Google", anthropic: "Anthropic" };

// "openai/gpt-5-mini" becomes { provider: "OpenAI", model: "gpt-5-mini" }.
export function modelLabel(id: string) {
  const [prefix, ...rest] = id.split("/");
  return { provider: PROVIDERS[prefix] ?? prefix, model: rest.join("/") || id };
}

const SOURCE_NAMES: Record<TierSource, string> = {
  rule: "the rules",
  reviewer: "the reviewer model",
  checker: "the checker model",
};

// One plain sentence saying which of the three tiers set the final tier.
export function tierSentence(final: number, setBy: TierSource[]) {
  if (setBy.length === 3) return `All three agree on tier ${final}, so the final tier is ${final}.`;
  const who = setBy.map((s) => SOURCE_NAMES[s]);
  const named = who.length === 2 ? `${who[0]} and ${who[1]}` : who[0];
  return `The final tier is ${final}, set by ${named}. The highest of the three tiers always wins, so a model can raise the tier but never lower it.`;
}

// What each rule requires, in plain words.
export const RULE_REQUIREMENTS: Record<string, string> = {
  R1: "An agent that can move money or change customer records must have a person confirm its actions.",
  R2: "An agent that can run code must run it in a sandbox. The profile has no sandbox field, so any run-code tool fires this rule.",
  R3: "An agent that reads untrusted input must not also be able to write or run code.",
  R4: "An agent must use its own scoped credentials, not a shared token.",
  R5: "An agent with persistent memory must not be fed untrusted input.",
  R6: "An agent described as read-only must not list a tool that can change things.",
  R7: "An agent that reads customer financial data must have its actions logged.",
  R8: "An agent must have a named owner and a kill switch.",
};

const FIELD_LABELS: Record<string, string> = {
  "tools.permissions": "Tools and permissions",
  humanConfirmsActions: "A person confirms its actions",
  untrustedInputs: "Untrusted inputs it reads",
  credentials: "Credentials",
  memory: "Memory",
  description: "Description",
  dataReads: "Data it reads",
  "logging.enabled": "Its actions are logged",
  "killSwitch.available": "It has a kill switch",
  owner: "Owner",
};

const label = (v: string) => VALUE_LABELS[v] ?? v;
const yesNo = (b: boolean) => (b ? "Yes" : "No");
const list = (vs: readonly string[]) => (vs.length ? vs.map(label).join(", ") : "None");

function fieldValue(profile: AgentProfile, field: string): string[] {
  switch (field) {
    case "tools.permissions":
      return profile.tools.length
        ? profile.tools.map((t) => `${t.name}: ${list(t.permissions)}`)
        : ["No tools"];
    case "humanConfirmsActions":
      return [yesNo(profile.humanConfirmsActions)];
    case "untrustedInputs":
      return [list(profile.untrustedInputs)];
    case "credentials":
      return [label(profile.credentials)];
    case "memory":
      return [label(profile.memory)];
    case "description":
      return [profile.description];
    case "dataReads":
      return [list(profile.dataReads)];
    case "logging.enabled":
      return [yesNo(profile.logging.enabled)];
    case "killSwitch.available":
      return [yesNo(profile.killSwitch.available)];
    case "owner":
      return [profile.owner];
    default:
      return [];
  }
}

// The profile fields that made a rule fire, with their values in plain words.
export function triggeringFields(profile: AgentProfile, fieldSpec: string) {
  return fieldSpec
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean)
    .map((field) => ({ field, label: FIELD_LABELS[field] ?? field, values: fieldValue(profile, field) }));
}

export function asiName(id: string) {
  return ASI_CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

export const SEVERITY_WORDS: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

// Badge colours as fixed hex values, so their contrast can be checked by a
// test. Each badge also shows the word, so colour is never the only signal.
export const SEVERITY_COLOURS: Record<Severity, { background: string; text: string }> = {
  critical: { background: "#991b1b", text: "#ffffff" },
  high: { background: "#9a3412", text: "#ffffff" },
  medium: { background: "#fde68a", text: "#451a03" },
  low: { background: "#e4e4e7", text: "#18181b" },
};

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// WCAG contrast ratio between two colours (1 to 21).
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export const OUTCOME_TEXT: Record<string, string> = {
  approved: "Approved",
  approved_with_conditions: "Approved with conditions",
  rejected: "Rejected",
  changes_requested: "Changes requested",
};

// What happened to the paused workflow run after a decision. The decision
// stands in every case. "no_paused_run" is the wording used before the real
// causes were recorded; two early decisions keep it.
export const RESUME_TEXT: Record<string, string> = {
  resumed: "The paused review workflow was resumed.",
  other_environment: "Not resumed: this review was created on another copy of the app, where its workflow run lives. The decision still stands.",
  run_finished: "Not resumed: the workflow run had already finished. The decision still stands.",
  run_not_found: "Not resumed: the workflow run was not found here. The decision still stands.",
  hook_not_found: "Not resumed: the workflow run is still active but was not waiting for this decision. The decision still stands.",
  resume_error: "Not resumed: resuming the workflow run failed. The decision still stands.",
  no_paused_run: "No paused workflow was waiting, so none was resumed. The decision still stands.",
};

const CREATED_ON: Record<string, string> = {
  local: "a developer's computer (test)",
  preview: "a Vercel preview",
  production: "the live site",
};

export function createdOn(environment: string) {
  return CREATED_ON[environment] ?? environment;
}

export const VERDICT_TEXT: Record<string, string> = {
  agree: "Agrees",
  disagree: "Disagrees",
  needs_more_information: "Needs more information",
  no_verdict: "Gave no verdict",
};

const rank = (s: Severity) => SEVERITY_ORDER.indexOf(s);

// Contested findings first, in their own group; each group most severe first.
export function splitFindings<T extends { contested: boolean; severity: Severity }>(findings: T[]) {
  const bySeverity = (a: T, b: T) => rank(a.severity) - rank(b.severity);
  return {
    contested: findings.filter((f) => f.contested).sort(bySeverity),
    others: findings.filter((f) => !f.contested).sort(bySeverity),
  };
}

// The cost of a review, only when both model costs are stored.
export function reviewCost(reviewer: { costUsd: number | null }, checker: { costUsd: number | null }) {
  if (typeof reviewer.costUsd !== "number" || typeof checker.costUsd !== "number") return null;
  return { total: reviewer.costUsd + checker.costUsd, reviewer: reviewer.costUsd, checker: checker.costUsd };
}

// Text that looks like JSON: a quoted key followed by a colon, or an opening
// brace or bracket next to a quote.
const JSON_LIKE = /"[A-Za-z_][A-Za-z0-9_.]*"\s*:|[{[]\s*"/;

export function looksLikeJson(text: string) {
  return JSON_LIKE.test(text);
}

const QUOTE_FIELD_NAMES: Record<string, string> = {
  id: "Profile id",
  name: "Name",
  owner: "Owner",
  businessPurpose: "Business purpose",
  dataReads: "Data it reads",
  tools: "Tools and permissions",
  permissions: "Tools and permissions",
  humanConfirmsActions: "A person confirms its actions",
  untrustedInputs: "Untrusted inputs it reads",
  credentials: "Credentials",
  model: "Model and provider",
  provider: "Model and provider",
  memory: "Memory",
  logging: "Logging",
  enabled: "Logging",
  destination: "Logging",
  killSwitch: "Kill switch",
  available: "Kill switch",
  description: "Description",
};

// Evidence quotes are verbatim from the profile and are never rewritten (the
// evidence check depends on exact matches). Many are field excerpts in the
// profile's JSON form; for those, say which field they come from.
export function quoteSource(quote: string): { jsonLike: boolean; field: string | null } {
  if (!looksLikeJson(quote)) return { jsonLike: false, field: null };
  const key = quote.match(/"([A-Za-z_][A-Za-z0-9_.]*)"\s*:/)?.[1];
  return { jsonLike: true, field: key ? (QUOTE_FIELD_NAMES[key] ?? key) : null };
}
