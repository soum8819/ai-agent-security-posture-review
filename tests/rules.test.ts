// One test per rule, plus tier assignment and the severity floor.
// Uses made-up profiles, never the evaluation set. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AgentProfile } from "../lib/profile-schema.ts";
import {
  assignTier,
  enforceFloor,
  financialDataUnlogged,
  noOwnerOrKillSwitch,
  poisonableMemory,
  readOnlyClaimContradicted,
  ruleFloor,
  runRules,
  sharedCredentials,
  unconfirmedMoneyOrCustomerRecords,
  unsandboxedCode,
  untrustedInputWithWriteOrCode,
} from "../lib/rules.ts";

// A deliberately harmless profile: no rule should fire on it.
const base: AgentProfile = {
  id: "test-base",
  name: "Test agent",
  owner: "Test team",
  businessPurpose: "Answer questions from internal documents.",
  dataReads: ["internal"],
  tools: [{ name: "Document search", permissions: ["read"] }],
  humanConfirmsActions: true,
  untrustedInputs: [],
  credentials: "own_scoped_token",
  model: { provider: "Test", name: "test-model" },
  memory: "none",
  logging: { enabled: true, destination: "SIEM" },
  killSwitch: { available: true, description: "Feature flag" },
  description: "Searches internal documents and answers.",
};

const withTool = (p: AgentProfile, name: string, permissions: AgentProfile["tools"][number]["permissions"]) => ({
  ...p,
  tools: [...p.tools, { name, permissions }],
});

test("the harmless base profile triggers no rule", () => {
  assert.deepEqual(runRules(base), []);
});

test("R1: moving money with no person confirming is critical", () => {
  const p = { ...withTool(base, "Payments API", ["move_money"]), humanConfirmsActions: false };
  const hit = unconfirmedMoneyOrCustomerRecords(p);
  assert.equal(hit?.severity, "critical");
  assert.equal(hit?.category, "ASI02");
  assert.equal(unconfirmedMoneyOrCustomerRecords({ ...p, humanConfirmsActions: true }), null);
});

test("R2: running code with no sandbox is critical", () => {
  const hit = unsandboxedCode(withTool(base, "Shell", ["run_code"]));
  assert.equal(hit?.severity, "critical");
  assert.equal(hit?.category, "ASI05");
});

test("R3: untrusted input plus a write tool is high", () => {
  const p = { ...withTool(base, "Records", ["read", "write"]), untrustedInputs: ["email" as const] };
  const hit = untrustedInputWithWriteOrCode(p);
  assert.equal(hit?.severity, "high");
  assert.equal(hit?.category, "ASI01");
  assert.equal(untrustedInputWithWriteOrCode({ ...p, untrustedInputs: [] }), null);
});

test("R4: a shared token is high", () => {
  const hit = sharedCredentials({ ...base, credentials: "shared_token" });
  assert.equal(hit?.severity, "high");
  assert.equal(hit?.category, "ASI03");
});

test("R5: persistent memory fed by untrusted input is high", () => {
  const p: AgentProfile = { ...base, memory: "persistent", untrustedInputs: ["web"] };
  const hit = poisonableMemory(p);
  assert.equal(hit?.severity, "high");
  assert.equal(hit?.category, "ASI06");
  assert.equal(poisonableMemory({ ...p, memory: "session" }), null);
});

test("R6: claiming read-only while listing a write tool is high", () => {
  const p = { ...withTool(base, "Records", ["write"]), description: "This agent is strictly read-only." };
  const hit = readOnlyClaimContradicted(p);
  assert.equal(hit?.severity, "high");
  assert.equal(hit?.category, "ASI03");
  assert.equal(readOnlyClaimContradicted({ ...base, description: "This agent is strictly read-only." }), null);
});

test("R7: customer financial data with no logging is high", () => {
  const p: AgentProfile = { ...base, dataReads: ["customer_financial"], logging: { enabled: false } };
  const hit = financialDataUnlogged(p);
  assert.equal(hit?.severity, "high");
  assert.equal(hit?.category, "ASI10");
  assert.equal(financialDataUnlogged({ ...p, logging: { enabled: true } }), null);
});

test("R8: no named owner or no kill switch is medium", () => {
  const hit = noOwnerOrKillSwitch({ ...base, killSwitch: { available: false } });
  assert.equal(hit?.severity, "medium");
  assert.equal(hit?.category, "ASI10");
  assert.equal(noOwnerOrKillSwitch({ ...base, owner: "TBD" })?.field, "owner");
});

test("tier assignment follows the four tier definitions", () => {
  assert.equal(assignTier(base).tier, 1);
  assert.equal(assignTier(withTool(base, "Drafts", ["write"])).tier, 2);
  assert.equal(assignTier({ ...base, dataReads: ["customer_financial"] }).tier, 3);
  // Moving money: Tier 4 only when no person confirms (step 7 assumption).
  const payer = withTool(base, "Payments API", ["move_money"]);
  assert.equal(assignTier({ ...payer, humanConfirmsActions: false }).tier, 4);
  assert.equal(assignTier(payer).tier, 2);
  assert.equal(assignTier({ ...withTool(base, "Records", ["write"]), humanConfirmsActions: false }).tier, 4);
});

test("final severity is never below the rule floor", () => {
  const floor = ruleFloor(runRules({ ...base, credentials: "shared_token" }));
  assert.equal(floor, "high");
  assert.equal(enforceFloor(floor, "low"), "high");
  assert.equal(enforceFloor(floor, "critical"), "critical");
  assert.equal(enforceFloor(null, "medium"), "medium");
});
