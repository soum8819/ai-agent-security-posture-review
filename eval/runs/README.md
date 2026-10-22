# Reviewer model runs

Raw results from `npm run reviews`. Each folder is one run, named by its
start time (UTC), with one file per profile and a `summary.json` holding the
prompt version, settings, tokens and the actual cost reported by AI Gateway.

Only the profile is ever sent to the model. The prompt is tuned on the 8
tuning profiles only (01, 02, 03, 05, 07, 09, 10, 12). Held-out profiles
(04, 06, 08, 11) are run, read and reported, never tuned against.

Settings for every run: model openai/gpt-5-mini through AI Gateway, reasoning
effort low, at most 6,000 output tokens, no temperature (the model does not
accept one).

| Run folder | Set | Prompt | Cost | What changed before this run, and why |
|---|---|---|---|---|
| 2026-10-22T03-33-20-407Z | tuning (8) | v1 | $0.0242 | First run. |
| 2026-10-22T03-36-26-823Z | tuning (8) | v2 | $0.0287 | Prompt: evidence must be one continuous passage, no "..." and no joined parts. Reason: in run 1 the model stitched separate parts of profiles 10 and 12 into single quotes, so the evidence check dropped them. |
| 2026-10-22T03-41-31-368Z | tuning (8) | v3 | $0.0285 | Evidence check: ignores one pair of quote marks wrapped around a quote, and spaces next to JSON symbols (the words must still match). Reason: in run 2 real quotes from profiles 03 and 12 were dropped only for layout. Prompt: the tier depends only on data and actions, other weaknesses are findings; "no person confirming" matters only for agents that act; do not report the safer choice of a setting as a weakness. Reason: in run 2 the model raised tiers for profiles 02 and 03 because of non-tier weaknesses, and reported profile-02's own scoped token as a risk. |
| 2026-10-22T03-44-46-024Z | all (12) | v3 | $0.0382 | No change. The single full run for the project owner to read. |
| 2026-10-22T04-01-55-970Z | tuning (8) | v4 | $0.0286 | Prompt: each OWASP category now carries its official description, and the model is told not to use em dashes. Reason: see "Why prompt v4" below. |
| 2026-10-22T04-05-56-336Z | all (12) | v4 | $0.0412 | No change. The new full-run record; the v3 full run above is kept. |

## Why prompt v4

Decided from tuning profiles 01, 03, 09 and 10 only. In the v3 full run the
model never used ASI01 (Agent Goal Hijack) on any of them, although the answer
key expects it on all four for untrusted input; it filed those risks under
ASI06 (Memory & Context Poisoning) instead. The held-out profiles (04, 08, 11)
showed the same pattern but played no part in the decision.

The category descriptions in the v4 prompt are sentences copied word for word
from each category's official "Description" section. OWASP publishes no
one-line descriptions, so the sentences were selected by this project (the
defining sentence of each, with two sentences for ASI06 and ASI09). Source and
retrieval date are recorded in lib/owasp.ts.

The em dash instruction was added because one v3 answer used an em dash. Raw
results are never edited, so that v3 file keeps it.

## What v4 changed (v3 full run against v4 full run)

- Profiles where the model used ASI01: none in v3, four in v4 (02, 03, 06, 07).
  Only 03 is a profile where the answer key expects ASI01, so v4 changed how
  ASI01 is used but did not fix the confusion.
- Expected critical risks caught: tuning 5 of 9 in v3, 6 of 9 in v4; held out
  2 of 6 in v3, 3 of 6 in v4. One run each, so the difference is within
  run-to-run variation.
- Model tier accepted by the answer key: 12 of 12 in v3 (profile-10 counts
  only because acceptableTiers [3, 4] was added after v3), 11 of 12 in v4
  (profile-03 proposed 2, expected 1).
- No em dashes in either v4 run.

Tuning stopped after v4, the change the project owner approved. With the same
prompt, tiers still move between runs (v3: profile-03 was 3 then 1, profile-12
was 2 then 3): run-to-run variation, to be measured in step 13.

## Step 9: second model checks the first

From step 9, runs use both models: the reviewer (openai/gpt-5-mini, prompt v4)
and the checker (google/gemini-2.5-flash through AI Gateway, temperature 0.2,
reasoning effort low, at most 6,000 output tokens). Each profile file stores
both models' IDs, token usage, time taken, Gateway generation ID and actual
cost, the per-finding verdicts, contested findings, missed findings and the
tiers (rule, reviewer, checker, final and which one set the final tier).

Contested means the checker says disagree on a finding that is high or
critical after the rule floor. A rule floor stays when a finding is contested.
Contested findings are an outcome, not a target: the checker prompt is never
tuned to produce disagreement.

| Run folder | Set | Mode | Prompts | Cost | What changed before this run, and why |
|---|---|---|---|---|---|
| 2026-10-22T04-57-36-145Z | tuning (8) | checker only, on reviewer results from 2026-10-22T04-05-56-336Z | v4 / c1 | $0.0361 | First checker run. Result: 31 of 32 findings agreed, 1 disagreed (medium), no skipped verdicts, no unknown finding ids, no dropped quotes. No fault to fix, so c1 was kept unchanged. |
| 2026-10-22T04-59-52-013Z | all (12) | full: both models, fresh | v4 / c1 | $0.0966 | No change. The step 9 record. |

Record run result: one profile contested, profile-04 (held out), finding F2.
The reviewer reported its own scoped token as a high ASI03 risk, against its
own instruction; the checker disagreed for that reason. The checker agreed
with 48 of 49 findings, which is consistent with anchoring: it sees the first
model's findings before forming a view.
