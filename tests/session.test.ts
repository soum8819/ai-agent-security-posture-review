// Slice A: the signed session cookie and what each role may do.
// Uses a throwaway test secret, never a real one. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { can } from "../lib/permissions.ts";
import { createSessionToken, passcodeMatches, verifySessionToken } from "../lib/session.ts";

const SECRET = "test-secret-only-for-unit-tests-0123456789";

test("a signed session names the right user", async () => {
  const token = await createSessionToken("u-appsec", SECRET);
  assert.equal((await verifySessionToken(token, SECRET))?.role, "appsec_reviewer");
});

test("an altered, wrongly signed, expired or unknown session is refused", async () => {
  const token = await createSessionToken("u-submitter", SECRET);
  const [payload, sig] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ u: "u-appsec", exp: Date.now() + 1e6 })).toString("base64url");
  assert.equal(await verifySessionToken(`${forged}.${sig}`, SECRET), null); // user swapped
  assert.equal(await verifySessionToken(token, SECRET + "x"), null); // other secret
  assert.equal(await verifySessionToken(token, SECRET, Date.now() + 9 * 3600 * 1000), null); // expired
  assert.equal(await verifySessionToken(await createSessionToken("u-nobody", SECRET), SECRET), null);
  assert.equal(await verifySessionToken(payload, SECRET), null); // no signature
});

test("the passcode must match exactly", async () => {
  assert.equal(await passcodeMatches("blue harbour", "blue harbour"), true);
  assert.equal(await passcodeMatches("blue harbou", "blue harbour"), false);
  assert.equal(await passcodeMatches("", "blue harbour"), false);
});

test("each role may do only its own actions", () => {
  assert.equal(can("submitter", "submit_profile"), true);
  assert.equal(can("submitter", "decide_appsec_stage"), false);
  assert.equal(can("appsec_reviewer", "decide_appsec_stage"), true);
  assert.equal(can("appsec_reviewer", "decide_model_risk_stage"), false);
  assert.equal(can("model_risk_reviewer", "decide_model_risk_stage"), true);
  assert.equal(can("auditor", "view_all_reviews"), true);
  assert.equal(can("auditor", "submit_profile"), false);
  assert.equal(can("auditor", "decide_appsec_stage"), false);
});
