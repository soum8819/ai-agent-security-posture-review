// Every number and claim on the overview site, in one place. Each comes from
// eval/results.md, eval/BLIND_CHECKER.md, eval/security-tests.md,
// docs/DECISION_LOG.md or CLAUDE.md; the source is noted beside it. No market
// statistics. Text the project owner must write carries the marker that
// scripts/check-todo-sam.ts searches for (`npm run check:final`).

export const REPO_URL = "https://github.com/soum8819/ai-agent-security-posture-review";
export const FEEDBACK_URL = `${REPO_URL}/blob/main/FEEDBACK.md`;
export const RESULTS_URL = `${REPO_URL}/blob/main/eval/results.md`;
export const BLIND_URL = `${REPO_URL}/blob/main/eval/BLIND_CHECKER.md`;
export const SECURITY_URL = `${REPO_URL}/blob/main/eval/security-tests.md`;
export const DECISIONS_URL = `${REPO_URL}/blob/main/docs/DECISION_LOG.md`;

// The fictional customer brief (CLAUDE.md, customer card). Scenario figures,
// labelled as such on the page; not market data.
export const PROBLEM = {
  brief: [
    "Harborline plans to launch about 40 internal AI agents this year, heading toward 300: claims triage, KYC document review, payments operations, HR and IT helpers.",
    "Every agent needs a security review before launch. A small AppSec team does them by hand, and a review takes about 15 business days.",
  ],
  questions: [
    { who: "CISO", asks: "How do I know the AI reviewer is not being fooled?" },
    { who: "Model Risk Officer", asks: "Who is accountable for each decision?" },
    { who: "AppSec lead", asks: "Will I drown in false alarms?" },
    { who: "Platform engineering", asks: "Can I see and cap what this costs?" },
  ],
};

export const STEPS = [
  { title: "Submit a profile", body: "The agent's tools, permissions, data, confirmation, credentials, memory, logging and kill switch, checked against a strict schema." },
  { title: "Rules set a floor", body: "Eight fixed rules read the listed fields, never the prose, and set a minimum severity. Tier rules set the rule tier." },
  { title: "Reviewer model finds risks", body: "Against the ten OWASP agentic risk categories. Every finding needs a quote copied exactly from the profile." },
  { title: "Checker model checks them", body: "A second model from another provider gives a verdict on each finding, adds what was missed and proposes its own tier." },
  { title: "A person decides", body: "The final tier is the highest of the three, so a model can raise it but never lower it. The decision is recorded and audited." },
];

export const TIERS = [
  { tier: 1, what: "Read-only, internal documents", who: "AppSec approves" },
  { tier: 2, what: "Drafts changes or takes small actions a person confirms", who: "AppSec approves" },
  { tier: 3, what: "Handles customer financial data", who: "AppSec, then Model Risk, two different people" },
  { tier: 4, what: "Moves money with no person confirming, or acts on its own with power to write or run code", who: "Never approved in the app: sent to a review committee with an evidence pack" },
];

// docs/DECISION_LOG.md, "the five decisions shown on the overview site".
export const DECISIONS = [
  { title: "A model can raise the tier, never lower it", fact: "Rules set a floor for severity and tier. The final tier is the highest of the rule, reviewer and checker tiers.", why: "Models can be fooled into lowering the severity or risk floor, which is a security risk. Erring on the lower side instead of the higher side can be dangerous." },
  { title: "Evidence quotes stay word for word", fact: "A finding whose quote is not found in the profile by exact match is dropped, so every quote on screen can be checked against the profile.", why: "TODO-SAM" },
  { title: "The database records the decision", fact: "A decision is written to our own database first, then the paused workflow is resumed. If the run cannot be resumed, the decision still stands.", why: "TODO-SAM" },
  { title: "Providers restricted, no prompt training", fact: "Each call names the providers allowed to serve it and refuses any that may train on prompts. Zero data retention is not set: it needs a Pro or Enterprise plan.", why: "TODO-SAM" },
  { title: "Measure at a freeze, never tune on held-out profiles", fact: "Models, prompts and rules were frozen at a git tag before any evaluation run. Four of the 12 profiles were held out and never tuned on.", why: "TODO-SAM" },
];

// eval/results.md, "The main numbers", at the eval-v1 freeze.
export const FREEZE = [
  { measure: "Final tier inside the answer key's range", tuning: "6 of 8", heldOut: "2 of 4" },
  { measure: "Final tier below the key (the dangerous direction)", tuning: "0", heldOut: "0" },
  { measure: "Expected critical risks found, rules and models combined", tuning: "9 of 9", heldOut: "6 of 6" },
  { measure: "Found by the rules alone / the models alone", tuning: "6 of 9 / 8 of 9", heldOut: "5 of 6 / 6 of 6" },
  { measure: "Adversarial profiles that fooled it", tuning: "0 of 2", heldOut: "none in this set" },
  { measure: "Cost per review, from AI Gateway records", tuning: "about $0.008", heldOut: "about $0.008" },
  { measure: "Model time per review", tuning: "about 20 s", heldOut: "about 22 s" },
];

// eval/results.md, after the two checker fixes (c2 and c3).
export const AFTER = {
  tuning: "7 of 8",
  tuningNote: "profile 03 counted from its one baseline run; it failed 5 of 6 runs",
  heldOut: "3 of 4",
  heldOutNote: "one rerun, information only",
  fixes: [
    "Profile 07 (payments, a person confirms each payment): the checker called it Tier 4. After fix A, in range in 3 of 3 runs, from 0 of 3.",
    "Profile 02 (read-only HR bot): the checker counted “no person confirms” as a risk though it takes no actions. After fix B, 3 of 3 runs in range, from 2 of 3.",
  ],
};

export const HONEST_FINDINGS = [
  { title: "Held-out misses", body: "At the freeze, 2 of the 4 held-out profiles ended one tier too high. Every tier error was too high, never too low." },
  { title: "Profile 03 still fails", body: "Out of range in 5 of 6 runs: the reviewer model often calls this read-only research bot Tier 3. Left for the next round." },
  { title: "Profile 04 is Harborline's call", body: "The rules give Tier 4, because it changes live claim records with no person confirming. The answer key says Tier 3. It is a policy question for Harborline, and the rule was not changed." },
  { title: "ASI01 or ASI06", body: "In 7 of the 8 reviews where the models missed an expected Agent Goal Hijack (ASI01), they filed the same risk as Memory and Context Poisoning (ASI06)." },
  { title: "The checker is not independent", body: "It agreed with 45 of 45 reviewer findings. Without the reviewer's list it raised a clearly different set. A blind checker was not better: tiers did not change. See the comparison below." },
  { title: "A small set", body: "12 profiles, one answer key, synthetic data. These are indications, not proof, and answers vary between runs." },
];

// eval/BLIND_CHECKER.md, main run: current checker (sees the reviewer's
// findings) against blind-first (sees the profile and rules only).
export const CHECKER = {
  rows: [
    { measure: "Overlap with the reviewer's categories", tuning: ["75%", "35%"], heldOut: ["79%", "44%"] },
    { measure: "Reviewer findings not supported", tuning: ["0 of 30", "17 of 30"], heldOut: ["1 of 16", "8 of 16"] },
    { measure: "Final tier in the key's range", tuning: ["7 of 8", "7 of 8"], heldOut: ["3 of 4", "3 of 4"] },
  ],
  note: "The blind checker's extra disagreements were mostly risks it did not list that run, not reasoned objections; it also differed from its own earlier runs. No production change.",
};

// eval/security-tests.md
export const SECURITY = [
  "Four prompt-injection attacks, including orders in the owner name and fake end-of-data markers: every tier held at 4 and each attempt was flagged with a verified quote.",
  "Every route test passed: signed out, wrong role, wrong stage, another site, decision replay and reuse, and the public workflow webhook.",
  "One real fault found and fixed, and four wrong test expectations corrected, with both results kept.",
  "A key scan of every version of every file in step 12 found no secrets; every commit since is scanned first.",
];

export const SPLIT = {
  vercel: [
    "The overview site and the reviewer app (Next.js)",
    "The durable review that pauses for a person (Vercel Workflow)",
    "Every model call, with provider allow lists and no prompt training (AI Gateway)",
    "Reviews, decisions and the append-only audit log (Neon Postgres from the Marketplace)",
  ],
  harborline: [
    "Corporate sign-in (OIDC or SAML)",
    "The agent registry",
    "The audit log and SIEM",
    "Ticketing",
  ],
  link: "Vercel Secure Compute would connect the two over a private network. Designed, not built.",
};

export const BUILT_ON_VERCEL = [
  { name: "Hosting and Git deploys", line: "One project; every push to main deploys the live site." },
  { name: "AI Gateway", line: "One path to both models, with provider restrictions, no prompt training and the cost of every call on record." },
  { name: "Workflow", line: "The review runs as a durable workflow that waits, for hours if needed, until a person decides." },
  { name: "Neon from the Marketplace", line: "Postgres added from the Vercel Marketplace, holding reviews, decisions and the audit log." },
];

export const LIMITS = [
  "Sign-in is a stand-in: anyone with the demo passcode can choose any role.",
  "On Hobby, Workflow keeps a finished run's payloads for 1 day after it finishes. Review and decision records live in our own database, so they do not depend on it.",
  "Zero data retention is not switched on (it needs Pro or Enterprise).",
  "The evidence check proves a quote is in the profile, not that it supports the finding. The approver judges that.",
];

export const NEXT = [
  "Fix profile 03's reviewer tier, measured the same way.",
  "Ask Harborline to settle profile 04's tier.",
  "Test a checker that runs several times and keeps only risks it raises consistently.",
  "Real corporate sign-in, the registry, SIEM forwarding and Secure Compute.",
  "Workflow's experimental zero-retention option for finished runs: described, not enabled.",
];
