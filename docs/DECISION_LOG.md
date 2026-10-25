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

