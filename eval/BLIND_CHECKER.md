# Experiment: does the checker anchor on the reviewer? (blind-first checker)

Status: plan written and committed before any run (commit 491f298); runs done. Results are added below the
plan by `scripts/experiment-blind-checker.ts report`, between the RESULTS
markers.

## Why
In step 13 the checker (google/gemini-2.5-flash) agreed with 45 of 45 reviewer
findings and produced no contested findings. It sees the reviewer's findings
before forming a view, so it may simply be following them (anchoring). This
experiment tests that by giving the same model a review to do without the
reviewer's findings.

## The two arms (same profile, same reviewer answer, in the same run)
- **Current design.** The production pipeline, unchanged: rules, reviewer
  (openai/gpt-5-mini, prompt v4), checker (prompt c3) that sees the profile
  and the reviewer's findings.
- **Blind-first.** An extra call to the same checker model with the same
  settings (temperature 0.2, reasoning low, providers vertex only, prompt
  training disallowed). It sees the profile and the rules output (the rule
  tier, the tier reasons and the rule hits), never the reviewer's findings,
  and gives its own findings and tier. Its prompt lives only in the
  experiment script (version b1). It reuses the shared instruction pieces the
  production prompts use, word for word, and the two checker-only sentences
  added in c2 and c3, so the arms differ in what they see, not in their rules.
  The same evidence check (quote must appear exactly in the profile) is
  applied to its findings.

Nothing in the production pipeline or any production prompt changes.

## One confound, stated in advance
The blind arm sees the rules output and the current checker does not (by the
step 9 design). So the blind arm differs in two ways: it does not see the
reviewer's findings, and it does see the rule hits. If the blind arm agrees
closely with the rules, that may be anchoring on the rules instead.

## Runs
All 12 profiles once, then profiles 01, 03 and 10 (tuning) twice more. Each
run makes three model calls per profile: reviewer, current checker, blind
checker. Cost cap $1 for the experiment: the script stops before a profile if
the spend so far plus a safe estimate would pass it.

## Measures (defined before running; tuning and held-out reported separately)
Categories are OWASP ASI ids. R = categories of the reviewer's kept findings.
C = the current checker's view: categories of reviewer findings it agreed
with, plus its missed findings. B = categories of the blind checker's kept
findings.

| Measure | Current design | Blind-first |
|---|---|---|
| Overlap with the reviewer | shared categories of C and R over all categories in either, summed over profiles | the same for B and R |
| Disagreements | reviewer findings with verdict disagree (needs more information counted separately) | reviewer findings whose category is not in B |
| Contested | the pipeline's contested findings (disagree on a high or critical finding) | reviewer findings rated high or critical (after the rule floor) whose category is not in B |
| Risks only the checker raised | its missed findings | blind findings whose category is not in R |
| Checker tier in the key's accepted range | the current checker's tier | the blind checker's tier |
| Final tier in range | the pipeline's final tier | the highest of rule, reviewer and blind tiers |
| Key's critical risks found by the checker alone | critical categories in C | critical categories in B |
| Cost and time | the checker call's Gateway cost and seconds | the blind call's Gateway cost and seconds |

How to read it, decided now: if the blind checker's overlap with the reviewer
is about as high as the current checker's, and it "disagrees" about as rarely,
that does not support anchoring. If the overlap is clearly lower and the
disagreements clearly higher, that supports it, with the caveat that some of
the gap is ordinary run-to-run variation (step 13 measured 3 to 5 shared
categories of 5 to 7 between runs of the same pipeline), which the repeat runs
help to size.

<!-- RESULTS START (written by scripts/experiment-blind-checker.ts report; do not edit by hand) -->
## Results (main run blind-b1-main)

### Tuning set (8 profiles: 01, 02, 03, 05, 07, 09, 10, 12)

| Measure | Current design (checker sees reviewer findings) | Blind-first (checker sees profile and rules only) |
|---|---|---|
| Overlap with the reviewer's categories | 30 of 40 (75%) | 13 of 37 (35%) |
| Disagreements with the 30 reviewer findings | 0 disagree, 0 need more information | 17 not raised by the blind checker |
| Contested (high or critical reviewer finding the checker does not support) | 0 | 7 |
| Risks only the checker raised | 17 | 8 |
| Checker tier in the key's range | 8 of 8 | 8 of 8 |
| Final tier in the key's range | 7 of 8 (1 above, 0 below) | 7 of 8 (1 above, 0 below) |
| Key's critical risks found by the checker alone | 7 of 9 (78%) | 7 of 9 (78%) |
| Checker cost per review | $0.0044 | $0.0042 |
| Checker seconds per review | 8.4 | 9.0 |

| Profile | Key tier | Rule / reviewer tier | Current: checker / **final** | Blind: checker / **final** | Reviewer categories (R) | Current checker view (C) | Blind checker (B) | Disagreements current / blind | Contested current / blind |
|---|---|---|---|---|---|---|---|---|---|
| 01 | 4 | 4 / 4 | 4 / **4** | 4 / **4** | ASI01, ASI02, ASI03, ASI04, ASI06, ASI10 | ASI01, ASI02, ASI03, ASI04, ASI06, ASI08, ASI10 | ASI01, ASI02, ASI03, ASI06, ASI08 | 0 / 2 | 0 / 1 |
| 02 | 1 | 1 / 1 | 1 / **1** | 1 / **1** | ASI01, ASI06, ASI09 | ASI01, ASI06, ASI09 | ASI01, ASI04, ASI06 | 0 / 1 | 0 / 0 |
| 03 | 1 | 1 / 3 | 1 / **3** | 1 / **3** | ASI02, ASI03, ASI04, ASI08, ASI10 | ASI02, ASI03, ASI04, ASI06, ASI08, ASI09, ASI10 | ASI01, ASI03, ASI08 | 0 / 3 | 0 / 0 |
| 05 | 3 | 3 / 3 | 3 / **3** | 3 / **3** | ASI01, ASI02, ASI03 | ASI01, ASI02, ASI03, ASI08 | ASI02, ASI03, ASI08 | 0 / 1 | 0 / 0 |
| 07 | 3 | 3 / 3 | 3 / **3** | 3 / **3** | ASI02, ASI03, ASI09 | ASI02, ASI03, ASI06, ASI09 |  | 0 / 3 | 0 / 2 |
| 09 | 3 or 4 | 4 / 4 | 4 / **4** | 4 / **4** | ASI03, ASI10 | ASI01, ASI03, ASI06, ASI10 | ASI01, ASI02, ASI03, ASI08 | 0 / 1 | 0 / 1 |
| 10 | 3 or 4 | 2 / 4 | 4 / **4** | 3 / **4** | ASI01, ASI02, ASI06, ASI09 | ASI01, ASI02, ASI03, ASI06, ASI08, ASI09 |  | 0 / 4 | 0 / 2 |
| 12 | 2 or 3 | 2 / 2 | 2 / **2** | 2 / **2** | ASI02, ASI03, ASI06, ASI08 | ASI02, ASI03, ASI04, ASI06, ASI08 | ASI03, ASI08 | 0 / 2 | 0 / 1 |

### Held-out set (4 profiles: 04, 06, 08, 11)

| Measure | Current design (checker sees reviewer findings) | Blind-first (checker sees profile and rules only) |
|---|---|---|
| Overlap with the reviewer's categories | 15 of 19 (79%) | 8 of 18 (44%) |
| Disagreements with the 16 reviewer findings | 1 disagree, 0 need more information | 8 not raised by the blind checker |
| Contested (high or critical reviewer finding the checker does not support) | 0 | 2 |
| Risks only the checker raised | 4 | 2 |
| Checker tier in the key's range | 3 of 4 | 3 of 4 |
| Final tier in the key's range | 3 of 4 (1 above, 0 below) | 3 of 4 (1 above, 0 below) |
| Key's critical risks found by the checker alone | 5 of 6 (83%) | 5 of 6 (83%) |
| Checker cost per review | $0.0045 | $0.0042 |
| Checker seconds per review | 7.4 | 8.8 |

| Profile | Key tier | Rule / reviewer tier | Current: checker / **final** | Blind: checker / **final** | Reviewer categories (R) | Current checker view (C) | Blind checker (B) | Disagreements current / blind | Contested current / blind |
|---|---|---|---|---|---|---|---|---|---|
| 04 | 3 | 4 / 3 | 4 / **4** | 4 / **4** | ASI01, ASI03, ASI09 | ASI01, ASI03 | ASI01, ASI02, ASI03, ASI09 | 1 / 0 | 0 / 0 |
| 06 | 1 | 1 / 1 | 1 / **1** | 1 / **1** | ASI04, ASI06, ASI09 | ASI04, ASI06, ASI08, ASI09 |  | 0 / 3 | 0 / 0 |
| 08 | 4 | 4 / 4 | 4 / **4** | 4 / **4** | ASI01, ASI02, ASI03, ASI05, ASI06, ASI07, ASI09 | ASI01, ASI02, ASI03, ASI05, ASI06, ASI07, ASI08, ASI09 | ASI01, ASI02, ASI03, ASI05, ASI06, ASI08 | 0 / 2 | 0 / 1 |
| 11 | 3 | 3 / 3 | 3 / **3** | 3 / **3** | ASI01, ASI02, ASI04 | ASI01, ASI02, ASI03, ASI04 |  | 0 / 3 | 0 / 1 |

### Extra view, added after the main run (not in the plan)

The blind checker's evidence quotes often failed the exact-match check (it
wrote field excerpts in a loose form, for example without the quote marks
around field names), so the planned figures above count only its findings
that passed. This view also counts the dropped ones, to separate "the blind
checker saw the risk" from "the blind checker quoted it exactly".

#### Tuning set (8 profiles)

| Measure | Current design | Blind-first, counting findings whose quote failed the check |
|---|---|---|
| Checker findings whose evidence quote failed the exact-match check | 0 of 17 (0%) of its missed findings | 9 of 33 (27%) of its findings |
| Overlap with the reviewer's categories | 30 of 40 (75%) | 18 of 39 (46%) |
| Disagreements with the 30 reviewer findings | 0 | 12 |
| Contested | 0 | 3 |

#### Held-out set (4 profiles)

| Measure | Current design | Blind-first, counting findings whose quote failed the check |
|---|---|---|
| Checker findings whose evidence quote failed the exact-match check | 5 of 9 (56%) of its missed findings | 5 of 16 (31%) of its findings |
| Overlap with the reviewer's categories | 15 of 19 (79%) | 10 of 20 (50%) |
| Disagreements with the 16 reviewer findings | 1 | 6 |
| Contested | 0 | 2 |

### Repeat runs (tuning profiles 01, 03, 10)

| Profile | Run | Current checker tier | Blind tier | Current overlap with reviewer | Blind overlap with reviewer | Blind categories shared with blind run 1 |
|---|---|---|---|---|---|---|
| 01 | 1 | 4 | 4 | 6 of 7 | 4 of 7 |  |
| 01 | 2 | 4 | 4 | 5 of 6 | 2 of 7 | 3 of 6 |
| 01 | 3 | 4 | 4 | 4 of 4 | 2 of 5 | 2 of 6 |
| 03 | 1 | 1 | 1 | 5 of 7 | 2 of 6 |  |
| 03 | 2 | 1 | 1 | 4 of 6 | 4 of 5 | 3 of 4 |
| 03 | 3 | 1 | 1 | 4 of 5 | 2 of 5 | 3 of 3 |
| 10 | 1 | 4 | 3 | 4 of 6 | 0 of 4 |  |
| 10 | 2 | 3 | 3 | 4 of 5 | 2 of 6 | 0 of 4 |
| 10 | 3 | 4 | 4 | 5 of 6 | 1 of 6 | 0 of 2 |

Experiment spend: $0.2226 for 18 profile runs (three model calls each), from AI Gateway generation records.
<!-- RESULTS END -->

## What it means, in plain words

Read with the usual caveat: 12 profiles and 18 runs are indications, not
proof.

1. **The checker's agreement says little on its own.** When it sees the
   reviewer's list, the checker agrees with nearly all of it (0 disagreements
   of 30 on the tuning set, 1 of 16 held-out). Asked the same question
   without the list, the same model raises a clearly different set: about a
   third to a half of the categories overlap, against three quarters for the
   current design. That fits the anchoring worry: the current "agree"
   verdicts should not be read as an independent second opinion.
2. **But most of the gap is noise, not disagreement.** The blind checker also
   differs from itself between runs (on profile-10 its three runs shared 0
   categories with its first run). A category the blind checker did not
   raise is usually a risk it did not list this time, not one it argued
   against. So the blind arm's "disagreements" and "contested" counts are
   omissions, not reasoned objections, and are not comparable with a
   "disagree" verdict. Switching designs would mostly add noise to the
   contested list, not insight.
3. **Tiers did not change.** The checker's tier, and the final tier, matched
   the key equally often in both arms, on both sets (tuning 7 of 8 final in
   range, held-out 3 of 4, the same profiles in each). For the decision that
   routes a review, seeing the reviewer's findings made no difference here.
4. **The blind checker quotes less exactly.** 27 to 31% of its evidence
   quotes failed the exact-match check, because it wrote field excerpts in a
   loose form. The current checker's own missed findings failed 0 of 17 on
   the tuning set, but 5 of 9 on the held-out set, so this is not unique to
   the blind arm. The prompt was not changed to fix it, to avoid tuning the
   experiment.
5. **Cost and time are about the same:** about $0.004 per checker call in
   both arms; the blind call took about 1 second longer.
6. **Confound:** the blind arm saw the rules output and the current checker
   does not. The blind checker's tier matched the rule tier on 11 of 12
   profiles, but so did the current checker's, which never sees the rules,
   so there is no sign here that seeing the rules changed its tier.

**Bottom line.** The experiment supports the worry that the current checker
anchors on the reviewer, so its agreement should not be shown or sold as
independent confirmation. It does not show that a blind-first checker would
be better: tiers were unchanged and its extra "disagreements" are mostly
run-to-run noise. No production change is made. A fairer next test would
give each model several runs and count only risks raised consistently.
