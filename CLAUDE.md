@AGENTS.md

# AI Agent Security Posture Review Workflow

Project memory for Claude Code. Read this first in every session.

The project owner is not a coder: explain plainly before changing anything,
and ask before installing any package.

# Harborline Financial Group: customer card
(Fictional composite company. Not a real customer. All numbers are placeholders.)

## Who they are
Global bank and insurer, about 60,000 employees in 40 countries. They plan to
launch about 40 internal AI agents this year (claims triage, KYC document
review, payments operations, HR and IT helpers) and expect to head toward 300.
Every agent needs a security review before launch. A small AppSec team does
these by hand, and a review takes about 15 business days.

## Who is in the room
| Role | Cares about | The test they will put to us |
|---|---|---|
| CISO | No unreviewed agent in production, audit evidence | How do I know the AI reviewer is not being fooled? |
| Head of AI Platform | Speed, launches stuck for weeks | Does this really cut days? |
| Model Risk Officer | Governance, human sign-off | Who is accountable for each decision? |
| AppSec lead | Capacity, trust in findings | Will I drown in false alarms? |
| Platform engineering | One governed path to models, spend capped | Can I see and cap what this costs? |
| Finance | Cost against value | What does a review cost, and when does it pay back? |

## Four risk tiers (assigned by rules)
1. Read-only, internal documents (HR policy bot): rules + two models, one approver
2. Drafts changes a person confirms (IT helper): one approver (AppSec)
3. Handles customer financial data (KYC, claims): two approvers in order
   (AppSec, then Model Risk), second must be a different person
4. Moves money or acts autonomously at scale: not approved by this flow,
   routed to a review committee with an evidence pack

## Where things live
- On Vercel: the web app, the durable review workflow, model calls via AI Gateway
- In Harborline's AWS: agent registry, corporate sign-in, audit log and SIEM,
  ticketing (stay where they are)
- Production path to their private network: Vercel Secure Compute (described, not built)

## Five success lines
1. No agent launches without a recorded human decision.
2. Review time falls from about 15 business days to [TBD from step 13].
3. Every decision has an audit trail the Auditor can export.
4. Model spend is visible per review and capped.
5. Reviewers see the evidence quote beside every finding, and the tool flags
   where the two models disagree.

# Routing plan
- `/` : overview site (public explainer for the workflow)
- `/app` : reviewer app (placeholder for now)
- `/app/submit` : submit an agent for review (later)
- `/app/reviews` : list and detail of reviews (later)

In code, the overview lives in `app/page.tsx` and everything under the
reviewer app lives in the `app/app/` folder.

# Open decisions and known gaps
- Approver identity is self-declared in the step 5 spike (`approver` is just a
  name in the request). In the role steps it must come from the signed-in user,
  and a submitter must be blocked from approving their own review.
- At the end of step 6, draft docs/CODE_TOUR.md: one plain sentence per file
  saying what it does and why, written for a non-coder, reused later in step 15.
- The answer key (eval/labels/, filled in by the project owner, with 4 profiles
  marked held out) is committed separately, in its own commit, before step 7
  starts. Nothing may be tuned against the held-out profiles.
- Assumption to confirm with the customer (decided in step 7): the card's Tier
  4 wording "Moves money" is ambiguous. The project owner's reading is that an
  agent which moves money only after a person confirms is not Tier 4 by
  itself; Tier 4 means moving money with no person confirming, or acting on
  its own with write or run-code power. Implemented in lib/rules.ts
  (assignTier).
- Step 9: the final tier is the higher of the rule tier and the models'
  proposed tier (models can raise it, never lower it). Needed for profile-10,
  where the rules give tier 2 but the answer key says 3.
- Step 10 decisions (merged with step 11a): review state lives in Neon
  Postgres (Vercel Marketplace, free plan), which will also hold the
  append-only audit events in step 11b. Sign-in is a stand-in: four fictional
  users, a shared demo passcode (DEMO_PASSCODE) and a signed session cookie
  (SESSION_SECRET); production would use OIDC or SAML. At most 10 submissions
  per user per day, counted over a rolling 24 hours (built in slice B). "Request changes"
  ends the review; the submitter resubmits as a new review linked to the old
  one. Built in slices: A sign-in and roles, B submit to stored review,
  C screens, D approvals.
- Slice B changes (decided in step 10): the sign-in attempt limit moves to
  step 12; slice B keeps only the daily submission limit. DATABASE_URL is a
  Sensitive variable on Vercel and is never pulled or printed; the project
  owner copies the pooled connection string from the Neon console into
  .env.local. Local runs and Vercel share one database, so every row records
  its environment.
- Slice D design (decided in step 10): an approval is recorded from the
  database, not from the paused workflow run. The approval route checks the
  user, role, tier and stage against the review's database row, writes the
  decision there first (one per review and stage), then tries to resume the
  workflow. If the run has expired (the Hobby plan keeps run data for 1 day),
  the decision still stands and the review's status is set from the database.
  The decision records whether the run was resumed or had expired, and both
  cases go in the audit log.
- Slice D decisions (decided in step 10): four choices, Approve, Approve with
  conditions (a required Conditions box, final status approved with
  conditions), Reject (final status rejected) and Request changes (ends the
  review; the submitter resubmits once, as a new linked review). Notes are
  required for every choice. Each approving stage records its own resolution
  of every contested finding (accept, or dismiss with a reason). One check,
  lib/authz.ts, decides who may decide; the review page uses the same check to
  decide whether to show the decision form. Decision requests must come from
  this site (Origin check).
- Assumption to confirm with the customer (decided in step 10): the card says
  Tier 1 needs "one approver" but does not name the role. The project owner's
  reading is that the Tier 1 approver is AppSec, the same as Tier 2.
- Evidence quotes (decided in step 10, see docs/DECISION_LOG.md): quotes are
  verbatim from the profile and many are field excerpts in its JSON form, such
  as "memory": "session". This is deliberate so a reviewer can verify them;
  they are never rewritten. No raw JSON on screen or in the evidence pack
  except verbatim quotes, which are shown in monospace with the field they come
  from. The slice C "no raw JSON" check was too narrow and has been tightened.
- Step 13 (optional idea): prompt quoting style, asking the models to quote
  sentences and values rather than JSON field excerpts.
- Step 13: test a blind-first checker against the current one on the same 12
  profiles and report both. Show all three tiers on the approver screen in
  step 10.

# Build guide: 17 steps
1. Freeze the scenario
2. Accounts and access
3. Hello deploy
4. One model call through AI Gateway
5. A workflow that waits for a person
6. The agent profile and 12 test cases
7. The rules that set a floor
8. The first model reviews each profile
9. A second model checks the first
10. The human approval gate and reviewer screens (10b: UX and design polish)
11. Enterprise controls
12. Securing the reviewer (12b: optional front door for sensitive routes)
13. The evaluation
14. Cost, speed and what the platform shows
15. README, decision log and code tour (15b: my feedback for Vercel)
16. The deck and PDF (16b: the one-page site)
17. Dry runs and submission
    - Checks must test both `/` and `/app` in a private browser window.

Running notes on each Vercel product used go in `docs/builder-feedback.md`
(feeds step 15b).

# Progress
Updated by the project owner after each step.

- [x] Step 1: done
- [x] Step 2: done
- [x] Step 3: done (live at ai-agent-security-posture-review.vercel.app)
- [x] Step 4: done
- [x] Step 5: done
- [x] Step 6: done
- [x] Step 7: done
- [ ] Step 8: built, my read-through of the results pending
- [ ] Step 9: built; finish line partly met: 1 of 12 contested, reported as is
- [x] Step 10: done, with step 11a (live check passed: review 080fc26e resumed across deployments and completed)
- [ ] Step 11: in progress (11b audit page and 11d data handling built; 11c skipped, registry described in the README)
- [ ] Step 12: next (attack tests, sign-in attempt limit, input limits, key scan)
