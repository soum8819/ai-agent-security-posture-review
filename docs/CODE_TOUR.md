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
- `lib/owasp.ts`: the ten OWASP agentic risk categories, copied exactly from the official list.
- `lib/profile-schema.ts`: the strict rules for what an agent profile must contain, including the allowed choices for data, permissions and untrusted inputs (email, web, uploaded files, chat, logs or alerts).
- `lib/review-schema.ts`: the strict rules for what a review result must contain, including the five parts of every finding.
- `lib/sample-profiles.ts`: loads the 12 test profiles so the form can offer them as samples.
- `lib/local-only.ts`: the lock that makes test routes answer "not found" anywhere except on this computer under `npm run dev`.

## Temporary spikes (to be replaced)

- `app/api/ping/route.ts`: proves one model call works through AI Gateway, local only, to be deleted in step 8.
- `workflows/review.ts`: proves a review can pause until the right people approve, with two different approvers for tier 3 and any rejection ending it.
- `app/api/review/start/route.ts`: starts one test review, local only, after checking the inputs.
- `app/api/review/approve/route.ts`: sends one approval or rejection to a waiting review, local only, after checking the inputs.

## Evaluation set

- `eval/profiles/profile-01.json` to `profile-12.json`: the 12 fictional agent profiles the tool will be tested on, one per file.
- `eval/labels/profile-01.json` to `profile-12.json`: one file per profile for the owner's expected answers, left empty on purpose.
- `eval/ASSUMPTIONS.md`: where each profile came from and every value chosen where the source did not say.

## Not in git

- `.env.local`: holds the AI Gateway key on this computer only and is never uploaded.
- `app/.well-known/workflow/`: files Workflow generates by itself on each build, ignored by git.
