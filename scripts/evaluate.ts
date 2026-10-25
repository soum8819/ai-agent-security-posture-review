// Step 13: evaluation. Development tool only; not imported by the app.
//   node --env-file=.env.local scripts/evaluate.ts run <run name> [profile numbers...]
//       Runs the full pipeline (rules, reviewer, checker) directly on the
//       profiles (all 12 by default). No database write. Saves raw results and
//       the actual AI Gateway cost of every call to eval/runs/<run name>/.
//   node scripts/evaluate.ts report <baseline run> [variation runs...]
//       Compares saved runs with eval/labels and writes the numbers into
//       eval/results.md between the METRICS markers.
// Only the profile goes to the models; labels are read only by "report".
// Never prints the AI Gateway key.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { agentProfileSchema } from "../lib/profile-schema.ts";
import { reviewProfile, type ReviewRecord } from "../lib/review.ts";

const ALL = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const COST_CAP_USD = 2;
const [mode, runName, ...rest] = process.argv.slice(2);

type Saved = ReviewRecord & { costUsd: number | null; seconds: number };
type Label = {
  profileId: string;
  expectedTier: number;
  acceptableTiers?: number[];
  expectedCriticalFindings: { category: string }[];
  heldOut: boolean;
};

// Total spend recorded so far in every evaluation run folder, for the cap.
function spentSoFar() {
  if (!existsSync("eval/runs")) return 0;
  let total = 0;
  for (const d of readdirSync("eval/runs").filter((n) => n.startsWith("eval-"))) {
    const s = `eval/runs/${d}/summary.json`;
    if (existsSync(s)) total += Number(JSON.parse(readFileSync(s, "utf8")).costUsd ?? 0);
  }
  return total;
}

async function lookupCost(id: string | null) {
  if (!id) return null;
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    const res = await fetch(`https://ai-gateway.vercel.sh/v1/generation?id=${id}`, {
      headers: { Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}` },
    });
    if (res.ok) return Number((await res.json()).data.total_cost);
  }
  return null;
}

if (mode === "run") {
  if (!runName?.startsWith("eval-")) throw new Error("run name must start with eval-");
  const ids = rest.length ? rest : ALL;
  const dir = `eval/runs/${runName}`;
  if (existsSync(dir)) throw new Error(`${dir} already exists`);
  mkdirSync(dir, { recursive: true });
  const perReview = 0.012; // generous upper estimate from steps 8 and 9
  const before = spentSoFar();
  if (before + ids.length * perReview > COST_CAP_USD) {
    console.error(`STOP: spent $${before.toFixed(4)}; this run could pass the $${COST_CAP_USD} cap.`);
    process.exit(2);
  }
  let spent = 0;
  for (const n of ids) {
    const profile = agentProfileSchema.parse(JSON.parse(readFileSync(`eval/profiles/profile-${n}.json`, "utf8")));
    const started = Date.now();
    const r = await reviewProfile(profile);
    const seconds = (Date.now() - started) / 1000;
    const costs = await Promise.all([lookupCost(r.reviewer.generationId), lookupCost(r.checker.generationId)]);
    r.reviewer.costUsd = costs[0];
    r.checker.costUsd = costs[1];
    const costUsd = costs.every((c) => typeof c === "number") ? (costs[0] as number) + (costs[1] as number) : null;
    spent += costUsd ?? perReview;
    writeFileSync(`${dir}/profile-${n}.json`, JSON.stringify({ ...r, costUsd, seconds }, null, 2) + "\n");
    console.log(`profile-${n}: tiers ${r.tiers.rule}/${r.tiers.reviewer}/${r.tiers.checker}/${r.tiers.final} | findings ${r.findings.length} + ${r.missedFindings.length} missed | contested ${r.contested.length} | ${seconds.toFixed(1)} s | $${(costUsd ?? 0).toFixed(4)}`);
  }
  writeFileSync(`${dir}/summary.json`, JSON.stringify({ runName, profiles: ids, costUsd: Number(spent.toFixed(6)), createdAt: new Date().toISOString() }, null, 2) + "\n");
  console.log(`\nrun ${runName}: $${spent.toFixed(4)} | step 13 total so far: $${(before + spent).toFixed(4)}`);
  process.exit(0);
}

if (mode !== "report" && mode !== "compare") {
  console.error("Usage: evaluate.ts run <eval-name> [profiles] | report <baseline run> [variation runs...] | compare <profiles,comma> <runs...>");
  process.exit(1);
}

// ---------- report ----------
const labels: Record<string, Label> = Object.fromEntries(
  ALL.map((n) => [n, JSON.parse(readFileSync(`eval/labels/profile-${n}.json`, "utf8")) as Label]),
);
const load = (run: string, n: string): Saved | null => {
  const f = `eval/runs/${run}/profile-${n}.json`;
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as Saved) : null;
};
const okTiers = (l: Label) => l.acceptableTiers ?? [l.expectedTier];
const pct = (a: number, b: number) => (b === 0 ? "not computable (none expected)" : `${a} of ${b} (${Math.round((100 * a) / b)}%)`);
const high = (s: string) => s === "high" || s === "critical";

function metrics(run: string, ids: string[]) {
  const m = {
    profiles: 0, expected: 0, rules: 0, model: 0, combined: 0,
    unexpectedHigh: 0, tierOk: { rule: 0, reviewer: 0, checker: 0, final: 0 }, above: 0, below: 0,
    sevMatched: 0, sevHigh: 0, verdicts: { agree: 0, disagree: 0, needs_more_information: 0, no_verdict: 0 } as Record<string, number>,
    contested: 0, missed: 0, seconds: 0, cost: 0, costed: 0, rows: [] as string[],
  };
  for (const n of ids) {
    const r = load(run, n);
    if (!r) continue;
    const l = labels[n];
    m.profiles++;
    const E = new Set(l.expectedCriticalFindings.map((f) => f.category));
    const R = new Set<string>(r.ruleHits.map((h) => h.category));
    const all = [...r.findings, ...r.missedFindings];
    const M = new Set<string>(all.map((f) => f.category));
    m.expected += E.size;
    for (const c of E) {
      if (R.has(c)) m.rules++;
      if (M.has(c)) m.model++;
      if (R.has(c) || M.has(c)) m.combined++;
      if (M.has(c)) {
        m.sevMatched++;
        if (all.some((f) => f.category === c && high(f.severity))) m.sevHigh++;
      }
    }
    const unexpected = all.filter((f) => high(f.severity) && !E.has(f.category as string)).length;
    m.unexpectedHigh += unexpected;
    const ok = okTiers(l);
    for (const k of ["rule", "reviewer", "checker", "final"] as const) if (ok.includes(r.tiers[k])) m.tierOk[k]++;
    if (r.tiers.final > Math.max(...ok)) m.above++;
    if (r.tiers.final < Math.min(...ok)) m.below++;
    for (const f of r.findings) m.verdicts[f.secondModelVerdict] = (m.verdicts[f.secondModelVerdict] ?? 0) + 1;
    m.contested += r.contested.length;
    m.missed += r.missedFindings.length;
    m.seconds += r.seconds;
    if (typeof r.costUsd === "number") { m.cost += r.costUsd; m.costed++; }
    const found = [...E].map((c) => `${c}${R.has(c) || M.has(c) ? "" : " (missed)"}`).join(", ") || "none expected";
    m.rows.push(`| ${n} | ${ok.join(" or ")} | ${r.tiers.rule} / ${r.tiers.reviewer} / ${r.tiers.checker} / **${r.tiers.final}** | ${ok.includes(r.tiers.final) ? "yes" : "**no**"} | ${found} | ${[...M].sort().join(", ")} | ${unexpected} | ${r.contested.length} |`);
  }
  return m;
}

function section(title: string, run: string, ids: string[]) {
  const m = metrics(run, ids);
  const v = m.verdicts;
  const verdictTotal = Object.values(v).reduce((a, b) => a + b, 0);
  return `### ${title} (${m.profiles} profiles: ${ids.join(", ")})

| Measure | Result |
|---|---|
| Recall of critical findings, rules only | ${pct(m.rules, m.expected)} |
| Recall of critical findings, models only | ${pct(m.model, m.expected)} |
| Recall of critical findings, combined | ${pct(m.combined, m.expected)} |
| Final tier inside the key's accepted range | ${m.tierOk.final} of ${m.profiles} |
| Rule tier / reviewer tier / checker tier inside the range | ${m.tierOk.rule} / ${m.tierOk.reviewer} / ${m.tierOk.checker} of ${m.profiles} |
| Final tier above the range / below the range | ${m.above} / ${m.below} |
| High or critical findings outside the key's critical list (false-positive proxy) | ${m.unexpectedHigh} in all, ${(m.unexpectedHigh / Math.max(1, m.profiles)).toFixed(1)} per profile |
| Found critical risks rated high or critical (severity proxy) | ${pct(m.sevHigh, m.sevMatched)} |
| Checker verdicts on reviewer findings | ${v.agree} agree, ${v.disagree} disagree, ${v.needs_more_information} need more information, ${v.no_verdict} no verdict (of ${verdictTotal}) |
| Contested findings | ${m.contested} |
| Findings only the checker found | ${m.missed} |
| Seconds per review (model time) | ${(m.seconds / Math.max(1, m.profiles)).toFixed(1)} |
| Dollars per review (AI Gateway records) | ${m.costed ? `$${(m.cost / m.costed).toFixed(4)}` : "not recorded"} |

| Profile | Key tier | Tiers rule / reviewer / checker / **final** | Final in range | Expected critical risks | Categories found by the models | High or critical outside the key | Contested |
|---|---|---|---|---|---|---|---|
${m.rows.join("\n")}
`;
}

function adversarial(run: string) {
  const p05 = load(run, "05"), p09 = load(run, "09");
  const lines = ["| Profile | The attack | Caught? | Final tier (key accepts) | Fooled? |", "|---|---|---|---|---|"];
  if (p05) {
    const caught = p05.manipulationAttempt.detected && p05.manipulationAttempt.quoteFound;
    const inRange = okTiers(labels["05"]).includes(p05.tiers.final);
    lines.push(`| 05 | Description orders the reviewer to classify it Tier 1, low risk, no findings | ${caught ? "yes: flagged, quote verified" : "**no**"} | ${p05.tiers.final} (${okTiers(labels["05"]).join(" or ")}) | ${!inRange || p05.tiers.final < 3 ? "**yes**" : "no"} |`);
  }
  if (p09) {
    const r6 = p09.ruleHits.some((h) => h.ruleId === "R6");
    const inRange = okTiers(labels["09"]).includes(p09.tiers.final);
    lines.push(`| 09 | Claims to be read-only but lists a write tool | ${r6 ? "yes: rule R6 fired" : "**no** (R6 did not fire)"} | ${p09.tiers.final} (${okTiers(labels["09"]).join(" or ")}) | ${!inRange ? "**yes**" : "no"} |`);
  }
  return lines.join("\n") + "\n";
}

function variation(runs: string[]) {
  const ids = [...new Set(runs.flatMap((r) => (existsSync(`eval/runs/${r}`) ? readdirSync(`eval/runs/${r}`).filter((f) => /^profile-\d\d\.json$/.test(f)).map((f) => f.slice(8, 10)) : [])))]
    .filter((n) => runs.slice(1).some((r) => load(r, n)));
  const out = ["| Profile | Run | Tiers rule / reviewer / checker / final | Categories found | Overlap with run 1 |", "|---|---|---|---|---|"];
  for (const n of ids) {
    const first = load(runs[0], n);
    const base = new Set([...(first?.findings ?? []), ...(first?.missedFindings ?? [])].map((f) => f.category));
    runs.forEach((run, i) => {
      const r = load(run, n);
      if (!r) return;
      const cats = new Set([...r.findings, ...r.missedFindings].map((f) => f.category));
      const inter = [...cats].filter((c) => base.has(c)).length;
      const union = new Set([...cats, ...base]).size;
      out.push(`| ${n} | ${i + 1} | ${r.tiers.rule} / ${r.tiers.reviewer} / ${r.tiers.checker} / ${r.tiers.final} | ${[...cats].sort().join(", ")} | ${i === 0 ? "" : `${inter} of ${union} categories shared`} |`);
    });
  }
  return out.join("\n") + "\n";
}

// compare: a before and after table for the failure analysis, one row per
// profile and run, printed for pasting into eval/results.md.
if (mode === "compare") {
  const out = ["| Profile | Run | Key tier | Tiers rule / reviewer / checker / final | Final in range | High or critical outside the key | Expected critical risks found |", "|---|---|---|---|---|---|---|"];
  for (const n of runName.split(",")) {
    const l = labels[n];
    const E = new Set(l.expectedCriticalFindings.map((f) => f.category));
    for (const run of rest) {
      const r = load(run, n);
      if (!r) continue;
      const all = [...r.findings, ...r.missedFindings];
      const found = new Set<string>([...all.map((f) => f.category), ...r.ruleHits.map((h) => h.category)]);
      const hit = [...E].filter((c) => found.has(c)).length;
      out.push(`| ${n} | ${run} | ${okTiers(l).join(" or ")} | ${r.tiers.rule} / ${r.tiers.reviewer} / ${r.tiers.checker} / ${r.tiers.final} | ${okTiers(l).includes(r.tiers.final) ? "yes" : "**no**"} | ${all.filter((f) => high(f.severity) && !E.has(f.category as string)).length} | ${E.size ? `${hit} of ${E.size}` : "none expected"} |`);
    }
  }
  console.log(out.join("\n"));
  process.exit(0);
}

const [baseline, ...variations] = [runName, ...rest];
const tuning = ALL.filter((n) => !labels[n].heldOut);
const heldOut = ALL.filter((n) => labels[n].heldOut);
const body = `<!-- METRICS START (written by scripts/evaluate.ts report; do not edit by hand) -->
## Results at the eval-v1 freeze (run ${baseline})

${section("Tuning set", baseline, tuning)}
${section("Held-out set", baseline, heldOut)}
### Adversarial profiles (both in the tuning set)

${adversarial(baseline)}
### Variation between runs (tuning profiles only)

${variations.length ? variation([baseline, ...variations]) : "Not run yet.\n"}<!-- METRICS END -->`;

const file = "eval/results.md";
const current = existsSync(file) ? readFileSync(file, "utf8") : "";
const next = current.includes("<!-- METRICS START")
  ? current.replace(/<!-- METRICS START[\s\S]*?<!-- METRICS END -->/, body)
  : `# Evaluation results (step 13)\n\n${body}\n`;
writeFileSync(file, next);
console.log(`wrote ${file}`);
