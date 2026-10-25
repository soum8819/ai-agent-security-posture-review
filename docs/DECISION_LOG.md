# Decision log

Decisions about how the review tool behaves, newest last. Earlier build
decisions are recorded in CLAUDE.md under "Open decisions and known gaps".

## 2026-10-25: evidence quotes stay verbatim, even when they look like JSON

**Decision.** Evidence quotes are shown and exported exactly as stored,
including when they are excerpts of a profile field in its JSON form, such as
`"memory": "session"`. Nothing else on screen or in the evidence pack may look
like JSON.

**Why.** The models see each profile as JSON and must copy their evidence word
for word. The evidence check drops any finding whose quote is not found in the
profile by exact match, so a reviewer can verify every quote against the
profile. Rewriting a quote into plain words would break that link. Many quotes
are field excerpts (52 of the 70 stored when this was decided); this is
deliberate, not a fault.

**How it shows.**
- On the review page, a quote that looks like JSON is shown in a monospace
  style with the caption "Quoted from the profile field: <field name>".
- In the evidence pack, its line says "quoted from the field: <field name>".
- Inside model-written text, a fragment counts as a quote only when the same
  exact-match check confirms it is verbatim from the profile; it is then shown
  in monospace as a quote. Any other JSON-looking text is a fault.

**Correction.** The slice C check for "no raw JSON on screen" searched only for
a few field names and missed these quotes, so it passed when it should not
have. It has been tightened: it now flags JSON-looking text anywhere on a page
except inside a marked quote, and the evidence pack test does the same. When
tightened, it found 10 real hits (model reasons quoting the profile inline),
which are now shown as verified quotes. The check now finds none.

**Not done.** The reviewer prompts were not changed. Asking the models to quote
sentences and values rather than JSON is an optional idea for step 13.

## 2026-10-25: model providers restricted; zero data retention not set

**Decision.** Each model call restricts AI Gateway to named providers with
`providerOptions.gateway.only`: the reviewer (`openai/gpt-5-mini`) to Azure or
OpenAI, the checker (`google/gemini-2.5-flash`) to Vertex. Every call also sets
`disallowPromptTraining: true`. Zero data retention is not set.

**Why.** The rule is to allow only providers that the AI Gateway listing marks
as both "no training" and "zero data retention capable", so that zero data
retention can be switched on later without a provider change. Google's own
endpoint for the checker has an unknown zero data retention status, so it is
left out. Zero data retention needs a Pro or Enterprise plan (AI Gateway docs,
checked 2026-10-25); this project runs on Hobby. "No training" is free on
every plan. All profiles are synthetic.

**Cost of the choice.** The checker has no fallback provider: if Vertex is
unavailable, checker calls fail instead of moving to Google.

**Checked.** One direct run on profile-02 (no database write): the reviewer
was served by OpenAI and the checker by Vertex, both inside the allow lists;
results kept the same shape and every quote passed the evidence check. Cost
$0.0077.

## 2026-10-25: a second "workflow resumed" event on review 080fc26e

Review 080fc26e has two "workflow resumed" events, 1.4 seconds apart. Event
67 was written by the approval route. Event 68 was written by the workflow
code of the older deployment that started the run (commit d4f3c0f), which had
its own step recording a resume. Runs stay pinned to the deployment that
started them, so that old step ran. Nothing was recorded twice by the current
code. Audit events cannot be changed, so both stay.

## 2026-10-25: design direction for the reviewer app

**Direction.** Calm, dense and readable, in the spirit of Vercel's own
products: Geist type, a neutral grey scale, one accent colour, generous
spacing on a 4 pixel grid, and light and dark mode that follow the system
setting. The review detail page puts what an approver needs first (status,
final tier, contested findings, who decides next) above the details, with the
decision form beside them on wide screens.

**Why Geist.** It is Vercel's own typeface (Geist Sans and Geist Mono), it was
already loaded by the project through next/font, so it costs no new package,
and its mono face suits the things reviewers compare character by character:
review ids, evidence quotes and field excerpts. Before this pass the page font
was still set to Arial, so Geist never showed.

**Why a grey scale with one accent.** Security review is about meaning, so
colour is kept for meaning. Greys do the structural work (backgrounds, fills,
borders, secondary and primary text, in the roles of Vercel's Geist colour
system). One blue accent marks links, the main actions and the keyboard focus
ring. Red, orange, amber and green appear only where they carry meaning:
severity and status.

**Rule: colour is never the only signal.** Every severity badge shows its
word (Critical, High, Medium, Low), every status pill shows its words beside
its dot, and tier chips show "Tier 1" to "Tier 4", with Tier 4 also saying
Committee. Every text colour pair passes contrast of at least 4.5 to 1 in both
modes, and the focus ring at least 3 to 1; tests/design.test.ts checks this
by reading the real stylesheet.

**Guidelines applied (Vercel's Web Interface Guidelines).** A visible focus
ring on every focusable element through :focus-visible; hit targets of at
least 40 pixels, 44 on phones; text inputs at 16 pixels on phones so iOS does
not zoom; zoom never disabled; loading labels kept and ending in an ellipsis;
loading placeholders shaped like the content; minimal motion that turns off
when the system asks for reduced motion.

**Two choices made during the pass.**
- The submit form's buttons first stuck to the bottom of a phone screen. A
  screenshot showed the bar covering a field, and the guidelines say sticky
  bars must never cover the focused element, so the buttons sit at the end of
  the form instead.
- Some evidence quotes are profile JSON copied with runs of spaces. On screen
  they are now shown with repeated spaces collapsed and line breaks kept. The
  stored quote, the evidence check and the evidence pack are unchanged, so
  every quote still matches the profile exactly.

**Screenshots.** Before and after, at desktop and phone width, are in
docs/design/before and docs/design/after (taken with Playwright run through
npx, so the project gained no package). The after set now uses consistent
reviews only (f4e813da for Tier 3, 94a0d174 for Tier 4); the earlier
review-detail shots came from a setup check whose tier was changed for
testing and were removed.


## 2026-10-25: step 13 evaluation choices, and one open question

**Measured at a freeze.** The git tag `eval-v1` fixes the models, the prompts
(reviewer v4, checker c1) and the rules; the baseline in eval/results.md is
measured on it. Changes after it are shown as before and after, never folded
into the baseline.

**Fixes went to the checker only.** Both of the two worst tuning results were
raised by the checker's tier, so both changes are one sentence each in the
checker prompt (c2, then c3). The reviewer prompt and the rules were not
touched, so the rule tier (the floor) is exactly what it was at the freeze.

**Three runs before and after.** Answers vary between runs, so each fix was
judged on 3 runs of the target profile before the change and 3 after, not on
one run each.

**Open question for the project owner: profile-04 (held out).** The rules give
Tier 4, because the agent changes live claim records with no person
confirming, which matches the Tier 4 definition in CLAUDE.md ("acting on its
own with write or run-code power"). The answer key says Tier 3. The rule was
not changed, because 04 is held out. Either the key should accept Tier 4 for
04, or the Tier 4 definition should say which kinds of write power count.

## 2026-10-25: design polish after step 13

**Setup checks hidden in the queue by default.** A "Show setup checks (N)"
link adds `?setup=show` to the address, so the choice survives a reload and
a shared link. It is a link, not a button, because it changes the address.

**Tier chips get stronger with the tier.** Tier 1 quiet, Tier 2 a little
stronger, Tier 3 an amber outline, Tier 4 filled. Every chip still says
"Tier" and the digit (Tier 4 also says Committee), so colour is never the
only signal. The new Tier 3 colours are checked by tests/design.test.ts:
text at least 4.5 to 1 and the outline at least 3 to 1, in both modes.

**Why the rule tier is what it is.** A check of the real reviews with rule
tier 3 (f4e813da and 93ea2e59, both the payments assistant) found 0 rule
hits, correctly: the rule tier comes from the tier rules (data read, actions
possible), while R1 to R8 raise findings. The page never showed the tier
rules' reasons, so a Tier 3 review said only "No rule fired". "Rules that
fired" now starts with "Why the rules set Tier N" and its reasons. The data
was not inconsistent; the page was missing a part.
