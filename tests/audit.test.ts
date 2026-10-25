// Step 11b: only the Auditor may read the audit log, no code can change or
// delete an event, and the screen shows details in plain words. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { detailLines, parseReviewFilter } from "../lib/audit-view.ts";
import { can } from "../lib/permissions.ts";
import { ROLES } from "../lib/users.ts";

test("only the Auditor may read the audit log", () => {
  for (const role of ROLES) assert.equal(can(role, "view_audit_log"), role === "auditor", role);
});

function codeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (["node_modules", ".next", ".git", ".swc", "eval"].includes(name)) return [];
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return codeFiles(p);
    return /\.(ts|tsx|mts|js|mjs|sql)$/.test(name) ? [p] : [];
  });
}

test("no code outside db/schema.sql updates, deletes or truncates audit events", () => {
  const changesAudit = /\b(update|delete\s+from|truncate(\s+table)?)\s+audit_events\b/i;
  const offenders = codeFiles(".")
    .filter((f) => f !== join("db", "schema.sql") && f !== join("tests", "audit.test.ts"))
    .filter((f) => changesAudit.test(readFileSync(f, "utf8")));
  assert.deepEqual(offenders, []);
  // The schema may mention them only to refuse them (the triggers).
  const schema = readFileSync("db/schema.sql", "utf8");
  assert.match(schema, /BEFORE UPDATE OR DELETE ON audit_events/);
  assert.match(schema, /BEFORE TRUNCATE ON audit_events/);
});

test("event details are shown in plain words, never as JSON", () => {
  const lines = detailLines({
    stage: "appsec",
    tiers: { rule: 1, final: 3, setBy: ["reviewer"] },
    resolutions: [{ findingId: "F2", resolution: "dismissed", reason: "Scoped token." }],
    credentials: "shared_token",
    note: null,
  });
  for (const l of lines) assert.equal(/[{}[\]]|":/.test(`${l.label} ${l.value}`), false, `${l.label}: ${l.value}`);
  assert.deepEqual(lines.find((l) => l.label === "Tiers, final"), { label: "Tiers, final", value: "3" });
  assert.deepEqual(lines.find((l) => l.label === "Credentials"), { label: "Credentials", value: "A shared token" });
  assert.deepEqual(lines.find((l) => l.label === "Resolutions 1, finding id"), { label: "Resolutions 1, finding id", value: "F2" });
});

test("the review filter accepts only review id characters", () => {
  assert.equal(parseReviewFilter("080fc26e"), "080fc26e");
  assert.equal(parseReviewFilter(" 080FC26E "), "080fc26e");
  for (const bad of ["08", "080fc26e' OR 1=1", "%", "zzzz", 42]) assert.equal(parseReviewFilter(bad), null, String(bad));
});
