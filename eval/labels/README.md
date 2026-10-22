# Answer key

One file per profile in `eval/profiles/`, holding the answers a good review
is expected to reach.

## Where it came from

- Drafted by ChatGPT from the profiles.
- Reviewed and edited by Sam on 2026-10-21.
- Sam assigned the tiers for profiles 04, 09, 10 and 12, and the two
  acceptable tier ranges (profile-09: 3 or 4; profile-12: 2 or 3).

## Rule used

Judge by what the profile lists, not by what it claims.

## Held-out profiles

Profiles 04, 06, 08 and 11 are held out (`"heldOut": true`). They were drawn
at random with seed 20261021: one from tier 1, one from tier 4 and two from
tier 3. Nothing in the rules, prompts or models may be tuned against them;
they are used only for the final evaluation.

## Fields

- `expectedTier`: the tier the answer key assigns (1 to 4).
- `acceptableTiers`: optional; other tiers that also count as correct.
- `expectedCriticalFindings`: each critical risk a good review must catch,
  as an OWASP ASI category and the reason in the key's own words. An empty
  list means none critical.
- `notes`: optional; the rest of the key's text for that profile, kept word
  for word.
- `heldOut`: true if kept back for the final evaluation.

These files must never be sent to the rules or the models.
