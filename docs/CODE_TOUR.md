# Code tour

One plain sentence per file: what it does and why. Draft written at the end
of step 6, to be updated and reused in step 15.

## Project notes

- `CLAUDE.md`: the project's memory for Claude Code, holding the customer card, the routing plan, the 17 build steps, open decisions and progress.
- `AGENTS.md`: a note written by Next.js telling AI assistants to check its bundled docs, because this version is newer than their training.
- `README.md`: the front page of the GitHub repo, with what the project is, the live links and the two architecture diagrams.
- `docs/SCHEMA.md`: the agent profile and the review result explained in plain words.
- `docs/CODE_TOUR.md`: this file, a one-line guide to every file.
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
- `app/app/page.tsx`: the reviewer app's placeholder page at `/app`.
- `app/app/submit/page.tsx`: the page at `/app/submit`, giving the heading and holding the form.
- `app/app/submit/submit-form.tsx`: the form itself, which checks a profile against the schema in the browser and shows what to fix, without saving or sending anything.
- `public/*.svg`: the default Next.js images, not used by any page yet.

## Shared building blocks

- `lib/models.ts`: the one place the two model names live, so a model can be swapped by changing a single line.
- `lib/owasp.ts`: the ten OWASP agentic risk categories, with names and a description of each copied word for word from the official document, and the source and retrieval date.
- `lib/profile-schema.ts`: the strict rules for what an agent profile must contain, including the allowed choices for data, permissions and untrusted inputs (email, web, uploaded files, chat, logs or alerts).
- `lib/label-schema.ts`: the strict rules for what an answer-key file must contain, so a typing mistake in a label is caught.
- `lib/review-schema.ts`: the strict rules for what a review result must contain, including the five parts of every finding, and the simpler form the reviewer model fills in.
- `lib/sample-profiles.ts`: loads the 12 test profiles so the form can offer them as samples.
- `lib/review-prompt.ts`: the reviewer model's instructions, with the profile placed between clearly marked lines as data, never as instructions.
- `lib/analyze.ts`: sends one profile to the reviewer model through AI Gateway, throws away findings whose evidence quote is not in the profile, and applies the rule floor.
- `lib/rules.ts`: eight fixed rules that set a minimum severity from what a profile lists, the tier assignment, and the check that a model can never lower a rule's severity.
- `lib/local-only.ts`: the lock that makes test routes answer "not found" anywhere except on this computer under `npm run dev`.

## Temporary spikes (to be replaced)

- `workflows/review.ts`: proves a review can pause until the right people approve, with two different approvers for tier 3 and any rejection ending it.
- `app/api/review/start/route.ts`: starts one test review, local only, after checking the inputs.
- `app/api/review/approve/route.ts`: sends one approval or rejection to a waiting review, local only, after checking the inputs.

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
- `scripts/run-reviews.ts`: a developer tool that runs the reviewer model over the evaluation profiles and saves raw results and actual cost to `eval/runs`; run with `npm run reviews -- --set tuning` or `--set all`.
- `scripts/compare-rules.ts`: a developer tool, not part of the app, that compares the rules' tier with the answer key and lists the held-out profiles separately; run with `npm run compare-rules`.

## Known limits

- Rule 2 (runs code with no sandbox): the profile has no sandbox field, so any tool with run-code permission fires this rule, even if the team has a sandbox.
- Rule 7 (customer financial data with no logging): weak OWASP fit. No category is mainly about missing logs; it is mapped to ASI10 Rogue Agents because that category's official mitigations call for audit logs of all agent actions.
- ASI01 versus ASI06: the reviewer model often files untrusted-input risks under ASI06 (Memory & Context Poisoning) where the answer key expects ASI01 (Agent Goal Hijack). Prompt v4 added OWASP's own descriptions, but in its full run ASI01 matched the answer key on only one profile. See eval/runs/README.md.
- Reviewer model: openai/gpt-5-mini does not accept a temperature setting, so its answers vary between runs even with the same prompt; reasoning effort is fixed at low instead.
- Tier 4 and money: an agent that moves money only after a person confirms is not Tier 4 by itself. This is the project owner's reading of ambiguous customer card wording, to be confirmed with the customer.

## Not in git

- `.env.local`: holds the AI Gateway key on this computer only and is never uploaded.
- `app/.well-known/workflow/`: files Workflow generates by itself on each build, ignored by git.
