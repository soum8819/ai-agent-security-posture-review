// The exact-match evidence check: does a quote really appear in the profile?
// Used by the reviewer and checker steps to drop invented evidence, and by
// the screens to tell verbatim profile excerpts apart from other text.
// Pure: no model, database or network.
import type { AgentProfile } from "./profile-schema.ts";
import { profileText } from "./review-prompt.ts";

const MIN_QUOTE_LENGTH = 4;

// Lower case, straight quotes, single spaces and no spaces around JSON
// symbols, so layout or quote style alone never decides whether a quote is real.
// The words themselves must still match exactly.
function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .replace(/\s*([[\]{}:,])\s*/g, "$1")
    .trim();
}

// Remove one pair of quote marks wrapped around the whole quote.
function unwrap(quote: string) {
  const q = quote.trim();
  const m = q.match(/^(["'“‘])([\s\S]*)(["'”’])$/);
  return m ? m[2] : q;
}

function stringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringValues);
  if (value && typeof value === "object") return Object.values(value).flatMap(stringValues);
  return [];
}

// True if the quote appears in the profile, either in the JSON text the model
// was shown or inside one of the profile's text values.
export function quoteIsInProfile(quote: string, profile: AgentProfile) {
  const q = normalize(unwrap(quote));
  if (q.length < MIN_QUOTE_LENGTH) return false;
  const sources = [profileText(profile), ...stringValues(profile)].map(normalize);
  return sources.some((s) => s.includes(q));
}


// A fragment inside model-written text that looks like a profile field, such
// as "memory": "session" or ["chat"].
const FRAGMENT = /"[A-Za-z_][A-Za-z0-9_.]*"\s*:\s*(?:"[^"]*"|\[[^\]]*\]|\{[^}]*\}|true|false|null|-?\d+(?:\.\d+)?)|\[\s*"[^\]]*\]/g;

// Splits model-written text into plain parts and verbatim profile excerpts.
// A fragment counts as an excerpt only if the same exact-match check used for
// evidence confirms it is in the profile; anything else stays plain text.
export function profileExcerpts(text: string, profile: AgentProfile): { text: string; excerpt: boolean }[] {
  const parts: { text: string; excerpt: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(FRAGMENT)) {
    const i = m.index ?? 0;
    if (!quoteIsInProfile(m[0], profile)) continue;
    if (i > last) parts.push({ text: text.slice(last, i), excerpt: false });
    parts.push({ text: m[0], excerpt: true });
    last = i + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), excerpt: false });
  return parts;
}
