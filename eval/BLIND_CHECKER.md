# Experiment: does the checker anchor on the reviewer? (blind-first checker)

Status: plan written and committed before any run. Results are added below the
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
