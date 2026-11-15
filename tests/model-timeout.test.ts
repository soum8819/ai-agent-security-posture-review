// Proves a model call that never answers is cut off by the time limit, for
// both the reviewer and the checker, and fails with an error the workflow's
// failure handling can record. Calls no model: model names resolve to a
// stand-in that waits until the call is aborted. Run: npm test
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { MockLanguageModelV4, MockProviderV4 } from "ai/test";
import { MODEL_CALL_TIMEOUT_MS, REVIEW_SETTINGS, analyzeProfile } from "../lib/analyze.ts";
import { CHECK_SETTINGS, crosscheckReview } from "../lib/crosscheck.ts";
import type { AgentProfile } from "../lib/profile-schema.ts";

const profile: AgentProfile = {
  id: "test-timeout",
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
  description: "It searches the team's internal documents and answers employee questions.",
};

// Never answers; gives up only when the call's abort signal fires.
const hanging = new MockLanguageModelV4({
  doGenerate: ({ abortSignal }) =>
    new Promise((_, reject) => {
      abortSignal?.addEventListener("abort", () => reject(abortSignal.reason), { once: true });
    }),
});

type Settings = { timeoutMs: number };
const g = globalThis as { AI_SDK_DEFAULT_PROVIDER?: unknown };
const short = 50;

before(() => {
  g.AI_SDK_DEFAULT_PROVIDER = new MockProviderV4({
    languageModels: { [REVIEW_SETTINGS.model]: hanging, [CHECK_SETTINGS.model]: hanging },
  });
  (REVIEW_SETTINGS as unknown as Settings).timeoutMs = short;
  (CHECK_SETTINGS as unknown as Settings).timeoutMs = short;
});

after(() => {
  delete g.AI_SDK_DEFAULT_PROVIDER;
  (REVIEW_SETTINGS as unknown as Settings).timeoutMs = MODEL_CALL_TIMEOUT_MS;
  (CHECK_SETTINGS as unknown as Settings).timeoutMs = MODEL_CALL_TIMEOUT_MS;
});

// What the workflow's catch hands to failStep (workflows/review/index.ts).
const failMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function timesOut(call: () => Promise<unknown>) {
  const started = Date.now();
  const error = await call().then(
    () => assert.fail("the call should have timed out"),
    (e: unknown) => e,
  );
  const elapsed = Date.now() - started;
  assert.equal((error as Error).name, "TimeoutError");
  assert.ok(error instanceof Error, "the workflow records only Error messages in full");
  assert.match(failMessage(error), /time/i);
  assert.ok(elapsed < 2000, `cut off after ${elapsed} ms`);
}

test("both model calls use a 180 second time limit", () => {
  assert.equal(MODEL_CALL_TIMEOUT_MS, 180_000);
  assert.equal(REVIEW_SETTINGS.timeoutMs, short); // lowered for this file only
  assert.equal(CHECK_SETTINGS.timeoutMs, short);
});

test("a reviewer call that never answers is cut off with a TimeoutError", async () => {
  await timesOut(() => analyzeProfile(profile));
});

test("a checker call that never answers is cut off with a TimeoutError", async () => {
  await timesOut(() => crosscheckReview(profile, []));
});
