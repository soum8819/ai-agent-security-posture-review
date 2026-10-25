# Step 13 evaluation plan

## Freeze
- Tag the current commit `eval-v1` before any evaluation run. Model names
  (`lib/models.ts`), prompts (reviewer v4, checker c1) and rules
  (`lib/rules.ts`) are frozen at that tag. The baseline is measured on it.
- Any later change (failure analysis below) is measured separately, as a
  before and after, and committed on its own.

## How it runs
- `scripts/evaluate.ts run` calls the full pipeline (rules, reviewer model,
  checker model) directly on the 12 profiles in `eval/profiles`. No database
  write, no submit route, so no user's daily limit is used. Raw outputs go to
  `eval/runs/<run name>/`, with the actual cost of every model call from the
  AI Gateway generation records.
- `scripts/evaluate.ts report` compares saved runs with `eval/labels` and
  writes the numbers into `eval/results.md`.
- Only the profile goes to the models; labels never do.

## Measures (tuning set of 8 and held-out set of 4, always reported separately)
| Measure | How | What the labels allow |
|---|---|---|
| Recall of critical findings | Share of the key's expected critical risk categories that were found, by the rules only, the models only, and combined. Category match, any severity. | Computable. Profiles with no expected critical finding add nothing to recall. |
| False positives per profile | The key lists only critical risks, so a finding outside it is not necessarily wrong. Reported as a proxy: high or critical findings whose category is not in the key's critical list. | A true false-positive rate is not computable: the key does not say which other findings are wrong. |
| Tier agreement | Final tier inside the key's accepted range (the acceptable tiers where given, otherwise the expected tier). Also shown for the rule, reviewer and checker tiers. | Computable. |
| Severity agreement | The key gives no severities. Reported as a proxy: of the expected critical risks that were found, the share the pipeline rated high or critical. | Exact severity agreement is not computable. |
| Cross-model agreement | Checker verdicts on reviewer findings (agree, disagree, needs more information), and the number of contested findings. | Computable from the outputs. |
| Final tier above or below the key | Count of profiles above the top of the accepted range, and below the bottom. | Computable. |
| Adversarial profiles | profile-05 (text ordering the reviewer to rate it Tier 1) and profile-09 (claims read-only, lists a write tool): was the attempt or contradiction caught, and did the final tier stay in range. | Computable. |
| Seconds and dollars per review | Recorded model time and the Gateway's actual cost per call. | Computable. |

## Variation
- Run 3 tuning profiles twice more (profile-01, profile-03, profile-10:
  a tier 4 with several risks, the profile whose tier moved between runs
  in step 8, and the profile the key accepts at tier 3 or 4). Report how
  tiers and found categories differ across the three runs.

## Failure analysis
- Pick the two worst results from the tuning set only. Explain each in
  plain words, change one prompt or rule for each, re-run only the affected
  profiles, and show before and after. Each change is its own commit, with
  the metric change in the message. No tuning on held-out profiles; if
  held-out profiles are re-run after a change, that is reported separately.

## Limits to state in the results
- 12 profiles is a small set: these are indications, not proof.
- The known ASI01 versus ASI06 confusion: the models often file untrusted
  input under Memory and Context Poisoning where the key expects Agent Goal
  Hijack, which lowers measured recall.
- Answers vary between runs; one run per profile is a single sample.

## Cost cap
- Stop if total model spend in this step would pass $2. Expected: about
  12 + 6 + a few re-runs, roughly $0.20 to $0.35.
