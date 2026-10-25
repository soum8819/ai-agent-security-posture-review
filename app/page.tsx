// The public overview site at `/`. Static: it reads no cookies and no
// database, so it is prerendered. Every number comes from app/overview/content.ts,
// which notes the source of each. Harborline is a fictional customer.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, TierChip, button, cx, link } from "@/components/ui";
import queueShot from "@/public/overview/queue.png";
import tier3Phone from "@/public/overview/review-tier3-phone.png";
import tier3Shot from "@/public/overview/review-tier3.png";
import tier4Shot from "@/public/overview/review-tier4.png";
import {
  AFTER,
  BLIND_URL,
  BUILT_ON_VERCEL,
  DECISIONS,
  DECISIONS_URL,
  FEEDBACK_URL,
  FREEZE,
  HONEST_FINDINGS,
  LIMITS,
  NEXT,
  PROBLEM,
  REPO_URL,
  RESULTS_URL,
  SECURITY,
  SECURITY_URL,
  SPLIT,
  TIERS,
} from "./overview/content";
import { ReviewFlow } from "./overview/review-flow";

export const metadata: Metadata = {
  title: "AI Agent Security Posture Review Workflow",
  description:
    "Rules, two AI models and a recorded human decision for every internal AI agent. Built for Harborline Financial Group, a fictional customer.",
};

const shell = "mx-auto w-full max-w-6xl px-4 sm:px-6";

function Section({ id, eyebrow, title, intro, children }: { id: string; eyebrow?: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 border-t border-line py-16">
      <div className={shell}>
        {eyebrow && <p className="text-sm font-medium text-muted">{eyebrow}</p>}
        <h2 id={`${id}-title`} className="mt-1 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {title}
        </h2>
        {intro && <div className="mt-3 max-w-2xl text-pretty text-muted">{intro}</div>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

// A screenshot in a quiet frame. Static imports give width and height, so the
// space is reserved before the image loads (no layout shift).
function Shot({ src, alt, sizes, eager, className }: { src: typeof tier3Shot; alt: string; sizes: string; eager?: boolean; className?: string }) {
  return (
    <div className={cx("overflow-hidden rounded-lg border border-line bg-subtle", className)}>
      <Image
        src={src}
        alt={alt}
        sizes={sizes}
        placeholder="blur"
        className="h-auto w-full"
        {...(eager ? { loading: "eager" as const, fetchPriority: "high" as const } : {})}
      />
    </div>
  );
}

export default function Overview() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-page/90 backdrop-blur">
        <div className={cx(shell, "flex h-14 items-center gap-2 sm:gap-3")}>
          <span aria-hidden className="flex size-7 items-center justify-center rounded-md bg-ink text-xs font-bold text-page">H</span>
          <span className="font-semibold">Harborline</span>
          <span className="hidden text-muted sm:inline">Agent review</span>
          <span className="rounded border border-line px-1.5 py-0.5 text-xs whitespace-nowrap text-muted">Fictional customer</span>
          <nav aria-label="Overview" className="ml-auto hidden items-center gap-1 text-sm md:flex">
            {[
              ["#how", "How it works"],
              ["#tiers", "Tiers"],
              ["#evidence", "Evidence"],
              ["#platform", "Platform"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-md px-2.5 py-1.5 text-muted transition-colors duration-150 hover:bg-subtle hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <Link href="/app" className={cx(button.primary, "ml-auto whitespace-nowrap px-3! md:ml-2")}>
            Try the app
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section aria-labelledby="hero-title" className="py-14 sm:py-20">
          <div className={shell}>
            <p className="text-sm font-medium text-muted">For Harborline Financial Group, a fictional customer. All data is synthetic.</p>
            <h1 id="hero-title" className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.1]">
              A security review for every AI agent, with a named person accountable for each decision.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-pretty text-muted">
              Fixed rules and two AI models review each agent against the OWASP Top 10 for Agentic Applications. They show their
              evidence and where they disagree. Then a person decides, and the decision is audited.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/app" className={button.primary}>
                Try the reviewer app
              </Link>
              <a href={REPO_URL} className={button.secondary}>
                View the repo on GitHub
              </a>
            </div>
            <div className="mt-12 grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
              <Shot
                src={tier3Shot}
                alt="The review page for a Tier 3 payments agent: the final tier, contested findings, the three tiers that set it, the rule tier's reasons, and the Model Risk decision form."
                sizes="(min-width: 1152px) 904px, (min-width: 768px) calc(100vw - 280px), calc(100vw - 32px)"
                eager
              />
              <Shot
                src={tier3Phone}
                alt="The same review on a phone."
                sizes="200px"
                className="hidden md:block"
              />
            </div>
          </div>
        </section>

        <Section
          id="problem"
          eyebrow="The problem"
          title="Every agent needs a review, and the reviews take weeks"
          intro="From the fictional customer's brief:"
        >
          <div className="grid gap-8 md:grid-cols-2">
            <ul className="space-y-3">
              {PROBLEM.brief.map((b) => (
                <li key={b} className="text-pretty">
                  {b}
                </li>
              ))}
            </ul>
            <dl className="grid gap-3 sm:grid-cols-2">
              {PROBLEM.questions.map((q) => (
                <Card key={q.who} className="p-4">
                  <dt className="text-xs font-medium text-muted">{q.who}</dt>
                  <dd className="mt-1 text-sm">“{q.asks}”</dd>
                </Card>
              ))}
            </dl>
          </div>
        </Section>

        <Section id="how" eyebrow="How a review works" title="Five steps, and only the last one is a person">
          <ReviewFlow />
        </Section>

        <Section
          id="tiers"
          eyebrow="Four tiers"
          title="The tier decides who must approve"
          intro="Set by fixed rules from the data an agent reads and the actions it can take. A model can raise the tier, never lower it."
        >
          <ul className="grid gap-3 md:grid-cols-4">
            {TIERS.map((t) => (
              <Card as="li" key={t.tier} className="p-4">
                <TierChip tier={t.tier} />
                <p className="mt-3 text-sm font-medium text-pretty">{t.what}</p>
                <p className="mt-2 text-sm text-muted text-pretty">{t.who}</p>
              </Card>
            ))}
          </ul>
        </Section>

        <Section
          id="decisions"
          eyebrow="Five decisions"
          title="What I chose, and why"
          intro={
            <>
              Each is recorded in the{" "}
              <a href={DECISIONS_URL} className={link}>
                decision log
              </a>
              .
            </>
          }
        >
          <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {DECISIONS.map((d, i) => (
              <Card as="li" key={d.title} className="p-5">
                <span className="font-mono text-xs text-muted tabular">{i + 1}</span>
                <h3 className="mt-1 font-semibold">{d.title}</h3>
                <p className="mt-2 text-sm text-pretty">{d.fact}</p>
                <p className="mt-2 text-sm text-muted text-pretty">
                  <span className="font-medium text-ink">Why.</span> {d.why}
                </p>
              </Card>
            ))}
          </ol>
        </Section>

        <Section
          id="evidence"
          eyebrow="The evidence"
          title="Measured on 12 synthetic profiles, at a freeze"
          intro="Models, prompts and rules were frozen at a git tag before any run. 8 profiles were used for tuning and 4 were held out and never tuned on. 12 profiles is a small set: these are indications, not proof."
        >
          <h3 className="font-semibold">At the eval-v1 freeze</h3>
          <div className="mt-3 overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead className="bg-subtle text-xs text-muted">
                <tr className="border-b border-line">
                  <th scope="col" className="px-4 py-2.5 font-medium">Measure</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Tuning set (8)</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Held-out set (4)</th>
                </tr>
              </thead>
              <tbody>
                {FREEZE.map((r) => (
                  <tr key={r.measure} className="border-b border-line last:border-0">
                    <th scope="row" className="px-4 py-2.5 font-normal">{r.measure}</th>
                    <td className="px-4 py-2.5 tabular">{r.tuning}</td>
                    <td className="px-4 py-2.5 tabular">{r.heldOut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-10 font-semibold">After two checker fixes (labelled separately)</h3>
          <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <dl className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <dt className="text-xs font-medium text-muted">Tuning set, final tier in range</dt>
                <dd className="mt-2 text-2xl font-semibold tabular">{AFTER.tuning}</dd>
                <dd className="mt-1 text-xs text-muted">{AFTER.tuningNote}</dd>
              </Card>
              <Card className="p-4">
                <dt className="text-xs font-medium text-muted">Held-out set, final tier in range</dt>
                <dd className="mt-2 text-2xl font-semibold tabular">{AFTER.heldOut}</dd>
                <dd className="mt-1 text-xs text-muted">{AFTER.heldOutNote}</dd>
              </Card>
            </dl>
            <ul className="space-y-2 text-sm text-pretty">
              {AFTER.fixes.map((f) => (
                <li key={f}>{f}</li>
              ))}
              <li className="text-muted">Each fix is one sentence in the checker&apos;s instructions, measured on 3 runs before and 3 after.</li>
            </ul>
          </div>

          <h3 className="mt-10 font-semibold">What did not go well</h3>
          <ul className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {HONEST_FINDINGS.map((h) => (
              <Card as="li" key={h.title} className="p-4">
                <h4 className="text-sm font-semibold">{h.title}</h4>
                <p className="mt-1 text-sm text-muted text-pretty">{h.body}</p>
              </Card>
            ))}
          </ul>

          <h3 className="mt-10 font-semibold">Security tests</h3>
          <ul className="mt-3 max-w-3xl list-disc space-y-1.5 pl-5 text-sm text-pretty marker:text-muted">
            {SECURITY.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>

          <p className="mt-8 text-sm text-muted">
            Full detail:{" "}
            <a href={RESULTS_URL} className={link}>evaluation results</a>,{" "}
            <a href={BLIND_URL} className={link}>the checker independence experiment</a> and{" "}
            <a href={SECURITY_URL} className={link}>security tests</a>.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <figure>
              <Shot
                src={tier4Shot}
                alt="A Tier 4 review sent to the committee: the tiers, the rules that fired with their reasons, and the Download evidence pack button."
                sizes="(min-width: 1152px) 544px, (min-width: 768px) 50vw, 100vw"
              />
              <figcaption className="mt-2 text-sm text-muted">A Tier 4 review goes to the committee with an evidence pack.</figcaption>
            </figure>
            <figure>
              <Shot
                src={queueShot}
                alt="The review queue: real submissions first, with a control to show the setup checks."
                sizes="(min-width: 1152px) 544px, (min-width: 768px) 50vw, 100vw"
              />
              <figcaption className="mt-2 text-sm text-muted">The queue shows real submissions first; setup checks are one click away.</figcaption>
            </figure>
          </div>
        </Section>

        <Section id="platform" eyebrow="Where things run" title="Vercel runs the review. Harborline keeps its systems of record.">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <h3 className="font-semibold">On Vercel (built)</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {SPLIT.vercel.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </Card>
            <Card className="border-dashed p-5">
              <h3 className="font-semibold">In Harborline&apos;s AWS (stays there; not built here)</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {SPLIT.harborline.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </Card>
          </div>
          <p className="mt-4 text-sm text-muted">{SPLIT.link}</p>

          <h3 id="built-on-vercel" className="mt-12 text-xl font-semibold tracking-tight">Built on Vercel</h3>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {BUILT_ON_VERCEL.map((b) => (
              <Card key={b.name} className="p-4">
                <dt className="text-sm font-semibold">{b.name}</dt>
                <dd className="mt-1 text-sm text-muted text-pretty">{b.line}</dd>
              </Card>
            ))}
          </dl>
        </Section>

        <Section id="limits" eyebrow="Honest limits" title="What this build does not do yet">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="font-semibold">Limits</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-pretty marker:text-muted">
                {LIMITS.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">What is next</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-pretty marker:text-muted">
                {NEXT.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/app" className={button.primary}>
              Try the reviewer app
            </Link>
            <a href={FEEDBACK_URL} className={button.secondary}>
              My feedback on the Vercel products
            </a>
          </div>
        </Section>
      </main>

      <footer className="border-t border-line py-6">
        <div className={cx(shell, "text-xs text-muted")}>
          Harborline Financial Group is a fictional customer. All agents, people and data are synthetic. Sign-in is a stand-in for
          corporate sign-in.
        </div>
      </footer>
    </div>
  );
}
