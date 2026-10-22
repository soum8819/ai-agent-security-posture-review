// Fixed rules that set a minimum severity (a "floor") and the risk tier.
// They read only the agent profile, and judge by what the profile lists
// (tools, permissions, fields), not by what its text claims.
// Must never import or read eval/labels or eval/ASSUMPTIONS.md.
// Runtime imports stay type-only so Node can run the tests directly.
import type { AsiId } from "./owasp";
import type { AgentProfile } from "./profile-schema";
import type { SEVERITIES } from "./review-schema";

export type Severity = (typeof SEVERITIES)[number];
export type Tier = 1 | 2 | 3 | 4;

export type RuleHit = {
  ruleId: string;
  severity: Severity;
  reason: string;
  field: string;
  category: AsiId;
};

const RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 };

type Permission = AgentProfile["tools"][number]["permissions"][number];

function toolsWith(p: AgentProfile, perms: Permission[]) {
  return p.tools.filter((t) => t.permissions.some((x) => perms.includes(x)));
}

function names(tools: AgentProfile["tools"]) {
  return tools.map((t) => t.name).join(", ");
}

// 1. Moves money or changes customer records with no person confirming.
export function unconfirmedMoneyOrCustomerRecords(p: AgentProfile): RuleHit | null {
  if (p.humanConfirmsActions) return null;
  const money = toolsWith(p, ["move_money"]);
  const customerData = p.dataReads.some((d) => d === "customer_financial" || d === "personal");
  const records = customerData ? toolsWith(p, ["write"]) : [];
  const tools = [...money, ...records.filter((t) => !money.includes(t))];
  if (tools.length === 0) return null;
  return {
    ruleId: "R1",
    severity: "critical",
    reason: `Lists ${names(tools)} that can move money or change customer records, and no person confirms its actions.`,
    field: "tools.permissions, humanConfirmsActions",
    category: "ASI02",
  };
}

// 2. Runs generated code with no sandbox. The profile has no sandbox field,
// so any listed run_code permission counts as unsandboxed.
export function unsandboxedCode(p: AgentProfile): RuleHit | null {
  const tools = toolsWith(p, ["run_code"]);
  if (tools.length === 0) return null;
  return {
    ruleId: "R2",
    severity: "critical",
    reason: `Lists ${names(tools)} with run_code permission, and the profile lists no sandbox.`,
    field: "tools.permissions",
    category: "ASI05",
  };
}

// 3. Reads untrusted input and also has a write or run-code tool.
export function untrustedInputWithWriteOrCode(p: AgentProfile): RuleHit | null {
  const tools = toolsWith(p, ["write", "run_code"]);
  if (p.untrustedInputs.length === 0 || tools.length === 0) return null;
  return {
    ruleId: "R3",
    severity: "high",
    reason: `Reads untrusted input (${p.untrustedInputs.join(", ")}) and lists ${names(tools)} that can write or run code.`,
    field: "untrustedInputs, tools.permissions",
    category: "ASI01",
  };
}

// 4. Uses shared or long-lived credentials. The profile records only
// own_scoped_token or shared_token, so this checks for shared_token.
export function sharedCredentials(p: AgentProfile): RuleHit | null {
  if (p.credentials !== "shared_token") return null;
  return {
    ruleId: "R4",
    severity: "high",
    reason: "Uses a shared token instead of its own scoped credentials.",
    field: "credentials",
    category: "ASI03",
  };
}

// 5. Persistent memory fed by untrusted input.
export function poisonableMemory(p: AgentProfile): RuleHit | null {
  if (p.memory !== "persistent" || p.untrustedInputs.length === 0) return null;
  return {
    ruleId: "R5",
    severity: "high",
    reason: `Keeps persistent memory and reads untrusted input (${p.untrustedInputs.join(", ")}).`,
    field: "memory, untrustedInputs",
    category: "ASI06",
  };
}

const READ_ONLY_CLAIM =
  /\bread[- ]only\b|\bno write access\b|\bcannot change anything\b|\bdoes not change any system\b/i;

// 6. Claims read-only but lists a write tool.
export function readOnlyClaimContradicted(p: AgentProfile): RuleHit | null {
  const claimText = `${p.businessPurpose} ${p.description}`;
  const tools = toolsWith(p, ["write", "run_code", "move_money"]);
  if (!READ_ONLY_CLAIM.test(claimText) || tools.length === 0) return null;
  return {
    ruleId: "R6",
    severity: "high",
    reason: `Its text claims it is read-only, but it lists ${names(tools)} that can change things.`,
    field: "description, tools.permissions",
    category: "ASI03",
  };
}

// 7. Handles customer financial data with no logging.
export function financialDataUnlogged(p: AgentProfile): RuleHit | null {
  if (!p.dataReads.includes("customer_financial") || p.logging.enabled) return null;
  return {
    ruleId: "R7",
    severity: "high",
    reason: "Reads customer financial data and its actions are not logged.",
    field: "dataReads, logging.enabled",
    category: "ASI10",
  };
}

const PLACEHOLDER_OWNER = /^(unknown|tbd|tbc|none|n\/?a|-|\?)$/i;

// 8. No named owner or no kill switch.
export function noOwnerOrKillSwitch(p: AgentProfile): RuleHit | null {
  const noOwner = PLACEHOLDER_OWNER.test(p.owner.trim());
  const noKill = !p.killSwitch.available;
  if (!noOwner && !noKill) return null;
  const missing = [noOwner && "a named owner", noKill && "a kill switch"].filter(Boolean).join(" and ");
  return {
    ruleId: "R8",
    severity: "medium",
    reason: `Has no ${missing}.`,
    field: [noOwner && "owner", noKill && "killSwitch.available"].filter(Boolean).join(", "),
    category: "ASI10",
  };
}

export const RULES = [
  unconfirmedMoneyOrCustomerRecords,
  unsandboxedCode,
  untrustedInputWithWriteOrCode,
  sharedCredentials,
  poisonableMemory,
  readOnlyClaimContradicted,
  financialDataUnlogged,
  noOwnerOrKillSwitch,
];

export function runRules(p: AgentProfile): RuleHit[] {
  return RULES.map((rule) => rule(p)).filter((hit): hit is RuleHit => hit !== null);
}

// The highest severity any rule set, or null if no rule fired.
export function ruleFloor(hits: RuleHit[]): Severity | null {
  return hits.reduce<Severity | null>(
    (top, h) => (top === null || RANK[h.severity] > RANK[top] ? h.severity : top),
    null,
  );
}

// Final severity is always the higher of the rule floor and the model's view.
export function enforceFloor(floor: Severity | null, modelView: Severity): Severity {
  return floor !== null && RANK[floor] > RANK[modelView] ? floor : modelView;
}

// Tier from the customer card: take the highest tier whose test the profile meets.
//   4: moves money with no person confirming, or acts on its own (no person
//      confirms) with write or run-code power.
// Documented assumption (step 7, project owner's reading, to be confirmed with
// the customer): the card's "Moves money" is ambiguous. Moving money only after
// a person confirms does not make Tier 4 by itself. See CLAUDE.md.
//   3: reads customer financial data.
//   2: can do anything beyond reading, or reads data beyond public and internal.
//   1: read-only, public or internal data only.
export function assignTier(p: AgentProfile): { tier: Tier; reasons: string[] } {
  const reasons: string[] = [];
  let tier: Tier = 1;
  const raise = (t: Tier, why: string) => {
    reasons.push(`Tier ${t}: ${why}`);
    if (t > tier) tier = t;
  };

  const money = toolsWith(p, ["move_money"]);
  if (money.length > 0 && !p.humanConfirmsActions) {
    raise(4, `moves money with no person confirming (${names(money)})`);
  }

  const powerful = toolsWith(p, ["write", "run_code"]);
  if (!p.humanConfirmsActions && powerful.length > 0) {
    raise(4, `acts with no person confirming (${names(powerful)})`);
  }

  if (p.dataReads.includes("customer_financial")) raise(3, "reads customer financial data");

  const acting = toolsWith(p, ["write", "run_code", "send_messages", "move_money"]);
  if (acting.length > 0) raise(2, `can act beyond reading (${names(acting)})`);

  const beyondInternal = p.dataReads.filter((d) => d !== "public" && d !== "internal");
  if (beyondInternal.length > 0) raise(2, `reads ${beyondInternal.join(", ")} data`);

  if (reasons.length === 0) reasons.push("Tier 1: read-only, public or internal data only");
  return { tier, reasons };
}

export type TierSource = "rule" | "reviewer" | "checker";

// Step 9: the final tier is the highest of the rule tier and the two models'
// proposed tiers. The models can raise the rule tier, never lower it.
export function finalTier(tiers: Record<TierSource, Tier>): { final: Tier; setBy: TierSource[] } {
  const final = Math.max(tiers.rule, tiers.reviewer, tiers.checker) as Tier;
  const setBy = (Object.keys(tiers) as TierSource[]).filter((k) => tiers[k] === final);
  return { final, setBy };
}
