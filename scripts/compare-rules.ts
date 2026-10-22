// Compares the rules' tier with the answer key for all 12 profiles.
// Development tool only: not imported by the app. Run: npm run compare-rules
// This is the only code that reads eval/labels. Tune rules on the tuning block
// only; never change a rule because of a held-out result.
import { readFileSync, readdirSync } from "node:fs";
import { agentProfileSchema } from "../lib/profile-schema.ts";
import { assignTier, runRules } from "../lib/rules.ts";

type Label = { profileId: string; expectedTier: number; acceptableTiers?: number[]; heldOut: boolean };

const rows = readdirSync("eval/profiles")
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => {
    const profile = agentProfileSchema.parse(JSON.parse(readFileSync(`eval/profiles/${f}`, "utf8")));
    const label: Label = JSON.parse(readFileSync(`eval/labels/${f}`, "utf8"));
    const { tier } = assignTier(profile);
    const ok = label.acceptableTiers ?? [label.expectedTier];
    return {
      profile: profile.id,
      ruleTier: String(tier),
      hits: runRules(profile).map((h) => `${h.ruleId} ${h.severity}`).join(", ") || "none",
      expected: label.acceptableTiers ? `${label.expectedTier} (${ok.join(" or ")} ok)` : String(label.expectedTier),
      result: ok.includes(tier) ? "match" : "MISMATCH",
      heldOut: label.heldOut,
    };
  });

const headers = ["Profile", "Rule tier", "Rule hits", "Expected tier", "Result"];
const cells = (r: (typeof rows)[number]) => [r.profile, r.ruleTier, r.hits, r.expected, r.result];
const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => cells(r)[i].length)));
const line = (c: string[]) => c.map((x, i) => x.padEnd(widths[i])).join(" | ");

function block(title: string, list: typeof rows) {
  const matched = list.filter((r) => r.result === "match").length;
  console.log(`\n${title}: ${matched} of ${list.length} match`);
  console.log(line(headers));
  console.log(widths.map((w) => "-".repeat(w)).join("-|-"));
  list.forEach((r) => console.log(line(cells(r))));
}

block("TUNING (rules may be adjusted against these)", rows.filter((r) => !r.heldOut));
block("HELD OUT (report only, never tune against these)", rows.filter((r) => r.heldOut));
