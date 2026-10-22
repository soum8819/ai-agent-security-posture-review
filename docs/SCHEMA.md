# The two forms the review tool uses, in plain words

A "schema" is a strict description of what a form must contain. The tool
uses two: the agent profile (what a team tells us about its agent) and the
review result (what the review says back). Both are written in code in
`lib/profile-schema.ts` and `lib/review-schema.ts`, and the tool refuses
anything that does not match them.

## 1. The agent profile

This is what a team fills in on the `/app/submit` page.

| Field | What it means | Allowed answers |
|---|---|---|
| Profile id | A short label for this profile | 3 to 40 lowercase letters, digits or dashes |
| Agent name | What the agent is called | Any text |
| Owner | The team accountable for it | Any text |
| Business purpose | Why the bank wants it | Any text, up to 500 characters |
| Data it reads | What kinds of information it can see | One or more of: public, internal, confidential, customer financial, personal |
| Tools and permissions | Each system it can use, and what it may do there | For each tool, one or more of: read, write, run code, send messages, move money |
| Does a person confirm its actions? | Whether a human must say yes before it acts | Yes or no |
| Untrusted inputs | Content it reads that someone outside its control could have written, which could contain tricks | Any of: email, web, uploaded files, chat, logs or alerts. None ticked means none |
| Credentials | How it logs in to other systems | Its own scoped token (only what it needs), or a shared token |
| Model and provider | Which AI model it runs on, and who supplies it | Two short texts |
| Memory | What it remembers | None, session only (forgets after each conversation), or persistent (remembers over time) |
| Logging | Whether its actions are recorded, and where | Yes or no, plus where the logs go |
| Kill switch | Whether it can be stopped quickly, and how | Yes or no, plus how |
| Description | The team's own words about what it does | Any text, up to 4,000 characters |

The tool rejects a profile that leaves out a field, adds a field that is not
on this list, uses an answer that is not allowed, or picks the same choice
twice.

The description is written by the submitting team, so the reviewer must
treat it as a claim to check, not as instructions to follow.

## 2. The review result

This is what a finished review looks like. The rules (step 7) and the two
models (steps 8 and 9) fill it in.

| Field | What it means |
|---|---|
| Profile id | Which profile was reviewed |
| Tier | Risk tier 1 to 4, as on the customer card |
| Rule hits | Each fixed rule the profile triggered, with a short summary |
| Findings | The list of problems found (see below) |
| Missed findings | Risks only the second model found, with the same five parts as a finding, after the same evidence check |
| Recommendation | Approve, approve with conditions, reject, or send to the review committee |

### Each finding has five parts

| Part | What it means |
|---|---|
| Risk category | One of the ten OWASP agentic risks, ASI01 to ASI10 (list below) |
| Severity | Low, medium, high or critical |
| Evidence quote | The exact words from the profile that show the problem, so a reviewer can check it |
| Why it matters | What could go wrong, in plain words |
| Recommended control | What the team should change to fix or reduce it |

After the second model checks it, each finding also has:

| Part | What it means |
|---|---|
| Second-model verdict | Agree, disagree, or needs more information (or no verdict, if the second model skipped it) |
| Second-model reason | One sentence explaining the verdict |
| Contested | Yes when the second model disagrees and the finding is high or critical. The approver must resolve it. A rule's minimum severity stays even when contested |

### The ten risk categories

From the official OWASP Top 10 for Agentic Applications for 2026.

| ID | Name |
|---|---|
| ASI01 | Agent Goal Hijack |
| ASI02 | Tool Misuse and Exploitation |
| ASI03 | Identity and Privilege Abuse |
| ASI04 | Agentic Supply Chain Vulnerabilities |
| ASI05 | Unexpected Code Execution (RCE) |
| ASI06 | Memory & Context Poisoning |
| ASI07 | Insecure Inter-Agent Communication |
| ASI08 | Cascading Failures |
| ASI09 | Human-Agent Trust Exploitation |
| ASI10 | Rogue Agents |

## 3. The label files (the answer key)

Each file in `eval/labels/` matches one profile and holds the answers the
project owner expects. Where the key came from, and the held-out draw, are
recorded in `eval/labels/README.md`. The rules for these files are written in
code in `lib/label-schema.ts`.

| Field | What it means | Allowed values |
|---|---|---|
| expectedTier | The tier the answer key assigns | 1, 2, 3 or 4 |
| acceptableTiers | Optional. Other tiers that also count as correct | A list of tiers that includes expectedTier |
| expectedCriticalFindings | The critical risks a good review must catch | A list; each item has an ASI category and a reason. An empty list means none critical |
| notes | Optional. The rest of the answer key's text for that profile, word for word | Any text |
| heldOut | Whether this profile is kept back for the final test, so nothing is tuned against it | true or false; exactly 4 of the 12 are true |
