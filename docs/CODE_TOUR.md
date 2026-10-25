# Code tour

One plain sentence per file: what it does and why. Draft written at the end
of step 6, to be updated and reused in step 15.

## Project notes

- `CLAUDE.md`: the project's memory for Claude Code, holding the customer card, the routing plan, the 17 build steps, open decisions and progress.
- `AGENTS.md`: a note written by Next.js telling AI assistants to check its bundled docs, because this version is newer than their training.
- `README.md`: the front page of the GitHub repo, with what the project is, the live links and the two architecture diagrams.
- `docs/SCHEMA.md`: the agent profile and the review result explained in plain words.
- `docs/CODE_TOUR.md`: this file, a one-line guide to every file.
- `docs/DECISION_LOG.md`: decisions about how the review tool behaves and why, starting with keeping evidence quotes verbatim even when they look like JSON.
- `docs/builder-feedback.md`: a running log of what was good or frustrating about each Vercel product, for step 15b.

## Settings

- `package.json`: the list of building blocks the project uses (Next.js, React, the AI SDK, Workflow, Zod) and its shortcut commands like `npm run dev`.
- `package-lock.json`: records the exact version of every building block so every install comes out the same.
- `next.config.ts`: Next.js settings, wrapped with Workflow so durable reviews can run.
- `tsconfig.json`: settings for TypeScript, the layer that catches mistakes before the code runs.
- `eslint.config.mjs`: settings for the code checker that flags common mistakes.
- `.gitignore`: the list of files git must never save or upload, including `.env.local` where the AI Gateway key lives.

## Pages people see

- `app/layout.tsx`: the frame around every page, setting the fonts and the browser tab title.
- `app/globals.css`: site-wide styling, where Tailwind is switched on.
- `app/favicon.ico`: the small icon shown on the browser tab.
- `app/page.tsx`: the overview page at `/`, with the title and one sentence about Harborline.
- `app/app/page.tsx`: the reviewer app home at `/app`, showing who is signed in, what their role may do, and a Reviews link for every role.
- `app/app/sign-in/page.tsx`: the sign-in page at `/app/sign-in`, labelled as a stand-in for Harborline's corporate sign-in, with four fictional users and a demo passcode.
- `app/app/sign-in/actions.ts`: the server code behind signing in and out, which checks the passcode and sets or clears the signed session cookie.
- `app/app/reviews/page.tsx`: the review queue at `/app/reviews`, newest first, with status, final tier and contested count; a table on wide screens and one card per review on a phone. Submitters see only their own reviews.
- `app/app/reviews/[id]/page.tsx`: one review, read-only: who submitted it and when, its status, the four tiers, the rules that fired, the findings (contested first), the findings the evidence check dropped, and the cost when it is stored. Submitters see only their own reviews, and anything else shows not found.
- `app/app/reviews/[id]/evidence/route.ts`: downloads the evidence pack of a Tier 4 review as a text file for the review committee, with the same access rule as the review page.
- `app/app/reviews/[id]/decision-panel.tsx`: the decision form, shown only to the person whose turn it is: four choices, a required note, a conditions box for Approve with conditions, and accept or dismiss for each contested finding; a double click gets a clear message.
- `app/app/reviews/[id]/sections.tsx`: the parts of the review page, including the read-only decision history: the severity badge (always with its word, never colour alone), the tier panel, the rules that fired with the triggering field highlighted, the findings and the dropped findings.
- `app/app/reviews/[id]/auto-refresh.tsx`: reloads the review page every few seconds while the models are still working.
- `app/app/audit/page.tsx`: the audit log at `/app/audit`, for the Auditor only: every recorded event, newest first, in plain words, with one filter by review id.
- `app/app/audit/export/route.ts`: downloads the audit log as JSON for the Auditor only, with the same permission check as the page.
- `app/app/not-allowed/page.tsx`: shown when a signed-in user's role may not open a page.
- `app/app/submit/page.tsx`: the page at `/app/submit`, giving the heading and holding the form; only Submitters may open it. Opened from a review with changes requested, it starts from that profile, shows the reviewer's note, and links the new review to the old one.
- `app/app/submit/submit-form.tsx`: the form itself, which checks a profile against the schema in the browser, shows what to fix, and sends a valid profile for review.
- `public/*.svg`: the default Next.js images, not used by any page yet.

## Protection

- `proxy.ts`: runs on the server before every `/app` page and `/api` route and sends anyone without a valid session to sign-in; the public overview at `/` and Workflow's internal paths are left alone.

## Database

- `db/schema.sql`: the four tables: reviews, the saved model results, decisions (one per review and stage) and the audit trail, which the database itself refuses to change or delete.
- `lib/db.ts`: connects to the Neon Postgres database on first use, records which copy of the app wrote each row, and describes database errors without revealing connection details.
- `lib/store.ts`: reads and writes reviews, results and audit events, and lists reviews for the queue; every change to a review writes its audit event in the same transaction.
- `scripts/db-check.ts`: checks the database connection and prints only "connected"; run with `npm run db:check`.
- `scripts/db-setup.ts`: creates the tables and lists them, and is safe to run again; run with `npm run db:setup`.

## Shared building blocks

- `lib/models.ts`: the one place the two model names live, so a model can be swapped by changing a single line, together with the AI Gateway providers each model may use and the no-training setting sent with every call.
- `lib/owasp.ts`: the ten OWASP agentic risk categories, with names and a description of each copied word for word from the official document, and the source and retrieval date.
- `lib/profile-schema.ts`: the strict rules for what an agent profile must contain, including the allowed choices for data, permissions and untrusted inputs (email, web, uploaded files, chat, logs or alerts).
- `lib/label-schema.ts`: the strict rules for what an answer-key file must contain, so a typing mistake in a label is caught.
- `lib/review-schema.ts`: the strict rules for what a review result must contain, including the five parts of every finding, and the simpler form the reviewer model fills in.
- `lib/sample-profiles.ts`: loads the 12 test profiles so the form can offer them as samples.
- `lib/review-prompt.ts`: the reviewer model's instructions, with the profile placed between clearly marked lines as data, never as instructions.
- `lib/analyze.ts`: sends one profile to the reviewer model through AI Gateway, throws away findings whose evidence quote is not in the profile, and applies the rule floor.
- `lib/crosscheck-prompt.ts`: the checker model's instructions, sharing the reviewer's rules and showing the profile and the first model's findings as data.
- `lib/crosscheck.ts`: sends the profile and the first model's findings to the checker model, gets a verdict for each finding plus anything missed, drops missed findings with no real quote, and marks contested findings.
- `lib/review.ts`: one full review: reviewer, then checker, then contested marking and the final tier, saving both models' names, tokens, time and cost.
- `lib/rules.ts`: eight fixed rules that set a minimum severity from what a profile lists, the tier assignment, the check that a model can never lower a rule's severity, and the final tier (the highest of the rule tier and both models' tiers).
- `lib/limits.ts`: the daily submission limit (10 per user in any 24 hours) and where a finished review goes next (tier 4 to the committee, other tiers to AppSec).
- `lib/authz.ts`: the one check that decides who may decide a review: the right role for the stage, the right stage for the tier, never your own submission, a different person for the second tier 3 stage, a note, conditions when needed, and every contested finding resolved before approving.
- `lib/review-access.ts`: the one rule for who may see a review, used by both the queue and the review page, and the rule for who may resubmit one (its own submitter, after Request changes, once).
- `lib/evidence.ts`: the exact-match evidence check that drops findings whose quote is not in the profile, and the same check used on screen to tell verbatim profile excerpts in model text apart from everything else.
- `lib/evidence-pack.ts`: writes the Tier 4 evidence pack in plain words: tiers and who set the final tier, the rules that fired, every finding with its quote and both models' views, and the profile as submitted.
- `lib/review-view.ts`: turns stored review data into plain words: statuses, which tier set the final tier, model and provider names, what each rule requires, field values, finding order, badge colours and cost.
- `lib/labels.ts`: plain words for the profile's fixed choices, shared by the submit form and the review screens.
- `lib/audit-view.ts`: puts audit event details into plain words for the screen and checks the review id filter.
- `lib/resume-cause.ts`: decides why a paused workflow run was or was not resumed after a decision, without ever calling it expired.
- `lib/users.ts`: the four fictional users and their roles, a stand-in for the corporate directory.
- `lib/permissions.ts`: what each role may do, checked on the server by every page and route.
- `lib/session.ts`: creates and checks the signed session cookie, and compares the demo passcode safely.
- `lib/auth.ts`: the sign-in check used inside pages and routes, sending visitors to sign-in or to the not-allowed page.

## The review workflow

- `workflows/review/index.ts`: the durable review: rules and the first model, the second model, save the result, then pause for an AppSec decision; tier 4 ends as routed to committee instead.
- `workflows/review/steps.ts`: the workflow's steps, each run outside the web request and kept once finished, so a later failure never repeats a paid model call; the two model steps retry at most once.
- `workflows/review/hooks.ts`: the AppSec pause and, for tier 3, the Model Risk pause, kept apart so the approval route can resume a review without loading model code.
- `app/api/reviews/[id]/decisions/route.ts`: records one decision: checks it with `lib/authz.ts`, accepts requests only from this site's own pages, writes the decision and its audit event to the database first, then tries to resume the paused workflow, and records whether it could.
- `app/api/reviews/route.ts`: receives a submitted profile from a signed-in Submitter, checks it and the daily limit, saves the review, starts the workflow and returns at once with the review id.

## Evaluation set

- `eval/profiles/profile-01.json` to `profile-12.json`: the 12 fictional agent profiles the tool will be tested on, one per file.
- `eval/labels/profile-01.json` to `profile-12.json`: the answer key, one file per profile, with the expected tier, the critical risks a good review must catch, and whether the profile is held out.
- `eval/labels/README.md`: where the answer key came from, the rule used to write it, and how the 4 held-out profiles were drawn.
- `eval/runs/`: raw results of every reviewer model run, one folder per run, with a README logging what changed between runs.
- `eval/RULE_RUNS.md`: a log of every rules-versus-answer-key run, kept for the record, with what changed between runs.
- `eval/ASSUMPTIONS.md`: where each profile came from and every value chosen where the source did not say.

## Tests and tools

- `tests/rules.test.ts`: one test for each rule, for tier assignment and for the severity floor, using made-up profiles; run with `npm test`.
- `tests/analyze.test.ts`: proves the evidence check drops a made-up finding and the rule floor raises a severity that is too low; calls no model.
- `scripts/run-reviews.ts`: a developer tool that runs full reviews (both models) over the evaluation profiles and saves raw results and actual cost to `eval/runs`; run with `npm run reviews -- --set tuning` or `--set all`, or `--checker-only --from <run folder>` to test the checker on saved reviewer results.
- `tests/evidence-pack.test.ts`: proves the evidence pack holds what the committee needs, keeps every quote exactly as stored, and has no JSON-looking text outside quotes.
- `tests/audit.test.ts`: proves only the Auditor may read the audit log and that no code anywhere updates or deletes audit events.
- `tests/resume-cause.test.ts`: proves every resume cause is told apart and none claims the run expired.
- `tests/authz.test.ts`: proves every refusal of the decision check and the allowed path for each tier, and that the decision form is offered to exactly the people the route accepts.
- `tests/limits.test.ts`: proves the 11th submission in 24 hours is refused and that tier 4 is routed to the committee.
- `tests/session.test.ts`: proves a session cookie cannot be altered, forged with another secret or used after it expires, that the passcode must match exactly, and what each role may do.
- `tests/crosscheck.test.ts`: proves contested marking, kept floors, the evidence check on missed findings, the final tier, and that the checker never sees a rule floor; calls no model.
- `scripts/compare-rules.ts`: a developer tool, not part of the app, that compares the rules' tier with the answer key and lists the held-out profiles separately; run with `npm run compare-rules`.

## Known limits

- Rule 2 (runs code with no sandbox): the profile has no sandbox field, so any tool with run-code permission fires this rule, even if the team has a sandbox.
- Rule 7 (customer financial data with no logging): weak OWASP fit. No category is mainly about missing logs; it is mapped to ASI10 Rogue Agents because that category's official mitigations call for audit logs of all agent actions.
- ASI01 versus ASI06: the reviewer model often files untrusted-input risks under ASI06 (Memory & Context Poisoning) where the answer key expects ASI01 (Agent Goal Hijack). Prompt v4 added OWASP's own descriptions, but in its full run ASI01 matched the answer key on only one profile. See eval/runs/README.md.
- Checker anchoring: the checker sees the first model's findings before forming its own view, so it tends to agree (48 of 49 findings in the step 9 record run). A blind first review by the checker would reduce this, at about $0.005 more per review.
- Reviewer model: openai/gpt-5-mini does not accept a temperature setting, so its answers vary between runs even with the same prompt; reasoning effort is fixed at low instead.
- Local paused runs: on this computer, Workflow keeps paused runs in `.next/workflow-data`, and every `npm run build` recreates the `.next` folder, so it deletes all local paused runs. A decision on such a review still stands (the database is the record), but the run cannot be resumed. Runs on Vercel are not affected.
- Tier 4 and money: an agent that moves money only after a person confirms is not Tier 4 by itself. This is the project owner's reading of ambiguous customer card wording, to be confirmed with the customer.

## Not in git

- `.env.local`: holds the AI Gateway key on this computer only and is never uploaded.
- `app/.well-known/workflow/`: files Workflow generates by itself on each build, ignored by git.
