// Step 12: attacks on the HTTP routes.
//   node scripts/security-http.ts live  <url>   tests that need no sign-in
//   node --env-file=.env.local scripts/security-http.ts local <url>
//                                                adds signed-in tests, decision reuse
//                                                and the sign-in limit (local only)
//   node --env-file=.env.local scripts/security-http.ts signin-local <url>
//                                                the sign-in limit only, including that
//                                                the lock ends after the window (local only)
// Prints results only, never a secret, cookie or network address.
import { createReview, getDecisions, getReview, markReviewing, saveReviewResult } from "../lib/store.ts";
import { readFileSync } from "node:fs";

const [mode, base] = [process.argv[2], process.argv[3]?.replace(/\/$/, "")];
if ((mode !== "live" && mode !== "local" && mode !== "signin-local") || !base) {
  console.error("Usage: security-http.ts live|local|signin-local <base url>");
  process.exit(1);
}
const rows: { test: string; expect: string; got: string; pass: boolean }[] = [];
const check = (test: string, expect: string, got: string | number) => {
  const pass = String(got) === expect;
  rows.push({ test, expect, got: String(got), pass });
  console.log(pass ? "pass" : "FAIL", "|", test, "| expected", expect, "| got", got);
};
const anyId = "00000000-0000-4000-8000-000000000000";
const post = (path: string, body: string, headers: Record<string, string> = {}) =>
  fetch(base + path, { method: "POST", body, headers: { "content-type": "application/json", ...headers }, redirect: "manual" });

if (mode !== "signin-local") {
// (e) approval route, signed out. proxy.ts refuses every signed-out /api
// request with 401 before the route runs, so its body is never read.
// (First run expected 403 here; see eval/security-tests.md.)
check("(e) decision, signed out, from this site", "401", (await post(`/api/reviews/${anyId}/decisions`, "{}", { origin: base })).status);
check("(e) decision, signed out, no Origin header", "401", (await post(`/api/reviews/${anyId}/decisions`, "{}")).status);
check("(e) decision, signed out, another site's Origin", "401", (await post(`/api/reviews/${anyId}/decisions`, "{}", { origin: "https://evil.example" })).status);
// (f) resuming a review through Workflow's public webhook address.
check("(f) resume through the public webhook address", "404", (await post(`/.well-known/workflow/v1/webhook/appsec-${anyId}`, JSON.stringify({ decisionId: anyId }))).status);
// (d) oversized requests, signed out: refused by proxy.ts before any body is
// read. (First run expected 413 here; the size limits are tested signed in below.)
check("(d) submission of 70 KB, signed out", "401", (await post("/api/reviews", JSON.stringify({ profile: { description: "x".repeat(70_000) } }))).status);
check("(d) decision of 20 KB, signed out", "401", (await post(`/api/reviews/${anyId}/decisions`, JSON.stringify({ note: "x".repeat(20_000) }), { origin: base })).status);

}

if (mode === "local") {
  const { createSessionToken } = await import("../lib/session.ts");
  const cookie = async (u: string) => ({ cookie: `hl_session=${await createSessionToken(u, process.env.SESSION_SECRET!)}`, origin: base });
  // Two fresh setup-check reviews waiting for AppSec (no model call).
  const record = JSON.parse(readFileSync("eval/runs/2026-10-22T04-59-52-013Z/profile-02.json", "utf8"));
  const profile = JSON.parse(readFileSync("eval/profiles/profile-02.json", "utf8"));
  const make = async () => {
    const id = crypto.randomUUID();
    await createReview({ id, submitter: { id: "setup-check", role: "setup" }, profile });
    await markReviewing(id, null);
    await saveReviewResult(id, record, "awaiting_appsec");
    return id;
  };
  const A = await make();
  const B = await make();
  const approve = JSON.stringify({ stage: "appsec", outcome: "approved", note: "Security test decision.", resolutions: [] });
  // Origin check and size limits, signed in, so the route itself runs.
  const alex = await cookie("u-appsec");
  check("(e) decision, signed in, no Origin header", "403", (await post(`/api/reviews/${A}/decisions`, approve, { cookie: alex.cookie })).status);
  check("(e) decision, signed in, another site's Origin", "403", (await post(`/api/reviews/${A}/decisions`, approve, { cookie: alex.cookie, origin: "https://evil.example" })).status);
  check("(d) submission of 70 KB, signed in as Riley", "413", (await post("/api/reviews", JSON.stringify({ profile: { description: "x".repeat(70_000) } }), await cookie("u-submitter"))).status);
  check("(d) decision of 20 KB, signed in as Alex", "413", (await post(`/api/reviews/${A}/decisions`, JSON.stringify({ note: "x".repeat(20_000) }), alex)).status);
  check("(e) decision as the Auditor", "403", (await post(`/api/reviews/${A}/decisions`, approve, await cookie("u-auditor"))).status);
  check("(e) decision as Model Risk at the AppSec stage", "403", (await post(`/api/reviews/${A}/decisions`, approve, await cookie("u-modelrisk"))).status);
  check("(e) decision as the Submitter (not her review)", "404", (await post(`/api/reviews/${A}/decisions`, approve, await cookie("u-submitter"))).status);
  // (f) reuse: Alex decides A, then replays the same request.
  check("(f) Alex approves review A", "201", (await post(`/api/reviews/${A}/decisions`, approve, await cookie("u-appsec"))).status);
  check("(f) replaying A's approval on A", "409", (await post(`/api/reviews/${A}/decisions`, approve, await cookie("u-appsec"))).status);
  const aDecision = (await getDecisions(A))[0];
  // A request for B that names A and A's decision: the route uses only the review in its URL.
  const smuggled = JSON.stringify({ stage: "appsec", outcome: "approved", note: "Reuse attempt.", resolutions: [], reviewId: A, decisionId: aDecision.id });
  check("(f) B unchanged after A's approval", "awaiting_appsec", (await getReview(B))!.review.status);
  check("(f) B has no decision after A's approval", "0", (await getDecisions(B)).length);
  check("(f) A still has exactly one decision after the replay", "1", (await getDecisions(A)).length);
  check("(f) an approval naming A, sent to the Model Risk stage of B", "409", (await post(`/api/reviews/${B}/decisions`, smuggled.replace('"appsec"', '"model_risk"'), await cookie("u-modelrisk"))).status);

}

if (mode === "signin-local") {
  // The lock must end: once no failure is left inside the window, the right
  // passcode signs in again. Uses the time of the newest recorded failure.
  const { getSql } = await import("../lib/db.ts");
  const [t] = await getSql()`SELECT max(created_at) AS t FROM audit_events WHERE event_type = 'sign_in_failed'`;
  const waitMs = new Date(t.t).getTime() + 15 * 60 * 1000 + 20_000 - Date.now();
  console.log(`waiting ${Math.round(waitMs / 1000)} s for the 15 minute window to pass`);
  await new Promise((r) => setTimeout(r, Math.max(0, waitMs)));
  const html = await (await fetch(base + "/app/sign-in")).text();
  const action = html.match(/name="(\$ACTION_ID_[a-f0-9]+)"/)?.[1];
  const form = new FormData();
  form.set(action!, ""); form.set("userId", "u-appsec"); form.set("passcode", process.env.DEMO_PASSCODE!); form.set("next", "/app");
  const r = await fetch(base + "/app/sign-in", { method: "POST", body: form, redirect: "manual" });
  check("sign-in, right passcode after the window has passed", "/app", r.headers.get("location") ?? `status ${r.status}`);
  check("sign-in, a session cookie was set", "true", String((r.headers.get("set-cookie") ?? "").startsWith("hl_session=")));
}

if (mode === "local" || mode === "signin-local") {
  // Sign-in attempt limit (local build only).
  const html = await (await fetch(base + "/app/sign-in")).text();
  const action = html.match(/name="(\$ACTION_ID_[a-f0-9]+)"/)?.[1];
  const signIn = async (passcode: string) => {
    const form = new FormData();
    form.set(action!, ""); form.set("userId", "u-appsec"); form.set("passcode", passcode); form.set("next", "/app");
    const r = await fetch(base + "/app/sign-in", { method: "POST", body: form, redirect: "manual" });
    return r.headers.get("location") ?? `status ${r.status}`;
  };
  for (let i = 1; i <= 5; i++) check(`sign-in, wrong passcode attempt ${i}`, "/app/sign-in?error=invalid", await signIn(`wrong-${i}`));
  check("sign-in, wrong passcode attempt 6", "/app/sign-in?error=locked", await signIn("wrong-6"));
  check("sign-in, right passcode while locked", "/app/sign-in?error=locked", await signIn(process.env.DEMO_PASSCODE!));
  const { getSql } = await import("../lib/db.ts");
  const ev = await getSql()`SELECT details FROM audit_events WHERE event_type IN ('sign_in_failed','sign_in_blocked') ORDER BY id DESC LIMIT 7`;
  const raw = ev.some((e) => /127\.0\.0\.1|::1|localhost/.test(JSON.stringify(e.details)));
  check("sign-in events store no readable network address", "true", String(!raw && ev.every((e) => /^[0-9a-f]{24}$/.test(String((e.details as { network?: string }).network)))));
}

const failed = rows.filter((r) => !r.pass).length;
console.log(`\n${rows.length - failed} of ${rows.length} passed (${mode}, ${base})`);
