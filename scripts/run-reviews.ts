// Runs the reviewer model over evaluation profiles and saves raw results.
// Development tool only: not imported by the app.
//   npm run reviews -- --set tuning   (the 8 tuning profiles)
//   npm run reviews -- --set all      (all 12, including the 4 held out)
// Reads only eval/profiles. Never reads eval/labels, eval/ASSUMPTIONS.md or
// eval/RULE_RUNS.md, and never prints the AI Gateway key.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { analyzeProfile, REVIEW_SETTINGS } from "../lib/analyze.ts";
import { agentProfileSchema } from "../lib/profile-schema.ts";
import { PROMPT_VERSION } from "../lib/review-prompt.ts";

// Written here on purpose, so this script never needs to open the answer key.
const TUNING = ["01", "02", "03", "05", "07", "09", "10", "12"];
const ALL = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

const set = process.argv[process.argv.indexOf("--set") + 1];
if (set !== "tuning" && set !== "all") {
  console.error("Usage: npm run reviews -- --set tuning|all");
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

type Row = { id: string; ok: boolean; generationId: string | null; tokens?: number; note: string };
const rows: Row[] = [];

for (const n of ids) {
  const id = `profile-${n}`;
  const profile = agentProfileSchema.parse(JSON.parse(readFileSync(`eval/profiles/${id}.json`, "utf8")));
  try {
    const result = await analyzeProfile(profile);
    save(`${id}.json`, result);
    rows.push({
      id,
      ok: true,
      generationId: result.generationId,
      tokens: result.usage.totalTokens,
      note: `rule tier ${result.ruleTier.tier}, model tier ${result.proposedTier}, ${result.findings.length} kept, ${result.droppedFindings.length} dropped`,
    });
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    save(`${id}.error.json`, { profileId: id, error: message });
    rows.push({ id, ok: false, generationId: null, note: message.slice(0, 160) });
  }
  console.log(`${id}: ${rows.at(-1)!.note}`);
}

// Actual cost per call from AI Gateway. Usage is recorded a few seconds after
// each call, so wait and retry.
async function lookupCost(generationId: string) {
  for (let attempt = 0; attempt < 6; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(`https://ai-gateway.vercel.sh/v1/generation?id=${generationId}`, {
      headers: { Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}` },
    });
    if (res.ok) return res.json();
  }
  return null;
}

const costs: Record<string, unknown> = {};
let totalCost = 0;
for (const row of rows) {
  if (!row.generationId) continue;
  const record = await lookupCost(row.generationId);
  costs[row.id] = record;
  const data = (record as { data?: Record<string, unknown> } | null)?.data ?? {};
  const cost = Number(data.total_cost ?? data.cost ?? NaN);
  if (Number.isFinite(cost)) totalCost += cost;
}

save("summary.json", {
  runId,
  set,
  promptVersion: PROMPT_VERSION,
  settings: REVIEW_SETTINGS,
  profiles: rows,
  totalTokens: rows.reduce((t, r) => t + (r.tokens ?? 0), 0),
  totalCostUsd: Number(totalCost.toFixed(6)),
  gatewayGenerations: costs,
});
console.log(`\nSaved ${dir}  |  total tokens ${rows.reduce((t, r) => t + (r.tokens ?? 0), 0)}  |  cost $${totalCost.toFixed(4)}`);
