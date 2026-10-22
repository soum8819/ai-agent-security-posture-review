// Proves the evidence check drops a made-up finding and the rule floor
// raises a low model severity. Calls no model. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AgentProfile } from "../lib/profile-schema.ts";
import { applyFloor, checkEvidence, quoteIsInProfile } from "../lib/analyze.ts";
import { runRules } from "../lib/rules.ts";

const profile: AgentProfile = {
  id: "test-evidence",
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
  description: "It searches the team’s internal documents and   answers employee questions.",
};

const finding = (evidenceQuote: string, severity: "low" | "high" = "high") => ({
  category: "ASI03" as const,
  severity,
  evidenceQuote,
  whyItMatters: "Test reason.",
  recommendedControl: "Test control.",
});

test("the evidence check keeps real quotes and drops a made-up one", () => {
  const real = finding("searches the team's internal documents and answers"); // straight quote, single space
  const fieldValue = finding("shared_token");
  const madeUp = finding("It can wire money to any account without approval.");
  const { kept, dropped } = checkEvidence([real, fieldValue, madeUp], profile);
  assert.deepEqual(kept, [real, fieldValue]);
  assert.equal(dropped.length, 1);
  assert.equal(dropped[0].finding, madeUp);
  assert.equal(quoteIsInProfile("It", profile), false); // too short to count as evidence
  // Layout and wrapping quote marks do not matter; the words still must match.
  assert.equal(quoteIsInProfile('"It searches the team’s internal documents"', profile), true);
  assert.equal(quoteIsInProfile('"dataReads": ["internal"]', profile), true);
  assert.equal(quoteIsInProfile('"dataReads": ["confidential"]', profile), false);
});

test("the rule floor raises a model severity that is too low", () => {
  const [floored] = applyFloor([finding("shared_token", "low")], runRules(profile));
  assert.equal(floored.modelSeverity, "low");
  assert.equal(floored.severity, "high"); // rule R4 sets high for a shared token
  assert.equal(floored.raisedByRule, "R4");
});
