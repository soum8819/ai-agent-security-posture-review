// Runs reviews over evaluation profiles and saves raw results to eval/runs.
// Development tool only: not imported by the app.
//   npm run reviews -- --set tuning|all
//       Full review: reviewer model, then checker model (step 9).
//   npm run reviews -- --set tuning --checker-only --from <run folder>
//       Checker only, on saved reviewer results, so checker prompt changes
//       can be compared on the same input.
//   npm run reviews -- --set tuning|all --reviewer-only
//       Reviewer model only (the step 8 run).
// Reads only eval/profiles and saved runs. Never reads eval/labels,
// eval/ASSUMPTIONS.md or eval/RULE_RUNS.md, and never prints the AI Gateway key.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { analyzeProfile, REVIEW_SETTINGS, type AnalysisResult } from "../lib/analyze.ts";
import { CHECK_PROMPT_VERSION } from "../lib/crosscheck-prompt.ts";
import { CHECK_SETTINGS, crosscheckReview } from "../lib/crosscheck.ts";
import { agentProfileSchema } from "../lib/profile-schema.ts";
import { PROMPT_VERSION } from "../lib/review-prompt.ts";
import { combineReview, reviewProfile, type ReviewRecord } from "../lib/review.ts";

// Written here on purpose, so this script never needs to open the answer key.
const TUNING = ["01", "02", "03", "05", "07", "09", "10", "12"];
const ALL = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
};
const flag = (name: string) => process.argv.includes(name);

const set = arg("--set");
const mode = flag("--checker-only") ? "checker-only" : flag("--reviewer-only") ? "reviewer-only" : "full";
const from = arg("--from");
if ((set !== "tuning" && set !== "all") || (mode === "checker-only" && !from)) {
  console.error("Usage: npm run reviews -- --set tuning|all [--reviewer-only | --checker-only --from <run folder>]");
  process.exit(1);
}
if (!process.env.AI_GATEWAY_API_KEY) {
  console.error("AI_GATEWAY_API_KEY is not set in .env.local");
  process.exit(1);
}

const ids = set === "all" ? ALL : TUNING;
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const dir = `eval/runs/${runId}`;
mkdirSync(dir, { recursive: true });

const save = (name: string, data: unknown) =>
  writeFileSync(`${dir}/${name}`, JSON.stringify(data, null, 2) + "\n");

type Row = { id: string; ok: boolean; note: string };
const rows: Row[] = [];
const results: Record<string, ReviewRecord | AnalysisResult> = {};

for (const n of ids) {
  const id = `profile-${n}`;
  const profile = agentProfileSchema.parse(JSON.parse(readFileSync(`eval/profiles/${id}.json`, "utf8")));
  try {
    if (mode === "reviewer-only") {
      const r = await analyzeProfile(profile);
      results[id] = r;
      rows.push({ id, ok: true, note: `rule tier ${r.ruleTier.tier}, model tier ${r.proposedTier}, ${r.findings.length} kept, ${r.droppedFindings.length} dropped` });
    } else {
      const r =
        mode === "full"
          ? await reviewProfile(profile)
          : await (async () => {
              const first: AnalysisResult = JSON.parse(readFileSync(`eval/runs/${from}/${id}.json`, "utf8"));
              return combineReview(first, await crosscheckReview(profile, first.findings));
            })();
      results[id] = r;
      const t = r.tiers;
      rows.push({
        id,
        ok: true,
        note: `tiers rule ${t.rule} reviewer ${t.reviewer} checker ${t.checker} final ${t.final} (${t.setBy.join("+")}) | contested ${r.contested.join(",") || "none"} | missed ${r.missedFindings.length} kept, ${r.droppedMissedFindings.length} dropped${r.unknownVerdicts.length ? ` | ${r.unknownVerdicts.length} unknown verdict ids` : ""}`,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    save(`${id}.error.json`, { profileId: id, error: message });
    rows.push({ id, ok: false, note: message.slice(0, 200) });
  }
  console.log(`${id}: ${rows.at(-1)!.note}`);
}

// Actual cost per call from AI Gateway. Usage is recorded a few seconds after
// each call, so wait and retry.
async function lookupCost(generationId: string | null) {
  if (!generationId) return null;
  for (let attempt = 0; attempt < 6; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(`https://ai-gateway.vercel.sh/v1/generation?id=${generationId}`, {
      headers: { Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}` },
    });
    if (res.ok) {
      const body = (await res.json()) as { data?: Record<string, unknown> };
      const cost = Number(body.data?.total_cost ?? NaN);
      return { cost: Number.isFinite(cost) ? cost : null, record: body.data ?? null };
    }
  }
  return null;
}

let reviewerCost = 0;
let checkerCost = 0;
const gatewayGenerations: Record<string, unknown> = {};
for (const [id, r] of Object.entries(results)) {
  if ("reviewer" in r) {
    // In checker-only runs the reviewer call was made and costed in the --from run.
    const rc = mode === "full" ? await lookupCost(r.reviewer.generationId) : null;
    const cc = await lookupCost(r.checker.generationId);
    r.reviewer.costUsd = mode === "full" ? (rc?.cost ?? null) : null;
    r.checker.costUsd = cc?.cost ?? null;
    reviewerCost += r.reviewer.costUsd ?? 0;
    checkerCost += r.checker.costUsd ?? 0;
    gatewayGenerations[id] = { reviewer: rc?.record ?? null, checker: cc?.record ?? null };
  } else {
    const rc = await lookupCost(r.generationId);
    reviewerCost += rc?.cost ?? 0;
    gatewayGenerations[id] = { reviewer: rc?.record ?? null };
  }
  save(`${id}.json`, r);
}

const totalCost = reviewerCost + checkerCost;
save("summary.json", {
  runId,
  set,
  mode,
  ...(from ? { reviewerResultsFrom: from } : {}),
  reviewerPromptVersion: PROMPT_VERSION,
  checkerPromptVersion: mode === "reviewer-only" ? null : CHECK_PROMPT_VERSION,
  reviewerSettings: REVIEW_SETTINGS,
  checkerSettings: mode === "reviewer-only" ? null : CHECK_SETTINGS,
  profiles: rows,
  costUsd: {
    reviewer: Number(reviewerCost.toFixed(6)),
    checker: Number(checkerCost.toFixed(6)),
    total: Number(totalCost.toFixed(6)),
  },
  gatewayGenerations,
});
console.log(`\nSaved ${dir}  |  cost reviewer $${reviewerCost.toFixed(4)} + checker $${checkerCost.toFixed(4)} = $${totalCost.toFixed(4)}`);
