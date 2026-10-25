// Slice D: the Tier 4 evidence pack holds what the committee needs, in plain
// words. Uses a saved step 9 result, never a model. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EVIDENCE_PREFIX, evidencePackText } from "../lib/evidence-pack.ts";
import { profileExcerpts } from "../lib/evidence.ts";
import { looksLikeJson } from "../lib/review-view.ts";

const record = JSON.parse(readFileSync("eval/runs/2026-10-22T04-59-52-013Z/profile-08.json", "utf8"));
const profile = JSON.parse(readFileSync("eval/profiles/profile-08.json", "utf8"));
const pack = evidencePackText({
  reviewId: "00000000-0000-4000-8000-000000000000",
  submitterId: "setup-check",
  createdAt: "2026-10-25T10:00:00.000Z",
  profile,
  result: record,
  generatedAt: "2026-10-25T11:00:00.000Z",
});

test("the pack has the tiers, who set the final tier, rule hits and findings", () => {
  assert.match(pack, /Final tier: 4/);
  assert.match(pack, /All three agree on tier 4|set by/);
  for (const r of record.ruleHits) assert.ok(pack.includes(`${r.ruleId}, `), r.ruleId);
  for (const f of record.findings) assert.ok(pack.includes(f.evidenceQuote), f.id);
  assert.match(pack, /never approved in this app/);
  assert.match(pack, /1 finding was dropped/);
});

test("the pack is plain words: no em dashes, no generation ids, no JSON outside evidence quotes", () => {
  assert.equal(pack.includes("\u2014"), false);
  assert.equal(/gen_[0-9A-Z]{10}/.test(pack), false);
  // Outside evidence lines, only fragments confirmed verbatim from the profile
  // (the same exact-match check as evidence) may look like JSON.
  const outsideQuotes = pack.split("\n").filter((line) => !line.startsWith(EVIDENCE_PREFIX));
  for (const line of outsideQuotes) {
    const rest = profileExcerpts(line, profile).filter((p) => !p.excerpt).map((p) => p.text).join(" ");
    assert.equal(looksLikeJson(rest), false, line);
  }
});

test("evidence quotes stay exactly as stored, and field excerpts say their field", () => {
  for (const f of [...record.findings, ...record.missedFindings]) assert.ok(pack.includes(f.evidenceQuote), f.evidenceQuote);
  // The stored quote, exactly as the model copied it from the profile, after its field caption.
  const loggingQuote = [...record.findings, ...record.missedFindings].map((f) => f.evidenceQuote).find((q) => q.includes('"enabled": true'));
  assert.ok(loggingQuote, "fixture has a logging field excerpt");
  assert.ok(pack.includes(`Evidence from the profile (quoted from the field: Logging): ${loggingQuote}`));
});
