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
- [ ] Step 7: next (The rules that set a floor)
