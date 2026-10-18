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

# Build guide: 17 steps
<!-- TODO: paste the step titles from the build guide -->
1. [to fill in]
2. [to fill in]
3. [to fill in]
4. [to fill in]
5. [to fill in]
6. [to fill in]
7. [to fill in]
8. [to fill in]
9. [to fill in]
10. [to fill in]
11. [to fill in]
12. [to fill in]
13. [to fill in]
14. [to fill in]
15. [to fill in]
16. [to fill in]
17. [to fill in]

# Progress
Updated by the project owner after each step.

- [x] Project setup: Next.js app created (TypeScript, App Router, Tailwind), home page at `/`, placeholder at `/app`, CLAUDE.md added, first local commit. Not pushed yet.
