// Puts audit events into plain words for the Auditor's screen. The JSON
// export keeps the stored form; the screen never shows raw JSON.
// Pure: no database or network.
import { VALUE_LABELS } from "./labels.ts";

export const AUDIT_PAGE_LIMIT = 200;
export const AUDIT_EXPORT_LIMIT = 10000;

// A full review id or its first characters: only hex digits and dashes.
export function parseReviewFilter(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return /^[0-9a-f-]{4,36}$/.test(v) ? v : null;
}

export const EVENT_NAMES: Record<string, string> = {
  setup_check: "Setup check",
  review_submitted: "Review submitted",
  review_started: "Review started",
  review_completed: "Review completed",
  review_failed: "Review failed",
  decision_recorded: "Decision recorded",
  workflow_resumed: "Workflow resumed",
  workflow_not_resumed: "Workflow not resumed",
  sign_in_failed: "Sign-in failed",
  sign_in_blocked: "Sign-in blocked by the attempt limit",
};

const words = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());

function plain(value: unknown): string {
  if (value === null || value === undefined || value === "") return "none";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return VALUE_LABELS[value] ?? value;
  return String(value);
}

// Flattens event details into "label: value" lines, so nothing on screen is
// raw JSON. Nested parts get their path in the label, for example
// "Tiers, final: 3" or "Resolutions 1, finding id: F2".
export function detailLines(details: unknown, prefix = ""): { label: string; value: string }[] {
  if (details === null || typeof details !== "object") {
    return prefix ? [{ label: prefix, value: plain(details) }] : [];
  }
  if (Array.isArray(details)) {
    if (details.length === 0) return [{ label: prefix || "List", value: "none" }];
    if (details.every((d) => d === null || typeof d !== "object")) {
      return [{ label: prefix || "List", value: details.map(plain).join(", ") }];
    }
    return details.flatMap((d, i) => detailLines(d, `${prefix || "Item"} ${i + 1}`));
  }
  return Object.entries(details as Record<string, unknown>).flatMap(([k, v]) =>
    detailLines(v, prefix ? `${prefix}, ${words(k).toLowerCase()}` : words(k)),
  );
}
