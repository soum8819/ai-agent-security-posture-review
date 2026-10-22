# Rules versus answer key: run log

Each run of `npm run compare-rules`, kept for the record. Rules are tuned on
the 8 tuning profiles only. Held-out profiles (04, 06, 08, 11) are reported,
never tuned against.

## Run 1 (2026-10-21): first version of the rules

Tuning: 6 of 8 match. Held out: 3 of 4 match.

```
TUNING
profile-01 | 4 | R1 critical, R3 high, R5 high | 4             | match
profile-02 | 1 | none                          | 1             | match
profile-03 | 1 | R4 high                       | 1             | match
profile-05 | 3 | R4 high                       | 3             | match
profile-07 | 4 | none                          | 3             | MISMATCH
profile-09 | 4 | R3 high, R4 high, R6 high     | 4 (3 or 4 ok) | match
profile-10 | 4 | R3 high                       | 3             | MISMATCH
profile-12 | 2 | R4 high                       | 2 (2 or 3 ok) | match

HELD OUT
profile-04 | 4 | R1 critical, R3 high          | 3             | MISMATCH
profile-06 | 1 | none                          | 1             | match
profile-08 | 4 | R2 critical, R3 high, R5 high | 4             | match
profile-11 | 3 | R3 high                       | 3             | match
```

## Change between runs

Decided by the project owner from tuning profile 07 only: the Tier 4 test
changed from "moves money" to "moves money with no person confirming"
(documented assumption, to be confirmed with the customer; see CLAUDE.md).
No label, profile or other rule changed. Nothing was changed because of a
held-out result. Profile-10 stays labelled 3 and is recorded as an expected
rules miss (see eval/labels/README.md).

## Run 2 (2026-10-21): after the Tier 4 money change

The held-out block below was re-run after a rule change that was decided from
a tuning profile. Its numbers did not change.

Tuning: 7 of 8 match. Held out: 3 of 4 match.

```


TUNING (rules may be adjusted against these): 7 of 8 match
Profile    | Rule tier | Rule hits                     | Expected tier | Result  
-----------|-----------|-------------------------------|---------------|---------
profile-01 | 4         | R1 critical, R3 high, R5 high | 4             | match   
profile-02 | 1         | none                          | 1             | match   
profile-03 | 1         | R4 high                       | 1             | match   
profile-05 | 3         | R4 high                       | 3             | match   
profile-07 | 3         | none                          | 3             | match   
profile-09 | 4         | R3 high, R4 high, R6 high     | 4 (3 or 4 ok) | match   
profile-10 | 2         | R3 high                       | 3             | MISMATCH
profile-12 | 2         | R4 high                       | 2 (2 or 3 ok) | match   

HELD OUT (report only, never tune against these): 3 of 4 match
Profile    | Rule tier | Rule hits                     | Expected tier | Result  
-----------|-----------|-------------------------------|---------------|---------
profile-04 | 4         | R1 critical, R3 high          | 3             | MISMATCH
profile-06 | 1         | none                          | 1             | match   
profile-08 | 4         | R2 critical, R3 high, R5 high | 4             | match   
profile-11 | 3         | R3 high                       | 3             | match   
```
