// Step 9 logic: contested marking, kept floors, evidence on missed findings,
// the final tier, and what the checker is shown. Calls no model. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkEvidence, type KeptFinding } from "../lib/analyze.ts";
import { asFirstModelFinding, markContested } from "../lib/crosscheck.ts";
import type { AgentProfile } from "../lib/profile-schema.ts";
import { finalTier } from "../lib/rules.ts";

const profile: AgentProfile = {
  id: "test-check",
  name: "Test agent",
  owner: "Test team",
  businessPurpose: "Answer questions from internal documents.",
  dataReads: ["internal"],
  tools: [{ name: "Document search", permissions: ["read"] }],
  humanConfirmsActions: true,
  untrustedInputs: [],
  credentials: "shared_token",
  model: { provider: "Test", name: "test-model" },
  memory: "none",
  logging: { enabled: true, destination: "SIEM" },
  killSwitch: { available: true, description: "Feature flag" },
  description: "It searches internal documents and answers employee questions.",
};

const kept = (severity: KeptFinding["severity"], extra: Partial<KeptFinding> = {}): KeptFinding => ({
  category: "ASI03",
  severity,
  modelSeverity: severity,
  evidenceQuote: "shared_token",
  whyItMatters: "Test reason.",
  recommendedControl: "Test control.",
  ...extra,
});

const v = (findingId: string, verdict: "agree" | "disagree" | "needs_more_information") => ({
  findingId,
  verdict,
  reason: "Test.",
});

test("only a disagreement on a high or critical finding is contested", () => {
  const findings = [kept("high"), kept("medium"), kept("critical"), kept("critical")];
  const { checked } = markContested(findings, [
    v("F1", "disagree"),
    v("F2", "disagree"),
    v("F3", "needs_more_information"),
  ]);
  assert.deepEqual(checked.map((f) => f.contested), [true, false, false, false]);
  assert.equal(checked[3].secondModelVerdict, "no_verdict");
});

test("a contested finding keeps its rule floor and records it", () => {
  const raised = kept("high", { modelSeverity: "low", raisedByRule: "R4" });
  const [f] = markContested([raised], [v("F1", "disagree")]).checked;
  assert.equal(f.contested, true);
  assert.equal(f.severity, "high");
  assert.equal(f.floorKept, "R4");
});

test("a made-up missed finding is dropped by the evidence check", () => {
  const real = { ...kept("high"), evidenceQuote: "searches internal documents" };
  const madeUp = { ...kept("high"), evidenceQuote: "It deletes customer accounts every night." };
  const { kept: keptMissed, dropped } = checkEvidence([real, madeUp], profile);
  assert.equal(keptMissed.length, 1);
  assert.equal(dropped[0].finding.evidenceQuote, madeUp.evidenceQuote);
});

test("the final tier is the highest of the three, and says who set it", () => {
  assert.deepEqual(finalTier({ rule: 2, reviewer: 3, checker: 1 }), { final: 3, setBy: ["reviewer"] });
  assert.deepEqual(finalTier({ rule: 4, reviewer: 3, checker: 4 }), { final: 4, setBy: ["rule", "checker"] });
  assert.equal(finalTier({ rule: 3, reviewer: 1, checker: 1 }).final, 3); // models never lower it
});

test("the checker is shown the first model's own severity, not the floor", () => {
  const shown = asFirstModelFinding(kept("high", { modelSeverity: "low", raisedByRule: "R4" }));
  assert.equal(shown.severity, "low");
  assert.equal("raisedByRule" in shown, false);
});
